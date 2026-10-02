import { useMemo } from 'react'

export interface UserLike {
  name?: string | null
  email?: string | null
  display_name?: string | null
}

interface ProfileAvatarProps {
  user?: UserLike | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  showRing?: boolean
}

export function ProfileAvatar({
  user,
  size = 'sm',
  className = '',
  showRing = true,
}: ProfileAvatarProps) {
  const initial = useMemo(() => {
    if (!user) return '?'
    if (user.name && user.name.trim().length > 0) {
      return user.name.trim().charAt(0).toUpperCase()
    }
    if (user.email && user.email.trim().length > 0) {
      return user.email.trim().charAt(0).toUpperCase()
    }
    return 'O'
  }, [user])

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }[size]

  return (
    <div
      className={`relative inline-flex items-center justify-center rounded-full bg-[#16202c] select-none font-bold font-mono text-[#38bdf8] dark:text-[#4cd7f6] shrink-0 border border-emerald-500/30 ${
        showRing ? 'ring-1 ring-emerald-500/20 shadow-sm' : ''
      } ${sizeClasses} ${className}`}
      aria-label={`Avatar for ${user?.name || user?.email || 'User'}`}
    >
      <span>{initial}</span>
    </div>
  )
}
