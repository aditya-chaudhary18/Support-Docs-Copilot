import {
  getConversations as fetchConversationsApi,
  getConversation as fetchConversationApi,
  deleteConversation as deleteConversationApi,
  updateConversationScopeApi,
} from '@/lib/api'
import { mapConversationResponse, mapMessageResponse } from '@/lib/adapters'
import type { ChatMessage, Conversation } from '@/types'
import { ApiError, USE_MOCK_API, createId, delay } from './api-client'
import { mockStore } from './mock-store'

export async function listConversations(): Promise<Conversation[]> {
  if (!USE_MOCK_API) {
    const res = await fetchConversationsApi()
    return res.items
      .map(mapConversationResponse)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }
  await delay(350)
  return [...mockStore.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getConversation(id: string): Promise<Conversation> {
  if (!USE_MOCK_API) {
    const res = await fetchConversationApi(id)
    return mapConversationResponse(res)
  }
  await delay(200)
  const conversation = mockStore.conversations.find((item) => item.id === id)
  if (!conversation) throw new ApiError('Conversation not found', 404)
  return { ...conversation }
}

export async function getConversationMessages(id: string): Promise<ChatMessage[]> {
  if (!USE_MOCK_API) {
    const res = await fetchConversationApi(id)
    return (res.messages || []).map((msg) => mapMessageResponse(msg, id))
  }
  await delay(400)
  if (!mockStore.conversations.some((item) => item.id === id)) {
    throw new ApiError('Conversation not found', 404)
  }
  return mockStore.messages.filter((message) => message.conversationId === id)
}

export async function createConversation(firstMessage: string): Promise<Conversation> {
  const title = firstMessage.length > 60 ? `${firstMessage.slice(0, 57).trimEnd()}…` : firstMessage

  if (!USE_MOCK_API) {
    // In live API mode, conversations are initialized via POST /api/chat per PRD Section 15.6.
    // Return a transient client-side conversation model before first message is sent.
    const now = new Date().toISOString()
    return {
      id: createId('temp_conv'),
      title,
      preview: '',
      messageCount: 0,
      createdAt: now,
      updatedAt: now,
    }
  }

  await delay(150)
  const now = new Date().toISOString()
  const conversation: Conversation = {
    id: createId('conv'),
    title,
    preview: '',
    messageCount: 0,
    createdAt: now,
    updatedAt: now,
  }
  mockStore.conversations.unshift(conversation)
  return conversation
}

export async function deleteConversation(id: string): Promise<void> {
  if (!USE_MOCK_API) {
    await deleteConversationApi(id)
    return
  }
  await delay(400)
  mockStore.conversations = mockStore.conversations.filter((item) => item.id !== id)
  mockStore.messages = mockStore.messages.filter((message) => message.conversationId !== id)
}

export async function updateConversationScope(
  id: string,
  selectedDocumentIds: string[] | null
): Promise<Conversation> {
  if (!USE_MOCK_API) {
    const res = await updateConversationScopeApi(id, selectedDocumentIds)
    return mapConversationResponse(res)
  }
  await delay(200)
  const conversation = mockStore.conversations.find((item) => item.id === id)
  if (!conversation) throw new ApiError('Conversation not found', 404)
  conversation.selectedDocumentIds = selectedDocumentIds ?? undefined
  return { ...conversation }
}

