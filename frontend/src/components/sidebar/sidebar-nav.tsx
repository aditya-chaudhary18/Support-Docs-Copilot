import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { NavItem } from './nav-items'

interface SidebarNavProps {
  items: NavItem[]
  label: string
  onNavigate?: () => void
}

export function SidebarNav({ items, label, onNavigate }: SidebarNavProps) {
  return (
    <nav aria-label={label}>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'group flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50',
                  isActive && 'bg-muted text-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className={cn('size-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}
                    aria-hidden="true"
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
