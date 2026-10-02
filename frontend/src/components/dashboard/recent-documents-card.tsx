import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { FileTypeIcon } from '@/components/documents/file-type-icon'
import { DocumentStatusBadge } from '@/components/documents/document-status-badge'
import { formatBytes, formatDate } from '@/lib/format'
import type { TraceDocument } from '@/types'

interface RecentDocumentsCardProps {
  documents: TraceDocument[]
}

export function RecentDocumentsCard({ documents }: RecentDocumentsCardProps) {
  const displayDocs = documents.slice(0, 5)

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground">Recent Documents</h3>
        <Link
          to="/documents"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="flex-1 space-y-2">
        {displayDocs.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No documents uploaded yet.
          </div>
        ) : (
          displayDocs.map((doc) => (
            <Link
              key={doc.id}
              to={`/documents/${doc.id}`}
              className="flex items-center justify-between rounded-lg p-2.5 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/60"
            >
              <div className="flex items-center gap-3 min-w-0 pr-2">
                <FileTypeIcon fileType={doc.fileType} size="sm" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-medium text-foreground hover:text-primary transition-colors">
                    {doc.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {formatBytes(doc.sizeBytes)} · {formatDate(doc.uploadedAt)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <DocumentStatusBadge status={doc.status} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
