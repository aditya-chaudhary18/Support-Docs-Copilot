import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/hooks/use-theme'
import type { ThemePreference } from '@/types'

interface ThemeSelectorProps {
  variant?: 'compact' | 'expanded'
  className?: string
}

export function ThemeSelector({ variant = 'compact', className = '' }: ThemeSelectorProps) {
  const { theme, setTheme } = useTheme()

  const options: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  if (variant === 'expanded') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${className}`} role="radiogroup" aria-label="Theme preference">
        {options.map((opt) => {
          const Icon = opt.icon
          const isSelected = theme === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary/10 border-primary text-primary shadow-sm ring-1 ring-primary/30'
                  : 'bg-surface-container hover:bg-surface-container-high border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-headline-sm text-sm font-semibold">{opt.label}</span>
              <span className="text-[11px] text-on-surface-variant/70">
                {opt.value === 'system' ? 'Follow OS scheme' : `${opt.label} appearance`}
              </span>
            </button>
          )
        })}
      </div>
    )
  }

  // Compact variant for dropdown
  return (
    <div
      className={`flex items-center p-1 rounded-lg bg-surface-container border border-outline-variant/30 gap-1 ${className}`}
      role="radiogroup"
      aria-label="Theme preference"
    >
      {options.map((opt) => {
        const Icon = opt.icon
        const isSelected = theme === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => setTheme(opt.value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-medium transition-all cursor-pointer ${
              isSelected
                ? 'bg-surface-container-highest text-primary shadow-xs font-semibold'
                : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high/50'
            }`}
            title={`Switch to ${opt.label} mode`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
