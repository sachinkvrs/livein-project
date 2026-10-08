const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'

function getAuthHeaders() {
  const token = localStorage.getItem('tripnova_user_token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) {
    headers['X-User-Id'] = token
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

async function safeFetch(url, options = {}) {
  try {
    return await fetch(url, options)
  } catch {
    throw new Error(
      `Cannot connect to TripNova backend at ${API_BASE_URL}. Please start the FastAPI backend with: uvicorn main:app --reload --port 8000`
    )
  }
}

export async function signup({ name, email, password }) {
  const response = await safeFetch(`${API_BASE_URL}/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || 'Failed to create account')
  }
  return data
}

export async function login({ email, password }) {
  const response = await safeFetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || 'Invalid email or password')
  }
  return data
}

export async function getMe() {
  const headers = getAuthHeaders()
  if (!headers['X-User-Id']) {
    return null
  }

  const response = await safeFetch(`${API_BASE_URL}/users/me`, {
    headers,
  })

  if (!response.ok) {
    throw new Error('Failed to fetch authenticated user')
  }
  return await response.json()
}

export async function updateProfile(updates) {
  const headers = getAuthHeaders()
  const response = await safeFetch(`${API_BASE_URL}/users/me`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(updates),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || 'Failed to update profile')
  }
  return data
}

export async function getTravelProfile() {
  const headers = getAuthHeaders()
  const response = await safeFetch(`${API_BASE_URL}/users/me/travel-profile`, {
    headers,
  })
  if (!response.ok) {
    throw new Error('Failed to load travel profile')
  }
  return await response.json()
}

export async function updateTravelProfile(profileUpdates) {
  const headers = getAuthHeaders()
  const response = await safeFetch(`${API_BASE_URL}/users/me/travel-profile`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(profileUpdates),
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.detail || 'Failed to update travel profile')
  }
  return data
}

export async function logout() {
  const headers = getAuthHeaders()
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      headers,
    })
  } catch {
    // Ignore network error on logout
  }
}
