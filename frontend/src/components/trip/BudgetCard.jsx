import { Wallet, Plus } from 'lucide-react'

export default function BudgetCard({ spent = 0, budget = 0, onOpenExpenseModal }) {
  const numBudget = Number(budget) || 0
  const numSpent = Number(spent) || 0
  const pct = numBudget > 0 ? Math.min(100, Math.round((numSpent / numBudget) * 100)) : 0
  const isOver = numBudget > 0 && numSpent > numBudget

  return (
    <div
      onClick={onOpenExpenseModal}
      className="group cursor-pointer rounded-2xl border border-border bg-card text-ink p-4 shadow-soft transition-all hover:border-secondary-400"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
          Budget Spent
        </p>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-secondary-600 group-hover:underline">
          <Plus className="h-3 w-3" /> Track
        </span>
      </div>

      <div className="mt-2 flex items-center gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isOver ? 'bg-danger-bg' : 'bg-primary-50'}`}>
          <Wallet className={`h-5 w-5 ${isOver ? 'text-danger' : 'text-secondary-600'}`} />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold text-ink truncate">
            ₹{numSpent.toLocaleString('en-IN')}{' '}
            <span className="text-xs font-medium text-ink-muted">
              / ₹{numBudget.toLocaleString('en-IN')}
            </span>
          </p>
          <p className="text-[11px] text-ink-muted">
            {isOver ? 'Exceeded by' : 'Remaining:'} ₹{Math.abs(numBudget - numSpent).toLocaleString('en-IN')} ({pct}%)
          </p>
        </div>
      </div>

      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver ? 'bg-danger' : pct > 80 ? 'bg-warning' : 'bg-secondary'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
