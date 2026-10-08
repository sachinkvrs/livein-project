import {
  createContext,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react'

import { defaultTripForm } from '../data/mockTrips'

import {
  getTrip,
  listTrips,
  updateTrip as updateTripApi,
  updateItinerary as updateItineraryApi,
  addTripActivity as addTripActivityApi,
  completeTripActivity as completeTripActivityApi,
  deleteTripActivity as deleteTripActivityApi,
  deleteTrip as deleteTripApi,
  optimizeDayRoute as optimizeDayRouteApi,
  applyOptimizedDayRoute as applyOptimizedDayRouteApi,
  generateQuickPlan as generateQuickPlanApi,
  applyQuickPlan as applyQuickPlanApi,
  getDecisionCenter as getDecisionCenterApi,
  simulateTripScenario as simulateTripScenarioApi,
  applySimulatedPlan as applySimulatedPlanApi,
} from '../services/tripService'

import {
  getWeather as getWeatherApi,
} from '../services/weatherService'

import {
  addExpense as addExpenseApi,
  deleteExpense as deleteExpenseApi,
} from '../services/expenseService'

import {
  simulateWeatherAlert as simulateAlertApi,
  acceptReplan as acceptReplanApi,
} from '../services/alertService'

import { useAuth } from './AuthContext'

const TripContext = createContext(null)

function parseTimeMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 9 * 60
  const m = timeStr.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i)
  if (!m) return 9 * 60
  let hr = parseInt(m[1], 10)
  const min = parseInt(m[2], 10)
  const period = (m[3] || '').toUpperCase()
  if (period === 'PM' && hr < 12) hr += 12
  if (period === 'AM' && hr === 12) hr = 0
  return hr * 60 + min
}

function minutesToTimeStr(totalMinutes) {
  const clamped = ((Math.round(totalMinutes) % 1440) + 1440) % 1440
  const h24 = Math.floor(clamped / 60)
  const m = clamped % 60
  const period = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`
}

function haversineDistKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 2.4
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDeviationLabel(diffMin) {
  if (diffMin === null || diffMin === undefined || isNaN(diffMin)) return 'On schedule'
  if (Math.abs(diffMin) <= 5) return 'On time'
  const sign = diffMin > 0 ? '+' : '-'
  const abs = Math.abs(Math.round(diffMin))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  const parts = []
  if (h > 0) parts.push(`${h} hour${h === 1 ? '' : 's'}`)
  if (m > 0) parts.push(`${m} minute${m === 1 ? '' : 's'}`)
  return `${sign}${parts.join(' ')}`
}

function parseDurationHours(durStr) {
  if (!durStr) return 1.5
  if (typeof durStr === 'number') return durStr
  const str = String(durStr).trim().toLowerCase()
  const match = str.match(/(\d+(?:\.\d+)?)/)
  if (!match) return 1.5
  const val = parseFloat(match[1])
  if (str.includes('m') && !str.includes('h')) return val / 60
  return val
}

export function TripProvider({ children }) {
  const { user } = useAuth()

  const [trips, setTrips] = useState([])
  const [tripsError, setTripsError] = useState(null)
  const [navigationNotice, setNavigationNotice] = useState(null)

  const [tripForm, setTripForm] = useState(defaultTripForm)
  const [trip, setTrip] = useState(null)
  const [itinerary, setItinerary] = useState([])
  const [originalItinerary, setOriginalItinerary] = useState([])
  const [hasGeneratedTrip, setHasGeneratedTrip] = useState(false)
  const [activeDay, setActiveDay] = useState(1)
  const [selectedActivity, setSelectedActivity] = useState(null)

  const [expenses, setExpenses] = useState([])
  const [weatherData, setWeatherData] = useState(null)
  const [weatherLoading, setWeatherLoading] = useState(false)

  // Smart Replanning 2.0 state
  const [activeAlert, setActiveAlert] = useState(null)
  const [replanReasons, setReplanReasons] = useState([])
  const [proposedDay, setProposedDay] = useState(null)
  const [replanChanges, setReplanChanges] = useState([])
  const [replanSummaryMetrics, setReplanSummaryMetrics] = useState(null)
  const [replanAlternatives, setReplanAlternatives] = useState([])
  const [movedToNextDay, setMovedToNextDay] = useState(null)
  const [planAccepted, setPlanAccepted] = useState(false)

  // Route Efficiency Optimizer state
  const [routeOptimizationProposal, setRouteOptimizationProposal] = useState(null)
  const [isOptimizingRoute, setIsOptimizingRoute] = useState(false)

  // Travel Time Buffer Mode ('relaxed' | 'normal' | 'safe') & Transport Mode
  const [bufferMode, setBufferModeState] = useState(() => {
    try {
      return localStorage.getItem('tripnova_buffer_mode') || 'normal'
    } catch {
      return 'normal'
    }
  })
  const [transportMode, setTransportModeState] = useState(() => {
    try {
      return localStorage.getItem('tripnova_transport_mode') || 'cab'
    } catch {
      return 'cab'
    }
  })

  // Quick Time Planner ("I Have 2 Hours") state
  const [quickPlanResult, setQuickPlanResult] = useState(null)
  const [isGeneratingQuickPlan, setIsGeneratingQuickPlan] = useState(false)

  // "What If?" Trip Simulator state
  const [simulationResult, setSimulationResult] = useState(null)
  const [isSimulatingScenario, setIsSimulatingScenario] = useState(false)

  // Live Trip Mode & Geolocation state
  const [liveTripActive, setLiveTripActive] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [locationStatus, setLocationStatus] = useState('idle') // 'idle' | 'locating' | 'granted' | 'denied' | 'fallback'
  const [locationError, setLocationError] = useState(null)
  const watchIdRef = useRef(null)

  const [isLoadingTrip, setIsLoadingTrip] = useState(true)

  const clearNavigationNotice = useCallback(() => {
    setNavigationNotice(null)
  }, [])

  const clearActiveTripState = useCallback((uid = null) => {
    setTrip(null)
    setItinerary([])
    setOriginalItinerary([])
    setExpenses([])
    setWeatherData(null)
    setWeatherLoading(false)
    setActiveAlert(null)
    setProposedDay(null)
    setReplanReasons([])
    setReplanChanges([])
    setReplanSummaryMetrics(null)
    setReplanAlternatives([])
    setMovedToNextDay(null)
    setPlanAccepted(false)
    setRouteOptimizationProposal(null)
    setQuickPlanResult(null)
    setSimulationResult(null)
    setActiveDay(1)
    setSelectedActivity(null)
    setLiveTripActive(false)
    setUserLocation(null)
    setLocationStatus('idle')
    setLocationError(null)
    setHasGeneratedTrip(false)
    if (uid) {
      localStorage.removeItem(`tripnova_active_trip_id_${uid}`)
    }
    localStorage.removeItem('tripnova_active_trip_id')
  }, [])

  const applyActiveTrip = useCallback(
    (activeData, uid = null) => {
      if (!activeData || !activeData.id) {
        clearActiveTripState(uid)
        return
      }
      setTrip(activeData)
      setItinerary(activeData.itinerary || [])
      setOriginalItinerary(activeData.original_itinerary || activeData.itinerary || [])
      setExpenses(activeData.expenses || [])
      setActiveAlert(activeData.active_alert || null)
      setProposedDay(null)
      setReplanReasons([])
      setReplanChanges([])
      setReplanSummaryMetrics(null)
      setReplanAlternatives([])
      setMovedToNextDay(null)
      setRouteOptimizationProposal(null)
      setQuickPlanResult(null)
      setSimulationResult(null)
      setPlanAccepted(false)
      setActiveDay(1)
      setSelectedActivity(null)
      setHasGeneratedTrip(true)

      if (uid && activeData.id) {
        localStorage.setItem(`tripnova_active_trip_id_${uid}`, activeData.id)
      }
    },
    [clearActiveTripState]
  )

  const refreshTrips = useCallback(async () => {
    if (!user?.id) {
      setTrips([])
      setTripsError(null)
      clearActiveTripState()
      setIsLoadingTrip(false)
      return []
    }

    setIsLoadingTrip(true)
    setTripsError(null)

    try {
      const userTripStorageKey = `tripnova_active_trip_id_${user.id}`
      const savedTripId = localStorage.getItem(userTripStorageKey)

      const rawTrips = await listTrips(user.id)
      const validUserTrips = Array.isArray(rawTrips)
        ? rawTrips.filter((t) => t && t.id && t.user_id === user.id)
        : []

      setTrips(validUserTrips)

      if (validUserTrips.length === 0) {
        clearActiveTripState(user.id)
        return []
      }

      // Verify savedTripId exists in the user's actual trips
      let chosenTrip = savedTripId
        ? validUserTrips.find((t) => t.id === savedTripId) || null
        : null

      if (!chosenTrip) {
        chosenTrip = validUserTrips[0]
      }

      applyActiveTrip(chosenTrip, user.id)
      return validUserTrips
    } catch (err) {
      console.error('[TripNova] Failed to load user trips:', err)
      setTrips([])
      setTripsError(err.message || 'Failed to load trips')
      clearActiveTripState(user.id)
      return []
    } finally {
      setIsLoadingTrip(false)
    }
  }, [user?.id, clearActiveTripState, applyActiveTrip])

  // Load user-scoped trips on initial mount or user change
  useEffect(() => {
    let mounted = true

    async function initUserTrip() {
      if (!user?.id) {
        if (mounted) {
          setTrips([])
          setTripsError(null)
          clearActiveTripState()
          setIsLoadingTrip(false)
        }
        return
      }

      // Immediately clear previous user's state before fetching
      setTrips([])
      setTripsError(null)
      clearActiveTripState()
      setIsLoadingTrip(true)

      try {
        const userTripStorageKey = `tripnova_active_trip_id_${user.id}`
        const savedTripId = localStorage.getItem(userTripStorageKey)

        const rawTrips = await listTrips(user.id)
        if (!mounted) return

        const validUserTrips = Array.isArray(rawTrips)
          ? rawTrips.filter((t) => t && t.id && t.user_id === user.id)
          : []

        setTrips(validUserTrips)

        if (validUserTrips.length > 0) {
          const matched = savedTripId
            ? validUserTrips.find((t) => t.id === savedTripId)
            : null
          const chosenTrip = matched || validUserTrips[0]
          applyActiveTrip(chosenTrip, user.id)
        } else {
          clearActiveTripState(user.id)
        }
      } catch (err) {
        console.error('[TripNova] Init trip error:', err)
        if (mounted) {
          setTrips([])
          setTripsError(err.message || 'Failed to load trips')
          clearActiveTripState(user.id)
        }
      } finally {
        if (mounted) setIsLoadingTrip(false)
      }
    }

    initUserTrip()
    return () => {
      mounted = false
    }
  }, [user?.id, clearActiveTripState, applyActiveTrip])

  // Continuous validation: ensure active trip always exists in user's trips and belongs to user
  useEffect(() => {
    if (isLoadingTrip) return
    if (!user?.id || trips.length === 0) {
      if (trip !== null || hasGeneratedTrip) {
        clearActiveTripState(user?.id)
      }
      return
    }

    const activeValid =
      trip?.id &&
      (!trip.user_id || trip.user_id === user.id) &&
      trips.some((t) => t.id === trip.id)

    if (!activeValid) {
      applyActiveTrip(trips[0], user.id)
    }
  }, [isLoadingTrip, user?.id, trips, trip, hasGeneratedTrip, clearActiveTripState, applyActiveTrip])

  // Keep the active trip entry inside `trips` synchronized with live itinerary/expense edits
  useEffect(() => {
    if (!trip?.id) return
    setTrips((prev) => {
      if (!prev || prev.length === 0) return prev
      const idx = prev.findIndex((t) => t.id === trip.id)
      if (idx === -1) return prev
      const current = prev[idx]
      if (
        current.itinerary === itinerary &&
        current.expenses === expenses &&
        current.spent === trip.spent
      ) {
        return prev
      }
      const next = [...prev]
      next[idx] = {
        ...current,
        ...trip,
        itinerary,
        expenses,
      }
      return next
    })
  }, [trip, itinerary, expenses])

  // Single source of truth boolean: does the authenticated user have at least one valid trip?
  const hasTrips = useMemo(() => {
    if (isLoadingTrip || !user?.id || tripsError) return false
    if (!Array.isArray(trips) || trips.length === 0) return false
    return trips.some((t) => t && t.id && (!t.user_id || t.user_id === user.id))
  }, [isLoadingTrip, user?.id, tripsError, trips])

  // Fetch live weather whenever destination or trip changes
  useEffect(() => {
    let mounted = true
    if (!hasTrips || !trip?.id || !trip?.destination) {
      setWeatherData(null)
      setWeatherLoading(false)
      return
    }

    setWeatherLoading(true)
    getWeatherApi(trip.id, trip.destination)
      .then((data) => {
        if (mounted) {
          setWeatherData(data)
          setWeatherLoading(false)
        }
      })
      .catch((err) => {
        if (mounted) {
          setWeatherLoading(false)
          console.warn('[TripNova] Weather fetch error:', err)
        }
      })

    return () => {
      mounted = false
    }
  }, [hasTrips, trip?.id, trip?.destination])

  // Geolocation management: only active when requested or when Live Trip Mode is ON
  const requestUserLocation = useCallback(() => {
    if (!trip?.destination) return
    const firstItem = itinerary?.[0]?.items?.[0]
    const fallbackCoords = {
      lat: firstItem?.latitude || 13.0827,
      lon: firstItem?.longitude || 80.2707,
      isFallback: true,
      label: `${trip.destination} Center (Estimated)`,
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setUserLocation(fallbackCoords)
      setLocationStatus('fallback')
      setLocationError('Geolocation is not supported by this browser. Using estimated trip coordinates.')
      return
    }

    setLocationStatus('locating')
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          isFallback: false,
          label: 'Live GPS Position',
        })
        setLocationStatus('granted')
        setLocationError(null)
      },
      (err) => {
        console.warn('[TripNova Live] Geolocation permission/lookup issue:', err.message)
        setUserLocation(fallbackCoords)
        setLocationStatus(err.code === 1 ? 'denied' : 'fallback')
        setLocationError(
          err.code === 1
            ? 'Location permission denied. Using current activity coordinates as estimated position.'
            : 'GPS signal unavailable indoors. Using estimated trip position.'
        )
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 60000 }
    )
  }, [itinerary, trip?.destination])

  // Start/stop geolocation watch cleanly when Live Trip Mode toggles
  useEffect(() => {
    if (!liveTripActive || !hasTrips) {
      if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      return
    }

    requestUserLocation()
  }, [liveTripActive, hasTrips, requestUserLocation])

  // Set newly generated or selected trip and update `trips` collection immediately
  const generateTrip = useCallback(
    (formData, createdTrip) => {
      const activeData = createdTrip || formData
      if (!activeData || !activeData.id) return

      const normalizedTrip = {
        ...activeData,
        user_id: activeData.user_id || user?.id,
      }

      setTripForm(formData)
      setTripsError(null)
      setNavigationNotice(null)
      setTrips((prev) => {
        const filtered = (prev || []).filter((t) => t.id !== normalizedTrip.id)
        return [normalizedTrip, ...filtered]
      })
      applyActiveTrip(normalizedTrip, user?.id)
    },
    [user?.id, applyActiveTrip]
  )

  const selectTrip = useCallback(
    (targetTrip) => {
      if (!targetTrip || !targetTrip.id) return
      if (user?.id && targetTrip.user_id && targetTrip.user_id !== user.id) return
      setNavigationNotice(null)
      applyActiveTrip(targetTrip, user?.id)
    },
    [user?.id, applyActiveTrip]
  )

  // Expense Management
  const addExpense = useCallback(
    async (expenseData) => {
      if (!trip?.id) return
      try {
        const result = await addExpenseApi(trip.id, expenseData)
        const updatedExpenses = result.expenses || [...expenses, result.expense]
        setExpenses(updatedExpenses)
        setTrip((prev) => ({
          ...prev,
          spent: result.spent,
          expenses: updatedExpenses,
        }))
        return result
      } catch (err) {
        console.error('[TripNova] Add expense error:', err)
        throw err
      }
    },
    [trip?.id, expenses]
  )

  const deleteExpense = useCallback(
    async (expenseId) => {
      if (!trip?.id) return
      try {
        const result = await deleteExpenseApi(trip.id, expenseId)
        const updatedExpenses = result.expenses || expenses.filter((e) => e.id !== expenseId)
        setExpenses(updatedExpenses)
        setTrip((prev) => ({
          ...prev,
          spent: result.spent,
          expenses: updatedExpenses,
        }))
        return result
      } catch (err) {
        console.error('[TripNova] Delete expense error:', err)
        throw err
      }
    },
    [trip?.id, expenses]
  )

  const deleteTrip = useCallback(
    async (tripId) => {
      try {
        const res = await deleteTripApi(tripId)
        const remainingTrips = (trips || []).filter((t) => t.id !== tripId)
        setTrips(remainingTrips)

        if (remainingTrips.length === 0) {
          clearActiveTripState(user?.id)
        } else if (trip?.id === tripId || !remainingTrips.some((t) => t.id === trip?.id)) {
          applyActiveTrip(remainingTrips[0], user?.id)
        }

        return {
          ...res,
          remainingTripsCount: remainingTrips.length,
          nextActiveTrip: remainingTrips[0] || null,
        }
      } catch (err) {
        console.error('[TripNova] Delete trip error:', err)
        throw err
      }
    },
    [trips, trip?.id, user?.id, clearActiveTripState, applyActiveTrip]
  )

  // Itinerary Management
  const updateItineraryState = useCallback(
    async (newItinerary) => {
      setItinerary(newItinerary)
      setTrip((prev) => (prev ? { ...prev, itinerary: newItinerary } : null))
      if (trip?.id) {
        try {
          const recalculated = await updateItineraryApi(trip.id, newItinerary)
          if (recalculated && Array.isArray(recalculated)) {
            setItinerary(recalculated)
            setTrip((prev) => (prev ? { ...prev, itinerary: recalculated } : null))
          }
        } catch (err) {
          console.error('[TripNova] Sync itinerary error:', err)
        }
      }
    },
    [trip?.id]
  )

  const addActivity = useCallback(
    async (dayNumber, activityData) => {
      if (!trip?.id) {
        const targetDay = dayNumber || activeDay || 1
        const newItinerary = itinerary.map((d) => {
          if (d.day !== targetDay) return d
          const currentItems = d.items || []
          return {
            ...d,
            items: [
              ...currentItems,
              {
                ...activityData,
                id: activityData.id || `act-${targetDay}-${currentItems.length + 1}-${Date.now()}`,
                completed: false,
              },
            ],
          }
        })
        setItinerary(newItinerary)
        return
      }

      try {
        const payload = {
          day: dayNumber || activeDay || 1,
          ...activityData,
        }
        const res = await addTripActivityApi(trip.id, payload)
        if (res.itinerary) {
          setItinerary(res.itinerary)
          setTrip((prev) => (prev ? { ...prev, itinerary: res.itinerary } : null))
        }
        return res
      } catch (err) {
        console.error('[TripNova] Failed to add activity:', err)
        throw err
      }
    },
    [trip?.id, activeDay, itinerary]
  )

  const removeActivity = useCallback(
    async (dayNumber, activityId) => {
      if (!trip?.id) {
        const newItinerary = itinerary.map((d) => {
          if (d.day !== dayNumber) return d
          return {
            ...d,
            items: (d.items || []).filter((i) => i.id !== activityId),
          }
        })
        setItinerary(newItinerary)
        return
      }

      try {
        const res = await deleteTripActivityApi(trip.id, activityId, dayNumber)
        if (res.itinerary) {
          setItinerary(res.itinerary)
          setTrip((prev) => (prev ? { ...prev, itinerary: res.itinerary } : null))
        }
        return res
      } catch (err) {
        console.error('[TripNova] Failed to remove activity:', err)
        throw err
      }
    },
    [trip?.id, itinerary]
  )

  const moveActivity = useCallback(
    async (dayNumber, fromIdx, toIdx) => {
      const targetDay = itinerary.find((d) => d.day === dayNumber)
      if (!targetDay) return

      const items = [...(targetDay.items || [])]
      if (fromIdx < 0 || fromIdx >= items.length || toIdx < 0 || toIdx >= items.length) {
        return
      }

      const [moved] = items.splice(fromIdx, 1)
      items.splice(toIdx, 0, moved)

      const newItinerary = itinerary.map((d) =>
        d.day === dayNumber ? { ...d, items } : d
      )

      await updateItineraryState(newItinerary)
    },
    [itinerary, updateItineraryState]
  )

  // Planned vs Actual Completion Tracking (#10)
  const toggleActivityComplete = useCallback(
    async (dayNumber, activityId, customActualTime = null) => {
      const targetDayObj = itinerary.find((d) => d.day === dayNumber) || itinerary[0]
      const targetItem = targetDayObj?.items?.find((i) => i.id === activityId)
      const nextCompleted = targetItem ? !targetItem.completed : true

      const nowStr =
        customActualTime ||
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })

      if (trip?.id) {
        try {
          const res = await completeTripActivityApi(trip.id, activityId, {
            day: dayNumber,
            completed: nextCompleted,
            actual_time: nextCompleted ? nowStr : null,
          })
          if (res.itinerary) {
            setItinerary(res.itinerary)
            setTrip((prev) => (prev ? { ...prev, itinerary: res.itinerary } : null))
            return res
          }
        } catch (err) {
          console.warn('[TripNova] Fallback local activity completion toggle:', err)
        }
      }

      const newItinerary = itinerary.map((d) => {
        if (d.day !== dayNumber) return d
        return {
          ...d,
          items: (d.items || []).map((item) => {
            if (item.id !== activityId) return item
            const pMin = parseTimeMinutes(item.time)
            const aMin = parseTimeMinutes(nowStr)
            const diff = aMin - pMin
            return {
              ...item,
              completed: nextCompleted,
              actual_time: nextCompleted ? nowStr : null,
              deviation_minutes: nextCompleted ? diff : null,
              deviation_label: nextCompleted ? formatDeviationLabel(diff) : null,
            }
          }),
        }
      })
      await updateItineraryState(newItinerary)
    },
    [trip?.id, itinerary, updateItineraryState]
  )

  // Smart Replanning 2.0 (#1)
  const simulateWeatherAlert = useCallback(
    async (customDay = null, customReason = null) => {
      const targetDay = customDay || activeDay || 1
      try {
        const result = await simulateAlertApi(trip?.id, targetDay, {
          reason: customReason,
          userLocation: userLocation ? { lat: userLocation.lat, lon: userLocation.lon } : null,
        })
        setActiveAlert(result.alert)
        setReplanReasons(result.reasons || [])
        setProposedDay(result.proposed_day)
        setReplanChanges(result.changes || [])
        setReplanSummaryMetrics(result.summary_metrics || null)
        setReplanAlternatives(result.alternatives || [])
        setMovedToNextDay(result.moved_to_next_day || null)
        setPlanAccepted(false)
        return result
      } catch (err) {
        console.error('[TripNova] Simulate alert failed:', err)
        throw err
      }
    },
    [trip?.id, activeDay, userLocation]
  )

  const acceptUpdatedPlan = useCallback(
    async (selectedAlternative = null) => {
      const chosenDay = selectedAlternative?.proposed_day || proposedDay
      const chosenMovedNext =
        selectedAlternative !== null && selectedAlternative !== undefined
          ? selectedAlternative.moved_to_next_day
          : movedToNextDay

      if (!trip?.id && !chosenDay) return

      try {
        if (trip?.id && chosenDay) {
          const res = await acceptReplanApi(trip.id, chosenDay.day, {
            proposedDay: chosenDay,
            movedToNextDay: chosenMovedNext,
            alternativeId: selectedAlternative?.id || 'alt-smart-indoor',
          })
          if (res.itinerary) {
            setItinerary(res.itinerary)
            setTrip((prev) =>
              prev ? { ...prev, itinerary: res.itinerary, active_alert: null } : null
            )
          }
        } else if (chosenDay) {
          setItinerary((prev) =>
            prev.map((day) => (day.day === chosenDay.day ? chosenDay : day))
          )
        }
        setPlanAccepted(true)
        setActiveAlert(null)
      } catch (err) {
        console.error('[TripNova] Accept plan error:', err)
        throw err
      }
    },
    [trip?.id, proposedDay, movedToNextDay]
  )

  const dismissAlert = useCallback(() => {
    setActiveAlert(null)
    setProposedDay(null)
    setReplanChanges([])
    setReplanAlternatives([])
  }, [])

  // Route Efficiency Optimizer (#6)
  const optimizeRouteForDay = useCallback(
    async (dayNumber = null) => {
      const targetDay = dayNumber || activeDay || 1
      if (!trip?.id) return null
      setIsOptimizingRoute(true)
      try {
        const startCoords = userLocation && !userLocation.isFallback
          ? { lat: userLocation.lat, lon: userLocation.lon }
          : null
        const res = await optimizeDayRouteApi(trip.id, targetDay, startCoords)
        setRouteOptimizationProposal(res)
        return res
      } catch (err) {
        console.error('[TripNova] Route optimization error:', err)
        throw err
      } finally {
        setIsOptimizingRoute(false)
      }
    },
    [trip?.id, activeDay, userLocation]
  )

  const applyOptimizedRoute = useCallback(
    async (proposal = null) => {
      const activeProposal = proposal || routeOptimizationProposal
      if (!trip?.id || !activeProposal) return null
      try {
        const res = await applyOptimizedDayRouteApi(
          trip.id,
          activeProposal.day,
          activeProposal.optimized_items
        )
        if (res.itinerary) {
          setItinerary(res.itinerary)
          setTrip((prev) => (prev ? { ...prev, itinerary: res.itinerary } : null))
        }
        setRouteOptimizationProposal(null)
        return res
      } catch (err) {
        console.error('[TripNova] Apply optimized route failed:', err)
        throw err
      }
    },
    [trip?.id, routeOptimizationProposal]
  )

  const clearRouteOptimizationProposal = useCallback(() => {
    setRouteOptimizationProposal(null)
  }, [])

  // Synchronize AI Assistant executed actions immediately into TripContext (#2)
  const applyAiAction = useCallback((actionPerformed) => {
    if (!actionPerformed) return
    if (actionPerformed.itinerary) {
      setItinerary(actionPerformed.itinerary)
      setTrip((prev) => (prev ? { ...prev, itinerary: actionPerformed.itinerary } : null))
    }
    if (actionPerformed.expenses) {
      setExpenses(actionPerformed.expenses)
      setTrip((prev) =>
        prev
          ? {
              ...prev,
              expenses: actionPerformed.expenses,
              spent: actionPerformed.spent ?? prev.spent,
            }
          : null
      )
    }
    if (actionPerformed.type === 'ROUTE_OPTIMIZATION_PROPOSAL' && actionPerformed.optimization) {
      setRouteOptimizationProposal(actionPerformed.optimization)
    }
  }, [])

  // Dynamic Predictive Budget Calculation (#5) - always synchronized with live itinerary & expenses
  const predictiveBudget = useMemo(() => {
    const totalBudget = Number(trip?.budget || trip?.tripBudget || 50000)
    const actualSpent = expenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0)
    const remainingBudget = totalBudget - actualSpent

    let upcomingActivitiesCost = 0
    let remainingDistanceKm = 0
    let uncompletedDaysCount = 0

    for (const dayObj of itinerary) {
      const items = dayObj.items || []
      const uncompleted = items.filter((i) => !i.completed)
      if (uncompleted.length > 0) {
        uncompletedDaysCount += 1
        for (const item of uncompleted) {
          upcomingActivitiesCost += Number(item.estimated_cost || 0)
        }
        const ratio = uncompleted.length / Math.max(1, items.length)
        remainingDistanceKm += Number(dayObj.distance_km || 0) * ratio
      }
    }

    const estimatedTransportCost = Math.round(remainingDistanceKm * 18)
    const budgetLevel = String(trip?.budget_level || trip?.budgetLevel || 'Moderate')
    const dailyFoodBase =
      budgetLevel === 'Budget'
        ? 450
        : budgetLevel === 'High'
        ? 1500
        : budgetLevel === 'Premium' || budgetLevel === 'Luxury'
        ? 2500
        : 800

    const foodExpenses = expenses.filter((e) => e.category === 'Food')
    const daysRemainingForMeals = Math.max(
      0,
      uncompletedDaysCount - (foodExpenses.length >= itinerary.length && itinerary.length > 0 ? 1 : 0)
    )
    const estimatedFoodCost = Math.round(daysRemainingForMeals * dailyFoodBase)

    const estimatedRemainingSpend = Math.round(
      upcomingActivitiesCost + estimatedTransportCost + estimatedFoodCost
    )
    const projectedTotalSpend = Math.round(actualSpent + estimatedRemainingSpend)
    const expectedSaving = Math.round(totalBudget - projectedTotalSpend)

    return {
      total_budget: totalBudget,
      spent: actualSpent,
      remaining: remainingBudget,
      estimated_remaining_spend: estimatedRemainingSpend,
      projected_total_spend: projectedTotalSpend,
      expected_saving: expectedSaving,
      status: expectedSaving >= 0 ? 'saving' : 'overspending',
      breakdown: {
        upcoming_activities_cost: Math.round(upcomingActivitiesCost),
        estimated_transport_cost: estimatedTransportCost,
        estimated_food_and_daily_cost: estimatedFoodCost,
        remaining_distance_km: Math.round(remainingDistanceKm * 10) / 10,
        uncompleted_days: uncompletedDaysCount,
      },
    }
  }, [trip, expenses, itinerary])

  // Dynamic Trip Health Score Calculation (#4) - always synchronized
  const tripHealthScore = useMemo(() => {
    const totalBudget = predictiveBudget.total_budget
    const spent = predictiveBudget.spent
    const projected = predictiveBudget.projected_total_spend
    const budgetRatio = totalBudget > 0 ? spent / totalBudget : 0
    const projectedRatio = totalBudget > 0 ? projected / totalBudget : 0

    // 1. Budget Subscore (25 pts)
    let budgetPts = 25
    let budgetStatus = 'Good'
    let budgetLevel = 'good'
    if (budgetRatio > 1.0) {
      budgetPts = Math.max(5, Math.round(25 - (budgetRatio - 1) * 40))
      budgetStatus = 'Over Budget'
      budgetLevel = 'critical'
    } else if (budgetRatio >= 0.85 || projectedRatio > 1.05) {
      budgetPts = 16
      budgetStatus = 'Tight'
      budgetLevel = 'warning'
    }

    // 2. Weather Subscore (25 pts)
    const rainProb = Number(weatherData?.rain_probability ?? 15)
    const uncompletedOutdoor = itinerary.reduce(
      (acc, d) =>
        acc +
        (d.items || []).filter(
          (i) => !i.completed && (i.weatherSensitive || i.outdoor)
        ).length,
      0
    )

    let weatherPts = 25
    let weatherStatus = 'Good'
    let weatherLevel = 'good'
    if (activeAlert) {
      weatherPts = 8
      weatherStatus = 'Alert Active'
      weatherLevel = 'critical'
    } else if (rainProb >= 60 && uncompletedOutdoor > 0) {
      weatherPts = 14
      weatherStatus = 'Rain Risk'
      weatherLevel = 'warning'
    } else if (rainProb >= 40) {
      weatherPts = 20
      weatherStatus = 'Moderate'
      weatherLevel = 'good'
    }

    // 3. Schedule Feasibility Subscore (25 pts)
    let maxDayHours = 0
    let delayedCount = 0
    for (const d of itinerary) {
      const items = d.items || []
      const actHours = items.reduce((s, i) => s + parseDurationHours(i.duration), 0)
      const transitHours = Number(d.estimated_time_min || 0) / 60
      maxDayHours = Math.max(maxDayHours, actHours + transitHours)
      for (const i of items) {
        if (Math.abs(Number(i.deviation_minutes || 0)) > 45) delayedCount += 1
      }
    }

    let schedulePts = 24
    let scheduleStatus = 'Good'
    let scheduleLevel = 'good'
    if (maxDayHours > 10.5 || delayedCount >= 2) {
      schedulePts = 13
      scheduleStatus = 'Overpacked'
      scheduleLevel = 'critical'
    } else if (maxDayHours > 8.0 || delayedCount === 1) {
      schedulePts = 19
      scheduleStatus = 'Tight'
      scheduleLevel = 'warning'
    }

    // 4. Route & Traffic Subscore (25 pts)
    const maxDayKm = itinerary.reduce(
      (max, d) => Math.max(max, Number(d.distance_km || 0)),
      0
    )
    let trafficPts = 24
    let trafficStatus = 'Good'
    let trafficLevel = 'good'
    if (maxDayKm > 60) {
      trafficPts = 14
      trafficStatus = 'High'
      trafficLevel = 'critical'
    } else if (maxDayKm > 35) {
      trafficPts = 19
      trafficStatus = 'Moderate'
      trafficLevel = 'warning'
    }

    const totalScore = Math.max(
      0,
      Math.min(100, budgetPts + weatherPts + schedulePts + trafficPts)
    )

    return {
      score: totalScore,
      max_score: 100,
      overall_label:
        totalScore >= 80
          ? 'Healthy'
          : totalScore >= 60
          ? 'Needs Attention'
          : 'Action Needed',
      overall_tone:
        totalScore >= 80 ? 'success' : totalScore >= 60 ? 'warning' : 'danger',
      indicators: [
        {
          key: 'budget',
          label: 'Budget',
          status: budgetStatus,
          level: budgetLevel,
          score: budgetPts,
        },
        {
          key: 'weather',
          label: 'Weather',
          status: weatherStatus,
          level: weatherLevel,
          score: weatherPts,
        },
        {
          key: 'schedule',
          label: 'Schedule',
          status: scheduleStatus,
          level: scheduleLevel,
          score: schedulePts,
        },
        {
          key: 'traffic',
          label: 'Traffic',
          status: trafficStatus,
          level: trafficLevel,
          score: trafficPts,
        },
      ],
    }
  }, [predictiveBudget, weatherData, activeAlert, itinerary])

  // Planned vs Actual & Analytics (#9 & #10)
  const tripAnalytics = useMemo(() => {
    const allItems = itinerary.flatMap((d) => d.items || [])
    const completedItems = allItems.filter((i) => i.completed)
    const totalPlanned = allItems.length
    const placesVisited = completedItems.length
    const completionPct =
      totalPlanned > 0 ? Math.round((placesVisited / totalPlanned) * 100) : 0

    const totalRouteDistanceKm = Math.round(
      itinerary.reduce((acc, d) => acc + (Number(d.distance_km) || 0), 0) * 10
    ) / 10

    let distanceTravelledKm = 0
    for (const d of itinerary) {
      const items = d.items || []
      if (!items.length) continue
      const compCount = items.filter((i) => i.completed).length
      if (compCount > 0) {
        distanceTravelledKm += Number(d.distance_km || 0) * (compCount / items.length)
      }
    }
    distanceTravelledKm = Math.round(distanceTravelledKm * 10) / 10

    const catCounts = {}
    const sourceItems = completedItems.length > 0 ? completedItems : allItems
    for (const item of sourceItems) {
      const c = item.category || 'Attraction'
      catCounts[c] = (catCounts[c] || 0) + 1
    }
    const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1])
    const mostVisitedCategory = sortedCats[0]?.[0] || 'Sightseeing'

    // Build Planned vs Actual rows comparing originalItinerary vs current itinerary
    const origSource = originalItinerary?.length ? originalItinerary : itinerary
    const comparisons = []
    const origByDay = {}
    origSource.forEach((d) => {
      origByDay[d.day] = d.items || []
    })
    const currByDay = {}
    itinerary.forEach((d) => {
      currByDay[d.day] = d.items || []
    })

    const allDayNums = Array.from(
      new Set([...Object.keys(origByDay), ...Object.keys(currByDay)].map(Number))
    ).sort((a, b) => a - b)

    for (const dNum of allDayNums) {
      const oList = origByDay[dNum] || []
      const cList = currByDay[dNum] || []
      const maxLen = Math.max(oList.length, cList.length)

      for (let idx = 0; idx < maxLen; idx++) {
        const orig = oList[idx]
        const curr = cList[idx]

        if (orig && curr) {
          const pTitle = orig.title || orig.name || 'Activity'
          const aTitle = curr.title || curr.name || 'Activity'
          const pTime = orig.time || '09:00 AM'
          const aTime = curr.actual_time || curr.time || pTime
          const diffMin =
            curr.deviation_minutes !== null && curr.deviation_minutes !== undefined
              ? Number(curr.deviation_minutes)
              : parseTimeMinutes(aTime) - parseTimeMinutes(pTime)

          const isReplanned = pTitle.trim().toLowerCase() !== aTitle.trim().toLowerCase()
          comparisons.push({
            id: `${dNum}-${idx}`,
            day: dNum,
            planned_title: pTitle,
            planned_time: pTime,
            actual_title: aTitle,
            actual_time: aTime,
            completed: Boolean(curr.completed),
            status: isReplanned ? 'replanned' : curr.completed ? 'completed' : 'scheduled',
            deviation_minutes: diffMin,
            deviation_label: isReplanned
              ? `Swapped → ${aTitle}`
              : curr.deviation_label || formatDeviationLabel(diffMin),
          })
        } else if (curr && !orig) {
          comparisons.push({
            id: `${dNum}-${idx}`,
            day: dNum,
            planned_title: '— (Added during trip)',
            planned_time: '—',
            actual_title: curr.title || curr.name || 'Added Activity',
            actual_time: curr.actual_time || curr.time || 'Flexible',
            completed: Boolean(curr.completed),
            status: 'added',
            deviation_minutes: 0,
            deviation_label: 'Added activity',
          })
        } else if (orig && !curr) {
          comparisons.push({
            id: `${dNum}-${idx}`,
            day: dNum,
            planned_title: orig.title || orig.name || 'Removed Activity',
            planned_time: orig.time || '09:00 AM',
            actual_title: 'Skipped / Removed',
            actual_time: '—',
            completed: false,
            status: 'skipped',
            deviation_minutes: 0,
            deviation_label: 'Removed from plan',
          })
        }
      }
    }

    return {
      places_visited: placesVisited,
      total_planned_activities: totalPlanned,
      completion_percentage: completionPct,
      total_route_distance_km: totalRouteDistanceKm,
      distance_travelled_km: distanceTravelledKm,
      total_spent: predictiveBudget.spent,
      total_budget: predictiveBudget.total_budget,
      remaining_budget: predictiveBudget.remaining,
      most_visited_category: mostVisitedCategory,
      category_breakdown: sortedCats.map(([category, count]) => ({ category, count })),
      planned_vs_actual: comparisons,
    }
  }, [itinerary, originalItinerary, predictiveBudget])

  const flatRecommendations = useMemo(() => {
    return itinerary.flatMap((d) => d.items || [])
  }, [itinerary])

  // ------------------------------------------------------------------
  // 5. TRAVEL TIME BUFFER ENGINE (Real-Time Synchronized)
  // ------------------------------------------------------------------
  const setBufferMode = useCallback(
    async (nextMode) => {
      const clean = ['relaxed', 'normal', 'safe'].includes(String(nextMode).toLowerCase())
        ? String(nextMode).toLowerCase()
        : 'normal'
      setBufferModeState(clean)
      try {
        localStorage.setItem('tripnova_buffer_mode', clean)
      } catch {
        // ignore storage errors
      }
      if (trip?.id) {
        try {
          await updateTripApi(trip.id, { buffer_mode: clean })
          setTrip((prev) => (prev ? { ...prev, buffer_mode: clean } : null))
        } catch (e) {
          console.warn('[TripNova] Buffer mode sync warning:', e)
        }
      }
    },
    [trip?.id]
  )

  const setTransportMode = useCallback(
    async (nextTrans) => {
      const clean = ['cab', 'transit', 'walk', 'bike'].includes(String(nextTrans).toLowerCase())
        ? String(nextTrans).toLowerCase()
        : 'cab'
      setTransportModeState(clean)
      try {
        localStorage.setItem('tripnova_transport_mode', clean)
      } catch {
        // ignore storage errors
      }
      if (trip?.id) {
        try {
          await updateTripApi(trip.id, { transport_mode: clean })
          setTrip((prev) => (prev ? { ...prev, transport_mode: clean } : null))
        } catch (e) {
          console.warn('[TripNova] Transport mode sync warning:', e)
        }
      }
    },
    [trip?.id]
  )

  const travelBuffers = useMemo(() => {
    const modeKey = ['relaxed', 'normal', 'safe'].includes(bufferMode) ? bufferMode : 'normal'
    const modeConfig = {
      relaxed: { safetyBufferMin: 20, trafficFactor: 1.25, label: 'Relaxed (+20m buffer)' },
      normal: { safetyBufferMin: 10, trafficFactor: 1.15, label: 'Normal (+10m buffer)' },
      safe: { safetyBufferMin: 25, trafficFactor: 1.35, label: 'Safe (+25m peak buffer)' },
    }[modeKey]

    const baseSpeedKmh = {
      walk: 4.8,
      bike: 16.0,
      transit: 20.0,
      cab: 26.0,
    }[transportMode] || 26.0

    const targetDayObj = itinerary.find((d) => d.day === activeDay) || itinerary[0] || { day: 1, items: [] }
    const items = targetDayObj.items || []
    const now = new Date()
    const nowMinutes = now.getHours() * 60 + now.getMinutes()

    const byActivityId = {}
    const activitiesList = []
    let conflictsCount = 0
    let nextUp = null

    for (let idx = 0; idx < items.length; idx++) {
      const item = items[idx]
      const actTimeStr = item.time || '09:00 AM'
      const actStartMin = parseTimeMinutes(actTimeStr)
      const actDurMin = Math.round(parseDurationHours(item.duration || '1.5h') * 60)
      const actEndMin = actStartMin + actDurMin

      const curLat = Number(item.latitude || 13.0827)
      const curLon = Number(item.longitude || 80.2707)

      let fromLat = curLat - 0.022
      let fromLon = curLon - 0.018
      let fromLabel = `${trip?.destination || 'City'} Starting Point`

      if (idx === 0) {
        if (userLocation?.lat && userLocation?.lon) {
          fromLat = Number(userLocation.lat)
          fromLon = Number(userLocation.lon)
          fromLabel = userLocation.isFallback ? 'City Center' : 'Your Live GPS'
        }
      } else {
        const prev = items[idx - 1]
        if (!item.completed && prev.completed && userLocation?.lat && userLocation?.lon) {
          fromLat = Number(userLocation.lat)
          fromLon = Number(userLocation.lon)
          fromLabel = 'Current Location'
        } else {
          fromLat = Number(prev.latitude || curLat)
          fromLon = Number(prev.longitude || curLon)
          fromLabel = prev.title || prev.name || `Stop ${idx}`
        }
      }

      const straightKm = haversineDistKm(fromLat, fromLon, curLat, curLon)
      const roadKm = Math.max(0.5, Math.round(straightKm * 1.28 * 10) / 10)
      const baseTravelMin = Math.max(5, Math.round((roadKm / baseSpeedKmh) * 60))
      const travelTimeMin = Math.max(5, Math.round(baseTravelMin * modeConfig.trafficFactor))
      const safetyBufferMin = modeConfig.safetyBufferMin
      const totalBufferLeadMin = travelTimeMin + safetyBufferMin
      const recommendedDepMin = Math.max(0, actStartMin - totalBufferLeadMin)
      const recommendedDeparture = minutesToTimeStr(recommendedDepMin)

      let hasScheduleConflict = false
      let conflictDetail = null
      if (idx > 0) {
        const prevItem = items[idx - 1]
        const prevStart = parseTimeMinutes(prevItem.time || '09:00 AM')
        const prevDur = Math.round(parseDurationHours(prevItem.duration || '1.5h') * 60)
        const prevEnd = prevStart + prevDur
        if (recommendedDepMin < prevEnd) {
          hasScheduleConflict = true
          conflictsCount += 1
          const overlapMin = prevEnd - recommendedDepMin
          conflictDetail = `Overlap of ${overlapMin} min: ${prevItem.title || prevItem.name} finishes at ${minutesToTimeStr(prevEnd)}, but recommended departure is ${recommendedDeparture}.`
        }
      }

      const diffFromNow = recommendedDepMin - nowMinutes
      let leaveInMinutes = 15
      let leaveStatusLabel = `Leave in 15 minutes`
      let urgency = 'ready'

      if (item.completed) {
        leaveInMinutes = 0
        leaveStatusLabel = 'Completed'
        urgency = 'completed'
      } else if (diffFromNow > 180) {
        leaveInMinutes = diffFromNow
        leaveStatusLabel = `Depart at ${recommendedDeparture}`
        urgency = 'scheduled'
      } else if (diffFromNow > 0) {
        leaveInMinutes = diffFromNow
        leaveStatusLabel = `Leave in ${diffFromNow} minutes`
        urgency = diffFromNow <= 30 ? 'soon' : 'on_time'
      } else {
        leaveInMinutes = 15
        leaveStatusLabel = `Leave in 15 minutes`
        urgency = 'ready'
      }

      const entry = {
        activity_id: item.id,
        title: item.title || item.name,
        completed: Boolean(item.completed),
        from_label: fromLabel,
        activity_time: actTimeStr,
        activity_end_time: minutesToTimeStr(actEndMin),
        duration: item.duration || '1.5h',
        distance_km: roadKm,
        base_travel_min: baseTravelMin,
        travel_time_min: travelTimeMin,
        safety_buffer_min: safetyBufferMin,
        total_buffer_lead_min: totalBufferLeadMin,
        recommended_departure: recommendedDeparture,
        leave_in_minutes: leaveInMinutes,
        leave_status_label: leaveStatusLabel,
        urgency,
        has_schedule_conflict: hasScheduleConflict,
        conflict_detail: conflictDetail,
        buffer_mode: modeKey,
        transport_mode: transportMode,
      }

      activitiesList.push(entry)
      if (item.id) byActivityId[item.id] = entry
      if (!nextUp && !item.completed) nextUp = entry
    }

    if (!nextUp && activitiesList.length > 0) {
      nextUp = activitiesList[0]
    }

    return {
      day: targetDayObj.day || activeDay,
      buffer_mode: modeKey,
      buffer_mode_label: modeConfig.label,
      transport_mode: transportMode,
      safety_buffer_min: modeConfig.safetyBufferMin,
      conflicts_count: conflictsCount,
      next_up: nextUp,
      activities: activitiesList,
      byActivityId,
    }
  }, [itinerary, activeDay, bufferMode, transportMode, userLocation, trip?.destination])

  // ------------------------------------------------------------------
  // 1. "I HAVE 2 HOURS" — QUICK TIME PLANNER ACTIONS
  // ------------------------------------------------------------------
  const generateQuickTimePlan = useCallback(
    async ({ availableMinutes = 120, day = null, replaceActivityId = null, startTime = null } = {}) => {
      const targetDay = day || activeDay || 1
      if (!trip?.id) return null
      setIsGeneratingQuickPlan(true)
      try {
        const loc = userLocation ? { lat: userLocation.lat, lon: userLocation.lon } : null
        const res = await generateQuickPlanApi(trip.id, {
          day: targetDay,
          availableMinutes,
          userLocation: loc,
          transportMode,
          startTime,
          replaceActivityId,
        })
        setQuickPlanResult(res)
        return res
      } catch (err) {
        console.error('[TripNova] Quick Time Plan generation failed:', err)
        throw err
      } finally {
        setIsGeneratingQuickPlan(false)
      }
    },
    [trip?.id, activeDay, userLocation, transportMode]
  )

  const applyQuickTimePlan = useCallback(
    async ({ mode = 'append', replaceActivityId = null, plan = null } = {}) => {
      const activePlan = plan || quickPlanResult
      if (!trip?.id || !activePlan?.activities?.length) return null
      try {
        const res = await applyQuickPlanApi(trip.id, {
          day: activePlan.day || activeDay || 1,
          mode,
          replaceActivityId,
          activities: activePlan.activities,
        })
        if (res.itinerary) {
          setItinerary(res.itinerary)
          setTrip((prev) => (prev ? { ...prev, itinerary: res.itinerary } : null))
        }
        setQuickPlanResult(null)
        return res
      } catch (err) {
        console.error('[TripNova] Apply Quick Time Plan error:', err)
        throw err
      }
    },
    [trip?.id, quickPlanResult, activeDay]
  )

  const clearQuickPlan = useCallback(() => {
    setQuickPlanResult(null)
  }, [])

  // ------------------------------------------------------------------
  // 3. "WHAT IF?" TRIP SIMULATOR ACTIONS
  // ------------------------------------------------------------------
  const runWhatIfSimulation = useCallback(
    async ({ scenarioType = 'rain', day = null, parameters = {} } = {}) => {
      const targetDay = day || activeDay || 1
      if (!trip?.id) return null
      setIsSimulatingScenario(true)
      try {
        const loc = userLocation ? { lat: userLocation.lat, lon: userLocation.lon } : null
        const res = await simulateTripScenarioApi(trip.id, {
          day: targetDay,
          scenarioType,
          parameters,
          userLocation: loc,
        })
        setSimulationResult(res)
        return res
      } catch (err) {
        console.error('[TripNova] What-If simulation failed:', err)
        throw err
      } finally {
        setIsSimulatingScenario(false)
      }
    },
    [trip?.id, activeDay, userLocation]
  )

  const applyWhatIfSimulation = useCallback(
    async (customSim = null) => {
      const sim = customSim || simulationResult
      if (!trip?.id || !sim?.simulated_day) return null
      try {
        const res = await applySimulatedPlanApi(trip.id, {
          day: sim.day || activeDay || 1,
          simulatedDay: sim.simulated_day,
          movedToNextDay: sim.moved_to_next_day || null,
        })
        if (res.itinerary) {
          setItinerary(res.itinerary)
          setTrip((prev) => (prev ? { ...prev, itinerary: res.itinerary } : null))
        }
        setSimulationResult(null)
        return res
      } catch (err) {
        console.error('[TripNova] Apply simulated plan failed:', err)
        throw err
      }
    },
    [trip?.id, simulationResult, activeDay]
  )

  const clearWhatIfSimulation = useCallback(() => {
    setSimulationResult(null)
  }, [])

  // ------------------------------------------------------------------
  // 2. TRIPNOVA DECISION CENTER (Synchronized Live Feed)
  // ------------------------------------------------------------------
  const decisionCenter = useMemo(() => {
    const targetDayObj = itinerary.find((d) => d.day === activeDay) || itinerary[0] || { day: 1, items: [] }
    const dayNum = targetDayObj.day || activeDay || 1
    const dayItems = targetDayObj.items || []
    const rainProb = Number(weatherData?.rain_probability ?? 15)
    const condition = weatherData?.condition || 'Partly Cloudy'

    const outdoorUpcoming = dayItems.filter(
      (i) => !i.completed && (i.weatherSensitive || i.outdoor)
    )

    const decisions = []

    // 1. Weather
    if (activeAlert || (rainProb >= 60 && outdoorUpcoming.length > 0)) {
      const firstOutdoor = outdoorUpcoming[0]
      decisions.push({
        id: 'dec-weather',
        category: 'Weather',
        state: activeAlert || rainProb >= 75 ? 'Critical' : 'Warning',
        icon_status: activeAlert || rainProb >= 75 ? '🔴' : '🟡',
        title: `Rain expected near ${firstOutdoor?.time || '3:00 PM'} (${rainProb}% chance)`,
        description: `${firstOutdoor?.title || 'Outdoor activity'} may be disrupted by weather. Swap with a nearby indoor museum or move to tomorrow.`,
        impact_summary: `${outdoorUpcoming.length} outdoor stop(s) exposed`,
        action_label: 'Find Alternative',
        action_type: 'TRIGGER_SMART_REPLAN',
        action_payload: { day: dayNum },
      })
    } else {
      decisions.push({
        id: 'dec-weather',
        category: 'Weather',
        state: 'Good',
        icon_status: '🟢',
        title: `Weather favorable on Day ${dayNum} (${condition}, ${rainProb}% rain)`,
        description: 'Clear conditions for all scheduled indoor and outdoor activities.',
        impact_summary: '0 weather alerts',
        action_label: 'Simulate Rain',
        action_type: 'OPEN_SIMULATOR',
        action_payload: { scenarioType: 'rain', day: dayNum },
      })
    }

    // 2. Route Efficiency
    const dayDistKm = Number(targetDayObj.distance_km || 0)
    const dayTimeMin = Number(targetDayObj.estimated_time_min || 25)
    if (routeOptimizationProposal && !routeOptimizationProposal.already_optimal) {
      decisions.push({
        id: 'dec-route',
        category: 'Route Optimization',
        state: 'Opportunity',
        icon_status: '🔵',
        title: `Route can save ${routeOptimizationProposal.estimated_time_saved_min} mins (${routeOptimizationProposal.saved_km} km)`,
        description: routeOptimizationProposal.explanation,
        impact_summary: `-${routeOptimizationProposal.estimated_time_saved_min} min transit`,
        action_label: 'Apply Changes',
        action_type: 'APPLY_OPTIMIZED_ROUTE',
        action_payload: { day: dayNum },
      })
    } else if (dayItems.filter((i) => !i.completed).length >= 3 && dayDistKm > 15) {
      decisions.push({
        id: 'dec-route',
        category: 'Route Optimization',
        state: 'Opportunity',
        icon_status: '🔵',
        title: `Route check available for ${dayItems.length} stops (${dayDistKm} km)`,
        description: 'Run 2-opt geographical route optimization to check if reordering stops saves travel time.',
        impact_summary: `Current transit: ~${dayTimeMin} mins`,
        action_label: 'Optimize Route',
        action_type: 'OPTIMIZE_ROUTE',
        action_payload: { day: dayNum },
      })
    } else {
      decisions.push({
        id: 'dec-route',
        category: 'Route Optimization',
        state: 'Good',
        icon_status: '🟢',
        title: `Route is optimal (${dayDistKm} km across ${dayItems.length} stops)`,
        description: 'Waypoints follow a direct geographical sequence with minimal transit overhead.',
        impact_summary: `~${dayTimeMin} mins total drive`,
        action_label: 'Review Plan',
        action_type: 'NAVIGATE',
        action_payload: { path: `/map?day=${dayNum}` },
      })
    }

    // 3. Budget
    if (predictiveBudget.expected_saving < 0 || predictiveBudget.remaining < predictiveBudget.total_budget * 0.15) {
      const overAmt = Math.abs(predictiveBudget.expected_saving)
      decisions.push({
        id: 'dec-budget',
        category: 'Budget & Spend',
        state: predictiveBudget.remaining < 0 ? 'Critical' : 'Warning',
        icon_status: predictiveBudget.remaining < 0 ? '🔴' : '🟡',
        title:
          predictiveBudget.expected_saving < 0
            ? `Projected spend exceeds budget by ₹${overAmt.toLocaleString('en-IN')}`
            : `Budget is getting tight (₹${predictiveBudget.remaining.toLocaleString('en-IN')} left)`,
        description: `Spent ₹${predictiveBudget.spent.toLocaleString('en-IN')} of ₹${predictiveBudget.total_budget.toLocaleString('en-IN')}. Simulate lower-cost alternatives or review expenses.`,
        impact_summary: `Projected ₹${predictiveBudget.projected_total_spend.toLocaleString('en-IN')}`,
        action_label: 'View Budget',
        action_type: 'NAVIGATE',
        action_payload: { path: '/expenses' },
      })
    } else {
      decisions.push({
        id: 'dec-budget',
        category: 'Budget & Spend',
        state: 'Good',
        icon_status: '🟢',
        title: `Budget on track (₹${predictiveBudget.remaining.toLocaleString('en-IN')} remaining)`,
        description: `Estimated net saving of ₹${predictiveBudget.expected_saving.toLocaleString('en-IN')} after all upcoming activities, transport, and meals.`,
        impact_summary: `Spent ₹${predictiveBudget.spent.toLocaleString('en-IN')}`,
        action_label: 'View Budget',
        action_type: 'NAVIGATE',
        action_payload: { path: '/expenses' },
      })
    }

    // 4. Schedule & Travel Buffer
    if (travelBuffers.conflicts_count > 0) {
      const firstConflict = travelBuffers.activities.find((a) => a.has_schedule_conflict)
      decisions.push({
        id: 'dec-schedule',
        category: 'Schedule & Buffer',
        state: 'Warning',
        icon_status: '🟡',
        title: `Schedule tight before ${firstConflict?.title || 'next stop'}`,
        description: firstConflict?.conflict_detail || 'Travel time plus safety buffer overlaps with the preceding activity.',
        impact_summary: `${travelBuffers.conflicts_count} buffer overlap(s)`,
        action_label: 'Review Plan',
        action_type: 'OPEN_SIMULATOR',
        action_payload: { scenarioType: 'less_time', day: dayNum },
      })
    } else {
      const nextB = travelBuffers.next_up
      decisions.push({
        id: 'dec-schedule',
        category: 'Schedule & Buffer',
        state: 'Good',
        icon_status: '🟢',
        title: nextB
          ? `Next departure at ${nextB.recommended_departure} for ${nextB.title}`
          : 'All activities completed for today',
        description: nextB
          ? `${nextB.leave_status_label} · ${nextB.travel_time_min} min travel + ${nextB.safety_buffer_min} min safety buffer.`
          : 'Schedule has zero timing conflicts.',
        impact_summary: travelBuffers.buffer_mode_label,
        action_label: 'Review Plan',
        action_type: 'NAVIGATE',
        action_payload: { path: `/itinerary?day=${dayNum}` },
      })
    }

    // 5. Free Time Opportunity ("I Have 2 Hours")
    const uncompletedHours = dayItems
      .filter((i) => !i.completed)
      .reduce((acc, i) => acc + parseDurationHours(i.duration || '1.5h'), 0)
    const freeMin = Math.min(180, Math.max(60, Math.round(Math.max(1.5, 9 - uncompletedHours) * 60 / 30) * 30))

    decisions.push({
      id: 'dec-opportunity',
      category: 'Free Time Opportunity',
      state: 'Opportunity',
      icon_status: '🔵',
      title: `${Math.round((freeMin / 60) * 10) / 10} hours of flexible time available today`,
      description: `Use "I Have 2 Hours" to fill a ${freeMin}-minute window with a nearby attraction or cafe, including round-trip travel and safety buffer.`,
      impact_summary: `${freeMin} min window available`,
      action_label: 'Open Quick Planner',
      action_type: 'OPEN_QUICK_PLANNER',
      action_payload: { availableMinutes: freeMin, day: dayNum },
    })

    const attentionCount = decisions.filter((d) => d.state === 'Warning' || d.state === 'Critical').length
    const opportunityCount = decisions.filter((d) => d.state === 'Opportunity').length

    return {
      day: dayNum,
      health_score: tripHealthScore.score,
      health_label: tripHealthScore.overall_label,
      health_tone: tripHealthScore.overall_tone,
      attention_count: attentionCount,
      opportunity_count: opportunityCount,
      decisions,
    }
  }, [
    itinerary,
    activeDay,
    weatherData,
    activeAlert,
    routeOptimizationProposal,
    predictiveBudget,
    travelBuffers,
    tripHealthScore,
  ])

  const value = useMemo(
    () => ({
      trips,
      hasTrips,
      tripsError,
      navigationNotice,
      setNavigationNotice,
      clearNavigationNotice,
      refreshTrips,
      selectTrip,
      tripForm,
      trip: hasTrips ? trip : null,
      itinerary: hasTrips ? itinerary : [],
      originalItinerary: hasTrips ? originalItinerary : [],
      hasGeneratedTrip: Boolean(hasTrips && hasGeneratedTrip && trip?.id),
      isLoadingTrip,
      activeDay,
      setActiveDay,
      selectedActivity: hasTrips ? selectedActivity : null,
      setSelectedActivity,
      expenses: hasTrips ? expenses : [],
      weatherData: hasTrips ? weatherData : null,
      weatherLoading,
      // Smart Replanning 2.0
      activeAlert: hasTrips ? activeAlert : null,
      replanReasons,
      proposedDay,
      replanChanges,
      replanSummaryMetrics,
      replanAlternatives,
      movedToNextDay,
      planAccepted,
      // Route Optimizer
      routeOptimizationProposal: hasTrips ? routeOptimizationProposal : null,
      isOptimizingRoute,
      optimizeRouteForDay,
      applyOptimizedRoute,
      clearRouteOptimizationProposal,
      // Travel Time Buffer (#5)
      bufferMode,
      setBufferMode,
      transportMode,
      setTransportMode,
      travelBuffers,
      // Quick Time Planner ("I Have 2 Hours") (#1)
      quickPlanResult,
      isGeneratingQuickPlan,
      generateQuickTimePlan,
      applyQuickTimePlan,
      clearQuickPlan,
      // Decision Center (#2)
      decisionCenter,
      // "What If?" Trip Simulator (#3)
      simulationResult,
      isSimulatingScenario,
      runWhatIfSimulation,
      applyWhatIfSimulation,
      clearWhatIfSimulation,
      // Live Trip Mode
      liveTripActive: hasTrips ? liveTripActive : false,
      setLiveTripActive,
      userLocation: hasTrips ? userLocation : null,
      locationStatus,
      locationError,
      requestUserLocation,
      // Dynamic Intelligence Metrics
      predictiveBudget,
      tripHealthScore,
      tripAnalytics,
      recommendations: flatRecommendations,
      // Actions
      generateTrip,
      deleteTrip,
      addExpense,
      deleteExpense,
      updateItinerary: updateItineraryState,
      addActivity,
      removeActivity,
      moveActivity,
      toggleActivityComplete,
      simulateWeatherAlert,
      acceptUpdatedPlan,
      dismissAlert,
      applyAiAction,
    }),
    [
      trips,
      hasTrips,
      tripsError,
      navigationNotice,
      clearNavigationNotice,
      refreshTrips,
      selectTrip,
      tripForm,
      trip,
      itinerary,
      originalItinerary,
      hasGeneratedTrip,
      isLoadingTrip,
      activeDay,
      selectedActivity,
      expenses,
      weatherData,
      weatherLoading,
      activeAlert,
      replanReasons,
      proposedDay,
      replanChanges,
      replanSummaryMetrics,
      replanAlternatives,
      movedToNextDay,
      planAccepted,
      routeOptimizationProposal,
      isOptimizingRoute,
      optimizeRouteForDay,
      applyOptimizedRoute,
      clearRouteOptimizationProposal,
      bufferMode,
      setBufferMode,
      transportMode,
      setTransportMode,
      travelBuffers,
      quickPlanResult,
      isGeneratingQuickPlan,
      generateQuickTimePlan,
      applyQuickTimePlan,
      clearQuickPlan,
      decisionCenter,
      simulationResult,
      isSimulatingScenario,
      runWhatIfSimulation,
      applyWhatIfSimulation,
      clearWhatIfSimulation,
      liveTripActive,
      userLocation,
      locationStatus,
      locationError,
      requestUserLocation,
      predictiveBudget,
      tripHealthScore,
      tripAnalytics,
      flatRecommendations,
      generateTrip,
      deleteTrip,
      addExpense,
      deleteExpense,
      updateItineraryState,
      addActivity,
      removeActivity,
      moveActivity,
      toggleActivityComplete,
      simulateWeatherAlert,
      acceptUpdatedPlan,
      dismissAlert,
      applyAiAction,
    ]
  )

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>
}

export function useTrip() {
  const ctx = useContext(TripContext)
  if (!ctx) {
    throw new Error('useTrip must be used within a TripProvider')
  }
  return ctx
}