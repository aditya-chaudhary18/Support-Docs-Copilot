import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useConversations, useConversationMutations } from '@/hooks/use-conversations'
import { ConfirmDialog } from '@/components/layout/confirm-dialog'
import { toast } from 'sonner'

export function ConversationsPage() {
  const navigate = useNavigate()
  const { data: conversations = [], isLoading } = useConversations()
  const { remove: deleteConversation } = useConversationMutations()

  const [search, setSearch] = useState('')
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const filtered = conversations.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.preview.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (!deleteTargetId) return
    try {
      await deleteConversation(deleteTargetId)
      toast.success('Conversation session deleted')
    } catch {
      toast.error('Failed to delete conversation')
    } finally {
      setDeleteTargetId(null)
    }
  }

  return (
    <div className="flex flex-col w-full text-on-surface bg-surface bg-grid-pattern min-h-screen">
      {/* Header Banner */}
      <section className="bg-surface-container-lowest px-gutter md:px-gutter-lg py-space-md border-b border-outline-variant/20 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
          <div className="flex flex-col gap-space-xs">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-secondary"></span>
              Session Provenance History
            </span>
            <h1 className="font-headline-lg text-headline-lg font-bold text-on-surface tracking-tight">
              Conversations & Retrieval Runs
            </h1>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="flex items-center gap-1.5 px-space-md py-space-sm rounded bg-primary-container text-on-primary-container hover:bg-primary transition-all font-body-sm text-body-sm font-semibold shadow-md cursor-pointer self-start md:self-auto"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ New Conversation</span>
          </button>
        </div>
      </section>

      {/* Main Content */}
      <div className="px-gutter md:px-gutter-lg py-space-lg flex flex-col gap-space-lg">
        {/* Search & Stats Bar */}
        <div className="flex items-center justify-between gap-space-md">
          <div className="flex items-center gap-2 bg-surface-container-lowest px-space-md py-2 rounded flex-1 max-w-md border border-outline-variant/30">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past conversations..."
              className="bg-transparent font-code-inline text-code-inline text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none w-full"
            />
          </div>
          <span className="font-code-inline text-code-inline text-on-surface-variant">
            {filtered.length} {filtered.length === 1 ? 'session' : 'sessions'}
          </span>
        </div>

        {/* Conversations Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-xl bg-surface-container-low animate-pulse border border-outline-variant/10"></div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex flex-col items-center justify-center space-y-3">
            <span className="material-symbols-outlined text-[36px] text-on-surface-variant/50">
              history
            </span>
            <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
              No conversations found
            </h3>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              {search
                ? 'No past conversations match your search query.'
                : 'Start your first grounded inquiry session to query your documentation.'}
            </p>
            <Link
              to="/chat"
              className="px-space-md py-2 rounded bg-primary-container text-on-primary-container font-semibold text-sm hover:bg-primary transition-all mt-2"
            >
              Start Chatting →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
            {filtered.map((conv) => (
              <div
                key={conv.id}
                className="p-space-md rounded-xl bg-surface-container-low border border-outline-variant/20 hover:border-secondary/50 transition-all flex flex-col justify-between space-y-3 group shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant/10 text-xs">
                    <span className="font-label-sm text-label-sm text-secondary font-mono">
                      SESSION #{conv.id.slice(0, 8).toUpperCase()}
                    </span>
                    <button
                      onClick={() => setDeleteTargetId(conv.id)}
                      className="p-1 rounded text-on-surface-variant hover:text-error hover:bg-surface-container transition-colors cursor-pointer"
                      title="Delete Conversation"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                  <Link to={`/chat/${conv.id}`} className="block mt-2">
                    <h3 className="font-headline-sm text-body-lg font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                      {conv.title || 'Untitled Session'}
                    </h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1 leading-relaxed">
                      {conv.preview || 'Grounded session with pgvector retrieval...'}
                    </p>
                  </Link>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10 font-label-sm text-[11px] text-on-surface-variant">
                  <span>{new Date(conv.updatedAt || conv.createdAt).toLocaleDateString()}</span>
                  <Link
                    to={`/chat/${conv.id}`}
                    className="text-secondary hover:underline flex items-center gap-0.5"
                  >
                    <span>Resume</span>
                    <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
        title="Delete Conversation"
        description="Are you sure you want to permanently delete this chat session? All message history will be removed."
        confirmLabel="Delete Session"
        onConfirm={handleDelete}
      />
    </div>
  )
}
