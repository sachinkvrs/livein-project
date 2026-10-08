import { useState, useRef, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search,
  Bell,
  ChevronDown,
  Menu,
  User,
  Settings,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react'
import { mockAlerts } from '../../data/mockAlerts'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'

export default function Navbar({ onMenuClick }) {
  const [notifOpen, setNotifOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const navigate = useNavigate()
  const { user, initials, logout, isAuthenticated } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const unread = mockAlerts.slice(0, 3)

  const profileRef = useRef(null)
  const notifRef = useRef(null)

  // Close dropdowns on click outside or Escape key
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setProfileOpen(false)
        setNotifOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  const handleLogout = async () => {
    setProfileOpen(false)
    await logout()
    navigate('/login')
  }

  const displayName = user?.name || 'Guest User'
  const displayEmail = user?.email || ''
  const displayInitials = initials || 'U'

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur lg:px-8 transition-colors">
      <button
        onClick={onMenuClick}
        className="rounded-lg p-2 text-ink hover:bg-surface lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="relative hidden flex-1 max-w-md md:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          placeholder="Search places, days, bookings…"
          className="w-full rounded-xl border border-border bg-surface py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-colors"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Quick Header Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="rounded-xl p-2 text-ink hover:bg-surface transition-colors focus:ring-2 focus:ring-secondary-400"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
          ) : (
            <Moon className="h-5 w-5 text-ink-muted hover:text-ink transition-transform duration-200 hover:-rotate-12" />
          )}
        </button>

        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v)
              setProfileOpen(false)
            }}
            aria-label="Notifications"
            className="relative rounded-lg p-2 text-ink hover:bg-surface transition-colors"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-danger" />
          </button>
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-border bg-card p-2 shadow-card z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Notifications
              </p>
              {unread.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    setNotifOpen(false)
                    navigate('/alerts')
                  }}
                  className="block w-full rounded-xl px-2.5 py-2 text-left text-sm hover:bg-surface transition-colors"
                >
                  <p className="font-medium text-ink">{a.title}</p>
                  <p className="text-xs text-ink-muted line-clamp-1">{a.message}</p>
                </button>
              ))}
              <button
                onClick={() => {
                  setNotifOpen(false)
                  navigate('/alerts')
                }}
                className="mt-1 block w-full rounded-xl px-2 py-2 text-center text-xs font-semibold text-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-900/30 transition-colors"
              >
                View all alerts
              </button>
            </div>
          )}
        </div>

        {/* Profile Area & Interactive Dropdown */}
        <div className="relative" ref={profileRef}>
          {isAuthenticated ? (
            <button
              onClick={() => {
                setProfileOpen((v) => !v)
                setNotifOpen(false)
              }}
              aria-expanded={profileOpen}
              aria-haspopup="true"
              className="flex items-center gap-2 rounded-xl border border-border px-2 py-1.5 hover:bg-surface transition-all focus:ring-2 focus:ring-secondary-400"
            >
              {user?.profile_image ? (
                <img
                  src={user.profile_image}
                  alt={displayName}
                  className="h-7 w-7 rounded-full object-cover border border-secondary"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-xs font-bold text-white shadow-sm">
                  {displayInitials}
                </div>
              )}
              <span className="hidden text-sm font-medium text-ink sm:block max-w-[130px] truncate text-left">
                {displayName}
              </span>
              <ChevronDown
                className={`hidden h-4 w-4 text-ink-muted sm:block transition-transform duration-200 ${
                  profileOpen ? 'rotate-180 text-secondary-600' : ''
                }`}
              />
            </button>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-1.5 rounded-xl bg-secondary px-3 py-1.5 text-xs font-semibold text-white hover:bg-secondary-600 transition-colors"
            >
              <User className="h-4 w-4" />
              <span>Log In</span>
            </Link>
          )}

          {/* Profile Dropdown Menu */}
          {profileOpen && isAuthenticated && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-border bg-card p-2 shadow-card z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User summary row */}
              <div className="flex items-center gap-3 border-b border-border/80 p-2.5 pb-3">
                {user?.profile_image ? (
                  <img
                    src={user.profile_image}
                    alt={displayName}
                    className="h-10 w-10 rounded-full object-cover border border-secondary"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-sm font-bold text-white shadow-soft">
                    {displayInitials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-ink truncate text-sm">
                    {displayName}
                  </p>
                  <p className="text-xs text-ink-muted truncate">
                    {displayEmail}
                  </p>
                </div>
              </div>

              {/* Menu Items */}
              <div className="mt-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate('/profile')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-surface transition-colors"
                >
                  <User className="h-4 w-4 text-ink-muted" />
                  <span>Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false)
                    navigate('/settings')
                  }}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-surface transition-colors"
                >
                  <Settings className="h-4 w-4 text-ink-muted" />
                  <span>Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    toggleTheme()
                  }}
                  className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-ink hover:bg-surface transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-ink-muted" />}
                    <span>Theme</span>
                  </span>
                  <span className="text-xs font-semibold text-secondary-600 capitalize">
                    {isDark ? 'Dark' : 'Light'}
                  </span>
                </button>

                <div className="my-1 border-t border-border/60" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-danger hover:bg-danger-bg transition-colors"
                >
                  <LogOut className="h-4 w-4 text-danger" />
                  <span>Log Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
