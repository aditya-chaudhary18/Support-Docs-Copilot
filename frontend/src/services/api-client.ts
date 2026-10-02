import { API_BASE_URL, ApiError, request } from '@/lib/api'

export { API_BASE_URL, ApiError }

/**
 * Flag to switch between live FastAPI backend and in-memory mock store.
 * Defaults to false (communicates with real backend).
 * Set VITE_USE_MOCK_API="true" in .env only for offline UI development.
 */
export const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true'

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined | null>
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(path, options)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}
