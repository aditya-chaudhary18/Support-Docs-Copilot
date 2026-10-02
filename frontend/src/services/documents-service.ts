import {
  getDocuments,
  getDocument as fetchDocument,
  uploadDocument as uploadDocApi,
  deleteDocument as deleteDocApi,
  getDocumentChunksApi,
} from '@/lib/api'
import { mapDocumentResponse } from '@/lib/adapters'
import { detectFileType } from '@/lib/files'
import type { DocumentChunk, TraceDocument } from '@/types'
import { ApiError, USE_MOCK_API, createId, delay } from './api-client'
import { mockStore } from './mock-store'

export type UploadPhase = 'uploading' | 'processing'

export interface UploadCallbacks {
  onProgress?: (percent: number) => void
  onPhaseChange?: (phase: UploadPhase) => void
  signal?: AbortSignal
}

function sortByUploadedAt(documents: TraceDocument[]): TraceDocument[] {
  return [...documents].sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
}

export async function listDocuments(): Promise<TraceDocument[]> {
  if (!USE_MOCK_API) {
    const res = await getDocuments()
    return sortByUploadedAt(res.items.map(mapDocumentResponse))
  }
  await delay(450)
  return sortByUploadedAt(mockStore.documents)
}

export async function getDocument(id: string): Promise<TraceDocument> {
  if (!USE_MOCK_API) {
    const doc = await fetchDocument(id)
    return mapDocumentResponse(doc)
  }
  await delay(300)
  const document = mockStore.documents.find((item) => item.id === id)
  if (!document) throw new ApiError('Document not found', 404)
  return { ...document }
}

export async function getDocumentChunks(id: string): Promise<DocumentChunk[]> {
  if (!USE_MOCK_API) {
    try {
      const res = await getDocumentChunksApi(id)
      return res.items.map((c) => ({
        id: c.id,
        documentId: c.document_id,
        index: c.chunk_index,
        section: c.section_title || `Chunk #${c.chunk_index}`,
        page: c.page_number ?? undefined,
        content: c.content,
        tokenCount: c.token_count ?? 0,
      }))
    } catch (err) {
      console.warn(`Failed to fetch chunks from backend for document ${id}:`, err)
      return []
    }
  }
  await delay(400)
  const document = mockStore.documents.find((item) => item.id === id)
  if (!document || document.status !== 'ready') return []

  const chunks = mockStore.chunks.filter((chunk) => chunk.documentId === id)
  if (chunks.length > 0) return chunks

  return Array.from({ length: 3 }, (_, index) => ({
    id: `${id}_chunk_${index}`,
    documentId: id,
    index,
    section: `Section ${index + 1}`,
    page: document.pageCount ? index + 1 : undefined,
    tokenCount: 320 + index * 24,
    content: `${document.description ?? document.name} — extracted passage ${index + 1}.`,
  }))
}

export async function deleteDocument(id: string): Promise<void> {
  if (!USE_MOCK_API) {
    await deleteDocApi(id)
    return
  }
  await delay(500)
  mockStore.documents = mockStore.documents.filter((item) => item.id !== id)
}

export async function reprocessDocument(id: string): Promise<TraceDocument> {
  if (!USE_MOCK_API) {
    const doc = await fetchDocument(id)
    return mapDocumentResponse(doc)
  }
  await delay(400)
  const document = mockStore.documents.find((item) => item.id === id)
  if (!document) throw new ApiError('Document not found', 404)
  document.status = 'processing'
  document.errorMessage = undefined
  document.updatedAt = new Date().toISOString()
  return { ...document }
}

async function simulateUploadProgress({ onProgress, signal }: UploadCallbacks): Promise<void> {
  for (let percent = 0; percent <= 100; percent += 10 + Math.round(Math.random() * 10)) {
    if (signal?.aborted) throw new ApiError('Upload cancelled', 499)
    onProgress?.(Math.min(percent, 100))
    await delay(140)
  }
  onProgress?.(100)
}

export async function uploadDocument(file: File, callbacks: UploadCallbacks = {}): Promise<TraceDocument> {
  if (!USE_MOCK_API) {
    callbacks.onPhaseChange?.('uploading')
    callbacks.onProgress?.(50)
    const doc = await uploadDocApi(file, { signal: callbacks.signal })
    callbacks.onProgress?.(100)
    callbacks.onPhaseChange?.('processing')
    return mapDocumentResponse(doc)
  }

  callbacks.onPhaseChange?.('uploading')
  await simulateUploadProgress(callbacks)

  callbacks.onPhaseChange?.('processing')
  await delay(1400)

  if (file.size === 0) {
    throw new ApiError('The file is empty and could not be parsed.', 422)
  }

  const now = new Date().toISOString()
  const document: TraceDocument = {
    id: createId('doc'),
    name: file.name,
    fileType: detectFileType(file.name) ?? 'txt',
    sizeBytes: file.size,
    uploadedAt: now,
    updatedAt: now,
    status: 'ready',
    chunkCount: Math.max(4, Math.round(file.size / 6000)),
    uploadedBy: mockStore.user.name,
    tags: [],
  }
  mockStore.documents.unshift(document)
  return document
}
