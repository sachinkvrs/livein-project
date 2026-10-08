from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, Query, Header, Depends, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import uuid
import copy

from recommendation.recommender import recommend, replan_day_for_weather
from places_service import search_places, get_suggested_places, explore_nearby_places
from models import (
    TripCreateRequest,
    TripUpdateRequest,
    ItineraryUpdateRequest,
    ActivityAddRequest,
    ActivityCompleteRequest,
    ExpenseCreate,
    ReplanRequest,
    WeatherAlertSimulateRequest,
    AcceptReplanRequest,
    RouteOptimizeRequest,
    ApplyOptimizedRouteRequest,
    AiChatRequest,
    QuickPlanRequest,
    ApplyQuickPlanRequest,
    SimulateTripRequest,
    ApplySimulationRequest,
    UserSignupRequest,
    UserLoginRequest,
    UserUpdateRequest,
    UserResponse,
)
from storage import (
    save_trip,
    get_trip,
    list_trips,
    update_trip,
    delete_trip,
    get_expenses,
    add_expense,
    delete_expense,
    create_user,
    authenticate_user,
    get_user_by_id,
    get_user_by_email,
    update_user,
    create_auth_token,
    resolve_user_id_from_token,
    record_user_preference_signal,
)
from weather import fetch_weather_for_location
from geocoding import calculate_route, geocode_place
from trip_intelligence import (
    compute_trip_health_score,
    compute_predictive_budget,
    optimize_day_route,
    generate_smart_replan_alternatives,
    compute_user_travel_profile,
    compute_trip_analytics,
    compute_planned_vs_actual,
    parse_time_to_minutes,
    format_deviation,
    generate_quick_time_plan,
    compute_decision_center,
    simulate_what_if_scenario,
    compute_travel_buffers,
)
from ai_assistant import process_ai_chat

app = FastAPI(
    title="TripNova Intelligent Travel Companion API",
    description="Adaptive travel companion API with Smart Replanning 2.0, AI Assistant actions, Live Trip Mode, Route Optimizer, Predictive Budget, and Travel Analytics.",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def calculate_trip_days(start_date_str: Optional[str], end_date_str: Optional[str], default_days: int = 3) -> int:
    if not start_date_str or not end_date_str:
        return default_days
    try:
        s_clean = start_date_str.strip()[:10]
        e_clean = end_date_str.strip()[:10]

        d1 = None
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                d1 = datetime.strptime(s_clean, fmt)
                break
            except ValueError:
                pass
        if d1 is None:
            d1 = datetime.fromisoformat(start_date_str)

        d2 = None
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d"):
            try:
                d2 = datetime.strptime(e_clean, fmt)
                break
            except ValueError:
                pass
        if d2 is None:
            d2 = datetime.fromisoformat(end_date_str)

        diff = (d2 - d1).days + 1
        return max(1, min(5, diff))
    except Exception as e:
        print(f"[TripNova] Date parsing error: {e}")
        return default_days


def get_current_user_id(
    x_user_id: Optional[str] = Header(None, alias="X-User-Id"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
) -> Optional[str]:
    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        resolved = resolve_user_id_from_token(token)
        if resolved:
            return resolved
    if x_user_id:
        return resolve_user_id_from_token(x_user_id)
    return None


def _verify_trip_ownership(trip: Dict[str, Any], current_user_id: Optional[str], action_label: str = "access"):
    """Ensures a user can never access or modify another user's trip or expense data."""
    trip_owner = trip.get("user_id")
    if (
        trip_owner
        and trip_owner not in ("default_user", "guest_user")
        and current_user_id
        and trip_owner != current_user_id
    ):
        raise HTTPException(
            status_code=403,
            detail=f"You do not have permission to {action_label} this trip.",
        )


async def recalculate_day_route(day_obj: Dict[str, Any], fallback_city: str = "Chennai") -> Dict[str, Any]:
    """Recalculates road distance, travel duration, and route geometry for a day's itinerary items."""
    items = day_obj.get("items", [])
    coords = []
    for item in items:
        lat = item.get("latitude")
        lon = item.get("longitude")
        if lat is None or lon is None or (lat == 0 and lon == 0):
            title = item.get("title") or item.get("name") or "Attraction"
            geo = await geocode_place(f"{title}, {fallback_city}")
            if geo:
                lat, lon = geo["lat"], geo["lon"]
                item["latitude"] = lat
                item["longitude"] = lon
        if lat is not None and lon is not None:
            coords.append((float(lat), float(lon)))
    route_info = await calculate_route(coords)
    day_obj["distance_km"] = route_info.get("distance_km", 0.0)
    day_obj["estimated_time_min"] = route_info.get("duration_min", 0)
    day_obj["route_geometry"] = route_info.get("geometry", [])
    return day_obj


@app.get("/")
def home():
    return {
        "app": "TripNova Intelligent Travel Companion API",
        "version": "3.0.0",
        "status": "online",
        "timestamp": datetime.utcnow().isoformat(),
    }


@app.get("/health")
def health():
    return {"status": "ok"}


# ============================================================
# PLACES SEARCH & WEATHER-AWARE SUGGESTIONS
# ============================================================

@app.get("/places/search")
async def search_destination_places(
    query: str = Query(..., description="Place name or keyword to search"),
    city: str = Query("Chennai", description="Destination city to search within"),
    limit: int = Query(12, ge=1, le=30),
):
    """Searches real places matching the query in the given destination."""
    return await search_places(query=query, city=city, limit=limit)


@app.get("/places/suggestions")
async def get_destination_suggestions(
    city: str = Query("Chennai", description="Destination city to get suggestions for"),
    exclude: Optional[str] = Query(None, description="Comma-separated list of place titles to exclude"),
    limit: int = Query(8, ge=1, le=20),
    weather_aware: bool = Query(True, description="Rank places considering current destination weather"),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Fetches top-rated places & attractions for the specified destination, ranked by weather and user preferences."""
    exclude_list = [x.strip() for x in exclude.split(",")] if exclude else []
    suggestions = await get_suggested_places(city=city, exclude_names=exclude_list, limit=limit + 4)

    if weather_aware and suggestions:
        weather = await fetch_weather_for_location(city)
        rain_prob = int(weather.get("rain_probability", 15))
        is_rainy = rain_prob >= 50

        user = get_user_by_id(current_user_id) if current_user_id else None
        prefs = (user or {}).get("learned_preferences") or {}
        cat_scores = prefs.get("category_scores") or {}

        for p in suggestions:
            base_rating = float(p.get("rating", 4.5)) * 20.0
            w_adj = 0.0
            if is_rainy:
                w_adj = 12.0 if p.get("indoor") else -12.0
                p["weather_tag"] = "Indoor Priority (Rain Expected)" if p.get("indoor") else "Outdoor (Rain Risk)"
            else:
                w_adj = 8.0 if p.get("outdoor") else 2.0
                p["weather_tag"] = "Great Weather for Outdoor" if p.get("outdoor") else "Indoor Comfort"

            cat_str = str(p.get("category", "")).lower()
            pref_adj = 0.0
            for k, v in cat_scores.items():
                if any(w in cat_str for w in k.lower().split("&")):
                    pref_adj = (float(v) - 65.0) * 0.2
                    break

            p["ranking_score"] = round(base_rating + w_adj + pref_adj, 1)

        suggestions.sort(key=lambda x: x.get("ranking_score", 85.0), reverse=True)

    return suggestions[:limit]


# ============================================================
# AUTHENTICATION & USER PREFERENCE ENDPOINTS
# ============================================================

@app.post("/auth/signup")
def signup(payload: UserSignupRequest):
    """Registers a new user account with PBKDF2 password hashing and signed session token."""
    if not payload.name.strip() or not payload.email.strip() or not payload.password:
        raise HTTPException(status_code=400, detail="All fields (name, email, password) are required.")
    try:
        user = create_user(
            name=payload.name,
            email=payload.email,
            password=payload.password,
        )
        token = create_auth_token(user["id"])
        return {
            "token": token,
            "user": user,
            "message": "Account created successfully",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/auth/login")
def login(payload: UserLoginRequest):
    """Authenticates user with email and password and issues a signed token."""
    user = authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_auth_token(user["id"])
    return {
        "token": token,
        "user": user,
        "message": "Logged in successfully",
    }


@app.get("/users/me")
def get_me(user_id: Optional[str] = Depends(get_current_user_id)):
    """Fetches currently authenticated user along with their learned Travel Profile."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated. Missing user session.")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user_trips = list_trips(user_id=user_id)
    user["travel_profile"] = compute_user_travel_profile(user, user_trips)
    return user


@app.put("/users/me")
def update_me(
    payload: UserUpdateRequest,
    user_id: Optional[str] = Depends(get_current_user_id),
):
    """Updates profile information and learned travel preferences for the authenticated user."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated. Missing user session.")

    updates = payload.model_dump(exclude_unset=True)
    updated = update_user(user_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="User not found.")
    user_trips = list_trips(user_id=user_id)
    updated["travel_profile"] = compute_user_travel_profile(updated, user_trips)
    return updated


@app.get("/users/me/travel-profile")
def get_my_travel_profile(user_id: Optional[str] = Depends(get_current_user_id)):
    """Returns the user's dynamic 'Your Travel Profile' learned from preferences and trip behavior."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user_trips = list_trips(user_id=user_id)
    profile = compute_user_travel_profile(user, user_trips)
    profile["category_weights"] = profile.get("category_scores", {})
    return profile


@app.put("/users/me/travel-profile")
def update_my_travel_profile(
    payload: Dict[str, Any] = Body(...),
    user_id: Optional[str] = Depends(get_current_user_id),
):
    """Allows the user to directly view and edit their learned Travel Profile affinities."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated.")
    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    current_prefs = user.get("learned_preferences") or {}
    weights_dict = payload.get("category_scores") or payload.get("category_weights")
    if isinstance(weights_dict, dict):
        current_prefs["category_scores"] = {
            k: max(0, min(100, int(v))) for k, v in weights_dict.items()
        }
        current_prefs["manual_override"] = True
    if "preferred_distance_km" in payload:
        current_prefs["preferred_travel_distance_km"] = float(payload["preferred_distance_km"])
    if "preferred_duration_hours" in payload:
        current_prefs["preferred_activity_duration_hours"] = float(payload["preferred_duration_hours"])
    for field in ("preferred_budget_range", "preferred_travel_distance_km", "preferred_activity_duration_hours", "food_preferences", "skipped_categories"):
        if field in payload:
            current_prefs[field] = payload[field]

    updated = update_user(user_id, {"learned_preferences": current_prefs})
    user_trips = list_trips(user_id=user_id)
    profile = compute_user_travel_profile(updated, user_trips)
    profile["category_weights"] = profile.get("category_scores", {})
    return profile


@app.post("/auth/logout")
def logout():
    """Logs out active session."""
    return {"message": "Logged out successfully"}


# ============================================================
# TRIP ENDPOINTS (USER-SCOPED)
# ============================================================

@app.post("/trips")
async def create_new_trip(
    payload: TripCreateRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Creates a new trip from user preferences, fetches destination weather,
    runs weather-aware & preference-aware recommendation engine,
    generates daily itinerary with coordinates, and preserves original_itinerary.
    """
    destination = (payload.destination or "Chennai").strip()
    category = payload.category or None
    travellers = int(payload.travellers or 1)
    budget = float(payload.tripBudget or payload.budget or 50000.0)
    start_date = payload.startDate or payload.start_date or datetime.now().strftime("%Y-%m-%d")
    end_date = payload.endDate or payload.end_date or datetime.now().strftime("%Y-%m-%d")
    interests = payload.interests or []
    travel_type = payload.travelling_with or "friends"
    preferred_time = payload.preferred_time or "morning"
    budget_level = payload.budgetLevel or payload.budget_level or "Budget"
    assigned_user_id = resolve_user_id_from_token(payload.user_id) or current_user_id or "default_user"

    num_days = calculate_trip_days(start_date, end_date)

    # Fetch live weather & user learned preferences for weather-aware ranking (#7 & #8)
    weather_data = await fetch_weather_for_location(destination)
    user_obj = get_user_by_id(assigned_user_id) if assigned_user_id else None
    learned_prefs = (user_obj or {}).get("learned_preferences")

    try:
        rec_result = recommend(
            category=category,
            travelling_with=travel_type,
            budget=budget_level,
            preferred_time=preferred_time,
            trip_days=num_days,
            interests=interests,
            destination=destination,
            weather_data=weather_data,
            learned_preferences=learned_prefs,
        )
        raw_itinerary = rec_result.get("itinerary", [])
        num_days = rec_result.get("trip_days", num_days)
    except Exception as exc:
        print(f"[TripNova] Recommendation error: {exc}")
        raw_itinerary = []

    formatted_itinerary = []
    for day_obj in raw_itinerary:
        day_num = day_obj.get("day", 1)
        items = day_obj.get("items", [])

        coords = [
            (item["latitude"], item["longitude"])
            for item in items
            if item.get("latitude") is not None and item.get("longitude") is not None
        ]
        route_info = await calculate_route(coords)

        formatted_itinerary.append({
            "day": day_num,
            "city": destination,
            "date": start_date if day_num == 1 else "",
            "items": items,
            "distance_km": route_info.get("distance_km", 0.0),
            "estimated_time_min": route_info.get("duration_min", 0),
            "route_geometry": route_info.get("geometry", []),
        })

    trip_id = f"trip-{destination.lower()[:4]}-{uuid.uuid4().hex[:6]}"
    trip_data = {
        "id": trip_id,
        "trip_id": trip_id,
        "user_id": assigned_user_id,
        "destination": destination,
        "category": category,
        "start_date": start_date,
        "end_date": end_date,
        "number_of_days": num_days,
        "days": num_days,
        "travellers": travellers,
        "budget": budget,
        "tripBudget": budget,
        "spent": 0.0,
        "interests": interests,
        "travel_type": travel_type,
        "travelling_with": travel_type,
        "budget_level": budget_level,
        "preferred_time": preferred_time,
        "status": "Upcoming",
        "dateRange": f"{start_date} – {end_date}",
        "itinerary": formatted_itinerary,
        "original_itinerary": copy.deepcopy(formatted_itinerary),
        "expenses": [],
        "active_alert": None,
        "created_at": datetime.utcnow().isoformat(),
    }

    saved = save_trip(trip_data, user_id=assigned_user_id)
    return saved


@app.get("/trips")
def get_all_trips(
    user_id: Optional[str] = Query(None),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Lists saved trips (filtered by authenticated user)."""
    target_user = resolve_user_id_from_token(user_id) if user_id else current_user_id
    return list_trips(user_id=target_user)


@app.get("/trips/{trip_id}")
def get_single_trip(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Fetches full trip details by ID with ownership check."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view")
    return trip


@app.put("/trips/{trip_id}")
def update_single_trip(
    trip_id: str,
    updates: TripUpdateRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Updates basic trip details with ownership check."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "update")

    updated = update_trip(trip_id, updates.model_dump(exclude_unset=True))
    return updated


@app.delete("/trips/{trip_id}")
def remove_trip(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Deletes a trip if owned by the authenticated user."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    _verify_trip_ownership(trip, current_user_id, "delete")

    success = delete_trip(trip_id)
    if not success:
        raise HTTPException(status_code=404, detail="Trip not found")
    return {
        "success": True,
        "deleted": True,
        "trip_id": trip_id,
        "destination": trip.get("destination", "Trip"),
        "message": f"{trip.get('destination', 'Trip')} trip deleted successfully",
    }


# ============================================================
# ITINERARY, ACTIVITY & COMPLETION TRACKING ENDPOINTS
# ============================================================

@app.get("/trips/{trip_id}/itinerary")
def get_trip_itinerary(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Gets the itinerary for a trip."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view itinerary for")
    return trip.get("itinerary", [])


@app.post("/trips/{trip_id}/itinerary/activities")
async def add_activity_to_trip(
    trip_id: str,
    payload: ActivityAddRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Adds a new activity to a specific day of the trip, recalculates the daily
    driving route, distance, and estimated transit time via OSRM, updates preference learning, and persists it.
    """
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "modify")

    itinerary = trip.get("itinerary", [])
    day_num = payload.day or 1
    target_day = next((d for d in itinerary if d.get("day") == day_num), None)

    if not target_day:
        target_day = {
            "day": day_num,
            "city": trip.get("destination", "Chennai"),
            "date": trip.get("start_date", ""),
            "items": [],
            "distance_km": 0.0,
            "estimated_time_min": 0,
            "route_geometry": [],
        }
        itinerary.append(target_day)

    lat = payload.latitude
    lon = payload.longitude
    place_title = payload.title or payload.name or "Attraction"

    if lat is None or lon is None or (lat == 0 and lon == 0):
        geo = await geocode_place(f"{place_title}, {trip.get('destination', 'Chennai')}")
        if geo:
            lat = geo["lat"]
            lon = geo["lon"]
        else:
            lat = 13.0827
            lon = 80.2707

    activity_id = f"act-{day_num}-{uuid.uuid4().hex[:6]}"
    new_item = {
        "id": activity_id,
        "place_id": payload.place_id or f"p-{uuid.uuid4().hex[:6]}",
        "title": place_title,
        "name": place_title,
        "time": payload.time or payload.start_time or "02:00 PM",
        "duration": payload.duration or "1.5h",
        "note": payload.note or payload.description or f"Explore {place_title} in {trip.get('destination', 'Chennai')}",
        "category": payload.category or "Attraction",
        "subcategory": payload.subcategory or "",
        "area": payload.area or payload.location or trip.get("destination", "Chennai"),
        "estimated_cost": float(payload.estimated_cost or 0.0),
        "latitude": float(lat),
        "longitude": float(lon),
        "score": 90.0,
        "rating": float(payload.rating or 4.5),
        "indoor": bool(payload.indoor),
        "outdoor": bool(payload.outdoor),
        "weatherSensitive": bool(payload.weatherSensitive),
        "completed": False,
    }

    items = target_day.get("items", [])
    items.append(new_item)
    target_day["items"] = items

    coords = [
        (item["latitude"], item["longitude"])
        for item in items
        if item.get("latitude") is not None and item.get("longitude") is not None
    ]
    route_info = await calculate_route(coords)
    target_day["distance_km"] = route_info.get("distance_km", 0.0)
    target_day["estimated_time_min"] = route_info.get("duration_min", 0)
    target_day["route_geometry"] = route_info.get("geometry", [])

    update_trip(trip_id, {"itinerary": itinerary})
    record_user_preference_signal(current_user_id or trip.get("user_id"), new_item["category"], "add")

    return {
        "message": f"Successfully added {place_title} to Day {day_num}",
        "activity": new_item,
        "day": target_day,
        "itinerary": itinerary,
    }


@app.post("/trips/{trip_id}/itinerary/activities/{activity_id}/complete")
@app.patch("/trips/{trip_id}/itinerary/activities/{activity_id}/complete")
def toggle_activity_completion(
    trip_id: str,
    activity_id: str,
    payload: ActivityCompleteRequest = ActivityCompleteRequest(),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Marks an activity as completed or uncompleted, records actual execution time,
    calculates time deviation from planned time (#10), and updates preference learning (#8).
    """
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "update")

    itinerary = trip.get("itinerary", [])
    target_item = None

    for day_obj in itinerary:
        for item in day_obj.get("items", []):
            if item.get("id") == activity_id:
                target_item = item
                break
        if target_item:
            break

    if not target_item:
        raise HTTPException(status_code=404, detail="Activity not found")

    target_item["completed"] = bool(payload.completed)
    if payload.completed:
        actual_t = payload.actual_time or datetime.now().strftime("%I:%M %p")
        target_item["actual_time"] = actual_t
        target_item["completed_at"] = datetime.utcnow().isoformat()
        planned_min = parse_time_to_minutes(target_item.get("time", "09:00 AM"))
        actual_min = parse_time_to_minutes(actual_t)
        diff = actual_min - planned_min
        target_item["deviation_minutes"] = diff
        target_item["deviation_label"] = format_deviation(diff)
        record_user_preference_signal(current_user_id or trip.get("user_id"), target_item.get("category"), "complete")
    else:
        target_item["actual_time"] = None
        target_item["completed_at"] = None
        target_item["deviation_minutes"] = None
        target_item["deviation_label"] = None

    update_trip(trip_id, {"itinerary": itinerary})
    return {
        "activity": target_item,
        "itinerary": itinerary,
        "planned_vs_actual": compute_planned_vs_actual(trip.get("original_itinerary") or itinerary, itinerary),
    }


@app.delete("/trips/{trip_id}/itinerary/activities/{activity_id}")
async def remove_activity_from_trip(
    trip_id: str,
    activity_id: str,
    day: Optional[int] = Query(None, description="Optional day number"),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Deletes an activity from the itinerary, recalculates the daily route and distance,
    records skip signal in preference learning, and updates persistence.
    """
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "modify")

    itinerary = trip.get("itinerary", [])
    found = False
    removed_cat = None

    for day_obj in itinerary:
        if day is not None and day_obj.get("day") != day:
            continue
        items = day_obj.get("items", [])
        for i in items:
            if i.get("id") == activity_id:
                removed_cat = i.get("category")
        init_len = len(items)
        day_obj["items"] = [i for i in items if i.get("id") != activity_id]
        if len(day_obj["items"]) != init_len:
            found = True
            coords = [
                (item["latitude"], item["longitude"])
                for item in day_obj["items"]
                if item.get("latitude") is not None and item.get("longitude") is not None
            ]
            route_info = await calculate_route(coords)
            day_obj["distance_km"] = route_info.get("distance_km", 0.0)
            day_obj["estimated_time_min"] = route_info.get("duration_min", 0)
            day_obj["route_geometry"] = route_info.get("geometry", [])

    if not found:
        raise HTTPException(status_code=404, detail="Activity not found in trip itinerary")

    update_trip(trip_id, {"itinerary": itinerary})
    if removed_cat:
        record_user_preference_signal(current_user_id or trip.get("user_id"), removed_cat, "skip")

    return {"deleted": True, "activity_id": activity_id, "itinerary": itinerary}


@app.put("/trips/{trip_id}/itinerary")
async def update_trip_itinerary(
    trip_id: str,
    payload: ItineraryUpdateRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Updates the itinerary days/activities, reorders, and recalculates routes."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "modify")

    new_itinerary = []
    for day_obj in payload.itinerary:
        day_dict = day_obj.model_dump()
        items = day_dict.get("items", [])
        for item in items:
            if item.get("completed") and not item.get("actual_time"):
                actual_t = datetime.now().strftime("%I:%M %p")
                item["actual_time"] = actual_t
                p_min = parse_time_to_minutes(item.get("time", "09:00 AM"))
                a_min = parse_time_to_minutes(actual_t)
                item["deviation_minutes"] = a_min - p_min
                item["deviation_label"] = format_deviation(a_min - p_min)
        coords = [
            (item["latitude"], item["longitude"])
            for item in items
            if item.get("latitude") is not None and item.get("longitude") is not None
        ]
        route_info = await calculate_route(coords)
        day_dict["distance_km"] = route_info.get("distance_km", 0.0)
        day_dict["estimated_time_min"] = route_info.get("duration_min", 0)
        day_dict["route_geometry"] = route_info.get("geometry", [])
        new_itinerary.append(day_dict)

    updated = update_trip(trip_id, {"itinerary": new_itinerary})
    return updated.get("itinerary", [])


# ============================================================
# 6. ROUTE EFFICIENCY OPTIMIZER ENDPOINTS
# ============================================================

@app.post("/trips/{trip_id}/optimize-route")
async def optimize_trip_day_route(
    trip_id: str,
    payload: RouteOptimizeRequest = RouteOptimizeRequest(),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Analyzes a specific day's activities and computes an optimized ordering
    that minimizes travel distance, travel time, and backtracking.
    Does NOT automatically overwrite the itinerary until approved.
    """
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "optimize route for")

    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == payload.day), itinerary[0] if itinerary else None)
    if not target_day:
        raise HTTPException(status_code=404, detail=f"Day {payload.day} not found")

    result = await optimize_day_route(
        target_day,
        start_lat=payload.start_lat,
        start_lon=payload.start_lon,
    )
    return result


@app.post("/trips/{trip_id}/apply-optimized-route")
async def apply_optimized_day_route(
    trip_id: str,
    payload: ApplyOptimizedRouteRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Applies the user-approved optimized route ordering to the trip's itinerary,
    recalculates OSRM geometry, and persists to storage.
    """
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "update route for")

    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == payload.day), None)
    if not target_day:
        raise HTTPException(status_code=404, detail=f"Day {payload.day} not found")

    if payload.optimized_items is not None:
        optimized_items = payload.optimized_items
    else:
        opt_res = await optimize_day_route(target_day)
        optimized_items = opt_res["optimized_items"]

    coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in optimized_items
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    route_info = await calculate_route(coords)
    target_day["items"] = optimized_items
    target_day["distance_km"] = route_info.get("distance_km", 0.0)
    target_day["estimated_time_min"] = route_info.get("duration_min", 0)
    target_day["route_geometry"] = route_info.get("geometry", [])

    update_trip(trip_id, {"itinerary": itinerary})
    return {
        "status": "success",
        "day": payload.day,
        "updated_day": target_day,
        "itinerary": itinerary,
    }


# ============================================================
# EXPENSES & PREDICTIVE BUDGET ENDPOINTS
# ============================================================

@app.get("/trips/{trip_id}/expenses")
def list_trip_expenses(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Lists expenses for a trip if authorized."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view expenses for")
    return get_expenses(trip_id)


@app.post("/trips/{trip_id}/expenses")
def add_trip_expense(
    trip_id: str,
    payload: ExpenseCreate,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Adds a new expense and updates spent amount with ownership verification."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "add expenses to")

    if payload.amount <= 0:
        raise HTTPException(
            status_code=400,
            detail="Expense amount must be greater than 0.",
        )

    exp_data = payload.model_dump()
    exp = add_expense(trip_id, exp_data)
    if not exp:
        raise HTTPException(status_code=404, detail="Trip not found")

    updated_trip = get_trip(trip_id)
    predictive = compute_predictive_budget(updated_trip)
    return {
        "success": True,
        "message": f"Added INR {exp['amount']} for {exp['category']}",
        "expense": exp,
        "expenses": updated_trip.get("expenses", []),
        "spent": updated_trip.get("spent", 0.0),
        "budget": updated_trip.get("budget", 0.0),
        "predictive_budget": predictive,
    }


@app.delete("/trips/{trip_id}/expenses/{expense_id}")
def remove_trip_expense(
    trip_id: str,
    expense_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Deletes an expense and updates spent amount with ownership verification."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "delete expenses from")

    success = delete_expense(trip_id, expense_id)
    if not success:
        raise HTTPException(status_code=404, detail="Expense not found")

    updated_trip = get_trip(trip_id)
    predictive = compute_predictive_budget(updated_trip)
    return {
        "success": True,
        "deleted": True,
        "expense_id": expense_id,
        "expenses": updated_trip.get("expenses", []),
        "spent": updated_trip.get("spent", 0.0),
        "budget": updated_trip.get("budget", 0.0),
        "predictive_budget": predictive,
    }


@app.get("/trips/{trip_id}/predictive-budget")
def get_trip_predictive_budget(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Returns Predictive Budget metrics (Actual vs Estimated Remaining Spend & Expected Saving/Overspending)."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view budget for")
    return compute_predictive_budget(trip)


# ============================================================
# 4, 9, 10. TRIP HEALTH SCORE, ANALYTICS & PLANNED VS ACTUAL
# ============================================================

@app.get("/trips/{trip_id}/health-score")
async def get_trip_health(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Computes dynamic Trip Health Score (0-100) and supporting indicators."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view health score for")

    weather = await fetch_weather_for_location(trip.get("destination", "Chennai"))
    return compute_trip_health_score(trip, weather_data=weather)


@app.get("/trips/{trip_id}/analytics")
def get_trip_analytics_endpoint(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Returns Trip Analytics and Planned vs Actual comparison (#9 & #10)."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view analytics for")
    return compute_trip_analytics(trip)


@app.get("/trips/{trip_id}/planned-vs-actual")
def get_trip_planned_vs_actual(
    trip_id: str,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Returns Planned vs Actual itinerary execution differences (#10)."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view planned vs actual for")
    orig = trip.get("original_itinerary") or trip.get("itinerary", [])
    curr = trip.get("itinerary", [])
    comparisons = compute_planned_vs_actual(orig, curr)
    if isinstance(comparisons, dict):
        return {"trip_id": trip_id, **comparisons}

    total_planned = sum(len(d.get("items", [])) for d in orig)
    completed_count = sum(1 for c in comparisons if c.get("completed"))
    replanned_swaps = sum(1 for c in comparisons if c.get("status") == "replanned")
    added_activities = sum(1 for c in comparisons if c.get("status") == "added")
    total_dev_min = sum(int(c.get("deviation_minutes") or 0) for c in comparisons if c.get("completed"))

    for c in comparisons:
        c["activity"] = c.get("actual_title") or c.get("planned_title")

    return {
        "trip_id": trip_id,
        "total_planned_activities": total_planned,
        "completed_activities": completed_count,
        "replanned_swaps": replanned_swaps,
        "added_activities": added_activities,
        "total_deviation_minutes": total_dev_min,
        "total_deviation_label": format_deviation(total_dev_min),
        "comparisons": comparisons,
    }


# ============================================================
# WEATHER ENDPOINTS
# ============================================================

@app.get("/trips/{trip_id}/weather")
async def get_trip_weather(trip_id: str):
    """Fetches real-time weather for the trip's destination."""
    trip = get_trip(trip_id)
    destination = trip.get("destination", "Chennai") if trip else "Chennai"
    weather = await fetch_weather_for_location(destination)
    return weather


@app.get("/api/weather")
async def get_city_weather(city: str = Query("Chennai")):
    """Fetches weather for any city query."""
    return await fetch_weather_for_location(city)


# ============================================================
# ROUTE & MAP ENDPOINTS
# ============================================================

@app.get("/trips/{trip_id}/route")
async def get_trip_day_route(trip_id: str, day: int = Query(1)):
    """Computes routing polyline and distances for a specific trip day."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == day), None)
    if not target_day:
        raise HTTPException(status_code=404, detail=f"Day {day} not found")

    items = target_day.get("items", [])
    coords = [
        (item["latitude"], item["longitude"])
        for item in items
        if item.get("latitude") is not None and item.get("longitude") is not None
    ]

    route_info = await calculate_route(coords)
    return {
        "day": day,
        "places_count": len(coords),
        **route_info,
    }


# ============================================================
# 1. SMART REPLANNING 2.0 ENDPOINTS
# ============================================================

@app.post("/trips/{trip_id}/simulate-alert")
async def simulate_alert(
    trip_id: str,
    payload: WeatherAlertSimulateRequest = WeatherAlertSimulateRequest(),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Detects disruption / simulates weather or schedule alert and runs Smart Replanning 2.0.
    Generates multiple alternative plans with full impact breakdown (time, cost, distance, opening hours)
    WITHOUT silently overwriting the user's itinerary until approved.
    """
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "simulate alert for")

    day_num = payload.day or 1
    reason_text = payload.reason or f"{payload.condition or 'Rain'} expected at 3:00 PM in {trip.get('destination', 'the area')}"
    alert_obj = {
        "id": f"alert-{uuid.uuid4().hex[:6]}",
        "day": day_num,
        "severity": payload.severity or "critical",
        "type": "weather",
        "title": "Severe Weather Warning",
        "message": f"{reason_text}. Outdoor activities face weather risk — Smart Replanning 2.0 has prepared indoor & next-day alternatives.",
        "time": datetime.now().strftime("%I:%M %p"),
        "active": True,
    }

    update_trip(trip_id, {"active_alert": alert_obj})

    smart_plan = await generate_smart_replan_alternatives(
        trip=trip,
        day_number=day_num,
        reason=reason_text,
        user_location=payload.user_location,
    )

    return {
        "alert": alert_obj,
        "original_day": smart_plan.get("original_day"),
        "proposed_day": smart_plan.get("proposed_day"),
        "moved_to_next_day": smart_plan.get("moved_to_next_day"),
        "changes": smart_plan.get("changes", []),
        "reasons": smart_plan.get("reasons", []),
        "summary_metrics": smart_plan.get("summary_metrics", {}),
        "alternatives": smart_plan.get("alternatives", []),
    }


@app.post("/trips/{trip_id}/replan")
async def replan_trip_day(
    trip_id: str,
    payload: ReplanRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Generates Smart Replanning 2.0 alternatives and full impact comparison for the affected day."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "replan")

    smart_plan = await generate_smart_replan_alternatives(
        trip=trip,
        day_number=payload.day,
        reason=payload.reason or "Weather / Schedule Disruption",
        user_location=payload.user_location,
    )
    if "error" in smart_plan:
        raise HTTPException(status_code=404, detail=smart_plan["error"])

    # Return proposed_day with attached smart replan metadata for backward & v2 compatibility
    proposed = dict(smart_plan["proposed_day"])
    proposed["changes"] = smart_plan.get("changes", [])
    proposed["summary_metrics"] = smart_plan.get("summary_metrics", {})
    proposed["alternatives"] = smart_plan.get("alternatives", [])
    proposed["moved_to_next_day"] = smart_plan.get("moved_to_next_day")
    proposed["reasons"] = smart_plan.get("reasons", [])
    return proposed


@app.post("/trips/{trip_id}/accept-replan")
async def accept_replan(
    trip_id: str,
    day_number: int = Query(1),
    payload: Optional[AcceptReplanRequest] = Body(None),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Applies the user-approved replanned day (and optional next-day rescheduled outdoor activity)
    to the trip's active itinerary and clears the active alert.
    """
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "accept replan for")

    target_day_num = (payload.day_number if payload and payload.day_number else day_number) or 1
    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == target_day_num), None)
    if not target_day:
        raise HTTPException(status_code=404, detail=f"Day {target_day_num} not found")

    if payload and payload.proposed_day:
        updated_day = payload.proposed_day
        moved_next = payload.moved_to_next_day
    else:
        smart = await generate_smart_replan_alternatives(
            trip=trip,
            day_number=target_day_num,
        )
        updated_day = smart.get("proposed_day") or replan_day_for_weather(
            target_day,
            destination=trip.get("destination", "Chennai"),
            interests=trip.get("interests", []),
        )
        moved_next = smart.get("moved_to_next_day")

    # Ensure route geometry is up to date
    coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in updated_day.get("items", [])
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    route_info = await calculate_route(coords)
    updated_day["distance_km"] = route_info.get("distance_km", 0.0)
    updated_day["estimated_time_min"] = route_info.get("duration_min", 0)
    updated_day["route_geometry"] = route_info.get("geometry", [])

    new_itinerary = []
    for d in itinerary:
        if d.get("day") == target_day_num:
            new_itinerary.append(updated_day)
        elif moved_next and d.get("day") == target_day_num + 1:
            next_d = dict(d)
            next_items = list(next_d.get("items", []))
            if not any(i.get("title") == moved_next.get("title") for i in next_items):
                next_items.insert(0, moved_next)
                next_coords = [
                    (float(i["latitude"]), float(i["longitude"]))
                    for i in next_items
                    if i.get("latitude") is not None and i.get("longitude") is not None
                ]
                next_route = await calculate_route(next_coords)
                next_d["items"] = next_items
                next_d["distance_km"] = next_route.get("distance_km", 0.0)
                next_d["estimated_time_min"] = next_route.get("duration_min", 0)
                next_d["route_geometry"] = next_route.get("geometry", [])
            new_itinerary.append(next_d)
        else:
            new_itinerary.append(d)

    update_trip(trip_id, {
        "itinerary": new_itinerary,
        "active_alert": None,
    })
    return {
        "status": "success",
        "itinerary": new_itinerary,
        "updated_day": updated_day,
    }


# ============================================================
# 2. REAL TRIPNOVA AI ASSISTANT ENDPOINT
# ============================================================

@app.post("/api/ai/chat")
async def ai_assistant_chat(
    payload: AiChatRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """
    Context-aware AI Assistant endpoint.
    Understands active trip state, weather, budget, and itinerary,
    and executes real validated trip actions (Add activity, Remove activity, Add expense, Optimize route).
    """
    trip = None
    if payload.trip_id:
        trip = get_trip(payload.trip_id)
        if trip:
            _verify_trip_ownership(trip, current_user_id, "use AI assistant on")
    elif current_user_id:
        user_trips = list_trips(user_id=current_user_id)
        if user_trips:
            trip = user_trips[0]

    weather_data = None
    if trip and trip.get("destination"):
        weather_data = await fetch_weather_for_location(trip["destination"])

    reply = await process_ai_chat(
        message=payload.message,
        trip=trip,
        active_day=payload.active_day or 1,
        weather_data=weather_data,
        user_location=payload.user_location,
        last_recommended_places=payload.last_recommended_places,
    )
    if "recommended_places" not in reply:
        reply["recommended_places"] = reply.get("recommendations", [])
    return reply


# ============================================================
# LEGACY RECOMMEND ENDPOINT (Weather-Aware Enhanced)
# ============================================================

class RecommendationRequest(BaseModel):
    category: Optional[str] = None
    travelling_with: Optional[str] = None
    budget: Optional[str] = None
    preferred_time: Optional[str] = None
    duration: Optional[str] = None
    trip_days: Optional[int] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    interests: Optional[List[str]] = None
    destination: Optional[str] = "Chennai"
    weather_data: Optional[Dict[str, Any]] = None


@app.post("/recommend")
async def get_recommendations(
    request: RecommendationRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    try:
        num_days = request.trip_days
        if num_days is None and request.startDate and request.endDate:
            num_days = calculate_trip_days(request.startDate, request.endDate)
        elif num_days is None and request.duration:
            num_days = calculate_trip_days(None, None, default_days=3)

        weather = request.weather_data or await fetch_weather_for_location(request.destination or "Chennai")
        user_obj = get_user_by_id(current_user_id) if current_user_id else None
        learned_prefs = (user_obj or {}).get("learned_preferences")

        results = recommend(
            category=request.category,
            travelling_with=request.travelling_with,
            budget=request.budget,
            preferred_time=request.preferred_time,
            trip_days=num_days or 3,
            interests=request.interests,
            destination=request.destination or "Chennai",
            weather_data=weather,
            learned_preferences=learned_prefs,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    if not results.get("itinerary"):
        raise HTTPException(
            status_code=404,
            detail="No destinations found matching preferences"
        )

    return results


# ============================================================
# 1. "I HAVE 2 HOURS" — QUICK TIME PLANNER ENDPOINTS
# ============================================================

@app.post("/trips/{trip_id}/quick-plan")
async def create_quick_time_plan_for_trip(
    trip_id: str,
    payload: QuickPlanRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Generates an optimized mini-itinerary for a given free-time window (e.g. 30m, 1h, 2h, 3h)."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "generate a quick plan for")

    weather = await fetch_weather_for_location(trip.get("destination", "Chennai"))
    return await generate_quick_time_plan(
        trip=trip,
        day_number=payload.day or 1,
        available_minutes=payload.available_minutes or 120,
        user_location=payload.user_location,
        weather_data=weather,
        transport_mode=payload.transport_mode or trip.get("transport_mode") or "cab",
        start_time_str=payload.start_time,
        replace_activity_id=payload.replace_activity_id,
    )


@app.post("/quick-plan")
async def create_quick_time_plan_alias(
    payload: QuickPlanRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Alias endpoint for Quick Time Planner."""
    if payload.trip_id:
        return await create_quick_time_plan_for_trip(payload.trip_id, payload, current_user_id)
    user_trips = list_trips(user_id=current_user_id)
    if not user_trips:
        raise HTTPException(status_code=404, detail="No active trip found")
    return await create_quick_time_plan_for_trip(user_trips[0]["id"], payload, current_user_id)


@app.post("/trips/{trip_id}/apply-quick-plan")
async def apply_quick_time_plan_to_trip(
    trip_id: str,
    payload: ApplyQuickPlanRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Applies a Quick Time mini-plan to today's itinerary (append or replace an activity) and recalculates routes."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "modify")

    itinerary = trip.get("itinerary", [])
    day_num = payload.day or 1
    new_activities = payload.activities or []
    if not new_activities:
        raise HTTPException(status_code=400, detail="No activities provided in quick plan")

    for day_obj in itinerary:
        if day_obj.get("day") == day_num:
            items = list(day_obj.get("items", []))
            if payload.mode == "replace" and payload.replace_activity_id:
                rep_idx = next((idx for idx, i in enumerate(items) if i.get("id") == payload.replace_activity_id), None)
                if rep_idx is not None:
                    items = items[:rep_idx] + new_activities + items[rep_idx + 1:]
                else:
                    items.extend(new_activities)
            else:
                items.extend(new_activities)

            day_obj["items"] = items
            await recalculate_day_route(day_obj, fallback_city=trip.get("destination", "Chennai"))
            break

    updated_trip = update_trip(trip_id, {"itinerary": itinerary})
    return {
        "message": "Quick Time mini-plan applied to itinerary",
        "itinerary": updated_trip.get("itinerary", itinerary),
        "trip": updated_trip,
    }


# ============================================================
# 2. TRIPNOVA DECISION CENTER ENDPOINTS
# ============================================================

@app.get("/trips/{trip_id}/decision-center")
async def get_trip_decision_center(
    trip_id: str,
    day: int = Query(1),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Returns TripNova Decision Center analysis (Health Score + Weather/Route/Budget/Schedule/Opportunity items)."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view decision center for")

    weather = await fetch_weather_for_location(trip.get("destination", "Chennai"))
    user_loc = {"lat": lat, "lon": lon} if (lat is not None and lon is not None) else None
    return await compute_decision_center(
        trip=trip,
        day_number=day,
        weather_data=weather,
        user_location=user_loc,
    )


@app.get("/decision-center")
async def get_decision_center_alias(
    trip_id: Optional[str] = Query(None),
    day: int = Query(1),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Alias endpoint for TripNova Decision Center."""
    target_id = trip_id
    if not target_id:
        user_trips = list_trips(user_id=current_user_id)
        if not user_trips:
            raise HTTPException(status_code=404, detail="No active trip found")
        target_id = user_trips[0]["id"]
    return await get_trip_decision_center(target_id, day=day, lat=lat, lon=lon, current_user_id=current_user_id)


# ============================================================
# 3. "WHAT IF?" TRIP SIMULATOR ENDPOINTS
# ============================================================

@app.post("/trips/{trip_id}/simulate")
async def simulate_trip_what_if(
    trip_id: str,
    payload: SimulateTripRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Simulates a 'What If?' scenario without mutating stored trip state until user approval."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "simulate scenarios for")

    weather = await fetch_weather_for_location(trip.get("destination", "Chennai"))
    return await simulate_what_if_scenario(
        trip=trip,
        day_number=payload.day or 1,
        scenario_type=payload.scenario_type or "rain",
        parameters=payload.parameters or {},
        user_location=payload.user_location,
        weather_data=weather,
    )


@app.post("/simulate-trip")
async def simulate_trip_what_if_alias(
    payload: SimulateTripRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Alias endpoint for What-If Trip Simulator."""
    if payload.trip_id:
        return await simulate_trip_what_if(payload.trip_id, payload, current_user_id)
    user_trips = list_trips(user_id=current_user_id)
    if not user_trips:
        raise HTTPException(status_code=404, detail="No active trip found")
    return await simulate_trip_what_if(user_trips[0]["id"], payload, current_user_id)


@app.post("/trips/{trip_id}/apply-simulation")
async def apply_simulated_plan_to_trip(
    trip_id: str,
    payload: ApplySimulationRequest,
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Applies a user-approved simulated plan to the real trip itinerary."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "apply simulation to")

    itinerary = trip.get("itinerary", [])
    day_num = payload.day or 1

    if payload.simulated_itinerary:
        itinerary = payload.simulated_itinerary
    elif payload.simulated_day:
        for idx, d in enumerate(itinerary):
            if d.get("day") == day_num:
                itinerary[idx] = payload.simulated_day
                await recalculate_day_route(itinerary[idx], fallback_city=trip.get("destination", "Chennai"))
                break

    if payload.moved_to_next_day and payload.moved_to_next_day.get("item"):
        dest_day_num = payload.moved_to_next_day.get("to_day", day_num + 1)
        moved_item = payload.moved_to_next_day["item"]
        for d in itinerary:
            if d.get("day") == dest_day_num:
                existing_ids = {i.get("id") for i in d.get("items", [])}
                if moved_item.get("id") not in existing_ids:
                    d.setdefault("items", []).append(moved_item)
                    await recalculate_day_route(d, fallback_city=trip.get("destination", "Chennai"))
                break

    updates: Dict[str, Any] = {"itinerary": itinerary}
    if payload.updated_budget is not None and payload.updated_budget > 0:
        updates["budget"] = payload.updated_budget
        updates["tripBudget"] = payload.updated_budget

    updated_trip = update_trip(trip_id, updates)
    return {
        "message": "Simulated plan applied to trip",
        "itinerary": updated_trip.get("itinerary", itinerary),
        "trip": updated_trip,
    }


# ============================================================
# 4. EXPLORE AROUND ME ENDPOINTS
# ============================================================

@app.get("/places/nearby")
async def get_nearby_places_endpoint(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    city: str = Query("Chennai"),
    category: str = Query("All"),
    radius_km: float = Query(25.0),
    exclude: Optional[str] = Query(None),
    limit: int = Query(24),
):
    """Discovers nearby Attractions, Restaurants, Cafes, Shopping, Entertainment, Parks, Museums, and Emergency services."""
    excluded_list = [x.strip() for x in exclude.split(",") if x.strip()] if exclude else []
    return await explore_nearby_places(
        lat=lat,
        lon=lon,
        city=city,
        category=category,
        radius_km=radius_km,
        exclude_names=excluded_list,
        limit=limit,
    )


@app.get("/explore-nearby")
async def get_explore_nearby_alias(
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    city: str = Query("Chennai"),
    category: str = Query("All"),
    radius_km: float = Query(25.0),
    exclude: Optional[str] = Query(None),
    limit: int = Query(24),
):
    """Alias endpoint for Explore Around Me."""
    return await get_nearby_places_endpoint(
        lat=lat,
        lon=lon,
        city=city,
        category=category,
        radius_km=radius_km,
        exclude=exclude,
        limit=limit,
    )


# ============================================================
# 5. TRAVEL TIME BUFFER ENDPOINTS
# ============================================================

@app.get("/trips/{trip_id}/travel-buffer")
def get_trip_travel_buffers(
    trip_id: str,
    day: int = Query(1),
    buffer_mode: Optional[str] = Query(None),
    transport_mode: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Calculates travel time buffers, recommended departure times, and 'Leave in X minutes' for a trip day."""
    trip = get_trip(trip_id)
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    _verify_trip_ownership(trip, current_user_id, "view travel buffers for")

    user_loc = {"lat": lat, "lon": lon} if (lat is not None and lon is not None) else None
    return compute_travel_buffers(
        trip=trip,
        day_number=day,
        buffer_mode=buffer_mode or trip.get("buffer_mode") or "normal",
        transport_mode=transport_mode or trip.get("transport_mode") or "cab",
        user_location=user_loc,
    )


@app.get("/travel-buffer")
def get_travel_buffer_alias(
    trip_id: Optional[str] = Query(None),
    day: int = Query(1),
    buffer_mode: Optional[str] = Query(None),
    transport_mode: Optional[str] = Query(None),
    lat: Optional[float] = Query(None),
    lon: Optional[float] = Query(None),
    current_user_id: Optional[str] = Depends(get_current_user_id),
):
    """Alias endpoint for Travel Time Buffer."""
    target_id = trip_id
    if not target_id:
        user_trips = list_trips(user_id=current_user_id)
        if not user_trips:
            raise HTTPException(status_code=404, detail="No active trip found")
        target_id = user_trips[0]["id"]
    return get_trip_travel_buffers(
        trip_id=target_id,
        day=day,
        buffer_mode=buffer_mode,
        transport_mode=transport_mode,
        lat=lat,
        lon=lon,
        current_user_id=current_user_id,
    )

