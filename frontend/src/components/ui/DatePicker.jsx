import { Calendar } from 'lucide-react'

export default function DatePicker({ label, error, hint, id, className = '', ...rest }) {
  const inputId = id || rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        <input
          id={inputId}
          type="date"
          className={[
            'w-full rounded-xl border bg-card py-2.5 pl-9 pr-3.5 text-sm text-ink',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-secondary-400',
            error ? 'border-danger' : 'border-border',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          {...rest}
        />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
