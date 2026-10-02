/**
 * Centralized API Client for Trace FastAPI Backend.
 * Strictly adheres to FastAPI Pydantic schemas (PRD Section 15 & 20).
 */

// ==============================================================================
// 1. BACKEND PYDANTIC SCHEMAS (Strict TypeScript definitions)
// ==============================================================================

export interface HealthResponse {
  status: 'ok' | 'degraded' | string
  database?: 'ok' | 'unavailable' | string
  environment: string
  version: string
  services?: Record<string, string>
}

export interface SourceCitation {
  source_id: string
  document_id: string
  filename: string
  page_number?: number | null
  section_title?: string | null
  source_location: string
  chunk_index: number
  excerpt: string
  similarity: number
  chunk_id?: string | null
}

export interface ChatRequest {
  question: string
  conversation_id?: string | null
  message?: string
  document_ids?: string[] | null
}

export interface ChatResponse {
  conversation_id: string
  message_id: string
  answer: string
  answer_status: 'grounded' | 'insufficient_context' | string
  sources: SourceCitation[]
  sufficient_context?: boolean
  citations?: SourceCitation[]
  selected_document_ids?: string[] | null
}

export interface DocumentResponse {
  id: string
  filename: string
  file_type: 'pdf' | 'docx' | 'txt' | 'md' | string
  file_size: number
  status: 'uploaded' | 'processing' | 'ready' | 'failed' | string
  processing_stage?: string | null
  chunk_count: number
  page_count?: number | null
  processing_error?: string | null
  uploaded_at: string
  processed_at?: string | null
}

export interface DocumentListResponse {
  items: DocumentResponse[]
  total: number
}

export interface ChunkResponse {
  id: string
  document_id: string
  chunk_index: number
  content: string
  page_number?: number | null
  section_title?: string | null
  token_count?: number | null
}

export interface ChunkListResponse {
  items: ChunkResponse[]
  total: number
}

export interface MessageResponse {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCitation[] | null
  answer_status?: string | null
  created_at: string
}

export interface ConversationResponse {
  id: string
  title: string
  created_at: string
  updated_at: string
  message_count: number
  selected_document_ids?: string[] | null
  selected_documents?: Array<{ id: string; name: string; file_type: string }> | null
}

export interface ConversationDetailResponse {
  id: string
  title: string
  created_at: string
  updated_at: string
  selected_document_ids?: string[] | null
  selected_documents?: Array<{ id: string; name: string; file_type: string }> | null
  messages: MessageResponse[]
}

export interface ConversationListResponse {
  items: ConversationResponse[]
  total: number
}

export interface UserProfileResponse {
  id: string
  name: string
  email: string
  created_at: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
  user: UserProfileResponse
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface GoogleLoginRequest {
  credential: string
}

export interface UpdateProfileRequest {
  name: string
}

export interface DashboardStatsResponse {
  indexed_documents: number
  conversations: number
  processing_ingestion: number
  indexed_chunks: number
}

export interface AppErrorDetail {
  code: string
  message: string
  request_id?: string | null
}

export interface AppErrorResponse {
  error: AppErrorDetail
}

const TOKEN_KEY = 'trace_auth_token'

export function getAuthToken(): string | null {
  if (typeof localStorage === 'undefined') return null
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setAuthToken(token: string): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(TOKEN_KEY, token)
    } catch {
      // ignore
    }
  }
}

export function removeAuthToken(): void {
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
  }
}



// ==============================================================================
// 2. ERROR HANDLING & SANITIZATION
// ==============================================================================

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string
  readonly detail?: unknown

  constructor(message: string, status: number, code = 'API_ERROR', requestId?: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.detail = detail
  }
}

/** Friendly translations for backend machine-readable error codes. */
export const ERROR_CODE_MESSAGES: Record<string, string> = {
  INVALID_FILE_TYPE: 'Please upload a PDF, DOCX, TXT, or Markdown file.',
  UNSUPPORTED_FILE_TYPE: 'Please upload a PDF, DOCX, TXT, or Markdown file.',
  INVALID_FILE_SIGNATURE: 'The file contents do not match its file extension.',
  FILE_TOO_LARGE: 'The file is too large. Maximum size is 10 MB.',
  EMPTY_FILE: 'The uploaded file is empty.',
  INVALID_FILENAME: 'Filename is invalid. Please rename the file before uploading.',
  INVALID_QUERY: 'Please enter a valid non-empty question.',
  NO_DOCUMENTS_READY: 'No documents are currently ready in your library. Please upload a document first.',
  DOCUMENT_NOT_FOUND: 'Document was not found.',
  DOCUMENT_ACCESS_DENIED: 'You do not have permission to access this document.',
  CONVERSATION_NOT_FOUND: 'Conversation was not found.',
  CONVERSATION_ACCESS_DENIED: 'You do not have permission to access this conversation.',
  DUPLICATE_EMAIL: 'An account with this email already exists.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  UNAUTHORIZED: 'Please log in to continue.',
  LLM_UNAVAILABLE: 'Unable to generate a response right now. Please try again.',
  EMBEDDING_UNAVAILABLE: 'Embedding service is temporarily unavailable. Please try again.',
  STORAGE_UNAVAILABLE: 'Storage service is temporarily unavailable. Please try again.',
  DATABASE_ERROR: 'A database error occurred. Please try again.',
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again.',
  BACKEND_UNAVAILABLE: 'Unable to connect to the backend. Please check that the server is running.',
}

/** Redacts database credentials, API keys, and internal traces from user-facing error text. */
export function sanitizeErrorMessage(rawMessage: string): string {
  let clean = rawMessage
    .replace(/postgresql:\/\/[^@]+@[^/]+\/[^\s"']+/gi, '[REDACTED_DATABASE_URL]')
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=[REDACTED]')

  if (clean.includes('Traceback (most recent call last)')) {
    return 'An unexpected server error occurred. Please try again later.'
  }
  return clean
}


// ==============================================================================
// 3. BASE URL & REQUEST DISPATCHER
// ==============================================================================

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
export const API_BASE_URL = rawBaseUrl.replace(/\/+$/, '')

/** Resolves an API path cleanly against API_BASE_URL, avoiding duplicate /api segments. */
export function buildApiUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  if (API_BASE_URL.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${API_BASE_URL}${cleanPath.slice(4)}`
  }
  if (!API_BASE_URL.endsWith('/api') && !cleanPath.startsWith('/api')) {
    return `${API_BASE_URL}/api${cleanPath}`
  }
  return `${API_BASE_URL}${cleanPath}`
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined | null>
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, params, ...rest } = options
  const isFormData = body instanceof FormData

  let url = buildApiUrl(path)
  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  const token = getAuthToken()
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

  let response: Response
  try {
    response = await fetch(url, {
      ...rest,
      headers: {
        Accept: 'application/json',
        ...(isFormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...authHeaders,
        ...headers,
      },
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request was aborted.', 499, 'CANCELLED')
    }
    console.error('[Trace API] Network request failed to URL:', url, error)
    throw new ApiError(
      'Unable to connect to the backend. Please check that the server is running.',
      0,
      'BACKEND_UNAVAILABLE'
    )
  }

  if (response.status === 401) {
    removeAuthToken()
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('trace_auth_unauthorized'))
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    let code = `HTTP_${response.status}`
    let requestId: string | undefined = response.headers.get('x-request-id') || undefined
    let detail: unknown = undefined


    try {
      const payload = await response.json()
      detail = payload
      if (payload && typeof payload === 'object') {
        if ('error' in payload && payload.error && typeof payload.error === 'object') {
          const err = payload.error as Record<string, unknown>
          if (typeof err.message === 'string') message = err.message
          if (typeof err.code === 'string') code = err.code
          if (typeof err.request_id === 'string') requestId = err.request_id
        } else if ('detail' in payload) {
          if (typeof payload.detail === 'string') {
            message = payload.detail
          } else if (Array.isArray(payload.detail)) {
            message = payload.detail.map((d: any) => d.msg || 'Invalid field').join('; ')
          }
        } else if ('message' in payload && typeof payload.message === 'string') {
          message = payload.message
        }
      }
    } catch {
      if (response.status === 404) {
        message = 'Requested resource not found.'
        code = 'NOT_FOUND'
      } else if (response.status === 409) {
        message = 'A resource conflict occurred. Document may already exist.'
        code = 'CONFLICT'
      } else if (response.status >= 500) {
        message = 'The backend service encountered an internal error. Please try again.'
        code = 'INTERNAL_ERROR'
      }
    }

    const finalMessage =
      message && !message.startsWith('HTTP_') && !message.startsWith('Request failed')
        ? message
        : ERROR_CODE_MESSAGES[code] || message

    throw new ApiError(sanitizeErrorMessage(finalMessage), response.status, code, requestId, detail)

  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

// ==============================================================================
// 4. TYPED REST API METHODS
// ==============================================================================

/** Check backend health status (GET /api/health) */
export async function getHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health')
}

/** Upload document multipart/form-data (POST /api/documents/upload) */
export async function uploadDocument(
  file: File,
  options: { signal?: AbortSignal } = {}
): Promise<DocumentResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return request<DocumentResponse>('/documents/upload', {
    method: 'POST',
    body: formData,
    signal: options.signal,
  })
}

/** List documents (GET /api/documents) */
export async function getDocuments(params?: {
  status_filter?: string
  limit?: number
  offset?: number
}): Promise<DocumentListResponse> {
  return request<DocumentListResponse>('/documents', {
    params: {
      status_filter: params?.status_filter,
      limit: params?.limit,
      offset: params?.offset,
    },
  })
}

/** Get single document metadata (GET /api/documents/{id}) */
export async function getDocument(id: string): Promise<DocumentResponse> {
  return request<DocumentResponse>(`/documents/${id}`)
}

/** Delete document (DELETE /api/documents/{id}) */
export async function deleteDocument(id: string): Promise<void> {
  return request<void>(`/documents/${id}`, {
    method: 'DELETE',
  })
}

/** Fetch chunks for a document (GET /api/documents/{id}/chunks) */
export async function getDocumentChunksApi(documentId: string): Promise<ChunkListResponse> {
  return request<ChunkListResponse>(`/documents/${documentId}/chunks`)
}

/** Fetch original document file blob securely with Bearer authentication */
export async function getDocumentFileBlob(id: string): Promise<Blob> {
  const url = buildApiUrl(`/documents/${id}/file?disposition=inline`)
  const token = getAuthToken()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(url, { headers })
  if (!res.ok) {
    let msg = `Failed to load document (HTTP ${res.status})`
    try {
      const errJson = await res.json()
      if (errJson?.error?.message) msg = errJson.error.message
    } catch {}
    throw new Error(msg)
  }
  return await res.blob()
}

/** Get a direct file stream URL with auth query token fallback */
export function getDocumentFileUrl(id: string, disposition: 'inline' | 'attachment' = 'inline'): string {
  const token = getAuthToken()
  const baseUrl = buildApiUrl(`/documents/${id}/file?disposition=${disposition}`)
  return token ? `${baseUrl}&token=${encodeURIComponent(token)}` : baseUrl
}

/** Send question to RAG pipeline (POST /api/chat) */
export async function sendChatMessage(req: ChatRequest): Promise<ChatResponse> {
  return request<ChatResponse>('/chat', {
    method: 'POST',
    body: {
      question: req.question,
      message: req.question,
      conversation_id: req.conversation_id ?? null,
      document_ids: req.document_ids ?? null,
    },
  })
}

/** List conversation threads (GET /api/conversations) */
export async function getConversations(params?: {
  limit?: number
  offset?: number
}): Promise<ConversationListResponse> {
  return request<ConversationListResponse>('/conversations', {
    params: {
      limit: params?.limit,
      offset: params?.offset,
    },
  })
}

/** Get conversation details with messages (GET /api/conversations/{id}) */
export async function getConversation(id: string): Promise<ConversationDetailResponse> {
  return request<ConversationDetailResponse>(`/conversations/${id}`)
}

/** Delete conversation thread (DELETE /api/conversations/{id}) */
export async function deleteConversation(id: string): Promise<void> {
  return request<void>(`/conversations/${id}`, {
    method: 'DELETE',
  })
}

/** Export conversation session (GET /api/conversations/{id}/export?format=markdown|json|pdf) */
export async function exportConversationApi(
  id: string,
  format: 'markdown' | 'json' | 'text' | 'pdf' = 'markdown'
): Promise<Blob> {
  const url = buildApiUrl(`/conversations/${id}/export?format=${format}`)
  const token = getAuthToken()
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
  const res = await fetch(url, { headers })
  if (!res.ok) {
    let msg = `Export failed (HTTP ${res.status})`
    try {
      const err = await res.json()
      if (err?.error?.message) msg = err.error.message
    } catch {}
    throw new Error(msg)
  }
  return await res.blob()
}

/** Update selected document scope for a conversation (PATCH /api/conversations/{id}/scope) */
export async function updateConversationScopeApi(
  conversationId: string,
  selectedDocumentIds: string[] | null
): Promise<ConversationResponse> {
  return request<ConversationResponse>(`/conversations/${conversationId}/scope`, {
    method: 'PATCH',
    body: {
      selected_document_ids: selectedDocumentIds,
    },
  })
}

/** Register new user (POST /api/auth/register) */
export async function register(req: RegisterRequest): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: req,
  })
  if (res.access_token) {
    setAuthToken(res.access_token)
  }
  return res
}

/** Login existing user (POST /api/auth/login) */
export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: req,
  })
  if (res.access_token) {
    setAuthToken(res.access_token)
  }
  return res
}

/** Authenticate or register with Google OAuth ID token (POST /api/auth/google) */
export async function loginWithGoogle(credential: string): Promise<AuthResponse> {
  const res = await request<AuthResponse>('/auth/google', {
    method: 'POST',
    body: { credential },
  })
  if (res.access_token) {
    setAuthToken(res.access_token)
  }
  return res
}

/** Get authenticated user profile (GET /api/auth/me) */
export async function getCurrentUser(): Promise<UserProfileResponse> {
  return request<UserProfileResponse>('/auth/me')
}

/** Update authenticated user profile (PATCH /api/auth/me) */
export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfileResponse> {
  return request<UserProfileResponse>('/auth/me', {
    method: 'PATCH',
    body: data,
  })
}

/** Logout session (POST /api/auth/logout) */
export async function logout(): Promise<void> {
  try {
    await request<void>('/auth/logout', { method: 'POST' })
  } finally {
    removeAuthToken()
  }
}

/** Get aggregated dashboard metrics (GET /api/dashboard/stats) */
export async function getDashboardStats(): Promise<DashboardStatsResponse> {
  return request<DashboardStatsResponse>('/dashboard/stats')
}

