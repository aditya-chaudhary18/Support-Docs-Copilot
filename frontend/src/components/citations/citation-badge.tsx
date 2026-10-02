import { cn } from '@/lib/utils'

interface CitationBadgeProps {
  id: string
  isActive?: boolean
  onClick?: () => void
  className?: string
}

export function CitationBadge({ id, isActive, onClick, className }: CitationBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center align-baseline text-[11px] font-mono font-medium',
        'mx-0.5 rounded px-1.5 py-0.5 transition-all cursor-pointer',
        isActive
          ? 'bg-primary text-primary-foreground ring-2 ring-primary/40'
          : 'bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary border border-border/60',
        className
      )}
      title={`Jump to Source [${id}]`}
      aria-label={`Source citation ${id}`}
    >
      [{id}]
    </button>
  )
}
