import { useEffect } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'

export default function TripRequiredRoute({ children, noticeMessage }) {
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth()
  const {
    hasTrips,
    trip,
    trips,
    isLoadingTrip,
    setNavigationNotice,
  } = useTrip()
  const location = useLocation()

  const isChecking = isAuthLoading || isLoadingTrip

  const hasValidActiveTrip = Boolean(
    !isChecking &&
      isAuthenticated &&
      hasTrips &&
      trip?.id &&
      Array.isArray(trips) &&
      trips.some((t) => t && t.id === trip.id && (!t.user_id || t.user_id === user?.id))
  )

  useEffect(() => {
    if (!isChecking && isAuthenticated && !hasValidActiveTrip) {
      const isExplorePath =
        location.pathname.includes('explore') ||
        location.search.includes('view=explore')
      const defaultMsg = isExplorePath
        ? 'Create a trip first to explore nearby places.'
        : 'Create a trip first to use Map & Route.'
      setNavigationNotice(noticeMessage || defaultMsg)
    }
  }, [
    isChecking,
    isAuthenticated,
    hasValidActiveTrip,
    location.pathname,
    location.search,
    noticeMessage,
    setNavigationNotice,
  ])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-page">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-secondary-500" />
          <p className="text-sm font-medium text-ink-muted">
            Verifying your active trips…
          </p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!hasValidActiveTrip) {
    return <Navigate to="/my-trips" replace />
  }

  return children
}
