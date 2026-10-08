import { useState, useEffect } from 'react'
import {
  Plus,
  X,
  IndianRupee,
  Calendar,
  FileText,
  Trash2,
  AlertTriangle,
  Check,
  AlertCircle,
  Tag,
} from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'

const categoryOptions = [
  { value: 'Food', label: '🍔 Food & Dining' },
  { value: 'Transport', label: '🚗 Transport & Cab' },
  { value: 'Accommodation', label: '🏨 Accommodation & Hotel' },
  { value: 'Activities', label: '🎟️ Activities & Sights' },
  { value: 'Shopping', label: '🛍️ Shopping & Souvenirs' },
  { value: 'Tickets', label: '✈️ Tickets & Transit' },
  { value: 'Other', label: '📦 Other Expenses' },
]

export default function ExpenseModal({
  isOpen,
  onClose,
  expenses = [],
  onAddExpense,
  onDeleteExpense,
  budget = 0,
  spent = 0,
  startDate = null,
  endDate = null,
}) {
  const [category, setCategory] = useState('Food')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState('add') // 'add' | 'list'
  const [errorMsg, setErrorMsg] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)
  const [expenseToDelete, setExpenseToDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null)
      setSuccessMsg(null)
      setExpenseToDelete(null)
      if (startDate) {
        setDate(startDate)
      } else {
        setDate(new Date().toISOString().split('T')[0])
      }
    }
  }, [isOpen, startDate])

  const totalBudget = Number(budget) || 0
  const totalSpent = Number(spent) || 0
  const remaining = Math.max(0, totalBudget - totalSpent)
  const pct = totalBudget > 0 ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid expense amount greater than 0.')
      return
    }

    if (!category) {
      setErrorMsg('Please select an expense category.')
      return
    }

    setSubmitting(true)
    try {
      const payload = {
        category,
        amount: numAmount,
        title: description.trim() || `${category} expense`,
        description: description.trim(),
        date: date || new Date().toISOString().split('T')[0],
      }

      await onAddExpense(payload)
      setSuccessMsg(`✓ ₹${numAmount.toLocaleString('en-IN')} ${category} expense added successfully`)
      setAmount('')
      setDescription('')
      setCategory('Food')

      setTimeout(() => {
        setSuccessMsg(null)
        onClose()
      }, 1200)
    } catch (err) {
      console.error('[TripNova Expense] Submit error:', err)
      setErrorMsg(err.message || 'Unable to add expense. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConfirmDelete = async (expId) => {
    setDeletingId(expId)
    setErrorMsg(null)
    try {
      await onDeleteExpense(expId)
      setExpenseToDelete(null)
    } catch (err) {
      console.error('[TripNova Expense] Delete error:', err)
      setErrorMsg(err.message || 'Unable to delete expense. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Trip Expense Tracker">
      <div className="space-y-4">
        {/* Budget Overview Card */}
        <div className="rounded-xl border border-border bg-surface-muted p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Spent so far
              </p>
              <p className="text-xl font-bold text-ink">
                ₹{totalSpent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Remaining
              </p>
              <p
                className={`text-xl font-bold ${
                  totalSpent > totalBudget && totalBudget > 0
                    ? 'text-danger'
                    : 'text-secondary-600'
                }`}
              >
                ₹{remaining.toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                pct >= 90 ? 'bg-danger' : pct >= 70 ? 'bg-warning' : 'bg-secondary'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>

          <div className="mt-1.5 flex justify-between text-xs text-ink-muted">
            <span>Total: ₹{totalBudget.toLocaleString('en-IN')}</span>
            <span>{pct}% Used</span>
          </div>

          {totalSpent > totalBudget && totalBudget > 0 && (
            <div className="mt-2.5 flex items-center gap-1.5 rounded-lg bg-danger-bg p-2 text-xs font-bold text-danger">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                Budget exceeded: You are ₹
                {(totalSpent - totalBudget).toLocaleString('en-IN')} over your planned budget.
              </span>
            </div>
          )}
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-xl border border-border bg-surface p-1">
          <button
            type="button"
            onClick={() => setActiveTab('add')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'add'
                ? 'bg-card text-ink shadow-soft'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            + Add New Expense
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'list'
                ? 'bg-card text-ink shadow-soft'
                : 'text-ink-muted hover:text-ink'
            }`}
          >
            Expense History ({expenses.length})
          </button>
        </div>

        {/* Messages */}
        {successMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-success-bg p-3 text-xs font-bold text-emerald-900 dark:text-emerald-300 shadow-soft animate-in fade-in">
            <Check className="h-4 w-4 text-success flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-xl border border-danger/20 dark:border-rose-900/40 bg-danger-bg p-3 text-xs font-medium text-danger shadow-soft animate-in fade-in">
            <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {activeTab === 'add' ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {/* Category Select */}
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Expense Category <span className="text-danger">*</span>
              </label>
              <Select
                name="category"
                options={categoryOptions}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Amount (₹) <span className="text-danger">*</span>
                </label>
                <Input
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="₹ Enter amount"
                  icon={IndianRupee}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-muted mb-1">
                  Date
                </label>
                <Input
                  name="date"
                  type="date"
                  icon={Calendar}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1">
                Description (Optional)
              </label>
              <Input
                name="description"
                placeholder="e.g. Lunch at Marina Beach, Taxi ride"
                icon={FileText}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                disabled={submitting}
                onClick={onClose}
              >
                Cancel
              </Button>

              <Button
                type="submit"
                size="sm"
                loading={submitting}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                {submitting ? 'Adding Expense...' : 'Add Expense'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-2.5 pr-1">
            {expenses.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-muted">
                No expenses recorded yet for this trip.
              </div>
            ) : (
              expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="flex flex-col rounded-xl border border-border bg-card p-3 shadow-soft space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-ink truncate text-sm">
                        {exp.title || exp.description || `${exp.category} expense`}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-ink-muted mt-0.5">
                        <span className="rounded bg-secondary-50 dark:bg-secondary-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-700 dark:text-secondary-300">
                          {exp.category}
                        </span>
                        <span>{exp.date || 'Today'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="font-extrabold text-ink text-sm">
                        ₹{Number(exp.amount).toLocaleString('en-IN')}
                      </span>
                      {onDeleteExpense && (
                        <button
                          type="button"
                          onClick={() => setExpenseToDelete(exp)}
                          className="rounded-lg p-1 text-ink-muted hover:bg-danger-bg hover:text-danger transition-colors"
                          title="Delete expense"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Delete Confirmation */}
                  {expenseToDelete?.id === exp.id && (
                    <div className="flex items-center justify-between rounded-lg bg-danger-bg p-2 text-xs text-danger animate-in fade-in">
                      <span className="font-medium">
                        Delete ₹{Number(exp.amount).toLocaleString('en-IN')} {exp.category}?
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpenseToDelete(null)}
                          className="rounded border border-border bg-card px-2 py-0.5 text-xs text-ink hover:bg-surface"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === exp.id}
                          onClick={() => handleConfirmDelete(exp.id)}
                          className="rounded bg-danger px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-600"
                        >
                          {deletingId === exp.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
