import type { SystemComponentStatus } from '@/types'

interface SystemStatusBarProps {
  components: SystemComponentStatus[]
}

export function SystemStatusBar({ components }: SystemStatusBarProps) {
  if (components.length === 0) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 border-t text-xs text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
        Checking system health...
      </div>
    )
  }

  return (
    <div className="flex items-center gap-6 px-4 py-3 border-t text-xs text-muted-foreground">
      {components.map((comp) => {
        const statusColor =
          comp.status === 'operational' ? 'bg-emerald-500' :
          comp.status === 'degraded' ? 'bg-amber-500' :
          'bg-rose-500'

        return (
          <div key={comp.id} className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${statusColor}`} />
            <span className="font-medium">{comp.name}</span>
          </div>
        )
      })}
    </div>
  )
}
