import { useCallback, useEffect, useMemo, useState } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { createId } from '@/services/api-client'
import { regenerateMessage, retryLastMessage, sendMessage } from '@/services/chat-service'
import { getConversationMessages } from '@/services/conversations-service'
import { swrKeys } from '@/lib/swr-keys'
import type { ChatMessage } from '@/types'

export type ChatStage = 'idle' | 'sending' | 'searching' | 'generating' | 'success' | 'error'

interface PendingRequest {
  conversationId: string
  userMessage?: ChatMessage
}

interface ChatError {
  conversationId: string
  message: string
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return "Trace couldn't generate a response. Please try again."
}

export function useChat(conversationId: string | undefined, onConversationCreated: (id: string) => void) {
  const { mutate } = useSWRConfig()

  const messagesQuery = useSWR(
    conversationId ? swrKeys.messages(conversationId) : null,
    () => getConversationMessages(conversationId as string),
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
    }
  )

  const [pending, setPending] = useState<PendingRequest | null>(null)
  const [chatStage, setChatStage] = useState<ChatStage>('idle')
  const [chatError, setChatError] = useState<ChatError | null>(null)
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null)
  const [transientMessages, setTransientMessages] = useState<{ convId: string; messages: ChatMessage[] } | null>(null)

  // Clear transient messages once the actual SWR query has populated with messages for the conversation
  useEffect(() => {
    if (conversationId && messagesQuery.data && messagesQuery.data.length > 0) {
      if (transientMessages && transientMessages.convId === conversationId) {
        setTransientMessages(null)
      }
    }
  }, [conversationId, messagesQuery.data, transientMessages])

  const refreshSidebars = useCallback(async () => {
    await Promise.all([mutate(swrKeys.conversations), mutate(swrKeys.stats)])
  }, [mutate])

  const appendMessages = useCallback(
    (id: string, newMessages: ChatMessage[]) =>
      mutate<ChatMessage[]>(
        swrKeys.messages(id),
        (current = []) => [...current, ...newMessages],
        { revalidate: false }
      ),
    [mutate]
  )

  const send = useCallback(
    async (content: string, documentIds?: string[] | null) => {
      const trimmed = content.trim()
      if (!trimmed || pending) return

      const currentConvId = conversationId || null
      const tempId = currentConvId || 'new_chat'

      setChatError(null)
      setChatStage('searching')

      const optimisticUserMsg: ChatMessage = {
        id: createId('pending_user'),
        conversationId: tempId,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      }

      setPending({
        conversationId: tempId,
        userMessage: optimisticUserMsg,
      })

      // Progressively advance stage indicator for realistic search/generation feedback
      const timer = setTimeout(() => {
        setChatStage((prev) => (prev === 'searching' ? 'generating' : prev))
      }, 1200)

      try {
        const { userMessage, assistantMessage, conversationId: createdConvId } =
          await sendMessage(currentConvId, trimmed, documentIds)

        clearTimeout(timer)
        setChatStage('success')

        if (!currentConvId && createdConvId) {
          // Keep transient messages so UI never blanks out during navigation transition
          setTransientMessages({
            convId: createdConvId,
            messages: [userMessage, assistantMessage],
          })

          await mutate(
            swrKeys.messages(createdConvId),
            [userMessage, assistantMessage],
            { revalidate: false }
          )

          onConversationCreated(createdConvId)
        } else if (currentConvId) {
          // Existing conversation
          await appendMessages(currentConvId, [userMessage, assistantMessage])
        }
      } catch (error) {
        clearTimeout(timer)
        setChatStage('error')
        if (currentConvId) {
          await mutate(swrKeys.messages(currentConvId))
        }
        setChatError({
          conversationId: tempId,
          message: getErrorMessage(error),
        })
      } finally {
        setPending(null)
        void refreshSidebars()
      }
    },
    [appendMessages, conversationId, mutate, onConversationCreated, pending, refreshSidebars]
  )

  const retry = useCallback(async () => {
    if (pending) return

    const activeMessages = messagesQuery.data ?? []
    const lastUserMessage = [...activeMessages]
      .reverse()
      .find((m) => m.role === 'user')

    if (!lastUserMessage) return

    if (!conversationId) {
      await send(lastUserMessage.content)
      return
    }

    setChatError(null)
    setChatStage('searching')
    setPending({ conversationId })

    const timer = setTimeout(() => {
      setChatStage((prev) => (prev === 'searching' ? 'generating' : prev))
    }, 1200)

    try {
      const assistantMessage = await retryLastMessage(conversationId, lastUserMessage.content)
      clearTimeout(timer)
      setChatStage('success')
      await appendMessages(conversationId, [assistantMessage])
    } catch (error) {
      clearTimeout(timer)
      setChatStage('error')
      setChatError({ conversationId, message: getErrorMessage(error) })
    } finally {
      setPending(null)
      void refreshSidebars()
    }
  }, [appendMessages, conversationId, messagesQuery.data, pending, refreshSidebars, send])

  const regenerate = useCallback(
    async (messageId: string) => {
      if (!conversationId || pending || regeneratingId) return

      const activeMessages = messagesQuery.data ?? []
      const index = activeMessages.findIndex((m) => m.id === messageId)
      const question = activeMessages
        .slice(0, index === -1 ? undefined : index)
        .findLast((m) => m.role === 'user')

      if (!question) return

      setRegeneratingId(messageId)
      setChatStage('generating')
      try {
        const replacement = await regenerateMessage(conversationId, messageId, question.content)
        setChatStage('success')
        await mutate<ChatMessage[]>(
          swrKeys.messages(conversationId),
          (current = []) => current.map((m) => (m.id === messageId ? replacement : m)),
          { revalidate: false }
        )
      } catch (error) {
        setChatStage('error')
        setChatError({ conversationId, message: getErrorMessage(error) })
      } finally {
        setRegeneratingId(null)
      }
    },
    [conversationId, mutate, pending, regeneratingId, messagesQuery.data]
  )

  const activePending =
    pending && (pending.conversationId === conversationId || (!conversationId && pending.conversationId === 'new_chat'))
      ? pending
      : null

  const messages = useMemo(() => {
    let stored = messagesQuery.data ?? []
    if (stored.length === 0 && transientMessages) {
      if (!conversationId || transientMessages.convId === conversationId) {
        stored = transientMessages.messages
      }
    }
    return activePending?.userMessage ? [...stored, activePending.userMessage] : stored
  }, [activePending, conversationId, messagesQuery.data, transientMessages])

  return {
    messages,
    isLoading: messagesQuery.isLoading && Boolean(conversationId) && messages.length === 0,
    loadError: messagesQuery.error as Error | undefined,
    reload: () => messagesQuery.mutate(),
    isGenerating: activePending !== null,
    isBusy: pending !== null,
    chatStage,
    regeneratingId,
    error:
      chatError &&
      (chatError.conversationId === conversationId ||
        (!conversationId && chatError.conversationId === 'new_chat'))
        ? chatError.message
        : null,
    send,
    retry,
    regenerate,
    dismissError: () => setChatError(null),
  }
}
