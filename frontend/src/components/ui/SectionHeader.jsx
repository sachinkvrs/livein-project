export default function SectionHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  badge,
  action,
  className = '',
}) {
  return (
    <div className={`mb-5 flex flex-wrap items-end justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-card text-secondary-600 shadow-soft">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div>
          {eyebrow && (
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-600 mb-0.5">
              {eyebrow}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
              {title}
            </h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>

      {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
    </div>
  )
}
