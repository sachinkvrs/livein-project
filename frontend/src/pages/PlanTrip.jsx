import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Route,
  CloudSun,
  ShieldAlert,
  RefreshCw,
  Calendar,
  Wallet,
  Users,
  Compass,
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import TripForm from '../components/trip/TripForm'
import Card from '../components/ui/Card'
import AIOrb from '../components/ui/AIOrb'
import { useTrip } from '../context/TripContext'
import { createTrip } from '../services/tripService'
import { getDestinationVisual } from '../utils/destinationVisuals'
import { defaultTripForm } from '../data/mockTrips'

const optimizePoints = [
  { icon: Sparkles, text: 'AI-ranked places matched to your interests' },
  { icon: Route, text: '2-Opt TSP route sequencing & buffer times' },
  { icon: CloudSun, text: 'Live weather-aware indoor/outdoor swaps' },
  { icon: ShieldAlert, text: 'Proactive crowd & schedule conflict alerts' },
  { icon: RefreshCw, text: '1-click dynamic replanning anytime' },
]

export default function PlanTrip() {
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const [liveForm, setLiveForm] = useState({
    ...defaultTripForm,
    calculatedDays: 3,
  })
  const { generateTrip } = useTrip()
  const navigate = useNavigate()

  const handleSubmit = async (formData) => {
    setSubmitting(true)
    setErrorMsg(null)
    try {
      const createdTrip = await createTrip(formData)
      generateTrip(formData, createdTrip)
      navigate('/dashboard')
    } catch (error) {
      console.error('[TripNova] Generate plan failed:', error)
      setErrorMsg(
        error.message ||
          'Could not generate recommendations. Make sure FastAPI backend is running.'
      )
    } finally {
      setSubmitting(false)
    }
  }

  const previewDestination = liveForm.destination || 'Chennai'
  const destVisual = getDestinationVisual(previewDestination)

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-2 rounded-full border border-secondary-500/30 bg-secondary-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-secondary-500">
              <Compass className="h-3.5 w-3.5" />
              Interactive Trip Architect
            </div>
            <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
              Plan a trip that adapts with you.
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Configure your destination, budget, and rhythm — TripNova AI handles route optimization and live weather adaptation.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-5 rounded-xl border border-danger/20 bg-danger-bg p-4 text-sm font-medium text-danger">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="p-6 sm:p-8">
            <TripForm
              onSubmit={handleSubmit}
              submitting={submitting}
              onFormChange={setLiveForm}
            />
          </Card>

          {/* Sticky Live Trip Summary Card */}
          <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
            <Card className="overflow-hidden border-secondary-500/30">
              <div className="relative h-44 overflow-hidden">
                <img
                  src={destVisual.image}
                  alt={previewDestination}
                  className="h-full w-full object-cover transition-all duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute top-3 left-3 rounded-full border border-white/15 bg-black/60 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-secondary-300 backdrop-blur-md">
                  Your Trip Preview
                </div>
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-xs font-semibold text-zinc-300">
                    {destVisual.region}
                  </p>
                  <h2 className="text-xl font-extrabold text-white capitalize">
                    {previewDestination}
                  </h2>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border bg-surface p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <Calendar className="h-3 w-3 text-secondary-500" />
                      Duration
                    </span>
                    <p className="mt-1 text-sm font-extrabold text-ink">
                      {liveForm.calculatedDays > 0
                        ? `${liveForm.calculatedDays} Days`
                        : 'Select Dates'}
                    </p>
                  </div>

                  <div className="rounded-xl border border-border bg-surface p-3">
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      <Wallet className="h-3 w-3 text-secondary-500" />
                      Budget
                    </span>
                    <p className="mt-1 text-sm font-extrabold text-secondary-500">
                      ₹{Number(liveForm.tripBudget || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs">
                  <span className="flex items-center gap-1.5 text-ink-muted font-medium">
                    <Users className="h-3.5 w-3.5 text-secondary-500" />
                    Travellers & Style
                  </span>
                  <span className="font-bold text-ink capitalize">
                    {liveForm.travellers || 1} · {liveForm.travelling_with || 'Any'}
                  </span>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
                    Selected Interests ({liveForm.interests?.length || 0})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(liveForm.interests || []).slice(0, 6).map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-secondary-500/10 border border-secondary-500/25 px-2.5 py-0.5 text-[11px] font-bold text-secondary-500"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card variant="ai" className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <AIOrb size="sm" state={submitting ? 'thinking' : 'idle'} />
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-purple-400">
                    TripNova AI Engine
                  </p>
                  <p className="text-sm font-bold text-ink">
                    What we optimize for you
                  </p>
                </div>
              </div>
              <ul className="space-y-2.5">
                {optimizePoints.map(({ icon: Icon, text }) => (
                  <li
                    key={text}
                    className="flex items-center gap-2.5 text-xs text-ink-muted"
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-secondary-500/10 text-secondary-500">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
