import { Routes, Route } from 'react-router-dom'
import Landing from '../pages/Landing'
import Login from '../pages/Login'
import Signup from '../pages/Signup'
import PlanTrip from '../pages/PlanTrip'
import Dashboard from '../pages/Dashboard'
import Itinerary from '../pages/Itinerary'
import MapPage from '../pages/MapPage'
import Replanning from '../pages/Replanning'
import Assistant from '../pages/Assistant'
import Alerts from '../pages/Alerts'
import Expenses from '../pages/Expenses'
import MyTrips from '../pages/MyTrips'
import Profile from '../pages/Profile'
import Settings from '../pages/Settings'
import LiveTrip from '../pages/LiveTrip'
import DecisionCenter from '../pages/DecisionCenter'
import ProtectedRoute from './ProtectedRoute'
import TripRequiredRoute from './TripRequiredRoute'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected Routes */}
      <Route
        path="/plan"
        element={
          <ProtectedRoute>
            <PlanTrip />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/decisions"
        element={
          <ProtectedRoute>
            <DecisionCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulator"
        element={
          <ProtectedRoute>
            <DecisionCenter />
          </ProtectedRoute>
        }
      />
      <Route
        path="/live"
        element={
          <ProtectedRoute>
            <LiveTrip />
          </ProtectedRoute>
        }
      />
      <Route
        path="/itinerary"
        element={
          <ProtectedRoute>
            <Itinerary />
          </ProtectedRoute>
        }
      />
      {/* Trip-Protected Map & Explore Routes */}
      <Route
        path="/map"
        element={
          <TripRequiredRoute noticeMessage="Create a trip first to use Map & Route.">
            <MapPage />
          </TripRequiredRoute>
        }
      />
      <Route
        path="/map-route"
        element={
          <TripRequiredRoute noticeMessage="Create a trip first to use Map & Route.">
            <MapPage />
          </TripRequiredRoute>
        }
      />
      <Route
        path="/explore"
        element={
          <TripRequiredRoute noticeMessage="Create a trip first to explore nearby places.">
            <MapPage />
          </TripRequiredRoute>
        }
      />
      <Route
        path="/explore-nearby"
        element={
          <TripRequiredRoute noticeMessage="Create a trip first to explore nearby places.">
            <MapPage />
          </TripRequiredRoute>
        }
      />
      <Route
        path="/replanning"
        element={
          <ProtectedRoute>
            <Replanning />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <Assistant />
          </ProtectedRoute>
        }
      />
      <Route
        path="/alerts"
        element={
          <ProtectedRoute>
            <Alerts />
          </ProtectedRoute>
        }
      />
      <Route
        path="/bookings"
        element={
          <ProtectedRoute>
            <MyTrips />
          </ProtectedRoute>
        }
      />
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <Expenses />
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-trips"
        element={
          <ProtectedRoute>
            <MyTrips />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
