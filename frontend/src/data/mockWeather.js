export const mockWeather = {
  city: 'Munnar',
  tempC: 24,
  condition: 'Light Rain',
  forecast: [
    { day: 'Today', tempC: 24, condition: 'Light Rain' },
    { day: 'Tomorrow', tempC: 22, condition: 'Cloudy' },
    { day: 'Day 3', tempC: 26, condition: 'Sunny' },
  ],
}

export const liveTripStatus = {
  weather: { label: 'Good', level: 'success' },
  roads: { label: 'Clear', level: 'success' },
  traffic: { label: 'Light', level: 'success' },
  transport: { label: 'On Time', level: 'success' },
}

export const liveTripStatusAlert = {
  weather: { label: 'Heavy Rain', level: 'danger' },
  roads: { label: 'Slippery', level: 'warning' },
  traffic: { label: 'Light', level: 'success' },
  transport: { label: 'On Time', level: 'success' },
}
