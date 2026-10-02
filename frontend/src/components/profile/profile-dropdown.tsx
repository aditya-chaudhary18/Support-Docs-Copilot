import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Settings, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { ProfileAvatar } from '@/components/profile/profile-avatar'
import { ThemeSelector } from '@/components/profile/theme-selector'
import { toast } from 'sonner'

interface ProfileDropdownProps {
  className?: string
}

export function ProfileDropdown({ className = '' }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const handleLogout = async () => {
    setIsOpen(false)
    await logout()
    toast.success('Signed out of console')
    navigate('/login')
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={menuRef}>
      {/* Avatar Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50 transition-transform active:scale-95 cursor-pointer flex items-center justify-center"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Open profile menu"
      >
        <ProfileAvatar user={user} size="sm" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-72 origin-top-right rounded-xl bg-surface-container-lowest/95 backdrop-blur-xl border border-outline-variant/30 shadow-2xl p-2 z-50 text-on-surface focus:outline-none animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {/* User Information Header */}
          <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-container-low/60 border border-outline-variant/15">
            <ProfileAvatar user={user} size="md" showRing={false} />
            <div className="flex flex-col min-w-0">
              <span className="font-headline-sm text-sm font-semibold text-on-surface truncate">
                {user?.name || 'Operator'}
              </span>
              <span className="font-mono text-[11px] text-on-surface-variant truncate">
                {user?.email || 'operator@trace.internal'}
              </span>
            </div>
          </div>

          <div className="my-1.5 border-t border-outline-variant/20" />

          {/* Navigation Links */}
          <div className="space-y-0.5">
            <Link
              to="/settings"
              onClick={() => setIsOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              <Settings className="w-4 h-4 text-secondary" />
              <span>Account & Settings</span>
            </Link>
          </div>

          <div className="my-1.5 border-t border-outline-variant/20" />

          {/* Appearance / Theme Selector */}
          <div className="px-2 py-1.5">
            <div className="flex items-center justify-between mb-1.5 px-1">
              <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface-variant font-semibold">
                Appearance
              </span>
            </div>
            <ThemeSelector variant="compact" />
          </div>

          <div className="my-1.5 border-t border-outline-variant/20" />

          {/* Logout Action */}
          <button
            type="button"
            role="menuitem"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-error hover:bg-error/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      )}
    </div>
  )
}
