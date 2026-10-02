import { useState } from 'react'
import { Plus, Search, MessageSquare, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ConfirmDialog } from '@/components/layout/confirm-dialog'
import { formatDate } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types'

interface ChatConversationSidebarProps {
  conversations: Conversation[]
  activeConversationId?: string
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
  className?: string
}

export function ChatConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  className,
}: ChatConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.preview.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className={cn('flex flex-col h-full border-r bg-sidebar/50 text-sidebar-foreground', className)}>
      {/* Top Header */}
      <div className="p-3 border-b space-y-2">
        <Button
          type="button"
          onClick={onNewChat}
          className="w-full justify-start gap-2 shadow-xs cursor-pointer"
        >
          <Plus className="size-4" />
          <span>New chat</span>
        </Button>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations…"
            className="pl-8 h-8 text-xs bg-background/50"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            No conversations found
          </div>
        ) : (
          filtered.map((conv) => {
            const isActive = conv.id === activeConversationId
            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={cn(
                  'group relative flex items-start justify-between rounded-lg p-2.5 text-xs transition-all cursor-pointer',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground'
                )}
              >
                <div className="flex items-start gap-2 min-w-0 pr-6">
                  <MessageSquare className="size-3.5 shrink-0 mt-0.5 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-foreground font-medium">{conv.title}</span>
                    <span className="truncate text-[11px] text-muted-foreground">{conv.preview}</span>
                    <span className="mt-1 text-[10px] text-muted-foreground/80 font-mono">
                      {formatDate(conv.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Delete hover button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteTargetId(conv.id)
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all cursor-pointer rounded"
                  title="Delete conversation"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete conversation?"
        description="This will permanently delete this conversation and all its messages. This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => {
          if (deleteTargetId) {
            onDeleteConversation(deleteTargetId)
            setDeleteTargetId(null)
          }
        }}
      />
    </div>
  )
}
