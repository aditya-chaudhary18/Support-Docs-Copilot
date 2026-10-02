import { describe, it, expect } from 'vitest'
import { formatSessionToMarkdown, formatSessionToJson } from '@/lib/export'
import type { ChatMessage } from '@/types'

describe('Session Export Formatting', () => {
  const sampleMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      conversationId: 'conv-test-123',
      role: 'user',
      content: 'What is the purpose of this project?',
      createdAt: '2026-10-02T12:00:00Z',
    },
    {
      id: 'msg-2',
      conversationId: 'conv-test-123',
      role: 'assistant',
      content: 'This project provides grounded documentation assistance [S1].',
      createdAt: '2026-10-02T12:00:05Z',
      citations: [
        {
          id: 'S1',
          documentId: 'doc-456',
          documentName: 'architecture.pdf',
          fileType: 'pdf',
          page: 2,
          section: 'System Overview',
          excerpt: 'Support Docs Copilot provides grounded question answering.',
          relevance: 0.94,
          chunkId: 'chunk-789',
          chunkIndex: 1,
        },
      ],
    },
  ]

  it('formats session to clean markdown with questions, answers, and grounded citations', () => {
    const md = formatSessionToMarkdown('Architecture Overview', sampleMessages, 'conv-test-123')

    expect(md).toContain('# Support Docs Copilot — Grounded Session Export')
    expect(md).toContain('**Session Title:** Architecture Overview')
    expect(md).toContain('**Session ID:** `conv-test-123`')
    expect(md).toContain('### Question')
    expect(md).toContain('What is the purpose of this project?')
    expect(md).toContain('### Answer')
    expect(md).toContain('This project provides grounded documentation assistance [S1].')
    expect(md).toContain('### Retrieved Grounded Sources (1)')
    expect(md).toContain('[S1] architecture.pdf')
    expect(md).toContain('Page 2, Section: System Overview')
    expect(md).toContain('Similarity: 94%')
    expect(md).toContain('Chunk ID: `chunk-789`')
    expect(md).toContain('Support Docs Copilot provides grounded question answering.')
  })

  it('formats session to structured JSON with all turn metadata', () => {
    const jsonStr = formatSessionToJson('Architecture Overview', sampleMessages, 'conv-test-123')
    const parsed = JSON.parse(jsonStr)

    expect(parsed.application).toBe('Support Docs Copilot')
    expect(parsed.sessionId).toBe('conv-test-123')
    expect(parsed.sessionTitle).toBe('Architecture Overview')
    expect(parsed.turns).toHaveLength(1)
    expect(parsed.turns[0].question).toBe('What is the purpose of this project?')
    expect(parsed.turns[0].answer).toBe('This project provides grounded documentation assistance [S1].')
    expect(parsed.turns[0].sources).toHaveLength(1)
    expect(parsed.turns[0].sources[0].citationId).toBe('S1')
    expect(parsed.turns[0].sources[0].documentName).toBe('architecture.pdf')
    expect(parsed.turns[0].sources[0].chunkId).toBe('chunk-789')
    expect(parsed.turns[0].sources[0].similarity).toBe(0.94)
  })
})
