import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { getDocumentFileBlob, getDocumentFileUrl } from '@/lib/api'
import { toast } from 'sonner'

export interface DocumentViewerTarget {
  id: string
  name: string
  fileType?: string
  page?: number
  section?: string
  chunkExcerpt?: string
}

interface DocumentViewerModalProps {
  document: DocumentViewerTarget | null
  initialPage?: number
  onClose: () => void
}

export function DocumentViewerModal({
  document: targetDoc,
  initialPage = 1,
  onClose,
}: DocumentViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [textContent, setTextContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState<number>(initialPage)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const extension = targetDoc?.fileType?.toLowerCase() || targetDoc?.name.split('.').pop()?.toLowerCase() || 'file'
  const isPdf = extension === 'pdf'
  const isMarkdown = extension === 'md'
  const isTxt = extension === 'txt'
  const isDocx = extension === 'docx'

  // Sync page when initialPage prop changes
  useEffect(() => {
    if (initialPage) {
      setCurrentPage(initialPage)
    }
  }, [initialPage, targetDoc?.id])

  // Fetch file bytes as blob whenever targetDoc changes
  useEffect(() => {
    if (!targetDoc) {
      setBlobUrl(null)
      setTextContent(null)
      setError(null)
      return
    }

    let active = true
    let createdUrl: string | null = null
    setLoading(true)
    setError(null)

    async function loadFile() {
      try {
        const blob = await getDocumentFileBlob(targetDoc!.id)
        if (!active) return

        if (isMarkdown || isTxt) {
          const text = await blob.text()
          if (!active) return
          setTextContent(text)
        }

        createdUrl = URL.createObjectURL(blob)
        setBlobUrl(createdUrl)
      } catch (err: any) {
        if (!active) return
        console.error('Failed to load raw document:', err)
        setError(err?.message || 'Could not retrieve file from private storage.')
        toast.error('Failed to load document preview')
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadFile()

    return () => {
      active = false
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl)
      }
    }
  }, [targetDoc?.id, isMarkdown, isTxt])

  // Keyboard navigation & escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!targetDoc) return
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [targetDoc, onClose])

  if (!targetDoc) return null

  const handleOpenNewTab = () => {
    if (blobUrl) {
      const pageHash = isPdf && currentPage > 1 ? `#page=${currentPage}` : ''
      window.open(`${blobUrl}${pageHash}`, '_blank', 'noopener,noreferrer')
    } else {
      const directUrl = getDocumentFileUrl(targetDoc.id, 'inline')
      window.open(directUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const handleDownload = () => {
    const downloadUrl = getDocumentFileUrl(targetDoc.id, 'attachment')
    const a = window.document.createElement('a')
    a.href = downloadUrl
    a.download = targetDoc.name
    window.document.body.appendChild(a)
    a.click()
    window.document.body.removeChild(a)
    toast.success(`Downloading ${targetDoc.name}`)
  }

  const handlePageChange = (newPage: number) => {
    if (newPage < 1) return
    setCurrentPage(newPage)
    if (iframeRef.current && blobUrl) {
      iframeRef.current.src = `${blobUrl}#page=${newPage}`
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-viewer-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`flex flex-col w-full bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-0 rounded-none border-none'
            : 'max-w-6xl h-[92vh] max-h-[1000px]'
        }`}
      >
        {/* Top Control Bar */}
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-surface-container-low border-b border-outline-variant/20 shrink-0">
          {/* Document Title & Type Indicator */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="h-8 w-8 rounded-lg bg-surface-container-high border border-outline-variant/30 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {isPdf ? (
                <span className="material-symbols-outlined text-[18px] text-error">picture_as_pdf</span>
              ) : isMarkdown ? (
                <span className="material-symbols-outlined text-[18px] text-secondary">markdown</span>
              ) : isDocx ? (
                <span className="material-symbols-outlined text-[18px] text-primary">description</span>
              ) : (
                <span className="material-symbols-outlined text-[18px] text-on-surface-variant">article</span>
              )}
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2
                  id="doc-viewer-title"
                  className="font-headline-sm text-body-base font-bold text-on-surface truncate tracking-tight"
                  title={targetDoc.name}
                >
                  {targetDoc.name}
                </h2>
                {targetDoc.page && (
                  <span className="px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/30 text-[11px] font-semibold tracking-wide shrink-0">
                    Cited: Page {targetDoc.page}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] font-mono-code text-on-surface-variant/70">
                <span>{extension.toUpperCase()}</span>
                <span>•</span>
                <span>Secure R2 Vault</span>
                {targetDoc.section && (
                  <>
                    <span>•</span>
                    <span className="truncate max-w-[200px]">{targetDoc.section}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Center Navigation Toolbar (PDF Page Selector) */}
          {isPdf && (
            <div className="flex items-center gap-1.5 bg-surface-container px-2 py-1 rounded-lg border border-outline-variant/20 text-xs font-mono-code text-on-surface">
              <button
                type="button"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage <= 1}
                className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous page"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                <span>Page</span>
                <input
                  type="number"
                  min={1}
                  value={currentPage}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10)
                    if (!isNaN(val) && val >= 1) handlePageChange(val)
                  }}
                  className="w-10 text-center bg-surface-container-high border border-outline-variant/40 rounded px-1 py-0.5 text-on-surface focus:outline-none focus:border-primary text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(currentPage + 1)}
                className="p-1 rounded hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface cursor-pointer transition-colors"
                title="Next page"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>

              {targetDoc.page && targetDoc.page !== currentPage && (
                <button
                  type="button"
                  onClick={() => handlePageChange(targetDoc.page!)}
                  className="ml-1 text-[11px] px-2 py-0.5 rounded bg-secondary/15 text-secondary hover:bg-secondary/25 transition-colors cursor-pointer font-sans font-medium"
                  title="Jump directly to the passage cited by TRACE"
                >
                  Go to cited (P.{targetDoc.page})
                </button>
              )}
            </div>
          )}

          {/* Right Action Icons */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewTab}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-medium border border-outline-variant/20 transition-colors cursor-pointer"
              title="Open raw document in new browser tab"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              <span className="hidden sm:inline">New tab</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-xs font-medium border border-outline-variant/20 transition-colors cursor-pointer"
              title="Download original file"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span className="hidden sm:inline">Download</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-surface-container-high hover:bg-error/20 hover:text-error text-on-surface transition-colors cursor-pointer ml-1"
              title="Close viewer (Esc)"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </header>

        {/* Viewer Content Canvas */}
        <main className="flex-1 bg-surface-container-lowest relative overflow-hidden flex flex-col items-center justify-center min-h-0">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center text-on-surface-variant animate-in fade-in">
              <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
              <div className="flex flex-col gap-1">
                <span className="font-headline-sm text-sm font-semibold text-on-surface">
                  Loading original file...
                </span>
                <span className="font-mono-code text-xs text-on-surface-variant/70">
                  Retrieving encrypted object from private Cloudflare R2
                </span>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center max-w-xl mx-auto w-full">
              {targetDoc.chunkExcerpt ? (
                <div className="w-full text-left space-y-3 p-5 rounded-2xl bg-surface-container border border-outline-variant/30 shadow-lg">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-secondary text-[20px]">verified</span>
                      <span className="font-semibold text-xs text-on-surface">
                        Extracted Chunk Excerpt {targetDoc.page ? `(Page ${targetDoc.page})` : ''}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-secondary/15 text-secondary">
                      pgvector verified
                    </span>
                  </div>
                  <div className="p-4 rounded-xl bg-surface-container-lowest font-body-sm text-xs text-on-surface leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto select-text border border-outline-variant/15">
                    {targetDoc.chunkExcerpt}
                  </div>
                  <p className="text-[11px] text-on-surface-variant/80">
                    Raw file fetch error: {error}. The passage above was retrieved directly from the grounded vector index.
                  </p>
                </div>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-error/10 text-error flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">error</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline-sm text-base font-bold text-on-surface">
                      Unable to display document preview
                    </h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">{error}</p>
                  </div>
                </>
              )}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary transition-colors cursor-pointer"
                >
                  Download File Instead
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface font-medium text-xs hover:bg-surface-container-high transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <>
              {isPdf ? (
                <iframe
                  ref={iframeRef}
                  src={`${blobUrl}#page=${currentPage}&view=FitH`}
                  title={targetDoc.name}
                  className="w-full h-full border-0 bg-[#525659]"
                />
              ) : isMarkdown ? (
                <div className="w-full h-full overflow-y-auto p-6 md:p-10 max-w-4xl mx-auto">
                  <div className="prose prose-invert max-w-none text-on-surface font-body-md text-sm leading-relaxed space-y-4">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {textContent || ''}
                    </ReactMarkdown>
                  </div>
                </div>
              ) : isTxt ? (
                <div className="w-full h-full overflow-auto p-6 md:p-8 font-mono-code text-xs text-on-surface leading-relaxed select-text bg-surface-container-lowest">
                  <pre className="whitespace-pre-wrap">{textContent || ''}</pre>
                </div>
              ) : isDocx ? (
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-4">
                  <div className="h-16 w-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shadow-lg">
                    <span className="material-symbols-outlined text-[36px]">description</span>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-headline-sm text-base font-bold text-on-surface">
                      Microsoft Word Document (.docx)
                    </h3>
                    <p className="font-body-sm text-xs text-on-surface-variant">
                      This document has been ingested, chunked, and embedded into pgvector.
                      To inspect the original formatted file with native layout, download or open in Microsoft Word.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary transition-colors cursor-pointer shadow-md"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                      <span>Download Original DOCX</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenNewTab}
                      className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-medium text-xs transition-colors cursor-pointer border border-outline-variant/30"
                    >
                      Open in External App
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center max-w-md space-y-4">
                  <div className="h-12 w-12 rounded-xl bg-surface-container-high text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined text-[28px]">file_present</span>
                  </div>
                  <p className="font-body-sm text-xs text-on-surface-variant">
                    Binary file format. Download to inspect locally.
                  </p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-primary-container text-on-primary-container font-semibold text-xs hover:bg-primary transition-colors cursor-pointer"
                  >
                    Download File
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
