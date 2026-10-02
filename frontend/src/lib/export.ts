import { exportConversationApi } from '@/lib/api'
import type { ChatMessage } from '@/types'

export interface ExportSessionOptions {
  conversationId?: string | null
  title?: string
  messages: ChatMessage[]
  format?: 'markdown' | 'pdf' | 'json'
  selectedDocumentNames?: string[]
}

/**
 * Formats session messages to authoritative Markdown adhering to PRD requirements.
 */
export function formatSessionToMarkdown(
  title: string,
  messages: ChatMessage[],
  conversationId?: string | null,
  selectedDocumentNames?: string[]
): string {
  const dateStr = new Date().toUTCString()
  const scopeStr = selectedDocumentNames && selectedDocumentNames.length > 0
    ? selectedDocumentNames.join(', ')
    : 'All Indexed Documents in Knowledge Base'

  const lines: string[] = [
    '# Support Docs Copilot — Grounded Session Export',
    `**Session Title:** ${title}`,
    `**Session ID:** \`${conversationId || 'active-session'}\``,
    `**Exported At:** ${dateStr}`,
    `**Document Scope:** ${scopeStr}`,
    '**Grounding Architecture:** Strict Neon pgvector HNSW + Gemini 1.5 Flash Grounded Generation',
    '',
    '---',
    '',
  ]

  let turn = 1
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]
    if (msg.role === 'user') {
      lines.push(`## Turn ${turn}`)
      lines.push('')
      lines.push('### Question')
      lines.push(msg.content)
      lines.push('')

      if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
        const asst = messages[i + 1]
        lines.push('### Answer')
        lines.push(asst.content)
        lines.push('')

        const citations = asst.citations || []
        if (citations.length > 0) {
          lines.push(`### Retrieved Grounded Sources (${citations.length})`)
          citations.forEach((cit) => {
            const pct = Math.round(cit.relevance * 100)
            const chunkIdStr = cit.chunkId ? ` (Chunk ID: \`${cit.chunkId}\`)` : ''
            const pageStr = cit.page ? `Page ${cit.page}` : 'Page 1'
            const secStr = cit.section ? `, Section: ${cit.section}` : ''
            lines.push(`- **[${cit.id}] ${cit.documentName}** — ${pageStr}${secStr} • Similarity: ${pct}%${chunkIdStr}`)
            if (cit.excerpt) {
              const indented = cit.excerpt
                .split('\n')
                .map((l) => `  > ${l}`)
                .join('\n')
              lines.push(indented)
            }
            lines.push('')
          })
        } else {
          lines.push('*No retrieved sources were cited for this response.*')
          lines.push('')
        }
        i++
      }

      lines.push('---')
      lines.push('')
      turn++
    } else if (msg.role === 'assistant') {
      lines.push('### Assistant Note')
      lines.push(msg.content)
      lines.push('')
      lines.push('---')
      lines.push('')
    }
    i++
  }

  return lines.join('\n')
}

/**
 * Formats in-memory session messages to JSON.
 */
export function formatSessionToJson(
  title: string,
  messages: ChatMessage[],
  conversationId?: string | null,
  selectedDocumentNames?: string[]
): string {
  const turns = []
  let turn = 1
  let i = 0

  while (i < messages.length) {
    const msg = messages[i]
    if (msg.role === 'user') {
      let asst: ChatMessage | undefined
      if (i + 1 < messages.length && messages[i + 1].role === 'assistant') {
        asst = messages[i + 1]
        i++
      }
      turns.push({
        turn,
        question: msg.content,
        questionCreatedAt: msg.createdAt,
        answer: asst?.content || null,
        answerCreatedAt: asst?.createdAt || null,
        sources: (asst?.citations || []).map((c) => ({
          citationId: c.id,
          documentId: c.documentId,
          documentName: c.documentName,
          chunkId: c.chunkId || null,
          chunkIndex: c.chunkIndex ?? null,
          page: c.page ?? 1,
          section: c.section || '',
          similarity: c.relevance,
          excerpt: c.excerpt,
        })),
      })
      turn++
    } else {
      turns.push({
        role: msg.role,
        content: msg.content,
        createdAt: msg.createdAt,
        sources: (msg.citations || []).map((c) => ({
          citationId: c.id,
          documentId: c.documentId,
          documentName: c.documentName,
          similarity: c.relevance,
          excerpt: c.excerpt,
        })),
      })
    }
    i++
  }

  return JSON.stringify(
    {
      application: 'Support Docs Copilot',
      sessionId: conversationId || 'active-session',
      sessionTitle: title,
      documentScope: selectedDocumentNames || ['All Indexed Documents'],
      exportedAt: new Date().toISOString(),
      turns,
    },
    null,
    2
  )
}

/**
 * Triggers a browser file download of a Blob or string content.
 */
export function triggerFileDownload(
  contentOrBlob: Blob | string,
  filename: string,
  mimeType = 'text/markdown; charset=utf-8'
) {
  const blob = typeof contentOrBlob === 'string' ? new Blob([contentOrBlob], { type: mimeType }) : contentOrBlob
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/**
 * Main export function: downloads session as Markdown (.md) or PDF (.pdf) via backend
 * or local fallback.
 */
export async function downloadSessionExport(options: ExportSessionOptions): Promise<void> {
  const {
    conversationId,
    title = 'New Knowledge Query',
    messages,
    format = 'markdown',
    selectedDocumentNames,
  } = options

  if (messages.length === 0) {
    throw new Error('No messages in the current session to export.')
  }

  const safeTitle = title.toLowerCase().replace(/[^a-z0-9_-]/g, '-').slice(0, 32) || 'session'
  const ext = format === 'pdf' ? 'pdf' : format === 'json' ? 'json' : 'md'
  const filename = `support-docs-copilot-${safeTitle}.${ext}`

  if (conversationId && !conversationId.startsWith('new_') && !conversationId.startsWith('temp_')) {
    try {
      const mimeType = format === 'pdf' ? 'application/pdf' : format === 'json' ? 'application/json' : 'text/markdown'
      const blob = await exportConversationApi(conversationId, format)
      triggerFileDownload(blob, filename, mimeType)
      return
    } catch (err) {
      console.warn(`Backend ${format} export failed, falling back to local formatting:`, err)
      if (format === 'pdf') {
        throw new Error('PDF generation requires an active server connection. Please try exporting as Markdown.')
      }
    }
  }

  if (format === 'pdf') {
    throw new Error('Please send at least one message to persist the session before exporting as PDF.')
  }

  if (format === 'json') {
    const jsonStr = formatSessionToJson(title, messages, conversationId, selectedDocumentNames)
    triggerFileDownload(jsonStr, filename, 'application/json; charset=utf-8')
  } else {
    const mdStr = formatSessionToMarkdown(title, messages, conversationId, selectedDocumentNames)
    triggerFileDownload(mdStr, filename, 'text/markdown; charset=utf-8')
  }
}
