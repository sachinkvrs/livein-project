import math
import httpx
import json
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any

BASE_DIR = Path(__file__).resolve().parent
CACHE_FILE = BASE_DIR / "data" / "geocoding_cache.json"

_geocode_cache: Dict[str, Dict[str, float]] = {
    "chennai": {"lat": 13.0827, "lon": 80.2707},
    "kochi": {"lat": 9.9312, "lon": 76.2673},
    "munnar": {"lat": 10.0889, "lon": 77.0595},
    "thekkady": {"lat": 9.6031, "lon": 77.1615},
    "alleppey": {"lat": 9.4981, "lon": 76.3388},
    "alappuzha": {"lat": 9.4981, "lon": 76.3388},
    "goa": {"lat": 15.2993, "lon": 74.1240},
    "ooty": {"lat": 11.4102, "lon": 76.6950},
    "kerala": {"lat": 10.8505, "lon": 76.2711},
    "mumbai": {"lat": 19.0760, "lon": 72.8777},
    "delhi": {"lat": 28.6139, "lon": 77.2090},
    "bengaluru": {"lat": 12.9716, "lon": 77.5946},
    "bangalore": {"lat": 12.9716, "lon": 77.5946},
    "hyderabad": {"lat": 17.3850, "lon": 78.4867},
    "jaipur": {"lat": 26.9124, "lon": 75.7873},
}


def _load_cache():
    global _geocode_cache
    try:
        if CACHE_FILE.exists():
            with open(CACHE_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                _geocode_cache.update(data)
    except Exception as e:
        print(f"[TripNova] Failed to load geocode cache: {e}")


def _save_cache():
    try:
        CACHE_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(CACHE_FILE, "w", encoding="utf-8") as f:
            json.dump(_geocode_cache, f, indent=2)
    except Exception as e:
        print(f"[TripNova] Failed to save geocode cache: {e}")


_load_cache()


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in km."""
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


async def geocode_place(name: str) -> Optional[Dict[str, float]]:
    """Geocodes a place or city name with caching."""
    if not name or not name.strip():
        return None
    
    clean_name = name.strip().lower()
    if clean_name in _geocode_cache:
        return _geocode_cache[clean_name]

    # Try OpenStreetMap Nominatim
    url = "https://nominatim.openstreetmap.org/search"
    headers = {"User-Agent": "TripNovaTravelPlanner/1.0 (contact@tripnova.ai)"}
    params = {"q": name, "format": "json", "limit": 1}

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                if data and len(data) > 0:
                    result = {
                        "lat": float(data[0]["lat"]),
                        "lon": float(data[0]["lon"]),
                    }
                    _geocode_cache[clean_name] = result
                    _save_cache()
                    return result
    except Exception as e:
        print(f"[TripNova] Geocoding lookup failed for '{name}': {e}")

    # Fallback to Chennai if unknown
    return {"lat": 13.0827, "lon": 80.2707}


async def calculate_route(coordinates: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Given a list of (latitude, longitude) tuples, fetches driving route from OSRM
    or falls back to Haversine straight-line polyline.
    Returns:
      {
        "distance_km": float,
        "duration_min": int,
        "geometry": [[lat, lon], ...]
      }
    """
    if not coordinates or len(coordinates) < 2:
        return {
            "distance_km": 0.0,
            "duration_min": 0,
            "geometry": [[lat, lon] for lat, lon in coordinates],
        }

    # OSRM expects {lng},{lat};{lng},{lat}
    osrm_coords = ";".join(f"{lon:.6f},{lat:.6f}" for lat, lon in coordinates)
    url = f"https://router.project-osrm.org/route/v1/driving/{osrm_coords}?overview=full&geometries=geojson"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("code") == "Ok" and data.get("routes"):
                    route = data["routes"][0]
                    distance_km = round(route["distance"] / 1000.0, 1)
                    duration_min = max(1, round(route["duration"] / 60.0))
                    # GeoJSON is [lon, lat], convert to [lat, lon] for Leaflet
                    raw_coords = route["geometry"]["coordinates"]
                    geometry = [[coord[1], coord[0]] for coord in raw_coords]
                    return {
                        "distance_km": distance_km,
                        "duration_min": duration_min,
                        "geometry": geometry,
                    }
    except Exception as e:
        print(f"[TripNova] OSRM routing request failed: {e}")

    # Fallback: Straight-line segments with estimated road factor (1.3x)
    total_dist = 0.0
    for i in range(len(coordinates) - 1):
        lat1, lon1 = coordinates[i]
        lat2, lon2 = coordinates[i + 1]
        total_dist += haversine_distance(lat1, lon1, lat2, lon2)

    road_dist = round(total_dist * 1.3, 1)
    # Assume 30 km/h average speed in city
    est_minutes = max(15, round((road_dist / 30.0) * 60))

    return {
        "distance_km": road_dist,
        "duration_min": est_minutes,
        "geometry": [[lat, lon] for lat, lon in coordinates],
    }
