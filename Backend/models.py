from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime
import uuid


# ============================================================
# USER & AUTH MODELS
# ============================================================

class UserSignupRequest(BaseModel):
    name: str
    email: str
    password: str


class UserLoginRequest(BaseModel):
    email: str
    password: str


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    profile_image: Optional[str] = None
    budget_preference: Optional[str] = None
    travel_style: Optional[str] = None
    favorite_activities: Optional[List[str]] = None
    learned_preferences: Optional[Dict[str, Any]] = None


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    profile_image: Optional[str] = None
    created_at: Optional[str] = None
    budget_preference: Optional[str] = "Moderate"
    travel_style: Optional[str] = "Balanced"
    favorite_activities: Optional[List[str]] = ["Nature", "Culture", "Food"]
    learned_preferences: Optional[Dict[str, Any]] = None


# ============================================================
# TRIP & ITINERARY MODELS
# ============================================================

class ItineraryItem(BaseModel):
    id: str = Field(default_factory=lambda: f"act-{uuid.uuid4().hex[:8]}")
    place_id: Optional[str] = None
    title: str
    name: Optional[str] = None
    time: Optional[str] = "09:00 AM"
    actual_time: Optional[str] = None
    completed_at: Optional[str] = None
    deviation_minutes: Optional[int] = None
    deviation_label: Optional[str] = None
    duration: Optional[str] = "1.5h"
    note: Optional[str] = "Recommended by TripNova"
    category: Optional[str] = None
    subcategory: Optional[str] = None
    area: Optional[str] = None
    estimated_cost: Optional[float] = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    score: Optional[float] = None
    weather_tag: Optional[str] = None
    rating: Optional[float] = None
    indoor: Optional[bool] = False
    outdoor: Optional[bool] = True
    weatherSensitive: Optional[bool] = False
    completed: Optional[bool] = False
    replanned_from: Optional[str] = None


class ItineraryDay(BaseModel):
    day: int
    date: Optional[str] = ""
    city: str
    items: List[ItineraryItem] = []
    distance_km: Optional[float] = 0.0
    estimated_time_min: Optional[int] = 0
    route_geometry: Optional[List[List[float]]] = []


class Expense(BaseModel):
    id: str = Field(default_factory=lambda: f"exp-{uuid.uuid4().hex[:8]}")
    category: str  # Food, Transport, Hotel, Activities, Shopping, Other
    amount: float
    title: str
    date: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ExpenseCreate(BaseModel):
    category: str = "Food"
    amount: float
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None


class TripCreateRequest(BaseModel):
    destination: str
    travellers: int = 1
    travelling_with: Optional[str] = "friends"
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    budgetLevel: Optional[str] = None
    budget_level: Optional[str] = None
    preferred_time: Optional[str] = "morning"
    tripBudget: Optional[float] = None
    budget: Optional[float] = None
    interests: Optional[List[str]] = []
    user_id: Optional[str] = None
    category: Optional[str] = None
    duration: Optional[str] = None


class TripUpdateRequest(BaseModel):
    destination: Optional[str] = None
    travellers: Optional[int] = None
    budget: Optional[float] = None
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    interests: Optional[List[str]] = None
    buffer_mode: Optional[str] = None
    transport_mode: Optional[str] = None


class ItineraryUpdateRequest(BaseModel):
    itinerary: List[ItineraryDay]


class ActivityAddRequest(BaseModel):
    day: int
    name: Optional[str] = None
    title: Optional[str] = None
    place_id: Optional[str] = None
    time: Optional[str] = "10:00 AM"
    start_time: Optional[str] = None
    duration: Optional[str] = "1.5h"
    note: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = "Attraction"
    subcategory: Optional[str] = None
    area: Optional[str] = None
    location: Optional[str] = None
    estimated_cost: Optional[float] = 0.0
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rating: Optional[float] = 4.5
    indoor: Optional[bool] = False
    outdoor: Optional[bool] = True
    weatherSensitive: Optional[bool] = False


class ActivityCompleteRequest(BaseModel):
    day: Optional[int] = 1
    completed: bool = True
    actual_time: Optional[str] = None


class ReplanRequest(BaseModel):
    day: int = 1
    reason: Optional[str] = "Rain expected at 3 PM"
    user_location: Optional[Dict[str, float]] = None


class WeatherAlertSimulateRequest(BaseModel):
    day: Optional[int] = 1
    severity: Optional[str] = "critical"
    condition: Optional[str] = "Heavy Rain"
    reason: Optional[str] = None
    user_location: Optional[Dict[str, float]] = None


class AcceptReplanRequest(BaseModel):
    day_number: Optional[int] = 1
    alternative_id: Optional[str] = None
    proposed_day: Optional[Dict[str, Any]] = None
    moved_to_next_day: Optional[Dict[str, Any]] = None


class RouteOptimizeRequest(BaseModel):
    day: int = 1
    start_lat: Optional[float] = None
    start_lon: Optional[float] = None


class ApplyOptimizedRouteRequest(BaseModel):
    day: int = 1
    optimized_items: Optional[List[Dict[str, Any]]] = None


class AiChatRequest(BaseModel):
    message: str
    trip_id: Optional[str] = None
    active_day: Optional[int] = 1
    user_location: Optional[Dict[str, float]] = None
    last_recommended_places: Optional[List[Dict[str, Any]]] = None


class QuickPlanRequest(BaseModel):
    trip_id: Optional[str] = None
    day: int = 1
    available_minutes: int = 120
    user_location: Optional[Dict[str, float]] = None
    transport_mode: Optional[str] = "cab"
    start_time: Optional[str] = None
    replace_activity_id: Optional[str] = None


class ApplyQuickPlanRequest(BaseModel):
    day: int = 1
    mode: str = "append"  # "append" or "replace"
    replace_activity_id: Optional[str] = None
    activities: List[Dict[str, Any]] = []


class SimulateTripRequest(BaseModel):
    trip_id: Optional[str] = None
    day: int = 1
    scenario_type: str = "rain"  # rain, less_time, budget_decrease, activity_unavailable, add_destination, traffic_increase, skip_activity
    parameters: Optional[Dict[str, Any]] = {}
    user_location: Optional[Dict[str, float]] = None


class ApplySimulationRequest(BaseModel):
    day: int = 1
    simulated_day: Optional[Dict[str, Any]] = None
    simulated_itinerary: Optional[List[Dict[str, Any]]] = None
    moved_to_next_day: Optional[Dict[str, Any]] = None
    updated_budget: Optional[float] = None

