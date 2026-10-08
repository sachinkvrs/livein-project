import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import DashboardLayout from '../components/layout/DashboardLayout'
import AlertCard from '../components/alerts/AlertCard'
import EmptyState from '../components/ui/EmptyState'
import { BellOff, ShieldAlert } from 'lucide-react'
import { useTrip } from '../context/TripContext'

const tabs = [
  { key: 'all', label: 'All Alerts' },
  { key: 'critical', label: 'Critical' },
  { key: 'warning', label: 'Warnings' },
  { key: 'info', label: 'Information' },
]

export default function Alerts() {
  const [tab, setTab] = useState('all')
  const navigate = useNavigate()
  const { trip, activeAlert, weatherData } = useTrip()

  const allAlerts = useMemo(() => {
    const list = []
    if (activeAlert) {
      list.push(activeAlert)
    }

    if (weatherData && weatherData.rain_probability > 50) {
      list.push({
        id: 'weather-rain-prob',
        day: 1,
        severity: 'warning',
        type: 'weather',
        title: `Heavy rain expected in ${weatherData.location || trip?.destination || 'Destination'}`,
        message: `${weatherData.condition} with ${weatherData.rain_probability}% precipitation chance. Outdoor stops may be affected.`,
        time: weatherData.last_updated || 'Today',
        location: weatherData.location || trip?.destination || 'City Center',
        impact: 'Outdoor sightseeing',
        action: 'Swap with indoor cultural stop',
      })
    }

    if (trip?.destination) {
      list.push({
        id: 'info-routes',
        day: 1,
        severity: 'info',
        type: 'transit',
        title: `Live Route & Buffer Monitoring Active in ${trip.destination}`,
        message: 'GPS waypoints, opening hours, and optimal 2-Opt TSP activity ordering are actively synchronized.',
        time: 'Live',
        location: trip.destination,
        impact: 'All scheduled stops on track',
        action: 'Continue current itinerary',
      })
    }

    return list
  }, [activeAlert, weatherData, trip])

  const filtered = useMemo(() => {
    return tab === 'all'
      ? allAlerts
      : allAlerts.filter((a) => a.severity === tab)
  }, [allAlerts, tab])

  return (
    <DashboardLayout>
      <div className="mb-6">
        <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-secondary-500/30 bg-secondary-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-secondary-500">
          <ShieldAlert className="h-3.5 w-3.5" />
          Live Disruption Radar
        </div>
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">Safety & Weather Alerts</h1>
        <p className="text-sm text-ink-muted">
          Real-time weather, transit, and attraction updates monitored for{' '}
          <span className="capitalize font-semibold text-ink">
            {trip?.destination || 'your trip'}
          </span>
          .
        </p>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'flex-shrink-0 rounded-full border px-4 py-1.5 text-xs font-extrabold transition-all',
              tab === t.key
                ? 'border-secondary-500 bg-secondary-500 text-white shadow-glow'
                : 'border-border bg-card text-ink-muted hover:border-secondary-400 hover:text-ink',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={BellOff}
          title="All Clear — No Active Alerts"
          description="You're all caught up! No active warnings or disruptions detected for your trip."
          actionLabel="View Itinerary"
          onAction={() => navigate('/itinerary')}
        />
      ) : (
        <div className="space-y-3.5">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onClick={() =>
                alert.severity === 'critical' || alert.severity === 'warning'
                  ? navigate('/replanning')
                  : navigate('/itinerary')
              }
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  )
}
