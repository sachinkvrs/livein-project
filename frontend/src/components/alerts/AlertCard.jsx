import {
  AlertTriangle,
  AlertOctagon,
  Info,
  MapPin,
  Clock,
  ArrowRight,
} from 'lucide-react'

const config = {
  critical: {
    icon: AlertOctagon,
    iconWrap: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
    badge: 'bg-rose-500/15 text-rose-500 border-rose-500/30',
    border: 'border-rose-500/35 hover:border-rose-500/60',
    label: 'Critical',
  },
  warning: {
    icon: AlertTriangle,
    iconWrap: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    badge: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
    border: 'border-amber-500/35 hover:border-amber-500/60',
    label: 'Warning',
  },
  info: {
    icon: Info,
    iconWrap: 'bg-secondary-500/15 text-secondary-500 border-secondary-500/30',
    badge: 'bg-secondary-500/15 text-secondary-500 border-secondary-500/30',
    border: 'border-secondary-500/30 hover:border-secondary-500/60',
    label: 'Information',
  },
}

export default function AlertCard({ alert, onClick }) {
  const { icon: Icon, iconWrap, badge, border, label } =
    config[alert.severity] || config.info

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick && onClick()
        }
      }}
      className={`group w-full cursor-pointer rounded-2xl border bg-card p-5 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card ${border}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div
            className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border ${iconWrap}`}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${badge}`}
              >
                {label} Alert
              </span>
              {alert.time && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
                  <Clock className="h-3 w-3" /> {alert.time}
                </span>
              )}
              {alert.location && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-ink-muted">
                  <MapPin className="h-3 w-3 text-secondary-500" /> {alert.location}
                </span>
              )}
            </div>

            <h3 className="mt-1.5 text-base font-extrabold text-ink">
              {alert.title}
            </h3>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              {alert.message}
            </p>

            {(alert.impact || alert.action) && (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
                {alert.impact && (
                  <span className="rounded-lg border border-border bg-surface px-2.5 py-1 text-ink-muted">
                    Impact: <strong className="text-ink">{alert.impact}</strong>
                  </span>
                )}
                {alert.action && (
                  <span className="rounded-lg border border-secondary-500/25 bg-secondary-500/10 px-2.5 py-1 font-semibold text-secondary-500">
                    Recommended: {alert.action}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClick && onClick()
          }}
          className="inline-flex items-center gap-1.5 rounded-xl border border-secondary-500/30 bg-secondary-500/10 px-3.5 py-2 text-xs font-extrabold text-secondary-500 transition-all group-hover:bg-secondary-500 group-hover:text-white"
        >
          <span>Review Plan</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
