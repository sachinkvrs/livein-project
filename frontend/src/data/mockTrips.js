// Mock trip + itinerary generator. tripService swaps this out for a real
// FastAPI call later — see src/services/tripService.js.

export const defaultTripForm = {
  destination: '',
  travellers: '',
  travelling_with: '',
  startDate: '',
  endDate: '',
  budgetLevel: '',
  preferred_time: '',
  tripBudget: '',
  interests: [],
}

// Day-wise timeline entries. `activityId` links back to mockPlaces where relevant.
export const keralaItinerary = [
  {
    day: 1,
    city: 'Kochi',
    date: '12 Sep',
    items: [
      { time: '09:00 AM', activityId: 'fort-kochi', title: 'Fort Kochi', note: 'Wander the colonial quarter and Chinese fishing nets.', duration: '2h' },
      { time: '01:00 PM', title: 'Lunch Break', note: 'Local seafood by the waterfront.', duration: '1h' },
      { time: '04:00 PM', activityId: 'marine-drive', title: 'Marine Drive', note: 'Sunset walk along the backwaters.', duration: '1.5h' },
    ],
  },
  {
    day: 2,
    city: 'Munnar',
    date: '13 Sep',
    items: [
      { time: '09:00 AM', activityId: 'tea-museum', title: 'Tea Museum', note: 'Explore the history of tea and its journey in Munnar.', duration: '1.5h' },
      { time: '11:00 AM', activityId: 'mattupetty-dam', title: 'Mattupetty Dam', note: 'Enjoy the beautiful dam view.', duration: '1.5h' },
      { time: '01:30 PM', title: 'Lunch Break', note: 'Plantation-view restaurant.', duration: '1h' },
      { time: '03:00 PM', activityId: 'echo-point', title: 'Echo Point', note: 'Lakeside viewpoint with a natural echo.', duration: '1h' },
      { time: '05:00 PM', title: 'Back to Hotel', note: 'Rest and freshen up.', duration: '—' },
    ],
  },
  {
    day: 3,
    city: 'Munnar',
    date: '14 Sep',
    items: [
      { time: '08:00 AM', activityId: 'trekking-top-station', title: 'Trekking to Top Station', note: 'Guided trek through shola forest ridgelines.', duration: '3h', weatherSensitive: true },
      { time: '12:00 PM', activityId: 'top-station', title: 'Photo Point', note: 'Panoramic valley views at the summit.', duration: '1h', weatherSensitive: true },
      { time: '05:00 PM', title: 'Back to Hotel', note: 'Rest and freshen up.', duration: '—' },
    ],
  },
  {
    day: 4,
    city: 'Thekkady',
    date: '15 Sep',
    items: [
      { time: '09:30 AM', activityId: 'periyar-wildlife', title: 'Periyar Wildlife Experience', note: 'Boat safari across Periyar Lake.', duration: '2.5h' },
      { time: '02:00 PM', title: 'Lunch Break', note: 'Spice-plantation-side dining.', duration: '1h' },
    ],
  },
  {
    day: 5,
    city: 'Alleppey',
    date: '16 Sep',
    items: [
      { time: '11:00 AM', activityId: 'alleppey-houseboat', title: 'Alleppey Backwaters Houseboat', note: 'Drift through palm-lined canals overnight.', duration: 'Overnight' },
    ],
  },
]

// The replacement plan used when the "Simulate Weather Alert" demo fires.
export const replannedDay3 = {
  day: 3,
  city: 'Munnar',
  date: '14 Sep',
  items: [
    { time: '09:00 AM', activityId: 'tea-museum', title: 'Tea Museum', note: 'Indoor-friendly and matches your culture interest.', duration: '1.5h' },
    { time: '11:00 AM', activityId: 'indoor-local-experience', title: 'Indoor Local Experience', note: 'Spice and tea tasting hosted by a local family.', duration: '1.5h' },
    { time: '01:30 PM', activityId: 'local-restaurant', title: 'Local Restaurant', note: 'Kerala-style thali, five minutes from the tasting.', duration: '1h' },
    { time: '03:00 PM', activityId: 'blossom-park', title: 'Blossom Park', note: 'Covered gardens — a safe outdoor alternative in light rain.', duration: '1.25h' },
    { time: '05:00 PM', title: 'Back to Hotel', note: 'Rest and freshen up.', duration: '—' },
  ],
}

export const mockTrip = {
  id: 'trip-kerala-001',
  destination: 'Kerala',
  days: 5,
  dateRange: '12–16 September 2026',
  travellers: 3,
  budget: 20000,
  spent: 7450,
  interests: ['Nature', 'Adventure'],
  status: 'Upcoming',
}

export const myTrips = [
  { id: 'trip-kerala-001', destination: 'Kerala', dateRange: '12–16 Sep 2026', days: 5, budget: 20000, status: 'Upcoming' },
  { id: 'trip-goa-002', destination: 'Goa', dateRange: '02–05 Nov 2026', days: 4, budget: 15000, status: 'Draft' },
  { id: 'trip-ooty-003', destination: 'Ooty', dateRange: '18–21 Jan 2026', days: 4, budget: 12000, status: 'Completed' },
]
