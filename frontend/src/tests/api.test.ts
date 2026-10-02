import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildApiUrl,
  getHealth,

  getDocuments,
  getDocument,
  uploadDocument,
  deleteDocument,
  sendChatMessage,
  getConversations,
  getConversation,
  deleteConversation,
  ApiError,
} from '@/lib/api'

describe('API Client', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('buildApiUrl', () => {
    it('constructs correct API endpoints without duplicate /api segments', () => {
      expect(buildApiUrl('/health')).toContain('/health')
      expect(buildApiUrl('/api/health')).not.toContain('/api/api')
      expect(buildApiUrl('documents')).toContain('/documents')
    })
  })

  describe('Health API', () => {
    it('successfully calls GET /health and returns health status', async () => {
      const mockHealth = {
        status: 'ok',
        database: 'ok',
        environment: 'development',
        version: '1.0.0',
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockHealth,
      })

      const health = await getHealth()
      expect(health).toEqual(mockHealth)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          headers: expect.objectContaining({ Accept: 'application/json' }),
        })
      )
    })
  })

  describe('Document Management API', () => {
    it('calls GET /documents with pagination params', async () => {
      const mockDocs = {
        items: [
          {
            id: '11111111-1111-1111-1111-111111111111',
            filename: 'architecture.pdf',
            file_type: 'pdf',
            file_size: 1024,
            status: 'ready',
            chunk_count: 5,
            uploaded_at: '2026-09-29T00:00:00Z',
          },
        ],
        total: 1,
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockDocs,
      })

      const res = await getDocuments({ limit: 10, offset: 0 })
      expect(res.total).toBe(1)
      expect(res.items[0].filename).toBe('architecture.pdf')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/documents\?.*limit=10/),
        expect.anything()
      )
    })

    it('uploads a document using multipart/form-data', async () => {
      const mockUploadedDoc = {
        id: '22222222-2222-2222-2222-222222222222',
        filename: 'manual.docx',
        file_type: 'docx',
        file_size: 2048,
        status: 'processing',
        chunk_count: 0,
        uploaded_at: '2026-09-29T00:00:00Z',
      }

      let capturedBody: unknown = null
      global.fetch = vi.fn().mockImplementation((_url, options) => {
        capturedBody = options.body
        return Promise.resolve({
          ok: true,
          status: 202,
          json: async () => mockUploadedDoc,
        })
      })

      const file = new File(['dummy content'], 'manual.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const result = await uploadDocument(file)
      expect(result.id).toBe('22222222-2222-2222-2222-222222222222')
      expect(capturedBody).toBeInstanceOf(FormData)
      expect((capturedBody as FormData).get('file')).toBeTruthy()
    })

    it('retrieves single document metadata via GET /documents/{id}', async () => {
      const docId = '33333333-3333-3333-3333-333333333333'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: docId,
          filename: 'guide.md',
          file_type: 'md',
          file_size: 500,
          status: 'ready',
          chunk_count: 2,
          uploaded_at: '2026-09-29T00:00:00Z',
        }),
      })

      const doc = await getDocument(docId)
      expect(doc.id).toBe(docId)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/documents/${docId}`),
        expect.anything()
      )
    })

    it('deletes a document via DELETE /documents/{id}', async () => {
      const docId = '33333333-3333-3333-3333-333333333333'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      })

      await deleteDocument(docId)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/documents/${docId}`),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Chat & Conversations API', () => {
    it('sends question via POST /chat and returns ChatResponse with citations', async () => {
      const mockChatResponse = {
        conversation_id: '44444444-4444-4444-4444-444444444444',
        message_id: '55555555-5555-5555-5555-555555555555',
        answer: 'API authentication requires an API key in the headers. [S1]',
        answer_status: 'grounded',
        sufficient_context: true,
        sources: [
          {
            source_id: '[S1]',
            document_id: '11111111-1111-1111-1111-111111111111',
            filename: 'architecture.pdf',
            page_number: 4,
            section_title: 'Authentication',
            source_location: 'Page 4',
            chunk_index: 2,
            excerpt: 'All requests must provide an Authorization header.',
            similarity: 0.88,
          },
        ],
      }

      let capturedBody: string | null = null
      global.fetch = vi.fn().mockImplementation((_url, options) => {
        capturedBody = options.body as string
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => mockChatResponse,
        })
      })

      const res = await sendChatMessage({
        question: 'How do I authenticate?',
        conversation_id: null,
      })

      expect(res.conversation_id).toBe('44444444-4444-4444-4444-444444444444')
      expect(res.sources.length).toBe(1)
      expect(res.sources[0].source_id).toBe('[S1]')

      const parsed = JSON.parse(capturedBody!)
      expect(parsed.question).toBe('How do I authenticate?')
      expect(parsed.conversation_id).toBeNull()
    })

    it('retrieves conversation list via GET /conversations', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: '44444444-4444-4444-4444-444444444444',
              title: 'Authentication Query',
              created_at: '2026-09-29T00:00:00Z',
              updated_at: '2026-09-29T00:01:00Z',
              message_count: 2,
            },
          ],
          total: 1,
        }),
      })

      const convs = await getConversations()
      expect(convs.total).toBe(1)
      expect(convs.items[0].title).toBe('Authentication Query')
    })

    it('retrieves conversation details and messages via GET /conversations/{id}', async () => {
      const convId = '44444444-4444-4444-4444-444444444444'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: convId,
          title: 'Authentication Query',
          created_at: '2026-09-29T00:00:00Z',
          updated_at: '2026-09-29T00:01:00Z',
          messages: [
            {
              id: '66666666-6666-6666-6666-666666666666',
              role: 'user',
              content: 'How do I authenticate?',
              created_at: '2026-09-29T00:00:00Z',
            },
            {
              id: '55555555-5555-5555-5555-555555555555',
              role: 'assistant',
              content: 'Use an API key.',
              created_at: '2026-09-29T00:00:05Z',
            },
          ],
        }),
      })

      const detail = await getConversation(convId)
      expect(detail.id).toBe(convId)
      expect(detail.messages.length).toBe(2)
      expect(detail.messages[0].role).toBe('user')
      expect(detail.messages[1].role).toBe('assistant')
    })

    it('deletes conversation via DELETE /conversations/{id}', async () => {
      const convId = '44444444-4444-4444-4444-444444444444'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      })

      await deleteConversation(convId)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/conversations/${convId}`),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Error Handling and Sanitization', () => {
    it('handles backend connection failure as BACKEND_UNAVAILABLE with status 0', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Failed to fetch'))

      await expect(getHealth()).rejects.toThrow(ApiError)
      await expect(getHealth()).rejects.toMatchObject({
        status: 0,
        code: 'BACKEND_UNAVAILABLE',
        message: expect.stringContaining('Unable to connect to the backend'),
      })
    })

    it('parses structured backend errors from AppException', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        headers: new Headers({ 'x-request-id': 'req-abc-123' }),
        json: async () => ({
          error: {
            code: 'DUPLICATE_DOCUMENT',
            message: "A document with identical content already exists: 'test.pdf'.",
            request_id: 'req-abc-123',
          },
        }),
      })

      await expect(getDocument('any-id')).rejects.toMatchObject({
        status: 409,
        code: 'DUPLICATE_DOCUMENT',
        requestId: 'req-abc-123',
        message: expect.stringContaining('identical content already exists'),
      })
    })

    it('redacts database URLs and internal Python tracebacks from user-facing error text', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        headers: new Headers(),
        json: async () => ({
          error: {
            code: 'INTERNAL_ERROR',
            message:
              'Failed to connect postgresql://user:secretpass@db.neon.tech/support_docs. Traceback (most recent call last)...',
          },
        }),
      })

      try {
        await getHealth()
        expect.unreachable('Should have thrown ApiError')
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ApiError)
        const apiError = err as ApiError
        expect(apiError.message).not.toContain('secretpass')
        expect(apiError.message).not.toContain('Traceback')
      }
    })
  })
})
