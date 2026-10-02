import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export function useCopyToClipboard(resetAfterMs = 2000) {
  const [copied, setCopied] = useState(false)
  const timeoutRef = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timeoutRef.current), [])

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        window.clearTimeout(timeoutRef.current)
        timeoutRef.current = window.setTimeout(() => setCopied(false), resetAfterMs)
      } catch {
        toast.error('Could not copy to clipboard')
      }
    },
    [resetAfterMs],
  )

  return { copied, copy }
}
