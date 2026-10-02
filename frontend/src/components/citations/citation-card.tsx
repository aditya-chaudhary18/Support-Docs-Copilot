import { useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { FileTypeIcon } from '@/components/documents/file-type-icon'
import { Button } from '@/components/ui/button'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'
import type { Citation } from '@/types'

interface CitationCardProps {
  citation: Citation
  isHighlighted?: boolean
  defaultExpanded?: boolean
  onSelect?: () => void
}

export function CitationCard({
  citation,
  isHighlighted = false,
  defaultExpanded = false,
  onSelect,
}: CitationCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const { copy, copied } = useCopyToClipboard()

  const relevancePercent = Math.round(citation.relevance * 100)

  return (
    <div
      id={`citation-${citation.id}`}
      onClick={onSelect}
      className={cn(
        'group flex flex-col rounded-lg border bg-card/60 p-3 transition-all text-xs',
        isHighlighted
          ? 'border-primary ring-2 ring-primary/20 bg-primary/[0.03]'
          : 'border-border/80 hover:border-border hover:bg-card',
      )}
    >
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-primary/10 font-mono font-semibold text-[11px] text-primary">
            {citation.id}
          </span>
          <FileTypeIcon fileType={citation.fileType} size="sm" />
          <span className="truncate font-medium text-foreground" title={citation.documentName}>
            {citation.documentName}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              'rounded-full px-1.5 py-0.5 font-mono text-[10px] font-medium border',
              relevancePercent >= 90
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : relevancePercent >= 75
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20'
                : 'bg-muted text-muted-foreground border-border'
            )}
            title="Vector similarity relevance score"
          >
            {relevancePercent}% match
          </span>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded(!expanded)
            }}
            aria-label={expanded ? 'Collapse excerpt' : 'Expand excerpt'}
          >
            {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>
      </div>

      {/* Location / Page info */}
      <div className="mt-1.5 flex items-center gap-2 text-muted-foreground text-[11px]">
        {citation.page !== undefined && (
          <span className="font-medium text-foreground/80">Page {citation.page}</span>
        )}
        {citation.page !== undefined && citation.section && <span>•</span>}
        {citation.section && <span className="truncate">{citation.section}</span>}
      </div>

      {/* Excerpt Body */}
      {expanded ? (
        <div className="mt-2.5 rounded border border-border/50 bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed text-muted-foreground relative group/excerpt">
          <p className="whitespace-pre-wrap selection:bg-primary/20">{citation.excerpt}</p>
          <div className="mt-2 flex justify-end">
            <Button
              variant="outline"
              size="xs"
              className="h-6 text-[10px] gap-1"
              onClick={(e) => {
                e.stopPropagation()
                copy(citation.excerpt)
              }}
            >
              {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
              {copied ? 'Copied' : 'Copy snippet'}
            </Button>
          </div>
        </div>
      ) : (
        <p
          className="mt-1.5 line-clamp-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setExpanded(true)}
        >
          {citation.excerpt}
        </p>
      )}
    </div>
  )
}
