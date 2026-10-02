export const swrKeys = {
  documents: '/documents',
  document: (id: string) => `/documents/${id}`,
  documentChunks: (id: string) => `/documents/${id}/chunks`,
  conversations: '/conversations',
  conversation: (id: string) => `/conversations/${id}`,
  messages: (conversationId: string) => `/conversations/${conversationId}/messages`,
  stats: '/stats',
  systemStatus: '/health/components',
  currentUser: '/me',
  settings: '/settings',
} as const
