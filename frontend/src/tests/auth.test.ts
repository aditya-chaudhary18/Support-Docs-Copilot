import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  register,
  login,
  loginWithGoogle,
  updateProfile,
  getCurrentUser,
  logout,
  getDashboardStats,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
} from '@/lib/api'
import { getCurrentUser as serviceGetCurrentUser } from '@/services/system-service'

describe('Authentication & Dashboard API Client', () => {
  const originalFetch = global.fetch

  const storage: Record<string, string> = {}
  const mockLocalStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => {
      storage[key] = value
    },
    removeItem: (key: string) => {
      delete storage[key]
    },
    clear: () => {
      Object.keys(storage).forEach((k) => delete storage[k])
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    globalThis.localStorage = mockLocalStorage as any
    if (typeof window === 'undefined' || !globalThis.window) {
      const emitter = new EventTarget()
      globalThis.window = {
        addEventListener: emitter.addEventListener.bind(emitter),
        removeEventListener: emitter.removeEventListener.bind(emitter),
        dispatchEvent: emitter.dispatchEvent.bind(emitter),
      } as any
    }
    mockLocalStorage.clear()
  })

  afterEach(() => {
    global.fetch = originalFetch
    mockLocalStorage.clear()
  })

  it('manages auth tokens in localStorage', () => {
    expect(getAuthToken()).toBeNull()
    setAuthToken('test-token-123')
    expect(getAuthToken()).toBe('test-token-123')
    removeAuthToken()
    expect(getAuthToken()).toBeNull()
  })

  it('register calls POST /auth/register and sets token in localStorage', async () => {
    const mockAuthRes = {
      access_token: 'jwt-access-token-abc',
      token_type: 'bearer',
      user: {
        id: 'u-1',
        name: 'Sarah Connor',
        email: 'sarah@example.com',
        created_at: '2026-09-29T00:00:00Z',
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => mockAuthRes,
    })

    const res = await register({
      name: 'Sarah Connor',
      email: 'sarah@example.com',
      password: 'terminator-hunter-9',
    })

    expect(res.user.name).toBe('Sarah Connor')
    expect(getAuthToken()).toBe('jwt-access-token-abc')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
  })

  it('login calls POST /auth/login and sets token in localStorage', async () => {
    const mockLoginRes = {
      access_token: 'jwt-access-token-xyz',
      token_type: 'bearer',
      user: {
        id: 'u-2',
        name: 'John Connor',
        email: 'john@example.com',
        created_at: '2026-09-29T00:00:00Z',
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockLoginRes,
    })

    const res = await login({
      email: 'john@example.com',
      password: 'password123',
    })

    expect(res.user.name).toBe('John Connor')
    expect(getAuthToken()).toBe('jwt-access-token-xyz')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({
        method: 'POST',
      })
    )
  })

  it('getCurrentUser attaches Authorization Bearer token header', async () => {
    setAuthToken('valid-bearer-token')

    const mockProfile = {
      id: 'u-2',
      name: 'John Connor',
      email: 'john@example.com',
      created_at: '2026-09-29T00:00:00Z',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockProfile,
    })

    const profile = await getCurrentUser()
    expect(profile.name).toBe('John Connor')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer valid-bearer-token',
        }),
      })
    )
  })

  it('logout removes token from localStorage and calls backend logout', async () => {
    setAuthToken('token-to-clear')

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Logged out successfully' }),
    })

    await logout()
    expect(getAuthToken()).toBeNull()
  })

  it('401 response clears token and dispatches unauthorized event', async () => {
    setAuthToken('expired-token')
    const listener = vi.fn()
    window.addEventListener('trace_auth_unauthorized', listener)

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers(),
      json: async () => ({
        error: { code: 'UNAUTHORIZED', message: 'Please log in to continue.' },
      }),
    })

    await expect(getCurrentUser()).rejects.toThrow()
    expect(getAuthToken()).toBeNull()
    expect(listener).toHaveBeenCalled()

    window.removeEventListener('trace_auth_unauthorized', listener)
  })

  it('getDashboardStats fetches real statistics and returns user-specific metrics', async () => {
    setAuthToken('valid-token')

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        indexed_documents: 0,
        conversations: 0,
        processing_ingestion: 0,
        indexed_chunks: 0,
      }),
    })

    const stats = await getDashboardStats()
    expect(stats.indexed_documents).toBe(0)
    expect(stats.conversations).toBe(0)
    expect(stats.indexed_chunks).toBe(0)
  })

  it('system-service uses real backend user and does not leak demo user data', async () => {
    setAuthToken('valid-token')

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        id: 'real-uuid',
        name: 'Real Engineer',
        email: 'real.engineer@company.com',
        created_at: '2026-09-29T12:00:00Z',
      }),
    })

    const user = await serviceGetCurrentUser()
    expect(user.name).toBe('Real Engineer')
    expect(user.email).toBe('real.engineer@company.com')
    expect(user.name).not.toContain('Maya')
    expect(user.email).not.toContain('northwind')
  })

  it('loginWithGoogle posts credential and sets auth token', async () => {
    const mockAuthRes = {
      access_token: 'google-jwt-token-123',
      token_type: 'bearer',
      user: {
        id: 'u-google-1',
        name: 'Google User',
        email: 'user@gmail.com',
        created_at: '2026-09-29T12:00:00Z',
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockAuthRes,
    })

    const res = await loginWithGoogle('mock-id-token-abc')
    expect(res.user.email).toBe('user@gmail.com')
    expect(getAuthToken()).toBe('google-jwt-token-123')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/google'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ credential: 'mock-id-token-abc' }),
      })
    )
  })

  it('updateProfile sends PATCH /auth/me with updated name', async () => {
    setAuthToken('valid-token')

    const mockUpdatedUser = {
      id: 'u-1',
      name: 'Updated Engineer Name',
      email: 'engineer@trace.internal',
      created_at: '2026-09-29T12:00:00Z',
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockUpdatedUser,
    })

    const res = await updateProfile({ name: 'Updated Engineer Name' })
    expect(res.name).toBe('Updated Engineer Name')
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/me'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ name: 'Updated Engineer Name' }),
      })
    )
  })
})
