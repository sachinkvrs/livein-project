import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CloudRain,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
  Clock,
  IndianRupee,
  Route,
  Calendar,
  ArrowRight,
  X,
  Wallet,
  MapPin,
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import ReplanningCard from '../components/alerts/ReplanningCard'
import Card, { CardHeader } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import StatusBadge from '../components/ui/StatusBadge'
import EmptyState from '../components/ui/EmptyState'
import AIOrb from '../components/ui/AIOrb'
import { useTrip } from '../context/TripContext'

export default function Replanning() {
  const navigate = useNavigate()
  const {
    itinerary,
    activeDay,
    activeAlert,
    proposedDay,
    replanReasons,
    replanChanges,
    replanSummaryMetrics,
    replanAlternatives,
    acceptUpdatedPlan,
    dismissAlert,
    triggerWeatherAlert,
    planAccepted,
  } = useTrip()

  const [selectedAltIndex, setSelectedAltIndex] = useState(0)
  const [isTriggering, setIsTriggering] = useState(false)

  const affectedDayNumber = activeAlert?.day || activeDay || 1

  const originalDay = useMemo(() => {
    return (
      itinerary.find((d) => d.day === affectedDayNumber) ||
      itinerary[0] ||
      null
    )
  }, [itinerary, affectedDayNumber])

  const selectedAlternative = useMemo(() => {
    if (replanAlternatives && replanAlternatives.length > selectedAltIndex) {
      return replanAlternatives[selectedAltIndex]
    }
    return null
  }, [replanAlternatives, selectedAltIndex])

  const displayedProposedDay = selectedAlternative?.updated_day || proposedDay || originalDay
  const displayedChanges = selectedAlternative?.changes || replanChanges || []
  const displayedSummary = selectedAlternative?.summary_metrics || replanSummaryMetrics || null

  const handleAccept = async () => {
    await acceptUpdatedPlan()
  }

  const handleSimulateDisruption = async () => {
    setIsTriggering(true)
    try {
      await triggerWeatherAlert()
    } finally {
      setIsTriggering(false)
    }
  }

  if (!activeAlert && !planAccepted) {
    return (
      <DashboardLayout>
        <EmptyState
          icon={CloudRain}
          title="No Active Disruption Detected"
          description="Smart Replanning 2.0 continuously monitors weather, opening hours, remaining budget, route traffic, and completed activities. Run a live disruption check to generate adaptive alternative plans."
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                size="sm"
                icon={Sparkles}
                onClick={handleSimulateDisruption}
                disabled={isTriggering}
              >
                {isTriggering ? 'Analyzing Itinerary…' : 'Simulate Weather Disruption'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </div>
          }
        />
      </DashboardLayout>
    )
  }

  if (planAccepted) {
    return (
      <DashboardLayout>
        <Card className="mx-auto max-w-lg text-center p-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-ink">Smart Replan 2.0 Applied!</h2>
          <p className="mt-2 text-sm text-ink-muted leading-relaxed">
            Day {affectedDayNumber} has been updated with your approved weather-safe indoor alternatives, and outdoor activities were rescheduled to preserve your trip experience.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => navigate('/itinerary')}>
              View Updated Itinerary
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </DashboardLayout>
    )
  }

  const primaryChange = displayedChanges[0] || {
    original_activity: 'Marina Beach',
    replacement_activity: 'Government Museum',
    what_changed: 'Swapped outdoor coastal stop for indoor cultural attraction',
    why_changed: 'Heavy rain forecast during your scheduled afternoon slot',
    time_impact: 'Saves 14 mins',
    cost_impact: 'Within budget',
    distance_impact: '-1.5 km',
  }

  return (
    <DashboardLayout>
      <div className="mb-5">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="mb-3 flex items-center gap-1 text-xs font-semibold text-ink-muted hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
        </button>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <StatusBadge level="danger">Smart Replanning 2.0 · Disruption Detected</StatusBadge>
          <span className="text-xs font-medium text-ink-muted">
            Detected {activeAlert.time || 'Just now'} · Requires Your Approval
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
          {activeAlert.title || 'Weather & Schedule Disruption Detected'}
        </h1>
        <p className="mt-1.5 max-w-3xl text-sm text-ink-muted leading-relaxed">
          {activeAlert.message ||
            'Rain expected this afternoon. TripNova analyzed your current location, remaining budget, completed activities, and opening hours to synthesize alternative plans.'}
        </p>
      </div>

      {/* Signature ✦ TRIPNOVA AI Recommendation Card */}
      <Card variant="ai" className="mb-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <AIOrb size="md" state="responding" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-widest text-purple-400">
                  ✦ TripNova AI
                </span>
                <Badge tone="ai">Adaptive Swap Ready</Badge>
              </div>
              <h2 className="mt-1 text-lg font-extrabold text-ink">
                {activeAlert.title || 'Rain expected at 3:00 PM'}
              </h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                Preserves completed stops while protecting your afternoon schedule.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button size="sm" onClick={handleAccept}>
              Accept Plan
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dismissAlert()
                navigate('/itinerary')
              }}
            >
              Keep Current
            </Button>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">
              Current vs Suggested
            </span>
            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-sm font-bold">
              <span className="rounded-xl border border-danger/30 bg-danger-bg px-3 py-1.5 text-danger line-through">
                Current: {primaryChange.original_activity}
              </span>
              <ArrowRight className="h-4 w-4 text-secondary-500" />
              <span className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-500">
                Suggested: {primaryChange.replacement_activity}
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-4">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-ink-muted">
              Why TripNova Recommends This
            </span>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 text-xs text-ink">
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Indoor activity
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> {primaryChange.distance_impact || '2.1 km away'}
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Fits your budget
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Matches your interests
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Summary Impact Banner */}
      {displayedSummary && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
              <Clock className="h-3.5 w-3.5 text-secondary-500" />
              Time Impact
            </div>
            <p className="mt-1 text-base font-extrabold text-emerald-500">
              {displayedSummary.route_time_saved_min > 0
                ? `Saves ${displayedSummary.route_time_saved_min} min`
                : displayedSummary.time_impact || 'Optimized'}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
              <Route className="h-3.5 w-3.5 text-secondary-500" />
              Distance Impact
            </div>
            <p className="mt-1 text-base font-extrabold text-ink">
              {displayedSummary.distance_delta_km !== undefined
                ? `${displayedSummary.distance_delta_km <= 0 ? '' : '+'}${displayedSummary.distance_delta_km} km`
                : displayedSummary.distance_impact || '-1.8 km'}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
              <IndianRupee className="h-3.5 w-3.5 text-secondary-500" />
              Cost Impact
            </div>
            <p className="mt-1 text-base font-extrabold text-ink">
              {displayedSummary.cost_delta !== undefined
                ? `${displayedSummary.cost_delta <= 0 ? '-₹' : '+₹'}${Math.abs(displayedSummary.cost_delta)}`
                : displayedSummary.cost_impact || 'Within budget'}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-1.5 text-xs font-bold text-ink-muted">
              <Calendar className="h-3.5 w-3.5 text-secondary-500" />
              Rescheduled
            </div>
            <p className="mt-1 text-base font-extrabold text-secondary-500">
              {displayedSummary.moved_to_next_day_count || 0} moved to tomorrow
            </p>
          </Card>
        </div>
      )}

      {/* Alternative Plans Selector */}
      {replanAlternatives && replanAlternatives.length > 1 && (
        <div className="mb-5">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
            Select an Alternative Plan ({replanAlternatives.length} Options Generated)
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {replanAlternatives.map((alt, idx) => {
              const isSelected = idx === selectedAltIndex
              return (
                <button
                  key={alt.id || idx}
                  type="button"
                  onClick={() => setSelectedAltIndex(idx)}
                  className={`text-left rounded-2xl border p-4 transition-all ${
                    isSelected
                      ? 'border-2 border-secondary-500 bg-secondary-500/10 shadow-card'
                      : 'border-border bg-card hover:border-secondary-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-ink">
                      {alt.label || `Option ${idx + 1}`}
                    </span>
                    <Badge tone={isSelected ? 'secondary' : 'neutral'}>
                      {isSelected ? 'Selected' : 'Preview'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-muted">
                    {alt.description || 'Adaptive indoor replacement with optimized route.'}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Detailed Activity-by-Activity Changes Breakdown */}
      {displayedChanges.length > 0 && (
        <Card className="mb-5">
          <CardHeader
            title="What Changed & Why (Activity Impact Breakdown)"
            subtitle="Every modification is explained below with time, cost, and distance impacts."
          />
          <div className="p-4 sm:p-5 pt-0 space-y-3">
            {displayedChanges.map((chg, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-border bg-surface p-4 text-xs space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-ink">
                    <span className="line-through text-danger">{chg.original_activity}</span>
                    <ArrowRight className="h-4 w-4 text-secondary-500" />
                    <span className="text-emerald-500">{chg.replacement_activity}</span>
                  </div>
                  {chg.moved_to_day && (
                    <Badge tone="secondary">
                      Original moved to Day {chg.moved_to_day}
                    </Badge>
                  )}
                </div>

                <p className="text-ink">
                  <strong>What changed:</strong> {chg.what_changed}
                </p>
                <p className="text-ink-muted">
                  <strong>Why it changed:</strong> {chg.why_changed}
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2.5 py-1 font-semibold text-ink">
                    <Clock className="h-3 w-3 text-secondary-500" />
                    Time: {chg.time_impact || 'Same slot'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2.5 py-1 font-semibold text-ink">
                    <Wallet className="h-3 w-3 text-secondary-500" />
                    Cost: {chg.cost_impact || '₹0 diff'}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-card border border-border px-2.5 py-1 font-semibold text-ink">
                    <MapPin className="h-3 w-3 text-secondary-500" />
                    Distance: {chg.distance_impact || '-1.2 km'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Side-by-Side Original vs Updated Plan */}
      <div className="mb-5">
        <ReplanningCard
          originalDay={originalDay}
          updatedDay={displayedProposedDay}
        />
      </div>

      <Card className="mb-5">
        <CardHeader title="Smart Replanning 2.0 Reasoning" />
        <ul className="space-y-2.5 p-4 sm:p-5 pt-0">
          {(replanReasons && replanReasons.length > 0
            ? replanReasons
            : [
                'Rain expected at 3 PM — outdoor activities moved to tomorrow and replaced with indoor cultural venues',
                'Completed activities preserved in your timeline without modification',
                'Route re-sequenced to minimize transit time and stay within your remaining budget',
              ]
          ).map((reason) => (
            <li
              key={reason}
              className="flex items-start gap-2.5 text-sm text-ink"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={handleAccept}>
          Approve & Apply Updated Plan
        </Button>
        <Button
          size="lg"
          variant="outline"
          icon={X}
          onClick={() => {
            dismissAlert()
            navigate('/itinerary')
          }}
        >
          Keep Original Plan
        </Button>
      </div>
    </DashboardLayout>
  )
}
