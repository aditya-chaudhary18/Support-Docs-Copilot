import { useState } from 'react'
import { Check } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { defaultSettings } from '@/lib/mock-data'
import type { AppSettings } from '@/types'

export function RagSettingsCard() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings)

  const handleSave = () => {
    toast.success('RAG retrieval configuration saved')
  }

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader>
        <CardTitle className="text-base">RAG &amp; Retrieval Engine</CardTitle>
        <CardDescription className="text-xs">
          Control how technical documentation is queried and how Gemini generates grounded responses.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Answer length options */}
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Answer Depth</Label>
          <div className="grid grid-cols-3 gap-2">
            {(['concise', 'balanced', 'detailed'] as const).map((length) => (
              <button
                key={length}
                type="button"
                onClick={() => setSettings((s) => ({ ...s, answerLength: length }))}
                className={`py-2 px-3 rounded-lg border text-xs font-medium capitalize transition-all cursor-pointer ${
                  settings.answerLength === length
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {length}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Balanced generates evidence-backed answers with actionable next steps.
          </p>
        </div>

        {/* Top-K Chunks */}
        <div className="space-y-2 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-semibold text-foreground">Retrieval Top-K Chunks</Label>
              <p className="text-[11px] text-muted-foreground">
                Number of most similar pgvector chunks provided in context to Gemini.
              </p>
            </div>
            <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
              {settings.retrievalTopK}
            </span>
          </div>
          <input
            type="range"
            min={2}
            max={10}
            step={1}
            value={settings.retrievalTopK}
            onChange={(e) =>
              setSettings((s) => ({ ...s, retrievalTopK: Number(e.target.value) }))
            }
            className="w-full accent-primary h-1.5 bg-muted rounded-lg cursor-pointer"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-4 pt-2 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-foreground">Show Inline Citations [S1]</Label>
              <p className="text-[11px] text-muted-foreground">
                Highlight inline source tags directly within generated answers.
              </p>
            </div>
            <Switch
              checked={settings.showInlineCitations}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, showInlineCitations: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-xs font-semibold text-foreground">Auto-Expand Source Cards</Label>
              <p className="text-[11px] text-muted-foreground">
                Automatically show retrieved text excerpts in the citations section.
              </p>
            </div>
            <Switch
              checked={settings.autoExpandSources}
              onCheckedChange={(checked) =>
                setSettings((s) => ({ ...s, autoExpandSources: checked }))
              }
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button type="button" size="sm" onClick={handleSave} className="gap-1.5 shadow-xs cursor-pointer">
            <Check className="size-3.5" /> Save Preferences
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
