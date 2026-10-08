import { ChevronRight, CloudRain, MapPin, Clock } from 'lucide-react'

export default function ItineraryCard({
  day,
  isActive = false,
  onClick,
  onSelectPlace,
  selectedPlaceId,
}) {
  const items = Array.isArray(day.items) ? day.items : []
  const hasWeatherRisk = items.some((i) => i.weatherSensitive)

  return (
    <div
      className={`group w-full rounded-2xl border text-ink transition-all ${
        isActive
          ? 'border-secondary bg-secondary-50/40 shadow-soft ring-1 ring-secondary-400/30'
          : 'border-border bg-card hover:border-secondary-300'
      } p-4 text-left`}
    >
      <div
        onClick={onClick}
        className="flex cursor-pointer items-center justify-between"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-secondary-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-secondary-600">
              Day {day.day}
            </span>
            {day.distance_km > 0 && (
              <span className="text-[11px] font-medium text-ink-muted">
                {day.distance_km} km total
              </span>
            )}
          </div>
          <p className="mt-1 font-semibold text-ink capitalize">
            {day.city || 'Destination'}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-ink-muted">
            {items.length} stop{items.length === 1 ? '' : 's'}
          </span>
          <ChevronRight
            className={`h-4 w-4 text-ink-muted transition-transform ${
              isActive ? 'rotate-90 text-secondary-600' : 'group-hover:translate-x-0.5'
            }`}
          />
        </div>
      </div>

      {/* Activity list */}
      <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-2.5 text-sm">
        {items.map((item, idx) => {
          const isPlaceActive =
            selectedPlaceId &&
            (selectedPlaceId === item.id || selectedPlaceId === item.title)

          return (
            <li
              key={item.id || idx}
              onClick={(e) => {
                e.stopPropagation()
                if (onSelectPlace) {
                  onSelectPlace(item, day.day)
                } else if (onClick) {
                  onClick()
                }
              }}
              className={`flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 transition-colors ${
                isPlaceActive
                  ? 'bg-secondary-50 font-semibold text-ink ring-1 ring-secondary-400'
                  : 'hover:bg-surface text-ink-muted hover:text-ink'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-surface-muted text-[10px] font-bold text-ink-muted">
                  {idx + 1}
                </span>
                <span className="truncate text-xs">{item.title || item.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-[11px]">
                {item.time && (
                  <span className="text-ink-muted flex items-center gap-0.5">
                    <Clock className="h-3 w-3" /> {item.time}
                  </span>
                )}
                {item.rating > 0 && (
                  <span className="text-amber-500 font-bold">★ {item.rating}</span>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {hasWeatherRisk && (
        <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-warning-bg/60 px-2.5 py-1 text-xs font-medium text-warning">
          <CloudRain className="h-3.5 w-3.5 flex-shrink-0" />
          <span>Includes weather-sensitive outdoor activities</span>
        </div>
      )}
    </div>
  )
}
