import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { FILE_TYPE_LABELS } from '@/lib/files'
import { formatBytes, formatDate, formatNumber } from '@/lib/format'
import type { TraceDocument } from '@/types'
import { DocumentActionsMenu } from './document-actions-menu'
import { DocumentStatusBadge } from './document-status-badge'
import { FileTypeIcon } from './file-type-icon'

interface DocumentsTableProps {
  documents: TraceDocument[]
  onDelete: (document: TraceDocument) => void
  onReprocess: (document: TraceDocument) => void
}

export function DocumentsTable({ documents, onDelete, onReprocess }: DocumentsTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="pl-4">Name</TableHead>
            <TableHead className="hidden md:table-cell">Type</TableHead>
            <TableHead className="hidden lg:table-cell">Uploaded</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden text-right sm:table-cell">Chunks</TableHead>
            <TableHead className="w-12 pr-4">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((document) => (
            <TableRow key={document.id}>
              <TableCell className="max-w-0 pl-4">
                <div className="flex min-w-0 items-center gap-3">
                  <FileTypeIcon fileType={document.fileType} size="sm" />
                  <div className="flex min-w-0 flex-col">
                    <Link
                      to={`/documents/${document.id}`}
                      className="truncate font-medium outline-none hover:underline focus-visible:underline"
                    >
                      {document.name}
                    </Link>
                    <span className="truncate text-xs text-muted-foreground">
                      {formatBytes(document.sizeBytes)}
                      <span className="md:hidden"> · {FILE_TYPE_LABELS[document.fileType]}</span>
                    </span>
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden text-muted-foreground md:table-cell">
                {FILE_TYPE_LABELS[document.fileType]}
              </TableCell>
              <TableCell className="hidden text-muted-foreground lg:table-cell">
                {formatDate(document.uploadedAt)}
              </TableCell>
              <TableCell>
                <DocumentStatusBadge status={document.status} />
              </TableCell>
              <TableCell className="hidden text-right font-mono text-xs tabular-nums sm:table-cell">
                {document.status === 'ready' ? formatNumber(document.chunkCount) : '—'}
              </TableCell>
              <TableCell className="pr-4 text-right">
                <DocumentActionsMenu document={document} onDelete={onDelete} onReprocess={onReprocess} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

export function DocumentsTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-lg border" aria-busy="true" aria-label="Loading documents">
      <div className="flex h-10 items-center border-b bg-muted/40 px-4">
        <Skeleton className="h-3 w-16" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-center gap-3 border-b px-4 py-3 last:border-b-0">
          <Skeleton className="size-7 rounded-md" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="hidden h-3 w-10 sm:block" />
        </div>
      ))}
    </div>
  )
}
