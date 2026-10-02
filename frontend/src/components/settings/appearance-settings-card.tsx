import React from 'react'
import { Sun, Moon, Laptop } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { useTheme } from '@/hooks/use-theme'
import { cn } from '@/lib/utils'
import type { ThemePreference } from '@/types'

export function AppearanceSettingsCard() {
  const { theme, setTheme } = useTheme()

  const options: { value: ThemePreference; label: string; icon: React.ElementType; desc: string }[] = [
    {
      value: 'light',
      label: 'Light',
      icon: Sun,
      desc: 'Clean, high-contrast light mode',
    },
    {
      value: 'dark',
      label: 'Dark',
      icon: Moon,
      desc: 'Sleek, low-glare dark theme',
    },
    {
      value: 'system',
      label: 'System',
      icon: Laptop,
      desc: 'Sync with operating system preference',
    },
  ]

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader>
        <CardTitle className="text-base">Appearance &amp; Theme</CardTitle>
        <CardDescription className="text-xs">
          Customize the interface look and feel across developer sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {options.map((opt) => {
            const Icon = opt.icon
            const isSelected = theme === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                className={cn(
                  'flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer',
                  isSelected
                    ? 'border-primary ring-2 ring-primary/20 bg-primary/5 text-foreground'
                    : 'border-border/70 bg-card hover:border-border hover:bg-muted/30 text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'p-2 rounded-lg mb-2',
                    isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                  )}
                >
                  <Icon className="size-4" />
                </div>
                <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                <span className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</span>
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
