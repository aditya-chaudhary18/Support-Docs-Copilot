import { Sparkles, Search } from 'lucide-react'
import { TraceIcon } from '@/components/ui/trace-icon'

interface ChatLoadingBubbleProps {
  stage?: 'searching' | 'generating' | string
}

export function ChatLoadingBubble({ stage = 'searching' }: ChatLoadingBubbleProps) {
  const isGenerating = stage === 'generating'
  const label = isGenerating ? 'Generating grounded answer…' : 'Searching your documentation…'

  return (
    <div className="flex gap-4 border-y border-border/40 bg-muted/20 px-4 py-6 animate-in fade-in duration-300">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs">
        <TraceIcon className="size-4.5 animate-pulse" />
      </div>

      <div className="flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-foreground">Trace Assistant</span>
          <span className="inline-flex items-center gap-1.5 text-[11px] text-primary font-medium">
            {isGenerating ? (
              <Sparkles className="size-3 animate-spin" />
            ) : (
              <Search className="size-3 animate-pulse" />
            )}
            <span>{label}</span>
          </span>
        </div>

        <div className="space-y-2 pt-1">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-muted-foreground/15" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted-foreground/15" />
        </div>
      </div>
    </div>
  )
}
