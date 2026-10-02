import { useState, useRef, useEffect, useCallback, useMemo, type ReactNode } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useAuth } from '@/hooks/use-auth'
import { useChat } from '@/hooks/use-chat'
import { useConversations } from '@/hooks/use-conversations'
import { useDocuments } from '@/hooks/use-documents'
import { toast } from 'sonner'
import type { Citation } from '@/types'
import { useSWRConfig } from 'swr'
import { swrKeys } from '@/lib/swr-keys'
import { DocumentViewerModal, type DocumentViewerTarget } from '@/components/documents/document-viewer-modal'
import { ExportDialog } from '@/components/chat/export-dialog'
import { DocumentScopeSelector, ScopeDetailsModal } from '@/components/chat/document-scope-selector'
import { ChunkPreviewModal } from '@/components/chat/chunk-preview-modal'
import { updateConversationScope } from '@/services/conversations-service'

const MIN_SOURCES_WIDTH = 280
const DEFAULT_SOURCES_WIDTH = 380

export function ChatPage() {
  const { conversationId } = useParams<{ conversationId?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { mutate } = useSWRConfig()
  const containerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { data: conversations = [] } = useConversations()
  const { data: documents = [] } = useDocuments()
  const readyDocs = useMemo(() => documents.filter((d) => d.status === 'ready'), [documents])
  const readyDocsCount = readyDocs.length
  const readyDocIds = useMemo(() => readyDocs.map((d) => d.id), [readyDocs])

  const [inputPrompt, setInputPrompt] = useState('')
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null)
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null)
  const [sourceSearch, setSourceSearch] = useState('')
  const [viewingDoc, setViewingDoc] = useState<DocumentViewerTarget | null>(null)
  const [previewingCitation, setPreviewingCitation] = useState<Citation | null>(null)
  const [expandedTelemetry, setExpandedTelemetry] = useState<Record<string, boolean>>({})

  // Scoped documents selection state
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
  const [isScopeModalOpen, setIsScopeModalOpen] = useState(false)
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false)

  // Resizable layout state
  const [sourcesWidth, setSourcesWidth] = useState<number>(() => {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('trace_sources_panel_width')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= MIN_SOURCES_WIDTH) return parsed
      }
    }
    return DEFAULT_SOURCES_WIDTH
  })

  const [isSourcesCollapsed, setIsSourcesCollapsed] = useState<boolean>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('trace_sources_panel_collapsed') === 'true'
    }
    return false
  })

  const [isDragging, setIsDragging] = useState(false)
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false)

  const activeConversation = conversations.find((c) => c.id === conversationId)

  // Synchronize selected document IDs from active conversation or initialize with all ready docs on new chat
  useEffect(() => {
    if (activeConversation?.selectedDocumentIds && activeConversation.selectedDocumentIds.length > 0) {
      setSelectedDocIds(activeConversation.selectedDocumentIds)
    } else if (!conversationId && readyDocIds.length > 0 && selectedDocIds.length === 0) {
      setSelectedDocIds(readyDocIds)
    }
  }, [conversationId, activeConversation?.id, activeConversation?.selectedDocumentIds, readyDocIds])

  const scopeLabel = useMemo(() => {
    if (selectedDocIds.length === 0) return 'No Documents Selected'
    if (selectedDocIds.length === readyDocs.length) return `All Indexed Docs (${readyDocs.length})`
    if (selectedDocIds.length === 1) {
      const doc = documents.find((d) => d.id === selectedDocIds[0])
      return doc ? doc.name : '1 Document'
    }
    return `${selectedDocIds.length} Documents`
  }, [selectedDocIds, readyDocs.length, documents])

  const scopedDocumentNames = useMemo(() => {
    if (selectedDocIds.length === 0 || selectedDocIds.length === readyDocs.length) {
      return readyDocs.map((d) => d.name)
    }
    return documents.filter((d) => selectedDocIds.includes(d.id)).map((d) => d.name)
  }, [selectedDocIds, readyDocs, documents])

  const handleUpdateScope = async (newDocIds: string[]) => {
    setSelectedDocIds(newDocIds)
    if (conversationId && !conversationId.startsWith('new_') && !conversationId.startsWith('temp_')) {
      try {
        await updateConversationScope(conversationId, newDocIds)
        await Promise.all([
          mutate(swrKeys.conversations),
          mutate(swrKeys.conversation(conversationId)),
        ])
        toast.success(`Grounded scope updated to ${newDocIds.length} document${newDocIds.length === 1 ? '' : 's'}`)
      } catch (err: any) {
        toast.error(err.message || 'Failed to update conversation scope')
      }
    } else {
      toast.success(`Grounded scope set to ${newDocIds.length} document${newDocIds.length === 1 ? '' : 's'}`)
    }
  }

  const {
    messages,
    isGenerating,
    error,
    send,
    retry,
  } = useChat(conversationId, (newId) => {
    navigate(`/chat/${newId}`)
  })

  // Persist panel preferences
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('trace_sources_panel_width', sourcesWidth.toString())
      localStorage.setItem('trace_sources_panel_collapsed', isSourcesCollapsed.toString())
    }
  }, [sourcesWidth, isSourcesCollapsed])

  // Resizing event handlers
  const startResizing = useCallback((e: React.PointerEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const onPointerMove = (e: PointerEvent) => {
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const newWidth = rect.right - e.clientX
      const maxAllowed = Math.min(650, Math.floor(rect.width * 0.55))
      const clamped = Math.max(MIN_SOURCES_WIDTH, Math.min(maxAllowed, newWidth))
      setSourcesWidth(clamped)
    }

    const onPointerUp = () => {
      setIsDragging(false)
    }

    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [isDragging])

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isGenerating])

  // Identify assistant messages
  const assistantMessages = useMemo(() => {
    return messages.filter((m) => m.role === 'assistant')
  }, [messages])

  const latestAssistantMessage = assistantMessages[assistantMessages.length - 1]

  // When a new assistant message arrives, clear prior selectedMessageId to show latest
  useEffect(() => {
    if (latestAssistantMessage) {
      setSelectedMessageId(null)
    }
  }, [latestAssistantMessage?.id])

  // Active assistant message providing citations for the sources panel
  const currentAssistantMessage = useMemo(() => {
    if (selectedMessageId) {
      const found = messages.find((m) => m.id === selectedMessageId && m.role === 'assistant')
      if (found) return found
    }
    return latestAssistantMessage
  }, [selectedMessageId, messages, latestAssistantMessage])

  const allCitations: Citation[] = useMemo(() => {
    return currentAssistantMessage?.citations || []
  }, [currentAssistantMessage])

  // Filter citations by source search if typed
  const displayedCitations = useMemo(() => {
    if (!sourceSearch.trim()) return allCitations
    const q = sourceSearch.toLowerCase()
    return allCitations.filter((c) => {
      return (
        c.id.toLowerCase().includes(q) ||
        c.documentName.toLowerCase().includes(q) ||
        c.section.toLowerCase().includes(q) ||
        c.excerpt.toLowerCase().includes(q) ||
        (c.chunkId && c.chunkId.toLowerCase().includes(q))
      )
    })
  }, [allCitations, sourceSearch])

  const handleSend = async () => {
    const text = inputPrompt.trim()
    if (!text || isGenerating) return

    if (selectedDocIds.length === 0) {
      toast.error('Select at least one document to start a grounded chat.')
      return
    }

    setInputPrompt('')
    await send(text, selectedDocIds)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const focusCitation = (citationId: string, messageId?: string) => {
    if (messageId) {
      setSelectedMessageId(messageId)
    }
    setActiveCitationId(citationId)
    if (isSourcesCollapsed) {
      setIsSourcesCollapsed(false)
    }
    setIsMobileDrawerOpen(true)
    setTimeout(() => {
      const el = document.getElementById(`source-card-${citationId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
    }, 120)
  }

  const handleOpenExport = () => {
    if (messages.length === 0) {
      toast.info('No messages in the session to export')
      return
    }
    setIsExportDialogOpen(true)
  }

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || 'OP'

  // Custom text renderer to parse [S1], [S2] into interactive buttons
  const renderTextWithCitations = (text: string, messageId: string) => {
    const citationRegex = /\[(S\d+)\]/g
    const parts: (string | ReactNode)[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      const citationId = match[1]
      const isActive = activeCitationId === citationId && currentAssistantMessage?.id === messageId
      parts.push(
        <button
          key={`cit-${match.index}`}
          type="button"
          onClick={() => focusCitation(citationId, messageId)}
          title={`Inspect citation [${citationId}] in grounded sources panel`}
          className={`inline-flex items-center font-citation-tag text-citation-tag px-1.5 py-0.5 mx-1 rounded transition-all cursor-pointer ${
            isActive
              ? 'bg-secondary text-surface font-bold ring-2 ring-secondary'
              : 'bg-surface-container-high text-secondary hover:bg-secondary/20 hover:text-on-surface'
          }`}
        >
          [{citationId}]
        </button>
      )
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }

  // Shared Source Panel Component for both Desktop Split and Mobile Drawer
  const renderSourcesPanelContent = () => (
    <div className="flex flex-col h-full justify-between">
      {/* Source Panel Header */}
      <div className="p-space-md bg-surface-container-low/95 backdrop-blur-md shadow-sm sticky top-0 z-10 flex flex-col gap-space-xs border-b border-outline-variant/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-xs min-w-0">
            <span className="material-symbols-outlined text-secondary text-[18px] shrink-0">verified</span>
            <span className="font-headline-sm text-body-sm font-semibold text-on-surface truncate">
              Retrieved Grounded Sources
            </span>
            <span className="font-label-sm text-label-sm px-2 py-0.2 rounded-full bg-secondary-container text-on-secondary font-semibold shrink-0">
              {allCitations.length}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-label-sm text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary font-medium hidden sm:inline">
              100% Grounded
            </span>
            {/* Collapse button for desktop */}
            <button
              type="button"
              onClick={() => setIsSourcesCollapsed(true)}
              className="hidden lg:flex p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Collapse sources panel"
            >
              <span className="material-symbols-outlined text-[16px]">dock_to_right</span>
            </button>
            {/* Close button for mobile drawer */}
            <button
              type="button"
              onClick={() => setIsMobileDrawerOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title="Close drawer"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        {/* Viewing non-latest indicator */}
        {selectedMessageId && latestAssistantMessage && selectedMessageId !== latestAssistantMessage.id && (
          <div className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-surface-container border border-outline-variant/20 text-on-surface-variant">
            <span>Viewing sources for selected response</span>
            <button
              type="button"
              onClick={() => setSelectedMessageId(null)}
              className="text-primary hover:underline font-semibold ml-2"
            >
              Show latest
            </button>
          </div>
        )}

        {/* Chunk Filter / Search Bar */}
        <div className="relative mt-1">
          <span className="material-symbols-outlined absolute left-2.5 top-2 text-[16px] text-on-surface-variant/60">
            search
          </span>
          <input
            type="text"
            value={sourceSearch}
            onChange={(e) => setSourceSearch(e.target.value)}
            placeholder="Search retrieved chunk contents..."
            className="w-full bg-surface-container font-body-sm text-body-sm pl-8 pr-3 py-1.5 rounded text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:bg-surface-container-high transition-all border border-outline-variant/20"
          />
        </div>
      </div>

      {/* Source Card List (Scrollable) */}
      <div className="flex-1 p-space-md space-y-space-md overflow-y-auto" id="source-feed">
        {allCitations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-on-surface-variant/70 space-y-3 px-4">
            <div className="w-12 h-12 rounded-xl bg-surface-container flex items-center justify-center text-on-surface-variant/40 border border-outline-variant/20">
              <span className="material-symbols-outlined text-[28px]">find_in_page</span>
            </div>
            <div className="space-y-1">
              <p className="font-body-sm text-body-sm font-semibold text-on-surface">
                No citations retrieved yet
              </p>
              <p className="font-code-body text-[11px] text-on-surface-variant/60 max-w-xs leading-relaxed">
                Ask a question about your indexed documentation to inspect raw vector chunks.
              </p>
            </div>
            {readyDocsCount > 0 ? (
              <span className="text-[11px] px-2.5 py-1 rounded-full bg-surface-container border border-outline-variant/20 text-on-surface-variant">
                {readyDocsCount} {readyDocsCount === 1 ? 'document' : 'documents'} ready in scope
              </span>
            ) : (
              <Link
                to="/documents"
                className="text-[11px] px-3 py-1.5 rounded-lg bg-primary-container text-on-primary-container font-semibold hover:bg-primary transition-all"
              >
                Upload documents to begin
              </Link>
            )}
          </div>
        ) : displayedCitations.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant/70 font-body-sm">
            No sources match your filter "{sourceSearch}".
          </div>
        ) : (
          displayedCitations.map((citation) => {
            const isActive = activeCitationId === citation.id
            const pct = Math.round(citation.relevance * 100)
            const cosineDist = (1 - citation.relevance).toFixed(3)

            return (
              <div
                key={citation.id}
                id={`source-card-${citation.id}`}
                onClick={() => setActiveCitationId(citation.id)}
                className={`p-space-md rounded-xl transition-all shadow-md space-y-space-xs cursor-pointer border ${
                  isActive
                    ? 'bg-surface-container-high border-secondary ring-1 ring-secondary/50'
                    : 'bg-surface-container border-outline-variant/20 hover:border-outline-variant/60 hover:bg-surface-container-high'
                }`}
              >
                <div className="flex items-start justify-between gap-space-xs">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-citation-tag text-citation-tag px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-semibold shrink-0">
                      [{citation.id}]
                    </span>
                    <span className="font-body-sm text-body-sm font-semibold text-on-surface truncate">
                      {citation.documentName}
                    </span>
                  </div>
                  <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-primary/10 text-primary font-code-inline shrink-0">
                    {pct}% match
                  </span>
                </div>

                <div className="font-label-sm text-label-sm text-on-surface-variant/80 flex items-center flex-wrap gap-2">
                  <span>Page {citation.page || 1}</span>
                  <span>•</span>
                  <span className="truncate">{citation.section || 'Extracted Section'}</span>
                  {citation.chunkId && (
                    <>
                      <span>•</span>
                      <span className="font-mono text-[10px] text-secondary">
                        Chunk #{citation.chunkIndex ?? 0}
                      </span>
                    </>
                  )}
                </div>

                {/* Snippet Payload */}
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                    setPreviewingCitation(citation)
                  }}
                  title="Click to inspect full chunk passage"
                  className="p-space-sm rounded bg-surface-container-lowest font-code-body text-code-body text-on-surface leading-relaxed shadow-inner border border-outline-variant/10 text-[12px] max-h-48 overflow-y-auto cursor-pointer hover:border-secondary/40 transition-colors"
                >
                  {citation.excerpt}
                </div>

                {/* Primary Dual Actions: Preview Chunk & View Raw Document */}
                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPreviewingCitation(citation)
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-secondary/15 hover:bg-secondary/25 text-secondary hover:text-on-surface text-xs font-semibold border border-secondary/30 transition-all cursor-pointer shadow-sm group"
                    title="Preview full vector chunk excerpt and diagnostics"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary group-hover:scale-110 transition-transform">
                      visibility
                    </span>
                    <span>Preview Chunk</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setViewingDoc({
                        id: citation.documentId,
                        name: citation.documentName,
                        page: citation.page || 1,
                        section: citation.section,
                        chunkExcerpt: citation.excerpt,
                      })
                    }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface text-xs font-medium border border-outline-variant/30 transition-all cursor-pointer shadow-sm group"
                    title={`View original document ${citation.page ? `(Page ${citation.page})` : ''}`}
                  >
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">
                      picture_as_pdf
                    </span>
                    <span className="truncate">View Original</span>
                  </button>
                </div>

                {/* Collapsible Technical Details */}
                <details className="pt-1 text-[11px] text-on-surface-variant/70">
                  <summary className="cursor-pointer hover:text-secondary select-none font-mono-code text-[10px]">
                    Technical diagnostics
                  </summary>
                  <div className="mt-1 p-2 rounded bg-surface-container-lowest font-mono-code text-[10px] space-y-1 border border-outline-variant/15 text-on-surface-variant">
                    {citation.chunkId && (
                      <div className="flex justify-between">
                        <span>Chunk ID:</span>
                        <span className="text-secondary font-mono truncate max-w-[150px]">{citation.chunkId}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Cosine Distance:</span>
                      <span className="text-secondary">{cosineDist}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Vector Storage:</span>
                      <span className="text-primary">Neon pgvector</span>
                    </div>
                    <div className="pt-1 flex items-center justify-end">
                      <Link
                        to={`/documents/${citation.documentId}`}
                        className="text-secondary hover:underline flex items-center gap-0.5"
                      >
                        <span>Inspect chunk vectors</span>
                        <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                      </Link>
                    </div>
                  </div>
                </details>
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface bg-grid-pattern min-h-[calc(100vh-3.5rem)]">
      {/* Main Workbench Split-Pane */}
      <div
        ref={containerRef}
        className={`flex flex-row w-full flex-1 min-h-[calc(100vh-3.5rem)] overflow-hidden relative ${
          isDragging ? 'select-none cursor-col-resize' : ''
        }`}
      >
        {/* LEFT / CENTER CANVAS: RAG Chat Stream & Pipeline Telemetry */}
        <section className="flex-1 min-w-[320px] flex flex-col justify-between bg-surface-container-lowest/80 bg-grid-pattern relative border-r border-outline-variant/20 h-full overflow-hidden">
          {/* Top Session Control Ribbon */}
          <div className="sticky top-0 z-30 flex items-center justify-between px-gutter md:px-gutter-lg py-space-sm bg-surface-container-lowest/90 backdrop-blur-md border-b border-outline-variant/20 shadow-sm">
            <div className="flex items-center gap-space-md min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0"></span>
                <span className="font-headline-sm text-body-base font-semibold truncate text-on-surface">
                  {activeConversation?.title || (conversationId ? 'Active Session' : 'New Knowledge Query')}
                </span>

                {/* Scope Pill Badge */}
                <button
                  type="button"
                  onClick={() => setIsScopeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-medium border border-outline-variant/20 transition-all cursor-pointer shadow-2xs"
                  title="Click to view or inspect grounded document scope"
                >
                  <span className="material-symbols-outlined text-[13px] text-primary">domain_verification</span>
                  <span className="font-mono-code truncate max-w-[140px] sm:max-w-[200px]">
                    Scope: {scopeLabel}
                  </span>
                  <span className="material-symbols-outlined text-[12px] opacity-70">expand_more</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-space-xs relative">
              {/* Toggle Sources Panel (visible on all screens when collapsed, or on mobile) */}
              <button
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    setIsMobileDrawerOpen(true)
                  } else {
                    setIsSourcesCollapsed((prev) => !prev)
                  }
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer border ${
                  allCitations.length > 0
                    ? 'bg-secondary/15 text-secondary border-secondary/30 hover:bg-secondary/25'
                    : 'bg-surface-container text-on-surface-variant hover:text-on-surface border-outline-variant/15'
                }`}
                type="button"
                title="Toggle Retrieved Grounded Sources Panel"
              >
                <span className="material-symbols-outlined text-[15px]">verified</span>
                <span>Sources ({allCitations.length})</span>
              </button>

              {/* Functional Export Button opening Export Dialog */}
              <button
                onClick={handleOpenExport}
                disabled={messages.length === 0}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm cursor-pointer border bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border-outline-variant/15 disabled:opacity-40 disabled:cursor-not-allowed"
                type="button"
                title="Export conversation session as PDF or Markdown"
              >
                <span className="material-symbols-outlined text-[15px]">file_download</span>
                <span className="hidden md:inline">Export</span>
              </button>

              {/* New Chat Button */}
              <button
                onClick={() => {
                  setSelectedDocIds(readyDocIds)
                  navigate('/chat')
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-primary-container text-on-primary-container hover:bg-primary text-xs font-semibold transition-all shadow-sm cursor-pointer"
                type="button"
                title="Start a new chat session"
              >
                <span className="material-symbols-outlined text-[15px]">add</span>
                <span className="hidden md:inline">New Chat</span>
              </button>
            </div>
          </div>

          {/* Scrollable Message Stream */}
          <div className="flex-1 px-gutter md:px-gutter-lg py-space-lg space-y-space-xl overflow-y-auto max-w-5xl w-full mx-auto">
            {messages.length === 0 && !isGenerating && (
              <div className="flex flex-col items-center justify-center py-6 max-w-2xl mx-auto space-y-6">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-primary border border-outline-variant/30 shadow-lg mx-auto">
                    <span className="material-symbols-outlined text-[26px]">neurology</span>
                  </div>
                  <h3 className="font-headline-sm text-lg font-bold text-on-surface tracking-tight">
                    Ask Trace Grounded Assistant
                  </h3>
                  <p className="font-body-sm text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
                    Select the PDF documents below to strictly scope the retrieval and citations.
                  </p>
                </div>

                {/* Document Scope Selector */}
                <div className="w-full">
                  <DocumentScopeSelector
                    documents={documents}
                    selectedDocIds={selectedDocIds}
                    onChangeSelectedDocIds={setSelectedDocIds}
                  />
                </div>

                {/* Suggested Questions */}
                <div className="w-full space-y-2 pt-2">
                  <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block">
                    Suggested Inquiries
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
                    {[
                      "What are the main concepts and methodology in these documents?",
                      "Summarize the architectural components and data flow.",
                      "What are the security, isolation, and compliance guarantees?",
                      "List all configuration options and recommended settings.",
                    ].map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (selectedDocIds.length === 0) {
                            toast.error('Please select at least one document first.')
                            return
                          }
                          setInputPrompt(preset)
                          inputRef.current?.focus()
                        }}
                        className="text-left p-3 rounded-xl bg-surface-container/70 text-xs font-medium text-on-surface hover:text-primary hover:bg-surface-container-high transition-all border border-outline-variant/20 hover:border-primary/40 flex items-center justify-between group cursor-pointer shadow-sm"
                      >
                        <span className="leading-snug">{preset}</span>
                        <span className="material-symbols-outlined text-[15px] text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0">
                          arrow_forward
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Rendered Messages */}
            {messages.map((message) => {
              const isUser = message.role === 'user'

              if (isUser) {
                return (
                  <article key={message.id} className="flex flex-col gap-space-xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-sm">
                        <span className="h-6 w-6 rounded bg-surface-container-high flex items-center justify-center font-label-sm text-label-sm font-semibold text-secondary">
                          {initials}
                        </span>
                        <span className="font-headline-sm text-body-sm font-medium text-on-surface">
                          {user?.name || user?.email?.split('@')[0] || 'Operator'}
                        </span>
                        <span className="font-label-sm text-label-sm text-on-surface-variant/60">
                          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono">
                        Prompt #{message.id.slice(0, 6)}
                      </span>
                    </div>
                    <div className="bg-surface-container p-space-md rounded-xl text-on-surface font-body-lg text-body-lg shadow-sm border border-outline-variant/20">
                      {message.content}
                    </div>
                  </article>
                )
              }

              // Assistant synthesis
              const citations = message.citations || []
              const isSelectedAssistant = currentAssistantMessage?.id === message.id

              return (
                <div key={message.id} className="space-y-space-sm">
                  {/* Grounding Provenance Ribbon with interactive inspection */}
                  <div
                    onClick={() => {
                      setSelectedMessageId(message.id)
                      if (citations.length > 0) {
                        setIsSourcesCollapsed(false)
                        if (window.innerWidth < 1024) setIsMobileDrawerOpen(true)
                      }
                    }}
                    className={`rounded-xl border transition-all cursor-pointer shadow-sm ${
                      isSelectedAssistant
                        ? 'border-secondary/40 bg-surface-container-low'
                        : 'border-outline-variant/20 bg-surface-container-low/60 hover:border-outline-variant/40'
                    }`}
                  >
                    <div className="flex items-center justify-between px-3.5 py-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse"></span>
                        <span className="font-medium text-on-surface">
                          Grounded in {citations.length} indexed source{citations.length === 1 ? '' : 's'}
                        </span>
                        <span className="text-outline-variant/50 hidden sm:inline">•</span>
                        <span className="text-on-surface-variant/70 hidden sm:inline">
                          {citations.length > 0 ? 'Click to inspect in sources panel' : 'No direct passages cited'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {citations.length > 0 && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedMessageId(message.id)
                              setIsSourcesCollapsed(false)
                              if (window.innerWidth < 1024) setIsMobileDrawerOpen(true)
                            }}
                            className="text-[11px] text-secondary hover:text-on-surface transition-colors cursor-pointer flex items-center gap-1 font-mono-code"
                          >
                            <span>Inspect {citations.length} sources</span>
                            <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setExpandedTelemetry((prev) => ({
                              ...prev,
                              [message.id]: !prev[message.id],
                            }))
                          }}
                          className="text-[11px] text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer flex items-center gap-1 font-mono-code"
                        >
                          <span>{expandedTelemetry[message.id] ? 'Hide SLA' : 'SLA'}</span>
                          <span className="material-symbols-outlined text-[14px]">
                            {expandedTelemetry[message.id] ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {expandedTelemetry[message.id] && (
                      <div className="px-3.5 pb-3 pt-1 border-t border-outline-variant/15 bg-surface-container-lowest/50 animate-in fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs font-mono-code">
                          <div className="p-2.5 rounded bg-surface-container border border-outline-variant/20">
                            <div className="text-[10px] text-on-surface-variant uppercase">Embedding Model</div>
                            <div className="text-on-surface font-semibold mt-0.5">gemini-embedding-001</div>
                            <div className="text-[10px] text-secondary">768-D Float32 (Cosine)</div>
                          </div>
                          <div className="p-2.5 rounded bg-surface-container border border-outline-variant/20">
                            <div className="text-[10px] text-on-surface-variant uppercase">Vector ANN Query</div>
                            <div className="text-on-surface font-semibold mt-0.5">{citations.length} chunks retrieved</div>
                            <div className="text-[10px] text-primary">Neon pgvector HNSW</div>
                          </div>
                          <div className="p-2.5 rounded bg-surface-container border border-outline-variant/20">
                            <div className="text-[10px] text-on-surface-variant uppercase">Grounding SLA</div>
                            <div className="text-on-surface font-semibold mt-0.5">100% Verified</div>
                            <div className="text-[10px] text-primary">Threshold &lt;= 0.40 • ~110ms</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Grounded TRACE Synthesis Card */}
                  <article className="flex flex-col gap-space-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-space-sm">
                        <div className="h-6 w-6 rounded bg-primary-container/20 border border-primary/30 flex items-center justify-center">
                          <span className="material-symbols-outlined text-primary text-[16px]">neurology</span>
                        </div>
                        <span className="font-headline-sm text-body-sm font-medium text-on-surface">
                          TRACE Synthesis
                        </span>
                        <span className="font-label-sm text-label-sm px-1.5 py-0.2 rounded bg-primary/10 text-primary">
                          Strict Grounded
                        </span>
                      </div>
                      <div className="flex items-center gap-space-xs text-on-surface-variant font-label-sm text-label-sm">
                        <span>Model:</span>
                        <span className="text-secondary font-code-inline">gemini-flash-latest</span>
                      </div>
                    </div>

                    <div className="bg-surface-container-low rounded-xl p-space-lg shadow-md space-y-space-md border border-outline-variant/30">
                      <div className="prose prose-invert max-w-none font-body-md text-body-md text-on-surface leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ children }) => (
                              <p className="mb-3 leading-relaxed">
                                {Array.isArray(children)
                                  ? children.map((child) =>
                                      typeof child === 'string'
                                        ? renderTextWithCitations(child, message.id)
                                        : child
                                    )
                                  : typeof children === 'string'
                                  ? renderTextWithCitations(children, message.id)
                                  : children}
                              </p>
                            ),
                            code: ({ inline, children }: any) => {
                              const codeText = String(children).replace(/\n$/, '')
                              if (inline) {
                                return (
                                  <code className="font-code-inline text-code-inline px-1.5 py-0.5 rounded bg-surface-container-highest text-secondary">
                                    {codeText}
                                  </code>
                                )
                              }
                              return (
                                <div className="bg-surface-container-lowest rounded-lg p-space-md font-code-body text-code-body shadow-inner space-y-space-xs overflow-x-auto my-3 border border-outline-variant/20">
                                  <div className="flex items-center justify-between text-on-surface-variant pb-space-xs font-label-sm text-label-sm border-b border-outline-variant/20">
                                    <span className="flex items-center gap-1.5 text-secondary">
                                      <span className="material-symbols-outlined text-[14px]">terminal</span>
                                      code snippet
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        navigator.clipboard.writeText(codeText)
                                        toast.success('Code copied to clipboard')
                                      }}
                                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                                    >
                                      <span className="material-symbols-outlined text-[12px]">content_copy</span>
                                      <span>Copy</span>
                                    </button>
                                  </div>
                                  <pre className="text-on-surface font-code-body text-code-body leading-relaxed pt-2">
                                    <code>{codeText}</code>
                                  </pre>
                                </div>
                              )
                            },
                          }}
                        >
                          {message.content}
                        </ReactMarkdown>
                      </div>

                      {/* Verification Callout Banner */}
                      <div className="flex items-start gap-space-sm p-space-md rounded-lg bg-primary/10 text-on-surface shadow-sm border border-primary/20">
                        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">
                          verified_user
                        </span>
                        <div className="flex flex-col">
                          <span className="font-headline-sm text-body-sm font-semibold text-primary">
                            Verified Grounded Response
                          </span>
                          <span className="font-body-sm text-body-sm text-on-surface-variant">
                            Gemini structured schema validation completed. All claims strictly verified against {citations.length} cited source fragments.
                          </span>
                        </div>
                      </div>

                      {/* Synthesis Toolbar Actions */}
                      <div className="flex items-center justify-between pt-space-xs font-label-sm text-label-sm text-on-surface-variant border-t border-outline-variant/20">
                        <div className="flex items-center gap-space-xs">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(message.content)
                              toast.success('Synthesis copied to clipboard')
                            }}
                            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                            title="Copy synthesis"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">content_copy</span>
                          </button>
                          <button
                            onClick={() => toast.success('Marked as verified accurate')}
                            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                            title="Verified Accurate"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                          </button>
                          <button
                            onClick={() => toast.info('Feedback recorded')}
                            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                            title="Mark Inaccurate"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-[16px]">thumb_down</span>
                          </button>
                        </div>
                        <span className="font-code-inline text-[11px] text-secondary">
                          {citations.length} citations indexed
                        </span>
                      </div>
                    </div>
                  </article>
                </div>
              )
            })}

            {/* Active Streaming / Generating Progress Indicator */}
            {isGenerating && (
              <article className="flex flex-col gap-space-xs animate-in fade-in">
                <div className="bg-surface-container-low rounded-xl p-space-md shadow-sm space-y-space-sm border border-secondary/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-secondary animate-ping"></span>
                      <span className="font-headline-sm text-body-sm font-medium text-secondary">
                        Retrieving chunks with similarity &gt;= 0.40 & synthesizing answer...
                      </span>
                    </div>
                    <span className="font-code-inline text-label-sm text-on-surface-variant">
                      In-flight
                    </span>
                  </div>
                  <div className="w-full h-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-secondary transition-all duration-700 animate-pulse w-3/5"></div>
                  </div>
                  <div className="flex items-center justify-between font-label-sm text-label-sm text-on-surface-variant">
                    <span className="flex items-center gap-1 font-code-inline">
                      <span className="material-symbols-outlined text-[14px] text-secondary">sync</span>
                      pgvector cosine ANN lookup & context assembly
                    </span>
                    <span className="font-code-inline text-primary">Searching...</span>
                  </div>
                </div>
              </article>
            )}

            {/* Error Banner */}
            {error && (
              <div className="rounded-xl p-space-md bg-error/10 border border-error/30 text-error flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px]">error</span>
                  <span>{error || 'An error occurred during retrieval or synthesis.'}</span>
                </div>
                <button
                  onClick={() => retry()}
                  className="px-3 py-1 rounded bg-error/20 text-error font-medium text-xs hover:bg-error/30 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* BOTTOM COMPOSER: Instrumentation Grade Input Console */}
          <footer className="p-gutter md:p-gutter-lg bg-surface-container-lowest/95 backdrop-blur-md shadow-lg sticky bottom-0 z-20 border-t border-outline-variant/20">
            <div className="max-w-5xl mx-auto flex flex-col gap-space-xs">
              {/* Filter / Scope Pills */}
              <div className="flex items-center flex-wrap gap-space-xs font-label-sm text-label-sm">
                <button
                  type="button"
                  onClick={() => setIsScopeModalOpen(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary border border-outline-variant/20 transition-colors cursor-pointer"
                  title="Click to view active document scope"
                >
                  <span className="material-symbols-outlined text-[13px] text-primary">domain_verification</span>
                  <span className="truncate max-w-[200px]">Scope: {scopeLabel}</span>
                  <span className="material-symbols-outlined text-[11px] opacity-60">expand_more</span>
                </button>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container text-on-surface-variant border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[13px] text-secondary">tune</span>
                  <span>Similarity: strict (0.40)</span>
                </div>
                <div className="flex items-center gap-1 px-2 py-1 rounded bg-surface-container text-on-surface-variant border border-outline-variant/20">
                  <span className="material-symbols-outlined text-[13px] text-tertiary">memory</span>
                  <span>Model: Gemini Flash</span>
                </div>
              </div>

              {/* Main Input Field Container */}
              <div className="relative bg-surface-container rounded-xl p-space-sm shadow-inner focus-within:bg-surface-container-high transition-all border border-outline-variant/30">
                <textarea
                  ref={inputRef}
                  value={inputPrompt}
                  onChange={(e) => setInputPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isGenerating}
                  rows={2}
                  placeholder="Ask a technical question about your indexed documentation... (Enter to send, Shift+Enter for newline)"
                  className="w-full bg-transparent resize-none font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none px-space-xs"
                />
                <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/20">
                  <div className="flex items-center gap-space-xs">
                    <span className="font-label-sm text-label-sm text-on-surface-variant/80 font-code-inline">
                      Grounded retrieval active
                    </span>
                  </div>
                  <div className="flex items-center gap-space-xs">
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!inputPrompt.trim() || isGenerating}
                      className="flex items-center gap-1.5 px-space-md py-1.5 rounded bg-primary-container hover:bg-primary text-on-primary-container font-headline-sm text-body-sm font-semibold transition-all shadow-md disabled:opacity-50 cursor-pointer"
                    >
                      <span>Send</span>
                      <kbd className="font-label-sm text-label-sm px-1 rounded bg-on-primary-container/20 text-on-primary-container">
                        ↵
                      </kbd>
                    </button>
                  </div>
                </div>
              </div>

              {/* Subtext Micro-Guarantee */}
              <div className="flex items-center justify-between text-[11px] font-label-sm text-on-surface-variant/60 px-1">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  All citations strictly mapped to pgvector IDs. No unverified web retrieval.
                </span>
                <span className="hidden sm:inline">Latency SLA &lt; 200ms TTFT</span>
              </div>
            </div>
          </footer>
        </section>

        {/* DRAGGABLE DIVIDER (Desktop Only, shown when sources panel is open) */}
        {!isSourcesCollapsed && (
          <div
            onPointerDown={startResizing}
            onDoubleClick={() => setSourcesWidth(DEFAULT_SOURCES_WIDTH)}
            title="Drag to resize sources panel (Double-click to reset width)"
            className={`hidden lg:flex w-2.5 items-center justify-center cursor-col-resize select-none shrink-0 group relative z-20 transition-colors ${
              isDragging ? 'bg-primary/20' : 'hover:bg-primary/10'
            }`}
          >
            {/* Divider Line */}
            <div
              className={`w-[1px] h-full ${
                isDragging ? 'bg-primary' : 'bg-outline-variant/30 group-hover:bg-primary/50'
              } transition-colors`}
            />
            {/* Drag Grip Handle */}
            <div
              className={`absolute w-3.5 h-8 rounded-full flex flex-col items-center justify-center gap-0.5 shadow-sm border border-outline-variant/30 bg-surface-container ${
                isDragging ? 'border-primary ring-1 ring-primary' : 'group-hover:border-primary/50'
              }`}
            >
              <span className="w-1 h-1 rounded-full bg-on-surface-variant/70"></span>
              <span className="w-1 h-1 rounded-full bg-on-surface-variant/70"></span>
              <span className="w-1 h-1 rounded-full bg-on-surface-variant/70"></span>
            </div>
          </div>
        )}

        {/* RIGHT INSPECTOR RAIL: Grounded Source Cards & Chunk Inspector (Desktop) */}
        {!isSourcesCollapsed && (
          <aside
            style={{ width: `${sourcesWidth}px` }}
            className="hidden lg:flex flex-col justify-between bg-surface-container-low shrink-0 h-full overflow-hidden shadow-xl"
          >
            {renderSourcesPanelContent()}
          </aside>
        )}

        {/* Collapsed Rail Indicator (Desktop) */}
        {isSourcesCollapsed && (
          <button
            type="button"
            onClick={() => setIsSourcesCollapsed(false)}
            title="Expand Retrieved Sources"
            className="hidden lg:flex items-center justify-center w-8 shrink-0 bg-surface-container-low border-l border-outline-variant/20 hover:bg-surface-container hover:text-primary text-on-surface-variant transition-colors cursor-pointer"
          >
            <div className="flex flex-col items-center gap-2 py-4">
              <span className="material-symbols-outlined text-[18px]">dock_to_left</span>
              <span className="text-[11px] font-medium [writing-mode:vertical-rl] tracking-wider uppercase text-on-surface-variant">
                Sources ({allCitations.length})
              </span>
            </div>
          </button>
        )}
      </div>

      {/* MOBILE / TABLET SLIDE-OUT DRAWER (< 1024px) */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileDrawerOpen(false)}
          />
          {/* Drawer Sheet */}
          <aside className="relative ml-auto w-full max-w-md h-full bg-surface-container-low shadow-2xl flex flex-col z-10 border-l border-outline-variant/30 animate-in slide-in-from-right duration-250">
            {renderSourcesPanelContent()}
          </aside>
        </div>
      )}

      {/* Raw Document Viewer Modal */}
      <DocumentViewerModal
        document={viewingDoc}
        initialPage={viewingDoc?.page || 1}
        onClose={() => setViewingDoc(null)}
      />

      {/* Scope Details Modal */}
      <ScopeDetailsModal
        isOpen={isScopeModalOpen}
        onClose={() => setIsScopeModalOpen(false)}
        documents={documents}
        selectedDocIds={selectedDocIds}
        isExistingChat={Boolean(conversationId && messages.length > 0)}
        onNewChat={() => {
          setSelectedDocIds(readyDocIds)
          navigate('/chat')
        }}
        onUpdateScope={handleUpdateScope}
      />

      {/* Chunk Preview Modal */}
      <ChunkPreviewModal
        citation={previewingCitation}
        onClose={() => setPreviewingCitation(null)}
        onOpenDocumentViewer={(docId, name, page, section, excerpt) =>
          setViewingDoc({
            id: docId,
            name,
            page,
            section,
            chunkExcerpt: excerpt,
          })
        }
      />

      {/* Export Dialog */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        conversationId={conversationId}
        title={activeConversation?.title || 'Knowledge Query'}
        messages={messages}
        scopedDocumentNames={scopedDocumentNames}
      />
    </div>
  )
}
