import { useEffect, useRef, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import { Navigation, MapPin, Compass } from 'lucide-react'
import { useTheme } from '../../context/ThemeContext'

// Fix default leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Create custom styled SVG markers
function createCustomIcon(number, isActive = false, isDark = false) {
  const bg = isActive ? '#06B6A4' : isDark ? '#0F1C2E' : '#0B1528'
  const border = isActive ? '#FFFFFF' : '#06B6A4'
  const html = `
    <div style="
      background-color: ${bg};
      color: #ffffff;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 13px;
      border: 2.5px solid ${border};
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      transform: ${isActive ? 'scale(1.2)' : 'scale(1)'};
      transition: all 0.2s ease;
    ">
      ${number}
    </div>
  `
  return L.divIcon({
    className: 'custom-trip-marker',
    html,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  })
}

// User location pulse icon
const userLocationIcon = L.divIcon({
  className: 'custom-user-marker',
  html: `
    <div style="
      background-color: #06B6A4;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      box-shadow: 0 2px 8px rgba(6, 182, 164, 0.6);
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

// Map Pan/Zoom controller
function MapController({ places, activePlace, userLocation }) {
  const map = useMap()

  useEffect(() => {
    if (activePlace && activePlace.latitude && activePlace.longitude) {
      map.flyTo([Number(activePlace.latitude), Number(activePlace.longitude)], 15, {
        animate: true,
        duration: 1.2,
      })
      return
    }

    if (places && places.length > 0) {
      const validCoords = places
        .filter((p) => p.latitude !== null && p.longitude !== null && !isNaN(p.latitude) && !isNaN(p.longitude))
        .map((p) => [Number(p.latitude), Number(p.longitude)])

      if (validCoords.length > 0) {
        const bounds = L.latLngBounds(validCoords)
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
      }
    }
  }, [places, activePlace, map])

  return null
}

export default function TripMap({
  places = [],
  activePlace = null,
  routeGeometry = [],
  dayNumber = 1,
  onSelectPlace,
}) {
  const { isDark } = useTheme()
  const markerRefs = useRef({})
  const [userLoc, setUserLoc] = useState(null)
  const [geoError, setGeoError] = useState(false)

  // Filter valid coordinates
  const validPlaces = useMemo(() => {
    return places.filter(
      (p) =>
        p.latitude !== null &&
        p.longitude !== null &&
        !isNaN(Number(p.latitude)) &&
        !isNaN(Number(p.longitude))
    )
  }, [places])

  // Center coordinate
  const defaultCenter = useMemo(() => {
    if (validPlaces.length > 0) {
      return [Number(validPlaces[0].latitude), Number(validPlaces[0].longitude)]
    }
    return [13.0827, 80.2707] // Chennai fallback
  }, [validPlaces])

  // Process polyline route coordinates
  const polylineCoords = useMemo(() => {
    if (routeGeometry && routeGeometry.length > 0) {
      return routeGeometry.map((coord) => [Number(coord[0]), Number(coord[1])])
    }
    return validPlaces.map((p) => [Number(p.latitude), Number(p.longitude)])
  }, [routeGeometry, validPlaces])

  // Geolocation trigger
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError(true)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLoc([pos.coords.latitude, pos.coords.longitude])
        setGeoError(false)
      },
      () => setGeoError(true),
      { enableHighAccuracy: true, timeout: 5000 }
    )
  }

  // Open active popup automatically
  useEffect(() => {
    if (activePlace && markerRefs.current[activePlace.id || activePlace.title]) {
      markerRefs.current[activePlace.id || activePlace.title].openPopup()
    }
  }, [activePlace])

  return (
    <div className="relative h-full min-h-[300px] w-full overflow-hidden rounded-2xl border border-border bg-surface-muted shadow-soft">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        {isDark ? (
          <TileLayer
            key="carto-dark"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png"
            subdomains="abcd"
            maxZoom={20}
          />
        ) : (
          <TileLayer
            key="osm-light"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        )}

        <MapController
          places={validPlaces}
          activePlace={activePlace}
          userLocation={userLoc}
        />

        {/* Route Line */}
        {polylineCoords.length >= 2 && (
          <>
            {/* Soft background line glow */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: isDark ? '#1CC9B7' : '#06B6A4',
                weight: isDark ? 8 : 6,
                opacity: isDark ? 0.45 : 0.35,
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
            {/* Crisp dashed route line */}
            <Polyline
              positions={polylineCoords}
              pathOptions={{
                color: isDark ? '#38BDF8' : '#0E7490',
                weight: 3.5,
                opacity: 0.95,
                dashArray: '6, 8',
                lineCap: 'round',
                lineJoin: 'round',
              }}
            />
          </>
        )}

        {/* Place Markers */}
        {validPlaces.map((place, index) => {
          const isSelected =
            activePlace &&
            (activePlace.id === place.id ||
              activePlace.title === place.title ||
              activePlace.name === place.name)

          return (
            <Marker
              key={place.id || `${place.title}-${index}`}
              ref={(ref) => {
                if (ref) markerRefs.current[place.id || place.title] = ref
              }}
              position={[Number(place.latitude), Number(place.longitude)]}
              icon={createCustomIcon(index + 1, isSelected, isDark)}
              eventHandlers={{
                click: () => {
                  if (onSelectPlace) onSelectPlace(place)
                },
              }}
            >
              <Popup className="trip-popup">
                <div className="p-1 text-ink">
                  <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-secondary-600">
                    <MapPin className="h-3.5 w-3.5" />
                    Stop {index + 1}
                  </div>
                  <h4 className="mt-1 font-bold text-ink">
                    {place.title || place.name}
                  </h4>
                  {place.area && (
                    <p className="text-xs text-ink-muted">{place.area}</p>
                  )}
                  {place.time && (
                    <p className="mt-1 text-[11px] font-medium text-ink-muted">
                      🕒 Scheduled: {place.time}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* User live location marker */}
        {userLoc && (
          <Marker position={userLoc} icon={userLocationIcon}>
            <Popup>
              <div className="text-xs font-bold text-ink">📍 You are here</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Locate Button */}
      <button
        type="button"
        onClick={handleLocateMe}
        className="absolute bottom-4 right-4 z-[400] flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-bold text-ink shadow-soft hover:bg-surface transition-colors"
        title="Find my current location"
      >
        <Navigation className="h-4 w-4 text-secondary-600" />
        <span className="hidden sm:inline">My Location</span>
      </button>

      {geoError && (
        <div className="absolute bottom-4 left-4 z-[400] rounded-xl bg-danger-bg px-3 py-1.5 text-xs font-medium text-danger shadow-soft">
          Unable to retrieve your location.
        </div>
      )}
    </div>
  )
}