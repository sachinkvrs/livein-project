import os
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from geocoding import geocode_place

# WMO Weather interpretation codes (WW)
WMO_CODE_MAP = {
    0: ("Clear sky", "Sun"),
    1: ("Mainly clear", "Sun"),
    2: ("Partly cloudy", "CloudSun"),
    3: ("Overcast", "Cloud"),
    45: ("Fog", "CloudFog"),
    48: ("Depositing rime fog", "CloudFog"),
    51: ("Light drizzle", "CloudDrizzle"),
    53: ("Moderate drizzle", "CloudDrizzle"),
    55: ("Dense drizzle", "CloudDrizzle"),
    61: ("Slight rain", "CloudRain"),
    63: ("Moderate rain", "CloudRain"),
    65: ("Heavy rain", "CloudRain"),
    71: ("Slight snow", "CloudSnow"),
    73: ("Moderate snow", "CloudSnow"),
    75: ("Heavy snow", "CloudSnow"),
    80: ("Slight rain showers", "CloudRain"),
    81: ("Moderate rain showers", "CloudRain"),
    82: ("Violent rain showers", "CloudRain"),
    95: ("Thunderstorm", "CloudLightning"),
    96: ("Thunderstorm with slight hail", "CloudLightning"),
    99: ("Thunderstorm with heavy hail", "CloudLightning"),
}


async def fetch_weather_for_location(
    destination: str,
    lat: Optional[float] = None,
    lon: Optional[float] = None
) -> Dict[str, Any]:
    """
    Fetches real-time weather using Open-Meteo or OpenWeatherMap API.
    """
    if lat is None or lon is None:
        coords = await geocode_place(destination)
        if coords:
            lat = coords["lat"]
            lon = coords["lon"]
        else:
            lat = 13.0827
            lon = 80.2707

    api_key = os.getenv("WEATHER_API_KEY")

    # If OpenWeatherMap API key is provided
    if api_key and api_key != "YOUR_WEATHER_API_KEY":
        try:
            owm_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={api_key}&units=metric"
            async with httpx.AsyncClient(timeout=4.0) as client:
                resp = await client.get(owm_url)
                if resp.status_code == 200:
                    data = resp.json()
                    temp = round(data["main"]["temp"])
                    condition = data["weather"][0]["main"]
                    description = data["weather"][0]["description"].title()
                    rain_prob = data.get("rain", {}).get("1h", 0) * 10
                    return {
                        "location": destination.title(),
                        "tempC": temp,
                        "temp_c": temp,
                        "condition": description or condition,
                        "rain_probability": min(100, int(rain_prob)),
                        "humidity": data["main"].get("humidity", 65),
                        "wind_speed_kmh": round(data.get("wind", {}).get("speed", 0) * 3.6, 1),
                        "last_updated": datetime.now().strftime("%I:%M %p"),
                        "status": "ok",
                    }
        except Exception as e:
            print(f"[TripNova] OpenWeatherMap request failed: {e}")

    # Standard Open-Meteo API (High reliability, no key needed)
    try:
        open_meteo_url = (
            f"https://api.open-meteo.com/v1/forecast?"
            f"latitude={lat}&longitude={lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&hourly=precipitation_probability&forecast_days=1"
        )
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(open_meteo_url)
            if resp.status_code == 200:
                data = resp.json()
                current = data.get("current", {})
                temp = round(current.get("temperature_2m", 28))
                wmo_code = current.get("weather_code", 0)
                condition, icon = WMO_CODE_MAP.get(wmo_code, ("Clear sky", "Sun"))
                
                # Precipitation chance
                hourly_probs = data.get("hourly", {}).get("precipitation_probability", [0])
                rain_prob = hourly_probs[0] if hourly_probs else int(current.get("precipitation", 0) > 0) * 50

                return {
                    "location": destination.title(),
                    "tempC": temp,
                    "temp_c": temp,
                    "temperature": temp,
                    "condition": condition,
                    "icon": icon,
                    "weather_code": wmo_code,
                    "rain_probability": rain_prob,
                    "humidity": current.get("relative_humidity_2m", 60),
                    "wind_speed_kmh": round(current.get("wind_speed_10m", 12), 1),
                    "last_updated": datetime.now().strftime("%I:%M %p"),
                    "status": "ok",
                }
    except Exception as e:
        print(f"[TripNova] Open-Meteo weather fetch failed: {e}")

    # Graceful fallback response
    return {
        "location": destination.title() if destination else "Chennai",
        "tempC": 28,
        "temp_c": 28,
        "temperature": 28,
        "condition": "Partly Cloudy",
        "icon": "CloudSun",
        "rain_probability": 15,
        "humidity": 65,
        "wind_speed_kmh": 14.0,
        "last_updated": datetime.now().strftime("%I:%M %p"),
        "status": "fallback",
    }
