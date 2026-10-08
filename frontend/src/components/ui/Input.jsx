export default function Input({ label, error, hint, icon: Icon, className = '', id, ...rest }) {
  const inputId = id || rest.name

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" aria-hidden="true" />
        )}
        <input
          id={inputId}
          className={[
            'w-full rounded-xl border bg-card px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-muted',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-secondary-400 focus:border-secondary-400',
            error ? 'border-danger' : 'border-border',
            Icon ? 'pl-9' : '',
            className,
          ].join(' ')}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          {...rest}
        />
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-ink-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
