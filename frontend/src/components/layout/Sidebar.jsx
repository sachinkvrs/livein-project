import { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Map,
  BookMarked,
  BellRing,
  Sparkles,
  Wallet,
  Settings as SettingsIcon,
  LogOut,
  Compass,
  Navigation,
  ShieldCheck,
  Radar,
  PlusCircle,
} from 'lucide-react'
import { useTrip } from '../../context/TripContext'

export const SIDEBAR_NAV_ITEMS = [
  { to: '/dashboard', label: 'Command Center', icon: LayoutDashboard },
  { to: '/decisions', label: 'Decision Center', icon: ShieldCheck },
  { to: '/live', label: 'Live Trip', icon: Navigation },
  { to: '/itinerary', label: 'Itinerary', icon: Map },
  { to: '/map', label: 'Map & Route', icon: Compass, requiresTrip: true },
  { to: '/explore', label: 'Explore Nearby', icon: Radar, requiresTrip: true },
  { to: '/assistant', label: 'AI Assistant', icon: Sparkles, badge: 'AI' },
  { to: '/expenses', label: 'Expenses', icon: Wallet },
  { to: '/my-trips', label: 'My Trips', icon: BookMarked },
  { to: '/alerts', label: 'Safety Alerts', icon: BellRing },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
]

export default function Sidebar() {
  const { hasTrips, isLoadingTrip } = useTrip()

  // Filter out trip-exclusive links when loading or when user has 0 trips
  const visibleNavItems = useMemo(() => {
    const canShowTripLinks = !isLoadingTrip && hasTrips === true
    return SIDEBAR_NAV_ITEMS.filter((item) =>
      item.requiresTrip ? canShowTripLinks : true
    )
  }, [hasTrips, isLoadingTrip])

  return (
    <aside className="sticky top-0 hidden h-screen w-64 flex-shrink-0 flex-col border-r border-border bg-primary dark:bg-[#050505] lg:flex transition-colors">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 dark:border-[#1E1E1E]">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary shadow-glow transition-transform duration-200 group-hover:scale-105">
            <Compass className="h-5 w-5 text-white dark:text-black" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-white">TripNova</span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-secondary-300">
              AI Companion
            </span>
          </div>
        </NavLink>
      </div>

      {/* Plan New Trip CTA */}
      <div className="px-3.5 pt-4 pb-2">
        <NavLink
          to="/plan"
          className="flex items-center justify-center gap-2 rounded-xl bg-secondary px-3.5 py-2.5 text-xs font-extrabold text-white dark:text-black shadow-soft hover:bg-secondary-400 transition-all active:scale-[0.98]"
        >
          <PlusCircle className="h-4 w-4" aria-hidden="true" />
          <span>Plan New Trip</span>
        </NavLink>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2 overflow-y-auto no-scrollbar" aria-label="Main Navigation">
        {visibleNavItems.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              [
                'group relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/15 dark:bg-[#141414] text-white font-bold shadow-xs ring-1 ring-white/15 dark:ring-secondary/40'
                  : 'text-primary-100/75 dark:text-neutral-400 hover:bg-white/10 dark:hover:bg-[#0D0D0D] hover:text-white',
              ].join(' ')
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-[18px] w-[18px] transition-colors ${
                      isActive
                        ? 'text-secondary-300'
                        : 'text-primary-100/70 dark:text-neutral-400 group-hover:text-secondary-300'
                    }`}
                    aria-hidden="true"
                  />
                  <span>{label}</span>
                </div>
                {badge && (
                  <span className="rounded-full bg-purple-500/25 border border-purple-400/40 px-2 py-0.5 text-[10px] font-extrabold text-purple-200">
                    {badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 pb-5 pt-2 border-t border-white/10 dark:border-[#1E1E1E]">
        <NavLink
          to="/"
          className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-primary-100/75 dark:text-neutral-400 hover:bg-white/10 dark:hover:bg-[#0D0D0D] hover:text-white transition-colors"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          <span>Landing Home</span>
        </NavLink>
      </div>
    </aside>
  )
}
