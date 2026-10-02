import { useRef, useEffect, useState, type KeyboardEvent } from 'react'
import { ArrowUp, CornerDownLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask a question about your uploaded documentation…',
}: ChatInputProps) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea height
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [content])

  const handleSend = () => {
    const trimmed = content.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="relative border-t bg-background/95 backdrop-blur px-4 py-3 sm:px-6">
      <div className="relative mx-auto max-w-4xl rounded-2xl border border-border/80 bg-card p-2 shadow-xs focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none border-0 bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-hidden max-h-44 disabled:opacity-50"
        />

        <div className="flex items-center justify-between pt-1 px-2 border-t border-border/40 mt-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="hidden sm:inline">Press</span>
            <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              Enter <CornerDownLeft className="size-2.5" />
            </kbd>
            <span className="hidden sm:inline">to send, Shift+Enter for new line</span>
          </div>

          <Button
            type="button"
            size="icon-sm"
            onClick={handleSend}
            disabled={!content.trim() || disabled}
            className="rounded-xl shadow-xs shrink-0 cursor-pointer"
            aria-label="Send question"
          >
            <ArrowUp className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
