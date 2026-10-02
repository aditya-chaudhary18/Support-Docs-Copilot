import { useState } from 'react'
import { downloadSessionExport } from '@/lib/export'
import { toast } from 'sonner'
import type { ChatMessage } from '@/types'

interface ExportDialogProps {
  isOpen: boolean
  onClose: () => void
  conversationId?: string | null
  title?: string
  messages: ChatMessage[]
  scopedDocumentNames?: string[]
}

type ExportFormat = 'pdf' | 'markdown' | 'json'

export function ExportDialog({
  isOpen,
  onClose,
  conversationId,
  title = 'Grounded Documentation Query',
  messages,
  scopedDocumentNames = [],
}: ExportDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>('pdf')
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const turnsCount = messages.filter((m) => m.role === 'user').length
  const totalCitations = messages.reduce((acc, m) => acc + (m.citations?.length || 0), 0)

  const handleDownload = async () => {
    if (messages.length === 0) {
      toast.info('No messages in the session to export')
      return
    }

    try {
      setIsExporting(true)
      await downloadSessionExport({
        conversationId,
        title,
        messages,
        format: selectedFormat,
        selectedDocumentNames: scopedDocumentNames,
      })
      toast.success(
        `Export downloaded: support-docs-copilot-${title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32)}.${
          selectedFormat === 'pdf' ? 'pdf' : selectedFormat === 'json' ? 'json' : 'md'
        }`
      )
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={() => !isExporting && onClose()}
      />

      {/* Modal Dialog Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
        className="relative w-full max-w-lg rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-outline-variant/20 bg-surface-container-lowest/80 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[22px]">file_download</span>
            </div>
            <div>
              <h3 id="export-dialog-title" className="font-headline-sm text-base font-semibold text-on-surface">
                Export Grounded Session
              </h3>
              <p className="text-xs text-on-surface-variant">
                Save an authoritative record with verifiable citations.
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* Metadata Card */}
          <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/20 space-y-2">
            <div className="flex justify-between items-center text-on-surface-variant">
              <span>Session:</span>
              <span className="font-medium text-on-surface truncate max-w-[260px]">{title}</span>
            </div>
            <div className="flex justify-between items-center text-on-surface-variant">
              <span>Turns / Citations:</span>
              <span className="font-mono-code text-secondary">
                {turnsCount} turns • {totalCitations} verified citations
              </span>
            </div>
            <div className="flex justify-between items-start text-on-surface-variant">
              <span className="shrink-0 mr-2">Scope:</span>
              <span className="font-mono-code text-right text-primary truncate max-w-[260px]">
                {scopedDocumentNames.length > 0
                  ? `${scopedDocumentNames.length} document${scopedDocumentNames.length === 1 ? '' : 's'} (${scopedDocumentNames.slice(0, 2).join(', ')}${scopedDocumentNames.length > 2 ? '...' : ''})`
                  : 'All Indexed Documents'}
              </span>
            </div>
          </div>

          {/* Format Radio Selection */}
          <div className="space-y-2.5">
            <label className="block font-semibold text-on-surface uppercase tracking-wider text-[11px]">
              Select Export Format
            </label>

            {/* PDF Option */}
            <div
              onClick={() => setSelectedFormat('pdf')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedFormat === 'pdf'
                  ? 'border-primary bg-primary/10 ring-1 ring-primary'
                  : 'border-outline-variant/20 bg-surface-container hover:bg-surface-container-high'
              }`}
            >
              <div className="mt-0.5 text-primary">
                <span className="material-symbols-outlined text-[24px]">picture_as_pdf</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-on-surface">PDF Document (.pdf)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase">
                    Publication Quality
                  </span>
                </div>
                <p className="text-on-surface-variant leading-relaxed">
                  Multi-page formatted ReportLab PDF with session metadata, question cards, assistant answers, and citation tables.
                </p>
              </div>
            </div>

            {/* Markdown Option */}
            <div
              onClick={() => setSelectedFormat('markdown')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedFormat === 'markdown'
                  ? 'border-secondary bg-secondary/10 ring-1 ring-secondary'
                  : 'border-outline-variant/20 bg-surface-container hover:bg-surface-container-high'
              }`}
            >
              <div className="mt-0.5 text-secondary">
                <span className="material-symbols-outlined text-[24px]">article</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-on-surface">Markdown (.md)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary/20 text-secondary uppercase">
                    Standard
                  </span>
                </div>
                <p className="text-on-surface-variant leading-relaxed">
                  Clean GitHub-flavored Markdown containing questions, full answers, and blockquoted source citations.
                </p>
              </div>
            </div>

            {/* JSON Option */}
            <div
              onClick={() => setSelectedFormat('json')}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                selectedFormat === 'json'
                  ? 'border-outline bg-surface-container-highest ring-1 ring-outline'
                  : 'border-outline-variant/20 bg-surface-container hover:bg-surface-container-high'
              }`}
            >
              <div className="mt-0.5 text-on-surface-variant">
                <span className="material-symbols-outlined text-[24px]">data_object</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm text-on-surface">Structured JSON (.json)</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant uppercase">
                    Raw Data
                  </span>
                </div>
                <p className="text-on-surface-variant leading-relaxed">
                  Complete machine-readable JSON structure with chunk IDs, relevance metrics, and ISO timestamps.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-4 border-t border-outline-variant/20 bg-surface-container-lowest/80">
          <button
            type="button"
            disabled={isExporting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isExporting || messages.length === 0}
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary font-medium text-xs hover:bg-primary/90 transition-all shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                <span>Generating {selectedFormat.toUpperCase()}...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">download</span>
                <span>Download {selectedFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
