import { useState, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  Compass,
  Plus,
  MapPin,
  Calendar,
  Clock,
  Sparkles,
  Check,
  X,
  Route,
  Timer,
  Sliders,
  Navigation,
  CheckCircle2,
  Car,
} from 'lucide-react'

import DashboardLayout from '../components/layout/DashboardLayout'
import Timeline from '../components/trip/Timeline'
import TripMap from '../components/map/TripMap'
import AddActivitySlideOver from '../components/trip/AddActivitySlideOver'
import QuickTimePlannerPanel from '../components/trip/QuickTimePlannerModal'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import EmptyState from '../components/ui/EmptyState'
import { useTrip } from '../context/TripContext'
import { getDestinationVisual } from '../utils/destinationVisuals'

export default function Itinerary() {
  const navigate = useNavigate()
  const {
    trip,
    itinerary,
    hasGeneratedTrip,
    activeDay,
    setActiveDay,
    addActivity,
    removeActivity,
    moveActivity,
    toggleActivityComplete,
    routeOptimizationProposal,
    optimizeRouteForDay,
    applyOptimizedRoute,
    clearRouteOptimizationProposal,
    travelBuffers,
    bufferMode,
    setBufferMode,
  } = useTrip()

  const [params] = useSearchParams()
  const initialDay = Number(params.get('day')) || activeDay || 1
  const [selectedDay, setSelectedDay] = useState(initialDay)
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)
  const [isQuickPlannerOpen, setIsQuickPlannerOpen] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  const day = useMemo(() => {
    return (
      itinerary.find((d) => d.day === selectedDay) ||
      itinerary[0] ||
      null
    )
  }, [itinerary, selectedDay])

  const mapPlaces = useMemo(() => {
    if (!day?.items) return []
    return day.items
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => ({
        id: i.id,
        title: i.title || i.name,
        name: i.title || i.name,
        area: i.area,
        time: i.time,
        duration: i.duration,
        note: i.note,
        latitude: i.latitude,
        longitude: i.longitude,
        rating: i.rating,
      }))
  }, [day])

  const handleDaySwitch = (dayNum) => {
    setSelectedDay(dayNum)
    setActiveDay(dayNum)
    setSelectedPlace(null)
  }

  const handleAddActivitySubmit = async (targetDay, activityData) => {
    await addActivity(targetDay, activityData)
    if (targetDay !== selectedDay) {
      setSelectedDay(targetDay)
      setActiveDay(targetDay)
    }
  }

  const handleOptimizeRoute = async () => {
    setIsOptimizing(true)
    try {
      await optimizeRouteForDay(selectedDay)
    } finally {
      setIsOptimizing(false)
    }
  }

  const currentDestination = trip?.destination || day?.city || 'Chennai'
  const destVisual = getDestinationVisual(currentDestination)
  const totalStops = day?.items?.length || 0
  const completedStops = (day?.items || []).filter((i) => i.completed).length
  const dayCompletionPct = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0

  return (
    <DashboardLayout>
      {/* Cinematic Journey Header Banner */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-[#050505] text-white shadow-card">
        <img
          src={destVisual.image}
          alt={currentDestination}
          className="absolute inset-0 h-full w-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/75 to-black/45" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 p-6 sm:p-7">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-secondary-300 backdrop-blur-md">
              <Compass className="h-3.5 w-3.5" />
              Visual Journey Timeline · {destVisual.region}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {currentDestination} Itinerary
            </h1>
            <p className="mt-1 text-sm text-zinc-300">
              {destVisual.tagline} — adaptive sequence tuned for weather, transit, and opening hours.
            </p>
          </div>

          {hasGeneratedTrip && (
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant="secondary"
                size="sm"
                icon={Timer}
                onClick={() => setIsQuickPlannerOpen(true)}
              >
                I Have 2 Hours
              </Button>
              <Button
                variant="ai"
                size="sm"
                icon={Sliders}
                onClick={() => navigate('/decisions?tab=simulator')}
              >
                “What If?” Simulator
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={Route}
                onClick={handleOptimizeRoute}
                disabled={isOptimizing}
                className="border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                {isOptimizing ? 'Optimizing…' : "Optimize Today's Route"}
              </Button>
              <Button
                size="sm"
                icon={Plus}
                onClick={() => setIsSlideOverOpen(true)}
              >
                Add Stop
              </Button>
            </div>
          )}
        </div>
      </div>

      {!hasGeneratedTrip || itinerary.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No Journey Planned Yet"
          description="Generate a personalized TripNova itinerary to unlock your interactive day-by-day timeline, live route buffers, and map synchronization."
          actionLabel="Plan My Trip"
          onAction={() => navigate('/plan')}
        />
      ) : (
        <>
          {/* Day Selector Pills with Progress */}
          <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
              {itinerary.map((d) => {
                const isSelected = d.day === selectedDay
                const dDone = (d.items || []).filter((i) => i.completed).length
                const dTotal = (d.items || []).length
                return (
                  <button
                    key={d.day}
                    type="button"
                    onClick={() => handleDaySwitch(d.day)}
                    className={[
                      'group flex-shrink-0 flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200',
                      isSelected
                        ? 'border-secondary-500 bg-secondary-500 text-white shadow-glow font-bold'
                        : 'border-border bg-card text-ink-muted hover:border-secondary-400 hover:text-ink',
                    ].join(' ')}
                  >
                    <Calendar className={`h-4 w-4 ${isSelected ? 'text-white' : 'text-secondary-500'}`} />
                    <span>Day {d.day} · {d.city || currentDestination}</span>
                    {dTotal > 0 && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                          isSelected
                            ? 'bg-black/25 text-white'
                            : 'bg-surface text-ink-muted'
                        }`}
                      >
                        {dDone}/{dTotal}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {totalStops > 0 && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold text-ink">
                  Day {selectedDay} Progress: {completedStops}/{totalStops} stops ({dayCompletionPct}%)
                </span>
                <div className="h-2 w-20 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                    style={{ width: `${dayCompletionPct}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Route Efficiency Optimizer Proposal Banner */}
          {routeOptimizationProposal && (
            <Card variant="ai" className="mb-6 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="ai">Route Efficiency Optimizer</Badge>
                    <span className="text-xs font-bold text-ink-muted">
                      Day {routeOptimizationProposal.day || selectedDay} Proposal
                    </span>
                  </div>
                  <h3 className="mt-1.5 text-base font-bold text-ink">
                    {routeOptimizationProposal.saved_km > 0
                      ? `Save ${routeOptimizationProposal.saved_km} km and ~${routeOptimizationProposal.estimated_time_saved_min} minutes on Day ${routeOptimizationProposal.day || selectedDay}`
                      : `Your Day ${routeOptimizationProposal.day || selectedDay} route is already optimal (${routeOptimizationProposal.before_km} km)`}
                  </h3>
                  <p className="mt-0.5 text-xs text-ink-muted">
                    {routeOptimizationProposal.explanation ||
                      'Reorders uncompleted activities using Nearest-Neighbor + 2-opt TSP while keeping completed activities fixed.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    icon={X}
                    onClick={clearRouteOptimizationProposal}
                  >
                    Dismiss
                  </Button>
                  <Button
                    size="sm"
                    icon={Check}
                    onClick={() => applyOptimizedRoute()}
                  >
                    Approve & Apply Route
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Before</span>
                  <p className="mt-0.5 text-lg font-extrabold text-ink">
                    {routeOptimizationProposal.before_km} km
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Optimized</span>
                  <p className="mt-0.5 text-lg font-extrabold text-secondary-500">
                    {routeOptimizationProposal.optimized_km} km
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Saved</span>
                  <p className="mt-0.5 text-lg font-extrabold text-emerald-500">
                    {routeOptimizationProposal.saved_km} km
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Time Saved</span>
                  <p className="mt-0.5 text-lg font-extrabold text-emerald-500">
                    {routeOptimizationProposal.estimated_time_saved_min} mins
                  </p>
                </div>
              </div>

              {routeOptimizationProposal.optimized_items?.length > 0 && (
                <div className="mt-3 rounded-xl border border-border/80 bg-card p-3 text-xs">
                  <span className="font-bold text-ink">Proposed Sequence: </span>
                  <span className="text-ink-muted">
                    {routeOptimizationProposal.optimized_items
                      .map((it, idx) => `${idx + 1}. ${it.title || it.name} (${it.time || 'Flexible'})`)
                      .join(' → ')}
                  </span>
                </div>
              )}
            </Card>
          )}

          {day && (
            <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
              {/* Left Column: Day Journey Timeline */}
              <Card>
                <CardHeader
                  icon={Compass}
                  title={`Day ${day.day} — ${day.city || currentDestination}`}
                  subtitle={
                    day.distance_km > 0
                      ? `${day.items?.length || 0} stops · ~${day.distance_km} km transit · ${travelBuffers?.buffer_mode_label || 'Normal Buffer'}`
                      : `${day.items?.length || 0} stops scheduled`
                  }
                  action={
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Buffer Mode Quick Selector */}
                      <div className="inline-flex items-center rounded-xl border border-border bg-surface p-0.5 text-[11px]">
                        {['relaxed', 'normal', 'safe'].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setBufferMode(m)}
                            className={`rounded-lg px-2.5 py-1 font-bold capitalize transition-colors ${
                              bufferMode === m
                                ? 'bg-secondary-500 text-white'
                                : 'text-ink-muted hover:text-ink'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleOptimizeRoute}
                        className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center gap-1 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Optimize
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsSlideOverOpen(true)}
                        className="rounded-xl border border-secondary-500/30 bg-secondary-500/10 px-2.5 py-1.5 text-xs font-bold text-secondary-600 dark:text-secondary-400 hover:bg-secondary-500/20 flex items-center gap-1 transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Stop
                      </button>
                    </div>
                  }
                />

                <div className="p-4 sm:p-6">
                  <Timeline
                    items={day.items || []}
                    selectedPlaceId={selectedPlace?.id || selectedPlace?.title || selectedPlace?.name}
                    onSelectPlace={(place) => setSelectedPlace(place)}
                    onToggleComplete={(actId) =>
                      toggleActivityComplete(selectedDay, actId)
                    }
                    onRemoveItem={(actId) =>
                      removeActivity(selectedDay, actId)
                    }
                    onMoveItem={(fromIdx, toIdx) =>
                      moveActivity(selectedDay, fromIdx, toIdx)
                    }
                    onAddItem={() => setIsSlideOverOpen(true)}
                    editable={true}
                    bufferByActivityId={travelBuffers?.byActivityId || {}}
                  />
                </div>
              </Card>

              {/* Right Column: Sticky Interactive Route Map & Transit Summary */}
              <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
                <Card className="overflow-hidden">
                  <CardHeader
                    icon={Navigation}
                    title="Live Route Map"
                    subtitle={`Day ${day.day} Waypoints (${mapPlaces.length} pinned stops)`}
                  />

                  <div className="h-80">
                    <TripMap
                      places={mapPlaces}
                      activePlace={selectedPlace}
                      routeGeometry={day.route_geometry}
                      dayNumber={day.day}
                      onSelectPlace={(place) => setSelectedPlace(place)}
                    />
                  </div>

                  <div className="grid grid-cols-2 divide-x divide-border border-t border-border bg-surface/60">
                    <div className="p-3.5 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary-500/10 text-secondary-500">
                        <Car className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          Total Distance
                        </p>
                        <p className="text-sm font-extrabold text-ink">
                          {day.distance_km || 0} km
                        </p>
                      </div>
                    </div>
                    <div className="p-3.5 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                          Est. Transit
                        </p>
                        <p className="text-sm font-extrabold text-ink">
                          ~{day.estimated_time_min || Math.max(15, (day.items?.length || 1) * 18)} min
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Time Planner ("I Have 2 Hours") Modal */}
      <QuickTimePlannerPanel
        isOpen={isQuickPlannerOpen}
        onClose={() => setIsQuickPlannerOpen(false)}
        dayNumber={selectedDay}
      />

      {/* Add Activity Slide-Over Panel */}
      <AddActivitySlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        destination={currentDestination}
        itinerary={itinerary}
        initialDay={selectedDay}
        onAddActivity={handleAddActivitySubmit}
      />
    </DashboardLayout>
  )
}