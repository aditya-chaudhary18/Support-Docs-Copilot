import { ArrowRight, ShieldCheck, FileCheck, Layers, UploadCloud } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { TraceIcon } from '@/components/ui/trace-icon'
import { Button } from '@/components/ui/button'
import { useDocuments } from '@/hooks/use-documents'

interface ChatEmptyStateProps {
  onSelectPrompt: (prompt: string) => void
}

export function ChatEmptyState({ onSelectPrompt }: ChatEmptyStateProps) {
  const navigate = useNavigate()
  const { data: documents = [], isLoading } = useDocuments()

  const readyDocuments = documents.filter((doc) => doc.status === 'ready')
  const hasReadyDocs = readyDocuments.length > 0

  return (
    <div className="flex flex-1 flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 text-primary shadow-xs mb-4">
        <TraceIcon className="size-8" />
      </div>

      <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        {hasReadyDocs ? 'Ask Trace about your documentation.' : 'Upload a document to start asking questions.'}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        {hasReadyDocs
          ? `Grounded answers with verifiable citations across your ${readyDocuments.length} ready document${readyDocuments.length === 1 ? '' : 's'}.`
          : 'Trace requires at least one indexed document in your library to retrieve context and generate grounded technical answers.'}
      </p>

      {/* Feature highlights */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" /> Strict Zero-Hallucination
        </span>
        <span className="flex items-center gap-1.5">
          <FileCheck className="size-3.5 text-primary" /> Verifiable Citations
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="size-3.5 text-primary" /> pgvector Similarity Search
        </span>
      </div>

      {!isLoading && !hasReadyDocs ? (
        <div className="mt-8">
          <Button
            onClick={() => navigate('/documents')}
            className="gap-2 cursor-pointer shadow-sm"
          >
            <UploadCloud className="size-4" />
            <span>Upload document</span>
          </Button>
        </div>
      ) : hasReadyDocs ? (
        <div className="mt-8 w-full">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 text-left">
            Suggested Questions
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {readyDocuments.slice(0, 4).map((doc, idx) => {
              const prompt = idx % 2 === 0
                ? `What is ${doc.name} about?`
                : `What are the key concepts in ${doc.name}?`
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => onSelectPrompt(prompt)}
                  className="group flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card p-3.5 text-left text-xs font-medium text-foreground transition-all hover:border-primary/50 hover:bg-accent/40 focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-ring/40 cursor-pointer shadow-2xs"
                >
                  <span className="line-clamp-2">{prompt}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
