import type { DocumentFileType } from '@/types'

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024

export const SUPPORTED_EXTENSIONS: Record<string, DocumentFileType> = {
  pdf: 'pdf',
  docx: 'docx',
  txt: 'txt',
  md: 'md',
  markdown: 'md',
}

export const ACCEPT_ATTRIBUTE = '.pdf,.docx,.txt,.md,.markdown'

export const FILE_TYPE_LABELS: Record<DocumentFileType, string> = {
  pdf: 'PDF',
  docx: 'DOCX',
  txt: 'Text',
  md: 'Markdown',
}

export function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.')
  return parts.length > 1 ? (parts.at(-1) ?? '') : ''
}

export function detectFileType(fileName: string): DocumentFileType | null {
  return SUPPORTED_EXTENSIONS[getExtension(fileName)] ?? null
}

export type FileValidationResult = { valid: true; fileType: DocumentFileType } | { valid: false; error: string }

export function validateUploadFile(file: File): FileValidationResult {
  const fileType = detectFileType(file.name)
  if (!fileType) {
    return { valid: false, error: 'Unsupported format. Use PDF, DOCX, TXT, or Markdown.' }
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { valid: false, error: 'File exceeds the 25 MB limit.' }
  }
  return { valid: true, fileType }
}
