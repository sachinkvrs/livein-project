import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ShieldCheck,
  Sparkles,
  CloudRain,
  Clock,
  Wallet,
  Route,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Compass,
  Timer,
  Sliders,
  Play,
  Check,
  XCircle,
  PlusCircle,
  Car,
  SkipForward,
  Loader2,
} from 'lucide-react'

import DashboardLayout from '../components/layout/DashboardLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import QuickTimePlannerPanel from '../components/trip/QuickTimePlannerModal'
import { useTrip } from '../context/TripContext'

const WHAT_IF_SCENARIOS = [
  {
    id: 'rain',
    label: 'What if it rains tomorrow?',
    shortLabel: 'Rain Disruption',
    icon: CloudRain,
    desc: 'Swaps weather-exposed outdoor stops with top-rated indoor museums/galleries and preserves outdoor highlights.',
  },
  {
    id: 'less_time',
    label: 'What if I have less time?',
    shortLabel: 'Less Time Available',
    icon: Clock,
    desc: 'Compacts the day to fit a 4-hour window by trimming the lowest-priority detour and optimizing the sequence.',
  },
  {
    id: 'budget_decrease',
    label: 'What if my budget decreases?',
    shortLabel: 'Budget Decreases',
    icon: Wallet,
    desc: 'Replaces higher-cost paid attractions with high-rated free or low-cost heritage and park stops.',
  },
  {
    id: 'activity_unavailable',
    label: 'What if an activity becomes unavailable?',
    shortLabel: 'Activity Unavailable',
    icon: XCircle,
    desc: 'Finds the nearest open attraction matching your interests if a scheduled venue closes unexpectedly.',
  },
  {
    id: 'add_destination',
    label: 'What if I want to add another destination?',
    shortLabel: 'Add Another Place',
    icon: PlusCircle,
    desc: 'Inserts a top-recommended nearby attraction and re-sequences the route to minimize extra transit.',
  },
  {
    id: 'traffic_increase',
    label: 'What if traffic increases?',
    shortLabel: 'Heavy Traffic (+45%)',
    icon: Car,
    desc: 'Simulates peak-hour congestion, reorders stops via 2-opt TSP, and shifts departure buffers.',
  },
  {
    id: 'skip_activity',
    label: 'What if I skip this activity?',
    shortLabel: 'Skip an Activity',
    icon: SkipForward,
    desc: 'Shows how skipping a stop impacts your remaining schedule, travel distance, and daily budget.',
  },
]

export default function DecisionCenter() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const {
    trip,
    itinerary,
    hasGeneratedTrip,
    activeDay,
    setActiveDay,
    decisionCenter,
    travelBuffers,
    bufferMode,
    setBufferMode,
    transportMode,
    setTransportMode,
    routeOptimizationProposal,
    isOptimizingRoute,
    optimizeRouteForDay,
    applyOptimizedRoute,
    simulateWeatherAlert,
    simulationResult,
    isSimulatingScenario,
    runWhatIfSimulation,
    applyWhatIfSimulation,
    clearWhatIfSimulation,
  } = useTrip()

  const initialTab = searchParams.get('tab') || 'decisions'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedScenario, setSelectedScenario] = useState('rain')
  const [targetActivityId, setTargetActivityId] = useState('')
  const [customPlaceName, setCustomPlaceName] = useState('')
  const [lessTimeHours, setLessTimeHours] = useState(4)
  const [budgetCutAmount, setBudgetCutAmount] = useState(1500)
  const [quickPlanInitMinutes, setQuickPlanInitMinutes] = useState(120)
  const [statusBanner, setStatusBanner] = useState(null)

  const currentDayObj = useMemo(() => {
    return itinerary.find((d) => d.day === activeDay) || itinerary[0] || { day: 1, items: [] }
  }, [itinerary, activeDay])

  const dayItems = currentDayObj?.items || []

  const handleDecisionAction = async (decision) => {
    setStatusBanner(null)
    const { action_type, action_payload } = decision

    if (action_type === 'NAVIGATE' && action_payload?.path) {
      navigate(action_payload.path)
      return
    }

    if (action_type === 'TRIGGER_SMART_REPLAN') {
      await simulateWeatherAlert(action_payload?.day || activeDay)
      navigate('/replanning')
      return
    }

    if (action_type === 'OPTIMIZE_ROUTE') {
      const res = await optimizeRouteForDay(action_payload?.day || activeDay)
      if (res?.already_optimal) {
        setStatusBanner(res.explanation || 'Route is already optimal!')
      } else if (res) {
        setStatusBanner(
          `Route optimization ready: saves ${res.estimated_time_saved_min} mins and ${res.saved_km} km! Click "Apply Changes" to save.`
        )
      }
      return
    }

    if (action_type === 'APPLY_OPTIMIZED_ROUTE') {
      await applyOptimizedRoute()
      setStatusBanner('Optimized route applied to your itinerary and map!')
      return
    }

    if (action_type === 'OPEN_SIMULATOR') {
      const scen = action_payload?.scenarioType || action_payload?.scenario_type || 'rain'
      setSelectedScenario(scen)
      setActiveTab('simulator')
      await runWhatIfSimulation({
        scenarioType: scen,
        day: action_payload?.day || activeDay,
      })
      return
    }

    if (action_type === 'OPEN_QUICK_PLANNER') {
      setQuickPlanInitMinutes(action_payload?.availableMinutes || action_payload?.available_minutes || 120)
      setActiveTab('quick-plan')
    }
  }

  const handleRunSimulation = async (scenOverride = null) => {
    setStatusBanner(null)
    const scen = scenOverride || selectedScenario
    const params = {}
    if (scen === 'less_time') params.max_hours = Number(lessTimeHours) || 4
    if (scen === 'budget_decrease') params.reduce_by_inr = Number(budgetCutAmount) || 1500
    if ((scen === 'activity_unavailable' || scen === 'skip_activity') && targetActivityId) {
      params.activity_id = targetActivityId
    }
    if (scen === 'add_destination' && customPlaceName.trim()) {
      params.place_name = customPlaceName.trim()
    }
    await runWhatIfSimulation({
      scenarioType: scen,
      day: activeDay,
      parameters: params,
    })
  }

  const handleApplySimulatedPlan = async () => {
    if (!simulationResult) return
    await applyWhatIfSimulation(simulationResult)
    setStatusBanner(
      `Applied "${simulationResult.scenario_title}" to Day ${simulationResult.day}! Map, itinerary, and budget are now updated.`
    )
  }

  const badgeToneForState = (state) => {
    const s = String(state || '').toLowerCase()
    if (s === 'critical') return 'danger'
    if (s === 'warning') return 'warning'
    if (s === 'opportunity') return 'secondary'
    return 'success'
  }

  if (!hasGeneratedTrip || itinerary.length === 0) {
    return (
      <DashboardLayout>
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-50 dark:bg-secondary-950/40">
            <ShieldCheck className="h-8 w-8 text-secondary-600" />
          </div>
          <h1 className="text-xl font-bold text-ink">TripNova Decision Center</h1>
          <p className="mt-2 max-w-md mx-auto text-sm text-ink-muted">
            Plan or select an active trip first to unlock real-time Trip Health diagnostics, the What-If Trip Simulator, Quick Time Planner, and Travel Buffers.
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
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-secondary-600" />
              TripNova Decision Center
            </h1>
            <Badge tone={decisionCenter.health_tone}>
              Trip Health: {decisionCenter.health_score}/100
            </Badge>
          </div>
          <p className="text-sm text-ink-muted mt-0.5">
            Real-time intelligence, What-If scenario simulation, Quick Time planning, and departure buffers for{' '}
            <strong className="text-ink capitalize">{trip?.destination}</strong>.
          </p>
        </div>

        {/* Day Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {itinerary.map((d) => (
            <button
              key={d.day}
              type="button"
              onClick={() => {
                setActiveDay(d.day)
                clearWhatIfSimulation()
              }}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                activeDay === d.day
                  ? 'bg-secondary text-white shadow-soft ring-1 ring-secondary-400'
                  : 'border border-border bg-card text-ink hover:border-secondary-300'
              }`}
            >
              Day {d.day}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('decisions')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'decisions'
              ? 'bg-secondary text-white shadow-soft'
              : 'bg-card text-ink border border-border hover:border-secondary-300'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          Decision Center ({decisionCenter.decisions.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('simulator')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'simulator'
              ? 'bg-secondary text-white shadow-soft'
              : 'bg-card text-ink border border-border hover:border-secondary-300'
          }`}
        >
          <Sliders className="h-4 w-4" />
          “What If?” Trip Simulator
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('quick-plan')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'quick-plan'
              ? 'bg-secondary text-white shadow-soft'
              : 'bg-card text-ink border border-border hover:border-secondary-300'
          }`}
        >
          <Timer className="h-4 w-4" />
          “I Have 2 Hours” Planner
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('buffers')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
            activeTab === 'buffers'
              ? 'bg-secondary text-white shadow-soft'
              : 'bg-card text-ink border border-border hover:border-secondary-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          Travel Time Buffers
        </button>
      </div>

      {/* Status Notification Banner */}
      {statusBanner && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-secondary-300/60 bg-surface p-3.5 text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
            <span className="font-semibold">{statusBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusBanner(null)}
            className="text-ink-muted hover:text-ink font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: DECISION CENTER */}
      {activeTab === 'decisions' && (
        <div className="space-y-6">
          {/* Top Health Summary Banner Card */}
          <Card className="p-5 shadow-soft border-l-4 border-l-secondary">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                  TRIPNOVA DECISION CENTER — DAY {activeDay}
                </span>
                <h2 className="text-xl font-extrabold text-ink mt-1">
                  Trip Health: {decisionCenter.health_score}/100 ({decisionCenter.health_label})
                </h2>
                <p className="text-xs text-ink-muted mt-1">
                  {decisionCenter.attention_count > 0
                    ? `${decisionCenter.attention_count} item(s) need attention and ${decisionCenter.opportunity_count} optimization opportunity detected.`
                    : `All core systems are healthy with ${decisionCenter.opportunity_count} proactive opportunity available.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={Timer}
                  onClick={() => setActiveTab('quick-plan')}
                >
                  I Have 2 Hours
                </Button>
                <Button
                  size="sm"
                  icon={Sliders}
                  onClick={() => setActiveTab('simulator')}
                >
                  Run “What If?” Simulator
                </Button>
              </div>
            </div>
          </Card>

          {/* Decision Items Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            {decisionCenter.decisions.map((item) => (
              <Card
                key={item.id}
                className="p-5 shadow-soft flex flex-col justify-between border border-border hover:border-secondary-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {item.category}
                    </span>
                    <Badge tone={badgeToneForState(item.state)}>
                      {item.icon_status} {item.state}
                    </Badge>
                  </div>

                  <h3 className="mt-2.5 text-base font-bold text-ink">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-ink-muted leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    {item.impact_summary}
                  </span>
                  <Button
                    size="sm"
                    variant={item.state === 'Critical' || item.state === 'Warning' ? 'primary' : 'outline'}
                    onClick={() => handleDecisionAction(item)}
                  >
                    {item.action_label} →
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: "WHAT IF?" TRIP SIMULATOR */}
      {activeTab === 'simulator' && (
        <div className="space-y-6">
          <Card className="p-5 shadow-soft">
            <CardHeader
              title="“What If?” Trip Simulator"
              subtitle="Test hypothetical weather, time, budget, or route changes safely before applying them to your actual itinerary."
            />

            <div className="p-5 pt-2 space-y-5">
              {/* 7 Scenario Cards */}
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {WHAT_IF_SCENARIOS.map((scen) => {
                  const Icon = scen.icon
                  const isSelected = selectedScenario === scen.id
                  return (
                    <button
                      key={scen.id}
                      type="button"
                      onClick={() => setSelectedScenario(scen.id)}
                      className={`flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                        isSelected
                          ? 'border-secondary bg-secondary/10 ring-1 ring-secondary'
                          : 'border-border bg-surface hover:border-secondary-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <Icon className={`h-4 w-4 ${isSelected ? 'text-secondary-600 dark:text-secondary-400' : 'text-ink-muted'}`} />
                        {isSelected && <Badge tone="secondary">Selected</Badge>}
                      </div>
                      <p className="text-xs font-bold text-ink">{scen.label}</p>
                      <p className="mt-1 text-[11px] text-ink-muted line-clamp-2">{scen.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Contextual Scenario Parameters */}
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-center gap-4 flex-1">
                  {selectedScenario === 'less_time' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                        Available Hours on Day {activeDay}
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={10}
                        step={0.5}
                        value={lessTimeHours}
                        onChange={(e) => setLessTimeHours(e.target.value)}
                        className="w-28 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-ink"
                      />
                    </div>
                  )}

                  {selectedScenario === 'budget_decrease' && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                        Budget Reduction (₹)
                      </label>
                      <input
                        type="number"
                        min={200}
                        max={20000}
                        step={100}
                        value={budgetCutAmount}
                        onChange={(e) => setBudgetCutAmount(e.target.value)}
                        className="w-36 rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-bold text-ink"
                      />
                    </div>
                  )}

                  {(selectedScenario === 'activity_unavailable' || selectedScenario === 'skip_activity') && (
                    <div className="min-w-[240px]">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                        Select Activity on Day {activeDay}
                      </label>
                      <select
                        value={targetActivityId}
                        onChange={(e) => setTargetActivityId(e.target.value)}
                        className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink"
                      >
                        <option value="">Auto-select stop</option>
                        {dayItems.map((it) => (
                          <option key={it.id} value={it.id}>
                            {it.title || it.name} ({it.time})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedScenario === 'add_destination' && (
                    <div className="min-w-[240px]">
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-1">
                        Optional Place Name (or Auto-Pick Top Rated)
                      </label>
                      <input
                        type="text"
                        value={customPlaceName}
                        onChange={(e) => setCustomPlaceName(e.target.value)}
                        placeholder={`e.g. Museum or Park in ${trip?.destination}`}
                        className="w-full rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-ink"
                      />
                    </div>
                  )}

                  {selectedScenario === 'rain' && (
                    <p className="text-xs text-ink-muted">
                      Simulates heavy afternoon rain on Day {activeDay} and finds indoor cultural/museum replacements.
                    </p>
                  )}

                  {selectedScenario === 'traffic_increase' && (
                    <p className="text-xs text-ink-muted">
                      Simulates +45% peak city congestion and re-orders stops to minimize transit time.
                    </p>
                  )}
                </div>

                <Button
                  size="sm"
                  icon={isSimulatingScenario ? Loader2 : Play}
                  disabled={isSimulatingScenario}
                  onClick={() => handleRunSimulation()}
                >
                  {isSimulatingScenario ? 'Simulating…' : 'Simulate Scenario'}
                </Button>
              </div>

              {/* Simulation Comparison Output: CURRENT PLAN vs SIMULATED PLAN */}
              {simulationResult && (
                <div className="rounded-2xl border border-secondary-300/60 dark:border-[#262626] bg-surface p-5 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-secondary-600 dark:text-secondary-400">
                        WHAT IF SCENARIO RESULT
                      </span>
                      <h3 className="text-base font-bold text-ink mt-0.5">
                        {simulationResult.scenario_title}
                      </h3>
                      <p className="text-xs text-ink-muted mt-0.5">
                        {simulationResult.explanation}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={simulationResult.impacts?.time_impact_min <= 0 ? 'success' : 'warning'}>
                        Time: {simulationResult.impacts?.time_impact_label}
                      </Badge>
                      <Badge tone={simulationResult.impacts?.budget_impact_inr <= 0 ? 'success' : 'warning'}>
                        Budget: {simulationResult.impacts?.budget_impact_label}
                      </Badge>
                      <Badge tone="secondary">
                        Distance: {simulationResult.impacts?.distance_impact_label}
                      </Badge>
                    </div>
                  </div>

                  {/* Side-by-Side Comparison */}
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* CURRENT PLAN */}
                    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-ink-muted">
                          CURRENT PLAN (DAY {simulationResult.day})
                        </span>
                        <span className="text-xs font-semibold text-ink-muted">
                          {simulationResult.current_plan?.distance_km} km · ₹{Number(simulationResult.current_plan?.total_cost_inr || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(simulationResult.current_plan?.items || []).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="flex items-center justify-between rounded-lg border border-border/70 bg-surface px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-ink truncate">
                                {idx + 1}. {item.title || item.name}
                              </p>
                              <p className="text-[11px] text-ink-muted">
                                {item.time} · {item.duration} · {item.category}
                              </p>
                            </div>
                            <span className="font-semibold text-ink ml-2">
                              ₹{Number(item.estimated_cost || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SIMULATED PLAN */}
                    <div className="rounded-xl border border-secondary-300 dark:border-[#262626] bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-border pb-2">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-secondary-600 dark:text-secondary-400">
                          SIMULATED PLAN (DAY {simulationResult.day})
                        </span>
                        <span className="text-xs font-semibold text-ink">
                          {simulationResult.simulated_plan?.distance_km} km · ₹{Number(simulationResult.simulated_plan?.total_cost_inr || 0).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="space-y-2">
                        {(simulationResult.simulated_plan?.items || []).map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="flex items-center justify-between rounded-lg border border-secondary-200/70 dark:border-[#262626] bg-surface px-3 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-ink truncate">
                                {idx + 1}. {item.title || item.name}
                              </p>
                              <p className="text-[11px] text-ink-muted">
                                {item.time} · {item.duration} · {item.category}
                              </p>
                            </div>
                            <span className="font-semibold text-secondary-600 dark:text-secondary-400 ml-2">
                              ₹{Number(item.estimated_cost || 0).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Impact Breakdown & Approval Buttons */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                    <div className="text-xs text-ink-muted space-x-4">
                      <span>
                        Time impact: <strong className="text-ink">{simulationResult.impacts?.time_impact_label}</strong>
                      </span>
                      <span>
                        Budget impact: <strong className="text-ink">{simulationResult.impacts?.budget_impact_label}</strong>
                      </span>
                      <span>
                        Distance impact: <strong className="text-ink">{simulationResult.impacts?.distance_impact_label}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearWhatIfSimulation}
                      >
                        Keep Original
                      </Button>
                      <Button
                        size="sm"
                        icon={Check}
                        onClick={handleApplySimulatedPlan}
                      >
                        Apply Simulated Plan
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: "I HAVE 2 HOURS" QUICK TIME PLANNER */}
      {activeTab === 'quick-plan' && (
        <QuickTimePlannerPanel
          inline
          initialMinutes={quickPlanInitMinutes}
          dayNumber={activeDay}
        />
      )}

      {/* TAB 4: TRAVEL TIME BUFFERS */}
      {activeTab === 'buffers' && (
        <div className="space-y-6">
          <Card className="p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
              <div>
                <h3 className="text-base font-bold text-ink">
                  Travel Time Buffer & Departure Calculator — Day {activeDay}
                </h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Realistic travel durations, safety buffers, and recommended departure times so your itinerary never feels impossible to follow.
                </p>
              </div>

              {/* Buffer Mode Selector: Relaxed | Normal | Safe */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-ink-muted mr-1">Buffer Mode:</span>
                {[
                  { id: 'relaxed', label: 'Relaxed (+20m)' },
                  { id: 'normal', label: 'Normal (+10m)' },
                  { id: 'safe', label: 'Safe (+25m)' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setBufferMode(m.id)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      bufferMode === m.id
                        ? 'bg-secondary text-white shadow-soft'
                        : 'border border-border bg-surface text-ink hover:border-secondary-300'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Next Up Highlight Banner */}
            {travelBuffers.next_up && (
              <div className="mt-4 rounded-2xl border border-secondary-200 dark:border-[#262626] bg-secondary-50 dark:bg-[#050505] p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary-700 dark:text-secondary-400">
                      NEXT UP DEPARTURE GUIDANCE
                    </span>
                    <h4 className="text-lg font-extrabold text-ink dark:text-white mt-0.5">
                      Next Activity: {travelBuffers.next_up.title}
                    </h4>
                    <p className="text-xs text-ink-muted dark:text-neutral-300 mt-0.5">
                      From {travelBuffers.next_up.from_label} ({travelBuffers.next_up.distance_km} km)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="rounded-xl bg-card dark:bg-black border border-border dark:border-[#262626] px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase text-ink-muted">Activity Time</span>
                      <strong className="text-sm font-extrabold text-ink dark:text-white">
                        {travelBuffers.next_up.activity_time}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-card dark:bg-black border border-border dark:border-[#262626] px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase text-ink-muted">Travel + Buffer</span>
                      <strong className="text-sm font-extrabold text-ink dark:text-white">
                        {travelBuffers.next_up.travel_time_min}m + {travelBuffers.next_up.safety_buffer_min}m
                      </strong>
                    </div>
                    <div className="rounded-xl bg-card dark:bg-black border border-border dark:border-[#262626] px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase text-ink-muted">Recommended Departure</span>
                      <strong className="text-sm font-extrabold text-secondary-600 dark:text-secondary-400">
                        {travelBuffers.next_up.recommended_departure}
                      </strong>
                    </div>
                    <div className="rounded-xl bg-card dark:bg-black border border-border dark:border-[#262626] px-3 py-2">
                      <span className="block text-[10px] font-bold uppercase text-ink-muted">Countdown</span>
                      <strong className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                        {travelBuffers.next_up.leave_status_label}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Activities Buffer Table */}
            <div className="mt-5 space-y-3">
              {travelBuffers.activities.map((act, idx) => (
                <div
                  key={act.activity_id || idx}
                  className={`rounded-xl border p-4 transition-colors ${
                    act.has_schedule_conflict
                      ? 'border-amber-400/70 bg-warning-bg'
                      : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-secondary-600 dark:text-secondary-400">
                          Stop #{idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-ink">{act.title}</h4>
                        {act.completed && <Badge tone="success">Completed</Badge>}
                        {act.has_schedule_conflict && (
                          <Badge tone="warning">Schedule Tight</Badge>
                        )}
                      </div>
                      <p className="text-xs text-ink-muted mt-0.5">
                        Origin: {act.from_label} · Distance: {act.distance_km} km
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs">
                      <div>
                        <span className="text-ink-muted">Activity time: </span>
                        <strong className="text-ink">{act.activity_time}</strong>
                      </div>
                      <div>
                        <span className="text-ink-muted">Travel time: </span>
                        <strong className="text-ink">{act.travel_time_min} mins</strong>
                        <span className="text-ink-muted"> (+{act.safety_buffer_min}m buffer)</span>
                      </div>
                      <div>
                        <span className="text-ink-muted">Recommended departure: </span>
                        <strong className="text-secondary-600 dark:text-secondary-400">
                          {act.recommended_departure}
                        </strong>
                      </div>
                      <Badge tone={act.completed ? 'success' : 'secondary'}>
                        {act.leave_status_label}
                      </Badge>
                    </div>
                  </div>

                  {act.has_schedule_conflict && act.conflict_detail && (
                    <p className="mt-2 text-xs font-medium text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                      {act.conflict_detail}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
