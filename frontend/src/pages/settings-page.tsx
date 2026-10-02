import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { ProfileAvatar } from '@/components/profile/profile-avatar'
import { ThemeSelector } from '@/components/profile/theme-selector'

export function SettingsPage() {
  const { user, logout, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState(user?.name || '')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    if (user?.name) {
      setName(user.name)
    }
  }, [user?.name])

  const handleLogout = async () => {
    await logout()
    toast.success('Signed out of console')
    navigate('/login')
  }

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanName = name.trim()
    if (!cleanName || cleanName.length < 2) {
      toast.error('Full name must be at least 2 characters.')
      return
    }

    if (cleanName === user?.name) {
      toast.info('Name is unchanged.')
      return
    }

    setIsUpdating(true)
    try {
      await updateProfile({ name: cleanName })
      toast.success('Profile name updated successfully')
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update profile name.')
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface bg-grid-pattern min-h-screen">
      {/* Header Banner */}
      <section className="bg-surface-container-lowest px-gutter md:px-gutter-lg py-space-md border-b border-outline-variant/20 shadow-sm">
        <div className="flex flex-col gap-space-xs">
          <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-secondary"></span>
            System Configuration & Operator Session
          </span>
          <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
            Settings & Tenancy Controls
          </h1>
        </div>
      </section>

      {/* Main Settings Stack */}
      <div className="px-gutter md:px-gutter-lg py-space-lg flex flex-col gap-space-lg max-w-5xl">
        {/* Profile / Account Card */}
        <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm space-y-space-md">
          <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
            <div className="flex items-center gap-space-sm">
              <ProfileAvatar user={user} size="md" />
              <div>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                  Operator Identity & Account
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Authenticated session, credentials, and tenant profile.
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-space-md py-1.5 rounded bg-error/10 hover:bg-error/20 text-error transition-all font-body-sm text-body-sm font-semibold border border-error/30 cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md font-mono-code text-xs">
              <div className="space-y-1.5">
                <label htmlFor="settings-name" className="text-on-surface-variant uppercase text-[10px] block">
                  FULL NAME
                </label>
                <div className="flex gap-2">
                  <input
                    id="settings-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isUpdating}
                    placeholder="Technical Operator"
                    className="flex-1 p-2.5 rounded bg-surface-container text-on-surface border border-outline-variant/30 focus:outline-none focus:border-secondary transition-all font-sans text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isUpdating || name.trim() === user?.name}
                    className="px-3 py-2 rounded bg-secondary text-[#003824] font-semibold text-xs transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                  >
                    {isUpdating ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-on-surface-variant uppercase text-[10px] block">WORK EMAIL</span>
                <div className="p-2.5 rounded bg-surface-container text-on-surface border border-outline-variant/20 truncate">
                  {user?.email || 'operator@trace.internal'}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-on-surface-variant uppercase text-[10px] block">TENANT ID</span>
                <div className="p-2.5 rounded bg-surface-container text-secondary border border-outline-variant/20 truncate">
                  tenant_{user?.id || 'isolated'}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-on-surface-variant uppercase text-[10px] block">AUTH ACCESS</span>
                <div className="p-2.5 rounded bg-surface-container text-primary border border-outline-variant/20 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"></span>
                  JWT Bearer Authenticated
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Appearance & Theme Card */}
        <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm space-y-space-md">
          <div className="flex items-center justify-between pb-space-sm border-b border-outline-variant/20">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">palette</span>
              <div>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                  Appearance & Workspace Theme
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Switch between Obsidian Dark, Crisp Light, or follow System OS preference.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <ThemeSelector variant="expanded" />
          </div>
        </div>

        {/* Advanced Retrieval Configuration (Expandable) */}
        <details className="group p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm">
          <summary className="flex items-center justify-between cursor-pointer select-none">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-[20px]">tune</span>
              <div>
                <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
                  Advanced Configuration
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Underlying RAG retrieval thresholds, chunk sizing, and vector dimensions.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-primary font-mono hidden sm:inline">
                STRICT GROUNDING ON
              </span>
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant group-open:rotate-180 transition-transform">
                expand_more
              </span>
            </div>
          </summary>

          <div className="pt-4 mt-3 border-t border-outline-variant/15 grid grid-cols-1 sm:grid-cols-3 gap-space-md font-mono-code text-xs">
            <div className="p-space-sm rounded bg-surface-container border border-outline-variant/20 space-y-1">
              <span className="text-on-surface-variant uppercase text-[10px]">SIMILARITY THRESHOLD</span>
              <div className="text-secondary font-bold text-sm">&lt;= 0.40 Cosine (&lt;=&gt;)</div>
              <p className="text-[11px] text-on-surface-variant/70">
                Hard refusal if top chunks lack sufficient cosine proximity
              </p>
            </div>

            <div className="p-space-sm rounded bg-surface-container border border-outline-variant/20 space-y-1">
              <span className="text-on-surface-variant uppercase text-[10px]">VECTOR DIMENSIONS</span>
              <div className="text-primary font-bold text-sm">768-D Float32</div>
              <p className="text-[11px] text-on-surface-variant/70">
                Normalized embeddings via gemini-embedding-001
              </p>
            </div>

            <div className="p-space-sm rounded bg-surface-container border border-outline-variant/20 space-y-1">
              <span className="text-on-surface-variant uppercase text-[10px]">SLIDING WINDOW</span>
              <div className="text-on-surface font-bold text-sm">1,200 / 200 Overlap</div>
              <p className="text-[11px] text-on-surface-variant/70">
                Maintains AST syntax across page boundaries
              </p>
            </div>
          </div>
        </details>

        {/* Security Isolation Guarantees Card */}
        <div className="p-space-lg rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-sm space-y-3">
          <div className="flex items-center gap-2 pb-space-sm border-b border-outline-variant/20">
            <span className="material-symbols-outlined text-primary text-[20px]">shield</span>
            <h3 className="font-headline-sm text-body-lg font-bold text-on-surface">
              Security & Zero Model Training Guarantees
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm font-mono-code text-xs text-on-surface-variant">
            <div className="p-3 rounded bg-surface-container border border-outline-variant/10 space-y-1">
              <span className="text-on-surface font-semibold flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                Isolated pgvector Tenancy
              </span>
              <p className="text-[11px] leading-relaxed">
                All vector queries strictly enforce <code className="text-secondary">WHERE user_id = :current_user</code> at the database level.
              </p>
            </div>
            <div className="p-3 rounded bg-surface-container border border-outline-variant/10 space-y-1">
              <span className="text-on-surface font-semibold flex items-center gap-1 text-secondary">
                <span className="material-symbols-outlined text-[15px]">cloud_lock</span>
                Private Cloudflare R2 Vaults
              </span>
              <p className="text-[11px] leading-relaxed">
                Source files are encrypted at rest with AES-256 and accessed via short-lived presigned URLs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
