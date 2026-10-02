import { Link } from 'react-router-dom'
import { MessageSquare, ArrowRight, Trash2, Calendar, Hash } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import type { Conversation } from '@/types'

interface ConversationCardProps {
  conversation: Conversation
  onDelete: (id: string) => void
}

export function ConversationCard({ conversation, onDelete }: ConversationCardProps) {
  return (
    <div className="group flex flex-col justify-between rounded-xl border border-border/80 bg-card p-5 shadow-2xs hover:border-primary/40 hover:shadow-xs transition-all">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <MessageSquare className="size-4" />
            </div>
            <h3 className="font-semibold text-sm text-foreground truncate" title={conversation.title}>
              {conversation.title}
            </h3>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onDelete(conversation.id)}
            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            title="Delete conversation"
            aria-label="Delete conversation"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>

        <p className="mt-2.5 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
          {conversation.preview}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 text-[11px] font-mono">
            <Calendar className="size-3" />
            {formatDate(conversation.updatedAt)}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-mono">
            <Hash className="size-3" />
            {conversation.messageCount} messages
          </span>
        </div>

        <Link
          to={`/chat/${conversation.id}`}
          className="inline-flex items-center gap-1 font-medium text-primary hover:underline text-xs"
        >
          Open <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
