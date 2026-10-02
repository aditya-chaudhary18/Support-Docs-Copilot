import { formatNumber } from '@/lib/format'
import type { DashboardStats } from '@/types'

interface StatsOverviewProps {
  stats: DashboardStats
  loading?: boolean
}

export function StatsOverview({ stats, loading = false }: StatsOverviewProps) {
  const items = [
    {
      label: 'Docs',
      value: formatNumber(stats.totalDocuments),
    },
    {
      label: 'Chats',
      value: formatNumber(stats.totalConversations),
    },
  ]

  return (
    <div className="flex items-center gap-8">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-muted-foreground">{item.label}</span>
          <span className="text-2xl font-bold tracking-tight text-foreground">
            {loading ? '—' : item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
