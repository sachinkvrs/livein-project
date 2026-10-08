import { AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react'

function PlanColumn({ title, day, tone }) {
  const isOriginal = tone === 'danger'
  const items = day?.items || []

  return (
    <div className="flex-1 rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-soft transition-colors">
      <div className="mb-4 flex items-center gap-2">
        {isOriginal ? (
          <AlertTriangle className="h-[18px] w-[18px] text-danger" />
        ) : (
          <CheckCircle2 className="h-[18px] w-[18px] text-success" />
        )}
        <p
          className={`text-sm font-bold uppercase tracking-wide ${
            isOriginal ? 'text-danger' : 'text-success'
          }`}
        >
          {title}
        </p>
      </div>

      <p className="mb-3 text-xs font-semibold text-ink-muted">
        Day {day?.day || 1} · {day?.city || 'Destination'}
      </p>

      {items.length === 0 ? (
        <p className="text-xs text-ink-muted">No items in this plan.</p>
      ) : (
        <ul className="space-y-2.5">
          {items.map((item, idx) => (
            <li
              key={item.id || idx}
              className={[
                'flex items-start gap-2.5 rounded-xl border p-3 text-sm transition-all',
                isOriginal && (item.weatherSensitive || item.outdoor)
                  ? 'border-red-200 dark:border-rose-900/50 bg-danger-bg/70 text-ink'
                  : !isOriginal
                  ? 'border-emerald-200 dark:border-emerald-900/50 bg-success-bg/70 text-ink'
                  : 'border-border bg-surface text-ink',
              ].join(' ')}
            >
              <span className="mt-0.5 flex-shrink-0 text-xs font-semibold text-ink-muted">
                {item.time || '10:00 AM'}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-ink">{item.title || item.name}</p>
                {item.note && (
                  <p className="mt-0.5 text-xs text-ink-muted leading-relaxed">
                    {item.note}
                  </p>
                )}
                {isOriginal && (item.weatherSensitive || item.outdoor) && (
                  <span className="mt-1 inline-block rounded bg-red-100 dark:bg-rose-950/60 px-1.5 py-0.5 text-[10px] font-bold text-red-700 dark:text-rose-300">
                    Outdoor / Weather Risk
                  </span>
                )}
                {!isOriginal && (
                  <span className="mt-1 inline-block rounded bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                    Indoor Safe Alternative
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ReplanningCard({ originalDay, updatedDay }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <PlanColumn title="Original Plan" day={originalDay} tone="danger" />
      <PlanColumn
        title="Updated Plan (Weather-Safe)"
        day={updatedDay}
        tone="success"
      />
    </div>
  )
}
