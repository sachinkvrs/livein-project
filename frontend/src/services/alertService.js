import { getAuthHeaders } from './tripService'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function simulateWeatherAlert(tripId, dayNumber = 1, options = {}) {
  if (!tripId) {
    throw new Error('No active trip ID available for alert analysis.')
  }

  const response = await fetch(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/simulate-alert`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      day: dayNumber,
      severity: options.severity || 'critical',
      condition: options.condition || 'Heavy Rain',
      reason: options.reason || null,
      user_location: options.userLocation || null,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to simulate weather alert')
  }

  return await response.json()
}

export async function requestReplan(tripId, dayNumber = 1, reason = 'Rain expected at 3 PM', userLocation = null) {
  const response = await fetch(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/replan`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({
      day: dayNumber,
      reason,
      user_location: userLocation,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to replan trip day')
  }

  return await response.json()
}

export async function acceptReplan(tripId, dayNumber = 1, { proposedDay = null, movedToNextDay = null, alternativeId = null } = {}) {
  const response = await fetch(
    `${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/accept-replan?day_number=${dayNumber}`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        day_number: dayNumber,
        alternative_id: alternativeId,
        proposed_day: proposedDay,
        moved_to_next_day: movedToNextDay,
      }),
    }
  )

  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to accept replan')
  }

  return await response.json()
}
