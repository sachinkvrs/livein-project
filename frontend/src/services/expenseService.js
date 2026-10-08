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

export async function getExpenses(tripId) {
  if (!tripId) return []
  const response = await fetch(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/expenses`, {
    headers: getAuthHeaders(),
  })
  if (!response.ok) {
    throw new Error('Failed to load expenses')
  }
  return await response.json()
}

export async function addExpense(tripId, expenseData) {
  const response = await fetch(`${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/expenses`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(expenseData),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to add expense')
  }
  return await response.json()
}

export async function deleteExpense(tripId, expenseId) {
  const response = await fetch(
    `${API_BASE_URL}/trips/${encodeURIComponent(tripId)}/expenses/${encodeURIComponent(expenseId)}`,
    {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }
  )
  if (!response.ok) {
    const err = await response.json().catch(() => null)
    throw new Error(err?.detail || 'Failed to delete expense')
  }
  return await response.json()
}
