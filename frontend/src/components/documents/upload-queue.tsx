import { Link } from 'react-router-dom'
import { CheckCircle2, RotateCw, X, XCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Spinner } from '@/components/ui/spinner'
import { detectFileType } from '@/lib/files'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { UploadItem } from '@/types'
import { FileTypeIcon } from './file-type-icon'

interface UploadQueueProps {
  items: UploadItem[]
  onRetry: (id: string) => void
  onDismiss: (id: string) => void
}

const STATUS_TEXT: Record<UploadItem['status'], string> = {
  uploading: 'Uploading',
  processing: 'Chunking and embedding',
  success: 'Ready to query',
  error: 'Failed',
}

export function UploadQueue({ items, onRetry, onDismiss }: UploadQueueProps) {
  return (
    <ul className="flex flex-col divide-y rounded-lg border" aria-label="Upload queue" aria-live="polite">
      {items.map((item) => (
        <UploadQueueRow key={item.id} item={item} onRetry={onRetry} onDismiss={onDismiss} />
      ))}
    </ul>
  )
}

function UploadQueueRow({ item, onRetry, onDismiss }: { item: UploadItem } & Omit<UploadQueueProps, 'items'>) {
  const fileType = detectFileType(item.file.name) ?? 'txt'
  const isActive = item.status === 'uploading' || item.status === 'processing'
  const isRetryable = item.status === 'error' && detectFileType(item.file.name) !== null && item.file.size <= 25 * 1024 * 1024

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <FileTypeIcon fileType={fileType} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium">{item.file.name}</p>
          <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
            {item.status === 'uploading' ? `${item.progress}%` : formatBytes(item.file.size)}
          </span>
        </div>

        {isActive && (
          <Progress
            value={item.status === 'processing' ? 100 : item.progress}
            aria-label={`${item.file.name} upload progress`}
            className={cn(item.status === 'processing' && 'animate-pulse')}
          />
        )}

        <p
          className={cn(
            'flex items-center gap-1.5 text-xs',
            item.status === 'error' ? 'text-destructive' : 'text-muted-foreground',
            item.status === 'success' && 'text-success',
          )}
        >
          {isActive && <Spinner className="size-3" />}
          {item.status === 'success' && <CheckCircle2 className="size-3" aria-hidden="true" />}
          {item.status === 'error' && <XCircle className="size-3" aria-hidden="true" />}
          {item.status === 'error' ? item.error : STATUS_TEXT[item.status]}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {item.status === 'success' && item.documentId && (
          <Link to={`/documents/${item.documentId}`} className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            View
          </Link>
        )}
        {isRetryable && (
          <Button variant="ghost" size="icon-sm" onClick={() => onRetry(item.id)} aria-label={`Retry ${item.file.name}`}>
            <RotateCw />
          </Button>
        )}
        {!isActive && (
          <Button variant="ghost" size="icon-sm" onClick={() => onDismiss(item.id)} aria-label={`Dismiss ${item.file.name}`}>
            <X />
          </Button>
        )}
      </div>
    </li>
  )
}
