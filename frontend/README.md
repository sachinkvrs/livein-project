# TripNova

AI-powered adaptive travel planning frontend — **Plan → Monitor → Detect → Analyze → Replan → Notify**.

Built with React 18 + Vite + Tailwind CSS + React Router, running entirely on mock data so it can be
demoed with no backend, then wired up to a FastAPI service later.

---

## 1. Folder structure

```
tripnova/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx                 # React root, Router + TripProvider
    ├── App.jsx                  # Renders <AppRoutes />
    ├── index.css                # Tailwind entrypoint + base styles
    │
    ├── routes/
    │   └── AppRoutes.jsx        # All page routes
    │
    ├── context/
    │   └── TripContext.jsx      # Shared trip/itinerary/replanning state
    │
    ├── pages/                   # One file per screen (see §5)
    │   Landing, Login, Signup, PlanTrip, Dashboard, Itinerary,
    │   Replanning, Assistant, Alerts, MyTrips, Profile, Settings
    │
    ├── components/
    │   ├── ui/                  # Button, Input, Select, DatePicker, Card,
    │   │                        # Badge, StatusBadge, Alert, Modal, Loading,
    │   │                        # EmptyState, ErrorState
    │   ├── layout/               # Sidebar, Navbar, MobileNav, DashboardLayout
    │   ├── trip/                 # TripForm, TripSummary, ItineraryCard, Timeline,
    │   │                        # PlaceCard, WeatherCard, TripHealth, BudgetCard
    │   ├── map/                  # TripMap (placeholder), MapMarker, RouteLine
    │   ├── alerts/                # AlertCard, AlertBanner, ReplanningCard
    │   └── ai/                   # ChatWindow, ChatMessage, SuggestionCard, PromptChips
    │
    ├── services/                 # Mock API layer — see §4
    │   tripService, weatherService, recommendationService,
    │   alertService, aiService, mapService
    │
    └── data/                     # Mock data (Kerala demo content)
        mockTrips, mockPlaces, mockAlerts, mockWeather, mockChat
```

## 2. Setup

```bash
npm install
```

## 3. Run the project

```bash
npm run dev       # starts Vite on http://localhost:5173
npm run build      # production build to /dist
npm run preview    # preview the production build locally
```

## 4. Mock API layer

Every network-shaped call goes through `src/services/*.js`. Each function already has the
`async`/`await` shape a real `fetch()` call would have, and returns data in the same shape the
suggested FastAPI endpoint would return — the mock is a drop-in you swap for `fetch(...)`:

| Service | Function | Suggested backend endpoint |
|---|---|---|
| `tripService` | `createTrip(formData)` | `POST /api/trips` |
| `tripService` | `generateItinerary(tripId, formData)` | `POST /api/trips/:id/generate` |
| `tripService` | `getTrip(tripId)` | `GET /api/trips/:id` |
| `tripService` | `getItinerary(tripId)` | `GET /api/trips/:id/itinerary` |
| `tripService` | `listTrips()` | `GET /api/trips` |
| `weatherService` | `getWeather(city)` | `GET /api/weather` |
| `alertService` | `getAlerts(tripId)` | `GET /api/trips/:id/alerts` |
| `alertService` | `requestReplan(tripId, day)` | `POST /api/trips/:id/replan` |
| `recommendationService` | `getRecommendations({interests, city})` | `GET /api/recommendations` |
| `aiService` | `sendMessage(message, context)` | `POST /api/ai/chat` |
| `mapService` | `getRoutePositions(cities)` | your Maps/Mapbox SDK, not a REST call |

## 5. Where to connect your FastAPI backend

1. Replace the body of each function in `src/services/*.js` with a real `fetch()` (or `axios`) call
   to the endpoint in the table above. Keep the same function name and return shape so no page code
   needs to change.
2. Add a `VITE_API_BASE_URL` env var (Vite exposes `import.meta.env.VITE_*`) and point it at your
   FastAPI host.
3. `TripMap` (`src/components/map/TripMap.jsx`) is a CSS/SVG placeholder — swap its internals for a
   Google Maps / Mapbox / OpenStreetMap component and keep `mapService.getRoutePositions()` as the
   data source.
4. `ChatWindow` already calls `aiService.sendMessage()` per turn — pointing that at
   `POST /api/ai/chat` is the only change needed for a live AI assistant.
5. The **Simulate Weather Alert** button on the dashboard calls
   `alertService.simulateWeatherAlert()` and `alertService.requestReplan()` — replace both with your
   real detection + ML replanning pipeline; the `TripContext` state machine (`activeAlert` →
   `proposedDay` → `acceptUpdatedPlan()`) doesn't need to change.

## 6. Implemented features

- Full navigation across 12 pages via React Router, with a persistent sidebar (desktop) and
  bottom nav + slide-out menu (mobile).
- **Plan Your Trip**: validated form (destination + dates required), interest multi-select, travel
  style/accommodation/transport selects, loading state on submit.
- **Trip Dashboard**: trip health, weather, today's plan, budget progress, route map placeholder,
  live trip status, day-by-day itinerary list, and the **Simulate Weather Alert** demo trigger.
- **Itinerary Detail**: day tabs, full timeline with weather-sensitive markers, "why this order"
  rationale, and a per-day map.
- **Dynamic Replanning**: side-by-side original vs. recommended plan, red/green risk indicators,
  reasoning list, Accept / View Alternatives actions — wired to shared context so accepting updates
  the dashboard's itinerary.
- **AI Travel Assistant**: chat UI with suggested prompt chips, typing indicator, and inline place
  recommendation cards generated from mock replies.
- **Alerts**: filterable by Critical / Warning / Information, each with severity, location, time,
  impact and recommended action.
- **My Trips**: trip cards with status badges and Continue Planning / View Trip actions.
- **Profile & Settings**: editable profile fields, travel preferences, and toggleable notification /
  appearance / privacy settings.
- **Landing page**: hero, feature grid, "traditional planner vs. TripNova" (Plan→Travel vs.
  Plan→Monitor→Detect→Replan→Notify) explainer, and closing CTA.
- Responsive down to 375px: sidebar collapses to a bottom nav + hamburger menu, dashboard cards
  stack, forms go single-column, no horizontal scroll.
- Loading, empty and error state components (`Loading`, `EmptyState`, `ErrorState`) ready to drop
  into any async view.

## 7. Dependencies

- `react`, `react-dom` — UI runtime
- `react-router-dom` — routing
- `lucide-react` — icon set
- `tailwindcss`, `postcss`, `autoprefixer` — styling
- `vite`, `@vitejs/plugin-react` — build tooling
- `eslint` + React plugins — linting (optional, dev-only)

No state-management, UI-kit, or map libraries were added — state is handled with React context, and
the map is a lightweight internal placeholder pending your Maps/Mapbox key.
