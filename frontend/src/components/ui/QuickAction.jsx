import { ArrowRight } from 'lucide-react'

const accentStyles = {
  teal: 'border-secondary/30 bg-surface text-secondary-600 group-hover:bg-secondary group-hover:text-white dark:group-hover:text-black',
  ai: 'border-purple-400/35 bg-purple-500/10 text-purple-600 dark:text-purple-300 group-hover:bg-purple-500 group-hover:text-white',
  amber: 'border-amber-400/35 bg-amber-500/10 text-amber-600 dark:text-amber-300 group-hover:bg-amber-500 group-hover:text-black',
  emerald: 'border-emerald-400/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 group-hover:bg-emerald-500 group-hover:text-black',
}

export default function QuickAction({
  icon: Icon,
  title,
  subtitle,
  accent = 'teal',
  onClick,
  badge,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3.5 text-left shadow-soft card-hover-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
    >
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border transition-colors duration-200 ${
              accentStyles[accent] || accentStyles.teal
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-xs sm:text-sm font-bold text-ink group-hover:text-secondary-600 transition-colors">
              {title}
            </p>
            {badge}
          </div>
          {subtitle && (
            <p className="truncate text-[11px] text-ink-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>

      <ArrowRight
        className="h-4 w-4 flex-shrink-0 text-ink-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-secondary-600"
        aria-hidden="true"
      />
    </button>
  )
}
