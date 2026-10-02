import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import {
  deleteDocument,
  getDocument,
  getDocumentChunks,
  listDocuments,
  reprocessDocument,
} from '@/services/documents-service'
import { swrKeys } from '@/lib/swr-keys'
import type { TraceDocument } from '@/types'

export function useDocuments() {
  return useSWR(swrKeys.documents, listDocuments, {
    // Dynamically poll every 3 seconds only while background ingestion is ongoing
    refreshInterval: (latestData) => {
      const isProcessing = latestData?.some(
        (doc) => doc.status === 'processing' || doc.status === 'queued'
      )
      return isProcessing ? 3000 : 0
    },
    revalidateOnFocus: true,
  })
}

export function useDocument(id: string | undefined) {
  return useSWR(id ? swrKeys.document(id) : null, () => getDocument(id as string), {
    refreshInterval: (latestData) => {
      return latestData?.status === 'processing' || latestData?.status === 'queued' ? 3000 : 0
    },
  })
}

export function useDocumentChunks(id: string | undefined, enabled = true) {
  return useSWR(id && enabled ? swrKeys.documentChunks(id) : null, () => getDocumentChunks(id as string))
}

export function useDocumentMutations() {
  const { mutate } = useSWRConfig()

  const revalidateAll = useCallback(async () => {
    await Promise.all([mutate(swrKeys.documents), mutate(swrKeys.stats)])
  }, [mutate])

  const remove = useCallback(
    async (id: string) => {
      await mutate<TraceDocument[]>(
        swrKeys.documents,
        async (current) => {
          await deleteDocument(id)
          return current?.filter((doc) => doc.id !== id)
        },
        {
          optimisticData: (current) => current?.filter((doc) => doc.id !== id) ?? [],
          rollbackOnError: true,
          revalidate: false,
        },
      )
      await mutate(swrKeys.stats)
    },
    [mutate],
  )

  const reprocess = useCallback(
    async (id: string) => {
      const updated = await reprocessDocument(id)
      await Promise.all([mutate(swrKeys.document(id), updated, { revalidate: false }), revalidateAll()])
      return updated
    },
    [mutate, revalidateAll],
  )

  return { remove, reprocess, revalidateAll }
}
