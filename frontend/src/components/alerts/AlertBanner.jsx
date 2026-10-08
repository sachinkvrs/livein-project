import { CloudRain, ArrowRight } from 'lucide-react'
import Button from '../ui/Button'

export default function AlertBanner({ alert, onViewPlan }) {
  if (!alert) return null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-bg p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-card">
          <CloudRain className="h-5 w-5 text-danger" />
        </div>
        <div>
          <p className="text-sm font-semibold text-danger">{alert.title} · High Impact</p>
          <p className="text-sm text-ink-muted">{alert.message}</p>
        </div>
      </div>
      <Button variant="danger" size="sm" icon={ArrowRight} iconPosition="right" onClick={onViewPlan} className="flex-shrink-0">
        Review Updated Plan
      </Button>
    </div>
  )
}
