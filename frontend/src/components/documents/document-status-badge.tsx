import { CheckCircle2, CircleDashed, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import type { DocumentStatus } from '@/types'

const LABELS: Record<DocumentStatus, string> = {
  ready: 'Ready',
  processing: 'Processing',
  queued: 'Queued',
  failed: 'Failed',
}

export function DocumentStatusBadge({ status, className }: { status: DocumentStatus; className?: string }) {
  if (status === 'failed') {
    return (
      <Badge variant="destructive" className={className}>
        <XCircle data-icon="inline-start" />
        {LABELS.failed}
      </Badge>
    )
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        status === 'ready' && 'border-success/30 bg-success/10 text-success',
        status === 'processing' && 'border-warning/40 bg-warning/10 text-foreground',
        status === 'queued' && 'text-muted-foreground',
        className,
      )}
    >
      {status === 'ready' && <CheckCircle2 data-icon="inline-start" />}
      {status === 'processing' && <Spinner data-icon="inline-start" />}
      {status === 'queued' && <CircleDashed data-icon="inline-start" />}
      {LABELS[status]}
    </Badge>
  )
}
