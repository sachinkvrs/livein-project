import Card from './Card'
import Badge from './Badge'
import AnimatedNumber from './AnimatedNumber'

export default function MetricCard({
  label,
  value,
  numericValue,
  prefix = '',
  suffix = '',
  subtitle,
  icon: Icon,
  badgeText,
  badgeTone = 'neutral',
  progressPercent,
  progressTone = 'secondary',
  footer,
  onClick,
  className = '',
}) {
  const barColor =
    progressTone === 'danger'
      ? 'bg-danger'
      : progressTone === 'warning'
      ? 'bg-warning'
      : progressTone === 'success'
      ? 'bg-success'
      : 'bg-secondary'

  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      onClick={onClick}
      className={`flex flex-col justify-between p-5 ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
            {label}
          </span>
          {badgeText ? (
            <Badge tone={badgeTone}>{badgeText}</Badge>
          ) : Icon ? (
            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-secondary-600">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          ) : null}
        </div>

        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div className="text-2xl font-extrabold tracking-tight text-ink">
            {numericValue !== undefined ? (
              <AnimatedNumber
                value={numericValue}
                prefix={prefix}
                suffix={suffix}
              />
            ) : (
              value
            )}
          </div>
          {badgeText && Icon && (
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-secondary-600">
              <Icon className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>

        {subtitle && (
          <p className="mt-1 text-xs font-medium text-ink-muted">{subtitle}</p>
        )}

        {typeof progressPercent === 'number' && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className={`h-full transition-all duration-700 ease-out ${barColor}`}
              style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
            />
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-3.5 border-t border-border/70 pt-2.5 text-xs text-ink-muted">
          {footer}
        </div>
      )}
    </Card>
  )
}
