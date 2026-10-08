const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function getRouteForDay(tripId, day = 1) {
  if (!tripId) return null
  try {
    const response = await fetch(`${API_BASE_URL}/trips/${tripId}/route?day=${day}`)
    if (!response.ok) return null
    return await response.json()
  } catch (e) {
    console.warn('[TripNova] Route fetch failed:', e)
    return null
  }
}

export function calculateCenterAndBounds(places = []) {
  const validPlaces = places.filter(
    (p) => p && Number.isFinite(Number(p.latitude)) && Number.isFinite(Number(p.longitude))
  )

  if (validPlaces.length === 0) {
    return {
      center: [13.0827, 80.2707],
      bounds: null,
      zoom: 12,
    }
  }

  if (validPlaces.length === 1) {
    return {
      center: [Number(validPlaces[0].latitude), Number(validPlaces[0].longitude)],
      bounds: null,
      zoom: 14,
    }
  }

  const lats = validPlaces.map((p) => Number(p.latitude))
  const lngs = validPlaces.map((p) => Number(p.longitude))

  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)

  return {
    center: [(minLat + maxLat) / 2, (minLng + maxLng) / 2],
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
    zoom: 12,
  }
}