import { Link } from 'react-router-dom'
import { TraceIcon } from '@/components/ui/trace-icon'
import { cn } from '@/lib/utils'

export function TraceLogo({ className }: { className?: string }) {
  return (
    <Link
      to="/"
      className={cn(
        'group flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <span className="flex size-7.5 items-center justify-center rounded-lg bg-primary/10 border border-primary/25 text-primary group-hover:bg-primary/15 group-hover:border-primary/40 transition-all shadow-2xs">
        <TraceIcon className="size-5" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-foreground">Trace</span>
    </Link>
  )
}
