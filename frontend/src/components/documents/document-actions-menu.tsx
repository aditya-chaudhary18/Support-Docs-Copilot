import { useNavigate } from 'react-router-dom'
import { Eye, MessageSquare, MoreHorizontal, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { TraceDocument } from '@/types'

interface DocumentActionsMenuProps {
  document: TraceDocument
  onDelete: (document: TraceDocument) => void
  onReprocess: (document: TraceDocument) => void
}

export function DocumentActionsMenu({ document, onDelete, onReprocess }: DocumentActionsMenuProps) {
  const navigate = useNavigate()
  const isBusy = document.status === 'processing' || document.status === 'queued'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={`Actions for ${document.name}`} />}
      >
        <MoreHorizontal />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate(`/documents/${document.id}`)}>
            <Eye />
            View details
          </DropdownMenuItem>
          <DropdownMenuItem disabled={document.status !== 'ready'} onClick={() => navigate('/chat')}>
            <MessageSquare />
            Ask about this
          </DropdownMenuItem>
          <DropdownMenuItem disabled={isBusy} onClick={() => onReprocess(document)}>
            <RefreshCw />
            Reprocess
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(document)}>
            <Trash2 />
            Delete
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
