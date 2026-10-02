import {
  defaultSettings,
  mockChunks,
  mockConversations,
  mockDocuments,
  mockMessages,
  mockSystemStatus,
  mockUser,
} from '@/lib/mock-data'
import type { AppSettings, ChatMessage, Conversation, DocumentChunk, TraceDocument, UserProfile } from '@/types'

/**
 * In-memory database used while the FastAPI backend is not connected.
 * Resets on page reload by design.
 */
export const mockStore: {
  documents: TraceDocument[]
  chunks: DocumentChunk[]
  conversations: Conversation[]
  messages: ChatMessage[]
  user: UserProfile
  settings: AppSettings
  systemStatus: typeof mockSystemStatus
} = {
  documents: structuredClone(mockDocuments),
  chunks: structuredClone(mockChunks),
  conversations: structuredClone(mockConversations),
  messages: structuredClone(mockMessages),
  user: structuredClone(mockUser),
  settings: structuredClone(defaultSettings),
  systemStatus: structuredClone(mockSystemStatus),
}
