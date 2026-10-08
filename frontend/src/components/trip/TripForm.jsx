import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MapPin,
  Users,
  Wallet,
  Clock,
  Calendar,
  Sparkles,
  Check,
  Sun,
  Sunset,
  Moon,
  Coffee,
  Heart,
  UserCheck,
  UsersRound,
} from 'lucide-react'
import Input from '../ui/Input'
import DatePicker from '../ui/DatePicker'
import Button from '../ui/Button'
import { defaultTripForm } from '../../data/mockTrips'
import {
  getDestinationVisual,
  getCategoryIcon,
} from '../../utils/destinationVisuals'

const featuredDestinations = [
  'Kerala',
  'Chennai',
  'Goa',
  'Munnar',
  'Ooty',
  'Jaipur',
  'Manali',
  'Pondicherry',
]

const travellingWithCards = [
  { value: 'solo', label: 'Solo Explorer', desc: 'Flexible pace & hidden gems', icon: UserCheck },
  { value: 'couple', label: 'Couple Retreat', desc: 'Scenic & romantic stops', icon: Heart },
  { value: 'friends', label: 'Friends Group', desc: 'Vibrant spots & adventure', icon: UsersRound },
  { value: 'family', label: 'Family Comfort', desc: 'Safe, relaxed & kid-friendly', icon: Users },
]

const budgetTierCards = [
  { value: 'Budget', label: 'Budget', range: '₹5k – ₹15k', preset: 12000 },
  { value: 'Moderate', label: 'Moderate', range: '₹15k – ₹35k', preset: 25000 },
  { value: 'High', label: 'Comfort', range: '₹35k – ₹65k', preset: 45000 },
  { value: 'Premium', label: 'Luxury', range: '₹65k+', preset: 80000 },
]

const preferredTimeCards = [
  { value: 'morning', label: 'Morning', desc: 'Early starts & sunrise views', icon: Coffee },
  { value: 'afternoon', label: 'Afternoon', desc: 'Relaxed midday exploration', icon: Sun },
  { value: 'evening', label: 'Evening', desc: 'Golden hour & cultural walks', icon: Sunset },
  { value: 'night', label: 'Night', desc: 'Late dining & city lights', icon: Moon },
]

const interestOptions = [
  'Nature',
  'Beach',
  'Adventure',
  'History',
  'Religious',
  'Culture',
  'Shopping',
  'Food',
  'Photography',
  'Relaxation',
  'Wildlife',
  'Art',
  'Heritage',
  'Scenic',
  'Outdoor',
  'Indoor',
  'Romantic',
  'Peaceful',
]

const steps = [
  { num: '01', label: 'Destination' },
  { num: '02', label: 'Dates' },
  { num: '03', label: 'Budget' },
  { num: '04', label: 'Interests' },
  { num: '05', label: 'Style' },
  { num: '06', label: 'Generate' },
]

export default function TripForm({ onSubmit, submitting, onFormChange }) {
  const [searchParams] = useSearchParams()
  const prefilledDest = searchParams.get('destination') || ''
  const [form, setForm] = useState(() => ({
    ...defaultTripForm,
    destination: prefilledDest || defaultTripForm.destination,
  }))
  const [errors, setErrors] = useState({})
  const [activeStep, setActiveStep] = useState(1)

  useEffect(() => {
    if (prefilledDest) {
      setForm((prev) => ({ ...prev, destination: prefilledDest }))
    }
  }, [prefilledDest])

  // Automatically calculate trip days from start and end dates
  const calculatedDays = useMemo(() => {
    if (!form.startDate || !form.endDate) return 0
    const start = new Date(form.startDate)
    const end = new Date(form.endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1
    return diffDays
  }, [form.startDate, form.endDate])

  useEffect(() => {
    if (onFormChange) {
      onFormChange({ ...form, calculatedDays })
    }
  }, [form, calculatedDays, onFormChange])

  const update = (key, value) => {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }))
  }

  const toggleInterest = (interest) => {
    setForm((currentForm) => ({
      ...currentForm,
      interests: currentForm.interests.includes(interest)
        ? currentForm.interests.filter((item) => item !== interest)
        : [...currentForm.interests, interest],
    }))
  }

  const validate = () => {
    const nextErrors = {}

    if (!form.destination?.trim()) {
      nextErrors.destination = 'Enter or select a destination to continue.'
    }
    if (!form.travellers || Number(form.travellers) < 1) {
      nextErrors.travellers = 'Enter at least 1 traveller.'
    }
    if (!form.startDate) {
      nextErrors.startDate = 'Select a start date.'
    }
    if (!form.endDate) {
      nextErrors.endDate = 'Select an end date.'
    }
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      nextErrors.endDate = 'End date must be after the start date.'
    }
    if (!form.travelling_with) {
      nextErrors.travelling_with = 'Select who you are travelling with.'
    }
    if (!form.preferred_time) {
      nextErrors.preferred_time = 'Select your preferred time.'
    }
    if (!form.budgetLevel) {
      nextErrors.budgetLevel = 'Select your budget tier.'
    }
    if (
      form.tripBudget === undefined ||
      form.tripBudget === null ||
      form.tripBudget === '' ||
      Number(form.tripBudget) < 0
    ) {
      nextErrors.tripBudget = 'Enter a valid trip budget.'
    }
    if (!form.interests?.length) {
      nextErrors.interests = 'Choose at least one interest.'
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (validate()) {
      onSubmit(form)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {/* Guided 6-Step Progress Strip */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {steps.map((s, idx) => {
          const stepIndex = idx + 1
          const isCurrent = activeStep === stepIndex
          const isCompleted = activeStep > stepIndex
          return (
            <button
              key={s.num}
              type="button"
              onClick={() => setActiveStep(stepIndex)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                isCurrent
                  ? 'border-secondary-500 bg-secondary-500/10 text-secondary-500 shadow-xs'
                  : isCompleted
                  ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500'
                  : 'border-border bg-surface/60 text-ink-muted hover:text-ink'
              }`}
            >
              <span className="text-[11px] font-extrabold">{s.num}</span>
              <span className="truncate text-xs font-bold">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* STEP 01: DESTINATION */}
      <div
        onFocus={() => setActiveStep(1)}
        onClick={() => setActiveStep(1)}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-500">
              01 · Destination
            </span>
            <h3 className="text-base font-bold text-ink">
              Where are you heading?
            </h3>
          </div>
          <span className="text-xs text-ink-muted">Pick a popular spot or type any city</span>
        </div>

        {/* Visual Quick-Select Destination Cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {featuredDestinations.map((dest) => {
            const visual = getDestinationVisual(dest)
            const isSelected =
              form.destination?.toLowerCase() === dest.toLowerCase()
            return (
              <button
                key={dest}
                type="button"
                onClick={() => update('destination', dest)}
                className={`group relative h-24 overflow-hidden rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-secondary-500 ring-2 ring-secondary-500/40 scale-[1.02]'
                    : 'border-border hover:border-secondary-400'
                }`}
              >
                <img
                  src={visual.image}
                  alt={dest}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
                {isSelected && (
                  <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-secondary-500 text-white shadow-sm">
                    <Check className="h-3 w-3" />
                  </span>
                )}
                <div className="absolute bottom-2 left-2.5 right-2">
                  <p className="text-xs font-extrabold text-white">{dest}</p>
                  <p className="truncate text-[10px] text-zinc-300">
                    {visual.tagline}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Destination City or Region"
            name="destination"
            placeholder="Enter destination (e.g. Chennai, Kerala, Goa)"
            icon={MapPin}
            value={form.destination}
            error={errors.destination}
            onChange={(event) => update('destination', event.target.value)}
          />

          <Input
            label="Number of Travellers"
            name="travellers"
            type="number"
            min={1}
            placeholder="Enter number of travellers"
            icon={Users}
            value={form.travellers}
            error={errors.travellers}
            onChange={(event) =>
              update(
                'travellers',
                event.target.value ? Number(event.target.value) : ''
              )
            }
          />
        </div>
      </div>

      {/* STEP 02: DATES */}
      <div
        onFocus={() => setActiveStep(2)}
        onClick={() => setActiveStep(2)}
        className="space-y-3 border-t border-border pt-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-500">
              02 · Dates & Duration
            </span>
            <h3 className="text-base font-bold text-ink">
              When are you travelling?
            </h3>
          </div>
          {calculatedDays > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary-500/10 border border-secondary-500/30 px-3 py-1 text-xs font-bold text-secondary-500">
              <Calendar className="h-3.5 w-3.5" />
              {calculatedDays} Day{calculatedDays === 1 ? '' : 's'} Journey
            </span>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker
            label="Start date"
            name="startDate"
            value={form.startDate}
            error={errors.startDate}
            onChange={(event) => update('startDate', event.target.value)}
          />

          <DatePicker
            label="End date"
            name="endDate"
            value={form.endDate}
            error={errors.endDate}
            onChange={(event) => update('endDate', event.target.value)}
          />
        </div>
      </div>

      {/* STEP 03: BUDGET */}
      <div
        onFocus={() => setActiveStep(3)}
        onClick={() => setActiveStep(3)}
        className="space-y-4 border-t border-border pt-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-500">
              03 · Budget Intelligence
            </span>
            <h3 className="text-base font-bold text-ink">
              Set your comfort tier & total budget
            </h3>
          </div>
          <span className="text-sm font-extrabold text-secondary-500">
            ₹{Number(form.tripBudget || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {budgetTierCards.map((tier) => {
            const active = form.budgetLevel === tier.value
            return (
              <button
                key={tier.value}
                type="button"
                onClick={() => {
                  update('budgetLevel', tier.value)
                  if (!form.tripBudget || form.tripBudget === 20000) {
                    update('tripBudget', tier.preset)
                  }
                }}
                className={`rounded-2xl border p-3 text-left transition-all ${
                  active
                    ? 'border-secondary-500 bg-secondary-500/10 text-ink shadow-xs'
                    : 'border-border bg-surface hover:border-secondary-400 text-ink-muted'
                }`}
              >
                <p className="text-xs font-extrabold text-ink">{tier.label}</p>
                <p className="mt-0.5 text-[11px] text-secondary-500 font-semibold">
                  {tier.range}
                </p>
              </button>
            )
          })}
        </div>
        {errors.budgetLevel && (
          <p className="text-xs font-medium text-danger">{errors.budgetLevel}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-[1fr_220px] items-center rounded-2xl border border-border bg-surface p-4">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-ink-muted mb-2">
              <span>Interactive Budget Slider</span>
              <span>₹5,000 – ₹1,50,000</span>
            </div>
            <input
              type="range"
              min={5000}
              max={150000}
              step={1000}
              value={Math.min(150000, Math.max(5000, Number(form.tripBudget) || 20000))}
              onChange={(e) => update('tripBudget', Number(e.target.value))}
              className="w-full accent-secondary-500 cursor-pointer"
            />
          </div>
          <Input
            label="Exact Budget (₹)"
            name="tripBudget"
            type="number"
            min={0}
            placeholder="20000"
            icon={Wallet}
            value={form.tripBudget}
            error={errors.tripBudget}
            onChange={(event) =>
              update(
                'tripBudget',
                event.target.value ? Number(event.target.value) : ''
              )
            }
          />
        </div>
      </div>

      {/* STEP 04: INTERESTS */}
      <div
        onFocus={() => setActiveStep(4)}
        onClick={() => setActiveStep(4)}
        className="space-y-3 border-t border-border pt-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-500">
              04 · Interests & Vibe
            </span>
            <h3 className="text-base font-bold text-ink">
              What experiences excite you?
            </h3>
          </div>
          <span className="text-xs font-semibold text-ink-muted">
            {form.interests.length} selected
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {interestOptions.map((interest) => {
            const active = form.interests.includes(interest)
            const Icon = getCategoryIcon(interest)

            return (
              <button
                type="button"
                key={interest}
                onClick={() => toggleInterest(interest)}
                aria-pressed={active}
                className={[
                  'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-150',
                  active
                    ? 'border-secondary-500 bg-secondary-500 text-white shadow-xs scale-[1.02]'
                    : 'border-border bg-surface text-ink-muted hover:border-secondary-400 hover:text-ink',
                ].join(' ')}
              >
                <Icon className="h-3.5 w-3.5" />
                {interest}
              </button>
            )
          })}
        </div>

        {errors.interests && (
          <p className="mt-1.5 text-xs font-medium text-danger">
            {errors.interests}
          </p>
        )}
      </div>

      {/* STEP 05: TRAVEL STYLE & RHYTHM */}
      <div
        onFocus={() => setActiveStep(5)}
        onClick={() => setActiveStep(5)}
        className="space-y-4 border-t border-border pt-6"
      >
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-secondary-500">
            05 · Travel Style & Rhythm
          </span>
          <h3 className="text-base font-bold text-ink">
            Who is travelling and what is your preferred pace?
          </h3>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
            Companion Type
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {travellingWithCards.map((item) => {
              const Icon = item.icon
              const active = form.travelling_with === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => update('travelling_with', item.value)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? 'border-secondary-500 bg-secondary-500/10 text-ink shadow-xs'
                      : 'border-border bg-surface hover:border-secondary-400 text-ink-muted'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mb-1.5 ${
                      active ? 'text-secondary-500' : 'text-ink-muted'
                    }`}
                  />
                  <p className="text-xs font-extrabold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted line-clamp-1">
                    {item.desc}
                  </p>
                </button>
              )
            })}
          </div>
          {errors.travelling_with && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.travelling_with}
            </p>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-muted">
            Preferred Activity Window
          </p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {preferredTimeCards.map((item) => {
              const Icon = item.icon
              const active = form.preferred_time === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => update('preferred_time', item.value)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    active
                      ? 'border-secondary-500 bg-secondary-500/10 text-ink shadow-xs'
                      : 'border-border bg-surface hover:border-secondary-400 text-ink-muted'
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 mb-1.5 ${
                      active ? 'text-secondary-500' : 'text-ink-muted'
                    }`}
                  />
                  <p className="text-xs font-extrabold text-ink">{item.label}</p>
                  <p className="mt-0.5 text-[10px] text-ink-muted line-clamp-1">
                    {item.desc}
                  </p>
                </button>
              )
            })}
          </div>
          {errors.preferred_time && (
            <p className="mt-1 text-xs font-medium text-danger">
              {errors.preferred_time}
            </p>
          )}
        </div>
      </div>

      {/* STEP 06: GENERATE */}
      <div className="border-t border-border pt-6">
        <Button
          type="submit"
          size="lg"
          fullWidth
          icon={Sparkles}
          loading={submitting}
        >
          {submitting
            ? 'Synthesizing Adaptive Itinerary…'
            : '06 · Generate Adaptive Trip Plan'}
        </Button>
      </div>
    </form>
  )
}