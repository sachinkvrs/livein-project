import { Compass } from 'lucide-react'

export function Spinner({ className = '' }) {
  return (
    <div className={`h-5 w-5 animate-spin rounded-full border-2 border-primary-100 border-t-secondary ${className}`} aria-hidden="true" />
  )
}

export default function Loading({ title = 'Loading…', subtitle }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
        <Compass className="h-6 w-6 animate-spin text-secondary" style={{ animationDuration: '2.2s' }} />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {subtitle && <p className="max-w-xs text-sm text-ink-muted">{subtitle}</p>}
    </div>
  )
}
