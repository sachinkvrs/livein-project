import { Compass } from 'lucide-react'

export default function EmptyState({ icon: Icon = Compass, title, description, action, className = '' }) {
  return (
    <div
      className={`relative overflow-hidden flex flex-col items-center justify-center gap-3.5 rounded-3xl border border-border bg-card px-6 py-16 text-center shadow-soft transition-colors ${className}`}
    >
      {/* Subtle decorative route arc */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20 dark:opacity-15"
        viewBox="0 0 600 240"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M-40 200 C 140 60, 420 240, 640 50"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="6 6"
          className="text-secondary"
        />
      </svg>

      <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-secondary/30 bg-surface shadow-glow">
        <Icon className="h-7 w-7 text-secondary-600" aria-hidden="true" />
      </div>

      <div className="relative max-w-md space-y-1.5">
        <h3 className="text-lg font-bold tracking-tight text-ink">{title}</h3>
        {description && (
          <p className="text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>

      {action && <div className="relative mt-2">{action}</div>}
    </div>
  )
}
