import { useState } from 'react'
import type { Citation } from '@/types'
import { toast } from 'sonner'

interface ChunkPreviewModalProps {
  citation: Citation | null
  onClose: () => void
  onOpenDocumentViewer?: (docId: string, docName: string, page?: number, section?: string, excerpt?: string) => void
}

export function ChunkPreviewModal({
  citation,
  onClose,
  onOpenDocumentViewer,
}: ChunkPreviewModalProps) {
  const [copied, setCopied] = useState(false)

  if (!citation) return null

  const pct = Math.round(citation.relevance * 100)
  const cosineDist = (1 - citation.relevance).toFixed(3)
  const wordsCount = citation.excerpt ? citation.excerpt.trim().split(/\s+/).length : 0
  const charCount = citation.excerpt?.length || 0

  const handleCopy = () => {
    if (!citation.excerpt) return
    navigator.clipboard.writeText(citation.excerpt)
    setCopied(true)
    toast.success('Chunk text copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="chunk-preview-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-2xl overflow-hidden z-10 flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-outline-variant/20 bg-surface-container-lowest/90 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <span className="font-citation-tag text-sm px-2 py-1 rounded bg-secondary/15 text-secondary font-bold shrink-0">
              [{citation.id}]
            </span>
            <div className="min-w-0">
              <h3 id="chunk-preview-title" className="font-headline-sm text-sm sm:text-base font-semibold text-on-surface truncate">
                {citation.documentName}
              </h3>
              <p className="text-[11px] text-on-surface-variant flex items-center gap-2">
                <span>Page {citation.page || 1}</span>
                <span>•</span>
                <span className="truncate">{citation.section || 'Extracted Section'}</span>
                {citation.chunkIndex !== undefined && (
                  <>
                    <span>•</span>
                    <span className="font-mono-code text-secondary">Chunk #{citation.chunkIndex}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer shrink-0"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Telemetry Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:px-5 bg-surface-container border-b border-outline-variant/15 text-xs font-mono-code">
          <div className="p-2 rounded bg-surface-container-low border border-outline-variant/20">
            <div className="text-[10px] text-on-surface-variant uppercase">Similarity</div>
            <div className="text-primary font-semibold text-sm">{pct}% Match</div>
          </div>
          <div className="p-2 rounded bg-surface-container-low border border-outline-variant/20">
            <div className="text-[10px] text-on-surface-variant uppercase">Cosine Dist</div>
            <div className="text-secondary font-semibold text-sm">{cosineDist}</div>
          </div>
          <div className="p-2 rounded bg-surface-container-low border border-outline-variant/20">
            <div className="text-[10px] text-on-surface-variant uppercase">Length</div>
            <div className="text-on-surface font-semibold text-sm">{wordsCount} words</div>
          </div>
          <div className="p-2 rounded bg-surface-container-low border border-outline-variant/20">
            <div className="text-[10px] text-on-surface-variant uppercase">Vector Store</div>
            <div className="text-primary font-semibold text-sm">Neon pgvector</div>
          </div>
        </div>

        {/* Chunk Content Body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-primary">data_object</span>
              <span>Full Chunk Excerpt</span>
            </span>
            <span className="text-[11px] font-mono-code text-on-surface-variant">
              {charCount} characters
            </span>
          </div>

          <div className="p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/20 font-body-sm text-sm text-on-surface leading-relaxed shadow-inner select-text whitespace-pre-wrap">
            {citation.excerpt}
          </div>

          {citation.chunkId && (
            <div className="p-2.5 rounded-lg bg-surface-container border border-outline-variant/15 flex items-center justify-between text-[11px] font-mono-code text-on-surface-variant">
              <span>Database Chunk ID:</span>
              <span className="text-secondary truncate max-w-[280px]">{citation.chunkId}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 border-t border-outline-variant/20 bg-surface-container-lowest/80">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-medium border border-outline-variant/20 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">
              {copied ? 'check' : 'content_copy'}
            </span>
            <span>{copied ? 'Copied!' : 'Copy Chunk Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            {onOpenDocumentViewer && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onOpenDocumentViewer(
                    citation.documentId,
                    citation.documentName,
                    citation.page || 1,
                    citation.section,
                    citation.excerpt
                  )
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary text-xs font-medium border border-secondary/30 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
                <span>Open Document Viewer</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-medium hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
