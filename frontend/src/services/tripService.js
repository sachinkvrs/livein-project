const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export function getAuthHeaders() {
  const token = localStorage.getItem('tripnova_user_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['X-User-Id'] = token
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(id)
  }
}

export async function createTrip(formData) {
  const payload = {
    destination: formData.destination,
    travellers: Number(formData.travellers) || 1,
    travelling_with: formData.travelling_with || 'friends',
    startDate: formData.startDate,
    endDate: formData.endDate,
    budgetLevel: formData.budgetLevel,
    preferred_time: formData.preferred_time,
    tripBudget: Number(formData.tripBudget) || 0,
    interests: formData.interests || [],
  }

  const response = await fetchWithTimeout(`${API_BASE_URL}/trips`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(errorData?.detail || `Failed to create trip (${response.status})`)
  }

  return await response.json()
}

export async function getTrip(tripId) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(`Failed to load trip ${tripId}`)
  }
  return await response.json()
}

export async function listTrips(userId = null) {
  let url = `${API_BASE_URL}/trips`
  if (userId) {
    url += `?user_id=${encodeURIComponent(userId)}`
  }
  const response = await fetchWithTimeout(url, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to load trips')
  }
  return await response.json()
}

export async function updateTrip(tripId, updates) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(updates),
  })
  if (!response.ok) {
    throw new Error(`Failed to update trip ${tripId}`)
  }
  return await response.json()
}

export async function deleteTrip(tripId) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || `Failed to delete trip (${response.status})`)
  }
  return data
}

export async function getItinerary(tripId) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/itinerary`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error(`Failed to load itinerary for trip ${tripId}`)
  }
  return await response.json()
}

export async function updateItinerary(tripId, itinerary) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/itinerary`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ itinerary }),
  })
  if (!response.ok) {
    throw new Error(`Failed to update itinerary for trip ${tripId}`)
  }
  return await response.json()
}

// Activity CRUD & Completion Tracking
export async function addTripActivity(tripId, activityPayload) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/itinerary/activities`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(activityPayload),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to add activity')
  }
  return await response.json()
}

export async function completeTripActivity(tripId, activityId, { day = 1, completed = true, actual_time = null } = {}) {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/itinerary/activities/${encodeURIComponent(activityId)}/complete`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ day, completed, actual_time }),
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to update activity completion')
  }
  return await response.json()
}

export async function deleteTripActivity(tripId, activityId, day = null) {
  let url = `${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/itinerary/activities/${encodeURIComponent(activityId)}`
  if (day !== null && day !== undefined) {
    url += `?day=${encodeURIComponent(day)}`
  }
  const response = await fetchWithTimeout(url, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to remove activity')
  }
  return await response.json()
}

// Route Efficiency Optimizer
export async function optimizeDayRoute(tripId, day = 1, startCoords = null) {
  const payload = {
    day: Number(day) || 1,
    start_lat: startCoords?.lat ?? null,
    start_lon: startCoords?.lon ?? null,
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/optimize-route`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to optimize route')
  }
  return await response.json()
}

export async function applyOptimizedDayRoute(tripId, day = 1, optimizedItems = null) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/apply-optimized-route`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ day: Number(day) || 1, optimized_items: optimizedItems }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to apply optimized route')
  }
  return await response.json()
}

// Health Score, Predictive Budget, Analytics, Planned vs Actual
export async function getTripHealthScore(tripId) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/health-score`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch trip health score')
  }
  return await response.json()
}

export async function getPredictiveBudget(tripId) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/predictive-budget`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch predictive budget')
  }
  return await response.json()
}

export async function getTripAnalytics(tripId) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/analytics`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch trip analytics')
  }
  return await response.json()
}

export async function getPlannedVsActual(tripId) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/planned-vs-actual`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch planned vs actual comparison')
  }
  return await response.json()
}

// Places Search & Weather-Aware Suggestions
export async function searchPlaces(query, city = 'Chennai') {
  if (!query || !query.trim()) return []
  const url = `${API_BASE_URL}/places/search?query=${encodeURIComponent(query.trim())}&city=${encodeURIComponent(city || 'Chennai')}`
  const response = await fetchWithTimeout(url, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to search places')
  }
  return await response.json()
}

export async function getSuggestedPlaces(city = 'Chennai', exclude = [], weatherAware = true) {
  let url = `${API_BASE_URL}/places/suggestions?city=${encodeURIComponent(city || 'Chennai')}&weather_aware=${weatherAware}`
  if (exclude && exclude.length > 0) {
    url += `&exclude=${encodeURIComponent(exclude.join(','))}`
  }
  const response = await fetchWithTimeout(url, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to get suggestions')
  }
  return await response.json()
}

export async function generateItinerary(tripId) {
  return await getTrip(tripId)
}

// ============================================================
// 5 NEW ADAPTIVE TRAVEL COMPANION API SERVICES
// ============================================================

// 1. "I Have 2 Hours" — Quick Time Planner
export async function generateQuickPlan(tripId, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/quick-plan`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      trip_id: tripId,
      day: options.day || 1,
      available_minutes: Number(options.availableMinutes || 120),
      user_location: options.userLocation || null,
      transport_mode: options.transportMode || 'cab',
      start_time: options.startTime || null,
      replace_activity_id: options.replaceActivityId || null,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to generate Quick Time mini-plan')
  }
  return await response.json()
}

export async function applyQuickPlan(tripId, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/apply-quick-plan`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      day: options.day || 1,
      mode: options.mode || 'append',
      replace_activity_id: options.replaceActivityId || null,
      activities: options.activities || [],
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to apply Quick Time mini-plan')
  }
  return await response.json()
}

// 2. TripNova Decision Center
export async function getDecisionCenter(tripId, day = 1, userLocation = null) {
  const params = new URLSearchParams({ day: String(day || 1) })
  if (userLocation?.lat !== undefined && userLocation?.lon !== undefined) {
    params.set('lat', String(userLocation.lat))
    params.set('lon', String(userLocation.lon))
  }
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/decision-center?${params.toString()}`,
    { headers: getAuthHeaders() }
  )
  if (!response.ok) {
    throw new Error('Failed to load TripNova Decision Center')
  }
  return await response.json()
}

// 3. "What If?" Trip Simulator
export async function simulateTripScenario(tripId, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/simulate`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      trip_id: tripId,
      day: options.day || 1,
      scenario_type: options.scenarioType || 'rain',
      parameters: options.parameters || {},
      user_location: options.userLocation || null,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to simulate trip scenario')
  }
  return await response.json()
}

export async function applySimulatedPlan(tripId, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/apply-simulation`, {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      day: options.day || 1,
      simulated_day: options.simulatedDay || null,
      simulated_itinerary: options.simulatedItinerary || null,
      moved_to_next_day: options.movedToNextDay || null,
      updated_budget: options.updatedBudget || null,
    }),
  })
  if (!response.ok) {
    throw new Error('Failed to apply simulated plan')
  }
  return await response.json()
}

// 4. Explore Around Me
export async function exploreNearbyPlaces({
  lat = null,
  lon = null,
  city = 'Chennai',
  category = 'All',
  radiusKm = 25,
  exclude = [],
  limit = 24,
} = {}) {
  const params = new URLSearchParams({
    city: city || 'Chennai',
    category: category || 'All',
    radius_km: String(radiusKm),
    limit: String(limit),
  })
  if (lat !== null && lat !== undefined && lon !== null && lon !== undefined) {
    params.set('lat', String(lat))
    params.set('lon', String(lon))
  }
  if (Array.isArray(exclude) && exclude.length > 0) {
    params.set('exclude', exclude.join(','))
  }
  const response = await fetchWithTimeout(`${API_BASE_URL}/places/nearby?${params.toString()}`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to fetch nearby places')
  }
  return await response.json()
}

// 5. Travel Time Buffer
export async function getTravelBuffers(tripId, {
  day = 1,
  bufferMode = 'normal',
  transportMode = 'cab',
  userLocation = null,
} = {}) {
  const params = new URLSearchParams({
    day: String(day || 1),
    buffer_mode: bufferMode || 'normal',
    transport_mode: transportMode || 'cab',
  })
  if (userLocation?.lat !== undefined && userLocation?.lon !== undefined) {
    params.set('lat', String(userLocation.lat))
    params.set('lon', String(userLocation.lon))
  }
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/travel-buffer?${params.toString()}`,
    { headers: getAuthHeaders() }
  )
  if (!response.ok) {
    throw new Error('Failed to compute travel buffers')
  }
  return await response.json()
}

