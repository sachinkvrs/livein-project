import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  Sparkles,
  User,
  X,
  Compass,
  Radar,
  PlusCircle,
} from 'lucide-react'
import { useTrip } from '../../context/TripContext'
import { SIDEBAR_NAV_ITEMS } from './Sidebar'

const bottomItems = [
  { to: '/dashboard', label: 'Command', icon: LayoutDashboard },
  { to: '/itinerary', label: 'Itinerary', icon: Map },
  { to: '/explore', label: 'Explore', icon: Radar, requiresTrip: true },
  { to: '/assistant', label: 'AI Companion', icon: Sparkles },
  { to: '/profile', label: 'Profile', icon: User },
]

export function BottomNav() {
  const { hasTrips, isLoadingTrip } = useTrip()

  const visibleBottomItems = useMemo(() => {
    const canShowTripLinks = !isLoadingTrip && hasTrips === true
    return bottomItems.filter((item) =>
      item.requiresTrip ? canShowTripLinks : true
    )
  }, [hasTrips, isLoadingTrip])

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border glass-panel px-2 py-2 lg:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      {visibleBottomItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            [
              'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold transition-all',
              isActive
                ? 'text-secondary-600 bg-secondary/10 font-bold'
                : 'text-ink-muted hover:text-ink',
            ].join(' ')
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}

export function MobileMenu({ open, onClose }) {
  const { hasTrips, isLoadingTrip } = useTrip()

  const visibleItems = useMemo(() => {
    const canShowTripLinks = !isLoadingTrip && hasTrips === true
    return SIDEBAR_NAV_ITEMS.filter((item) =>
      item.requiresTrip ? canShowTripLinks : true
    )
  }, [hasTrips, isLoadingTrip])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/65 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute left-0 top-0 flex h-full w-72 flex-col border-r border-border bg-primary dark:bg-[#050505] p-5 shadow-2xl animate-in slide-in-from-left duration-200">
        <div className="mb-5 flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary">
              <Compass className="h-[18px] w-[18px] text-white dark:text-black" />
            </div>
            <div>
              <span className="text-lg font-extrabold text-white">TripNova</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-secondary-300">
                AI Companion
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="rounded-lg p-1.5 text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <NavLink
          to="/plan"
          onClick={onClose}
          className="mb-3 flex items-center justify-center gap-2 rounded-xl bg-secondary px-3 py-2.5 text-xs font-extrabold text-white dark:text-black shadow-soft"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Plan New Trip</span>
        </NavLink>

        <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/15 dark:bg-[#141414] text-white font-bold'
                    : 'text-primary-100/80 dark:text-neutral-400 hover:bg-white/10 hover:text-white',
                ].join(' ')
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0 text-secondary-300" aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
