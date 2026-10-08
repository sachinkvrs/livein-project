import { getAuthHeaders } from './tripService'
import { getMockAiReply } from '../data/mockChat'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function sendMessage(message, context = {}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  try {
    const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        message,
        trip_id: context.tripId || null,
        active_day: context.activeDay || 1,
        user_location: context.userLocation || null,
        last_recommended_places: context.lastRecommendedPlaces || null,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      const err = await response.json().catch(() => null)
      throw new Error(err?.detail || `AI service error (${response.status})`)
    }

    const data = await response.json()
    return {
      text: data.text,
      recommendations: data.recommendations || [],
      action_performed: data.action_performed || null,
      intent: data.intent || 'general',
      isFallback: false,
    }
  } catch (err) {
    console.warn('[TripNova AI] Backend chat unavailable, using local fallback:', err)
    const fallback = getMockAiReply(message)
    return {
      text: `${fallback.text}\n\n*(Note: Offline fallback response — connect to TripNova backend for live trip actions.)*`,
      recommendations: [],
      action_performed: null,
      intent: 'fallback',
      isFallback: true,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
