import { Link } from 'react-router-dom'
import { Upload, MessageSquarePlus, FileSearch } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function QuickActions({ onUploadClick }: { onUploadClick?: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <Button
        type="button"
        onClick={onUploadClick}
        className="gap-2 shadow-xs cursor-pointer font-medium"
      >
        <Upload className="size-4" />
        Upload Documentation
      </Button>

      <Link
        to="/chat"
        className={cn(buttonVariants({ variant: 'outline' }), 'gap-2 shadow-xs cursor-pointer')}
      >
        <MessageSquarePlus className="size-4" />
        Start New Chat
      </Link>

      <Link
        to="/documents"
        className={cn(buttonVariants({ variant: 'ghost' }), 'gap-2 text-muted-foreground hover:text-foreground cursor-pointer')}
      >
        <FileSearch className="size-4" />
        Browse Knowledge Library
      </Link>
    </div>
  )
}
