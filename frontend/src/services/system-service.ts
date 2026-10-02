import {
  getHealth,
  getCurrentUser as apiGetCurrentUser,
  getDashboardStats as apiGetDashboardStats,
} from '@/lib/api'
import type { AppSettings, DashboardStats, SystemComponentStatus, UserProfile } from '@/types'

export async function getDashboardStats(): Promise<DashboardStats> {
  const stats = await apiGetDashboardStats()
  return {
    totalDocuments: stats.indexed_documents,
    totalConversations: stats.conversations,
    processingDocuments: stats.processing_ingestion,
    totalChunks: stats.indexed_chunks,
  }
}

export async function getSystemStatus(): Promise<SystemComponentStatus[]> {
  try {
    const health = await getHealth()
    const isAppOk = health.status === 'ok'
    const dbOk = health.services?.database === 'healthy' || health.database === 'ok'
    const storageOk = health.services?.storage === 'healthy'
    const geminiOk = health.services?.gemini === 'healthy'

    return [
      {
        id: 'api',
        name: 'FastAPI Backend',
        description: `v${health.version || '1.0.0'} (${health.environment || 'development'})`,
        status: isAppOk ? 'operational' : 'degraded',
      },
      {
        id: 'db',
        name: 'Neon PostgreSQL',
        description: dbOk ? 'pgvector extension active' : 'Status unavailable',
        status: dbOk ? 'operational' : 'down',
      },
      {
        id: 'storage',
        name: 'Cloudflare R2',
        description: storageOk ? 'S3-compatible document storage' : 'Status unavailable',
        status: storageOk ? 'operational' : 'down',
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        description: geminiOk ? 'Embeddings & Generation' : 'Status unavailable',
        status: geminiOk ? 'operational' : 'down',
      },
    ]
  } catch {
    return [
      {
        id: 'api',
        name: 'FastAPI Backend',
        description: 'Backend unreachable',
        status: 'down',
      },
      {
        id: 'db',
        name: 'Neon PostgreSQL',
        description: 'Status unavailable',
        status: 'down',
      },
      {
        id: 'storage',
        name: 'Cloudflare R2',
        description: 'Status unavailable',
        status: 'down',
      },
      {
        id: 'gemini',
        name: 'Google Gemini',
        description: 'Status unavailable',
        status: 'down',
      },
    ]
  }
}

export async function getCurrentUser(): Promise<UserProfile> {
  const me = await apiGetCurrentUser()
  return {
    id: me.id,
    name: me.name,
    email: me.email,
    role: 'Member',
    workspace: 'Personal Workspace',
  }
}

let localSettings: AppSettings = {
  showInlineCitations: true,
  autoExpandSources: false,
  streamResponses: false,
  answerLength: 'balanced',
  retrievalTopK: 5,
  apiBaseUrl: '/api',
}

export async function getSettings(): Promise<AppSettings> {
  return { ...localSettings }
}

export async function updateSettings(updates: Partial<AppSettings>): Promise<AppSettings> {
  localSettings = { ...localSettings, ...updates }
  return { ...localSettings }
}

export async function updateCurrentUser(updates: Pick<UserProfile, 'name' | 'email' | 'role'>): Promise<UserProfile> {
  const user = await getCurrentUser()
  return { ...user, ...updates }
}
