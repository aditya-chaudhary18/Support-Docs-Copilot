import { FileText, History, LayoutDashboard, MessageSquare, Settings, type LucideIcon } from 'lucide-react'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

export const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: LayoutDashboard, end: true },
  { label: 'Documents', to: '/documents', icon: FileText },
  { label: 'Chat', to: '/chat', icon: MessageSquare },
  { label: 'Conversations', to: '/conversations', icon: History },
]

export const secondaryNavItems: NavItem[] = [{ label: 'Settings', to: '/settings', icon: Settings }]
