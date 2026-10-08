import DashboardLayout from '../components/layout/DashboardLayout'
import ChatWindow from '../components/ai/ChatWindow'
import AIOrb from '../components/ui/AIOrb'
import Badge from '../components/ui/Badge'
import { useTrip } from '../context/TripContext'

export default function Assistant() {
  const { trip, activeDay } = useTrip()
  const destination = trip?.destination || 'Chennai'
  const totalBudget = Number(trip?.budget || trip?.tripBudget || 50000)
  const spent = Number(trip?.spent || 0)
  const remaining = Math.max(0, totalBudget - spent)

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <div className="flex items-center gap-3.5">
          <AIOrb size="md" state="idle" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-ink">
                ✦ TripNova AI
              </h1>
              <Badge tone="ai">Live Context Connected</Badge>
            </div>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              Your intelligent travel companion for{' '}
              <strong className="text-ink capitalize">{destination}</strong> · Day {activeDay || 1} · ₹{remaining.toLocaleString('en-IN')} remaining
            </p>
          </div>
        </div>
      </div>
      <div className="h-[calc(100vh-230px)] min-h-[500px]">
        <ChatWindow />
      </div>
    </DashboardLayout>
  )
}
