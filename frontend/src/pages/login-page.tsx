import { useState } from 'react'
import { Link, useNavigate, useLocation, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { TraceLogo } from '@/components/ui/trace-logo'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'

export function LoginPage() {
  const { isAuthenticated, isLoading, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const from = (location.state as any)?.from?.pathname || '/dashboard'

  if (isAuthenticated && !isLoading) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim()
    if (!cleanEmail) {
      setError('Please enter your work email.')
      return
    }
    if (!password) {
      setError('Please enter your password.')
      return
    }

    setIsSubmitting(true)
    try {
      await login({ email: cleanEmail, password })
      navigate(from, { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#07090e] dark-grid-bg text-[#dde3ee] font-sans antialiased flex flex-col justify-between selection:bg-[#4edea3]/20 selection:text-[#4edea3] relative">
      {/* Top Navbar matching Screenshot */}
      <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#090f16]/90 backdrop-blur-md border-b border-[#1e293b]/60">
        <div className="max-w-[1440px] mx-auto h-16 px-6 flex items-center justify-between">
          {/* Left: Brand Identity */}
          <Link to="/" className="flex items-center gap-3">
            <TraceLogo className="w-8 h-8 rounded-lg" />
            <span className="font-bold tracking-wider text-white text-base">TRACE</span>
          </Link>

          {/* Right: Navigation Links */}
          <nav className="flex items-center gap-4 text-xs font-medium text-[#86948a]">
            <Link to="/" className="hover:text-white transition-colors">
              Platform
            </Link>
            <span className="px-3 py-1.5 bg-[#10b981] text-[#003824] font-semibold rounded text-xs">
              Log in
            </span>
            <Link to="/register" className="hover:text-white transition-colors">
              Create account
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Panel: Telemetry & Provenance Narrative (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Engine Identity Header */}
            <div className="flex items-center gap-3">
              <TraceLogo className="w-10 h-10 rounded-lg shadow-lg" />
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base tracking-wide">TRACE</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#16202c] text-[#4edea3] font-semibold border border-[#243545]">
                    V2.4 KERNEL
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#86948a] uppercase tracking-wider">
                  PROVENANCE ENGINE
                </span>
              </div>
            </div>

            {/* Main Headline */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
                Your documentation.<br />
                <span className="text-[#4edea3]">Now within reach.</span>
              </h1>
              <p className="text-[#86948a] text-sm mt-3 leading-relaxed">
                Ask questions across your enterprise technical knowledge base and trace every generated token back to its exact AST node, PDF page, or line of code.
              </p>
            </div>

            {/* Runtime Vector Telemetry Card */}
            <div className="rounded-xl bg-[#131922] border border-[#243545] p-5 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">account_tree</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#4cd7f6] font-semibold">
                    RUNTIME VECTOR TELEMETRY
                  </span>
                </div>
                <span className="text-[11px] font-mono text-[#4edea3] font-semibold">
                  99.98% GROUNDED
                </span>
              </div>

              {/* 4 Telemetry Boxes */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2.5 rounded bg-[#1a222d] border border-[#243545] flex flex-col items-center text-center gap-1">
                  <span className="material-symbols-outlined text-[#4edea3] text-[18px]">dataset</span>
                  <span className="text-[10px] font-semibold text-white">DOCS</span>
                  <span className="text-[9px] font-mono text-[#86948a]">PDF • MD • SQL</span>
                </div>
                <div className="p-2.5 rounded bg-[#1a222d] border border-[#243545] flex flex-col items-center text-center gap-1">
                  <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">distance</span>
                  <span className="text-[10px] font-semibold text-white">RETRIEVAL</span>
                  <span className="text-[9px] font-mono text-[#4cd7f6]">cos ≤ 0.40</span>
                </div>
                <div className="p-2.5 rounded bg-[#1a222d] border border-[#243545] flex flex-col items-center text-center gap-1">
                  <span className="material-symbols-outlined text-[#4fdbc8] text-[18px]">neurology</span>
                  <span className="text-[10px] font-semibold text-white">SYNTHESIS</span>
                  <span className="text-[9px] font-mono text-[#4fdbc8]">Schema Match</span>
                </div>
                <div className="p-2.5 rounded bg-[#1a222d] border border-[#243545] flex flex-col items-center text-center gap-1">
                  <span className="material-symbols-outlined text-[#4edea3] text-[18px]">verified</span>
                  <span className="text-[10px] font-semibold text-white">CITATIONS</span>
                  <span className="text-[9px] font-mono text-[#4edea3]">[S1] • [S2]</span>
                </div>
              </div>
            </div>

            {/* Live Inference Preview Card */}
            <div className="rounded-xl bg-[#131922] border border-[#243545] p-4 shadow-xl flex flex-col gap-2.5">
              <div className="flex items-center justify-between pb-2 border-b border-[#243545]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]"></span>
                  <span className="font-mono text-[11px] text-[#86948a] ml-2">live-inference.trace</span>
                </div>
                <span className="font-mono text-[10px] text-[#4cd7f6] uppercase tracking-wider font-semibold">
                  LATENCY: 48MS
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-white font-medium">
                <span className="text-[#4cd7f6] font-bold">&gt;</span>
                <span>What does this document explain?</span>
              </div>
              <div className="text-[11px] font-mono text-[#4cd7f6]/80 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6] animate-pulse"></span>
                <span>Ingesting query into 768-d vector space... Retrieving Neon pgvector</span>
              </div>
              <div className="bg-[#090f16] rounded p-3 border border-[#243545] text-xs text-[#dde3ee] leading-relaxed">
                The Transformer architecture relies on self-attention to model sequence representations without recurring cell units
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#1a222d] text-[#4cd7f6] font-mono text-[10px] ml-1.5 border border-[#243545]">
                  [S1: Page 14]
                </span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#1a222d] text-[#4cd7f6] font-mono text-[10px] ml-1 border border-[#243545]">
                  [S2: Lines 45-72]
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 text-[11px] font-mono">
                <span className="text-[#4edea3] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Zero speculative answers. Grounded in your indexed data.
                </span>
                <span className="text-[#86948a]">0.962 SIM</span>
              </div>
            </div>
          </div>

          {/* Right Panel: Login Console Box (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center max-w-xl mx-auto w-full">
            <div className="rounded-2xl bg-[#131922] border border-[#243545] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              
              {/* Tab Switcher */}
              <div className="flex items-center justify-between pb-6">
                <div className="flex p-1 rounded-lg bg-[#090f16] border border-[#243545] gap-1">
                  <span className="px-4 py-1.5 rounded-md text-xs font-semibold bg-[#10b981] text-[#003824] transition-all">
                    Log in
                  </span>
                  <Link
                    to="/register"
                    className="px-4 py-1.5 rounded-md text-xs text-[#86948a] hover:text-white transition-all font-medium"
                  >
                    Create account
                  </Link>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-[#86948a]">
                  <span className="material-symbols-outlined text-[15px] text-[#4edea3]">security</span>
                  <span>Mutual TLS</span>
                </div>
              </div>

              {/* Heading */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Welcome back.
                </h2>
                <p className="text-[#86948a] text-sm mt-1">
                  Continue exploring your documentation with grounded AI answers.
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="mb-5 rounded p-3 bg-red-950/40 border border-red-500/40 flex items-center justify-between text-red-300 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-red-400">error</span>
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300" type="button">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              )}

              {/* Google Sign In */}
              {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <>
                  <div className="mb-4">
                    <GoogleSignInButton
                      text="signin_with"
                      onSuccess={() => navigate(from, { replace: true })}
                    />
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#243545]"></div>
                    </div>
                    <div className="relative px-3 bg-[#111827] text-[11px] font-mono uppercase tracking-wider text-[#86948a]">
                      or continue with email
                    </div>
                  </div>
                </>
              )}

              {/* Form */}
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {/* Work Email */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#dde3ee] font-medium" htmlFor="email">
                      Work Email
                    </label>
                    <span className="text-[10px] font-mono text-[#86948a]">
                      SAML / OIDC Enabled
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#86948a] pointer-events-none text-[18px]">
                      mail
                    </span>
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="elena.rostova@trace.internal"
                      required
                      disabled={isSubmitting}
                      className="w-full bg-[#090f16] text-white placeholder-[#86948a]/60 text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#243545] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#dde3ee] font-medium" htmlFor="password">
                      Passphrase / Master Key
                    </label>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#86948a] pointer-events-none text-[18px]">
                      lock
                    </span>
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      disabled={isSubmitting}
                      className="w-full bg-[#090f16] text-white placeholder-[#86948a]/60 text-sm pl-10 pr-10 py-2.5 rounded-lg border border-[#243545] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 text-[#86948a] hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Remember & Forgot */}
                <div className="flex items-center justify-between text-xs text-[#86948a] pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none hover:text-white">
                    <input
                      defaultChecked
                      className="w-4 h-4 rounded bg-[#090f16] border-[#243545] text-[#10b981] accent-[#10b981] cursor-pointer"
                      type="checkbox"
                    />
                    <span>Remember console for 30 days</span>
                  </label>
                  <span className="hover:text-white transition-colors cursor-pointer">
                    Forgot password?
                  </span>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-[#4edea3] hover:bg-[#3ecb90] text-[#003824] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 cursor-pointer shadow-lg shadow-[#4edea3]/20"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Log in to Console'}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {isSubmitting ? 'sync' : 'arrow_forward'}
                  </span>
                </button>
              </form>

              {/* Security Tenancy Badge */}
              <div className="mt-6 pt-5 border-t border-[#243545] flex items-start gap-2.5 text-xs text-[#86948a]">
                <span className="material-symbols-outlined text-[#4edea3] text-[16px] shrink-0 mt-0.5">
                  verified_user
                </span>
                <p className="leading-relaxed text-[11px]">
                  Protected by isolated Neon pgvector tenancy & Cloudflare R2 zero-egress vaults. Your documents remain strictly private.
                </p>
              </div>

              {/* Footer link */}
              <div className="text-center mt-5 text-xs text-[#86948a]">
                <span>Don&apos;t have an account?</span>
                <Link
                  to="/register"
                  className="text-[#4edea3] hover:underline ml-1.5 transition-colors font-medium"
                >
                  Create account →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer matching Screenshot */}
      <footer className="w-full bg-[#090f16] py-6 border-t border-[#1e293b]/60">
        <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-[#86948a]">
          <div className="flex items-center gap-3">
            <span>© 2026 TRACE INTELLIGENCE INC. ALL RIGHTS RESERVED.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-white transition-colors">ISO/IEC 27001</span>
            <span className="hover:text-white transition-colors">HIPAA READY</span>
            <span className="hover:text-white transition-colors">AIR-GAPPED RETRIEVAL</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
