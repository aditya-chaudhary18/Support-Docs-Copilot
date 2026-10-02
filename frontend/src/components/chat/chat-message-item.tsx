import { useState, Fragment, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, RotateCw, User } from 'lucide-react'
import { TraceIcon } from '@/components/ui/trace-icon'
import { Button } from '@/components/ui/button'
import { CitationBadge } from '@/components/citations/citation-badge'
import { CitationsSection } from '@/components/citations/citations-section'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface ChatMessageItemProps {
  message: ChatMessage
  onRegenerate?: (messageId: string) => void
  isRegenerating?: boolean
}

export function ChatMessageItem({
  message,
  onRegenerate,
  isRegenerating = false,
}: ChatMessageItemProps) {
  const isUser = message.role === 'user'
  const { copy, copied } = useCopyToClipboard()
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null)

  // Custom text renderer to turn [S1], [S2] etc into interactive CitationBadges
  const renderTextWithCitations = (text: string) => {
    const citationRegex = /\[(S\d+)\]/g
    const parts: (string | ReactNode)[] = []
    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = citationRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index))
      }
      const citationId = match[1]
      parts.push(
        <CitationBadge
          key={`${message.id}-${citationId}-${match.index}`}
          id={citationId}
          isActive={activeCitationId === citationId}
          onClick={() => {
            setActiveCitationId((prev) => (prev === citationId ? null : citationId))
            // Smooth scroll to citation card
            const el = document.getElementById(`citation-${citationId}`)
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
          }}
        />
      )
      lastIndex = match.index + match[0].length
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex))
    }

    return parts
  }

  return (
    <div
      className={cn(
        'group relative flex gap-4 px-4 py-6 transition-colors',
        isUser ? 'bg-transparent' : 'bg-muted/30 border-y border-border/40'
      )}
    >
      {/* Avatar Icon */}
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-lg border text-sm font-medium shadow-xs',
          isUser
            ? 'bg-background text-foreground border-border'
            : 'bg-primary/10 border-primary/25 text-primary'
        )}
        aria-hidden="true"
      >
        {isUser ? <User className="size-4" /> : <TraceIcon className="size-4.5" />}
      </div>

      {/* Message Body & Citations */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground">
              {isUser ? 'You' : 'Trace Assistant'}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {formatDate(message.createdAt)}
            </span>
          </div>

          {/* Action buttons (copy / regenerate) */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => copy(message.content)}
              title="Copy message"
              aria-label="Copy message"
            >
              {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
            </Button>
            {!isUser && onRegenerate && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => onRegenerate(message.id)}
                disabled={isRegenerating}
                title="Regenerate response"
                aria-label="Regenerate response"
              >
                <RotateCw className={cn('size-3.5', isRegenerating && 'animate-spin text-primary')} />
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        {isUser ? (
          <p className="whitespace-pre-wrap text-sm text-foreground/90 leading-relaxed font-sans">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p({ children }) {
                  // If child is pure string, process citations
                  if (typeof children === 'string') {
                    return <p className="mb-3 last:mb-0">{renderTextWithCitations(children)}</p>
                  }
                  if (Array.isArray(children)) {
                    return (
                      <p className="mb-3 last:mb-0">
                        {children.map((child, i) =>
                          typeof child === 'string' ? (
                            <Fragment key={i}>{renderTextWithCitations(child)}</Fragment>
                          ) : (
                            child
                          )
                        )}
                      </p>
                    )
                  }
                  return <p className="mb-3 last:mb-0">{children}</p>
                },
                code({ className, children, ...props }) {
                  const isInline = !className && typeof children === 'string' && !children.includes('\n')
                  if (isInline) {
                    return (
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[12px] text-primary" {...props}>
                        {children}
                      </code>
                    )
                  }
                  const codeString = String(children).replace(/\n$/, '')
                  return <CodeBlock code={codeString} className={className} />
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Citations section if assistant response */}
        {!isUser && message.citations && message.citations.length > 0 && (
          <CitationsSection
            citations={message.citations}
            activeCitationId={activeCitationId}
            onCitationSelect={(id) => setActiveCitationId((prev) => (prev === id ? null : id))}
          />
        )}
      </div>
    </div>
  )
}

function CodeBlock({ code, className }: { code: string; className?: string }) {
  const { copy, copied } = useCopyToClipboard()
  const language = className ? className.replace('language-', '') : 'text'

  return (
    <div className="relative my-3 overflow-hidden rounded-lg border border-border/80 bg-slate-950 font-mono text-xs text-slate-100">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-3 py-1.5 text-[11px] text-slate-400">
        <span className="uppercase font-semibold tracking-wider">{language}</span>
        <button
          type="button"
          onClick={() => copy(code)}
          className="flex items-center gap-1 hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Copy code block"
        >
          {copied ? <Check className="size-3 text-emerald-400" /> : <Copy className="size-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <pre className="!bg-transparent !p-0 !m-0">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  )
}
