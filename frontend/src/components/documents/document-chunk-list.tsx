import { Layers } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import type { DocumentChunk } from '@/types'

interface DocumentChunkListProps {
  chunks: DocumentChunk[] | undefined
  isLoading: boolean
}

export function DocumentChunkList({ chunks, isLoading }: DocumentChunkListProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="flex flex-col gap-2 rounded-lg border p-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
          </div>
        ))}
      </div>
    )
  }

  if (!chunks || chunks.length === 0) {
    return (
      <Empty className="border border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Layers />
          </EmptyMedia>
          <EmptyTitle>No chunks yet</EmptyTitle>
          <EmptyDescription>Chunks appear here once the document finishes processing.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ol className="flex flex-col gap-3">
      {chunks.map((chunk) => (
        <li key={chunk.id} className="flex flex-col gap-2 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="font-mono">
              #{chunk.index + 1}
            </Badge>
            <span className="truncate text-sm font-medium">{chunk.section}</span>
            <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              {chunk.page !== undefined && <span>p. {chunk.page}</span>}
              <span className="font-mono tabular-nums">{chunk.tokenCount} tokens</span>
            </span>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">{chunk.content}</p>
        </li>
      ))}
    </ol>
  )
}
