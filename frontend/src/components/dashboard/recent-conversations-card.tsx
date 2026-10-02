import { Link } from 'react-router-dom'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { formatDate } from '@/lib/format'
import type { Conversation } from '@/types'

interface RecentConversationsCardProps {
  conversations: Conversation[]
}

export function RecentConversationsCard({ conversations }: RecentConversationsCardProps) {
  const displayConversations = conversations.slice(0, 5)

  return (
    <div className="rounded-xl border border-border/80 bg-card p-5 shadow-2xs flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-foreground">Conversations</h3>
        <Link
          to="/conversations"
          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
        >
          View all <ArrowRight className="size-3" />
        </Link>
      </div>

      <div className="flex-1 space-y-2">
        {displayConversations.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No conversations started yet.
          </div>
        ) : (
          displayConversations.map((conv) => (
            <Link
              key={conv.id}
              to={`/chat/${conv.id}`}
              className="flex items-start justify-between rounded-lg p-2.5 hover:bg-muted/50 transition-colors border border-transparent hover:border-border/60 gap-3"
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <MessageSquare className="size-4 shrink-0 mt-0.5 text-primary/70" />
                <div className="flex flex-col min-w-0">
                  <span className="truncate text-xs font-medium text-foreground hover:text-primary transition-colors">
                    {conv.title}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {conv.preview}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end shrink-0 text-right">
                <span className="text-[10px] font-mono text-muted-foreground">
                  {formatDate(conv.updatedAt)}
                </span>
                <span className="text-[10px] text-muted-foreground/70">
                  {conv.messageCount} msgs
                </span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
