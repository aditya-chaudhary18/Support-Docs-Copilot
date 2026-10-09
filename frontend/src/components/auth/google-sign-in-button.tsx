import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: { credential: string }) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
            itp_support?: boolean
          }) => void
          prompt: (moment?: (notification: {
            isNotDisplayed: () => boolean
            getNotDisplayedReason: () => string
            isSkippedMoment: () => boolean
            getSkippedReason: () => string
            isDismissedMoment: () => boolean
            getDismissedReason: () => string
          }) => void) => void
          renderButton: (
            element: HTMLElement,
            options: {
              type?: 'standard' | 'icon'
              theme?: 'outline' | 'filled_blue' | 'filled_black'
              size?: 'large' | 'medium' | 'small'
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin'
              shape?: 'rectangular' | 'pill' | 'circle' | 'square'
              logo_alignment?: 'left' | 'center'
              width?: string | number
              locale?: string
            }
          ) => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}

interface GoogleSignInButtonProps {
  onSuccess?: () => void
  onError?: (err: string) => void
  text?: 'continue_with' | 'signin_with' | 'signup_with'
  className?: string
  disabled?: boolean
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  text = 'continue_with',
  className = '',
  disabled = false,
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

  // Load Google Identity Services script asynchronously
  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setScriptLoaded(true)
      return
    }

    const existingScript = document.getElementById('google-gsi-client')
    if (existingScript) {
      const handleLoad = () => setScriptLoaded(true)
      existingScript.addEventListener('load', handleLoad)
      return () => {
        existingScript.removeEventListener('load', handleLoad)
      }
    }

    const script = document.createElement('script')
    script.id = 'google-gsi-client'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => setScriptLoaded(true)
    script.onerror = () => {
      console.warn('Failed to load Google Identity Services SDK script.')
    }
    document.head.appendChild(script)
  }, [])

  // Initialize GIS client once loaded and configured
  useEffect(() => {
    if (!scriptLoaded || !googleClientId || !window.google?.accounts?.id) return

    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (response) => {
          if (!response.credential) {
            const err = 'Google did not return an authentication credential.'
            onError?.(err)
            toast.error(err)
            return
          }

          setIsLoading(true)
          try {
            await loginWithGoogle(response.credential)
            toast.success('Successfully authenticated with Google')
            onSuccess?.()
          } catch (err: any) {
            const msg = err?.message || 'Failed to authenticate with Google.'
            onError?.(msg)
            toast.error(msg)
          } finally {
            setIsLoading(false)
          }
        },
        auto_select: false,
        cancel_on_tap_outside: false,
        itp_support: true,
      })

      // Optionally offer One Tap prompt on page load if supported
      try {
        window.google.accounts.id.prompt()
      } catch {
        // Silently ignore One Tap restrictions
      }
    } catch (err) {
      console.error('Error initializing Google Identity Services:', err)
    }
  }, [scriptLoaded, googleClientId, loginWithGoogle, onSuccess, onError])

  const handleClick = useCallback(async () => {
    if (isLoading || disabled) return

    if (!googleClientId) {
      toast.info(
        'Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID to enable live OAuth.'
      )
      return
    }

    if (!window.google?.accounts?.id) {
      toast.error('Google Sign-In is initializing. Please try again in a moment.')
      return
    }

    setIsLoading(true)
    try {
      // Clear cool-down in g_state cookie to ensure prompt opens on user click
      try {
        document.cookie = 'g_state=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT'
      } catch {
        // Ignore cookie reset errors
      }

      window.google.accounts.id.prompt((notification) => {
        setIsLoading(false)
        if (notification?.isNotDisplayed?.()) {
          const reason = notification.getNotDisplayedReason?.()
          console.warn('Google One Tap prompt not displayed:', reason)
          if (reason === 'suppressed_by_user' || reason === 'opt_out_or_no_session') {
            toast.info('Google Sign-In prompt was dismissed. Please check your Google account session.')
          }
        }
      })
    } catch (err) {
      setIsLoading(false)
      console.error('Failed to trigger Google Sign-In prompt:', err)
      toast.error('Failed to open Google Sign-In dialog.')
    }
  }, [isLoading, disabled, googleClientId])

  const labelText =
    text === 'signup_with'
      ? 'Sign up with Google'
      : text === 'signin_with'
      ? 'Sign in with Google'
      : 'Continue with Google'

  if (!googleClientId) {
    return null
  }

  return (
    <div className={`w-full ${className}`}>
      {/* Native Trace Obsidian Brand Button matching form design system */}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-label={labelText}
        className="w-full relative flex items-center justify-center gap-3 min-h-[42px] py-2.5 px-4 rounded-lg bg-[#0e1620] hover:bg-[#16202c] active:bg-[#1c2a38] text-white border border-[#243545] hover:border-[#38bdf8]/40 focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/40 focus:ring-offset-1 focus:ring-offset-[#090f16] transition-all font-medium text-sm shadow-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed select-none group"
      >
        {isLoading ? (
          <span
            className="w-[18px] h-[18px] border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0"
            aria-hidden="true"
          />
        ) : (
          /* Authentic Multicolor Google 'G' Mark on transparent background (NO white tile/circle/square) */
          <svg
            className="w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-105"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </svg>
        )}

        <span className="text-[#dde3ee] group-hover:text-white transition-colors">
          {isLoading ? 'Connecting to Google...' : labelText}
        </span>
      </button>
    </div>
  )
}
