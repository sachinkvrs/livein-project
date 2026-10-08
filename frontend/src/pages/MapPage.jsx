import { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import {
  MapPin,
  Navigation,
  Compass,
  Search,
  Plus,
  ArrowRight,
  Clock,
  Star,
  ExternalLink,
  Route as RouteIcon,
  Loader2,
  LocateFixed,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Radar,
  ShieldAlert,
} from 'lucide-react'

import DashboardLayout from '../components/layout/DashboardLayout'
import TripMap from '../components/map/TripMap'
import AddActivitySlideOver from '../components/trip/AddActivitySlideOver'
import Card, { CardHeader } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { useTrip } from '../context/TripContext'
import { searchPlaces, exploreNearbyPlaces } from '../services/tripService'
import { getCategoryIcon } from '../utils/destinationVisuals'

const EXPLORE_CATEGORIES = [
  'All',
  'Attractions',
  'Restaurants',
  'Cafes',
  'Shopping',
  'Entertainment',
  'Parks',
  'Museums',
  'Emergency services',
]

export default function MapPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()

  const {
    hasTrips,
    isLoadingTrip,
    trip,
    itinerary,
    hasGeneratedTrip,
    activeDay,
    setActiveDay,
    selectedActivity,
    setSelectedActivity,
    addActivity,
    userLocation,
    locationStatus,
    locationError,
    requestUserLocation,
  } = useTrip()

  const isExploreRoute =
    location.pathname.includes('explore') || params.get('view') === 'explore'
  const [viewTab, setViewTab] = useState(isExploreRoute ? 'explore' : 'route')

  useEffect(() => {
    if (location.pathname.includes('explore') || params.get('view') === 'explore') {
      setViewTab('explore')
    } else if (location.pathname.includes('map')) {
      setViewTab('route')
    }
  }, [location.pathname, params])

  const [filterMode, setFilterMode] = useState(() => {
    const dayParam = params.get('day')
    return dayParam ? Number(dayParam) : activeDay || 1
  })
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)

  // Explore Around Me state
  const [exploreCategory, setExploreCategory] = useState('All')
  const [nearbyData, setNearbyData] = useState({ places: [], anchor: null })
  const [isLoadingNearby, setIsLoadingNearby] = useState(false)
  const [addingPlaceId, setAddingPlaceId] = useState(null)
  const [addedBanner, setAddedBanner] = useState(null)

  const currentDestination = hasTrips && trip?.destination ? trip.destination : ''

  // Clear stale map/nearby state whenever active trip changes or is removed
  useEffect(() => {
    setNearbyData({ places: [], anchor: null })
    setSearchResults([])
    setSearchQuery('')
    setAddedBanner(null)
  }, [trip?.id, hasTrips])

  // Calculate current/today's day index
  const todayDayNumber = useMemo(() => {
    if (!trip?.startDate && !trip?.start_date) return activeDay || 1
    const start = new Date(trip.startDate || trip.start_date)
    const today = new Date()
    const diffTime = today.getTime() - start.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1
    if (diffDays >= 1 && diffDays <= (itinerary.length || 1)) {
      return diffDays
    }
    return activeDay || 1
  }, [trip, itinerary, activeDay])

  // Existing itinerary titles to exclude from nearby suggestions
  const existingTitles = useMemo(() => {
    if (!hasTrips) return []
    return itinerary.flatMap((d) =>
      (d.items || []).map((i) => String(i.title || i.name || '').trim())
    )
  }, [hasTrips, itinerary])

  // Fetch Explore Around Me places ONLY when a valid active trip exists
  const fetchNearby = useCallback(async () => {
    if (!hasTrips || !trip?.id || !currentDestination) {
      setNearbyData({ places: [], anchor: null })
      setIsLoadingNearby(false)
      return
    }

    setIsLoadingNearby(true)
    try {
      const anchorItem = itinerary[0]?.items?.[0]
      const lat = userLocation?.lat ?? anchorItem?.latitude ?? null
      const lon = userLocation?.lon ?? anchorItem?.longitude ?? null
      const res = await exploreNearbyPlaces({
        lat,
        lon,
        city: currentDestination,
        category: exploreCategory,
        radiusKm: 25,
        exclude: existingTitles,
        limit: 24,
      })
      setNearbyData(res || { places: [], anchor: null })
    } catch (err) {
      console.error('[TripNova] Explore Around Me error:', err)
      setNearbyData({ places: [], anchor: null })
    } finally {
      setIsLoadingNearby(false)
    }
  }, [hasTrips, trip?.id, userLocation, itinerary, currentDestination, exploreCategory, existingTitles])

  useEffect(() => {
    fetchNearby()
  }, [fetchNearby])

  // Places to display on the map depending on filterMode or viewTab
  const activeDayObj = useMemo(() => {
    if (!hasTrips) return null
    if (typeof filterMode === 'number') {
      return itinerary.find((d) => d.day === filterMode) || itinerary[0] || null
    }
    return null
  }, [hasTrips, itinerary, filterMode])

  const routeMapPlaces = useMemo(() => {
    if (!hasTrips) return []
    if (filterMode === 'all') {
      return itinerary.flatMap((d) =>
        (d.items || [])
          .filter((i) => i.latitude !== null && i.longitude !== null)
          .map((i) => ({
            id: i.id,
            title: i.title || i.name,
            name: i.title || i.name,
            area: i.area,
            time: i.time,
            duration: i.duration,
            note: i.note,
            latitude: i.latitude,
            longitude: i.longitude,
            rating: i.rating,
            day: d.day,
          }))
      )
    }

    if (!activeDayObj?.items) return []
    return activeDayObj.items
      .filter((i) => i.latitude !== null && i.longitude !== null)
      .map((i) => ({
        id: i.id,
        title: i.title || i.name,
        name: i.title || i.name,
        area: i.area,
        time: i.time,
        duration: i.duration,
        note: i.note,
        latitude: i.latitude,
        longitude: i.longitude,
        rating: i.rating,
        day: activeDayObj.day,
      }))
  }, [hasTrips, itinerary, filterMode, activeDayObj])

  const exploreMapPlaces = useMemo(() => {
    if (!hasTrips) return []
    return (nearbyData.places || []).map((p) => ({
      id: p.id,
      title: p.title || p.name,
      name: p.title || p.name,
      area: `${p.explore_category || p.category} · ${p.distance_km} km (${p.travel_time_min} min)`,
      time: p.open_status,
      duration: p.duration,
      note: p.description,
      latitude: p.latitude,
      longitude: p.longitude,
      rating: p.rating,
      estimated_cost: p.estimated_cost,
      category: p.category,
      explore_category: p.explore_category,
    }))
  }, [hasTrips, nearbyData.places])

  const mapPlaces = viewTab === 'explore' ? exploreMapPlaces : routeMapPlaces

  // Route geometry for the current view
  const routeGeometry = useMemo(() => {
    if (!hasTrips || viewTab === 'explore') return []
    if (filterMode === 'all') {
      return routeMapPlaces.map((p) => [Number(p.latitude), Number(p.longitude)])
    }
    return activeDayObj?.route_geometry || []
  }, [hasTrips, viewTab, filterMode, routeMapPlaces, activeDayObj])

  // Live place search with debounce (only when valid trip exists)
  useEffect(() => {
    let mounted = true
    const q = searchQuery.trim()
    if (!hasTrips || !trip?.id || !currentDestination || !q) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    const timer = setTimeout(() => {
      searchPlaces(q, currentDestination)
        .then((data) => {
          if (mounted) {
            setSearchResults(data || [])
            setIsSearching(false)
          }
        })
        .catch(() => {
          if (mounted) setIsSearching(false)
        })
    }, 300)

    return () => {
      mounted = false
      clearTimeout(timer)
    }
  }, [hasTrips, trip?.id, searchQuery, currentDestination])

  const handleSelectPlaceFromSearch = (place) => {
    setSelectedActivity({
      id: place.id || place.place_id,
      title: place.title || place.name,
      name: place.name || place.title,
      latitude: place.latitude,
      longitude: place.longitude,
      category: place.category,
      area: place.area,
      rating: place.rating,
      duration: place.duration,
      estimated_cost: place.estimated_cost,
    })
    setSearchQuery('')
    setSearchResults([])
  }

  const handleAddActivitySubmit = async (targetDay, activityData) => {
    await addActivity(targetDay, activityData)
    setFilterMode(targetDay)
    setActiveDay(targetDay)
  }

  const handleAddNearbyToTodayPlan = async (place) => {
    const targetDay = typeof filterMode === 'number' ? filterMode : todayDayNumber
    setAddingPlaceId(place.id)
    setAddedBanner(null)
    try {
      await addActivity(targetDay, {
        title: place.title || place.name,
        name: place.title || place.name,
        place_id: place.place_id,
        category: place.category || place.explore_category || 'Attraction',
        subcategory: place.subcategory || '',
        area: place.area || currentDestination,
        duration: place.duration || '1.5h',
        time: '04:30 PM',
        estimated_cost: Number(place.estimated_cost || 0),
        latitude: place.latitude,
        longitude: place.longitude,
        rating: place.rating || 4.5,
        indoor: Boolean(place.indoor),
        outdoor: Boolean(place.outdoor),
        weatherSensitive: Boolean(place.weatherSensitive),
        note: `Added via Explore Around Me (${place.distance_km} km away · ${place.open_status})`,
      })
      setActiveDay(targetDay)
      setAddedBanner(
        `Added "${place.title || place.name}" to Day ${targetDay}'s Plan! Route, map, and schedule updated.`
      )
    } finally {
      setAddingPlaceId(null)
    }
  }

  const openGoogleMapsDirections = (lat, lon) => {
    if (!lat || !lon) return
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  if (isLoadingTrip || !hasTrips || !trip?.id) {
    return null
  }

  return (
    <DashboardLayout>
      {/* Header & View Mode Switcher */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
            <Compass className="h-6 w-6 text-secondary-600" />
            {viewTab === 'explore'
              ? 'Explore Around Me — Nearby Discovery'
              : 'Trip Map & Route Navigation'}
          </h1>
          <p className="text-sm text-ink-muted">
            {viewTab === 'explore' ? (
              <>
                Real-time nearby attractions, cafes, restaurants, parks, museums, and emergency services around{' '}
                <strong className="text-ink capitalize font-semibold">{currentDestination}</strong>.
              </>
            ) : (
              <>
                Interactive routing, waypoints, and directions for{' '}
                <strong className="text-ink capitalize font-semibold">{currentDestination}</strong>.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setViewTab('route')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewTab === 'route'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <RouteIcon className="h-3.5 w-3.5" />
              Trip Route Map
            </button>
            <button
              type="button"
              onClick={() => setViewTab('explore')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                viewTab === 'explore'
                  ? 'bg-secondary text-white shadow-xs'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Radar className="h-3.5 w-3.5" />
              Explore Around Me
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            icon={LocateFixed}
            onClick={requestUserLocation}
          >
            {locationStatus === 'locating' ? 'Locating…' : 'Use My GPS'}
          </Button>

          {hasGeneratedTrip && (
            <Button
              size="sm"
              icon={Plus}
              onClick={() => setIsSlideOverOpen(true)}
            >
              + Add Place
            </Button>
          )}
        </div>
      </div>

      {/* Geolocation Permission Fallback Notice */}
      {locationError && viewTab === 'explore' && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-amber-300/60 dark:border-amber-800 bg-warning-bg p-3 text-xs text-ink">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
            <span>
              <strong>City Center Anchor Active:</strong> {locationError} Showing places around {currentDestination}.
            </span>
          </div>
          <button
            type="button"
            onClick={requestUserLocation}
            className="font-bold text-secondary-600 hover:underline flex-shrink-0"
          >
            Retry GPS
          </button>
        </div>
      )}

      {/* Added to Plan Confirmation Banner */}
      {addedBanner && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-success-bg p-3.5 text-xs text-ink">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
            <span className="font-semibold">{addedBanner}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/itinerary?day=${typeof filterMode === 'number' ? filterMode : todayDayNumber}`)}
            >
              View Itinerary →
            </Button>
            <button
              type="button"
              onClick={() => setAddedBanner(null)}
              className="text-ink-muted hover:text-ink font-bold px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* EXPLORE AROUND ME VIEW (Map + List) */}
      {viewTab === 'explore' ? (
        <div className="space-y-5">
          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {EXPLORE_CATEGORIES.map((cat) => {
              const active = exploreCategory === cat
              const isEmergency = cat === 'Emergency services'
              const CatIcon = isEmergency ? ShieldAlert : getCategoryIcon(cat)
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setExploreCategory(cat)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                    active
                      ? isEmergency
                        ? 'bg-danger text-white shadow-soft'
                        : 'bg-secondary-500 text-white shadow-glow'
                      : 'border border-border bg-card text-ink-muted hover:border-secondary-400 hover:text-ink'
                  }`}
                >
                  <CatIcon className="h-3.5 w-3.5" />
                  <span>{isEmergency ? 'Emergency Services' : cat}</span>
                </button>
              )
            })}
          </div>

          {/* Map + Nearby Cards Grid */}
          <div className="grid gap-5 lg:grid-cols-[1fr_420px]">
            {/* Left: Interactive Map showing all nearby places */}
            <Card className="overflow-hidden p-0">
              <div className="h-[540px] w-full">
                <TripMap
                  places={exploreMapPlaces}
                  activePlace={selectedActivity}
                  routeGeometry={[]}
                  dayNumber={todayDayNumber}
                  onSelectPlace={(place) => setSelectedActivity(place)}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 text-xs">
                <span className="text-ink">
                  Showing <strong>{exploreMapPlaces.length} nearby places</strong> in{' '}
                  <strong>{exploreCategory}</strong>
                </span>
                <span className="text-ink-muted">
                  Target Day for additions: <strong className="text-ink">Day {typeof filterMode === 'number' ? filterMode : todayDayNumber}</strong>
                </span>
              </div>
            </Card>

            {/* Right: Scrollable Nearby Places List */}
            <div className="space-y-3 max-h-[590px] overflow-y-auto pr-1">
              {isLoadingNearby ? (
                <Card className="p-8 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-secondary-600 mb-2" />
                  <p className="text-xs font-semibold text-ink-muted">
                    Scanning nearby {exploreCategory.toLowerCase()}…
                  </p>
                </Card>
              ) : (nearbyData.places || []).length === 0 ? (
                <Card className="p-8 text-center">
                  <MapPin className="mx-auto h-7 w-7 text-ink-muted mb-2" />
                  <p className="text-sm font-bold text-ink">No places found in this category</p>
                  <p className="text-xs text-ink-muted mt-1">
                    Try selecting &ldquo;All&rdquo; or another category filter.
                  </p>
                </Card>
              ) : (
                (nearbyData.places || []).map((place) => {
                  const isSelected = selectedActivity?.id === place.id
                  const isEmergency = place.explore_category === 'Emergency services'
                  return (
                    <Card
                      key={place.id}
                      onClick={() => setSelectedActivity(place)}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-secondary ring-1 ring-secondary shadow-soft'
                          : 'hover:border-secondary-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <Badge tone={isEmergency ? 'danger' : 'secondary'}>
                              {place.explore_category || place.category}
                            </Badge>
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                              ● {place.open_status || 'Open Now'}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-ink truncate">
                            {place.title || place.name}
                          </h3>
                          <p className="text-[11px] text-ink-muted truncate mt-0.5">
                            {place.area}
                          </p>
                        </div>

                        <span className="flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning flex-shrink-0">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {place.rating}
                        </span>
                      </div>

                      {/* Distance, Travel Time & Approx Cost */}
                      <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-surface p-2.5 text-[11px] border border-border/60">
                        <div>
                          <span className="block text-ink-muted">Distance</span>
                          <strong className="font-bold text-ink">{place.distance_km} km</strong>
                        </div>
                        <div>
                          <span className="block text-ink-muted">Travel Time</span>
                          <strong className="font-bold text-ink">~{place.travel_time_min} min</strong>
                        </div>
                        <div>
                          <span className="block text-ink-muted">Approx. Cost</span>
                          <strong className="font-bold text-ink">
                            {Number(place.estimated_cost) > 0
                              ? `₹${Number(place.estimated_cost).toLocaleString('en-IN')}`
                              : 'Free'}
                          </strong>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            openGoogleMapsDirections(place.latitude, place.longitude)
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-secondary-600 hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Directions
                        </button>

                        <Button
                          size="sm"
                          icon={addingPlaceId === place.id ? Loader2 : Plus}
                          disabled={addingPlaceId === place.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleAddNearbyToTodayPlan(place)
                          }}
                        >
                          {addingPlaceId === place.id
                            ? 'Adding…'
                            : `Add to Today's Plan`}
                        </Button>
                      </div>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </div>
      ) : !hasGeneratedTrip || itinerary.length === 0 ? (
        <Card className="p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-50">
            <MapPin className="h-8 w-8 text-secondary-600" />
          </div>
          <h2 className="text-xl font-bold text-ink">No Trip Planned Yet</h2>
          <p className="mt-2 text-sm text-ink-muted max-w-md mx-auto">
            Plan a trip to view interactive routes, or switch to &ldquo;Explore Around Me&rdquo; above to discover nearby places right now.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => setViewTab('explore')}>
              Explore Around Me
            </Button>
            <Button onClick={() => navigate('/plan')}>
              Plan a Trip
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {/* Day Filters Bar & Quick Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
              {itinerary.map((d) => (
                <button
                  key={d.day}
                  type="button"
                  onClick={() => {
                    setFilterMode(d.day)
                    setActiveDay(d.day)
                    setSelectedActivity(null)
                  }}
                  className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                    filterMode === d.day
                      ? 'bg-secondary text-white shadow-soft ring-1 ring-secondary-400'
                      : 'border border-border bg-card text-ink hover:border-secondary-300'
                  }`}
                >
                  Day {d.day}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  setFilterMode('all')
                  setSelectedActivity(null)
                }}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  filterMode === 'all'
                    ? 'bg-primary text-white shadow-soft'
                    : 'border border-border bg-card text-ink hover:border-primary'
                }`}
              >
                All Days ({routeMapPlaces.length})
              </button>

              <button
                type="button"
                onClick={() => {
                  setFilterMode(todayDayNumber)
                  setActiveDay(todayDayNumber)
                  setSelectedActivity(null)
                }}
                className="rounded-xl border border-secondary-300 bg-secondary-50/50 dark:bg-secondary-950/30 px-3 py-2 text-xs font-bold text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100"
              >
                Today (Day {todayDayNumber})
              </button>
            </div>

            {/* Quick Place Search on Map */}
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search spots in ${currentDestination}…`}
                className="w-full rounded-xl border border-border bg-card py-2 pl-9 pr-8 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-secondary-400"
              />
              {isSearching && (
                <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-secondary-600" />
              )}

              {/* Search dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute right-0 top-full mt-1 w-full rounded-xl border border-border bg-card p-1.5 shadow-card z-50 max-h-60 overflow-y-auto">
                  {searchResults.map((p, idx) => (
                    <button
                      key={p.id || idx}
                      type="button"
                      onClick={() => handleSelectPlaceFromSearch(p)}
                      className="flex w-full items-start gap-2 rounded-lg p-2 text-left hover:bg-surface text-xs text-ink"
                    >
                      <MapPin className="h-3.5 w-3.5 text-secondary-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink truncate">{p.title || p.name}</p>
                        <p className="text-[10px] text-ink-muted truncate">{p.area || p.category}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Map Layout: Large Map on Left, Selected Stop / Waypoints Panel on Right */}
          <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
            {/* Map Canvas */}
            <Card className="overflow-hidden p-0">
              <div className="h-[520px] w-full">
                <TripMap
                  places={mapPlaces}
                  activePlace={selectedActivity}
                  routeGeometry={routeGeometry}
                  dayNumber={typeof filterMode === 'number' ? filterMode : 1}
                  onSelectPlace={(place) => setSelectedActivity(place)}
                />
              </div>

              {/* Bottom Route Status Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-3 text-xs">
                <div className="flex items-center gap-2 text-ink">
                  <RouteIcon className="h-4 w-4 text-secondary-600" />
                  <span>
                    Viewing <strong>{mapPlaces.length} locations</strong> on{' '}
                    <strong>{filterMode === 'all' ? 'All Days' : `Day ${filterMode}`}</strong>
                  </span>
                </div>

                {activeDayObj && (
                  <div className="flex items-center gap-4 text-ink-muted">
                    <span>
                      Distance: <strong className="text-ink">{activeDayObj.distance_km || 0} km</strong>
                    </span>
                    {activeDayObj.estimated_time_min > 0 && (
                      <span>
                        Drive time: <strong className="text-ink">~{activeDayObj.estimated_time_min} min</strong>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Card>

            {/* Right Side: Selected Location Detail & Waypoints List */}
            <div className="space-y-4">
              {selectedActivity ? (
                <Card className="border-secondary-300 shadow-soft p-5 animate-in fade-in">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="rounded-md bg-secondary-50 dark:bg-secondary-950/40 px-2 py-0.5 text-[11px] font-bold text-secondary-700 dark:text-secondary-300">
                        Selected Stop
                      </span>
                      <h3 className="mt-1.5 text-base font-bold text-ink">
                        {selectedActivity.title || selectedActivity.name}
                      </h3>
                      {selectedActivity.area && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-muted">
                          <MapPin className="h-3.5 w-3.5 text-secondary-600" />
                          {selectedActivity.area}
                        </p>
                      )}
                    </div>

                    {selectedActivity.rating > 0 && (
                      <span className="flex items-center gap-1 rounded-full bg-warning-bg px-2 py-0.5 text-xs font-bold text-warning">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {selectedActivity.rating}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs border-t border-border/80 pt-3">
                    {selectedActivity.time && (
                      <div className="flex items-center gap-1 text-ink-muted">
                        <Clock className="h-3.5 w-3.5 text-secondary-600" />
                        <span>{selectedActivity.time}</span>
                      </div>
                    )}
                    {selectedActivity.duration && (
                      <div className="text-ink-muted">
                        Duration: <strong className="text-ink">{selectedActivity.duration}</strong>
                      </div>
                    )}
                  </div>

                  {selectedActivity.note && (
                    <p className="mt-2 text-xs text-ink-muted leading-relaxed line-clamp-3">
                      {selectedActivity.note}
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2">
                    <Button
                      size="sm"
                      fullWidth
                      variant="outline"
                      icon={ExternalLink}
                      onClick={() =>
                        openGoogleMapsDirections(
                          selectedActivity.latitude,
                          selectedActivity.longitude
                        )
                      }
                    >
                      Open in Google Maps
                    </Button>

                    <Button
                      size="sm"
                      fullWidth
                      icon={ArrowRight}
                      onClick={() =>
                        navigate(
                          `/itinerary?day=${
                            selectedActivity.day ||
                            (typeof filterMode === 'number' ? filterMode : 1)
                          }`
                        )
                      }
                    >
                      View in Itinerary
                    </Button>
                  </div>
                </Card>
              ) : (
                <Card className="p-5 text-center">
                  <MapPin className="mx-auto h-7 w-7 text-secondary-500 mb-1.5" />
                  <p className="font-bold text-ink text-sm">Select a Stop</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Click any numbered marker on the map to view directions and details.
                  </p>
                </Card>
              )}

              {/* Waypoints Sequence List */}
              <Card className="p-4">
                <p className="mb-3 font-bold text-ink text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <RouteIcon className="h-4 w-4 text-secondary-600" />
                  Stop Sequence ({routeMapPlaces.length})
                </p>

                <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {routeMapPlaces.map((p, idx) => {
                    const isSelected =
                      selectedActivity &&
                      (selectedActivity.id === p.id ||
                        selectedActivity.title === p.title)

                    return (
                      <button
                        key={p.id || idx}
                        type="button"
                        onClick={() => setSelectedActivity(p)}
                        className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-secondary-50 dark:bg-secondary-950/40 font-bold text-secondary-700 dark:text-secondary-300 ring-1 ring-secondary-300'
                            : 'hover:bg-surface text-ink-muted hover:text-ink'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                          <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-secondary text-white font-bold text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="truncate">{p.title || p.name}</span>
                        </div>
                        {p.time && (
                          <span className="text-[10px] text-ink-muted flex-shrink-0">
                            {p.time}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Add Activity Slide-Over Panel */}
      <AddActivitySlideOver
        isOpen={isSlideOverOpen}
        onClose={() => setIsSlideOverOpen(false)}
        destination={currentDestination}
        itinerary={itinerary}
        initialDay={typeof filterMode === 'number' ? filterMode : 1}
        onAddActivity={handleAddActivitySubmit}
      />
    </DashboardLayout>
  )
}
