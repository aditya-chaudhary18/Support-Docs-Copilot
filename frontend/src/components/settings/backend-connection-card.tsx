import { useState } from 'react'
import { Server, CheckCircle2, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { USE_MOCK_API } from '@/services/api-client'

export function BackendConnectionCard() {
  const [apiUrl, setApiUrl] = useState(
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
  )
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'success' | 'failed'>('idle')

  const testConnection = async () => {
    setTesting(true)
    setTestResult('idle')
    try {
      const targetUrl = apiUrl.replace(/\/+$/, '')
      const healthUrl = targetUrl.endsWith('/api') ? `${targetUrl}/health` : `${targetUrl}/api/health`
      const res = await fetch(healthUrl, {
        signal: AbortSignal.timeout(4000),
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        setTestResult('success')
        toast.success(`Connected to FastAPI Backend (v${data.version || '1.0.0'}, db: ${data.database || 'ok'})`)
      } else {
        setTestResult('failed')
        toast.error(`Backend returned HTTP status ${res.status}`)
      }
    } catch {
      setTestResult('failed')
      toast.error('Could not reach backend at specified URL')
    } finally {
      setTesting(false)
    }

  }

  return (
    <Card className="border-border/80 shadow-2xs">
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Backend &amp; API Integration</span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border bg-muted text-muted-foreground">
            {USE_MOCK_API ? 'Mock In-Memory Store' : 'FastAPI REST Client'}
          </span>
        </CardTitle>
        <CardDescription className="text-xs">
          Configure the endpoint for the FastAPI RAG backend service.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs flex items-center gap-1.5 text-muted-foreground">
            <Server className="size-3.5" /> API Base URL
          </Label>
          <div className="flex gap-2">
            <Input
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
              placeholder="http://localhost:8000/api"
              className="text-xs font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={testConnection}
              disabled={testing}
              className="shrink-0 gap-1.5 cursor-pointer"
            >
              {testing ? (
                <RefreshCw className="size-3.5 animate-spin" />
              ) : (
                <Server className="size-3.5" />
              )}
              Test Connection
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Default endpoint configured via <code className="bg-muted px-1 py-0.5 rounded font-mono text-[10px]">VITE_API_BASE_URL</code>.
          </p>
        </div>

        {testResult === 'success' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>FastAPI backend is online and responding to health check.</span>
          </div>
        )}

        {testResult === 'failed' && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
            <AlertCircle className="size-4 shrink-0" />
            <span>No backend detected at this address. The UI is currently operating in standalone mock simulation mode.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
