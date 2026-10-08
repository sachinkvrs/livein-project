import { Sun, CloudSun, CloudRain, Droplets, Wind } from 'lucide-react'
import Card from './Card'
import Badge from './Badge'
import AnimatedNumber from './AnimatedNumber'

export default function WeatherWidget({
  temperature = 28,
  condition = 'Partly Cloudy',
  rainProbability = 15,
  humidity = 68,
  loading = false,
  locationName = '',
  onClick,
}) {
  const condLower = String(condition || '').toLowerCase()
  const isRainy =
    Number(rainProbability) >= 55 ||
    condLower.includes('rain') ||
    condLower.includes('storm') ||
    condLower.includes('drizzle')
  const isSunny =
    !isRainy &&
    (condLower.includes('sun') || condLower.includes('clear') || Number(rainProbability) < 20)

  const WeatherIcon = isRainy ? CloudRain : isSunny ? Sun : CloudSun

  return (
    <Card
      variant={onClick ? 'interactive' : 'default'}
      onClick={onClick}
      className="flex flex-col justify-between p-5 relative overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          Weather {locationName ? `· ${locationName}` : ''}
        </span>
        <Badge tone={isRainy ? 'warning' : 'secondary'}>
          {loading ? 'Updating…' : isRainy ? 'Rain Alert' : 'Live'}
        </Badge>
      </div>

      <div className="my-3 flex items-center justify-between gap-3">
        <div>
          <div className="flex items-baseline gap-1 text-3xl font-extrabold tracking-tight text-ink">
            <AnimatedNumber value={Number(temperature) || 28} suffix="°C" />
          </div>
          <p className="mt-0.5 text-xs font-semibold text-ink-muted capitalize">
            {condition || 'Partly Cloudy'}
          </p>
        </div>

        {/* Animated Weather Visual */}
        <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-secondary-600">
          <WeatherIcon
            className={`h-7 w-7 ${
              isSunny
                ? 'text-amber-400 animate-orb-breathe'
                : isRainy
                ? 'text-sky-400 animate-weather-drift'
                : 'text-secondary-600 animate-weather-drift'
            }`}
            aria-hidden="true"
          />
          {isRainy && (
            <div className="pointer-events-none absolute bottom-1.5 flex gap-1.5" aria-hidden="true">
              <span className="h-1.5 w-0.5 rounded-full bg-sky-400 animate-rain-drop" />
              <span
                className="h-1.5 w-0.5 rounded-full bg-sky-400 animate-rain-drop"
                style={{ animationDelay: '0.4s' }}
              />
              <span
                className="h-1.5 w-0.5 rounded-full bg-sky-400 animate-rain-drop"
                style={{ animationDelay: '0.8s' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Rain probability bar */}
      <div className="space-y-1.5 border-t border-border/70 pt-2.5 text-xs">
        <div className="flex items-center justify-between text-ink-muted">
          <span className="flex items-center gap-1">
            <Droplets className="h-3.5 w-3.5 text-sky-400" />
            Rain probability: <strong className="text-ink">{rainProbability}%</strong>
          </span>
          <span className="flex items-center gap-1 font-medium text-ink">
            <Wind className="h-3.5 w-3.5 text-secondary-600" />
            {humidity ? `${humidity}% RH` : 'Good Air'}
          </span>
        </div>
      </div>
    </Card>
  )
}
