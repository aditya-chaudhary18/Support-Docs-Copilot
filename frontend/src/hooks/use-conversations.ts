import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import { deleteConversation, listConversations } from '@/services/conversations-service'
import { swrKeys } from '@/lib/swr-keys'
import type { Conversation } from '@/types'

export function useConversations() {
  return useSWR(swrKeys.conversations, listConversations)
}

export function useConversationMutations() {
  const { mutate } = useSWRConfig()

  const remove = useCallback(
    async (id: string) => {
      await mutate<Conversation[]>(
        swrKeys.conversations,
        async (current) => {
          await deleteConversation(id)
          return current?.filter((conversation) => conversation.id !== id)
        },
        {
          optimisticData: (current) => current?.filter((conversation) => conversation.id !== id) ?? [],
          rollbackOnError: true,
          revalidate: false,
        },
      )
      await mutate(swrKeys.messages(id), undefined, { revalidate: false })
      await mutate(swrKeys.stats)
    },
    [mutate],
  )

  return { remove }
}
