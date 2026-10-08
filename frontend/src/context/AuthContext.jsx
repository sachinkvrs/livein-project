import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { signup as signupApi, login as loginApi, getMe as getMeApi, updateProfile as updateProfileApi, logout as logoutApi } from '../services/authService'

export function getInitials(name) {
  if (!name || typeof name !== 'string') return 'U'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('tripnova_user_data')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })
  const [token, setToken] = useState(() => localStorage.getItem('tripnova_user_token'))
  const [isLoading, setIsLoading] = useState(true)

  // Validate and restore user session on mount
  useEffect(() => {
    let mounted = true

    async function restoreSession() {
      const savedToken = localStorage.getItem('tripnova_user_token')
      if (!savedToken) {
        if (mounted) {
          setUser(null)
          setIsLoading(false)
        }
        return
      }

      try {
        const userData = await getMeApi()
        if (mounted && userData) {
          setUser(userData)
          localStorage.setItem('tripnova_user_data', JSON.stringify(userData))
        }
      } catch (err) {
        console.warn('[TripNova Auth] Session validation failed:', err)
        if (mounted) {
          // If token is invalid or user not found, clear auth
          setUser(null)
          setToken(null)
          localStorage.removeItem('tripnova_user_token')
          localStorage.removeItem('tripnova_user_data')
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    restoreSession()
    return () => {
      mounted = false
    }
  }, [])

  const signup = useCallback(async ({ name, email, password }) => {
    const res = await signupApi({ name, email, password })
    setUser(res.user)
    setToken(res.token)
    localStorage.setItem('tripnova_user_token', res.token)
    localStorage.setItem('tripnova_user_data', JSON.stringify(res.user))
    return res.user
  }, [])

  const login = useCallback(async ({ email, password }) => {
    const res = await loginApi({ email, password })
    setUser(res.user)
    setToken(res.token)
    localStorage.setItem('tripnova_user_token', res.token)
    localStorage.setItem('tripnova_user_data', JSON.stringify(res.user))
    return res.user
  }, [])

  const logout = useCallback(async () => {
    const currentUserId = user?.id
    await logoutApi()
    setUser(null)
    setToken(null)
    localStorage.removeItem('tripnova_user_token')
    localStorage.removeItem('tripnova_user_data')
    localStorage.removeItem('tripnova_active_trip_id')
    if (currentUserId) {
      localStorage.removeItem(`tripnova_active_trip_id_${currentUserId}`)
    }
  }, [user?.id])

  const updateProfile = useCallback(async (updates) => {
    const updatedUser = await updateProfileApi(updates)
    setUser(updatedUser)
    localStorage.setItem('tripnova_user_data', JSON.stringify(updatedUser))
    return updatedUser
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(user),
      isLoading,
      initials: getInitials(user?.name),
      signup,
      login,
      logout,
      updateProfile,
    }),
    [user, token, isLoading, signup, login, logout, updateProfile]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
