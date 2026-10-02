import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { Sparkles } from 'lucide-react'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground gap-3">
        <div className="flex items-center gap-2 text-primary animate-pulse">
          <Sparkles className="size-6 animate-spin text-primary" />
          <span className="text-lg font-semibold tracking-tight">Trace</span>
        </div>
        <p className="text-xs text-muted-foreground">Authenticating session...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
