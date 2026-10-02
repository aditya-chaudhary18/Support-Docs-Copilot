import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDocuments } from '@/hooks/use-documents'
import { useConversations } from '@/hooks/use-conversations'
import { useDocumentUpload } from '@/hooks/use-document-upload'
import { DocumentViewerModal, type DocumentViewerTarget } from '@/components/documents/document-viewer-modal'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: documents = [], isLoading: docsLoading } = useDocuments()
  const { data: conversations = [], isLoading: convsLoading } = useConversations()
  const { addFiles, items, dismiss } = useDocumentUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [viewingDoc, setViewingDoc] = useState<DocumentViewerTarget | null>(null)
  const [showDiagnostics, setShowDiagnostics] = useState(false)

  const readyDocs = documents.filter((d) => d.status === 'ready').length
  const procDocs = documents.filter((d) => d.status === 'processing' || d.status === 'queued').length
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0)
  const totalBytes = documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0)
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files))
    }
  }

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface bg-grid-pattern min-h-screen">
      {/* Header Banner */}
      <section className="bg-surface-container-lowest px-gutter md:px-gutter-lg py-space-md border-b border-outline-variant/20 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-secondary"></span>
                Indexed and ready
              </span>
              <button
                type="button"
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs text-on-surface-variant hover:text-secondary cursor-pointer flex items-center gap-1 font-mono-code transition-colors"
              >
                <span>{showDiagnostics ? 'Hide system diagnostics' : 'View system diagnostics'}</span>
                <span className="material-symbols-outlined text-[13px]">
                  {showDiagnostics ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Workspace Overview & Vector Analytics
            </h1>
          </div>

          <div className="flex items-center gap-space-sm">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-surface-container-high text-on-surface hover:bg-surface-bright transition-all font-body-sm text-body-sm font-medium shadow-sm cursor-pointer border border-outline-variant/25"
            >
              <span className="material-symbols-outlined text-[16px] text-secondary">cloud_upload</span>
              <span>Upload Document</span>
            </button>
            <button
              onClick={() => navigate('/chat')}
              className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary transition-all font-body-sm text-body-sm font-semibold shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Collapsible System Diagnostics */}
        {showDiagnostics && (
          <div className="mt-4 pt-3 border-t border-outline-variant/15 flex flex-wrap items-center gap-4 text-xs font-mono-code text-on-surface-variant animate-in fade-in duration-200">
            <span>Cluster: <strong className="text-on-surface">neon-cloud-prod</strong></span>
            <span>•</span>
            <span>Index: <strong className="text-primary">HNSW Cosine (&lt;=&gt;)</strong></span>
            <span>•</span>
            <span>Dimensions: <strong className="text-secondary">768-D Float32</strong></span>
            <span>•</span>
            <span>Storage Engine: <strong className="text-on-surface">Cloudflare R2 Encrypted</strong></span>
          </div>
        )}
      </section>

      {/* Main Container */}
      <div className="px-gutter md:px-gutter-lg py-space-lg flex flex-col gap-space-xl">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {/* Card 1: Documents */}
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-on-surface-variant mb-2">
              <span className="text-xs uppercase font-medium tracking-wide">Documents</span>
              <span className="material-symbols-outlined text-primary text-[20px]">description</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-on-surface">
                {documents.length}
              </span>
              <span className="text-xs text-primary font-medium">
                {readyDocs} ready
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>{procDocs > 0 ? `${procDocs} processing` : 'All ready'}</span>
              <Link to="/documents" className="text-secondary hover:underline">
                View library →
              </Link>
            </div>
          </div>

          {/* Card 2: Chunks */}
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-on-surface-variant mb-2">
              <span className="text-xs uppercase font-medium tracking-wide">Indexed Chunks</span>
              <span className="material-symbols-outlined text-secondary text-[20px]">dataset</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-secondary">
                {totalChunks.toLocaleString()}
              </span>
              <span className="text-xs text-on-surface-variant">
                vectors
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>pgvector Cosine</span>
              <span className="text-primary font-medium">Ready</span>
            </div>
          </div>

          {/* Card 3: Storage */}
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-on-surface-variant mb-2">
              <span className="text-xs uppercase font-medium tracking-wide">Storage Vault</span>
              <span className="material-symbols-outlined text-tertiary text-[20px]">cloud_done</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-on-surface">
                {totalMB}
              </span>
              <span className="text-xs text-on-surface-variant">
                MB
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>Cloudflare R2</span>
              <span className="text-secondary font-medium">Encrypted</span>
            </div>
          </div>

          {/* Card 4: Conversations */}
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between text-on-surface-variant mb-2">
              <span className="text-xs uppercase font-medium tracking-wide">Chat Sessions</span>
              <span className="material-symbols-outlined text-primary text-[20px]">forum</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-on-surface">
                {conversations.length}
              </span>
              <span className="text-xs text-primary font-medium">
                sessions
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-outline-variant/10 flex items-center justify-between text-[11px] text-on-surface-variant">
              <span>Grounded Q&A</span>
              <Link to="/chat" className="text-secondary hover:underline">
                Ask Trace →
              </Link>
            </div>
          </div>
        </div>

        {/* Upload in-flight items */}
        {items.length > 0 && (
          <div className="p-space-md rounded-xl bg-surface-container-low border border-secondary/30 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono-code text-secondary font-bold">
              <span>IN-FLIGHT DOCUMENT INGESTION</span>
              <span>{items.length} file(s)</span>
            </div>
            {items.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-surface-container font-mono-code">
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="material-symbols-outlined text-[15px] shrink-0">
                    {it.status === 'success' ? (
                      <span className="text-primary">check_circle</span>
                    ) : it.status === 'error' ? (
                      <span className="text-error">error</span>
                    ) : (
                      <span className="text-secondary animate-spin">sync</span>
                    )}
                  </span>
                  <span className="truncate text-on-surface">{it.file.name}</span>
                  {it.error && (
                    <span className="text-[11px] text-error font-sans truncate hidden sm:inline">
                      — {it.error}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    title={it.error || undefined}
                    className={`text-[10px] uppercase font-bold ${it.status === 'success' ? 'text-primary' : it.status === 'error' ? 'text-error' : 'text-secondary'}`}
                  >
                    {it.status}
                  </span>
                  <button onClick={() => dismiss(it.id)} className="text-on-surface-variant hover:text-on-surface cursor-pointer p-0.5" title="Dismiss">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recent Activity Split */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {/* Recent Documents Card */}
          <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/20 shadow-sm flex flex-col justify-between gap-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                <h3 className="text-sm font-bold text-on-surface">
                  Recent Documents
                </h3>
              </div>
              <Link to="/documents" className="text-xs text-secondary hover:underline">
                View All ({documents.length}) →
              </Link>
            </div>

            <div className="space-y-2 flex-1">
              {docsLoading ? (
                <div className="py-8 text-center text-on-surface-variant text-xs font-mono-code">
                  Loading documents...
                </div>
              ) : documents.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant text-xs">
                  No documents uploaded yet. Click "Upload Document" above.
                </div>
              ) : (
                documents.slice(0, 5).map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/10 group"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="h-7 w-7 rounded bg-surface-container-highest text-secondary flex items-center justify-center font-bold text-[10px] shrink-0">
                        {doc.name.split('.').pop()?.toUpperCase() || 'DOC'}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span
                          onClick={() =>
                            setViewingDoc({
                              id: doc.id,
                              name: doc.name,
                              fileType: doc.fileType,
                            })
                          }
                          className="text-xs font-medium text-on-surface truncate hover:text-primary transition-colors cursor-pointer"
                          title="Click to view raw document"
                        >
                          {doc.name}
                        </span>
                        <span className="text-[11px] font-mono-code text-on-surface-variant/70">
                          {doc.chunkCount || 0} chunks • {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)} KB` : 'Uploaded'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setViewingDoc({
                            id: doc.id,
                            name: doc.name,
                            fileType: doc.fileType,
                          })
                        }
                        className="text-xs text-secondary hover:underline cursor-pointer flex items-center gap-0.5"
                      >
                        <span>View</span>
                        <span className="material-symbols-outlined text-[13px]">visibility</span>
                      </button>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          doc.status === 'ready'
                            ? 'bg-primary/10 text-primary'
                            : doc.status === 'processing'
                            ? 'bg-secondary/10 text-secondary'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {doc.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Conversations Card */}
          <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/20 shadow-sm flex flex-col justify-between gap-space-md">
            <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">chat</span>
                <h3 className="text-sm font-bold text-on-surface">
                  Recent Chat Sessions
                </h3>
              </div>
              <Link to="/conversations" className="text-xs text-secondary hover:underline">
                View All ({conversations.length}) →
              </Link>
            </div>

            <div className="space-y-2 flex-1">
              {convsLoading ? (
                <div className="py-8 text-center text-on-surface-variant text-xs font-mono-code">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="py-8 text-center text-on-surface-variant text-xs">
                  No conversation sessions yet. Start asking questions in Chat.
                </div>
              ) : (
                conversations.slice(0, 5).map((conv) => (
                  <Link
                    key={conv.id}
                    to={`/chat/${conv.id}`}
                    className="flex items-center justify-between p-space-sm rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors border border-outline-variant/10 group"
                  >
                    <div className="flex items-center gap-space-sm min-w-0">
                      <div className="h-7 w-7 rounded bg-surface-container-highest text-primary flex items-center justify-center font-bold text-[12px] shrink-0">
                        #
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-medium text-on-surface truncate group-hover:text-secondary transition-colors">
                          {conv.title || 'Untitled Session'}
                        </span>
                        <span className="text-[11px] text-on-surface-variant/70">
                          {conv.preview || 'Grounded Q&A'}
                        </span>
                      </div>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-secondary transition-colors">
                      arrow_forward
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Calm Telemetry Footer */}
        <section className="p-space-md rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-wrap items-center justify-between gap-4 text-xs text-on-surface-variant">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-primary">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              pgvector Knowledge Base: Ready
            </span>
            <span>•</span>
            <span className="text-secondary">Cloudflare R2: Vault Synced</span>
            <span>•</span>
            <span className="text-tertiary">Google Gemini: Active</span>
          </div>
          <span className="text-on-surface-variant/60">
            Strict tenant isolation
          </span>
        </section>
      </div>

      {/* Raw Document Viewer Modal */}
      <DocumentViewerModal
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />
    </div>
  )
}
