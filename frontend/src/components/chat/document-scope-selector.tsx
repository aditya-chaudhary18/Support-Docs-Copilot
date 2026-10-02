import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import type { Document } from '@/types'

interface DocumentScopeSelectorProps {
  documents: Document[]
  selectedDocIds: string[]
  onChangeSelectedDocIds: (ids: string[]) => void
  disabled?: boolean
}

export function DocumentScopeSelector({
  documents,
  selectedDocIds,
  onChangeSelectedDocIds,
  disabled = false,
}: DocumentScopeSelectorProps) {
  const [filterQuery, setFilterQuery] = useState('')

  const readyDocuments = useMemo(
    () => documents.filter((d) => d.status === 'ready'),
    [documents]
  )

  const filteredDocs = useMemo(() => {
    if (!filterQuery.trim()) return readyDocuments
    const q = filterQuery.toLowerCase()
    return readyDocuments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.description && d.description.toLowerCase().includes(q))
    )
  }, [readyDocuments, filterQuery])

  const allSelected = readyDocuments.length > 0 && selectedDocIds.length === readyDocuments.length
  const noneSelected = selectedDocIds.length === 0

  const handleToggle = (docId: string) => {
    if (disabled) return
    if (selectedDocIds.includes(docId)) {
      onChangeSelectedDocIds(selectedDocIds.filter((id) => id !== docId))
    } else {
      onChangeSelectedDocIds([...selectedDocIds, docId])
    }
  }

  const handleSelectAll = () => {
    if (disabled) return
    onChangeSelectedDocIds(readyDocuments.map((d) => d.id))
  }

  const handleClearAll = () => {
    if (disabled) return
    onChangeSelectedDocIds([])
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (readyDocuments.length === 0) {
    return (
      <div className="w-full rounded-2xl bg-surface-container-low border border-outline-variant/30 p-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-surface-container-high flex items-center justify-center text-on-surface-variant mx-auto">
          <span className="material-symbols-outlined text-[24px]">folder_off</span>
        </div>
        <h4 className="font-headline-sm text-sm font-semibold text-on-surface">
          No Ready Documents Found
        </h4>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          Trace requires at least one indexed PDF or markdown document in your library to start a grounded chat.
        </p>
        <div className="pt-2">
          <Link
            to="/documents"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-medium hover:bg-primary/90 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">upload_file</span>
            <span>Upload Documents</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full rounded-2xl bg-surface-container-low/90 backdrop-blur-md border border-outline-variant/30 shadow-md p-4 sm:p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[18px]">verified</span>
          </div>
          <div>
            <h4 className="font-headline-sm text-sm font-semibold text-on-surface flex items-center gap-2">
              <span>Select Grounded Scope</span>
              <span
                className={`text-[11px] font-mono-code px-2 py-0.5 rounded-full ${
                  noneSelected
                    ? 'bg-error/20 text-error font-semibold'
                    : 'bg-primary/15 text-primary font-medium'
                }`}
              >
                {selectedDocIds.length} of {readyDocuments.length} selected
              </span>
            </h4>
            <p className="text-[11px] text-on-surface-variant">
              Only passages from selected documents will be retrieved for grounding.
            </p>
          </div>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={disabled || allSelected}
            onClick={handleSelectAll}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Select All
          </button>
          <button
            type="button"
            disabled={disabled || noneSelected}
            onClick={handleClearAll}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 disabled:opacity-40 transition-colors cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Optional Search if more than 4 documents */}
      {readyDocuments.length > 4 && (
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
            search
          </span>
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Search documents by name..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface placeholder:text-on-surface-variant/60 border border-outline-variant/20 focus:outline-none focus:border-primary/50"
          />
        </div>
      )}

      {/* Document Checkbox Grid / List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
        {filteredDocs.map((doc) => {
          const isSelected = selectedDocIds.includes(doc.id)
          const isPdf = doc.name.toLowerCase().endsWith('.pdf') || doc.fileType === 'pdf'

          return (
            <div
              key={doc.id}
              onClick={() => handleToggle(doc.id)}
              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                isSelected
                  ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/30'
                  : 'border-outline-variant/20 bg-surface-container/60 hover:bg-surface-container-high/80'
              } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(doc.id)}
                  disabled={disabled}
                  className="rounded border-outline-variant text-primary focus:ring-primary/40 h-4 w-4 shrink-0 cursor-pointer"
                />
                <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
                  {isPdf ? 'picture_as_pdf' : 'description'}
                </span>
                <div className="min-w-0">
                  <div className="font-medium text-xs text-on-surface truncate" title={doc.name}>
                    {doc.name}
                  </div>
                  <div className="text-[10px] text-on-surface-variant font-mono-code flex items-center gap-1.5">
                    {doc.sizeBytes && <span>{formatFileSize(doc.sizeBytes)}</span>}
                    {doc.chunkCount && (
                      <>
                        <span>•</span>
                        <span>{doc.chunkCount} chunks</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant shrink-0 border border-outline-variant/20">
                Ready
              </span>
            </div>
          )
        })}
      </div>

      {/* Zero Selected Warning Callout */}
      {noneSelected && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-error/10 border border-error/30 text-error text-xs">
          <span className="material-symbols-outlined text-[16px] shrink-0">warning</span>
          <span>Please select at least one document to start a grounded chat session.</span>
        </div>
      )}
    </div>
  )
}

interface ScopeDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  documents: Document[]
  selectedDocIds: string[]
  isExistingChat?: boolean
  onNewChat: () => void
  onUpdateScope?: (ids: string[]) => Promise<void> | void
}

export function ScopeDetailsModal({
  isOpen,
  onClose,
  documents,
  selectedDocIds,
  isExistingChat: _isExistingChat = false,
  onNewChat,
  onUpdateScope,
}: ScopeDetailsModalProps) {
  const readyDocuments = useMemo(() => documents.filter((d) => d.status === 'ready'), [documents])
  const [draftIds, setDraftIds] = useState<string[]>(() =>
    selectedDocIds.length > 0 ? selectedDocIds : readyDocuments.map((d) => d.id)
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  // Re-sync draft when opened
  useEffect(() => {
    if (isOpen) {
      setDraftIds(selectedDocIds.length > 0 ? selectedDocIds : readyDocuments.map((d) => d.id))
      setSearchQuery('')
      setIsSaving(false)
    }
  }, [isOpen, selectedDocIds, readyDocuments])

  if (!isOpen) return null

  const filteredDocs = readyDocuments.filter((d) =>
    searchQuery.trim()
      ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.description && d.description.toLowerCase().includes(searchQuery.toLowerCase()))
      : true
  )

  const allSelected = readyDocuments.length > 0 && draftIds.length === readyDocuments.length
  const noneSelected = draftIds.length === 0

  const handleToggle = (id: string) => {
    if (draftIds.includes(id)) {
      setDraftIds(draftIds.filter((item) => item !== id))
    } else {
      setDraftIds([...draftIds, id])
    }
  }

  const handleSelectAll = () => {
    setDraftIds(readyDocuments.map((d) => d.id))
  }

  const handleClearAll = () => {
    setDraftIds([])
  }

  const handleApply = async () => {
    if (draftIds.length === 0) {
      return
    }
    if (onUpdateScope) {
      try {
        setIsSaving(true)
        await onUpdateScope(draftIds)
        onClose()
      } finally {
        setIsSaving(false)
      }
    } else {
      onClose()
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scope-details-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-2xl overflow-hidden z-10 p-5 space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">domain_verification</span>
            </div>
            <div>
              <h3 id="scope-details-title" className="font-semibold text-sm sm:text-base text-on-surface">
                Active Document Scope
              </h3>
              <p className="text-[11px] text-on-surface-variant">
                Select one or multiple documents to ground retrieval and citations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Controls & Search */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center justify-between">
            <span
              className={`text-xs font-mono-code px-2 py-0.5 rounded-full ${
                noneSelected
                  ? 'bg-error/20 text-error font-semibold'
                  : 'bg-primary/15 text-primary font-medium'
              }`}
            >
              {draftIds.length} of {readyDocuments.length} documents selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={allSelected}
                onClick={handleSelectAll}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant/20 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Select All
              </button>
              <button
                type="button"
                disabled={noneSelected}
                onClick={handleClearAll}
                className="px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline-variant/20 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {readyDocuments.length > 3 && (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[16px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter documents..."
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surface-container text-xs text-on-surface placeholder:text-on-surface-variant/60 border border-outline-variant/20 focus:outline-none focus:border-primary/50"
              />
            </div>
          )}
        </div>

        {/* Document Checkbox List */}
        <div className="space-y-2 flex-1 overflow-y-auto pr-1 min-h-[160px] max-h-72">
          {filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-xs text-on-surface-variant">
              No ready documents found.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = draftIds.includes(doc.id)
              const isPdf = doc.name.toLowerCase().endsWith('.pdf') || doc.fileType === 'pdf'

              return (
                <div
                  key={doc.id}
                  onClick={() => handleToggle(doc.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-primary/50 bg-primary/10 ring-1 ring-primary/30'
                      : 'border-outline-variant/20 bg-surface-container/60 hover:bg-surface-container-high/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggle(doc.id)}
                      className="rounded border-outline-variant text-primary focus:ring-primary/40 h-4 w-4 shrink-0 cursor-pointer"
                    />
                    <span className="material-symbols-outlined text-[20px] text-primary shrink-0">
                      {isPdf ? 'picture_as_pdf' : 'description'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-xs text-on-surface truncate" title={doc.name}>
                        {doc.name}
                      </div>
                      <div className="text-[10px] text-on-surface-variant font-mono-code">
                        {doc.chunkCount ? `${doc.chunkCount} chunks` : 'Indexed'}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 border ${
                      isSelected
                        ? 'bg-primary/20 text-primary border-primary/30'
                        : 'bg-surface-container text-on-surface-variant border-outline-variant/20'
                    }`}
                  >
                    {isSelected ? 'In Scope' : 'Excluded'}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {noneSelected && (
          <div className="p-2 rounded-lg bg-error/10 border border-error/30 text-error text-xs shrink-0 flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">warning</span>
            <span>Select at least one document to ground retrieval.</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-3 border-t border-outline-variant/20 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose()
              onNewChat()
            }}
            className="flex items-center justify-center gap-1 py-1.5 px-3 rounded-lg text-xs font-medium text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[15px]">add</span>
            <span>New Chat</span>
          </button>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={noneSelected || isSaving}
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <span className="material-symbols-outlined text-[15px] animate-spin">progress_activity</span>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[15px]">check</span>
                  <span>Apply Scope ({draftIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

