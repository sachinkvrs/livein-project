const cardVariants = {
  default: 'border border-border bg-card text-ink shadow-soft',
  glass: 'border border-border/80 glass-panel text-ink shadow-card',
  interactive:
    'border border-border bg-card text-ink shadow-soft card-hover-lift cursor-pointer hover:border-secondary/50',
  ai: 'border border-ai-border bg-card text-ink shadow-soft relative overflow-hidden',
  surface: 'border border-border/80 bg-surface text-ink',
  elevated: 'border border-border bg-card text-ink shadow-card',
}

export default function Card({
  children,
  variant = 'default',
  className = '',
  padded = true,
  as: Tag = 'div',
  ...rest
}) {
  return (
    <Tag
      className={[
        'rounded-2xl transition-all duration-200',
        cardVariants[variant] || cardVariants.default,
        padded ? 'p-5' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </Tag>
  )
}

export function CardHeader({ title, subtitle, icon: Icon, badge, action, className = '' }) {
  return (
    <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-secondary-600">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </div>
        )}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-bold tracking-tight text-ink">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-xs sm:text-sm text-ink-muted">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}
