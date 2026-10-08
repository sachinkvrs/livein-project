import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Wallet,
  CloudSun,
  CalendarClock,
  Route,
  ArrowRight,
} from 'lucide-react'
import Card from './Card'
import Badge from './Badge'
import AnimatedNumber from './AnimatedNumber'

const indicatorIcons = {
  budget: Wallet,
  weather: CloudSun,
  schedule: CalendarClock,
  traffic: Route,
  routes: Route,
}

export default function TripHealth({
  score = 88,
  status = 'Healthy',
  tone = 'success',
  indicators = [],
  actionLabel = 'Inspect Schedule',
  onAction,
  compact = false,
}) {
  const numericScore = Math.max(0, Math.min(100, Number(score) || 85))
  const radius = compact ? 32 : 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (numericScore / 100) * circumference

  const strokeColor =
    numericScore >= 80
      ? '#10B981'
      : numericScore >= 60
      ? '#F59E0B'
      : '#EF4444'

  const getStatusMeta = (ind) => {
    const raw = String(ind.level || ind.status || ind.dot || '').toLowerCase()
    if (raw.includes('danger') || raw.includes('critical') || raw.includes('🔴')) {
      return {
        Icon: XCircle,
        colorClass: 'text-danger',
        bgClass: 'border-danger/25 bg-danger-bg/60',
      }
    }
    if (
      raw.includes('warn') ||
      raw.includes('tight') ||
      raw.includes('moderate') ||
      raw.includes('🟡')
    ) {
      return {
        Icon: AlertTriangle,
        colorClass: 'text-warning',
        bgClass: 'border-warning/25 bg-warning-bg/60',
      }
    }
    return {
      Icon: CheckCircle2,
      colorClass: 'text-success',
      bgClass: 'border-border/80 bg-surface',
    }
  }

  return (
    <Card
      variant={onAction ? 'interactive' : 'default'}
      onClick={onAction}
      className="flex flex-col justify-between p-5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          Trip Health
        </span>
        <Badge tone={tone}>{status}</Badge>
      </div>

      {/* Circular Gauge + Score */}
      <div className="my-3 flex items-center gap-4">
        <div className="relative flex flex-shrink-0 items-center justify-center">
          <svg
            width={compact ? 78 : 96}
            height={compact ? 78 : 96}
            className="-rotate-90 transform"
            aria-hidden="true"
          >
            <circle
              cx={compact ? 39 : 48}
              cy={compact ? 39 : 48}
              r={radius}
              fill="transparent"
              stroke="currentColor"
              strokeWidth={compact ? 7 : 8}
              className="text-surface-muted"
            />
            <circle
              cx={compact ? 39 : 48}
              cy={compact ? 39 : 48}
              r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth={compact ? 7 : 8}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <AnimatedNumber
              value={numericScore}
              className="text-xl font-extrabold leading-none text-ink"
            />
            <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-ink-muted">
              / 100
            </span>
          </div>
        </div>

        {/* 4 Health Indicators */}
        <div className="grid flex-1 grid-cols-2 gap-1.5">
          {indicators.map((ind) => {
            const { Icon: StatusIcon, colorClass, bgClass } = getStatusMeta(ind)
            const CategoryIcon = indicatorIcons[ind.key] || CheckCircle2
            return (
              <div
                key={ind.key}
                title={ind.detail || ind.label}
                className={`flex items-center justify-between gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors ${bgClass}`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <CategoryIcon className="h-3.5 w-3.5 flex-shrink-0 text-ink-muted" />
                  <span className="truncate text-[11px]">{ind.label}</span>
                </div>
                <StatusIcon className={`h-3.5 w-3.5 flex-shrink-0 ${colorClass}`} />
              </div>
            )
          })}
        </div>
      </div>

      {actionLabel && (
        <div className="mt-1 flex items-center justify-between border-t border-border/70 pt-2.5 text-xs font-semibold text-secondary-600">
          <span>{actionLabel}</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
      )}
    </Card>
  )
}
