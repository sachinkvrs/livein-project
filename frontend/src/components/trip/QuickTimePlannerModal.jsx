import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Clock,
  Sparkles,
  MapPin,
  Plus,
  RefreshCw,
  Compass,
  X,
  CheckCircle2,
  Loader2,
  ArrowRight,
  Timer,
} from 'lucide-react'

import Button from '../ui/Button'
import Badge from '../ui/Badge'
import { useTrip } from '../../context/TripContext'

const TIME_PRESETS = [
  { label: '30 minutes', minutes: 30 },
  { label: '1 hour', minutes: 60 },
  { label: '2 hours', minutes: 120 },
  { label: '3 hours', minutes: 180 },
]

export default function QuickTimePlannerPanel({
  isOpen = true,
  onClose = null,
  initialMinutes = 120,
  dayNumber = null,
  inline = false,
}) {
  const navigate = useNavigate()
  const {
    trip,
    itinerary,
    activeDay,
    setActiveDay,
    setSelectedActivity,
    quickPlanResult,
    isGeneratingQuickPlan,
    generateQuickTimePlan,
    applyQuickTimePlan,
    clearQuickPlan,
  } = useTrip()

  const targetDay = dayNumber || activeDay || 1
  const currentDayObj = itinerary.find((d) => d.day === targetDay) || itinerary[0] || { day: 1, items: [] }
  const dayActivities = (currentDayObj.items || []).filter((i) => !i.completed)

  const [selectedMinutes, setSelectedMinutes] = useState(initialMinutes || 120)
  const [customMinutes, setCustomMinutes] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [replaceActivityId, setReplaceActivityId] = useState('')
  const [isApplying, setIsApplying] = useState(false)
  const [appliedBanner, setAppliedBanner] = useState(null)

  useEffect(() => {
    if (initialMinutes) {
      setSelectedMinutes(initialMinutes)
    }
  }, [initialMinutes])

  if (!isOpen && !inline) return null

  const effectiveMinutes = isCustomMode
    ? Math.max(15, Math.min(480, Number(customMinutes) || 90))
    : selectedMinutes

  const handleGenerate = async (minsOverride = null) => {
    setAppliedBanner(null)
    const mins = minsOverride || effectiveMinutes
    await generateQuickTimePlan({
      availableMinutes: mins,
      day: targetDay,
      replaceActivityId: replaceActivityId || null,
    })
  }

  const handleApply = async (mode = 'append') => {
    if (!quickPlanResult?.activities?.length) return
    setIsApplying(true)
    try {
      const targetReplaceId =
        mode === 'replace'
          ? replaceActivityId || dayActivities[0]?.id || null
          : null
      await applyQuickTimePlan({
        mode: targetReplaceId ? 'replace' : 'append',
        replaceActivityId: targetReplaceId,
        plan: quickPlanResult,
      })
      setActiveDay(targetDay)
      setAppliedBanner(
        targetReplaceId
          ? `Replaced activity on Day ${targetDay} with ${quickPlanResult.activities.length} quick-plan stop(s)!`
          : `Added ${quickPlanResult.activities.length} stop(s) from your ${quickPlanResult.available_minutes}-min plan to Day ${targetDay}!`
      )
    } finally {
      setIsApplying(false)
    }
  }

  const handleViewOnMap = () => {
    if (quickPlanResult?.activities?.[0]) {
      setSelectedActivity(quickPlanResult.activities[0])
    }
    setActiveDay(targetDay)
    if (onClose) onClose()
    navigate(`/map?day=${targetDay}`)
  }

  const handleCancel = () => {
    clearQuickPlan()
    setAppliedBanner(null)
    if (onClose) onClose()
  }

  const content = (
    <div className="rounded-2xl border border-border bg-card text-ink shadow-soft overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary-600 dark:text-secondary-400">
            <Timer className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-ink">
                “I Have 2 Hours” — Quick Time Planner
              </h3>
              <Badge tone="secondary">Day {targetDay}</Badge>
            </div>
            <p className="text-xs text-ink-muted">
              Instant optimized mini-itinerary for your available window in{' '}
              <span className="font-semibold text-ink capitalize">
                {trip?.destination || 'Chennai'}
              </span>
            </p>
          </div>
        </div>

        {onClose && !inline && (
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-lg p-1.5 text-ink-muted hover:bg-card hover:text-ink transition-colors"
            aria-label="Close Quick Planner"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="p-5 space-y-5">
        {/* Duration Selector */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-muted mb-2.5">
            How much free time do you have?
          </label>
          <div className="flex flex-wrap items-center gap-2">
            {TIME_PRESETS.map((preset) => {
              const active = !isCustomMode && selectedMinutes === preset.minutes
              return (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => {
                    setIsCustomMode(false)
                    setSelectedMinutes(preset.minutes)
                  }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    active
                      ? 'bg-secondary text-white shadow-soft ring-1 ring-secondary-400'
                      : 'border border-border bg-surface text-ink hover:border-secondary-300'
                  }`}
                >
                  {preset.label}
                </button>
              )
            })}

            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                isCustomMode
                  ? 'bg-secondary text-white shadow-soft ring-1 ring-secondary-400'
                  : 'border border-border bg-surface text-ink hover:border-secondary-300'
              }`}
            >
              Custom duration
            </button>

            {isCustomMode && (
              <div className="flex items-center gap-1.5 ml-1">
                <input
                  type="number"
                  min={15}
                  max={480}
                  step={15}
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  placeholder="e.g. 90"
                  className="w-24 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink focus:border-secondary focus:outline-none"
                />
                <span className="text-xs font-medium text-ink-muted">mins</span>
              </div>
            )}
          </div>
        </div>

        {/* Optional Target Activity to Replace + Generate Trigger */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between rounded-xl border border-border/80 bg-surface p-3.5">
          <div className="flex-1">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
              Optional: Replace an existing Day {targetDay} activity
            </label>
            <select
              value={replaceActivityId}
              onChange={(e) => setReplaceActivityId(e.target.value)}
              className="w-full rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-ink focus:border-secondary focus:outline-none"
            >
              <option value="">Keep all existing stops (Append to Day {targetDay})</option>
              {dayActivities.map((act) => (
                <option key={act.id} value={act.id}>
                  Replace: {act.title || act.name} ({act.time || 'Flexible'} · {act.duration || '1.5h'})
                </option>
              ))}
            </select>
          </div>

          <Button
            size="sm"
            icon={isGeneratingQuickPlan ? Loader2 : Sparkles}
            disabled={isGeneratingQuickPlan}
            onClick={() => handleGenerate()}
          >
            {isGeneratingQuickPlan
              ? 'Optimizing Window…'
              : `Generate ${effectiveMinutes}-Min Plan`}
          </Button>
        </div>

        {/* Success Feedback Banner */}
        {appliedBanner && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-success-bg p-3.5 text-xs text-ink">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
              <span className="font-semibold">{appliedBanner}</span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/itinerary?day=${targetDay}`)}
            >
              View Itinerary →
            </Button>
          </div>
        )}

        {/* Generated Mini-Itinerary Output */}
        {quickPlanResult && (
          <div className="rounded-2xl border border-secondary-300/60 dark:border-[#262626] bg-surface p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary-600 dark:text-secondary-400">
                  I HAVE {quickPlanResult.available_minutes} MINUTES
                </span>
                <h4 className="text-sm font-bold text-ink mt-0.5">
                  Optimized Mini-Itinerary from {quickPlanResult.anchor?.label || trip?.destination}
                </h4>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Badge tone="success">
                  Total: {quickPlanResult.total_minutes} min
                </Badge>
                <Badge tone="secondary">
                  Buffer: {quickPlanResult.buffer_minutes} min
                </Badge>
              </div>
            </div>

            {/* Vertical Step-by-Step Timeline */}
            {quickPlanResult.insufficient_time || (quickPlanResult.steps || []).length === 0 ? (
              <div className="rounded-xl border border-amber-500/30 bg-warning-bg p-4 text-xs text-ink">
                <p className="font-bold text-sm text-ink">Insufficient Free Time Window</p>
                <p className="mt-1 text-ink-muted">
                  {quickPlanResult.message ||
                    'Please select at least 20–30 minutes of free time to include travel, an activity, and a safe return buffer.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {(quickPlanResult.steps || []).map((step, idx) => {
                  const isActivity = step.type === 'activity'
                  return (
                    <div
                      key={idx}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs border transition-colors ${
                        isActivity
                          ? 'border-secondary-200 dark:border-[#262626] bg-card font-semibold text-ink shadow-xs'
                          : 'border-border/60 bg-surface/60 text-ink-muted'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base leading-none">{step.icon}</span>
                        <div className="min-w-0">
                          <p className={`truncate ${isActivity ? 'font-bold text-ink text-sm' : 'font-medium text-ink-muted'}`}>
                            {step.title}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {step.start_time} – {step.end_time}
                            {step.area ? ` · ${step.area}` : ''}
                            {step.distance_km ? ` · ${step.distance_km} km` : ''}
                            {isActivity && step.estimated_cost !== undefined
                              ? ` · ₹${Number(step.estimated_cost).toLocaleString('en-IN')}`
                              : ''}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`ml-3 flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold ${
                          isActivity
                            ? 'bg-secondary-50 dark:bg-[#141414] text-secondary-700 dark:text-secondary-400 border border-secondary-200 dark:border-[#262626]'
                            : 'bg-card text-ink-muted border border-border'
                        }`}
                      >
                        {step.duration_min} min
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Summary Metrics Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-3 border border-border text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Total: <strong className="text-ink">{quickPlanResult.total_minutes} min</strong>
                </span>
                <span>
                  Buffer: <strong className="text-success">{quickPlanResult.buffer_minutes} min</strong>
                </span>
                <span>
                  Distance: <strong className="text-ink">{quickPlanResult.total_distance_km} km</strong>
                </span>
                <span>
                  Est. Cost: <strong className="text-ink">₹{Number(quickPlanResult.total_cost_inr || 0).toLocaleString('en-IN')}</strong>
                </span>
              </div>
              <span className="text-[11px] text-ink-muted">{quickPlanResult.weather_note}</span>
            </div>

            {/* 4 Required User Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
              >
                Cancel Suggestion
              </Button>

              <Button
                variant="outline"
                size="sm"
                icon={Compass}
                onClick={handleViewOnMap}
              >
                View on Map
              </Button>

              {dayActivities.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  icon={RefreshCw}
                  disabled={isApplying}
                  onClick={() => handleApply('replace')}
                >
                  Replace Existing Activity
                </Button>
              )}

              <Button
                size="sm"
                icon={Plus}
                disabled={isApplying}
                onClick={() => handleApply('append')}
              >
                Add to Today's Plan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )

  if (inline) {
    return content
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {content}
      </div>
    </div>
  )
}
