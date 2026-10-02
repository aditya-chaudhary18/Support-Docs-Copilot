import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ACCEPT_ATTRIBUTE } from '@/lib/files'
import { cn } from '@/lib/utils'

interface UploadDropzoneProps {
  onFiles: (files: FileList) => void
  disabled?: boolean
  compact?: boolean
}

const FORMATS = ['PDF', 'DOCX', 'TXT', 'Markdown']

export function UploadDropzone({ onFiles, disabled = false, compact = false }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const descriptionId = useId()

  const openPicker = () => {
    if (!disabled) inputRef.current?.click()
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragging(false)
    if (!disabled && event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openPicker()
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-describedby={descriptionId}
      aria-label="Upload documents"
      onClick={openPicker}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault()
        if (!disabled) setIsDragging(true)
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      data-dragging={isDragging}
      className={cn(
        'group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-muted/20 px-6 text-center outline-none transition-colors',
        'hover:border-primary/50 hover:bg-primary/5 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/50',
        'data-[dragging=true]:border-primary data-[dragging=true]:bg-primary/10',
        compact ? 'py-8' : 'py-14',
        disabled && 'pointer-events-none opacity-50',
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full border bg-background text-muted-foreground transition-colors group-hover:text-primary group-data-[dragging=true]:text-primary">
        <UploadCloud className="size-5" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          {isDragging ? 'Drop files to upload' : 'Drag and drop files here, or browse'}
        </p>
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {FORMATS.join(', ')} · up to 25 MB each
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        tabIndex={-1}
        disabled={disabled}
        onClick={(event) => {
          event.stopPropagation()
          openPicker()
        }}
      >
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          if (event.target.files && event.target.files.length > 0) onFiles(event.target.files)
          event.target.value = ''
        }}
      />
    </div>
  )
}
