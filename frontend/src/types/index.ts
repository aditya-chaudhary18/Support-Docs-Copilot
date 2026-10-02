export type DocumentFileType = 'pdf' | 'docx' | 'txt' | 'md'

export type DocumentStatus = 'queued' | 'processing' | 'ready' | 'failed'

export interface TraceDocument {
  id: string
  name: string
  fileType: DocumentFileType
  sizeBytes: number
  uploadedAt: string
  updatedAt: string
  status: DocumentStatus
  chunkCount: number
  pageCount?: number
  uploadedBy: string
  description?: string
  errorMessage?: string
  tags: string[]
}

export type Document = TraceDocument

export interface DocumentChunk {
  id: string
  documentId: string
  index: number
  section: string
  page?: number
  content: string
  tokenCount: number
}

export interface Citation {
  /** Stable label used inside answer text, e.g. "S1". */
  id: string
  documentId: string
  documentName: string
  fileType: DocumentFileType
  page?: number
  section: string
  excerpt: string
  /** Retrieval similarity score between 0 and 1. */
  relevance: number
  chunkId?: string
  chunkIndex?: number
}

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  conversationId: string
  role: MessageRole
  content: string
  createdAt: string
  citations?: Citation[]
}

export interface Conversation {
  id: string
  title: string
  preview: string
  messageCount: number
  createdAt: string
  updatedAt: string
  selectedDocumentIds?: string[]
  selectedDocuments?: Array<{ id: string; name: string; fileType: string }>
}

export interface DashboardStats {
  totalDocuments: number
  totalConversations: number
  processingDocuments: number
  totalChunks: number
}

export type ServiceHealth = 'operational' | 'degraded' | 'down'

export interface SystemComponentStatus {
  id: string
  name: string
  description: string
  status: ServiceHealth
  latencyMs?: number
}

export interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  workspace: string
}

export type ThemePreference = 'light' | 'dark' | 'system'

export interface AppSettings {
  showInlineCitations: boolean
  autoExpandSources: boolean
  streamResponses: boolean
  answerLength: 'concise' | 'balanced' | 'detailed'
  retrievalTopK: number
  apiBaseUrl: string
}

export type UploadStatus = 'uploading' | 'processing' | 'success' | 'error'

export interface UploadItem {
  id: string
  file: File
  status: UploadStatus
  progress: number
  error?: string
  documentId?: string
}
