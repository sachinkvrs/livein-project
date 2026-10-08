import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Navigation,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  ArrowDown,
  CloudSun,
  Wallet,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Play,
  Square,
  Compass,
  Route,
  LocateFixed,
} from 'lucide-react'

import DashboardLayout from '../components/layout/DashboardLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import TripMap from '../components/map/TripMap'
import { useTrip } from '../context/TripContext'

function haversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.4
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}

export default function LiveTrip() {
  const navigate = useNavigate()
  const {
    trip,
    itinerary,
    hasGeneratedTrip,
    activeDay,
    setActiveDay,
    weatherData,
    predictiveBudget,
    liveTripActive,
    setLiveTripActive,
    userLocation,
    locationStatus,
    locationError,
    requestUserLocation,
    toggleActivityComplete,
    simulateWeatherAlert,
    travelBuffers,
    bufferMode,
    setBufferMode,
  } = useTrip()

  const [completingId, setCompletingId] = useState(null)
  const [simulatingAlert, setSimulatingAlert] = useState(false)

  const currentDayObj = useMemo(() => {
    if (!itinerary || itinerary.length === 0) return null
    return itinerary.find((d) => d.day === activeDay) || itinerary[0]
  }, [itinerary, activeDay])

  const dayItems = currentDayObj?.items || []
  const completedActivities = dayItems.filter((i) => i.completed)
  const upcomingActivities = dayItems.filter((i) => !i.completed)

  const currentActivity = upcomingActivities[0] || null
  const nextDestination = upcomingActivities[1] || upcomingActivities[0] || null

  const dayProgressPct =
    dayItems.length > 0
      ? Math.round((completedActivities.length / dayItems.length) * 100)
      : 0

  // Determine effective current coordinates (Live GPS or last completed / first stop)
  const effectiveLocation = useMemo(() => {
    if (userLocation?.lat && userLocation?.lon) {
      return {
        lat: userLocation.lat,
        lon: userLocation.lon,
        label: userLocation.isFallback
          ? userLocation.label || `${trip?.destination || 'City'} (Estimated Position)`
          : 'Your Live GPS Location',
        isLive: !userLocation.isFallback,
      }
    }
    const anchorItem =
      completedActivities[completedActivities.length - 1] ||
      currentActivity ||
      dayItems[0]
    return {
      lat: anchorItem?.latitude || 13.0827,
      lon: anchorItem?.longitude || 80.2707,
      label: anchorItem
        ? `Near ${anchorItem.title || anchorItem.name}`
        : `${trip?.destination || 'Chennai'} Center`,
      isLive: false,
    }
  }, [userLocation, completedActivities, currentActivity, dayItems, trip?.destination])

  // Distance & ETA to next destination
  const nextLegMetrics = useMemo(() => {
    if (!currentActivity) {
      return { distanceKm: 0, travelMin: 0 }
    }
    const dist = haversineKm(
      effectiveLocation.lat,
      effectiveLocation.lon,
      currentActivity.latitude,
      currentActivity.longitude
    )
    const roadKm = Math.max(0.5, Math.round(dist * 1.3 * 10) / 10)
    const travelMin = Math.max(5, Math.round((roadKm / 28) * 60))
    return { distanceKm: roadKm, travelMin }
  }, [effectiveLocation, currentActivity])

  const handleToggleComplete = async (activityId) => {
    setCompletingId(activityId)
    try {
      await toggleActivityComplete(currentDayObj?.day || activeDay, activityId)
    } finally {
      setCompletingId(null)
    }
  }

  const handleTriggerSmartReplan = async () => {
    setSimulatingAlert(true)
    try {
      await simulateWeatherAlert(
        currentDayObj?.day || activeDay,
        `Rain expected at 3:00 PM near ${currentActivity?.title || trip?.destination || 'your location'}`
      )
      navigate('/replanning')
    } finally {
      setSimulatingAlert(false)
    }
  }

  if (!hasGeneratedTrip || itinerary.length === 0) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-50 dark:bg-secondary-950/40">
            <Navigation className="h-8 w-8 text-secondary-600" />
          </div>
          <h1 className="text-xl font-bold text-ink">Live Trip Mode</h1>
          <p className="mt-2 max-w-md mx-auto text-sm text-ink-muted">
            Create or select an active trip first to launch real-time step-by-step navigation, live activity tracking, and instant ETA updates.
          </p>
          <Button className="mt-6" onClick={() => navigate('/plan')}>
            Plan a Trip
          </Button>
        </Card>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-soft ${
              liveTripActive
                ? 'bg-emerald-500 text-white animate-pulse'
                : 'bg-primary text-secondary'
            }`}
          >
            <Navigation className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-ink">TripNova Live</h1>
              <Badge tone={liveTripActive ? 'success' : 'secondary'}>
                {liveTripActive ? '● LIVE COMPANION ACTIVE' : 'READY TO START'}
              </Badge>
            </div>
            <p className="text-sm text-ink-muted">
              What should I do right now? ·{' '}
              <span className="font-semibold text-ink capitalize">
                {trip?.destination}
              </span>{' '}
              (Day {currentDayObj?.day || activeDay})
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {!liveTripActive ? (
            <Button
              size="sm"
              icon={Play}
              onClick={() => setLiveTripActive(true)}
            >
              Start Live Trip
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              icon={Square}
              onClick={() => setLiveTripActive(false)}
            >
              Pause Live Mode
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            icon={LocateFixed}
            onClick={requestUserLocation}
          >
            {locationStatus === 'locating' ? 'Locating…' : 'Update GPS'}
          </Button>
        </div>
      </div>

      {/* Geolocation Notice Banner if permission denied or fallback */}
      {locationError && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-300/60 dark:border-amber-800 bg-warning-bg p-3.5 text-xs text-ink">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-warning" />
            <span>
              <strong>Estimated Position Mode:</strong> {locationError}
            </span>
          </div>
          <button
            type="button"
            onClick={requestUserLocation}
            className="font-bold text-secondary-600 hover:underline flex-shrink-0"
          >
            Retry GPS
          </button>
        </div>
      )}

      {/* Day Switcher */}
      <div className="mb-5 flex gap-2 overflow-x-auto no-scrollbar">
        {itinerary.map((d) => (
          <button
            key={d.day}
            type="button"
            onClick={() => setActiveDay(d.day)}
            className={`flex-shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition-all ${
              d.day === (currentDayObj?.day || activeDay)
                ? 'border-secondary bg-secondary-50 dark:bg-secondary-950/40 text-secondary-600 dark:text-secondary-300 shadow-xs'
                : 'border-border bg-card text-ink-muted hover:text-ink'
            }`}
          >
            Day {d.day} · {(d.items || []).filter((i) => i.completed).length}/
            {(d.items || []).length} Done
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left & Center Column: Live Current -> Next Flow + Progress Checklist */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Navigation Flow Card */}
          <Card className="p-6 shadow-soft border-l-4 border-l-secondary">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary-600">
                Real-Time Navigation & Next Stop
              </span>
              <Badge tone={effectiveLocation.isLive ? 'success' : 'neutral'}>
                {effectiveLocation.isLive ? 'Live GPS Signal' : 'Estimated Trip Coordinates'}
              </Badge>
            </div>

            {currentActivity ? (
              <div className="space-y-4">
                {/* Current Location Box */}
                <div className="flex items-center gap-3.5 rounded-xl border border-border bg-surface p-3.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                    <LocateFixed className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                      Current Location
                    </p>
                    <p className="text-sm font-bold text-ink truncate">
                      {effectiveLocation.label}
                    </p>
                  </div>
                  <span className="text-xs text-ink-muted font-mono">
                    {effectiveLocation.lat.toFixed(3)}, {effectiveLocation.lon.toFixed(3)}
                  </span>
                </div>

                {/* Transit Arrow with Distance & ETA */}
                <div className="flex items-center gap-3 pl-5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary-50 dark:bg-secondary-950/50 text-secondary-600">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-ink">
                    <span className="rounded-lg bg-secondary-50 dark:bg-secondary-950/40 px-2.5 py-1 text-secondary-700 dark:text-secondary-300">
                      🚗 {nextLegMetrics.travelMin} min away
                    </span>
                    <span className="text-ink-muted">
                      ({nextLegMetrics.distanceKm} km estimated transit)
                    </span>
                  </div>
                </div>

                {/* Next Destination Highlight Box */}
                <div className="rounded-2xl border-2 border-secondary bg-card p-5 shadow-soft">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                        → Current / Next Destination
                      </span>
                      <h2 className="mt-2 text-xl font-extrabold text-ink">
                        {currentActivity.title || currentActivity.name}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted">
                        <MapPin className="h-3.5 w-3.5 text-secondary-600" />
                        {currentActivity.area || trip?.destination} · Scheduled{' '}
                        <strong className="text-ink">{currentActivity.time}</strong> (
                        {currentActivity.duration || '1.5h'})
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {currentActivity.estimated_cost > 0 && (
                        <span className="text-xs font-bold text-ink bg-surface px-2.5 py-1 rounded-lg border border-border">
                          Est. ₹{Number(currentActivity.estimated_cost).toLocaleString('en-IN')}
                        </span>
                      )}
                      <Button
                        size="sm"
                        icon={CheckCircle2}
                        loading={completingId === currentActivity.id}
                        onClick={() => handleToggleComplete(currentActivity.id)}
                      >
                        Mark Arrived & Complete
                      </Button>
                    </div>
                  </div>

                  {/* Travel Time Buffer Breakdown (#5) */}
                  {travelBuffers?.next_up && (
                    <div className="mt-4 rounded-xl border border-border bg-surface p-3.5 text-xs space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-secondary-600 dark:text-secondary-400">
                          Travel Time Buffer ({travelBuffers.buffer_mode_label})
                        </span>
                        <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 text-[10px]">
                          {['relaxed', 'normal', 'safe'].map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setBufferMode(m)}
                              className={`rounded px-2 py-0.5 font-bold capitalize transition-colors ${
                                bufferMode === m
                                  ? 'bg-secondary text-white'
                                  : 'text-ink-muted hover:text-ink'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="rounded-lg bg-card p-2 border border-border/70">
                          <span className="block text-[10px] text-ink-muted">Activity time</span>
                          <strong className="font-extrabold text-ink">
                            {travelBuffers.next_up.activity_time}
                          </strong>
                        </div>
                        <div className="rounded-lg bg-card p-2 border border-border/70">
                          <span className="block text-[10px] text-ink-muted">Travel time</span>
                          <strong className="font-extrabold text-ink">
                            {travelBuffers.next_up.travel_time_min} mins
                          </strong>
                        </div>
                        <div className="rounded-lg bg-card p-2 border border-border/70">
                          <span className="block text-[10px] text-ink-muted">Recommended departure</span>
                          <strong className="font-extrabold text-secondary-600 dark:text-secondary-400">
                            {travelBuffers.next_up.recommended_departure}
                          </strong>
                        </div>
                        <div className="rounded-lg bg-card p-2 border border-border/70">
                          <span className="block text-[10px] text-ink-muted">Departure Alert</span>
                          <strong className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            {travelBuffers.next_up.leave_status_label}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}

                  {currentActivity.note && (
                    <p className="mt-3 border-t border-border/70 pt-2.5 text-xs text-ink-muted leading-relaxed">
                      {currentActivity.note}
                    </p>
                  )}
                </div>

                {/* Up After That */}
                {nextDestination && nextDestination.id !== currentActivity.id && (
                  <div className="flex items-center justify-between rounded-xl border border-border/80 bg-surface px-4 py-2.5 text-xs">
                    <span className="text-ink-muted">
                      Up next after this:{' '}
                      <strong className="text-ink">
                        {nextDestination.title || nextDestination.name}
                      </strong>
                    </span>
                    <span className="font-semibold text-secondary-600">
                      {nextDestination.time}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-success-bg p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-success mb-2" />
                <h3 className="text-lg font-bold text-ink">
                  All Day {currentDayObj?.day || activeDay} Activities Completed!
                </h3>
                <p className="mt-1 text-xs text-ink-muted">
                  You have visited all {dayItems.length} scheduled stops for today.
                </p>
              </div>
            )}
          </Card>

          {/* Today's Progress & Step-by-Step Checklist */}
          <Card className="p-6 shadow-soft">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Today&apos;s Progress — Day {currentDayObj?.day || activeDay}
                </h3>
                <p className="text-xs text-ink-muted">
                  {completedActivities.length} completed · {upcomingActivities.length} remaining
                </p>
              </div>
              <span className="text-xl font-extrabold text-secondary-600">
                {dayProgressPct}%
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-2 mb-5 h-3 w-full overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-secondary to-emerald-500 transition-all duration-500"
                style={{ width: `${dayProgressPct}%` }}
              />
            </div>

            {/* Checklist Items: ✓ Completed, → Current, ○ Upcoming */}
            <div className="space-y-2.5">
              {dayItems.map((item) => {
                const isDone = Boolean(item.completed)
                const isCurrent =
                  !isDone && currentActivity && currentActivity.id === item.id

                return (
                  <div
                    key={item.id}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3.5 transition-all ${
                      isCurrent
                        ? 'border-secondary bg-secondary-50/40 dark:bg-secondary-950/30 shadow-xs'
                        : isDone
                        ? 'border-border bg-surface/60 opacity-85'
                        : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleComplete(item.id)}
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          isDone
                            ? 'bg-success text-white'
                            : isCurrent
                            ? 'bg-secondary text-white ring-4 ring-secondary/20'
                            : 'border border-border bg-surface text-ink-muted hover:border-secondary'
                        }`}
                        title={isDone ? 'Mark uncompleted' : 'Mark completed'}
                      >
                        {isDone ? '✓' : isCurrent ? '→' : '○'}
                      </button>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-sm font-bold truncate ${
                              isDone ? 'line-through text-ink-muted' : 'text-ink'
                            }`}
                          >
                            {item.title || item.name}
                          </span>
                          {isCurrent && (
                            <Badge tone="secondary">Now</Badge>
                          )}
                          {isDone && item.actual_time && (
                            <span className="rounded bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                              Actual: {item.actual_time}{' '}
                              {item.deviation_label ? `(${item.deviation_label})` : ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-ink-muted mt-0.5">
                          Planned: {item.time} · {item.duration || '1.5h'} ·{' '}
                          {item.category || 'Attraction'}
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isDone ? 'ghost' : isCurrent ? 'primary' : 'outline'}
                      onClick={() => handleToggleComplete(item.id)}
                    >
                      {isDone ? 'Undo' : 'Complete'}
                    </Button>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Right Column: Live Map, Weather, Budget & Adaptive Controls */}
        <div className="space-y-5">
          {/* Live Route Map */}
          <Card className="overflow-hidden shadow-soft">
            <CardHeader
              title="Live Companion Map"
              subtitle={`Day ${currentDayObj?.day || activeDay} stops & active route`}
            />
            <div className="h-64">
              <TripMap
                places={dayItems.filter(
                  (i) => i.latitude !== null && i.longitude !== null
                )}
                activePlace={currentActivity}
                routeGeometry={currentDayObj?.route_geometry}
                dayNumber={currentDayObj?.day || activeDay}
              />
            </div>
          </Card>

          {/* Current Weather & Remaining Budget Snapshot */}
          <div className="grid grid-cols-2 gap-3.5">
            <Card className="p-4 shadow-soft">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-bold uppercase">Weather</span>
                <CloudSun className="h-4 w-4 text-sky-500" />
              </div>
              <p className="mt-2 text-xl font-extrabold text-ink">
                {weatherData?.temperature ?? 28}°C
              </p>
              <p className="text-xs text-ink-muted truncate">
                {weatherData?.condition || 'Clear'} ·{' '}
                {weatherData?.rain_probability ?? 15}% rain
              </p>
            </Card>

            <Card className="p-4 shadow-soft">
              <div className="flex items-center justify-between text-xs text-ink-muted">
                <span className="font-bold uppercase">Remaining</span>
                <Wallet className="h-4 w-4 text-secondary-600" />
              </div>
              <p className="mt-2 text-xl font-extrabold text-emerald-600">
                ₹{Math.max(0, predictiveBudget.remaining).toLocaleString('en-IN')}
              </p>
              <p className="text-xs text-ink-muted truncate">
                Est. left: ₹
                {predictiveBudget.estimated_remaining_spend.toLocaleString('en-IN')}
              </p>
            </Card>
          </div>

          {/* Live Companion Adaptive Actions */}
          <Card className="p-5 shadow-soft space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
              Live Companion Actions
            </p>
            <Button
              size="sm"
              variant="outline"
              fullWidth
              icon={RefreshCw}
              loading={simulatingAlert}
              onClick={handleTriggerSmartReplan}
            >
              Weather / Delay Alert → Smart Replan
            </Button>
            <Button
              size="sm"
              variant="outline"
              fullWidth
              icon={Route}
              onClick={() =>
                navigate(`/itinerary?day=${currentDayObj?.day || activeDay}`)
              }
            >
              Optimize Today&apos;s Route
            </Button>
            <Button
              size="sm"
              variant="outline"
              fullWidth
              icon={Sparkles}
              onClick={() => navigate('/assistant')}
            >
              Ask AI Companion What to Do Next
            </Button>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
