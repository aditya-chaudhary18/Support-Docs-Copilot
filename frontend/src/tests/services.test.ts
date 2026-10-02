import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendMessage } from '@/services/chat-service'
import { listDocuments, uploadDocument, deleteDocument } from '@/services/documents-service'
import { listConversations, getConversationMessages } from '@/services/conversations-service'
import { getSystemStatus, getDashboardStats } from '@/services/system-service'

describe('Service Layer Integration', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('Chat Service', () => {
    it('initializes a new conversation when conversationId is null', async () => {
      const mockChatRes = {
        conversation_id: 'conv-new-123',
        message_id: 'msg-assist-456',
        answer: 'Trace is an AI-powered documentation assistant.',
        answer_status: 'grounded',
        sufficient_context: true,
        sources: [
          {
            source_id: '[S1]',
            document_id: 'doc-1',
            filename: 'overview.md',
            source_location: 'overview.md',
            chunk_index: 0,
            excerpt: 'Trace indexes documents and generates answers.',
            similarity: 0.95,
          },
        ],
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockChatRes,
      })

      const result = await sendMessage(null, 'What is Trace?')

      expect(result.conversationId).toBe('conv-new-123')
      expect(result.userMessage.content).toBe('What is Trace?')
      expect(result.userMessage.role).toBe('user')
      expect(result.assistantMessage.id).toBe('msg-assist-456')
      expect(result.assistantMessage.role).toBe('assistant')
      expect(result.assistantMessage.citations?.length).toBe(1)
    })

    it('continues an existing conversation when conversationId is provided', async () => {
      const existingConvId = 'conv-existing-789'
      const mockChatRes = {
        conversation_id: existingConvId,
        message_id: 'msg-assist-888',
        answer: 'Here is the follow-up answer.',
        answer_status: 'grounded',
        sufficient_context: true,
        sources: [],
      }

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockChatRes,
      })

      const result = await sendMessage(existingConvId, 'Can you elaborate?')

      expect(result.conversationId).toBe(existingConvId)
      expect(result.userMessage.content).toBe('Can you elaborate?')
      expect(result.assistantMessage.content).toBe('Here is the follow-up answer.')
    })
  })

  describe('Documents Service', () => {
    it('lists and formats documents from FastAPI', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'doc-1',
              filename: 'architecture.pdf',
              file_type: 'pdf',
              file_size: 1048576,
              status: 'ready',
              chunk_count: 8,
              uploaded_at: '2026-09-29T00:00:00Z',
            },
          ],
          total: 1,
        }),
      })

      const docs = await listDocuments()
      expect(docs.length).toBe(1)
      expect(docs[0].name).toBe('architecture.pdf')
      expect(docs[0].status).toBe('ready')
    })

    it('uploads file and tracks progress callbacks', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: async () => ({
          id: 'doc-uploaded-1',
          filename: 'readme.txt',
          file_type: 'txt',
          file_size: 120,
          status: 'processing',
          chunk_count: 0,
          uploaded_at: '2026-09-29T00:00:00Z',
        }),
      })

      const phases: string[] = []
      const file = new File(['sample'], 'readme.txt', { type: 'text/plain' })

      const doc = await uploadDocument(file, {
        onPhaseChange: (phase) => phases.push(phase),
      })

      expect(doc.id).toBe('doc-uploaded-1')
      expect(doc.status).toBe('processing')
      expect(phases).toContain('uploading')
      expect(phases).toContain('processing')
    })

    it('deletes document via DELETE endpoint', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      })

      await deleteDocument('doc-to-delete')
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/documents/doc-to-delete'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  describe('Conversations Service', () => {
    it('lists conversations and formats for UI', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'c-1',
              title: 'Thread 1',
              created_at: '2026-09-29T00:00:00Z',
              updated_at: '2026-09-29T00:01:00Z',
              message_count: 3,
            },
          ],
          total: 1,
        }),
      })

      const convs = await listConversations()
      expect(convs.length).toBe(1)
      expect(convs[0].title).toBe('Thread 1')
      expect(convs[0].messageCount).toBe(3)
    })

    it('fetches message list for a specific conversation ID', async () => {

      const convId = 'conv-456'
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: convId,
          title: 'System Design Question',
          created_at: '2026-09-29T00:00:00Z',
          updated_at: '2026-09-29T00:01:00Z',
          messages: [
            {
              id: 'm-1',
              role: 'user',
              content: 'What database is used?',
              created_at: '2026-09-29T00:00:00Z',
            },
            {
              id: 'm-2',
              role: 'assistant',
              content: 'Neon PostgreSQL with pgvector.',
              created_at: '2026-09-29T00:00:05Z',
            },
          ],
        }),
      })

      const messages = await getConversationMessages(convId)
      expect(messages.length).toBe(2)
      expect(messages[0].content).toBe('What database is used?')
      expect(messages[1].content).toBe('Neon PostgreSQL with pgvector.')
    })
  })

  describe('System Service', () => {
    it('maps operational backend health to healthy system components', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'ok',
          database: 'ok',
          environment: 'production',
          version: '1.2.0',
        }),
      })

      const status = await getSystemStatus()
      expect(status.length).toBe(4)
      const apiComp = status.find((c) => c.id === 'api')
      const dbComp = status.find((c) => c.id === 'db')
      expect(apiComp?.status).toBe('operational')
      expect(dbComp?.status).toBe('operational')
    })

    it('calculates dashboard stats from actual document and conversation lists', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/dashboard/stats')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              indexed_documents: 2,
              conversations: 1,
              processing_ingestion: 1,
              indexed_chunks: 5,
            }),
          })
        }
        if (url.includes('/documents')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              items: [
                { id: '1', filename: 'a.pdf', file_type: 'pdf', file_size: 100, status: 'ready', chunk_count: 5, uploaded_at: '' },
                { id: '2', filename: 'b.pdf', file_type: 'pdf', file_size: 100, status: 'processing', chunk_count: 0, uploaded_at: '' },
              ],
              total: 2,
            }),
          })
        }
        if (url.includes('/conversations')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              items: [{ id: 'c1', title: 'Q1', created_at: '', updated_at: '', message_count: 2 }],
              total: 1,
            }),
          })
        }
        return Promise.reject(new Error('Unknown url'))
      })

      const stats = await getDashboardStats()
      expect(stats.totalDocuments).toBe(2)
      expect(stats.totalConversations).toBe(1)
      expect(stats.processingDocuments).toBe(1)
      expect(stats.totalChunks).toBe(5)
    })
  })
})
