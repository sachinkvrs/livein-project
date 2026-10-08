import { MapPin, Calendar, Users, Wallet } from 'lucide-react'

function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return dateStr
  }
}

export default function TripSummary({ trip }) {
  if (!trip) return null

  const dest = trip.destination || trip.category || 'Custom Trip'
  const daysCount = trip.number_of_days || trip.days || (trip.itinerary ? trip.itinerary.length : 1)
  const travellersCount = trip.travellers || 1

  let dateDisplay = trip.dateRange
  if (!dateDisplay && (trip.startDate || trip.start_date)) {
    const s = formatDateDisplay(trip.startDate || trip.start_date)
    const e = formatDateDisplay(trip.endDate || trip.end_date)
    dateDisplay = e && e !== s ? `${s} – ${e}` : s
  }
  if (!dateDisplay) {
    dateDisplay = 'Dates not set'
  }

  const budgetDisplay = trip.budget || trip.tripBudget

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-muted">
      <div className="flex items-center gap-1.5 text-base font-semibold text-ink">
        <MapPin className="h-4 w-4 text-secondary-600" />
        <span className="capitalize">{dest}</span> · {daysCount} day{daysCount === 1 ? '' : 's'}
      </div>
      <div className="flex items-center gap-1.5">
        <Calendar className="h-4 w-4" />
        <span>{dateDisplay}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        <span>{travellersCount} traveller{travellersCount === 1 ? '' : 's'}</span>
      </div>
      {budgetDisplay > 0 && (
        <div className="flex items-center gap-1.5 font-medium text-ink">
          <Wallet className="h-4 w-4 text-ink-muted" />
          <span>Budget: ₹{Number(budgetDisplay).toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  )
}
