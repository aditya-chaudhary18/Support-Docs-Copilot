import { sendChatMessage } from '@/lib/api'
import { mapSourceCitation } from '@/lib/adapters'
import { pickCannedResponse } from '@/lib/mock-responses'
import type { ChatMessage } from '@/types'
import { ApiError, USE_MOCK_API, createId, delay } from './api-client'
import { mockStore } from './mock-store'

export interface SendMessageResult {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
  conversationId: string
}

function touchConversation(conversationId: string, preview: string, addedMessages: number) {
  const conversation = mockStore.conversations.find((item) => item.id === conversationId)
  if (!conversation) return
  conversation.preview = preview.replace(/\[S\d+\]|[`*#]/g, '').slice(0, 90).trim() + '…'
  conversation.messageCount += addedMessages
  conversation.updatedAt = new Date().toISOString()
}

async function generateAnswer(conversationId: string, question: string): Promise<ChatMessage> {
  await delay(1600 + Math.random() * 800)

  // Lets the error state be exercised against mock data.
  if (question.toLowerCase().includes('simulate error')) {
    throw new ApiError('The retrieval service timed out. Please try again.', 504)
  }

  const { content, citations } = pickCannedResponse(question)
  return {
    id: createId('msg'),
    conversationId,
    role: 'assistant',
    content,
    citations: structuredClone(citations),
    createdAt: new Date().toISOString(),
  }
}

export async function sendMessage(
  conversationId: string | null | undefined,
  content: string,
  documentIds?: string[] | null
): Promise<SendMessageResult> {
  if (!USE_MOCK_API) {
    const res = await sendChatMessage({
      question: content,
      conversation_id: conversationId || null,
      document_ids: documentIds || null,
    })

    const now = new Date().toISOString()
    const userMessage: ChatMessage = {
      id: createId('user_msg'),
      conversationId: res.conversation_id,
      role: 'user',
      content,
      createdAt: now,
    }

    const citations = (res.sources || []).map(mapSourceCitation)

    const assistantMessage: ChatMessage = {
      id: res.message_id,
      conversationId: res.conversation_id,
      role: 'assistant',
      content: res.answer,
      citations: citations.length > 0 ? citations : undefined,
      createdAt: now,
    }

    return {
      userMessage,
      assistantMessage,
      conversationId: res.conversation_id,
    }
  }

  const targetId = conversationId || createId('conv')
  const userMessage: ChatMessage = {
    id: createId('msg'),
    conversationId: targetId,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  }
  mockStore.messages.push(userMessage)
  touchConversation(targetId, content, 1)

  const assistantMessage = await generateAnswer(targetId, content)
  mockStore.messages.push(assistantMessage)
  touchConversation(targetId, assistantMessage.content, 1)

  return { userMessage, assistantMessage, conversationId: targetId }
}

/** Generates an answer for the latest unanswered user message, e.g. after a failed request. */
export async function retryLastMessage(
  conversationId: string,
  lastQuestion?: string
): Promise<ChatMessage> {
  if (!USE_MOCK_API) {
    if (!lastQuestion) {
      throw new ApiError('Cannot retry without previous question context.', 400)
    }
    const result = await sendMessage(conversationId, lastQuestion)
    return result.assistantMessage
  }

  const lastUserMessage = mockStore.messages.findLast(
    (message) => message.conversationId === conversationId && message.role === 'user',
  )
  const assistantMessage = await generateAnswer(conversationId, lastUserMessage?.content ?? '')
  mockStore.messages.push(assistantMessage)
  touchConversation(conversationId, assistantMessage.content, 1)
  return assistantMessage
}

export async function regenerateMessage(
  conversationId: string,
  messageId: string,
  questionText?: string
): Promise<ChatMessage> {
  if (!USE_MOCK_API) {
    if (!questionText) {
      throw new ApiError('Question text required to regenerate message.', 400)
    }
    const result = await sendMessage(conversationId, questionText)
    return result.assistantMessage
  }

  const index = mockStore.messages.findIndex((message) => message.id === messageId)
  const question = mockStore.messages
    .slice(0, index === -1 ? undefined : index)
    .findLast((message) => message.conversationId === conversationId && message.role === 'user')

  const assistantMessage = await generateAnswer(conversationId, question?.content ?? '')
  if (index !== -1) mockStore.messages.splice(index, 1, assistantMessage)
  touchConversation(conversationId, assistantMessage.content, 0)
  return assistantMessage
}
