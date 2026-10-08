import { MapPin } from 'lucide-react'

export default function MapMarker({ position, active }) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-full"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
    >
      <div className="flex flex-col items-center">
        <div
          className={[
            'flex h-8 w-8 items-center justify-center rounded-full shadow-soft ring-2 ring-white',
            active ? 'bg-secondary' : 'bg-primary',
          ].join(' ')}
        >
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <span className="mt-1 rounded-full bg-card border border-border px-2 py-0.5 text-[11px] font-semibold text-ink shadow-soft">
          {position.city}
        </span>
      </div>
    </div>
  )
}
