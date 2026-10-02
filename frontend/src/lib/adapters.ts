import { detectFileType } from '@/lib/files'
import type {
  DocumentResponse,
  SourceCitation,
  MessageResponse,
  ConversationResponse,
  ConversationDetailResponse,
} from '@/lib/api'
import type {
  TraceDocument,
  Citation,
  ChatMessage,
  Conversation,
  DocumentFileType,
  DocumentStatus,
  MessageRole,
} from '@/types'

/** Maps FastAPI DocumentResponse to frontend TraceDocument. */
export function mapDocumentResponse(doc: DocumentResponse): TraceDocument {
  const statusMap: Record<string, DocumentStatus> = {
    uploaded: 'processing',
    processing: 'processing',
    ready: 'ready',
    failed: 'failed',
  }

  return {
    id: doc.id,
    name: doc.filename,
    fileType: (doc.file_type.toLowerCase() as DocumentFileType) || 'txt',
    sizeBytes: doc.file_size,
    uploadedAt: doc.uploaded_at,
    updatedAt: doc.processed_at || doc.uploaded_at,
    status: statusMap[doc.status] || 'processing',
    chunkCount: doc.chunk_count,
    pageCount: doc.page_count ?? undefined,
    uploadedBy: 'Owner',
    errorMessage: doc.processing_error ?? undefined,
    tags: [],
  }
}

/** Maps FastAPI SourceCitation to frontend Citation model. */
export function mapSourceCitation(src: SourceCitation): Citation {
  const cleanId = (src.source_id || 'S1').replace(/[[\]]/g, '')
  return {
    id: cleanId,
    documentId: src.document_id,
    documentName: src.filename,
    fileType: (detectFileType(src.filename) as DocumentFileType) ?? 'pdf',
    page: src.page_number ?? undefined,
    section: src.section_title || src.source_location || '',
    excerpt: src.excerpt || '',
    relevance: typeof src.similarity === 'number' ? src.similarity : 0.85,
    chunkId: src.chunk_id || undefined,
    chunkIndex: typeof src.chunk_index === 'number' ? src.chunk_index : undefined,
  }
}

/** Maps FastAPI MessageResponse to frontend ChatMessage. */
export function mapMessageResponse(msg: MessageResponse, conversationId: string): ChatMessage {
  const citations = (msg.sources || []).map(mapSourceCitation)
  return {
    id: msg.id,
    conversationId,
    role: msg.role as MessageRole,
    content: msg.content,
    createdAt: msg.created_at,
    citations: citations.length > 0 ? citations : undefined,
  }
}

/** Maps FastAPI ConversationResponse or ConversationDetailResponse to frontend Conversation. */
export function mapConversationResponse(
  c: ConversationResponse | ConversationDetailResponse
): Conversation {
  const count = 'message_count' in c ? c.message_count : (c.messages?.length ?? 0)
  return {
    id: c.id,
    title: c.title,
    preview: '',
    messageCount: count,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    selectedDocumentIds: c.selected_document_ids ?? undefined,
    selectedDocuments: c.selected_documents
      ? c.selected_documents.map((d) => ({ id: d.id, name: d.name, fileType: d.file_type }))
      : undefined,
  }
}

