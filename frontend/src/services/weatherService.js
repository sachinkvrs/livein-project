const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

export async function getWeather(tripId, destination = 'Chennai') {
  try {
    let url = `${API_BASE_URL}/api/weather?city=${encodeURIComponent(destination)}`
    if (tripId) {
      url = `${API_BASE_URL}/trips/${tripId}/weather`
    }
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Weather API returned ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.warn('[TripNova] Weather fetch error, using fallback:', error)
    return {
      location: destination || 'Chennai',
      tempC: 28,
      temp_c: 28,
      condition: 'Partly Cloudy',
      rain_probability: 10,
      humidity: 65,
      wind_speed_kmh: 12,
      last_updated: 'Just now',
      status: 'fallback',
    }
  }
}

export function computeLiveTripStatus(alertActive = false, weatherData = null) {
  if (alertActive) {
    return {
      weather: { level: 'danger', label: 'Rain Alert' },
      roads: { level: 'warning', label: 'Moderate Flooding' },
      traffic: { level: 'warning', label: 'Slow on Coast Rd' },
      transport: { level: 'success', label: 'Metro Running' },
    }
  }

  const rainProb = weatherData?.rain_probability ?? 0
  const weatherLevel = rainProb > 60 ? 'warning' : 'success'
  const weatherLabel = weatherData?.condition || 'Clear Sky'

  return {
    weather: { level: weatherLevel, label: weatherLabel },
    roads: { level: 'success', label: 'All Open' },
    traffic: { level: 'success', label: 'Normal Flow' },
    transport: { level: 'success', label: 'On Schedule' },
  }
}
