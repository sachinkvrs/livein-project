import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  CloudRain,
  MapPin,
  ArrowRight,
  Plus,
  Compass,
  Wallet,
  Check,
  ShieldCheck,
  Navigation,
  BarChart3,
  GitCompare,
  Timer,
  Sliders,
  Radar,
  Car,
  Route as RouteIcon,
} from 'lucide-react'

import DashboardLayout from '../components/layout/DashboardLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import TripHealth from '../components/ui/TripHealth'
import WeatherWidget from '../components/ui/WeatherWidget'
import QuickAction from '../components/ui/QuickAction'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import AIOrb from '../components/ui/AIOrb'
import TripMap from '../components/map/TripMap'
import ExpenseModal from '../components/trip/ExpenseModal'
import AddActivitySlideOver from '../components/trip/AddActivitySlideOver'
import QuickTimePlannerPanel from '../components/trip/QuickTimePlannerModal'
import { useTrip } from '../context/TripContext'
import { getDestinationVisual, getCategoryIcon } from '../utils/destinationVisuals'

export default function Dashboard() {
  const navigate = useNavigate()
  const {
    trip,
    itinerary,
    hasTrips,
    hasGeneratedTrip,
    isLoadingTrip,
    activeDay,
    expenses,
    weatherData,
    weatherLoading,
    activeAlert,
    addExpense,
    deleteExpense,
    addActivity,
    toggleActivityComplete,
    tripHealthScore,
    predictiveBudget,
    tripAnalytics,
    plannedVsActual,
    simulateWeatherAlert,
    decisionCenter,
    travelBuffers,
  } = useTrip()

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isAddActivityOpen, setIsAddActivityOpen] = useState(false)
  const [isQuickPlannerOpen, setIsQuickPlannerOpen] = useState(false)
  const [selectedMapPlace, setSelectedMapPlace] = useState(null)

  // Derive dynamic destination and totals
  const destination = trip?.destination || 'Chennai'
  const destVisual = useMemo(() => getDestinationVisual(destination), [destination])
  const totalDays = trip?.number_of_days || trip?.days || itinerary.length || 1
  const travellersCount = Number(trip?.travellers || 1)
  const totalBudget = Number(trip?.budget || trip?.tripBudget || 50000)
  const spentAmount = Number(trip?.spent || 0)
  const remainingBudget = Math.max(0, totalBudget - spentAmount)
  const budgetUsagePercent =
    totalBudget > 0 ? Math.min(100, Math.round((spentAmount / totalBudget) * 100)) : 0

  // Calculate today's day number based on trip dates
  const todayDayNumber = useMemo(() => {
    if (!trip?.startDate && !trip?.start_date) return activeDay || 1
    const start = new Date(trip.startDate || trip.start_date)
    const today = new Date()
    const diffTime = today.getTime() - start.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1

    if (diffDays >= 1 && diffDays <= totalDays) {
      return diffDays
    }
    return activeDay || 1
  }, [trip, activeDay, totalDays])

  // Get Today's day data
  const todayDayData = useMemo(() => {
    if (!itinerary || itinerary.length === 0) return null
    return itinerary.find((d) => d.day === todayDayNumber) || itinerary[0]
  }, [itinerary, todayDayNumber])

  const todayActivities = todayDayData?.items || []
  const todayCompletedCount = todayActivities.filter((i) => i.completed).length

  // Find next uncompleted activity
  const nextActivity = useMemo(() => {
    return todayActivities.find((i) => !i.completed) || todayActivities[0] || null
  }, [todayActivities])

  // Map places for Today's Interactive Map
  const todayMapPlaces = useMemo(() => {
    return todayActivities
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
  }, [todayActivities])

  // Overall Trip Activity Progress
  const totalActivities = useMemo(() => {
    return itinerary.reduce((acc, d) => acc + (d.items?.length || 0), 0)
  }, [itinerary])

  const totalCompletedActivities = useMemo(() => {
    return itinerary.reduce(
      (acc, d) => acc + (d.items || []).filter((i) => i.completed).length,
      0
    )
  }, [itinerary])

  const overallProgressPercent =
    totalActivities > 0
      ? Math.round((totalCompletedActivities / totalActivities) * 100)
      : 0

  // Total Planned Route Transit
  const totalRouteKm = useMemo(() => {
    return (
      Math.round(
        itinerary.reduce((acc, d) => acc + (Number(d.distance_km) || 0), 0) * 10
      ) / 10
    )
  }, [itinerary])

  // Calculate Dynamic Trip Health Score (0-100) & 4 Indicators
  const healthScoreValue = useMemo(() => {
    if (tripHealthScore && typeof tripHealthScore.score === 'number') {
      return tripHealthScore.score
    }
    let fallbackScore = 92
    if (activeAlert) fallbackScore -= 25
    if (budgetUsagePercent >= 90) fallbackScore -= 20
    else if (budgetUsagePercent >= 75) fallbackScore -= 10
    if ((weatherData?.rain_probability || 0) > 60) fallbackScore -= 15
    return Math.max(0, Math.min(100, fallbackScore))
  }, [tripHealthScore, activeAlert, budgetUsagePercent, weatherData])

  const healthIndicators = useMemo(() => {
    const rawInd = tripHealthScore?.indicators
    const indMap = {}
    if (Array.isArray(rawInd)) {
      for (const item of rawInd) {
        if (item?.key) indMap[item.key] = item
      }
    } else if (rawInd && typeof rawInd === 'object') {
      Object.assign(indMap, rawInd)
    }

    return [
      {
        key: 'budget',
        label: 'Budget',
        level:
          indMap.budget?.level ||
          indMap.budget?.status ||
          (budgetUsagePercent >= 90 ? 'danger' : budgetUsagePercent >= 75 ? 'warning' : 'good'),
        detail: indMap.budget?.detail || `${budgetUsagePercent}% used`,
      },
      {
        key: 'weather',
        label: 'Weather',
        level:
          indMap.weather?.level ||
          indMap.weather?.status ||
          (activeAlert ? 'danger' : (weatherData?.rain_probability || 0) > 60 ? 'warning' : 'good'),
        detail: indMap.weather?.detail || `${weatherData?.rain_probability || 15}% rain`,
      },
      {
        key: 'schedule',
        label: 'Schedule',
        level:
          indMap.schedule?.level ||
          indMap.schedule?.status ||
          (todayActivities.length > 5 ? 'warning' : 'good'),
        detail: indMap.schedule?.detail || `${todayCompletedCount}/${todayActivities.length} today`,
      },
      {
        key: 'routes',
        label: 'Routes',
        level: indMap.traffic?.level || indMap.traffic?.status || 'good',
        detail: indMap.traffic?.detail || `${totalRouteKm} km route`,
      },
    ]
  }, [
    tripHealthScore,
    budgetUsagePercent,
    activeAlert,
    weatherData,
    todayActivities.length,
    todayCompletedCount,
    totalRouteKm,
  ])

  const tripHealth = useMemo(() => {
    const tone =
      healthScoreValue >= 80 ? 'success' : healthScoreValue >= 60 ? 'warning' : 'danger'
    const statusLabel =
      tripHealthScore?.status ||
      (healthScoreValue >= 80 ? 'Good' : healthScoreValue >= 60 ? 'Needs Attention' : 'At Risk')
    return {
      score: healthScoreValue,
      status: statusLabel,
      tone,
      actionPath: activeAlert ? '/replanning' : '/decisions',
      actionLabel: activeAlert ? 'Review Smart Replan' : 'Open Decision Center',
    }
  }, [healthScoreValue, tripHealthScore, activeAlert])

  // Format date range
  const formattedDateRange = useMemo(() => {
    if (trip?.dateRange) return trip.dateRange
    if (trip?.start_date && trip?.end_date) {
      return `${trip.start_date} – ${trip.end_date}`
    }
    return 'Dates flexible'
  }, [trip])

  return (
    <DashboardLayout>
      {isLoadingTrip ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mb-3" />
          <p className="text-sm text-text-secondary">Loading your trips...</p>
        </div>
      ) : !hasTrips || !hasGeneratedTrip || itinerary.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No trips yet"
          description="Plan your first trip to unlock Map & Route, Explore Nearby, your Travel Command Center, live weather radar, and real-time budget intelligence."
          action={
            <Button size="lg" icon={Plus} onClick={() => navigate('/plan')}>
              Plan New Trip
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* ============================================================
              1. CINEMATIC DESTINATION HERO BANNER (TRAVEL COMMAND CENTER)
              ============================================================ */}
          <div className="relative overflow-hidden rounded-3xl border border-border bg-black shadow-card">
            <img
              src={destVisual.image}
              alt={destination}
              className="absolute inset-0 h-full w-full object-cover opacity-55 transition-transform duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/45" />

            <div className="relative z-10 flex flex-col justify-between gap-6 p-6 sm:p-8 lg:flex-row lg:items-end">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-secondary/40 bg-secondary/20 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-secondary-300 backdrop-blur-md">
                    <Compass className="h-3.5 w-3.5" /> Travel Command Center
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                    {totalDays} {totalDays === 1 ? 'DAY' : 'DAYS'} • DAY {todayDayNumber}
                  </span>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-neutral-200 backdrop-blur-md">
                    {trip?.status || 'Active Journey'}
                  </span>
                </div>

                <div>
                  <h1 className="text-3xl font-extrabold uppercase tracking-tight text-white sm:text-4xl">
                    {destination}
                  </h1>
                  <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-secondary-400" />
                      {formattedDateRange}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-secondary-400" />
                      {travellersCount} Traveller{travellersCount === 1 ? '' : 's'}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <RouteIcon className="h-4 w-4 text-secondary-400" />
                      {totalRouteKm} km total route
                    </span>
                  </p>
                </div>

                {/* Destination Highlights / Interests Pills */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {destVisual.highlights.map(({ label, icon: HighlightIcon }) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-md"
                    >
                      <HighlightIcon className="h-3.5 w-3.5 text-secondary-400" />
                      {label}
                    </span>
                  ))}
                  {(trip?.interests || []).slice(0, 3).map((interest) => (
                    <span
                      key={interest}
                      className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-neutral-200 backdrop-blur-md"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>

              {/* Hero Command Actions */}
              <div className="flex flex-wrap items-center gap-2.5">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={Navigation}
                  onClick={() => navigate('/live')}
                >
                  Start Live Trip
                </Button>
                <Button
                  size="sm"
                  icon={Timer}
                  onClick={() => setIsQuickPlannerOpen(true)}
                  className="bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur-md"
                >
                  I Have 2 Hours
                </Button>
                <Button
                  size="sm"
                  icon={ShieldCheck}
                  onClick={() => navigate('/decisions')}
                  className="bg-white/15 text-white border border-white/20 hover:bg-white/25 backdrop-blur-md"
                >
                  Decision Center
                </Button>
                <Button
                  size="sm"
                  icon={Plus}
                  onClick={() => setIsAddActivityOpen(true)}
                  className="bg-white text-slate-950 hover:bg-neutral-200 font-bold"
                >
                  Add Activity
                </Button>
              </div>
            </div>
          </div>

          {/* ============================================================
              2. TOP METRICS ROW: TRIP HEALTH, WEATHER, BUDGET, NEXT UP
              ============================================================ */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* 1. Circular Trip Health Score */}
            <TripHealth
              score={tripHealth.score}
              status={tripHealth.status}
              tone={tripHealth.tone}
              indicators={healthIndicators}
              actionLabel={tripHealth.actionLabel}
              onAction={() => navigate(tripHealth.actionPath)}
            />

            {/* 2. Visual Weather Card */}
            <WeatherWidget
              temperature={weatherData?.temperature || 28}
              condition={weatherData?.condition || 'Partly Cloudy'}
              rainProbability={weatherData?.rain_probability || 15}
              humidity={weatherData?.humidity}
              loading={weatherLoading}
              locationName={destination}
              onClick={() => navigate('/alerts')}
            />

            {/* 3. Animated Budget & Predictive Spend Card */}
            <Card className="flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                    Budget Spent
                  </span>
                  <Badge
                    tone={
                      budgetUsagePercent >= 90
                        ? 'danger'
                        : budgetUsagePercent >= 70
                        ? 'warning'
                        : 'secondary'
                    }
                  >
                    {budgetUsagePercent}% used
                  </Badge>
                </div>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <div className="text-2xl font-extrabold tracking-tight text-ink">
                    <AnimatedNumber value={spentAmount} prefix="₹" />
                    <span className="ml-1.5 text-xs font-semibold text-ink-muted">
                      / ₹{totalBudget.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className={`h-full transition-all duration-700 ease-out ${
                      budgetUsagePercent >= 90
                        ? 'bg-danger'
                        : budgetUsagePercent >= 70
                        ? 'bg-warning'
                        : 'bg-secondary'
                    }`}
                    style={{ width: `${budgetUsagePercent}%` }}
                  />
                </div>

                {predictiveBudget && (
                  <div className="mt-3 flex items-center justify-between rounded-xl border border-border/70 bg-surface px-3 py-1.5 text-[11px]">
                    <span className="text-ink-muted">
                      Est. left:{' '}
                      <strong className="text-ink">
                        ₹{Number(predictiveBudget.estimated_remaining_spend || 0).toLocaleString('en-IN')}
                      </strong>
                    </span>
                    <span
                      className={
                        predictiveBudget.status === 'Over Budget'
                          ? 'font-bold text-danger'
                          : 'font-bold text-success'
                      }
                    >
                      {predictiveBudget.status === 'Over Budget'
                        ? `-₹${Number(predictiveBudget.expected_overspending || 0).toLocaleString('en-IN')} over`
                        : `+₹${Number(predictiveBudget.expected_saving || 0).toLocaleString('en-IN')} save`}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-border/70 pt-2.5 text-xs text-ink-muted">
                <span>
                  Remaining:{' '}
                  <strong className="text-success">
                    ₹{remainingBudget.toLocaleString('en-IN')}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(true)}
                  className="inline-flex items-center gap-1 font-bold text-secondary-600 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" /> Expense
                </button>
              </div>
            </Card>

            {/* 4. Interactive "Next Up" Destination Card */}
            <Card
              variant="interactive"
              onClick={() => navigate(`/itinerary?day=${todayDayNumber}`)}
              className="flex flex-col justify-between border-secondary-200 dark:border-[#262626] bg-secondary-50 dark:bg-[#050505] p-5"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-700 dark:text-secondary-400">
                    Next Up · Day {todayDayNumber}
                  </span>
                  {nextActivity?.time && (
                    <span className="inline-flex items-center gap-1 rounded-lg border border-border dark:border-[#262626] bg-card dark:bg-black px-2.5 py-1 text-xs font-bold text-ink dark:text-white shadow-xs">
                      <Clock className="h-3.5 w-3.5 text-secondary-600 dark:text-secondary-400" />
                      {nextActivity.time}
                    </span>
                  )}
                </div>

                {nextActivity ? (
                  <div className="mt-3">
                    <h3 className="text-lg font-extrabold text-ink dark:text-white line-clamp-1">
                      {nextActivity.title || nextActivity.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink-muted dark:text-neutral-300">
                      <MapPin className="h-3.5 w-3.5 text-secondary-600 dark:text-secondary-400 flex-shrink-0" />
                      <span className="truncate">{nextActivity.area || destination}</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-3">
                    <h3 className="text-base font-bold text-ink dark:text-white">
                      All stops completed
                    </h3>
                    <p className="mt-1 text-xs text-ink-muted dark:text-neutral-300">
                      Ready to explore nearby or add a new activity.
                    </p>
                  </div>
                )}
              </div>

              {travelBuffers?.next_up ? (
                <div className="mt-3 space-y-1.5 border-t border-secondary-200/80 dark:border-[#262626] pt-2.5 text-xs">
                  <div className="flex items-center justify-between text-ink-muted dark:text-neutral-300">
                    <span className="flex items-center gap-1.5">
                      <Car className="h-3.5 w-3.5 text-secondary-600 dark:text-secondary-400" />
                      Travel:{' '}
                      <strong className="text-ink dark:text-white">
                        {travelBuffers.next_up.travel_time_min} min
                      </strong>
                    </span>
                    <span className="font-semibold text-secondary-700 dark:text-secondary-400">
                      Departs {travelBuffers.next_up.recommended_departure}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center rounded-md border border-border dark:border-[#262626] bg-card dark:bg-black px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                      {travelBuffers.next_up.leave_status_label}
                    </span>
                    <ArrowRight className="h-3.5 w-3.5 text-secondary-600 dark:text-secondary-400" />
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between border-t border-secondary-200/80 dark:border-[#262626] pt-2.5 text-xs font-semibold text-secondary-700 dark:text-secondary-400">
                  <span>View Day {todayDayNumber} Timeline</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </Card>
          </div>

          {/* ============================================================
              3. TODAY'S JOURNEY TIMELINE + INTERACTIVE COMMAND MAP
              ============================================================ */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left: Today's Journey Visual Timeline (7 Cols) */}
            <Card className="lg:col-span-7 flex flex-col justify-between">
              <div>
                <CardHeader
                  icon={Calendar}
                  title={`Today's Journey — Day ${todayDayNumber}`}
                  subtitle={`${todayActivities.length} stops scheduled · ${todayCompletedCount} completed`}
                  action={
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={Plus}
                        onClick={() => setIsAddActivityOpen(true)}
                      >
                        Add Stop
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/itinerary?day=${todayDayNumber}`)}
                      >
                        Full Itinerary
                      </Button>
                    </div>
                  }
                />

                {todayActivities.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center">
                    <Compass className="mx-auto h-8 w-8 text-secondary-600 mb-2" />
                    <p className="text-sm font-bold text-ink">No activities scheduled for today</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      Add a stop or use “I Have 2 Hours” to build a quick mini-itinerary in {destination}.
                    </p>
                    <div className="mt-4 flex justify-center gap-2">
                      <Button size="sm" icon={Plus} onClick={() => setIsAddActivityOpen(true)}>
                        Add Activity
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        icon={Timer}
                        onClick={() => setIsQuickPlannerOpen(true)}
                      >
                        I Have 2 Hours
                      </Button>
                    </div>
                  </div>
                ) : (
                  <ol className="relative ml-3 border-l-2 border-border/80 pl-6 space-y-3.5">
                    {todayActivities.map((act, idx) => {
                      const isDone = Boolean(act.completed)
                      const isNext = nextActivity && nextActivity.id === act.id
                      const isMapSelected =
                        selectedMapPlace &&
                        (selectedMapPlace.id === act.id ||
                          selectedMapPlace.title === (act.title || act.name))
                      const CategoryIcon = getCategoryIcon(act.category || act.title)
                      const buf = act.id ? travelBuffers?.byActivityId?.[act.id] : null

                      return (
                        <li
                          key={act.id || idx}
                          onClick={() =>
                            setSelectedMapPlace({
                              ...act,
                              title: act.title || act.name,
                            })
                          }
                          className="relative group cursor-pointer"
                        >
                          {/* Timeline Node */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleActivityComplete(todayDayNumber, act.id)
                            }}
                            title={isDone ? 'Mark as pending' : 'Mark as completed'}
                            aria-label={isDone ? 'Mark as pending' : 'Mark as completed'}
                            className={`absolute -left-[35px] top-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-card transition-all ${
                              isDone
                                ? 'bg-success text-white scale-100'
                                : isNext
                                ? 'bg-secondary text-white dark:text-black ring-secondary/30 scale-110'
                                : 'bg-surface text-ink-muted border border-border group-hover:border-secondary'
                            }`}
                          >
                            {isDone ? (
                              <Check className="h-3.5 w-3.5" />
                            ) : (
                              <span className="text-[10px] font-extrabold">{idx + 1}</span>
                            )}
                          </button>

                          <div
                            className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition-all ${
                              isMapSelected
                                ? 'border-secondary bg-surface shadow-soft ring-1 ring-secondary/40'
                                : isNext
                                ? 'border-secondary/60 bg-surface shadow-xs'
                                : isDone
                                ? 'border-border/60 bg-surface/50 opacity-75'
                                : 'border-border bg-card hover:border-secondary/50'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-secondary-600">
                                <CategoryIcon className="h-4 w-4" aria-hidden="true" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-extrabold text-secondary-600">
                                    {act.time || '09:00 AM'}
                                  </span>
                                  {isNext && !isDone && (
                                    <Badge tone="secondary" className="text-[10px] py-0">
                                      Next Stop
                                    </Badge>
                                  )}
                                  {isDone && (
                                    <Badge tone="success" className="text-[10px] py-0">
                                      Completed
                                    </Badge>
                                  )}
                                </div>
                                <p
                                  className={`text-sm font-bold truncate mt-0.5 ${
                                    isDone ? 'line-through text-ink-muted' : 'text-ink'
                                  }`}
                                >
                                  {act.title || act.name}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 text-[11px] text-ink-muted mt-0.5">
                                  {act.area && <span>{act.area}</span>}
                                  {buf && !isDone && (
                                    <span className="inline-flex items-center gap-1 text-secondary-600 font-semibold">
                                      · <Car className="h-3 w-3" /> {buf.travel_time_min}m drive (Departs {buf.recommended_departure})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {act.category && (
                                <Badge tone="neutral" className="hidden sm:inline-flex">
                                  {act.category}
                                </Badge>
                              )}
                              <ArrowRight className="h-4 w-4 text-ink-muted group-hover:translate-x-0.5 group-hover:text-secondary-600 transition-transform" />
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ol>
                )}
              </div>

              {/* Overall Journey Progress Bar Footer */}
              <div className="mt-5 border-t border-border/80 pt-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-bold text-ink">
                    Overall Journey Progress · Day {todayDayNumber} of {totalDays}
                  </span>
                  <span className="font-extrabold text-secondary-600">
                    {totalCompletedActivities} / {totalActivities} stops ({overallProgressPercent}%)
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full bg-gradient-to-r from-secondary to-emerald-500 transition-all duration-700 ease-out"
                    style={{ width: `${overallProgressPercent}%` }}
                  />
                </div>
              </div>
            </Card>

            {/* Right: Interactive Command Center Map & Live Disruption Monitor (5 Cols) */}
            <div className="lg:col-span-5 space-y-5">
              {/* Interactive Route Map Card */}
              <Card padded={false} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-secondary-600">
                      <Compass className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-ink">
                        Interactive Route Radar
                      </h3>
                      <p className="text-[11px] text-ink-muted">
                        Day {todayDayNumber} · {todayMapPlaces.length} waypoints · ~{todayDayData?.distance_km || totalRouteKm} km
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/explore')}
                    >
                      Explore
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate('/map')}
                    >
                      Full Map
                    </Button>
                  </div>
                </div>

                <div className="h-64 sm:h-72 w-full">
                  <TripMap
                    places={todayMapPlaces}
                    activePlace={selectedMapPlace || nextActivity}
                    routeGeometry={todayDayData?.route_geometry}
                    dayNumber={todayDayNumber}
                    onSelectPlace={(place) => setSelectedMapPlace(place)}
                  />
                </div>
              </Card>

              {/* Smart Replanning & Disruption Monitor Card */}
              <Card variant={activeAlert ? 'default' : 'ai'} className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <AIOrb state={activeAlert ? 'thinking' : 'idle'} size="sm" />
                    <div>
                      <span className="text-xs font-extrabold uppercase tracking-wider text-ink">
                        Smart Replanning 2.0
                      </span>
                      <p className="text-[11px] text-ink-muted">
                        Real-time weather, traffic & schedule sentinel
                      </p>
                    </div>
                  </div>
                  <Badge tone={activeAlert ? 'danger' : 'ai'}>
                    {activeAlert ? 'Disruption Active' : 'AI Monitoring'}
                  </Badge>
                </div>

                {activeAlert ? (
                  <div className="rounded-2xl border border-danger/30 bg-danger-bg p-4 text-xs text-danger space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="font-bold text-sm">{activeAlert.title}</strong>
                        <p className="mt-0.5 text-ink-muted leading-relaxed">
                          {activeAlert.message}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="danger"
                      fullWidth
                      icon={ArrowRight}
                      iconPosition="right"
                      onClick={() => navigate('/replanning')}
                    >
                      Review AI Alternative Plan
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-3.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                      <div>
                        <p className="font-bold text-ink">All routes & weather clear</p>
                        <p className="text-[11px] text-ink-muted">
                          No schedule conflicts or weather disruptions detected.
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      icon={CloudRain}
                      onClick={() => simulateWeatherAlert && simulateWeatherAlert()}
                    >
                      Test Alert
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>

          {/* ============================================================
              4. TRIPNOVA DECISION CENTER LIVE SUMMARY
              ============================================================ */}
          {decisionCenter && (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-secondary/30 bg-surface text-secondary-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-extrabold tracking-tight text-ink">
                        TripNova Decision Center
                      </h3>
                      <Badge tone={decisionCenter.health_tone}>
                        Health: {decisionCenter.health_score}/100
                      </Badge>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Proactive weather, route, budget, and schedule intelligence for Day {decisionCenter.day}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Timer}
                    onClick={() => setIsQuickPlannerOpen(true)}
                  >
                    I Have 2 Hours
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Sliders}
                    onClick={() => navigate('/decisions?tab=simulator')}
                  >
                    “What If?” Simulator
                  </Button>
                  <Button
                    size="sm"
                    icon={ArrowRight}
                    iconPosition="right"
                    onClick={() => navigate('/decisions')}
                  >
                    Open Decision Center
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {(decisionCenter.decisions || []).map((dec) => {
                  const toneMap = {
                    Critical: 'danger',
                    Warning: 'warning',
                    Opportunity: 'info',
                    Good: 'success',
                  }
                  return (
                    <div
                      key={dec.id}
                      onClick={() => navigate('/decisions')}
                      className="group cursor-pointer rounded-2xl border border-border bg-surface p-3.5 card-hover-lift flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-ink-muted">
                            {dec.category}
                          </span>
                          <Badge tone={toneMap[dec.state] || 'neutral'} className="text-[10px] py-0">
                            {dec.state}
                          </Badge>
                        </div>
                        <p className="text-xs font-bold text-ink line-clamp-2 leading-snug">
                          {dec.title}
                        </p>
                      </div>
                      <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-secondary-600 group-hover:translate-x-0.5 transition-transform">
                        {dec.action_label} <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {/* ============================================================
              5. INTERACTIVE QUICK ACTIONS GRID
              ============================================================ */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-ink-muted">
                Command Quick Actions
              </h3>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <QuickAction
                icon={Timer}
                title="I Have 2 Hours"
                subtitle="Generate a quick free-time mini-plan"
                accent="teal"
                onClick={() => setIsQuickPlannerOpen(true)}
              />
              <QuickAction
                icon={ShieldCheck}
                title="Decision Center"
                subtitle="Review trip health & optimizations"
                accent="emerald"
                onClick={() => navigate('/decisions')}
              />
              <QuickAction
                icon={Sliders}
                title="“What If?” Simulator"
                subtitle="Simulate rain, budget or time changes"
                accent="amber"
                onClick={() => navigate('/decisions?tab=simulator')}
              />
              <QuickAction
                icon={Radar}
                title="Explore Around Me"
                subtitle="Discover nearby spots on Map + List"
                accent="teal"
                onClick={() => navigate('/explore')}
              />
              <QuickAction
                icon={Plus}
                title="Add Activity"
                subtitle={`Add a new stop to ${destination}`}
                accent="teal"
                onClick={() => setIsAddActivityOpen(true)}
              />
              <QuickAction
                icon={Wallet}
                title="Add Expense"
                subtitle="Log spending & update budget"
                accent="emerald"
                onClick={() => setIsExpenseModalOpen(true)}
              />
              <QuickAction
                icon={CloudRain}
                title="Smart Replanning 2.0"
                subtitle="Weather & schedule adaptation"
                accent="amber"
                onClick={() => navigate('/replanning')}
              />
              <QuickAction
                icon={Sparkles}
                title="Ask TripNova AI"
                subtitle="Chat with your AI travel companion"
                accent="ai"
                onClick={() => navigate('/assistant')}
              />
            </div>
          </div>

          {/* ============================================================
              6. ANALYTICS & PLANNED VS ACTUAL COMPARISON
              ============================================================ */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Trip Analytics Summary */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-secondary-600">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-ink">
                    Trip Telemetry & Analytics
                  </span>
                </div>
                <Badge tone="secondary">
                  {tripAnalytics?.completion_percent ?? overallProgressPercent}% Complete
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-surface p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Places Visited</span>
                  <p className="mt-1 text-lg font-extrabold text-ink">
                    <AnimatedNumber
                      value={tripAnalytics?.places_visited ?? totalCompletedActivities}
                    />{' '}
                    <span className="text-xs font-normal text-ink-muted">
                      / {tripAnalytics?.planned_count ?? totalActivities}
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-surface p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Distance Travelled</span>
                  <p className="mt-1 text-lg font-extrabold text-ink">
                    {tripAnalytics?.distance_travelled_km ?? 0} km{' '}
                    <span className="text-xs font-normal text-ink-muted">
                      / {tripAnalytics?.total_planned_distance_km ?? totalRouteKm} km
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-surface p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Total Spent</span>
                  <p className="mt-1 text-lg font-extrabold text-ink">
                    <AnimatedNumber
                      value={Number(tripAnalytics?.total_spent ?? spentAmount)}
                      prefix="₹"
                    />
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-surface p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Planned vs Done</span>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {tripAnalytics?.planned_vs_completed?.completed ?? totalCompletedActivities} done ·{' '}
                    {tripAnalytics?.planned_vs_completed?.remaining ??
                      totalActivities - totalCompletedActivities}{' '}
                    left
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-surface p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Budget Usage</span>
                  <p className="mt-1 text-sm font-bold text-ink">
                    {tripAnalytics?.budget_usage_percent ?? budgetUsagePercent}% of ₹
                    {totalBudget.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="rounded-xl border border-border/80 bg-surface p-3">
                  <span className="text-[11px] font-semibold text-ink-muted">Top Category</span>
                  <p className="mt-1 text-sm font-bold text-secondary-600 truncate">
                    {tripAnalytics?.most_visited_category || 'Sightseeing'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Planned vs Actual Trip Comparison */}
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-surface text-secondary-600">
                    <GitCompare className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-bold text-ink">
                    Planned vs Actual Execution
                  </span>
                </div>
                <Badge
                  tone={
                    (plannedVsActual?.total_deviation_minutes || 0) > 30
                      ? 'warning'
                      : 'success'
                  }
                >
                  {plannedVsActual?.total_deviation_label || 'On schedule'}
                </Badge>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3 text-center">
                <div className="rounded-xl bg-surface p-2.5 border border-border/70">
                  <p className="text-sm font-extrabold text-ink">
                    {plannedVsActual?.total_planned_activities ?? totalActivities}
                  </p>
                  <p className="text-[10px] text-ink-muted">Original Plan</p>
                </div>
                <div className="rounded-xl bg-surface p-2.5 border border-border/70">
                  <p className="text-sm font-extrabold text-success">
                    {plannedVsActual?.completed_activities ?? totalCompletedActivities}
                  </p>
                  <p className="text-[10px] text-ink-muted">Completed</p>
                </div>
                <div className="rounded-xl bg-surface p-2.5 border border-border/70">
                  <p className="text-sm font-extrabold text-warning">
                    {plannedVsActual?.replanned_swaps ?? 0}
                  </p>
                  <p className="text-[10px] text-ink-muted">Replanned</p>
                </div>
                <div className="rounded-xl bg-surface p-2.5 border border-border/70">
                  <p className="text-sm font-extrabold text-secondary-600">
                    {plannedVsActual?.added_activities ?? 0}
                  </p>
                  <p className="text-[10px] text-ink-muted">Added Live</p>
                </div>
              </div>

              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {(plannedVsActual?.comparisons || todayActivities.slice(0, 4))
                  .slice(0, 5)
                  .map((item, idx) => {
                    const title = item.activity || item.title || item.name
                    const plannedTime = item.planned_time || item.time || '10:00 AM'
                    const actualTime =
                      item.actual_time ||
                      (item.completed ? item.actual_completed_time || plannedTime : 'Pending')
                    const devLabel =
                      item.deviation_label || (item.completed ? 'On time' : 'Scheduled')
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between rounded-xl border border-border/70 bg-card px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-ink truncate">{title}</p>
                          <p className="text-[10px] text-ink-muted">
                            Planned: <strong>{plannedTime}</strong> · Actual:{' '}
                            <strong>{actualTime}</strong>
                          </p>
                        </div>
                        <span
                          className={`flex-shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${
                            devLabel.startsWith('+')
                              ? 'bg-warning-bg text-warning'
                              : item.status === 'Completed' || item.completed
                              ? 'bg-success-bg text-success'
                              : 'bg-surface text-ink-muted'
                          }`}
                        >
                          {devLabel}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Quick Time Planner ("I Have 2 Hours") Modal */}
      <QuickTimePlannerPanel
        isOpen={isQuickPlannerOpen}
        onClose={() => setIsQuickPlannerOpen(false)}
        dayNumber={todayDayNumber}
      />

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        expenses={expenses}
        onAddExpense={addExpense}
        onDeleteExpense={deleteExpense}
        budget={totalBudget}
        spent={spentAmount}
        startDate={trip?.start_date || trip?.startDate}
        endDate={trip?.end_date || trip?.endDate}
      />

      {/* Add Activity Slide-Over Panel */}
      <AddActivitySlideOver
        isOpen={isAddActivityOpen}
        onClose={() => setIsAddActivityOpen(false)}
        destination={destination}
        itinerary={itinerary}
        initialDay={todayDayNumber}
        onAddActivity={async (dayNum, act) => {
          await addActivity(dayNum, act)
        }}
      />
    </DashboardLayout>
  )
}