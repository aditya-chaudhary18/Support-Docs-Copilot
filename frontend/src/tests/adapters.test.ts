import { describe, it, expect } from 'vitest'
import {
  mapDocumentResponse,
  mapSourceCitation,
  mapMessageResponse,
  mapConversationResponse,
} from '@/lib/adapters'
import type {
  DocumentResponse,
  SourceCitation,
  MessageResponse,
  ConversationResponse,
  ConversationDetailResponse,
} from '@/lib/api'

describe('Data Adapters', () => {
  it('maps DocumentResponse to TraceDocument with correct statuses', () => {
    const backendDoc: DocumentResponse = {
      id: '12345678-1234-1234-1234-123456789012',
      filename: 'user-guide.pdf',
      file_type: 'pdf',
      file_size: 4096000,
      status: 'ready',
      chunk_count: 14,
      page_count: 8,
      processing_error: null,
      uploaded_at: '2026-09-29T10:00:00Z',
      processed_at: '2026-09-29T10:00:15Z',
    }

    const uiDoc = mapDocumentResponse(backendDoc)
    expect(uiDoc.id).toBe(backendDoc.id)
    expect(uiDoc.name).toBe('user-guide.pdf')
    expect(uiDoc.fileType).toBe('pdf')
    expect(uiDoc.sizeBytes).toBe(4096000)
    expect(uiDoc.status).toBe('ready')
    expect(uiDoc.chunkCount).toBe(14)
    expect(uiDoc.pageCount).toBe(8)
    expect(uiDoc.errorMessage).toBeUndefined()
  })

  it('maps uploaded and processing backend statuses to processing in UI', () => {
    const uploadedDoc: DocumentResponse = {
      id: 'abc',
      filename: 'notes.txt',
      file_type: 'txt',
      file_size: 50,
      status: 'uploaded',
      chunk_count: 0,
      uploaded_at: '2026-09-29T10:00:00Z',
    }
    expect(mapDocumentResponse(uploadedDoc).status).toBe('processing')
  })

  it('maps SourceCitation to frontend Citation removing brackets from label', () => {
    const src: SourceCitation = {
      source_id: '[S2]',
      document_id: 'doc-1',
      filename: 'handbook.pdf',
      page_number: 12,
      section_title: 'API Rate Limits',
      source_location: 'Page 12',
      chunk_index: 3,
      excerpt: 'Rate limits are 20 chat requests per minute.',
      similarity: 0.92,
    }

    const citation = mapSourceCitation(src)
    expect(citation.id).toBe('S2')
    expect(citation.documentId).toBe('doc-1')
    expect(citation.documentName).toBe('handbook.pdf')
    expect(citation.page).toBe(12)
    expect(citation.section).toBe('API Rate Limits')
    expect(citation.relevance).toBe(0.92)
    expect(citation.excerpt).toBe('Rate limits are 20 chat requests per minute.')
  })

  it('handles SourceCitation with null page and null section without fake data', () => {
    const src: SourceCitation = {
      source_id: 'S1',
      document_id: 'doc-2',
      filename: 'notes.txt',
      page_number: null,
      section_title: null,
      source_location: 'notes.txt',
      chunk_index: 0,
      excerpt: 'Plain text note.',
      similarity: 0.77,
    }

    const citation = mapSourceCitation(src)
    expect(citation.id).toBe('S1')
    expect(citation.page).toBeUndefined()
    expect(citation.section).toBe('notes.txt')
  })

  it('maps MessageResponse to ChatMessage and handles citations', () => {
    const msg: MessageResponse = {
      id: 'msg-1',
      role: 'assistant',
      content: 'Here is the answer.',
      sources: [
        {
          source_id: '[S1]',
          document_id: 'doc-1',
          filename: 'readme.md',
          source_location: 'readme.md',
          chunk_index: 0,
          excerpt: 'Excerpt text',
          similarity: 0.85,
        },
      ],
      created_at: '2026-09-29T10:00:00Z',
    }

    const chatMsg = mapMessageResponse(msg, 'conv-1')
    expect(chatMsg.id).toBe('msg-1')
    expect(chatMsg.conversationId).toBe('conv-1')
    expect(chatMsg.role).toBe('assistant')
    expect(chatMsg.content).toBe('Here is the answer.')
    expect(chatMsg.citations?.length).toBe(1)
    expect(chatMsg.citations?.[0].id).toBe('S1')
  })

  it('handles insufficient-context message with empty citations', () => {
    const insufficientMsg: MessageResponse = {
      id: 'msg-2',
      role: 'assistant',
      content: 'I could not find sufficient context in the uploaded documents.',
      sources: [],
      answer_status: 'insufficient_context',
      created_at: '2026-09-29T10:00:00Z',
    }

    const chatMsg = mapMessageResponse(insufficientMsg, 'conv-1')
    expect(chatMsg.citations).toBeUndefined()
    expect(chatMsg.content).toContain('not find sufficient context')
  })

  it('maps ConversationResponse and ConversationDetailResponse', () => {
    const convResp: ConversationResponse = {
      id: 'c-1',
      title: 'First Thread',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:05:00Z',
      message_count: 4,
    }
    const conv = mapConversationResponse(convResp)
    expect(conv.id).toBe('c-1')
    expect(conv.messageCount).toBe(4)

    const detailResp: ConversationDetailResponse = {
      id: 'c-2',
      title: 'Second Thread',
      created_at: '2026-09-29T10:00:00Z',
      updated_at: '2026-09-29T10:05:00Z',
      messages: [
        {
          id: 'm-1',
          role: 'user',
          content: 'Hello',
          created_at: '2026-09-29T10:00:00Z',
        },
      ],
    }
    const convFromDetail = mapConversationResponse(detailResp)
    expect(convFromDetail.id).toBe('c-2')
    expect(convFromDetail.messageCount).toBe(1)
  })
})
