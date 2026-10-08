import { Link } from 'react-router-dom'
import {
  Compass,
  Sparkles,
  Route,
  ShieldAlert,
  RefreshCw,
  Wand2,
  MessageSquareText,
  ArrowRight,
  ArrowDown,
  CloudRain,
  CloudSun,
  CheckCircle2,
  MapPin,
  Sun,
  Moon,
  Plane,
  Navigation,
  Wallet,
  Bot,
  BedDouble,
  Utensils,
  Clock,
  Star,
} from 'lucide-react'
import Button from '../components/ui/Button'
import AIOrb from '../components/ui/AIOrb'
import { useTheme } from '../context/ThemeContext'
import { mockPlaces } from '../data/mockPlaces'
import { keralaItinerary, myTrips } from '../data/mockTrips'

const features = [
  { icon: Sparkles, title: 'AI Trip Planning', text: 'Tell us your dates, budget and interests — TripNova builds a full itinerary in seconds.' },
  { icon: Route, title: 'Smart Route Optimization', text: 'Activities are sequenced for less travel time, better weather windows and shorter queues.' },
  { icon: ShieldAlert, title: 'Real-Time Safety Monitoring', text: 'Weather, floods, cyclones, landslides and closures are tracked against your live route.' },
  { icon: RefreshCw, title: 'Dynamic Replanning', text: 'When something changes, TripNova recalculates your day and proposes a safer alternative.' },
  { icon: Wand2, title: 'Personalized Recommendations', text: 'Every swap keeps your interests, pace and budget intact.' },
  { icon: MessageSquareText, title: 'AI Travel Assistant', text: 'Ask for changes in plain language and get an updated plan back instantly.' },
]

// Derived from existing TripNova destinations (mockTrips, mockPlaces, and backend city presets)
const popularDestinations = [
  {
    name: 'Kerala',
    region: 'Kochi · Munnar · Alleppey',
    tag: 'Backwaters & Hills',
    duration: `${myTrips[0]?.days || 5} Days`,
    weather: '24°C · Tropical',
    rating: '4.9',
    description:
      mockPlaces.find((p) => p.id === 'alleppey-houseboat')?.description ||
      'Palm-lined backwater houseboats, misty tea hills, and historic Fort Kochi.',
    highlights: ['Fort Kochi', 'Alleppey Houseboat', 'Periyar Lake'],
    image:
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=700&q=75',
  },
  {
    name: 'Goa',
    region: 'North & South Goa',
    tag: 'Coast & Heritage',
    duration: `${myTrips[1]?.days || 4} Days`,
    weather: '29°C · Coastal Breeze',
    rating: '4.8',
    description:
      'Sun-drenched beaches, 17th-century Portuguese forts, Old Goa basilicas, and Dudhsagar waterfalls.',
    highlights: ['Baga Beach', 'Aguada Fort', 'Dudhsagar Falls'],
    image:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=700&q=75',
  },
  {
    name: 'Munnar',
    region: 'Western Ghats, Kerala',
    tag: 'Tea Estates & Peaks',
    duration: '3 Days',
    weather: '20°C · Misty',
    rating: '4.8',
    description:
      mockPlaces.find((p) => p.id === 'top-station')?.description ||
      'Rolling emerald tea plantations, Eravikulam ridges, and panoramic valley viewpoints.',
    highlights: ['Top Station', 'Tea Museum', 'Eravikulam Park'],
    image:
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=700&q=75',
  },
  {
    name: 'Ooty',
    region: 'Nilgiri Hills, Tamil Nadu',
    tag: 'Mountain Retreat',
    duration: `${myTrips[2]?.days || 4} Days`,
    weather: '18°C · Cool Mist',
    rating: '4.7',
    description:
      'Terraced botanical gardens, Doddabetta Peak vistas, heritage tea factories, and serene hill lakes.',
    highlights: ['Doddabetta Peak', 'Botanical Gardens', 'Ooty Lake'],
    image:
      'https://images.unsplash.com/photo-1589136777351-fdc9c9cab193?auto=format&fit=crop&w=700&q=75',
  },
  {
    name: 'Jaipur',
    region: 'Rajasthan',
    tag: 'Royal Architecture',
    duration: '4 Days',
    weather: '27°C · Clear',
    rating: '4.8',
    description:
      'Hilltop sandstone fortresses, the iconic Hawa Mahal, royal astronomical observatories, and sunset views.',
    highlights: ['Amber Palace', 'Hawa Mahal', 'Nahargarh Fort'],
    image:
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=700&q=75',
  },
  {
    name: 'Chennai',
    region: 'Coromandel Coast',
    tag: 'Culture & Coastline',
    duration: '3 Days',
    weather: '28°C · Sea Breeze',
    rating: '4.6',
    description:
      'Dravidian temple architecture in Mylapore, living-history heritage villages, and Marina coastline.',
    highlights: ['Marina Beach', 'Kapaleeshwarar', 'DakshinaChitra'],
    image:
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=700&q=75',
  },
]

const travelCapabilities = [
  { icon: Compass, label: 'Explore' },
  { icon: Plane, label: 'Travel' },
  { icon: MapPin, label: 'Location' },
  { icon: CloudSun, label: 'Weather' },
  { icon: Navigation, label: 'Navigation' },
  { icon: Wallet, label: 'Budget' },
  { icon: Bot, label: 'AI Planning' },
  { icon: RefreshCw, label: 'Dynamic Replanning' },
  { icon: BedDouble, label: 'Accommodation' },
  { icon: Utensils, label: 'Food & Dining' },
]

const howItWorksSteps = [
  {
    number: '01',
    title: 'Plan',
    icon: Compass,
    description: 'Tell TripNova your destination, preferences, budget and travel dates.',
    detail: 'Dates · Pace · Interests · Budget ceiling',
  },
  {
    number: '02',
    title: 'Personalize',
    icon: Wand2,
    description: 'TripNova creates a personalized itinerary based on your preferences.',
    detail: 'Smart day-by-day sequencing & route clusters',
  },
  {
    number: '03',
    title: 'Adapt',
    icon: RefreshCw,
    description: 'TripNova continuously adapts your plan when weather, time or travel conditions change.',
    detail: 'Instant indoor swaps & time-saving reroutes',
  },
]

export default function Landing() {
  const { isDark, toggleTheme } = useTheme()
  const previewDayItems = keralaItinerary[0]?.items || []

  return (
    <div className="bg-page text-ink min-h-screen relative overflow-x-hidden transition-colors">
      {/* Subtle Global Background Map Grid & Route Lines */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-35 dark:opacity-25" aria-hidden="true">
        <svg className="h-full w-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="tripnova-grid" width="64" height="64" patternUnits="userSpaceOnUse">
              <path
                d="M 64 0 L 0 0 0 64"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-border/40 dark:text-neutral-800/60"
              />
              <circle cx="32" cy="32" r="1" className="fill-secondary/25" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#tripnova-grid)" />
        </svg>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur transition-colors">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary border border-border/50">
              <Compass className="h-[18px] w-[18px] text-secondary" />
            </div>
            <span className="text-lg font-bold text-ink">TripNova</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="rounded-xl p-2 text-ink hover:bg-surface transition-colors"
            >
              {isDark ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-ink-muted hover:text-ink" />
              )}
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm">Log In</Button>
            </Link>
            <Link to="/plan">
              <Button size="sm">Plan My Trip</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-900 to-primary-700 dark:from-black dark:to-[#050505]" />

        {/* Subtle glowing radial accents */}
        <div
          className="pointer-events-none absolute inset-0 opacity-35 dark:opacity-25"
          style={{
            backgroundImage:
              'radial-gradient(circle at 18% 22%, rgba(6,182,164,0.28), transparent 38%), radial-gradient(circle at 82% 18%, rgba(6,182,164,0.16), transparent 42%)',
          }}
        />

        {/* Faint Animated SVG Route Curves & Location Waypoint Dots */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20 dark:opacity-15"
          viewBox="0 0 1200 700"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <path
            d="M-50 420 C 220 300, 420 510, 680 310 C 890 150, 1050 280, 1260 190"
            stroke="#06B6A4"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <path
            d="M100 580 C 350 440, 620 560, 920 380 C 1060 290, 1140 340, 1250 280"
            stroke="#2DD4BF"
            strokeWidth="1"
            strokeDasharray="4 8"
            opacity="0.6"
          />
          <circle cx="240" cy="368" r="4" fill="#06B6A4" />
          <circle cx="240" cy="368" r="10" stroke="#06B6A4" strokeWidth="1" opacity="0.4" />
          <circle cx="680" cy="310" r="4.5" fill="#2DD4BF" />
          <circle cx="680" cy="310" r="12" stroke="#2DD4BF" strokeWidth="1" opacity="0.4" />
          <circle cx="960" cy="235" r="4" fill="#06B6A4" />
        </svg>

        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-12 sm:pt-24 sm:pb-14 lg:px-8">
          {/* Floating Desktop Travel Telemetry Cards around Headline */}
          <div
            className="pointer-events-none hidden xl:flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 dark:bg-[#0A0A0A]/90 dark:border-[#262626] px-3.5 py-2.5 text-left backdrop-blur-md shadow-lg absolute left-6 top-24 animate-float-slow"
            aria-hidden="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-secondary/20 text-secondary-400">
              <MapPin className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Munnar · Top Station</p>
              <p className="text-[10px] text-primary-100/75">Route clear · 20°C Mist</p>
            </div>
          </div>

          <div
            className="pointer-events-none hidden xl:flex items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 dark:bg-[#0A0A0A]/90 dark:border-[#262626] px-3.5 py-2.5 text-left backdrop-blur-md shadow-lg absolute right-6 top-28 animate-float-delayed"
            aria-hidden="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">Adaptive Replan Active</p>
              <p className="text-[10px] text-primary-100/75">Indoor swap ready if rain &gt; 60%</p>
            </div>
          </div>

          {/* Core Hero Text & CTAs (Preserved) */}
          <div className="mx-auto max-w-3xl text-center animate-fade-up">
            <div className="mb-4 inline-flex items-center gap-2.5 rounded-full border border-secondary-400/30 bg-secondary/10 pl-1.5 pr-4 py-1 text-xs font-bold uppercase tracking-[0.18em] text-secondary-400">
              <AIOrb size="sm" state="idle" />
              <span>✦ TripNova Adaptive AI</span>
            </div>
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl tracking-tight">
              Plan Smart. Travel Safe.
              <br /> Explore More.
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base sm:text-lg text-primary-100/90 leading-relaxed">
              AI-powered adaptive travel planning that creates your itinerary and automatically adapts your journey
              when the world changes.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/plan">
                <Button size="lg" icon={ArrowRight} iconPosition="right" className="shadow-lg">
                  Plan My Trip
                </Button>
              </Link>
              <Link to="/dashboard">
                <button
                  type="button"
                  className="rounded-xl border border-white/25 dark:border-[#262626] bg-white/5 dark:bg-[#0A0A0A] px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10 dark:hover:bg-neutral-900"
                >
                  Explore Demo
                </button>
              </Link>
            </div>
          </div>

          {/* Cinematic Destination Visual Strip + Live Route Telemetry Banner */}
          <div className="mx-auto mt-12 max-w-5xl">
            <div className="grid gap-3 sm:grid-cols-3 mb-5">
              {popularDestinations.slice(0, 3).map((dest) => (
                <Link
                  key={dest.name}
                  to={`/plan?destination=${encodeURIComponent(dest.name)}`}
                  className="group relative flex items-center gap-3.5 overflow-hidden rounded-2xl border border-white/15 dark:border-[#262626] bg-white/5 dark:bg-[#050505] p-2.5 backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-secondary-400/50"
                >
                  <img
                    src={dest.image}
                    alt={`${dest.name} travel destination`}
                    loading="lazy"
                    width="64"
                    height="64"
                    className="h-14 w-14 flex-shrink-0 rounded-xl object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-sm font-bold text-white flex items-center gap-1 truncate">
                        <MapPin className="h-3.5 w-3.5 text-secondary-400 flex-shrink-0" />
                        {dest.name}
                      </p>
                      <span className="rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] font-bold text-secondary-300">
                        {dest.duration}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-primary-100/75 truncate">{dest.region}</p>
                    <p className="mt-0.5 text-[11px] font-medium text-secondary-400">{dest.weather}</p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Enhanced Product Dashboard Preview */}
            <div className="relative rounded-2xl p-[1px] bg-gradient-to-b from-secondary-400/35 via-border/40 to-transparent shadow-[0_0_55px_-12px_rgba(6,182,164,0.22)]">
              <div className="overflow-hidden rounded-2xl border border-border bg-card text-ink shadow-card transition-colors">
                {/* Top Product Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-surface px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                      <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
                      <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
                    </div>
                    <div className="h-4 w-[1px] bg-border" />
                    <div className="flex items-center gap-2">
                      <Compass className="h-4 w-4 text-secondary-600" />
                      <p className="text-sm font-bold text-ink">Kerala · 5 days</p>
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-md bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-ink-muted border border-border">
                        <Navigation className="h-3 w-3 text-secondary-600" /> Kochi → Munnar → Alleppey
                      </span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-bg px-3 py-1 text-xs font-bold text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Trip Health: All Good
                  </span>
                </div>

                {/* Main 3 Metric Cards */}
                <div className="grid gap-4 p-5 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-primary-50 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Weather</p>
                      <CloudRain className="h-4 w-4 text-secondary-600" aria-hidden="true" />
                    </div>
                    <p className="mt-1.5 text-lg font-extrabold text-ink">24°C · Light Rain</p>
                    <p className="mt-1 text-[11px] text-ink-muted">Indoor backup ready for 3:00 PM</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary-50 p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Today's Plan</p>
                      <Route className="h-4 w-4 text-secondary-600" aria-hidden="true" />
                    </div>
                    <p className="mt-1.5 text-lg font-extrabold text-ink">3 Activities</p>
                    <p className="mt-1 text-[11px] text-ink-muted">Sequenced for shortest transit</p>
                  </div>
                  <div className="rounded-xl border border-border bg-surface p-4 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">Budget Spent</p>
                      <Wallet className="h-4 w-4 text-secondary-600" aria-hidden="true" />
                    </div>
                    <p className="mt-1.5 text-lg font-extrabold text-ink">₹7,450 / ₹20,000</p>
                    <p className="mt-1 text-[11px] text-success font-semibold">₹12,550 remaining on track</p>
                  </div>
                </div>

                {/* Live Mini-Itinerary & Route Preview Strip */}
                <div className="border-t border-border bg-surface/70 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold uppercase tracking-wider text-[10px] text-secondary-600">
                      Day 1 Live Sequence:
                    </span>
                    {previewDayItems.map((item, idx) => (
                      <span
                        key={item.title}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1 font-medium text-ink"
                      >
                        <Clock className="h-3 w-3 text-secondary-600" />
                        <span className="text-ink-muted">{item.time}</span>
                        <span className="font-semibold text-ink">{item.title}</span>
                        {idx < previewDayItems.length - 1 && (
                          <ArrowRight className="h-3 w-3 text-ink-muted ml-0.5" />
                        )}
                      </span>
                    ))}
                  </div>
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center gap-1 font-semibold text-secondary-600 hover:underline"
                  >
                    Open Live Control Center <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Travel-Themed Capability Icons Strip */}
      <section className="relative z-10 border-b border-border bg-surface/60 py-6">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {travelCapabilities.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition-all duration-200 hover:border-secondary-400 hover:-translate-y-0.5"
              >
                <Icon className="h-3.5 w-3.5 text-secondary-600" aria-hidden="true" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations Section */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-20 lg:px-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end mb-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-600">
              Curated Routes
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
              Popular Destinations
            </h2>
            <p className="mt-1.5 text-sm text-ink-muted max-w-xl">
              Explore destinations pre-mapped with weather-safe indoor alternatives, local experiences, and optimized daily transit.
            </p>
          </div>
          <Link to="/plan">
            <Button variant="outline" size="sm" icon={ArrowRight} iconPosition="right">
              Custom Destination
            </Button>
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {popularDestinations.map((dest) => (
            <Link
              key={dest.name}
              to={`/plan?destination=${encodeURIComponent(dest.name)}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-secondary-400/60 hover:shadow-card"
            >
              <div className="relative h-48 w-full overflow-hidden bg-surface-muted">
                <img
                  src={dest.image}
                  alt={`${dest.name} — ${dest.region}`}
                  loading="lazy"
                  width="640"
                  height="384"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

                {/* Top badges */}
                <div className="absolute left-3.5 right-3.5 top-3.5 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-black/65 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {dest.tag}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[11px] font-bold text-amber-300">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {dest.rating}
                  </span>
                </div>

                {/* Bottom overlay location title */}
                <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end justify-between text-white">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-secondary-400 flex-shrink-0" />
                      <h3 className="text-lg font-extrabold tracking-tight">{dest.name}</h3>
                    </div>
                    <p className="text-xs text-neutral-300">{dest.region}</p>
                  </div>
                  <span className="rounded-lg bg-secondary/25 border border-secondary-400/40 px-2 py-0.5 text-[11px] font-bold text-secondary-300 backdrop-blur-xs">
                    {dest.duration}
                  </span>
                </div>
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <p className="text-sm text-ink-muted line-clamp-2 leading-relaxed">
                    {dest.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {dest.highlights.map((spot) => (
                      <span
                        key={spot}
                        className="rounded-md bg-surface border border-border px-2 py-0.5 text-[11px] font-medium text-ink"
                      >
                        {spot}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/70 pt-3 text-xs">
                  <span className="flex items-center gap-1 text-ink-muted font-medium">
                    <CloudSun className="h-3.5 w-3.5 text-secondary-600" />
                    {dest.weather}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-secondary-600 group-hover:translate-x-0.5 transition-transform">
                    Plan {dest.name} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* How TripNova Works (3-Step Section) */}
      <section className="relative z-10 border-y border-border bg-surface/40 py-20">
        <div className="mx-auto max-w-6xl px-4 lg:px-8">
          <div className="mx-auto mb-14 max-w-xl text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-600">
              Workflow
            </p>
            <h2 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
              How TripNova Works
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              From initial idea to real-time on-trip adaptation in three seamless steps.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3 relative">
            {howItWorksSteps.map((step, index) => {
              const StepIcon = step.icon
              return (
                <div key={step.number} className="relative flex flex-col">
                  <div className="flex-1 rounded-2xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:border-secondary-400/60">
                    <div className="flex items-center justify-between mb-5">
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary-50 border border-border px-3 py-1 text-xs font-extrabold tracking-wider text-secondary-600">
                        {step.number} — {step.title.toUpperCase()}
                      </span>
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-secondary-50 border border-border text-secondary-600">
                        <StepIcon className="h-5 w-5" />
                      </div>
                    </div>

                    <h3 className="text-lg font-bold text-ink">
                      {step.number} — {step.title}
                    </h3>
                    <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                      {step.description}
                    </p>

                    <div className="mt-4 rounded-xl bg-surface border border-border/80 px-3 py-2 text-xs font-medium text-ink flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-success flex-shrink-0" />
                      <span>{step.detail}</span>
                    </div>
                  </div>

                  {/* Connector Arrows between steps */}
                  {index < howItWorksSteps.length - 1 && (
                    <>
                      <div
                        className="hidden lg:flex items-center justify-center absolute -right-5 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full border border-border bg-card text-secondary-600 shadow-soft"
                        aria-hidden="true"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </div>
                      <div
                        className="flex lg:hidden items-center justify-center my-2 text-secondary-600"
                        aria-hidden="true"
                      >
                        <ArrowDown className="h-5 w-5" />
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* AI Travel Visual: Adaptive Intelligence Diagram */}
      <section className="relative z-10 mx-auto max-w-5xl px-4 py-20 lg:px-8">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-secondary-600">
            Adaptive Engine
          </p>
          <h2 className="mt-1 text-2xl font-bold text-ink sm:text-3xl">
            Real-Time Context Meets Smart Itinerary
          </h2>
          <p className="mt-2 text-sm text-ink-muted">
            TripNova continuously synthesizes live weather, budget telemetry, and route distance to keep your day optimal.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 shadow-card">
          <div className="flex flex-col items-center">
            {/* Top Node: TripNova AI */}
            <div className="relative flex items-center gap-3 rounded-2xl border border-secondary-400/50 bg-secondary-50 px-6 py-3.5 shadow-[0_0_30px_-6px_rgba(6,182,164,0.3)]">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-white shadow-xs">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-secondary-600">
                  Core Intelligence
                </p>
                <p className="text-base font-extrabold text-ink">TripNova AI</p>
              </div>
            </div>

            {/* Top Stem + Branching Connector */}
            <div className="flex flex-col items-center w-full max-w-2xl" aria-hidden="true">
              <div className="h-7 w-[2px] bg-gradient-to-b from-secondary to-border" />
              <div className="hidden sm:grid sm:grid-cols-3 w-full">
                <div className="border-t-2 border-l-2 border-border h-5 rounded-tl-xl ml-[50%]" />
                <div className="border-t-2 border-border h-5 flex justify-center">
                  <div className="h-5 w-[2px] bg-border" />
                </div>
                <div className="border-t-2 border-r-2 border-border h-5 rounded-tr-xl mr-[50%]" />
              </div>
            </div>

            {/* Middle 3 Signal Nodes: Weather, Budget, Location */}
            <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-surface p-4 text-center transition-colors hover:border-secondary-400/50">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 border border-border text-secondary-600">
                  <CloudRain className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-ink">Weather</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Live rain probability, storm alerts &amp; outdoor safety windows
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 text-center transition-colors hover:border-secondary-400/50">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 border border-border text-secondary-600">
                  <Wallet className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-ink">Budget</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Remaining spend tracking, entry costs &amp; predictive savings
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 text-center transition-colors hover:border-secondary-400/50">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 border border-border text-secondary-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="text-sm font-bold text-ink">Location</p>
                <p className="mt-1 text-xs text-ink-muted">
                  Proximity clustering, travel time &amp; opening hours
                </p>
              </div>
            </div>

            {/* Converging Connector + Bottom Stem */}
            <div className="flex flex-col items-center w-full max-w-2xl" aria-hidden="true">
              <div className="hidden sm:grid sm:grid-cols-3 w-full">
                <div className="border-b-2 border-l-2 border-border h-5 rounded-bl-xl ml-[50%]" />
                <div className="border-b-2 border-border h-5 flex justify-center">
                  <div className="h-5 w-[2px] bg-border" />
                </div>
                <div className="border-b-2 border-r-2 border-border h-5 rounded-br-xl mr-[50%]" />
              </div>
              <div className="h-7 w-[2px] bg-gradient-to-b from-border to-secondary" />
            </div>

            {/* Bottom Output Node: Smart Itinerary */}
            <div className="w-full max-w-xl rounded-2xl border border-secondary-400/40 bg-primary-50 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success-bg border border-success/30 text-success">
                    <Route className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-extrabold text-ink">Smart Itinerary</p>
                      <span className="rounded-full bg-success-bg border border-success/30 px-2 py-0.5 text-[10px] font-bold text-success">
                        Auto-Synced
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted">
                      Conflict-free schedule with explainable swaps and one-click approval
                    </p>
                  </div>
                </div>
                <Link to="/plan">
                  <Button size="sm" variant="secondary" icon={ArrowRight} iconPosition="right">
                    Try It
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Six Systems Features Grid */}
      <section className="relative z-10 mx-auto max-w-6xl px-4 py-16 lg:px-8">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">Everything a plan needs to stay true</h2>
          <p className="mt-2 text-ink-muted">Six systems working together so your itinerary holds up in the real world.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, title, text }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary-400/50"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 border border-border/60">
                <Icon className="h-5 w-5 text-secondary-600" />
              </div>
              <p className="font-semibold text-ink">{title}</p>
              <p className="mt-1.5 text-sm text-ink-muted leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Plan vs TripNova */}
      <section className="relative z-10 bg-primary-900 dark:bg-[#050505] border-y border-border py-20">
        <div className="mx-auto max-w-4xl px-4 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold text-white sm:text-3xl">
            A traditional planner stops at the itinerary. TripNova keeps going.
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 dark:border-[#262626] bg-white/5 dark:bg-[#0A0A0A] p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wide text-primary-100/60">Traditional Travel Planner</p>
              <div className="flex items-center gap-3 text-white">
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold">Plan</span>
                <ArrowRight className="h-4 w-4 text-primary-100/60" />
                <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold">Travel</span>
              </div>
              <p className="mt-4 text-sm text-primary-100/70">
                Once you leave, the plan is fixed — even if the weather or roads change underneath it.
              </p>
            </div>
            <div className="rounded-2xl border border-secondary-400/30 bg-secondary-400/10 p-6">
              <p className="mb-4 text-xs font-bold uppercase tracking-wide text-secondary-400">TripNova</p>
              <div className="flex flex-wrap items-center gap-2 text-white">
                {['Plan', 'Monitor', 'Detect', 'Replan', 'Notify'].map((step, idx, arr) => (
                  <span key={step} className="flex items-center gap-2">
                    <span className="rounded-lg bg-secondary/20 px-3 py-1.5 text-sm font-semibold text-secondary-400">
                      {step}
                    </span>
                    {idx < arr.length - 1 && <ArrowRight className="h-4 w-4 text-secondary-400/60" />}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-sm text-primary-100/70">
                Your plan keeps working for you after you've left home — adapting the moment conditions change.
              </p>
            </div>
          </div>

          {/* Example strip */}
          <div className="mt-8 flex flex-col items-stretch gap-3 rounded-2xl border border-white/10 dark:border-[#262626] bg-white/5 dark:bg-[#0A0A0A] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm text-white">
              <MapPin className="h-4 w-4 text-secondary-400" />
              Munnar → Trekking → Top Station
            </div>
            <div className="flex items-center gap-2 text-sm text-danger">
              <CloudRain className="h-4 w-4" />
              Severe rainfall detected
            </div>
            <div className="flex items-center gap-2 text-sm text-secondary-400">
              <RefreshCw className="h-4 w-4" />
              Rerouted to indoor experiences nearby
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-3xl px-4 py-20 text-center lg:px-8">
        <h2 className="text-2xl font-bold text-ink sm:text-3xl">Start Planning Your Adaptive Trip</h2>
        <p className="mt-2 text-ink-muted">
          TripNova doesn't just plan your journey — it adapts it to the world around you.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link to="/plan">
            <Button size="lg" icon={ArrowRight} iconPosition="right">
              Plan My Trip
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="outline">
              Explore Demo
            </Button>
          </Link>
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-8 text-center text-xs text-ink-muted">
        © 2026 TripNova. Built for adaptive, safety-aware travel.
      </footer>
    </div>
  )
}
