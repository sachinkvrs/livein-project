import { useState } from 'react'
import {
  Clock,
  CloudRain,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Trash2,
  MapPin,
  Plus,
  AlertTriangle,
  Timer,
  CloudSun,
  Zap,
  Star,
  Car,
  Footprints,
  Navigation,
} from 'lucide-react'
import Button from '../ui/Button'
import { getCategoryIcon } from '../../utils/destinationVisuals'

export default function Timeline({
  items = [],
  onToggleComplete,
  onRemoveItem,
  onMoveItem,
  onAddItem,
  onSelectPlace,
  selectedPlaceId,
  editable = true,
  bufferByActivityId = {},
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  return (
    <div>
      <ol className="relative border-l-2 border-secondary-500/30 dark:border-secondary-500/25 pl-7 space-y-5">
        {items.map((item, idx) => {
          const isDone = Boolean(item.completed)
          const isFirst = idx === 0
          const isLast = idx === items.length - 1
          const isSelected =
            selectedPlaceId &&
            (selectedPlaceId === item.id ||
              selectedPlaceId === item.title ||
              selectedPlaceId === item.name)
          const bufferInfo = item.id ? bufferByActivityId[item.id] : null
          const CategoryIcon = getCategoryIcon(item.category || item.title)

          const nextItem = !isLast ? items[idx + 1] : null
          const nextBuffer = nextItem?.id ? bufferByActivityId[nextItem.id] : null
          const travelMins = nextBuffer?.travel_time_min || 18
          const travelKm = nextBuffer?.distance_km || (travelMins * 0.22).toFixed(1)
          const TransportConnectorIcon = travelMins <= 12 ? Footprints : Car

          return (
            <li
              key={item.id || idx}
              className="relative group"
              onClick={() => onSelectPlace && onSelectPlace(item)}
            >
              {/* Circle Marker */}
              <span
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleComplete && onToggleComplete(item.id)
                }}
                className={`absolute -left-[37px] top-3 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full ring-4 ring-page transition-all duration-200 ${
                  isDone
                    ? 'bg-emerald-500 text-white scale-105 shadow-sm'
                    : isSelected
                    ? 'bg-secondary-500 ring-secondary-400/30 ring-8 text-white scale-110 shadow-glow'
                    : item.weatherSensitive
                    ? 'bg-amber-500 text-white'
                    : 'bg-secondary-600 text-white hover:scale-110'
                }`}
                title={isDone ? 'Mark uncompleted' : 'Mark completed'}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <span className="text-[11px] font-extrabold">{idx + 1}</span>
                )}
              </span>

              {/* Main Stop Card */}
              <div
                className={`cursor-pointer rounded-2xl border transition-all duration-200 p-4 shadow-soft ${
                  isSelected
                    ? 'border-secondary-500 bg-secondary-50/40 dark:bg-[#0D1917] ring-2 ring-secondary-400/30 shadow-card'
                    : isDone
                    ? 'border-border bg-surface-muted/60 dark:bg-[#080808] opacity-75'
                    : 'border-border bg-card hover:border-secondary-500/40 hover:-translate-y-0.5 hover:shadow-card'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink-muted">
                    <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2.5 py-1 text-ink font-bold">
                      <Clock className="h-3.5 w-3.5 text-secondary-500" />
                      {item.time || 'Flexible'}
                    </span>
                    {item.duration && item.duration !== '—' && (
                      <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface px-2 py-1">
                        <Timer className="h-3 w-3 text-ink-muted" />
                        {item.duration}
                      </span>
                    )}
                    {item.category && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-secondary-50 dark:bg-[#111111] border border-secondary-200/60 dark:border-[#242424] text-secondary-700 dark:text-secondary-400 px-2.5 py-1 capitalize">
                        <CategoryIcon className="h-3 w-3" />
                        {item.category}
                      </span>
                    )}
                    {item.weather_tag && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-600 dark:text-sky-400 px-2 py-1 font-semibold">
                        <CloudSun className="h-3 w-3" />
                        {item.weather_tag}
                      </span>
                    )}
                    {item.replanned && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-600 dark:text-purple-300 px-2 py-1 font-semibold">
                        <Zap className="h-3 w-3" />
                        Replanned{item.replaced_activity ? ` (was ${item.replaced_activity})` : ''}
                      </span>
                    )}
                    {isDone && item.actual_completed_time && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 font-semibold">
                        <CheckCircle2 className="h-3 w-3" />
                        Actual: {item.actual_completed_time}
                        {item.deviation_label ? ` (${item.deviation_label})` : ''}
                      </span>
                    )}
                    {item.weatherSensitive && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/25 px-2 py-1 text-amber-600 dark:text-amber-400 font-semibold">
                        <CloudRain className="h-3 w-3" /> Weather-sensitive
                      </span>
                    )}
                  </div>

                  {/* Editing Controls */}
                  {editable && (
                    <div
                      className="flex items-center gap-1 opacity-85 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onMoveItem && !isFirst && (
                        <button
                          type="button"
                          onClick={() => onMoveItem(idx, idx - 1)}
                          title="Move earlier"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onMoveItem && !isLast && (
                        <button
                          type="button"
                          onClick={() => onMoveItem(idx, idx + 1)}
                          title="Move later"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-surface-muted text-ink-muted hover:text-ink transition-colors"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {onRemoveItem && (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(item.id)}
                          title="Remove activity"
                          className="flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-surface hover:bg-danger-bg text-ink-muted hover:text-danger transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Delete Confirmation Alert Bar */}
                {confirmDeleteId === item.id && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-3 flex items-center justify-between rounded-xl border border-danger/20 dark:border-rose-900/40 bg-danger-bg p-3 text-xs text-danger animate-in fade-in"
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 text-danger" />
                      Remove this activity from your journey?
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs font-semibold text-ink hover:bg-surface"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setConfirmDeleteId(null)
                          onRemoveItem(item.id)
                        }}
                        className="rounded-lg bg-danger px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-600 shadow-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-secondary-500">
                      <CategoryIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h3
                        className={`text-base font-bold text-ink ${
                          isDone ? 'line-through text-ink-muted' : ''
                        }`}
                      >
                        {item.title || item.name}
                      </h3>
                      {item.area && (
                        <p className="flex items-center gap-1 text-xs text-ink-muted mt-0.5">
                          <MapPin className="h-3 w-3 text-secondary-500" />
                          {item.area}
                        </p>
                      )}
                    </div>
                  </div>
                  {item.rating > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {item.rating}
                    </span>
                  )}
                </div>

                {/* Travel Time Buffer Strip */}
                {bufferInfo && !isDone && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/80 bg-surface px-3 py-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-3 text-ink-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Car className="h-3.5 w-3.5 text-secondary-500" />
                        Transit: <strong className="text-ink">{bufferInfo.travel_time_min} mins</strong>{' '}
                        <span className="text-[10px]">(+{bufferInfo.safety_buffer_min}m buffer)</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Navigation className="h-3 w-3 text-secondary-500" />
                        Leave by:{' '}
                        <strong className="text-secondary-600 dark:text-secondary-400">
                          {bufferInfo.recommended_departure}
                        </strong>
                      </span>
                    </div>
                    <span className="rounded-md bg-secondary-50 dark:bg-[#141414] px-2 py-0.5 font-bold text-secondary-700 dark:text-secondary-400 border border-secondary-200 dark:border-[#262626]">
                      {bufferInfo.leave_status_label}
                    </span>
                  </div>
                )}

                {bufferInfo?.has_schedule_conflict && !isDone && (
                  <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                    {bufferInfo.conflict_detail}
                  </p>
                )}

                {item.note && (
                  <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
                    {item.note}
                  </p>
                )}
              </div>

              {/* Inter-Stop Visual Transit Connector */}
              {!isLast && (
                <div className="mt-3 ml-2 flex items-center gap-2 text-[11px] font-semibold text-ink-muted">
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-surface px-3 py-1 shadow-xs">
                    <TransportConnectorIcon className="h-3 w-3 text-secondary-500" />
                    <span>{travelMins} mins</span>
                    <span className="text-ink-light">·</span>
                    <span>{travelKm} km</span>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      {editable && onAddItem && (
        <div className="mt-6 pl-7">
          <Button
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={onAddItem}
            className="w-full sm:w-auto"
          >
            Add Stop to Journey
          </Button>
        </div>
      )}
    </div>
  )
}
