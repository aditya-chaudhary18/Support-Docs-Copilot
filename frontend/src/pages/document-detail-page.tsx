import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useDocument, useDocumentChunks, useDocumentMutations } from '@/hooks/use-documents'
import { ConfirmDialog } from '@/components/layout/confirm-dialog'
import { DocumentViewerModal } from '@/components/documents/document-viewer-modal'
import { toast } from 'sonner'

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: document, isLoading: docLoading } = useDocument(id)
  const { data: chunks = [], isLoading: chunksLoading } = useDocumentChunks(id)
  const { remove } = useDocumentMutations()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewingPage, setViewingPage] = useState(1)

  if (docLoading) {
    return (
      <div className="flex h-96 items-center justify-center text-on-surface-variant font-mono-code">
        <span className="material-symbols-outlined text-[24px] animate-spin mr-2">sync</span>
        Retrieving document metadata from PostgreSQL...
      </div>
    )
  }

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center p-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-on-surface">Document not found</h2>
        <p className="text-sm text-on-surface-variant">This document may have been deleted or moved.</p>
        <Link
          to="/documents"
          className="px-4 py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors font-medium text-sm"
        >
          ← Back to Documents Library
        </Link>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await remove(document.id)
      toast.success('Document deleted from R2 and pgvector')
      navigate('/documents')
    } catch {
      toast.error('Failed to delete document')
    }
  }

  const extension = document.name.split('.').pop()?.toUpperCase() || 'FILE'
  const isReady = document.status === 'ready'
  const isProcessing = document.status === 'processing' || document.status === 'queued'

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface bg-grid-pattern min-h-screen">
      {/* Header Banner */}
      <section className="bg-surface-container-lowest px-gutter md:px-gutter-lg py-space-md border-b border-outline-variant/20 shadow-sm">
        <div className="flex flex-col gap-space-xs">
          <Link
            to="/documents"
            className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-primary transition-colors font-mono-code mb-1"
          >
            ← Back to Documents
          </Link>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary">
                  DOC ID: {document.id}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-label-sm text-label-sm font-bold ${
                    isReady
                      ? 'bg-primary/10 text-primary'
                      : isProcessing
                      ? 'bg-secondary/10 text-secondary'
                      : 'bg-error/10 text-error'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isReady ? 'bg-primary' : isProcessing ? 'bg-secondary animate-ping' : 'bg-error'
                    }`}
                  ></span>
                  {document.status.toUpperCase()}
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight mt-1">
                {document.name}
              </h1>
            </div>

            <div className="flex items-center gap-space-sm">
              <button
                onClick={() => {
                  setViewingPage(1)
                  setViewerOpen(true)
                }}
                className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-primary-container hover:bg-primary text-on-primary-container transition-all font-body-sm text-body-sm font-semibold shadow-md cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                <span>View Original Document</span>
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="flex items-center gap-1.5 px-space-md py-2 rounded-xl bg-error/10 hover:bg-error/20 text-error transition-all font-body-sm text-body-sm font-medium border border-error/30 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="px-gutter md:px-gutter-lg py-space-lg flex flex-col gap-space-lg">
        {/* Metadata Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-md font-mono-code">
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span className="text-[10px] text-on-surface-variant uppercase">MIME TYPE</span>
            <div className="font-bold text-on-surface mt-1 text-sm">{extension} Document</div>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span className="text-[10px] text-on-surface-variant uppercase">FILE SIZE</span>
            <div className="font-bold text-on-surface mt-1 text-sm">
              {document.sizeBytes ? `${(document.sizeBytes / 1024).toFixed(1)} KB` : 'Uploaded'}
            </div>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span className="text-[10px] text-on-surface-variant uppercase">INDEXED CHUNKS</span>
            <div className="font-bold text-primary mt-1 text-sm">
              {document.chunkCount || chunks.length || 0} vectors
            </div>
          </div>
          <div className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20">
            <span className="text-[10px] text-on-surface-variant uppercase">R2 VAULT STORAGE</span>
            <div className="font-bold text-secondary mt-1 text-sm truncate" title={`r2://trace-vault/${document.id}`}>
              r2://trace-vault/{document.id.slice(0, 8)}
            </div>
          </div>
        </div>

        {/* Chunks Inspection Section */}
        <section className="bg-surface-container-low rounded-xl p-space-lg border border-outline-variant/30 space-y-space-md">
          <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">splitscreen</span>
              <h2 className="font-headline-sm text-body-lg font-bold text-on-surface">
                Extracted Chunks & Embedding Vectors
              </h2>
            </div>
            <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-mono">
              768-D Float32
            </span>
          </div>

          {chunksLoading ? (
            <div className="py-8 text-center text-on-surface-variant font-mono-code text-sm">
              Loading vector chunks from Neon PostgreSQL...
            </div>
          ) : chunks.length === 0 ? (
            <div className="py-8 text-center text-on-surface-variant font-mono-code text-sm">
              {isProcessing
                ? 'Document is currently being chunked and embedded by Gemini...'
                : 'No chunks found for this document.'}
            </div>
          ) : (
            <div className="space-y-space-sm">
              {chunks.map((chunk) => (
                <div
                  key={chunk.id}
                  className="p-space-md rounded-lg bg-surface-container border border-outline-variant/20 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-mono-code">
                    <span className="text-secondary font-bold">
                      Chunk #{chunk.index + 1}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-on-surface-variant">
                        Page {chunk.page || 1} • {chunk.section || 'General'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setViewingPage(chunk.page || 1)
                          setViewerOpen(true)
                        }}
                        className="text-secondary hover:underline flex items-center gap-0.5 cursor-pointer"
                        title="View in original document"
                      >
                        <span>View file</span>
                        <span className="material-symbols-outlined text-[13px]">open_in_new</span>
                      </button>
                    </div>
                  </div>
                  <div className="p-space-sm rounded bg-surface-container-lowest font-code-body text-code-body text-on-surface leading-relaxed text-[12px] border border-outline-variant/10">
                    {chunk.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Document"
        description={`Permanently delete "${document.name}" and all its pgvector embeddings from Neon and files from Cloudflare R2?`}
        confirmLabel="Delete Document"
        onConfirm={handleDelete}
      />

      <DocumentViewerModal
        document={viewerOpen ? { id: document.id, name: document.name, fileType: document.fileType, page: viewingPage } : null}
        initialPage={viewingPage}
        onClose={() => setViewerOpen(false)}
      />
    </div>
  )
}
