import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useDocuments, useDocumentMutations } from '@/hooks/use-documents'
import { useDocumentUpload } from '@/hooks/use-document-upload'
import { ConfirmDialog } from '@/components/layout/confirm-dialog'
import { DocumentViewerModal, type DocumentViewerTarget } from '@/components/documents/document-viewer-modal'
import { toast } from 'sonner'
import type { TraceDocument } from '@/types'

export function DocumentsPage() {
  const { data: documents = [], isLoading } = useDocuments()
  const { remove } = useDocumentMutations()
  const { items, addFiles, dismiss } = useDocumentUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deleteTarget, setDeleteTarget] = useState<TraceDocument | null>(null)
  const [viewingDoc, setViewingDoc] = useState<DocumentViewerTarget | null>(null)
  const [showTechDetails, setShowTechDetails] = useState(false)
  const [chunkSize, setChunkSize] = useState(1200)
  const [overlap, setOverlap] = useState(200)
  const [isDragging, setIsDragging] = useState(false)

  // Real metric calculations
  const readyDocs = documents.filter((d) => d.status === 'ready').length
  const procDocs = documents.filter((d) => d.status === 'processing' || d.status === 'queued').length
  const failedDocs = documents.filter((d) => d.status === 'failed').length
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0)
  const totalBytes = documents.reduce((acc, d) => acc + (d.sizeBytes || 0), 0)
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)

  // In-flight or latest document
  const activeProcessingDoc = documents.find((d) => d.status === 'processing' || d.status === 'queued')
  const heroDoc = activeProcessingDoc || documents[0]

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.id.toLowerCase().includes(search.toLowerCase()) ||
      (doc.fileType && doc.fileType.toLowerCase().includes(search.toLowerCase()))

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'ready'
        ? doc.status === 'ready'
        : statusFilter === 'processing'
        ? doc.status === 'processing' || doc.status === 'queued'
        : doc.status === 'failed'

    return matchesSearch && matchesStatus
  })

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    try {
      await remove(deleteTarget.id)
      toast.success(`"${deleteTarget.name}" deleted from library`)
    } catch {
      toast.error('Failed to delete document')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files))
    }
  }

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
          {/* Title & Status */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-secondary"></span>
                Indexed and ready
              </span>
              <button
                type="button"
                onClick={() => setShowTechDetails(!showTechDetails)}
                className="text-xs text-on-surface-variant hover:text-secondary cursor-pointer flex items-center gap-1 font-mono-code transition-colors"
              >
                <span>{showTechDetails ? 'Hide technical details' : 'View technical details'}</span>
                <span className="material-symbols-outlined text-[13px]">
                  {showTechDetails ? 'expand_less' : 'expand_more'}
                </span>
              </button>
            </div>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Documents & Knowledge Library
            </h1>
          </div>

          {/* Quick Metrics & Upload Action */}
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-sm rounded-xl border border-outline-variant/20 text-xs">
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-medium">Ready Documents</span>
                <span className="font-semibold text-on-surface">
                  {readyDocs} <span className="text-on-surface-variant font-normal">/ {documents.length}</span>
                </span>
              </div>
              <div className="h-6 w-px bg-surface-container-highest"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-medium">Indexed Chunks</span>
                <span className="font-semibold text-primary">
                  {totalChunks.toLocaleString()}
                </span>
              </div>
              <div className="h-6 w-px bg-surface-container-highest"></div>
              <div className="flex flex-col">
                <span className="text-[10px] text-on-surface-variant uppercase font-medium">Storage</span>
                <span className="font-semibold text-on-surface">{totalMB} MB</span>
              </div>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById('upload-dropzone-section')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="flex items-center gap-1.5 px-space-md py-2.5 rounded-xl bg-primary-container text-on-primary-container hover:bg-primary transition-all font-body-sm text-body-sm font-semibold shadow-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              <span>Upload Document</span>
            </button>
          </div>
        </div>

        {/* Collapsible Technical Details Ribbon */}
        {showTechDetails && (
          <div className="mt-4 pt-3 border-t border-outline-variant/15 flex flex-wrap items-center gap-4 text-xs font-mono-code text-on-surface-variant animate-in fade-in duration-200">
            <span>Worker: <strong className="text-on-surface">worker-us-east.04</strong></span>
            <span>•</span>
            <span>Chunk Engine: <strong className="text-secondary">v2.4 AST Recursive</strong></span>
            <span>•</span>
            <span>pgvector: <strong className="text-primary">neon-cloud-prod (hnsw_m:16, ef_search:64)</strong></span>
            <span>•</span>
            <span>Vault: <strong className="text-on-surface">Cloudflare R2 (AES-256)</strong></span>
          </div>
        )}
      </section>

      {/* Main Content Area */}
      <div className="px-gutter md:px-gutter-lg py-space-lg flex flex-col gap-space-lg">
        {/* PIPELINE OVERVIEW (Clean & Lightweight) */}
        {heroDoc && (
          <section className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/20 shadow-sm flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`material-symbols-outlined text-[20px] text-primary ${heroDoc.status === 'processing' ? 'animate-spin' : ''}`}>
                  {heroDoc.status === 'processing' ? 'cyclone' : 'verified'}
                </span>
                <span className="text-xs font-semibold text-on-surface">
                  {heroDoc.status === 'processing' ? 'Processing Document' : 'Ingestion Pipeline Synced'}
                </span>
                <span className="text-xs text-on-surface-variant truncate max-w-xs">
                  — {heroDoc.name}
                </span>
              </div>
              <span className="text-[11px] font-mono-code text-on-surface-variant/70">
                {heroDoc.chunkCount || 0} vectors in pgvector
              </span>
            </div>

            {/* Visual Step Pipeline */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-xs font-mono-code">
              {[
                { label: 'Upload', status: 'done', detail: 'Cloudflare R2' },
                { label: 'Extract', status: 'done', detail: 'PyMuPDF' },
                { label: 'Prepare', status: 'done', detail: 'Normalized' },
                { label: 'Chunk', status: 'done', detail: `${chunkSize} tokens` },
                { label: 'Embed', status: heroDoc.status === 'ready' ? 'done' : 'active', detail: '768-D Float32' },
                { label: 'Indexed', status: heroDoc.status === 'ready' ? 'done' : 'queued', detail: 'Ready for Q&A' },
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border flex flex-col gap-0.5 ${
                    step.status === 'done'
                      ? 'bg-surface-container border-primary/30 text-on-surface'
                      : step.status === 'active'
                      ? 'bg-secondary/10 border-secondary/40 text-secondary'
                      : 'bg-surface-container-lowest/50 border-outline-variant/15 text-on-surface-variant/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span>{step.label}</span>
                    <span className="material-symbols-outlined text-[13px] text-primary">
                      {step.status === 'done' ? 'check' : step.status === 'active' ? 'sync' : 'hourglass_empty'}
                    </span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant truncate">{step.detail}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* UPLOAD DROPZONE */}
        <section id="upload-dropzone-section" className="bg-surface-container-low rounded-xl p-space-md border border-outline-variant/20 shadow-sm flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsDragging(true)
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`bg-surface-container-lowest rounded-xl p-6 sm:p-8 flex flex-col items-center justify-center text-center group cursor-pointer border-2 border-dashed transition-all ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-outline-variant/30 hover:border-secondary hover:bg-surface-container-high/40'
            }`}
          >
            <div className="h-12 w-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-3 shadow-sm border border-outline-variant/20">
              <span className="material-symbols-outlined text-[26px]">cloud_upload</span>
            </div>
            <div className="font-headline-sm text-body-base font-semibold text-on-surface mb-1">
              Drag & drop technical documentation to ingest
            </div>
            <p className="font-body-sm text-xs text-on-surface-variant max-w-md mb-3">
              Supports <strong className="text-on-surface font-semibold">PDF, DOCX, TXT, MD</strong> up to 64 MB per file.
              Extracted passages are automatically chunked and embedded for grounded AI answers.
            </p>
            <button
              type="button"
              className="px-4 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-body-sm text-xs font-medium hover:bg-surface-bright transition-all shadow-sm border border-outline-variant/20"
            >
              Browse Files
            </button>
          </div>

          {/* In-Flight Upload Items */}
          {items.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container text-xs font-mono-code border border-outline-variant/20"
                >
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
                    <button
                      onClick={() => dismiss(it.id)}
                      className="text-on-surface-variant hover:text-on-surface cursor-pointer p-0.5"
                      title="Dismiss"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Collapsible Advanced Chunking Parameters */}
          <details className="text-xs text-on-surface-variant">
            <summary className="cursor-pointer hover:text-secondary select-none font-medium flex items-center gap-1.5 pt-1">
              <span className="material-symbols-outlined text-[15px]">tune</span>
              <span>Advanced chunking configuration</span>
            </summary>
            <div className="mt-3 p-4 rounded-xl bg-surface-container-lowest border border-outline-variant/15 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-[11px] font-medium text-on-surface">Target Chunk Size</span>
                  <span className="font-mono-code text-primary font-bold">{chunkSize} tokens</span>
                </div>
                <input
                  type="range"
                  min="256"
                  max="4096"
                  step="128"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(Number(e.target.value))}
                  className="w-full accent-primary h-1 bg-surface-container-highest rounded cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant/70">Controls passage granularity in vector store</span>
              </div>

              <div className="flex flex-col gap-1">
                <div className="flex justify-between">
                  <span className="text-[11px] font-medium text-on-surface">Sliding Window Overlap</span>
                  <span className="font-mono-code text-secondary font-bold">{overlap} tokens</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="600"
                  step="50"
                  value={overlap}
                  onChange={(e) => setOverlap(Number(e.target.value))}
                  className="w-full accent-secondary h-1 bg-surface-container-highest rounded cursor-pointer"
                />
                <span className="text-[10px] text-on-surface-variant/70">Maintains semantic context across chunk splits</span>
              </div>
            </div>
          </details>
        </section>

        {/* DOCUMENT REPOSITORY TABLE */}
        <section className="bg-surface-container-low rounded-xl p-space-md sm:p-space-lg border border-outline-variant/20 shadow-sm flex flex-col gap-space-md">
          {/* Table Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-lg">
              <div className="flex items-center gap-2 bg-surface-container-lowest px-3 py-2 rounded-lg flex-1 border border-outline-variant/25">
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant">search</span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter documents..."
                  className="bg-transparent text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none w-full"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-surface-container-lowest text-xs text-on-surface py-2 px-3 rounded-lg border border-outline-variant/25 focus:outline-none cursor-pointer"
              >
                <option value="all">All ({documents.length})</option>
                <option value="ready">Ready ({readyDocs})</option>
                <option value="processing">Processing ({procDocs})</option>
                <option value="failed">Failed ({failedDocs})</option>
              </select>
            </div>

            <div className="text-xs text-on-surface-variant/70">
              Showing <strong className="text-on-surface font-semibold">{filteredDocs.length}</strong> document{filteredDocs.length === 1 ? '' : 's'}
            </div>
          </div>

          {/* Clean Data Table */}
          <div className="overflow-x-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-surface-container-high/60 text-on-surface-variant font-label-sm uppercase tracking-wider border-b border-outline-variant/15">
                  <th className="py-3 px-4 font-semibold">Document</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Indexed Chunks</th>
                  <th className="py-3 px-4 font-semibold">Uploaded</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-on-surface">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant font-mono-code">
                      Loading documents library...
                    </td>
                  </tr>
                ) : filteredDocs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-on-surface-variant">
                      No documents found matching criteria. Upload a file above to begin.
                    </td>
                  </tr>
                ) : (
                  filteredDocs.map((doc) => {
                    const isProcessing = doc.status === 'processing' || doc.status === 'queued'
                    const isReady = doc.status === 'ready'
                    const extension = doc.name.split('.').pop()?.toUpperCase() || 'FILE'

                    return (
                      <tr
                        key={doc.id}
                        className={`transition-colors hover:bg-surface-container-high/30 ${
                          isProcessing ? 'bg-secondary/5' : ''
                        }`}
                      >
                        {/* Document Icon & Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-surface-container-highest text-secondary flex items-center justify-center font-bold text-[10px] shrink-0 border border-outline-variant/20">
                              {extension}
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
                                className="font-semibold text-on-surface hover:text-primary transition-colors truncate cursor-pointer"
                                title="Click to view raw document"
                              >
                                {doc.name}
                              </span>
                              <span className="text-[11px] text-on-surface-variant/70 font-mono-code">
                                {doc.sizeBytes ? `${(doc.sizeBytes / 1024).toFixed(0)} KB` : 'Uploaded'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                              isReady
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : isProcessing
                                ? 'bg-secondary/10 text-secondary border border-secondary/20'
                                : 'bg-error/10 text-error border border-error/20'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isReady
                                  ? 'bg-primary'
                                  : isProcessing
                                  ? 'bg-secondary animate-pulse'
                                  : 'bg-error'
                              }`}
                            ></span>
                            {doc.status.toUpperCase()}
                          </span>
                        </td>

                        {/* Chunk count */}
                        <td className="py-3 px-4 font-mono-code text-on-surface">
                          <span className="text-primary font-bold">{doc.chunkCount || 0}</span> chunks
                        </td>

                        {/* Date */}
                        <td className="py-3 px-4 text-on-surface-variant text-[11px]">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : 'Recent'}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Primary Action: View Raw Document */}
                            <button
                              type="button"
                              onClick={() =>
                                setViewingDoc({
                                  id: doc.id,
                                  name: doc.name,
                                  fileType: doc.fileType,
                                })
                              }
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-container hover:bg-secondary/20 hover:text-secondary text-on-surface-variant text-xs font-medium transition-colors cursor-pointer border border-outline-variant/20"
                              title="View original uploaded document in browser"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                              <span>View</span>
                            </button>

                            {/* Secondary Action: Inspect Chunks */}
                            <Link
                              to={`/documents/${doc.id}`}
                              className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                              title="Inspect Extracted Chunks"
                            >
                              <span className="material-symbols-outlined text-[16px]">splitscreen</span>
                            </Link>

                            {/* Delete Action */}
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(doc)}
                              className="p-1 rounded-lg text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                              title="Delete Document"
                            >
                              <span className="material-symbols-outlined text-[16px]">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Document"
        description={`Are you sure you want to permanently delete "${deleteTarget?.name}"? All associated vectors in Neon pgvector and files in Cloudflare R2 will be removed.`}
        confirmLabel="Delete Document"
        onConfirm={handleDeleteConfirm}
      />

      {/* Raw Document Viewer Modal */}
      <DocumentViewerModal
        document={viewingDoc}
        onClose={() => setViewingDoc(null)}
      />
    </div>
  )
}
