import { MapPin, Star, Clock, CloudSun, ArrowRight } from 'lucide-react'
import Badge from './Badge'

export default function DestinationCard({
  name,
  region,
  tag,
  duration,
  weather,
  rating,
  description,
  highlights = [],
  image,
  ctaLabel = 'Plan This Trip',
  onSelect,
  children,
}) {
  return (
    <div
      onClick={onSelect}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft card-hover-lift transition-all ${
        onSelect ? 'cursor-pointer' : ''
      }`}
    >
      {/* Image Cover */}
      <div className="relative h-48 w-full overflow-hidden bg-surface-muted">
        <img
          src={image}
          alt={`${name} travel destination`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        {/* Top badges */}
        <div className="absolute inset-x-3.5 top-3.5 flex items-center justify-between gap-2">
          {tag ? (
            <span className="rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
              {tag}
            </span>
          ) : (
            <span />
          )}
          {rating && (
            <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/60 px-2.5 py-1 text-[11px] font-bold text-amber-300 backdrop-blur-md">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {rating}
            </span>
          )}
        </div>

        {/* Bottom overlay title */}
        <div className="absolute inset-x-4 bottom-3.5 flex items-end justify-between gap-2">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight text-white capitalize">
              {name}
            </h3>
            {region && (
              <p className="flex items-center gap-1 text-xs font-medium text-neutral-200">
                <MapPin className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
                <span className="truncate">{region}</span>
              </p>
            )}
          </div>
          {duration && (
            <span className="flex items-center gap-1 rounded-lg bg-black/65 px-2.5 py-1 text-[11px] font-semibold text-white border border-white/15 backdrop-blur-xs">
              <Clock className="h-3 w-3 text-secondary-400" />
              {duration}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {weather && (
          <div className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-secondary-600">
            <CloudSun className="h-3.5 w-3.5" />
            <span>{weather}</span>
          </div>
        )}

        {description && (
          <p className="text-xs sm:text-sm text-ink-muted line-clamp-2 leading-relaxed">
            {description}
          </p>
        )}

        {highlights.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {highlights.map((h) => (
              <Badge key={h} tone="neutral" className="text-[11px] py-0.5">
                {h}
              </Badge>
            ))}
          </div>
        )}

        {children ? (
          <div className="mt-auto pt-4">{children}</div>
        ) : (
          onSelect && (
            <div className="mt-auto pt-4">
              <span className="inline-flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2 text-xs font-bold text-ink transition-colors group-hover:border-secondary group-hover:bg-secondary group-hover:text-white dark:group-hover:text-black">
                <span>{ctaLabel}</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
              </span>
            </div>
          )
        )}
      </div>
    </div>
  )
}
