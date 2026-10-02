import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useDocuments } from '@/hooks/use-documents'
import { useConversations } from '@/hooks/use-conversations'
import { TraceLogo } from '@/components/ui/trace-logo'
import { ProfileAvatar } from '@/components/profile/profile-avatar'

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const { user, logout } = useAuth()
  const { data: documents = [] } = useDocuments()
  const { data: conversations = [] } = useConversations()
  const location = useLocation()
  const navigate = useNavigate()

  const readyDocsCount = documents.filter((d) => d.status === 'ready').length

  const handleSignOut = async () => {
    await logout()
    navigate('/login')
  }

  const isCurrent = (path: string) => {
    if (path === '/chat' && location.pathname.startsWith('/chat')) {
      return location.pathname === '/chat'
    }
    return location.pathname === path
  }

  return (
    <aside className="h-full w-full bg-surface-container-lowest flex flex-col justify-between border-r border-outline-variant/30 select-none">
      <div className="flex flex-col min-h-0 flex-1">
        {/* Header Branding */}
        <div className="p-space-md border-b border-outline-variant/20 flex items-center justify-between">
          <Link to="/dashboard" onClick={onNavigate} className="flex items-center gap-space-sm group">
            <TraceLogo className="h-6 w-6 rounded shadow-sm" />
            <span className="font-headline-sm text-headline-sm font-semibold tracking-tight text-on-surface group-hover:text-primary transition-colors">
              TRACE
            </span>
          </Link>
        </div>

        {/* New Chat Button */}
        <div className="p-space-md pb-space-xs">
          <Link
            to="/chat"
            onClick={onNavigate}
            className="w-full flex items-center justify-between px-space-md py-space-sm rounded bg-primary-container text-on-primary-container font-headline-sm text-body-sm font-medium hover:bg-primary transition-all shadow-[0_0_12px_-3px_rgba(16,185,129,0.3)]"
          >
            <span className="flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>New Chat</span>
            </span>
            <kbd className="font-label-sm text-label-sm px-1.5 py-0.5 rounded bg-on-primary-container/20 text-on-primary-container border border-on-primary-container/20">
              ⌘N
            </kbd>
          </Link>
        </div>

        {/* Primary Navigation Links */}
        <div className="px-space-md py-space-xs">
          <nav className="flex flex-col gap-1">
            <Link
              to="/chat"
              onClick={onNavigate}
              className={`flex items-center justify-between px-space-sm py-2 rounded-xl transition-all font-body-sm text-body-sm ${
                isCurrent('/chat')
                  ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface'
              }`}
            >
              <span className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">chat_bubble</span>
                <span>Chat</span>
              </span>
            </Link>

            <Link
              to="/documents"
              onClick={onNavigate}
              className={`flex items-center justify-between px-space-sm py-2 rounded-xl transition-all font-body-sm text-body-sm ${
                isCurrent('/documents')
                  ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface'
              }`}
            >
              <span className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">description</span>
                <span>Documents</span>
              </span>
              {readyDocsCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant border border-outline-variant/30 font-medium">
                  {readyDocsCount}
                </span>
              )}
            </Link>

            <Link
              to="/dashboard"
              onClick={onNavigate}
              className={`flex items-center justify-between px-space-sm py-2 rounded-xl transition-all font-body-sm text-body-sm ${
                isCurrent('/dashboard')
                  ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface'
              }`}
            >
              <span className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">dataset</span>
                <span>Analytics</span>
              </span>
            </Link>

            <Link
              to="/settings"
              onClick={onNavigate}
              className={`flex items-center justify-between px-space-sm py-2 rounded-xl transition-all font-body-sm text-body-sm ${
                isCurrent('/settings')
                  ? 'bg-surface-container-high text-primary font-semibold shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface'
              }`}
            >
              <span className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Settings</span>
              </span>
            </Link>
          </nav>
        </div>

        {/* Conversations Header */}
        <div className="px-space-md pt-space-sm pb-space-xs flex items-center justify-between text-on-surface-variant/70 border-t border-outline-variant/10 mt-space-xs">
          <span className="font-label-sm text-label-sm tracking-wider uppercase">Conversations</span>
          <span className="material-symbols-outlined text-[14px]">history</span>
        </div>

        {/* Scrollable Conversation Threads */}
        <div className="flex-1 overflow-y-auto px-space-md py-space-xs min-h-0">
          <nav className="flex flex-col gap-1">
            {conversations.length === 0 ? (
              <span className="text-[11px] text-on-surface-variant/50 px-2 py-1 italic font-mono">
                No conversations yet
              </span>
            ) : (
              conversations.slice(0, 15).map((conv) => {
                const active = location.pathname === `/chat/${conv.id}`
                return (
                  <Link
                    key={conv.id}
                    to={`/chat/${conv.id}`}
                    onClick={onNavigate}
                    className={`group flex items-center gap-space-xs px-space-sm py-1.5 rounded transition-all font-body-sm text-body-sm truncate ${
                      active
                        ? 'bg-surface-container text-secondary font-medium border-l-2 border-secondary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    <span
                      className={`h-1 w-1 rounded-full shrink-0 ${
                        active
                          ? 'bg-secondary'
                          : 'bg-outline-variant group-hover:bg-secondary'
                      }`}
                    ></span>
                    <span className="truncate">{conv.title || 'Untitled Session'}</span>
                  </Link>
                )
              })
            )}
          </nav>
        </div>
      </div>

      {/* User Profile Bar */}
      <div className="p-space-md border-t border-outline-variant/20 bg-surface-container-low/40 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-space-sm min-w-0">
            <ProfileAvatar user={user} size="sm" />
            <div className="flex flex-col min-w-0">
              <span className="font-body-sm text-body-sm font-medium text-on-surface truncate leading-tight">
                {user?.name || user?.email?.split('@')[0] || 'Operator'}
              </span>
              <span className="font-label-sm text-[11px] text-on-surface-variant/70 truncate leading-tight">
                {user?.email || 'operator@trace.internal'}
              </span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="text-on-surface-variant hover:text-error transition-colors p-1.5 rounded-md hover:bg-surface-container-high cursor-pointer"
            title="Sign out"
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
          </button>
        </div>
      </div>
    </aside>
  )
}
