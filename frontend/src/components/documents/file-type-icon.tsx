import { FileCode2, FileText, FileType2, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DocumentFileType } from '@/types'

const ICONS: Record<DocumentFileType, LucideIcon> = {
  pdf: FileText,
  docx: FileType2,
  txt: FileText,
  md: FileCode2,
}

interface FileTypeIconProps {
  fileType: DocumentFileType
  size?: 'sm' | 'md'
  className?: string
}

export function FileTypeIcon({ fileType, size = 'md', className }: FileTypeIconProps) {
  const Icon = ICONS[fileType]
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground',
        size === 'sm' ? 'size-7' : 'size-9',
        className,
      )}
      aria-hidden="true"
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} />
    </span>
  )
}
