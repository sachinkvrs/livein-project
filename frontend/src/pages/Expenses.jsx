import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  Plus,
  Calendar,
  Trash2,
  AlertTriangle,
  Check,
  TrendingUp,
  PieChart,
  ShoppingBag,
  Car,
  Utensils,
  Hotel,
  Ticket,
  Package,
  CheckCircle2,
  Zap,
  Sparkles,
} from 'lucide-react'

import DashboardLayout from '../components/layout/DashboardLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import ExpenseModal from '../components/trip/ExpenseModal'
import { useTrip } from '../context/TripContext'

const categoryIcons = {
  Food: Utensils,
  Transport: Car,
  Accommodation: Hotel,
  Activities: Ticket,
  Shopping: ShoppingBag,
  Tickets: Ticket,
  Other: Package,
}

const categoryColors = {
  Food: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  Transport: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25',
  Accommodation: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25',
  Activities: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  Shopping: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/25',
  Tickets: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',
  Other: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-500/25',
}

const categoryBarColors = {
  Food: 'bg-amber-500',
  Transport: 'bg-sky-500',
  Accommodation: 'bg-purple-500',
  Activities: 'bg-emerald-500',
  Shopping: 'bg-pink-500',
  Tickets: 'bg-indigo-500',
  Other: 'bg-secondary-500',
}

export default function Expenses() {
  const navigate = useNavigate()
  const {
    trip,
    expenses = [],
    hasGeneratedTrip,
    addExpense,
    deleteExpense,
    predictiveBudget,
  } = useTrip()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [successToast, setSuccessToast] = useState(null)

  const destination = trip?.destination || 'Chennai'
  const totalBudget = Number(trip?.budget || trip?.tripBudget || 50000)
  const totalSpent = Number(trip?.spent || 0)
  const remaining = Math.max(0, totalBudget - totalSpent)
  const pctUsed = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0

  const categoryBreakdown = useMemo(() => {
    const map = {}
    for (const exp of expenses) {
      const cat = exp.category || 'Other'
      const amt = Number(exp.amount) || 0
      map[cat] = (map[cat] || 0) + amt
    }

    return Object.entries(map)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses, totalSpent])

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return
    setDeleting(true)
    try {
      await deleteExpense(expenseToDelete.id)
      setSuccessToast(
        `₹${Number(expenseToDelete.amount).toLocaleString('en-IN')} ${expenseToDelete.category} expense removed`
      )
      setExpenseToDelete(null)
      setTimeout(() => setSuccessToast(null), 3500)
    } catch (err) {
      console.error('[TripNova] Delete expense error:', err)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-secondary-500/30 bg-secondary-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-secondary-500">
            <Wallet className="h-3.5 w-3.5" />
            Financial Analytics
          </div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
            Trip Expenses & Budget
          </h1>
          <p className="text-sm text-ink-muted">
            Real-time spending analytics, category distribution, and predictive budget forecast for{' '}
            <strong className="text-ink capitalize font-semibold">{destination}</strong>.
          </p>
        </div>

        {hasGeneratedTrip && (
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setIsModalOpen(true)}
          >
            Add Expense
          </Button>
        )}
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-soft animate-in slide-in-from-top-2">
          <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {!hasGeneratedTrip ? (
        <EmptyState
          icon={Wallet}
          title="No Active Trip Budget"
          description="Plan a trip to track your travel expenses, view category breakdowns, and monitor your budget in real time."
          actionLabel="Plan a Trip"
          onAction={() => navigate('/plan')}
        />
      ) : (
        <div className="space-y-6">
          {/* Top Summary Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {/* Total Spent */}
            <Card className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Total Spent
              </span>
              <p className="mt-2 text-2xl font-extrabold text-ink">
                <AnimatedNumber value={totalSpent} prefix="₹" />
              </p>
              <div className="mt-2 text-xs text-ink-muted">
                Across {expenses.length} transaction{expenses.length === 1 ? '' : 's'}
              </div>
            </Card>

            {/* Total Budget */}
            <Card className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Trip Budget
              </span>
              <p className="mt-2 text-2xl font-extrabold text-ink">
                <AnimatedNumber value={totalBudget} prefix="₹" />
              </p>
              <div className="mt-2 text-xs text-ink-muted">
                Allocated budget limit
              </div>
            </Card>

            {/* Remaining Balance */}
            <Card className="p-5">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                Remaining Balance
              </span>
              <p
                className={`mt-2 text-2xl font-extrabold ${
                  totalSpent > totalBudget && totalBudget > 0
                    ? 'text-danger'
                    : 'text-secondary-500'
                }`}
              >
                <AnimatedNumber value={remaining} prefix="₹" />
              </p>
              <div className="mt-2 text-xs text-ink-muted">
                {totalSpent > totalBudget && totalBudget > 0 ? (
                  <span className="text-danger font-bold">
                    Over budget by ₹{(totalSpent - totalBudget).toLocaleString('en-IN')}
                  </span>
                ) : (
                  <span>Available to spend</span>
                )}
              </div>
            </Card>

            {/* Budget Utilization */}
            <Card className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                  Budget Usage
                </span>
                <span className="text-xs font-extrabold text-ink">
                  <AnimatedNumber value={pctUsed} suffix="%" />
                </span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={`h-full transition-all duration-700 ${
                    pctUsed >= 90
                      ? 'bg-danger'
                      : pctUsed >= 70
                      ? 'bg-amber-500'
                      : 'bg-secondary-500'
                  }`}
                  style={{ width: `${pctUsed}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-ink-muted">
                <span className="inline-flex items-center gap-1 font-semibold">
                  {pctUsed >= 90 ? (
                    <>
                      <AlertTriangle className="h-3.5 w-3.5 text-danger" /> Critical
                    </>
                  ) : pctUsed >= 70 ? (
                    <>
                      <Zap className="h-3.5 w-3.5 text-amber-500" /> Warning
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> On Track
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="font-bold text-secondary-500 hover:underline"
                >
                  + Add Expense
                </button>
              </div>
            </Card>
          </div>

          {/* Predictive Budget Forecast Card */}
          {predictiveBudget && (
            <Card variant="ai" className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-purple-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    Predictive Budget Intelligence
                  </span>
                  <h3 className="text-base font-bold text-ink mt-0.5">
                    Estimated Remaining Spend & End-of-Trip Projection
                  </h3>
                </div>
                <Badge tone={predictiveBudget.status === 'Over Budget' ? 'danger' : 'success'}>
                  {predictiveBudget.status || 'On Track'}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold text-ink-muted">Total Budget</span>
                  <p className="mt-1 text-lg font-extrabold text-ink">
                    ₹{Number(predictiveBudget.total_budget ?? totalBudget).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold text-ink-muted">Spent</span>
                  <p className="mt-1 text-lg font-extrabold text-ink">
                    ₹{Number(predictiveBudget.spent ?? totalSpent).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold text-ink-muted">Remaining</span>
                  <p className="mt-1 text-lg font-extrabold text-secondary-500">
                    ₹{Number(predictiveBudget.remaining ?? remaining).toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    Est. Remaining Spend
                  </span>
                  <p className="mt-1 text-lg font-extrabold text-ink">
                    ₹{Number(predictiveBudget.estimated_remaining_spend || 0).toLocaleString('en-IN')}
                  </p>
                  {predictiveBudget.breakdown && (
                    <p className="mt-0.5 text-[10px] text-ink-muted">
                      Activities ₹{predictiveBudget.breakdown.upcoming_activities_cost} · Transit ₹{predictiveBudget.breakdown.estimated_transport_cost} · Food ₹{predictiveBudget.breakdown.estimated_food_cost}
                    </p>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-surface p-3.5">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    {predictiveBudget.expected_overspending > 0
                      ? 'Expected Overspending'
                      : 'Expected Saving'}
                  </span>
                  <p
                    className={`mt-1 text-lg font-extrabold ${
                      predictiveBudget.expected_overspending > 0
                        ? 'text-danger'
                        : 'text-emerald-500'
                    }`}
                  >
                    ₹
                    {Number(
                      predictiveBudget.expected_overspending > 0
                        ? predictiveBudget.expected_overspending
                        : predictiveBudget.expected_saving || 0
                    ).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Budget Warning Banner if Exceeded */}
          {totalSpent > totalBudget && totalBudget > 0 && (
            <div className="flex items-center gap-3 rounded-2xl border border-danger/30 bg-danger-bg p-4 text-xs text-danger shadow-soft">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <strong className="font-bold text-sm">Budget Exceeded</strong>
                <p className="mt-0.5">
                  You are <strong>₹{(totalSpent - totalBudget).toLocaleString('en-IN')}</strong> over your planned trip budget of ₹{totalBudget.toLocaleString('en-IN')}.
                </p>
              </div>
            </div>
          )}

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Category Breakdown (1 col) */}
            <Card className="p-5">
              <CardHeader
                icon={PieChart}
                title="Category Breakdown"
                subtitle={`${categoryBreakdown.length} active spending categories`}
              />

              {categoryBreakdown.length === 0 ? (
                <p className="py-6 text-center text-xs text-ink-muted">
                  No categorized expenses yet.
                </p>
              ) : (
                <div className="space-y-4 pt-2">
                  {/* Stacked Visual Distribution Bar */}
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-muted p-0.5 gap-0.5">
                    {categoryBreakdown.map(({ category, percentage }) => (
                      <div
                        key={category}
                        className={`h-full first:rounded-l-full last:rounded-r-full transition-all duration-500 ${
                          categoryBarColors[category] || 'bg-secondary-500'
                        }`}
                        style={{ width: `${Math.max(4, percentage)}%` }}
                        title={`${category}: ${percentage}%`}
                      />
                    ))}
                  </div>

                  {categoryBreakdown.map(({ category, amount, percentage }) => {
                    const Icon = categoryIcons[category] || Package
                    const colorClass = categoryColors[category] || categoryColors.Other
                    const barColor = categoryBarColors[category] || 'bg-secondary-500'

                    return (
                      <div key={category} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span
                              className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs ${colorClass}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span className="font-bold text-ink">{category}</span>
                          </div>
                          <div className="flex items-center gap-2 font-extrabold text-ink">
                            <span>₹{amount.toLocaleString('en-IN')}</span>
                            <span className="text-[11px] font-semibold text-ink-muted">
                              ({percentage}%)
                            </span>
                          </div>
                        </div>

                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                          <div
                            className={`h-full transition-all duration-500 ${barColor}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* Expense Transaction History (2 cols) */}
            <Card className="lg:col-span-2 p-5">
              <CardHeader
                icon={TrendingUp}
                title="Expense History"
                subtitle={`${expenses.length} transaction${expenses.length === 1 ? '' : 's'} recorded`}
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Plus}
                    onClick={() => setIsModalOpen(true)}
                  >
                    Add Expense
                  </Button>
                }
              />

              {expenses.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                  <Wallet className="mx-auto h-8 w-8 text-secondary-500 mb-2" />
                  <p className="font-bold text-ink text-sm">No expenses recorded yet</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Click the "Add Expense" button above to record your first spending.
                  </p>
                  <Button
                    size="sm"
                    className="mt-4"
                    onClick={() => setIsModalOpen(true)}
                  >
                    Add First Expense
                  </Button>
                </div>
              ) : (
                <div className="space-y-2.5 pt-2">
                  {expenses.map((exp) => {
                    const Icon = categoryIcons[exp.category] || Package
                    const colorClass = categoryColors[exp.category] || categoryColors.Other

                    return (
                      <div
                        key={exp.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-surface/60 p-3.5 hover:border-secondary-500/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border text-sm ${colorClass}`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>

                          <div className="min-w-0">
                            <p className="font-bold text-ink text-sm truncate">
                              {exp.title || exp.description || `${exp.category} expense`}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
                              <span>{exp.category}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {exp.date || 'Today'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 flex-shrink-0">
                          <span className="font-extrabold text-ink text-sm">
                            ₹{Number(exp.amount).toLocaleString('en-IN')}
                          </span>

                          <button
                            type="button"
                            onClick={() => setExpenseToDelete(exp)}
                            className="rounded-lg p-1.5 text-ink-muted hover:bg-danger-bg hover:text-danger transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      <ExpenseModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        expenses={expenses}
        onAddExpense={addExpense}
        onDeleteExpense={deleteExpense}
        budget={totalBudget}
        spent={totalSpent}
        startDate={trip?.start_date || trip?.startDate}
        endDate={trip?.end_date || trip?.endDate}
      />

      {/* Delete Confirmation Modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => !deleting && setExpenseToDelete(null)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-ink shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-ink">Delete Expense?</h3>
                <p className="text-xs text-ink-muted">
                  Permanently remove this spending record
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-ink-muted leading-relaxed">
              Are you sure you want to delete this{' '}
              <strong className="text-ink">
                ₹{Number(expenseToDelete.amount).toLocaleString('en-IN')}{' '}
                {expenseToDelete.category}
              </strong>{' '}
              expense ({expenseToDelete.title || expenseToDelete.description})?
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setExpenseToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                size="sm"
                loading={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? 'Deleting...' : 'Delete Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
