import type { SVGProps } from 'react'
import { cn } from '@/lib/utils'

interface TraceIconProps extends SVGProps<SVGSVGElement> {
  className?: string
}

export function TraceIcon({ className, ...props }: TraceIconProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('inline-block shrink-0', className)}
      aria-hidden="true"
      {...props}
    >
      <rect width="100" height="100" rx="22" fill="#0b1118" />
      <path
        d="M 17 26.5 L 83 26.5"
        stroke="#00c788"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 50 26.5 L 50 78"
        stroke="#00c788"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M 33 61 L 50 78 L 67 61"
        stroke="#00c788"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="21" cy="73" r="7.4" fill="#00b8e6" />
      <rect x="68" y="69.5" width="11" height="7.2" rx="2" fill="#00c788" />
      <circle cx="79" cy="73" r="7.4" fill="#00c788" />
    </svg>
  )
}
