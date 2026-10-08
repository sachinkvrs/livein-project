import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Info, X, Plus } from 'lucide-react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import { BottomNav, MobileMenu } from './MobileNav'
import { useTrip } from '../../context/TripContext'

export default function DashboardLayout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { navigationNotice, clearNavigationNotice } = useTrip()

  return (
    <div className="flex min-h-screen bg-page text-ink transition-colors">
      <Sidebar />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main
          key={location.pathname}
          className="flex-1 px-4 pb-24 pt-5 lg:px-8 lg:pb-8 animate-page-enter"
        >
          {navigationNotice && (
            <div
              role="status"
              className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-secondary-500/35 bg-secondary-500/10 px-4 py-3 text-xs font-semibold text-ink shadow-soft animate-in fade-in"
            >
              <div className="flex items-center gap-2.5">
                <Info className="h-4 w-4 flex-shrink-0 text-secondary-500" />
                <span>{navigationNotice}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    clearNavigationNotice()
                    navigate('/plan')
                  }}
                  className="inline-flex items-center gap-1 rounded-xl bg-secondary-500 px-3 py-1.5 text-xs font-extrabold text-white hover:bg-secondary-400 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Plan New Trip
                </button>
                <button
                  type="button"
                  onClick={clearNavigationNotice}
                  aria-label="Dismiss notice"
                  className="rounded-lg p-1 text-ink-muted hover:text-ink"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
