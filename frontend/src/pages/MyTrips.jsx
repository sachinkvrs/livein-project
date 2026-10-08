import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  IndianRupee,
  MapPin,
  Plus,
  Loader2,
  Trash2,
  AlertTriangle,
  Check,
  AlertCircle,
  X,
  Compass,
  Map,
  Route,
  ArrowRight,
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Card from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import { useTrip } from '../context/TripContext'
import { getDestinationVisual } from '../utils/destinationVisuals'

const statusTone = {
  Upcoming: 'secondary',
  Active: 'success',
  Draft: 'warning',
  Completed: 'neutral',
}

export default function MyTrips() {
  const navigate = useNavigate()
  const {
    trips = [],
    trip: activeTrip,
    isLoadingTrip,
    tripsError,
    selectTrip,
    deleteTrip,
  } = useTrip()

  const [tripToDelete, setTripToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [successToast, setSuccessToast] = useState(null)
  const [errorToast, setErrorToast] = useState(null)

  const cancelBtnRef = useRef(null)

  // Focus Cancel button on confirmation modal open and handle Escape key
  useEffect(() => {
    if (tripToDelete) {
      cancelBtnRef.current?.focus()
      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !deleting) {
          setTripToDelete(null)
        }
      }
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [tripToDelete, deleting])

  const handleSelectTrip = (selectedTrip, targetRoute = '/dashboard') => {
    selectTrip(selectedTrip)
    navigate(targetRoute)
  }

  const handleConfirmDelete = async () => {
    if (!tripToDelete) return

    setDeleting(true)
    setErrorToast(null)

    const destinationName = tripToDelete.destination || 'Trip'

    try {
      await deleteTrip(tripToDelete.id)
      setSuccessToast(`✓ ${destinationName} trip deleted successfully`)
      setTripToDelete(null)

      setTimeout(() => {
        setSuccessToast(null)
      }, 4000)
    } catch (err) {
      console.error('[TripNova] Delete trip failed:', err)
      setErrorToast(err.message || 'Unable to delete this trip. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-secondary-500/30 bg-secondary-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-secondary-500">
            <Compass className="h-3.5 w-3.5" />
            Saved Expeditions
          </div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">My Trips</h1>
          <p className="text-sm text-ink-muted">
            Your upcoming, active, and completed travel experiences.
          </p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => navigate('/plan')}>
          Plan New Trip
        </Button>
      </div>

      {/* Success Toast */}
      {successToast && (
        <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-soft animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-500 flex-shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessToast(null)}
            className="text-emerald-500 hover:text-emerald-400 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Toast */}
      {(errorToast || tripsError) && (
        <div className="mb-5 flex items-center justify-between gap-2 rounded-xl border border-danger/20 bg-danger-bg p-3.5 text-xs font-medium text-danger shadow-soft animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-danger flex-shrink-0" />
            <span>{errorToast || tripsError}</span>
          </div>
          {errorToast && (
            <button
              type="button"
              onClick={() => setErrorToast(null)}
              className="text-danger hover:text-red-800 p-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}

      {isLoadingTrip ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-secondary-500" />
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No trips yet"
          description="Plan your first trip to unlock Map & Route and Explore Nearby."
          actionLabel="Plan New Trip"
          onAction={() => navigate('/plan')}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {trips.map((tripItem) => {
            const daysCount =
              tripItem.number_of_days || tripItem.days || tripItem.itinerary?.length || 1
            const budgetVal = Number(tripItem.budget || tripItem.tripBudget || 0)
            const visual = getDestinationVisual(tripItem.destination)
            const isActiveTrip = activeTrip?.id === tripItem.id

            const allActivities = (tripItem.itinerary || []).flatMap((d) => d.items || [])
            const doneCount = allActivities.filter((i) => i.completed).length
            const progressPct =
              allActivities.length > 0
                ? Math.round((doneCount / allActivities.length) * 100)
                : tripItem.status === 'Completed'
                ? 100
                : 25

            return (
              <Card
                key={tripItem.id}
                variant="interactive"
                className={`group flex flex-col overflow-hidden p-0 ${
                  isActiveTrip ? 'ring-2 ring-secondary-500/50 border-secondary-500' : ''
                }`}
              >
                {/* Destination Image Header */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={visual.image}
                    alt={tripItem.destination}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-md">
                      {visual.region}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isActiveTrip && (
                        <Badge tone="success">Active</Badge>
                      )}
                      <Badge tone={statusTone[tripItem.status] || 'secondary'}>
                        {tripItem.status || 'Upcoming'}
                      </Badge>
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-4 right-4">
                    <h3 className="text-xl font-extrabold text-white capitalize">
                      {tripItem.destination}
                    </h3>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-300">
                      <Calendar className="h-3.5 w-3.5 text-secondary-400" />
                      {tripItem.dateRange ||
                        (tripItem.start_date
                          ? `${tripItem.start_date} – ${tripItem.end_date}`
                          : 'Flexible Dates')}
                    </p>
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="mb-4 flex items-center justify-between text-xs">
                    <span className="rounded-lg border border-border bg-surface px-2.5 py-1 font-bold text-ink">
                      {daysCount} Day{daysCount === 1 ? '' : 's'}
                    </span>
                    {budgetVal > 0 && (
                      <span className="inline-flex items-center gap-0.5 font-extrabold text-secondary-500 text-sm">
                        <IndianRupee className="h-3.5 w-3.5" />
                        {budgetVal.toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {/* Trip Progress Bar */}
                  <div className="mb-4">
                    <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-ink-muted">
                      <span>Journey Readiness</span>
                      <span className="text-ink font-bold">{progressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-secondary-500 to-emerald-400 transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Secondary Quick Links (View Itinerary / View Map) */}
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelectTrip(tripItem, '/itinerary')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2 text-xs font-bold text-ink-muted hover:border-secondary-500/40 hover:text-ink transition-colors"
                    >
                      <Route className="h-3.5 w-3.5 text-secondary-500" />
                      View Itinerary
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectTrip(tripItem, '/map')}
                      className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface py-2 text-xs font-bold text-ink-muted hover:border-secondary-500/40 hover:text-ink transition-colors"
                    >
                      <Map className="h-3.5 w-3.5 text-secondary-500" />
                      View Map
                    </button>
                  </div>

                  {/* Primary Action + Delete */}
                  <div className="mt-auto flex items-center gap-2 pt-3 border-t border-border/60">
                    <Button
                      size="sm"
                      fullWidth
                      rightIcon={ArrowRight}
                      onClick={() => handleSelectTrip(tripItem, '/dashboard')}
                    >
                      Continue Trip
                    </Button>

                    <button
                      type="button"
                      onClick={() => setTripToDelete(tripItem)}
                      title={`Delete ${tripItem.destination} trip`}
                      aria-label={`Delete ${tripItem.destination} trip`}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-border bg-surface text-ink-muted transition-colors hover:border-danger/30 hover:bg-danger-bg hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => !deleting && setTripToDelete(null)}
            aria-hidden="true"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-trip-title"
            className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 text-ink shadow-2xl animate-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-danger-bg text-danger">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 id="delete-trip-title" className="text-lg font-bold text-ink">
                  Delete Trip?
                </h3>
                <p className="text-xs text-ink-muted">
                  Permanent removal of trip itinerary and expenses
                </p>
              </div>
            </div>

            <p className="mt-4 text-sm text-ink-muted leading-relaxed">
              Are you sure you want to delete your{' '}
              <strong className="text-ink capitalize font-semibold">
                {tripToDelete.destination}
              </strong>{' '}
              trip? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                ref={cancelBtnRef}
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => setTripToDelete(null)}
              >
                Cancel
              </Button>

              <Button
                variant="danger"
                size="sm"
                loading={deleting}
                onClick={handleConfirmDelete}
              >
                {deleting ? 'Deleting...' : 'Delete Trip'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
