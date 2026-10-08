const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export function buildRecommendationPayload(formData = {}) {
  return {
    category: formData.category || null,
    travelling_with: formData.travelling_with || null,
    budget: formData.budgetLevel || null,
    preferred_time: formData.preferred_time || null,
    startDate: formData.startDate || null,
    endDate: formData.endDate || null,
    interests: formData.interests?.length ? formData.interests : null,
  }
}

export async function getRecommendations(formData = {}) {
  const payload = buildRecommendationPayload(formData)
  console.log('[TripNova] POST /recommend', payload)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    throw new Error(`Cannot connect to TripNova backend at ${API_BASE_URL}. Make sure FastAPI is running.`)
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(data?.detail || `Backend returned HTTP ${response.status}`)
  }

  if (!data || !Array.isArray(data.itinerary)) {
    throw new Error('Backend returned an unexpected recommendation response.')
  }

  console.log('[TripNova] Recommendation itinerary received', data)
  return data
}

// Kept for ChatWindow compatibility.
export async function getPlacesByIds(ids = []) {
  return Array.isArray(ids) ? ids : []
}
