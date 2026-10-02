import { useState } from 'react'
import { BookOpen, ChevronDown, ChevronUp } from 'lucide-react'
import { CitationCard } from './citation-card'
import type { Citation } from '@/types'

interface CitationsSectionProps {
  citations: Citation[]
  activeCitationId?: string | null
  onCitationSelect?: (citationId: string) => void
}

export function CitationsSection({
  citations,
  activeCitationId,
  onCitationSelect,
}: CitationsSectionProps) {
  const [isOpen, setIsOpen] = useState(true)

  if (!citations || citations.length === 0) return null

  return (
    <div className="mt-4 border-t border-border/60 pt-3">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <BookOpen className="size-3.5 text-primary" />
          <span>Sources Used ({citations.length})</span>
          {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
        </button>

        <span className="text-[11px] text-muted-foreground">
          Grounded in retrieved chunks
        </span>
      </div>

      {isOpen && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2.5">
          {citations.map((citation) => (
            <CitationCard
              key={citation.id}
              citation={citation}
              isHighlighted={activeCitationId === citation.id}
              onSelect={() => onCitationSelect?.(citation.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
