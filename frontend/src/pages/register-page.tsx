import { useState } from 'react'
import { Link, useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { TraceLogo } from '@/components/ui/trace-logo'
import { GoogleSignInButton } from '@/components/auth/google-sign-in-button'

export function RegisterPage() {
  const { isAuthenticated, isLoading, register } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (isAuthenticated && !isLoading) {
    return <Navigate to="/dashboard" replace />
  }

  // Calculate password strength
  let strength = 0
  if (password.length >= 8) strength++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++
  if (/\d/.test(password)) strength++
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) strength++

  const strengthPercentage = Math.min(100, Math.round((strength / 4) * 100))

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanEmail = email.trim()
    const cleanName = name.trim()

    if (!cleanName) {
      setError('Please enter your full name.')
      return
    }
    if (!cleanEmail) {
      setError('Please enter your work email.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (!termsAccepted) {
      setError('Please accept the terms to continue.')
      return
    }

    setIsSubmitting(true)
    try {
      await register({
        email: cleanEmail,
        password,
        name: cleanName,
      })
      navigate('/dashboard', { replace: true })
    } catch (err: any) {
      setError(err?.message || 'Failed to create account. Email may already be registered.')
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
            <Link to="/login" className="hover:text-white transition-colors">
              Log in
            </Link>
            <span className="px-3 py-1.5 bg-[#10b981] text-[#003824] font-semibold rounded text-xs">
              Create account
            </span>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="w-full max-w-[1360px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Panel: Tenant Registry & Architecture (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Header: TRACE TENANT REGISTRY & CLUSTER ACTIVE */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TraceLogo className="w-10 h-10 rounded-lg shadow-lg" />
                <div className="flex flex-col">
                  <span className="font-bold text-white text-base tracking-wide">TRACE</span>
                  <span className="text-[10px] font-mono text-[#86948a] uppercase tracking-wider">
                    TENANT REGISTRY
                  </span>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#16202c] border border-[#243545] text-[10px] font-mono text-[#4cd7f6] font-semibold uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cd7f6] animate-pulse"></span>
                CLUSTER ACTIVE
              </span>
            </div>

            {/* Main Title */}
            <div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
                Index your knowledge.<br />
                <span className="text-[#4edea3]">Eliminate hallucinations.</span>
              </h1>
              <p className="text-[#86948a] text-sm mt-3 leading-relaxed">
                Turn scattered architecture documents, codebases, and compliance standards into an atomic, verifiable RAG knowledge layer with strict line-level provenance.
              </p>
            </div>

            {/* 4 Feature Boxes (2x2 Grid) */}
            <div className="grid grid-cols-2 gap-3">
              {/* Feature 1 */}
              <div className="p-3.5 rounded-xl bg-[#131922] border border-[#243545] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">account_circle</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
                    USER-SCOPED ISOLATION
                  </span>
                </div>
                <p className="text-[11px] text-[#86948a] leading-relaxed">
                  Tenant ID hard-constrained in deterministic pgvector queries
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-3.5 rounded-xl bg-[#131922] border border-[#243545] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4cd7f6] text-[18px]">cloud</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
                    PRIVATE CLOUDFLARE R2
                  </span>
                </div>
                <p className="text-[11px] text-[#86948a] leading-relaxed">
                  Zero-egress ephemeral presigned source tokens & blobs
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-3.5 rounded-xl bg-[#131922] border border-[#243545] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4edea3] text-[18px]">splitscreen</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
                    DETERMINISTIC CHUNKING
                  </span>
                </div>
                <p className="text-[11px] text-[#86948a] leading-relaxed">
                  1,200 token sliding windows with 200 token context overlaps
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-3.5 rounded-xl bg-[#131922] border border-[#243545] flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#4edea3] text-[18px]">verified</span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-white font-semibold">
                    COSINE GUARDRAIL
                  </span>
                </div>
                <p className="text-[11px] text-[#86948a] leading-relaxed">
                  Hard refusal trigger on similarity scores below 0.40 threshold
                </p>
              </div>
            </div>

            {/* Ingestion Engine Telemetry Card */}
            <div className="rounded-xl bg-[#131922] border border-[#243545] p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#dde3ee] font-semibold">
                    INGESTION ENGINE TELEMETRY
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#86948a]">
                  LATENCY ~14ms
                </span>
              </div>

              {/* Telemetry Flow Diagram */}
              <div className="p-2.5 rounded bg-[#090f16] border border-[#243545] overflow-hidden">
                <svg className="w-full h-14" viewBox="0 0 460 60" fill="none">
                  <rect x="0" y="8" width="70" height="44" rx="4" fill="#1a222d" />
                  <text x="35" y="28" fill="#86948a" fontFamily="JetBrains Mono" fontSize="8" fontWeight="600" textAnchor="middle">INPUT SPEC</text>
                  <text x="35" y="42" fill="#4edea3" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle">.md / .pdf</text>
                  
                  <path d="M 75 30 L 125 30" stroke="#243545" strokeWidth="2" strokeDasharray="3 3" />
                  
                  <rect x="130" y="8" width="60" height="44" rx="4" fill="#1a222d" />
                  <text x="160" y="27" fill="#4cd7f6" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" textAnchor="middle">1.2k</text>
                  <text x="160" y="41" fill="#86948a" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle">CHUNKS</text>
                  
                  <path d="M 195 30 L 235 30" stroke="#243545" strokeWidth="2" strokeDasharray="3 3" />
                  
                  <rect x="240" y="8" width="60" height="44" rx="4" fill="#1a222d" />
                  <text x="270" y="27" fill="#4fdbc8" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" textAnchor="middle">768-D</text>
                  <text x="270" y="41" fill="#86948a" fontFamily="JetBrains Mono" fontSize="7" textAnchor="middle">VECTORS</text>
                  
                  <path d="M 305 30 L 335 30" stroke="#243545" strokeWidth="2" strokeDasharray="3 3" />
                  
                  <rect x="340" y="8" width="115" height="44" rx="4" fill="#1a222d" />
                  <text x="397" y="27" fill="#4edea3" fontFamily="JetBrains Mono" fontSize="8" fontWeight="600" textAnchor="middle">HNSW INDEX</text>
                  <text x="397" y="41" fill="#acedff" fontFamily="JetBrains Mono" fontSize="8" textAnchor="middle">Neon pgvector</text>
                </svg>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-[#86948a]">
                  Dynamic Indexing: <strong className="text-white font-semibold">Sub-second recall</strong>
                </span>
                <span className="text-[#4edea3] font-semibold">Ready for queries</span>
              </div>
            </div>

            {/* Bottom Mathematical Verification Baseline Card */}
            <div className="rounded-xl bg-[#131922] border border-[#243545] p-3.5 flex items-start gap-3">
              <span className="material-symbols-outlined text-[#4edea3] text-[20px] shrink-0 mt-0.5">verified_user</span>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-white font-semibold">
                  Mathematical Verification Baseline
                </span>
                <p className="text-[11px] text-[#86948a] leading-relaxed">
                  &ldquo;Every generated answer is mathematically anchored to cosine similarity matrices, providing cryptographic and verifiable line references.&rdquo;
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel: Create Account Console Card (7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center max-w-xl mx-auto w-full">
            <div className="rounded-2xl bg-[#131922] border border-[#243545] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
              
              {/* Top Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#16202c] border border-[#243545] text-xs font-mono text-[#4edea3] font-semibold mb-4">
                <span className="material-symbols-outlined text-[15px]">lock</span>
                <span>ZERO-RETENTION TENANCY SETUP</span>
              </div>

              {/* Heading */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Create your Trace account
                </h2>
                <p className="text-[#86948a] text-sm mt-1">
                  Turn your technical documentation into a deterministic knowledge base you can talk to.
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

              {/* Google Sign Up */}
              {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                <>
                  <div className="mb-4">
                    <GoogleSignInButton
                      text="signup_with"
                      onSuccess={() => navigate('/dashboard', { replace: true })}
                    />
                  </div>

                  {/* Divider */}
                  <div className="relative flex items-center justify-center my-4">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#243545]"></div>
                    </div>
                    <div className="relative px-3 bg-[#111827] text-[11px] font-mono uppercase tracking-wider text-[#86948a]">
                      or create account with email
                    </div>
                  </div>
                </>
              )}

              {/* Form */}
              <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                {/* Full Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[#dde3ee] font-medium" htmlFor="reg-name">
                    Full Name <span className="text-[#4edea3]">*</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#86948a] pointer-events-none text-[18px]">
                      account_circle
                    </span>
                    <input
                      id="reg-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dr. Elena Rostova"
                      required
                      disabled={isSubmitting}
                      className="w-full bg-[#090f16] text-white placeholder-[#86948a]/60 text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#243545] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all"
                    />
                  </div>
                </div>

                {/* Work Email */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#dde3ee] font-medium" htmlFor="reg-email">
                      Work Email <span className="text-[#4edea3]">*</span>
                    </label>
                    <span className="text-[10px] font-mono text-[#86948a]">
                      DOMAIN VERIFIED
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#86948a] pointer-events-none text-[18px]">
                      mail
                    </span>
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="elena.rostova@trace.internal"
                      required
                      disabled={isSubmitting}
                      className="w-full bg-[#090f16] text-white placeholder-[#86948a]/60 text-sm pl-10 pr-4 py-2.5 rounded-lg border border-[#243545] focus:outline-none focus:border-[#4edea3] focus:ring-1 focus:ring-[#4edea3]/50 transition-all"
                    />
                  </div>
                </div>

                {/* Password with Strength Meter */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#dde3ee] font-medium" htmlFor="reg-password">
                      Password <span className="text-[#4edea3]">*</span>
                    </label>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#86948a]">
                      ENTROPY CHECK
                    </span>
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#86948a] pointer-events-none text-[18px]">
                      key
                    </span>
                    <input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
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

                  {/* 4 Segment Password Strength Bar */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <div className={`h-1 rounded-full transition-colors ${strength >= 1 ? 'bg-[#ff5f56]' : 'bg-[#1a222d]'}`} />
                    <div className={`h-1 rounded-full transition-colors ${strength >= 2 ? 'bg-[#4cd7f6]' : 'bg-[#1a222d]'}`} />
                    <div className={`h-1 rounded-full transition-colors ${strength >= 3 ? 'bg-[#4fdbc8]' : 'bg-[#1a222d]'}`} />
                    <div className={`h-1 rounded-full transition-colors ${strength >= 4 ? 'bg-[#4edea3]' : 'bg-[#1a222d]'}`} />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#86948a] pt-0.5">
                    <span>Min 8+ chars with uppercase, lowercase & numeric entropy</span>
                    <span className="font-mono text-white font-semibold">{strengthPercentage}%</span>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-[#dde3ee] font-medium" htmlFor="reg-confirm">
                      Confirm Password <span className="text-[#4edea3]">*</span>
                    </label>
                    {passwordsMatch && (
                      <span className="text-[10px] font-mono text-[#4edea3] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Matches
                      </span>
                    )}
                    {passwordsMismatch && (
                      <span className="text-[10px] font-mono text-red-400">
                        Does not match
                      </span>
                    )}
                  </div>
                  <div className="relative flex items-center">
                    <span className="material-symbols-outlined absolute left-3 text-[#86948a] pointer-events-none text-[18px]">
                      lock_reset
                    </span>
                    <input
                      id="reg-confirm"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      disabled={isSubmitting}
                      className={`w-full bg-[#090f16] text-white placeholder-[#86948a]/60 text-sm pl-10 pr-10 py-2.5 rounded-lg border transition-all ${
                        passwordsMismatch
                          ? 'border-red-500/60 focus:border-red-500'
                          : passwordsMatch
                          ? 'border-[#4edea3]/60 focus:border-[#4edea3]'
                          : 'border-[#243545] focus:border-[#4edea3]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 text-[#86948a] hover:text-white transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="flex items-start gap-2.5 pt-1">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="w-4 h-4 rounded bg-[#090f16] border-[#243545] text-[#10b981] accent-[#10b981] cursor-pointer mt-0.5"
                  />
                  <label htmlFor="terms" className="text-xs text-[#86948a] leading-normal cursor-pointer select-none">
                    I agree to the Terms of Service, Data Processing Agreement, and Privacy Policy.
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !termsAccepted || passwordsMismatch}
                  className="w-full mt-2 py-3 px-4 rounded-lg bg-[#4edea3] hover:bg-[#3ecb90] text-[#003824] font-semibold text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-lg shadow-[#4edea3]/20"
                >
                  <span>{isSubmitting ? 'Creating Trace Account...' : 'Create Trace Account'}</span>
                  <span className="material-symbols-outlined text-[18px]">
                    {isSubmitting ? 'sync' : 'arrow_forward'}
                  </span>
                </button>
              </form>

              {/* Existing Tenancy Link */}
              <div className="mt-5 text-center text-xs text-[#86948a]">
                <span>Already configured in an existing tenancy?</span>{' '}
                <Link
                  to="/login"
                  className="text-[#4cd7f6] hover:underline font-medium transition-colors"
                >
                  Log in to console &gt;
                </Link>
              </div>

              {/* Absolute Privacy Principle Callout */}
              <div className="mt-5 pt-4 border-t border-[#243545] flex items-start gap-2.5 text-xs text-[#86948a]">
                <span className="material-symbols-outlined text-[#4edea3] text-[16px] shrink-0 mt-0.5">
                  check_circle
                </span>
                <p className="leading-relaxed text-[11px]">
                  <strong className="text-white font-semibold">Absolute Privacy Principle:</strong> Zero model training on customer specifications. Isolated multi-tenant encryption at rest and in transit via dedicated KMS envelopes.
                </p>
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
