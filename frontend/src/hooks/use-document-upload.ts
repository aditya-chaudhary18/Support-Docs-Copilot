import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { createId } from '@/services/api-client'
import { uploadDocument } from '@/services/documents-service'
import { validateUploadFile } from '@/lib/files'
import type { UploadItem } from '@/types'
import { useDocumentMutations } from './use-documents'

export function useDocumentUpload() {
  const [items, setItems] = useState<UploadItem[]>([])
  const { revalidateAll } = useDocumentMutations()

  const updateItem = useCallback((id: string, updates: Partial<UploadItem>) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...updates } : item)))
  }, [])

  const runUpload = useCallback(
    async (item: UploadItem) => {
      updateItem(item.id, { status: 'uploading', progress: 0, error: undefined })
      try {
        const document = await uploadDocument(item.file, {
          onProgress: (progress) => updateItem(item.id, { progress }),
          onPhaseChange: (phase) => updateItem(item.id, { status: phase }),
        })
        updateItem(item.id, { status: 'success', progress: 100, documentId: document.id })
        toast.success(`${document.name} is ready`, { description: `${document.chunkCount} chunks indexed` })
        await revalidateAll()
      } catch (error: any) {
        if (error?.status === 409 || error?.code === 'DUPLICATE_DOCUMENT') {
          updateItem(item.id, { status: 'success', progress: 100 })
          toast.info(`${item.file.name} is already indexed in your library`)
          await revalidateAll()
          return
        }
        const message = error instanceof Error ? error.message : 'Upload failed'
        updateItem(item.id, { status: 'error', error: message })
        toast.error(`Could not process ${item.file.name}`, { description: message })
      }
    },
    [revalidateAll, updateItem],
  )

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const nextItems: UploadItem[] = Array.from(files).map((file) => {
        const validation = validateUploadFile(file)
        return {
          id: createId('upload'),
          file,
          status: validation.valid ? 'uploading' : 'error',
          progress: 0,
          error: validation.valid ? undefined : validation.error,
        }
      })

      setItems((current) => [...nextItems, ...current])
      nextItems.filter((item) => item.status !== 'error').forEach((item) => void runUpload(item))

      const rejected = nextItems.filter((item) => item.status === 'error')
      if (rejected.length > 0) {
        toast.error(`${rejected.length} file${rejected.length > 1 ? 's' : ''} rejected`, {
          description: rejected[0]?.error,
        })
      }
    },
    [runUpload],
  )

  const retry = useCallback(
    (id: string) => {
      const item = items.find((entry) => entry.id === id)
      if (item && validateUploadFile(item.file).valid) void runUpload(item)
    },
    [items, runUpload],
  )

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const clearCompleted = useCallback(() => {
    setItems((current) => current.filter((item) => item.status !== 'success'))
  }, [])

  const isBusy = items.some((item) => item.status === 'uploading' || item.status === 'processing')

  return { items, addFiles, retry, dismiss, clearCompleted, isBusy }
}
