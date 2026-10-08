import { CloudRain, Sun, Cloud, CloudSun, CloudLightning, CloudDrizzle, Loader2 } from 'lucide-react'

const iconFor = (condition = '', iconName = '') => {
  if (iconName === 'Sun') return Sun
  if (iconName === 'CloudSun') return CloudSun
  if (iconName === 'CloudRain') return CloudRain
  if (iconName === 'CloudDrizzle') return CloudDrizzle
  if (iconName === 'CloudLightning') return CloudLightning

  const cond = (condition || '').toLowerCase()
  if (cond.includes('thunder') || cond.includes('lightning')) return CloudLightning
  if (cond.includes('drizzle')) return CloudDrizzle
  if (cond.includes('rain')) return CloudRain
  if (cond.includes('sun') || cond.includes('clear')) return Sun
  if (cond.includes('cloud')) return CloudSun
  return Cloud
}

export default function WeatherCard({ weather, loading = false, error = null }) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card text-ink p-4 shadow-soft transition-colors">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Weather
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-secondary-600" />
          <span className="text-sm text-ink-muted">Loading weather…</span>
        </div>
      </div>
    )
  }

  const w = weather || {
    tempC: 28,
    condition: 'Partly Cloudy',
    location: 'Chennai',
    rain_probability: 0,
  }

  const Icon = iconFor(w.condition, w.icon)

  return (
    <div className="rounded-2xl border border-border bg-card text-ink p-4 shadow-soft transition-colors">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Weather
        </p>
        {w.location && (
          <span className="text-[11px] font-medium text-ink-muted capitalize truncate max-w-[80px]">
            {w.location}
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50">
          <Icon className="h-5 w-5 text-secondary-600" />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-ink">
            {w.tempC ?? w.temp_c ?? 28}°C
          </p>
          <div className="flex items-center gap-1.5 text-xs text-ink-muted truncate">
            <span className="truncate">{w.condition || 'Clear'}</span>
            {w.rain_probability !== undefined && w.rain_probability > 0 && (
              <span className="text-secondary-600 font-semibold">
                · 💧{w.rain_probability}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
