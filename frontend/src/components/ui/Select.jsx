import { ChevronDown } from 'lucide-react'

export default function Select({ label, error, hint, options = [], className = '', id, ...rest }) {
  const selectId = id || rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          className={[
            'w-full appearance-none rounded-xl border bg-card px-3.5 py-2.5 pr-9 text-sm text-ink',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-secondary-400',
            error ? 'border-danger' : 'border-border',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          {...rest}
        >
          {options.map((opt) => (
            <option
              key={opt.value ?? opt}
              value={opt.value ?? opt}
              className="bg-card text-ink"
            >
              {opt.label ?? opt}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
      </div>
      {error && <p className="mt-1.5 text-xs font-medium text-danger">{error}</p>}
      {!error && hint && <p className="mt-1.5 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
