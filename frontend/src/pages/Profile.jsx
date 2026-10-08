import { useState, useEffect } from 'react'
import {
  User,
  Mail,
  Image,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Compass,
  MapPin,
  Wallet,
  Heart,
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import Card, { CardHeader } from '../components/ui/Card'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import AnimatedNumber from '../components/ui/AnimatedNumber'
import { useAuth } from '../context/AuthContext'
import { useTrip } from '../context/TripContext'
import { getCategoryIcon } from '../utils/destinationVisuals'

const activityOptions = [
  'Nature',
  'Adventure',
  'Culture',
  'Beach',
  'Food',
  'Photography',
  'Heritage',
  'Shopping',
  'Relaxation',
]

const budgetOptions = [
  { value: 'Budget', label: 'Budget (₹ - Value focused)' },
  { value: 'Moderate', label: 'Moderate (₹₹ - Balanced)' },
  { value: 'High', label: 'High (₹₹₹ - Premium)' },
  { value: 'Luxury', label: 'Luxury (₹₹₹₹ - 5 Star)' },
]

const travelStyleOptions = [
  { value: 'Relaxed', label: 'Relaxed (Paced & Leisurely)' },
  { value: 'Balanced', label: 'Balanced (Mix of Sightseeing & Rest)' },
  { value: 'Adventure', label: 'Adventure (Active & Fast-paced)' },
  { value: 'Cultural', label: 'Cultural (Deep Heritage & Arts)' },
]

const defaultWeights = {
  Adventure: 80,
  Food: 70,
  Museums: 40,
  Nature: 75,
  Beach: 65,
  Heritage: 60,
  Shopping: 45,
}

export default function Profile() {
  const { user, initials, updateProfile } = useAuth()
  const { trip, itinerary, travelProfile, updateTravelProfile } = useTrip()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [profileImage, setProfileImage] = useState(user?.profile_image || '')
  const [budgetPreference, setBudgetPreference] = useState(user?.budget_preference || 'Moderate')
  const [travelStyle, setTravelStyle] = useState(user?.travel_style || 'Balanced')
  const [favoriteActivities, setFavoriteActivities] = useState(
    user?.favorite_activities || ['Nature', 'Culture', 'Food']
  )

  const [categoryWeights, setCategoryWeights] = useState(
    travelProfile?.category_weights || defaultWeights
  )
  const [preferredDistanceKm, setPreferredDistanceKm] = useState(
    travelProfile?.preferred_distance_km || 15
  )
  const [preferredDurationHrs, setPreferredDurationHrs] = useState(
    travelProfile?.preferred_duration_hours || 2.0
  )

  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
      setProfileImage(user.profile_image || '')
      setBudgetPreference(user.budget_preference || 'Moderate')
      setTravelStyle(user.travel_style || 'Balanced')
      setFavoriteActivities(user.favorite_activities || ['Nature', 'Culture', 'Food'])
    }
  }, [user])

  useEffect(() => {
    if (travelProfile) {
      if (travelProfile.category_weights) {
        setCategoryWeights((prev) => ({ ...prev, ...travelProfile.category_weights }))
      }
      if (travelProfile.preferred_distance_km) {
        setPreferredDistanceKm(travelProfile.preferred_distance_km)
      }
      if (travelProfile.preferred_duration_hours) {
        setPreferredDurationHrs(travelProfile.preferred_duration_hours)
      }
    }
  }, [travelProfile])

  const toggleActivity = (act) => {
    setFavoriteActivities((prev) =>
      prev.includes(act) ? prev.filter((a) => a !== act) : [...prev, act]
    )
  }

  const handleWeightChange = (category, val) => {
    setCategoryWeights((prev) => ({
      ...prev,
      [category]: Number(val),
    }))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('Name cannot be empty')
      return
    }

    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim(),
        profile_image: profileImage.trim() || null,
        budget_preference: budgetPreference,
        travel_style: travelStyle,
        favorite_activities: favoriteActivities,
      })
      if (updateTravelProfile) {
        await updateTravelProfile({
          category_weights: categoryWeights,
          preferred_distance_km: Number(preferredDistanceKm),
          preferred_duration_hours: Number(preferredDurationHrs),
          preferred_budget: budgetPreference,
          favorite_activities: favoriteActivities,
        })
      }
      setSuccessMsg(
        'Profile and learned travel preferences updated! Future recommendations will adapt automatically.'
      )
      setTimeout(() => setSuccessMsg(null), 4000)
    } catch (err) {
      console.error('Update profile error:', err)
      setErrorMsg(err.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const totalPlacesCount = Math.max(
    24,
    (itinerary || []).reduce((acc, d) => acc + (d.items?.length || 0), 0)
  )
  const totalSpentStat = Number(trip?.spent) > 0 ? Number(trip.spent) : 48500

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-secondary-500/30 bg-secondary-500/10 px-3 py-0.5 text-[11px] font-bold uppercase tracking-widest text-secondary-500">
            <Sparkles className="h-3.5 w-3.5" />
            Your Travel Profile
          </div>
          <h1 className="text-2xl font-extrabold text-ink sm:text-3xl">
            Profile & Travel Intelligence
          </h1>
          <p className="text-sm text-ink-muted">
            Personalize your traveler identity and inspect how TripNova AI adapts to your style.
          </p>
        </div>

        {/* Visual Travel Profile Stats Banner */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card className="p-4 flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary-500/10 text-secondary-500 border border-secondary-500/20">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-ink">
                <AnimatedNumber value={8} />
              </p>
              <p className="text-xs font-semibold text-ink-muted">Trips</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-ink">
                <AnimatedNumber value={totalPlacesCount} />
              </p>
              <p className="text-xs font-semibold text-ink-muted">Places</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-ink">
                <AnimatedNumber value={totalSpentStat} prefix="₹" />
              </p>
              <p className="text-xs font-semibold text-ink-muted">Spent</p>
            </div>
          </Card>

          <Card className="p-4 flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-extrabold text-ink">
                <AnimatedNumber value={favoriteActivities.length || 3} />
              </p>
              <p className="text-xs font-semibold text-ink-muted">Favorites</p>
            </div>
          </Card>
        </div>

        {successMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 shadow-soft">
            <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-danger/20 bg-danger-bg p-4 text-sm font-medium text-danger shadow-soft">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-danger" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <Card className="p-6">
            <div className="mb-6 flex items-center gap-4">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt={name || 'User Avatar'}
                  className="h-16 w-16 rounded-2xl object-cover border-2 border-secondary-500 shadow-glow"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-secondary-500 to-purple-600 text-xl font-extrabold text-white shadow-glow">
                  {initials}
                </div>
              )}
              <div>
                <p className="text-lg font-extrabold text-ink">{name || 'Your Name'}</p>
                <p className="text-sm text-ink-muted">{email || 'your.email@example.com'}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Full Name"
                name="name"
                icon={User}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                required
              />
              <Input
                label="Email Address"
                type="email"
                name="email"
                icon={Mail}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="mt-4">
              <Input
                label="Profile Image URL (Optional)"
                name="profileImage"
                icon={Image}
                value={profileImage}
                onChange={(e) => setProfileImage(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>
          </Card>

          {/* Learned Preferences */}
          <Card variant="ai" className="p-6">
            <CardHeader
              icon={Sparkles}
              title="Adaptive AI Preference Weights"
              subtitle="Automatically learned from your completed activities, added stops, and budget choices — or fine-tune manually below."
              badge={<Badge tone="ai">Adaptive AI Profile</Badge>}
            />

            <div className="space-y-4">
              {Object.entries(categoryWeights).map(([category, pct]) => {
                const Icon = getCategoryIcon(category)
                return (
                  <div key={category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="inline-flex items-center gap-2 font-bold text-ink">
                        <Icon className="h-3.5 w-3.5 text-secondary-500" />
                        {category}
                      </span>
                      <span className="font-extrabold text-secondary-500">{pct}%</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={pct}
                      onChange={(e) => handleWeightChange(category, e.target.value)}
                      className="w-full accent-secondary-500 cursor-pointer h-1.5 rounded-lg bg-surface-muted"
                    />
                  </div>
                )
              })}

              <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t border-border">
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Preferred Max Travel Distance:{' '}
                    <span className="text-secondary-500">{preferredDistanceKm} km</span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="40"
                    step="1"
                    value={preferredDistanceKm}
                    onChange={(e) => setPreferredDistanceKm(Number(e.target.value))}
                    className="w-full accent-secondary-500 cursor-pointer h-1.5 rounded-lg bg-surface-muted"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-ink mb-1.5">
                    Preferred Activity Duration:{' '}
                    <span className="text-secondary-500">{preferredDurationHrs} hrs</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={preferredDurationHrs}
                    onChange={(e) => setPreferredDurationHrs(Number(e.target.value))}
                    className="w-full accent-secondary-500 cursor-pointer h-1.5 rounded-lg bg-surface-muted"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <CardHeader
              title="Travel Preferences"
              subtitle="Used to personalize day-by-day recommendations"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Budget preference"
                options={budgetOptions}
                value={budgetPreference}
                onChange={(e) => setBudgetPreference(e.target.value)}
              />
              <Select
                label="Preferred travel style"
                options={travelStyleOptions}
                value={travelStyle}
                onChange={(e) => setTravelStyle(e.target.value)}
              />
            </div>

            <div className="mt-5">
              <p className="mb-2.5 text-sm font-bold text-ink">Favorite travel activities</p>
              <div className="flex flex-wrap gap-2">
                {activityOptions.map((act) => {
                  const active = favoriteActivities.includes(act)
                  const Icon = getCategoryIcon(act)
                  return (
                    <button
                      type="button"
                      key={act}
                      onClick={() => toggleActivity(act)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                        active
                          ? 'border border-secondary-500 bg-secondary-500 text-white shadow-sm'
                          : 'border border-border bg-surface text-ink-muted hover:border-secondary-400 hover:text-ink'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {act}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>

          <Button type="submit" size="lg" loading={saving}>
            Save Profile & Preferences
          </Button>
        </form>
      </div>
    </DashboardLayout>
  )
}
