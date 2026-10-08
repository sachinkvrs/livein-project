import {
  Compass,
  Palmtree,
  Utensils,
  Waves,
  Landmark,
  Mountain,
  Camera,
  ShoppingBag,
  Sparkles,
  Trees,
  Building2,
  Coffee,
  Ticket,
  BedDouble,
  Car,
  Footprints,
  Train,
  ShieldAlert,
  MapPin,
} from 'lucide-react'

export const DESTINATION_VISUALS = {
  kerala: {
    name: 'Kerala',
    region: 'Kochi · Munnar · Alleppey',
    tagline: 'Emerald Backwaters & Misty Tea Hills',
    image:
      'https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80',
    rating: 4.9,
    weatherDefault: '24°C · Tropical Breeze',
    highlights: [
      { label: 'Nature', icon: Palmtree },
      { label: 'Food', icon: Utensils },
      { label: 'Backwaters', icon: Waves },
    ],
  },
  chennai: {
    name: 'Chennai',
    region: 'Coromandel Coast · Tamil Nadu',
    tagline: 'Dravidian Heritage & Marina Coastline',
    image:
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    weatherDefault: '28°C · Sea Breeze',
    highlights: [
      { label: 'Beaches', icon: Waves },
      { label: 'Heritage', icon: Landmark },
      { label: 'Food', icon: Utensils },
    ],
  },
  goa: {
    name: 'Goa',
    region: 'North & South Goa Coast',
    tagline: 'Sun-Drenched Beaches & Portuguese Forts',
    image:
      'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    weatherDefault: '29°C · Coastal Sun',
    highlights: [
      { label: 'Beaches', icon: Waves },
      { label: 'Culture', icon: Landmark },
      { label: 'Dining', icon: Utensils },
    ],
  },
  munnar: {
    name: 'Munnar',
    region: 'Western Ghats · Kerala',
    tagline: 'Rolling Tea Estates & Cloud Peaks',
    image:
      'https://images.unsplash.com/photo-1593693397690-362cb9666fc2?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    weatherDefault: '20°C · Misty Hills',
    highlights: [
      { label: 'Mountains', icon: Mountain },
      { label: 'Nature', icon: Trees },
      { label: 'Views', icon: Camera },
    ],
  },
  ooty: {
    name: 'Ooty',
    region: 'Nilgiri Hills · Tamil Nadu',
    tagline: 'Botanical Terraces & Alpine Lakes',
    image:
      'https://images.unsplash.com/photo-1589136777351-fdc9c9cab193?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    weatherDefault: '18°C · Cool Mist',
    highlights: [
      { label: 'Hills', icon: Mountain },
      { label: 'Gardens', icon: Trees },
      { label: 'Scenic', icon: Camera },
    ],
  },
  jaipur: {
    name: 'Jaipur',
    region: 'Royal Rajasthan',
    tagline: 'Sandstone Palaces & Royal Observatories',
    image:
      'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    weatherDefault: '27°C · Clear',
    highlights: [
      { label: 'Palaces', icon: Landmark },
      { label: 'Bazaars', icon: ShoppingBag },
      { label: 'Cuisine', icon: Utensils },
    ],
  },
  manali: {
    name: 'Manali',
    region: 'Kullu Valley · Himachal',
    tagline: 'Alpine Valleys, Cedar Forests & Mountain Passes',
    image:
      'https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    weatherDefault: '14°C · Crisp Alpine',
    highlights: [
      { label: 'Mountains', icon: Mountain },
      { label: 'Adventure', icon: Compass },
      { label: 'Forests', icon: Trees },
    ],
  },
  bangalore: {
    name: 'Bangalore',
    region: 'Karnataka',
    tagline: 'Lush Gardens, Craft Cafes & Heritage Boulevards',
    image:
      'https://images.unsplash.com/photo-1596176530529-78163a4f7af2?auto=format&fit=crop&w=1200&q=80',
    rating: 4.7,
    weatherDefault: '25°C · Pleasant',
    highlights: [
      { label: 'Parks', icon: Trees },
      { label: 'Cafes', icon: Coffee },
      { label: 'Culture', icon: Building2 },
    ],
  },
  pondicherry: {
    name: 'Pondicherry',
    region: 'French Quarter · East Coast',
    tagline: 'Bougainvillea Villas, Seaside Promenades & Cafes',
    image:
      'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80',
    rating: 4.8,
    weatherDefault: '27°C · Coastal',
    highlights: [
      { label: 'Coast', icon: Waves },
      { label: 'Cafes', icon: Coffee },
      { label: 'Heritage', icon: Landmark },
    ],
  },
}

const DEFAULT_DESTINATION_VISUAL = {
  name: 'Explore India',
  region: 'Curated AI Journey',
  tagline: 'Personalized Adaptive Travel Itinerary',
  image:
    'https://images.unsplash.com/photo-1506461883276-594a12b11cf3?auto=format&fit=crop&w=1200&q=80',
  rating: 4.8,
  weatherDefault: '26°C · Pleasant',
  highlights: [
    { label: 'Nature', icon: Palmtree },
    { label: 'Culture', icon: Landmark },
    { label: 'Food', icon: Utensils },
  ],
}

export function getDestinationVisual(destinationName = '') {
  const clean = String(destinationName || '').trim().toLowerCase()
  if (!clean) return DEFAULT_DESTINATION_VISUAL

  for (const [key, val] of Object.entries(DESTINATION_VISUALS)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val
    }
  }

  return {
    ...DEFAULT_DESTINATION_VISUAL,
    name: destinationName,
  }
}

export function getCategoryIcon(category = '') {
  const c = String(category || '').toLowerCase()
  if (c.includes('beach') || c.includes('coast') || c.includes('water')) return Waves
  if (c.includes('cafe') || c.includes('coffee') || c.includes('breakfast')) return Coffee
  if (c.includes('food') || c.includes('restaurant') || c.includes('dining') || c.includes('lunch') || c.includes('dinner')) return Utensils
  if (c.includes('museum') || c.includes('heritage') || c.includes('temple') || c.includes('history') || c.includes('fort') || c.includes('culture')) return Landmark
  if (c.includes('park') || c.includes('garden') || c.includes('nature') || c.includes('wildlife')) return Trees
  if (c.includes('mountain') || c.includes('hill') || c.includes('peak') || c.includes('adventure')) return Mountain
  if (c.includes('shop') || c.includes('market') || c.includes('mall')) return ShoppingBag
  if (c.includes('hotel') || c.includes('stay') || c.includes('resort') || c.includes('accommodation')) return BedDouble
  if (c.includes('emergency') || c.includes('hospital') || c.includes('police') || c.includes('safety')) return ShieldAlert
  if (c.includes('entertainment') || c.includes('ticket') || c.includes('show')) return Ticket
  if (c.includes('photo') || c.includes('scenic') || c.includes('view')) return Camera
  return MapPin
}

export function getTransportIcon(mode = 'cab') {
  const m = String(mode || '').toLowerCase()
  if (m === 'walk' || m === 'walking') return Footprints
  if (m === 'transit' || m === 'train' || m === 'metro' || m === 'bus') return Train
  return Car
}
