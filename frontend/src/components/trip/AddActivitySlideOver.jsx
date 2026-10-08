import { useState, useEffect, useRef, useMemo } from 'react'
import {
  X,
  Search,
  MapPin,
  Star,
  Clock,
  IndianRupee,
  Plus,
  Check,
  AlertCircle,
  Sparkles,
  Loader2,
  Calendar,
  AlertTriangle,
} from 'lucide-react'
import { searchPlaces, getSuggestedPlaces } from '../../services/tripService'
import Button from '../ui/Button'

export default function AddActivitySlideOver({
  isOpen,
  onClose,
  destination = 'Chennai',
  itinerary = [],
  initialDay = 1,
  onAddActivity,
}) {
  const [targetDay, setTargetDay] = useState(initialDay)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [suggestions, setSuggestions] = useState([])
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [addingPlaceId, setAddingPlaceId] = useState(null)
  const [successToast, setSuccessToast] = useState(null)
  const [errorToast, setErrorToast] = useState(null)

  // Scheduling state
  const [selectedTime, setSelectedTime] = useState('02:00 PM')
  const [selectedDuration, setSelectedDuration] = useState('2.0h')

  const panelRef = useRef(null)
  const searchInputRef = useRef(null)

  // Sync initial day
  useEffect(() => {
    if (initialDay) setTargetDay(initialDay)
  }, [initialDay])

  // Focus search input when slide-over opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 150)
    }
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Get current day's existing activity titles and times to check duplicates & conflicts
  const currentDayData = useMemo(() => {
    return itinerary.find((d) => d.day === targetDay) || itinerary[0] || { items: [] }
  }, [itinerary, targetDay])

  const existingTitles = useMemo(() => {
    return (currentDayData.items || []).map((i) =>
      (i.title || i.name || '').trim().toLowerCase()
    )
  }, [currentDayData])

  // Check schedule conflict
  const scheduleConflict = useMemo(() => {
    if (!selectedTime) return null
    const match = (currentDayData.items || []).find(
      (item) => item.time?.trim().toLowerCase() === selectedTime.trim().toLowerCase()
    )
    return match ? match.title : null
  }, [currentDayData, selectedTime])

  // Fetch destination suggestions on mount or destination change
  useEffect(() => {
    let mounted = true
    if (!isOpen) return

    setLoadingSuggestions(true)
    const existing = itinerary.flatMap((d) => (d.items || []).map((i) => i.title || i.name))
    
    getSuggestedPlaces(destination, existing)
      .then((data) => {
        if (mounted) {
          setSuggestions(data || [])
          setLoadingSuggestions(false)
        }
      })
      .catch((err) => {
        console.warn('[TripNova SlideOver] Failed to load suggestions:', err)
        if (mounted) setLoadingSuggestions(false)
      })

    return () => {
      mounted = false
    }
  }, [isOpen, destination, itinerary])

  // Debounced search
  useEffect(() => {
    let mounted = true
    const query = searchQuery.trim()

    if (!query) {
      setSearchResults([])
      setLoadingSearch(false)
      return
    }

    setLoadingSearch(true)
    const timer = setTimeout(() => {
      searchPlaces(query, destination)
        .then((data) => {
          if (mounted) {
            setSearchResults(data || [])
            setLoadingSearch(false)
          }
        })
        .catch((err) => {
          console.warn('[TripNova SlideOver] Search failed:', err)
          if (mounted) setLoadingSearch(false)
        })
    }, 280)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [searchQuery, destination])

  const handleAdd = async (place) => {
    setAddingPlaceId(place.id || place.place_id || place.title)
    setErrorToast(null)
    setSuccessToast(null)

    try {
      const activityPayload = {
        title: place.title || place.name,
        name: place.name || place.title,
        place_id: place.place_id,
        category: place.category || 'Attraction',
        subcategory: place.subcategory || '',
        area: place.area || destination,
        description: place.description || '',
        estimated_cost: place.estimated_cost || 0,
        rating: place.rating || 4.5,
        latitude: place.latitude,
        longitude: place.longitude,
        time: selectedTime || '02:00 PM',
        duration: selectedDuration || place.duration || '1.5h',
        indoor: Boolean(place.indoor),
        outdoor: Boolean(place.outdoor),
        weatherSensitive: Boolean(place.weatherSensitive),
      }

      await onAddActivity(targetDay, activityPayload)
      setSuccessToast(`✓ ${place.title} added to Day ${targetDay}`)

      // Clear search and success message after 3.5s
      setTimeout(() => {
        setSuccessToast(null)
      }, 3500)
    } catch (err) {
      console.error('[TripNova] Add activity error:', err)
      setErrorToast(err.message || 'Failed to add activity. Please try again.')
    } finally {
      setAddingPlaceId(null)
    }
  }

  if (!isOpen) return null

  const displayList = searchQuery.trim() ? searchResults : suggestions

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over panel container */}
      <div className="fixed inset-y-0 right-0 flex max-w-full pl-6 sm:pl-10">
        <div
          ref={panelRef}
          className="w-screen max-w-md transform bg-card text-ink shadow-2xl transition-transform duration-300 ease-in-out sm:max-w-lg flex flex-col"
        >
          {/* Header */}
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Plus className="h-5 w-5 text-secondary-600" />
                  Add Activity
                </h2>
                <p className="text-xs text-ink-muted mt-0.5">
                  Discover and schedule places for <span className="font-semibold text-ink capitalize">{destination}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="rounded-xl p-2 text-ink-muted hover:bg-surface hover:text-ink transition-colors"
                aria-label="Close panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Target Day & Scheduling Bar */}
            <div className="mt-4 grid grid-cols-3 gap-2.5 rounded-xl bg-surface p-3 border border-border/80 text-xs">
              {/* Day Selector */}
              <div>
                <label className="block font-semibold text-ink-muted mb-1">Target Day</label>
                <select
                  value={targetDay}
                  onChange={(e) => setTargetDay(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-card py-1.5 px-2 font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  {itinerary.map((d) => (
                    <option key={d.day} value={d.day} className="bg-card text-ink">
                      Day {d.day}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Picker */}
              <div>
                <label className="block font-semibold text-ink-muted mb-1">Time Slot</label>
                <select
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card py-1.5 px-2 font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option value="09:00 AM" className="bg-card text-ink">09:00 AM</option>
                  <option value="11:30 AM" className="bg-card text-ink">11:30 AM</option>
                  <option value="01:30 PM" className="bg-card text-ink">01:30 PM</option>
                  <option value="02:00 PM" className="bg-card text-ink">02:00 PM</option>
                  <option value="03:30 PM" className="bg-card text-ink">03:30 PM</option>
                  <option value="05:00 PM" className="bg-card text-ink">05:00 PM</option>
                  <option value="07:00 PM" className="bg-card text-ink">07:00 PM</option>
                </select>
              </div>

              {/* Duration */}
              <div>
                <label className="block font-semibold text-ink-muted mb-1">Duration</label>
                <select
                  value={selectedDuration}
                  onChange={(e) => setSelectedDuration(e.target.value)}
                  className="w-full rounded-lg border border-border bg-card py-1.5 px-2 font-semibold text-ink focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  <option value="1.0h" className="bg-card text-ink">1 hour</option>
                  <option value="1.5h" className="bg-card text-ink">1.5 hours</option>
                  <option value="2.0h" className="bg-card text-ink">2 hours</option>
                  <option value="2.5h" className="bg-card text-ink">2.5 hours</option>
                  <option value="3.0h" className="bg-card text-ink">3 hours</option>
                  <option value="4.0h" className="bg-card text-ink">4 hours</option>
                </select>
              </div>
            </div>

            {/* Schedule Warning */}
            {scheduleConflict && (
              <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-warning-bg/80 px-2.5 py-1.5 text-xs font-medium text-warning border border-warning/30">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Overlaps with "{scheduleConflict}" at {selectedTime}. You can still add or select another time.</span>
              </div>
            )}

            {/* Live Search Bar */}
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                ref={searchInputRef}
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search landmarks, beaches, temples in ${destination}…`}
                className="w-full rounded-xl border border-border bg-surface py-2.5 pl-9 pr-8 text-sm text-ink placeholder:text-ink-muted focus:bg-card focus:outline-none focus:ring-2 focus:ring-secondary-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Feedback Toasts */}
          {successToast && (
            <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-success-bg p-3 text-xs font-bold text-emerald-900 dark:text-emerald-300 shadow-soft animate-in slide-in-from-top-2">
              <Check className="h-4 w-4 text-success" />
              <span>{successToast}</span>
            </div>
          )}

          {errorToast && (
            <div className="mx-5 mt-3 flex items-center gap-2 rounded-xl border border-danger/20 dark:border-rose-900/40 bg-danger-bg p-3 text-xs font-medium text-danger shadow-soft">
              <AlertCircle className="h-4 w-4 text-danger" />
              <span>{errorToast}</span>
            </div>
          )}

          {/* Results List */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted flex items-center gap-1.5">
                {searchQuery.trim() ? (
                  <>
                    <Search className="h-3.5 w-3.5 text-secondary-600" /> Search Results ({displayList.length})
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 text-secondary-600" /> Suggested for {destination} ({displayList.length})
                  </>
                )}
              </p>

              {(loadingSearch || loadingSuggestions) && (
                <div className="flex items-center gap-1 text-xs text-secondary-600">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Loading...</span>
                </div>
              )}
            </div>

            {/* Empty State */}
            {!loadingSearch && !loadingSuggestions && displayList.length === 0 && (
              <div className="rounded-2xl border border-border bg-surface-muted/60 p-8 text-center">
                <MapPin className="mx-auto h-8 w-8 text-ink-muted/60 mb-2" />
                <p className="font-semibold text-ink text-sm">No places found</p>
                <p className="text-xs text-ink-muted mt-1">
                  Try searching for another spot or landmark in {destination}.
                </p>
              </div>
            )}

            {/* Place Cards */}
            {displayList.map((place, idx) => {
              const isAlreadyAdded = existingTitles.includes(
                (place.title || place.name || '').trim().toLowerCase()
              )
              const isAdding = addingPlaceId === (place.id || place.place_id || place.title)

              return (
                <div
                  key={place.id || place.place_id || idx}
                  className={`rounded-2xl border transition-all p-4 ${
                    isAlreadyAdded
                      ? 'border-border/80 bg-surface/60 opacity-80'
                      : 'border-border bg-card shadow-soft hover:border-secondary-300 hover:shadow-card'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-ink text-sm truncate">
                          {place.title || place.name}
                        </h4>
                        {place.rating > 0 && (
                          <span className="flex items-center gap-0.5 rounded-md bg-warning-bg px-1.5 py-0.5 text-[11px] font-bold text-warning">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {place.rating}
                          </span>
                        )}
                        {place.category && (
                          <span className="rounded-md bg-secondary-50 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-700">
                            {place.category}
                          </span>
                        )}
                      </div>

                      <p className="mt-1 text-xs text-ink-muted flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-secondary-500 flex-shrink-0" />
                        <span className="truncate">{place.area || destination}</span>
                      </p>

                      {place.description && (
                        <p className="mt-1.5 text-xs text-ink-muted line-clamp-2 leading-relaxed">
                          {place.description}
                        </p>
                      )}

                      <div className="mt-2.5 flex items-center gap-3 text-[11px] text-ink-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-ink-muted" /> {place.duration || '1.5h'}
                        </span>
                        {place.estimated_cost > 0 ? (
                          <span className="flex items-center gap-0.5 font-semibold text-ink">
                            <IndianRupee className="h-3 w-3" /> {place.estimated_cost}
                          </span>
                        ) : (
                          <span className="font-medium text-success">Free Entry</span>
                        )}
                        {place.indoor && (
                          <span className="rounded bg-primary-50 px-1.5 py-0.5 text-[10px] font-semibold text-secondary-600">
                            Indoor
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex-shrink-0 pt-0.5">
                      {isAlreadyAdded ? (
                        <span className="inline-flex items-center gap-1 rounded-xl bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-muted border border-border">
                          <Check className="h-3.5 w-3.5 text-success" /> Added to Day {targetDay}
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          loading={isAdding}
                          onClick={() => handleAdd(place)}
                          icon={Plus}
                        >
                          Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-surface px-5 py-3 sm:px-6 flex items-center justify-between text-xs text-ink-muted">
            <span>
              Adding to <strong className="text-ink">Day {targetDay}</strong> at <strong className="text-ink">{selectedTime}</strong>
            </span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
