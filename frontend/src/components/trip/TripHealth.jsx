import { ShieldCheck, ShieldAlert, AlertTriangle, CloudRain, Wallet } from 'lucide-react'

export function calculateTripHealth(activeAlert, budget = 0, spent = 0, itinerary = []) {
  if (activeAlert) {
    return {
      status: 'Needs Attention',
      label: activeAlert.title || 'Weather Alert',
      level: 'danger',
      reason: 'Adverse weather detected affecting scheduled activities.',
    }
  }

  if (budget > 0 && spent > budget) {
    return {
      status: 'Budget Warning',
      label: 'Over Budget',
      level: 'danger',
      reason: `Expenses exceed total planned budget by ₹${(spent - budget).toLocaleString('en-IN')}.`,
    }
  }

  if (budget > 0 && spent / budget > 0.85) {
    return {
      status: 'Budget Warning',
      label: 'Budget Warning',
      level: 'warning',
      reason: 'Over 85% of allocated trip budget has been utilized.',
    }
  }

  const hasWeatherSensitiveItems = itinerary.some((d) =>
    (d.items || []).some((item) => item.weatherSensitive)
  )

  if (hasWeatherSensitiveItems) {
    return {
      status: 'Good',
      label: 'Good (Monitored)',
      level: 'success',
      reason: 'All activities currently on track with live weather monitoring.',
    }
  }

  return {
    status: 'Healthy',
    label: 'All Good',
    level: 'success',
    reason: 'Trip plan is optimal with no disruptions.',
  }
}

export default function TripHealth({
  healthy = true,
  healthStatus = null,
  activeAlert = null,
  budget = 0,
  spent = 0,
  itinerary = [],
}) {
  const health = healthStatus || calculateTripHealth(activeAlert, budget, spent, itinerary)

  let Icon = ShieldCheck
  let iconBg = 'bg-success-bg'
  let iconColor = 'text-success'
  let textColor = 'text-success'

  if (health.level === 'danger') {
    Icon = activeAlert ? CloudRain : ShieldAlert
    iconBg = 'bg-danger-bg'
    iconColor = 'text-danger'
    textColor = 'text-danger'
  } else if (health.level === 'warning') {
    Icon = AlertTriangle
    iconBg = 'bg-warning-bg'
    iconColor = 'text-warning'
    textColor = 'text-warning'
  }

  return (
    <div className="rounded-2xl border border-border bg-card text-ink p-4 shadow-soft transition-colors">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        Trip Health
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <p className={`text-lg font-bold truncate ${textColor}`}>
            {health.label}
          </p>
          <p className="text-[11px] text-ink-muted truncate">
            {health.status}
          </p>
        </div>
      </div>
    </div>
  )
}
