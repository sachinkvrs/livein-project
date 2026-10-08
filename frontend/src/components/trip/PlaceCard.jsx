import { MapPin, Plus, IndianRupee } from 'lucide-react'
import Badge from '../ui/Badge'

export default function PlaceCard({ place, reason, onAdd, compact = false }) {
  return (
    <div className="flex-shrink-0 rounded-xl border border-border bg-card p-3.5" style={compact ? { width: 220 } : undefined}>
      <div className="mb-3 flex h-24 items-center justify-center rounded-lg bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-primary-900/40 dark:to-secondary-950/40">
        <MapPin className="h-6 w-6 text-secondary-600" aria-hidden="true" />
      </div>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{place.name}</p>
        {onAdd && (
          <button
            onClick={() => onAdd(place)}
            aria-label={`Add ${place.name} to itinerary`}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-secondary-50 text-secondary-600 hover:bg-secondary-100"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-ink-muted">
        <Badge tone="secondary">{place.category}</Badge>
        <span>{place.distanceKm} km</span>
      </div>
      {reason && <p className="mt-2 text-xs text-ink-muted">{reason}</p>}
      {place.cost > 0 && (
        <p className="mt-2 flex items-center text-xs font-semibold text-ink">
          <IndianRupee className="h-3 w-3" />
          {place.cost}
        </p>
      )}
    </div>
  )
}
