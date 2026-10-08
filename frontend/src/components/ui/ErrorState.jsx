import { AlertOctagon } from 'lucide-react'
import Button from './Button'

export default function ErrorState({
  title = 'Something went wrong',
  description = "We couldn't complete that request. Please try again.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-danger-bg px-6 py-14 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-card">
        <AlertOctagon className="h-6 w-6 text-danger" aria-hidden="true" />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-sm text-sm text-ink-muted">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
