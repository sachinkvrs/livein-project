import math
import uuid
import re
import copy
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple

from geocoding import haversine_distance, calculate_route
from recommendation.recommender import rec_data, calculate_score


# ============================================================
# TIME PARSING & PLANNED VS ACTUAL HELPERS
# ============================================================

def parse_time_to_minutes(time_str: Optional[str]) -> int:
    """Converts '09:00 AM', '02:30 PM', or '14:30' to minutes since midnight."""
    if not time_str or not isinstance(time_str, str):
        return 9 * 60  # default 9:00 AM
    clean = time_str.strip().upper()
    try:
        # Try 12-hour format
        for fmt in ("%I:%M %p", "%I:%M%p", "%I %p", "%H:%M"):
            try:
                dt = datetime.strptime(clean, fmt)
                return dt.hour * 60 + dt.minute
            except ValueError:
                pass
    except Exception:
        pass
    return 9 * 60


def minutes_to_time_str(minutes: int) -> str:
    """Converts minutes since midnight to '09:30 AM' format."""
    minutes = max(0, min(23 * 60 + 59, int(minutes)))
    h24 = minutes // 60
    m = minutes % 60
    period = "AM" if h24 < 12 else "PM"
    h12 = h24 % 12
    if h12 == 0:
        h12 = 12
    return f"{h12:02d}:{m:02d} {period}"


def parse_duration_hours(duration_str: Optional[str]) -> float:
    """Extracts hours float from '1.5h', '2.0h', '90 min', etc."""
    if duration_str is None:
        return 1.5
    if isinstance(duration_str, (int, float)):
        return float(duration_str)
    s = str(duration_str).strip().lower()
    m_min = re.search(r"(\d+(?:\.\d+)?)\s*m", s)
    if m_min:
        return round(float(m_min.group(1)) / 60.0, 2)
    m_hr = re.search(r"(\d+(?:\.\d+)?)", s)
    if m_hr:
        return float(m_hr.group(1))
    return 1.5


def format_deviation(diff_minutes: int) -> str:
    """Formats minute difference into human-readable string like '+1 hour 20 minutes' or '-15 minutes'."""
    if abs(diff_minutes) <= 5:
        return "On time"
    sign = "+" if diff_minutes > 0 else "-"
    abs_m = abs(int(diff_minutes))
    hours = abs_m // 60
    mins = abs_m % 60
    parts = []
    if hours > 0:
        parts.append(f"{hours} hour{'s' if hours != 1 else ''}")
    if mins > 0:
        parts.append(f"{mins} minute{'s' if mins != 1 else ''}")
    return f"{sign}{' '.join(parts)}"


# Typical opening/closing windows (in minutes from midnight) by category
CATEGORY_HOURS: Dict[str, Tuple[int, int]] = {
    "beach": (5 * 60, 19 * 60 + 30),          # 5:00 AM - 7:30 PM
    "heritage": (6 * 60, 20 * 60),             # 6:00 AM - 8:00 PM
    "religious": (6 * 60, 21 * 60),            # 6:00 AM - 9:00 PM
    "culture": (9 * 60, 17 * 60 + 30),         # 9:00 AM - 5:30 PM
    "museum": (9 * 60 + 30, 17 * 60),          # 9:30 AM - 5:00 PM
    "museum & science": (9 * 60 + 30, 17 * 60),
    "history": (9 * 60, 17 * 60 + 30),         # 9:00 AM - 5:30 PM
    "wildlife": (8 * 60 + 30, 17 * 60),        # 8:30 AM - 5:00 PM
    "nature": (6 * 60, 18 * 60 + 30),          # 6:00 AM - 6:30 PM
    "nature & parks": (6 * 60, 18 * 60 + 30),
    "adventure": (8 * 60, 18 * 60),            # 8:00 AM - 6:00 PM
    "shopping": (10 * 60, 21 * 60 + 30),       # 10:00 AM - 9:30 PM
    "food": (7 * 60, 23 * 60),                 # 7:00 AM - 11:00 PM
}


def get_opening_hours_info(category: Optional[str], planned_time_str: Optional[str]) -> Dict[str, Any]:
    cat_key = (category or "attraction").strip().lower()
    open_min, close_min = CATEGORY_HOURS.get(cat_key, (8 * 60, 20 * 60))
    planned_min = parse_time_to_minutes(planned_time_str)
    is_open = open_min <= planned_min <= (close_min - 45)
    return {
        "opens_at": minutes_to_time_str(open_min),
        "closes_at": minutes_to_time_str(close_min),
        "is_open_at_planned_time": is_open,
    }


# ============================================================
# 4. TRIP HEALTH SCORE ENGINE
# ============================================================

def compute_trip_health_score(
    trip: Dict[str, Any],
    weather_data: Optional[Dict[str, Any]] = None,
    user_location: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Calculates a dynamic Trip Health Score (0-100) from real trip conditions:
    1. Budget Status (25 pts)
    2. Weather & Outdoor Exposure (25 pts)
    3. Schedule Feasibility & Delays (25 pts)
    4. Route & Traffic Efficiency (25 pts)
    """
    itinerary = trip.get("itinerary", [])
    budget = float(trip.get("budget") or trip.get("tripBudget") or 50000.0)
    spent = float(trip.get("spent") or 0.0)
    active_alert = trip.get("active_alert")

    # 1. Budget Subscore (0-25)
    pred = compute_predictive_budget(trip)
    projected_total = pred["projected_total_spend"]
    budget_ratio = spent / budget if budget > 0 else 0.0
    projected_ratio = projected_total / budget if budget > 0 else 0.0

    if budget_ratio > 1.0:
        budget_pts = max(5, int(25 - (budget_ratio - 1.0) * 40))
        budget_status = "Over Budget"
        budget_level = "critical"
        budget_detail = f"Spent ₹{spent:,.0f} of ₹{budget:,.0f} ({int(budget_ratio * 100)}%)"
    elif budget_ratio >= 0.85 or projected_ratio > 1.05:
        budget_pts = 16
        budget_status = "Tight"
        budget_level = "warning"
        budget_detail = f"{int(budget_ratio * 100)}% used · Projected ₹{projected_total:,.0f}"
    else:
        budget_pts = 25
        budget_status = "Good"
        budget_level = "good"
        budget_detail = f"{int(budget_ratio * 100)}% used · ₹{max(0.0, budget - spent):,.0f} remaining"

    # 2. Weather Subscore (0-25)
    rain_prob = int((weather_data or {}).get("rain_probability", 15))
    condition = (weather_data or {}).get("condition", "Clear Sky")
    temp_c = (weather_data or {}).get("temperature") or (weather_data or {}).get("tempC") or 28

    uncompleted_outdoor = sum(
        1
        for d in itinerary
        for item in d.get("items", [])
        if not item.get("completed") and (item.get("weatherSensitive") or item.get("outdoor"))
    )

    if active_alert:
        weather_pts = 8
        weather_status = "Alert Active"
        weather_level = "critical"
        weather_detail = f"{active_alert.get('title', 'Weather Warning')} · {uncompleted_outdoor} outdoor stops affected"
    elif rain_prob >= 60 and uncompleted_outdoor > 0:
        weather_pts = 14
        weather_status = "Rain Risk"
        weather_level = "warning"
        weather_detail = f"{rain_prob}% rain chance · {uncompleted_outdoor} outdoor activities"
    elif rain_prob >= 40:
        weather_pts = 20
        weather_status = "Moderate"
        weather_level = "good"
        weather_detail = f"{temp_c}°C, {condition} ({rain_prob}% rain)"
    else:
        weather_pts = 25
        weather_status = "Good"
        weather_level = "good"
        weather_detail = f"{temp_c}°C, {condition} ({rain_prob}% rain)"

    # 3. Schedule Feasibility Subscore (0-25)
    max_day_hours = 0.0
    delayed_count = 0
    total_items = 0
    completed_items = 0

    for d in itinerary:
        items = d.get("items", [])
        day_act_hours = sum(parse_duration_hours(i.get("duration")) for i in items)
        day_transit_hours = float(d.get("estimated_time_min") or 0) / 60.0
        max_day_hours = max(max_day_hours, day_act_hours + day_transit_hours)
        for i in items:
            total_items += 1
            if i.get("completed"):
                completed_items += 1
            if abs(int(i.get("deviation_minutes") or 0)) > 45:
                delayed_count += 1

    if max_day_hours > 10.5 or delayed_count >= 2:
        schedule_pts = 13
        schedule_status = "Overpacked / Delayed"
        schedule_level = "critical"
        schedule_detail = f"Peak day {max_day_hours:.1f}h total · {delayed_count} delayed stops"
    elif max_day_hours > 8.0 or delayed_count == 1:
        schedule_pts = 19
        schedule_status = "Tight"
        schedule_level = "warning"
        schedule_detail = f"Up to {max_day_hours:.1f}h/day including transit"
    else:
        schedule_pts = 24 if total_items > 0 else 25
        schedule_status = "Good"
        schedule_level = "good"
        schedule_detail = f"Balanced pace ({max_day_hours:.1f}h max/day · {completed_items}/{total_items} done)"

    # 4. Route & Traffic Subscore (0-25)
    max_day_km = max([float(d.get("distance_km") or 0.0) for d in itinerary], default=0.0)
    total_km = sum(float(d.get("distance_km") or 0.0) for d in itinerary)
    current_hour = datetime.now().hour
    is_peak_traffic = current_hour in (8, 9, 10, 17, 18, 19, 20)

    if max_day_km > 60.0:
        traffic_pts = 14
        traffic_status = "High Transit"
        traffic_level = "critical"
        traffic_detail = f"{max_day_km:.1f} km peak daily travel"
    elif max_day_km > 35.0 or (is_peak_traffic and max_day_km > 20.0):
        traffic_pts = 19
        traffic_status = "Moderate"
        traffic_level = "warning"
        traffic_detail = f"{total_km:.1f} km total route ({max_day_km:.1f} km max/day)"
    else:
        traffic_pts = 24
        traffic_status = "Good"
        traffic_level = "good"
        traffic_detail = f"Compact route ({total_km:.1f} km total)"

    total_score = max(0, min(100, budget_pts + weather_pts + schedule_pts + traffic_pts))

    if total_score >= 80:
        overall_label = "Healthy"
        overall_tone = "success"
    elif total_score >= 60:
        overall_label = "Needs Attention"
        overall_tone = "warning"
    else:
        overall_label = "Action Needed"
        overall_tone = "danger"

    return {
        "score": total_score,
        "max_score": 100,
        "overall_label": overall_label,
        "overall_tone": overall_tone,
        "indicators": [
            {
                "key": "budget",
                "label": "Budget",
                "status": budget_status,
                "level": budget_level,
                "score": budget_pts,
                "max_score": 25,
                "detail": budget_detail,
            },
            {
                "key": "weather",
                "label": "Weather",
                "status": weather_status,
                "level": weather_level,
                "score": weather_pts,
                "max_score": 25,
                "detail": weather_detail,
            },
            {
                "key": "schedule",
                "label": "Schedule",
                "status": schedule_status,
                "level": schedule_level,
                "score": schedule_pts,
                "max_score": 25,
                "detail": schedule_detail,
            },
            {
                "key": "traffic",
                "label": "Traffic & Route",
                "status": traffic_status,
                "level": traffic_level,
                "score": traffic_pts,
                "max_score": 25,
                "detail": traffic_detail,
            },
        ],
    }


# ============================================================
# 5. PREDICTIVE BUDGET ENGINE
# ============================================================

def compute_predictive_budget(trip: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculates actual vs predicted remaining expenses based on:
    - Remaining uncompleted activities and their estimated_cost
    - Remaining route distance_km and local transport cost per km
    - Remaining days and estimated food/incidentals based on budget level or historical spend
    """
    total_budget = float(trip.get("budget") or trip.get("tripBudget") or 50000.0)
    expenses = trip.get("expenses", [])
    actual_spent = round(sum(float(e.get("amount", 0.0)) for e in expenses), 2)
    remaining_budget = round(total_budget - actual_spent, 2)

    itinerary = trip.get("itinerary", [])
    travellers = max(1, int(trip.get("travellers") or 1))
    budget_level = (trip.get("budget_level") or trip.get("budgetLevel") or "Moderate").strip().title()

    # 1. Upcoming uncompleted activity ticket/entry costs
    upcoming_activity_cost = 0.0
    remaining_distance_km = 0.0
    uncompleted_days_count = 0

    for day_obj in itinerary:
        items = day_obj.get("items", [])
        uncompleted_items = [i for i in items if not i.get("completed")]
        if uncompleted_items:
            uncompleted_days_count += 1
            for item in uncompleted_items:
                item_cost = float(item.get("estimated_cost") or 0.0)
                upcoming_activity_cost += item_cost
            # Proportional remaining distance for the day
            ratio = len(uncompleted_items) / max(1, len(items))
            remaining_distance_km += float(day_obj.get("distance_km") or 0.0) * ratio

    # 2. Estimated remaining transport cost (₹18/km for local cab/auto)
    transport_rate_per_km = 18.0
    estimated_transport_cost = round(remaining_distance_km * transport_rate_per_km, 2)

    # 3. Estimated food & daily incidentals for remaining active days
    food_expenses = [float(e.get("amount", 0)) for e in expenses if e.get("category") == "Food"]
    daily_food_base = {
        "Budget": 450.0,
        "Moderate": 800.0,
        "High": 1500.0,
        "Premium": 2500.0,
        "Luxury": 3000.0,
    }.get(budget_level, 750.0)

    # Blend historical food spend if available
    if food_expenses:
        avg_food_tx = sum(food_expenses) / len(food_expenses)
        daily_food_estimate = round((daily_food_base + avg_food_tx * 1.5) / 2.0, 2)
    else:
        daily_food_estimate = daily_food_base

    # Check how many food expenses already logged compared to total days
    total_days = max(1, len(itinerary))
    days_remaining_for_meals = max(0, uncompleted_days_count - (1 if len(food_expenses) >= total_days else 0))
    estimated_food_cost = round(days_remaining_for_meals * daily_food_estimate, 2)

    estimated_remaining_spend = round(
        upcoming_activity_cost + estimated_transport_cost + estimated_food_cost,
        2,
    )
    projected_total_spend = round(actual_spent + estimated_remaining_spend, 2)
    raw_diff = round(total_budget - projected_total_spend, 2)
    expected_saving = round(max(0.0, raw_diff), 2)
    expected_overspending = round(max(0.0, -raw_diff), 2)

    status = "On Track" if raw_diff >= 0 else "Over Budget"

    return {
        "total_budget": total_budget,
        "spent": actual_spent,
        "remaining": remaining_budget,
        "estimated_remaining_spend": estimated_remaining_spend,
        "projected_total_spend": projected_total_spend,
        "expected_saving": expected_saving,
        "expected_overspending": expected_overspending,
        "net_difference": raw_diff,
        "status": status,
        "travellers": travellers,
        "breakdown": {
            "upcoming_activities_cost": round(upcoming_activity_cost, 2),
            "estimated_transport_cost": estimated_transport_cost,
            "estimated_food_cost": estimated_food_cost,
            "estimated_food_and_daily_cost": estimated_food_cost,
            "remaining_distance_km": round(remaining_distance_km, 1),
            "uncompleted_days": uncompleted_days_count,
        },
    }


# ============================================================
# 6. ROUTE EFFICIENCY OPTIMIZER (NEAREST-NEIGHBOR + 2-OPT TSP)
# ============================================================

def _path_distance_km(coords: List[Tuple[float, float]]) -> float:
    if len(coords) < 2:
        return 0.0
    total = 0.0
    for i in range(len(coords) - 1):
        total += haversine_distance(coords[i][0], coords[i][1], coords[i + 1][0], coords[i + 1][1])
    return total


def _solve_tsp_order(items: List[Dict[str, Any]], start_coord: Optional[Tuple[float, float]] = None) -> List[Dict[str, Any]]:
    """
    Orders activities to minimize total travel distance and eliminate backtracking.
    Preserves already-completed activities in their completed slots at the start,
    and optimizes all remaining uncompleted activities using Nearest-Neighbor + 2-opt.
    """
    if len(items) <= 2:
        return list(items)

    completed = [i for i in items if i.get("completed")]
    uncompleted = [i for i in items if not i.get("completed")]

    if len(uncompleted) <= 1:
        return completed + uncompleted

    # Determine starting anchor coordinate
    anchor = start_coord
    if not anchor and completed:
        last_c = completed[-1]
        if last_c.get("latitude") is not None and last_c.get("longitude") is not None:
            anchor = (float(last_c["latitude"]), float(last_c["longitude"]))

    # Try every possible starting node if no fixed anchor, or nearest to anchor
    best_order = list(uncompleted)
    best_dist = float("inf")

    candidates_start_indices = range(len(uncompleted))
    if anchor:
        # Sort by proximity to anchor and test top 2 starts
        dists_to_anchor = [
            (
                idx,
                haversine_distance(
                    anchor[0],
                    anchor[1],
                    float(item.get("latitude") or 13.0827),
                    float(item.get("longitude") or 80.2707),
                ),
            )
            for idx, item in enumerate(uncompleted)
        ]
        dists_to_anchor.sort(key=lambda x: x[1])
        candidates_start_indices = [dists_to_anchor[0][0]]

    for start_idx in candidates_start_indices:
        remaining = list(uncompleted)
        current = remaining.pop(start_idx)
        route = [current]

        while remaining:
            cur_lat = float(current.get("latitude") or 13.0827)
            cur_lon = float(current.get("longitude") or 80.2707)
            next_idx = min(
                range(len(remaining)),
                key=lambda i: haversine_distance(
                    cur_lat,
                    cur_lon,
                    float(remaining[i].get("latitude") or 13.0827),
                    float(remaining[i].get("longitude") or 80.2707),
                ),
            )
            current = remaining.pop(next_idx)
            route.append(current)

        # 2-opt refinement
        improved = True
        while improved:
            improved = False
            for i in range(len(route) - 1):
                for j in range(i + 2, len(route)):
                    new_route = route[:i + 1] + list(reversed(route[i + 1:j + 1])) + route[j + 1:]
                    pts_old = [(float(x.get("latitude") or 0), float(x.get("longitude") or 0)) for x in route]
                    pts_new = [(float(x.get("latitude") or 0), float(x.get("longitude") or 0)) for x in new_route]
                    if anchor:
                        pts_old = [anchor] + pts_old
                        pts_new = [anchor] + pts_new
                    if _path_distance_km(pts_new) + 0.01 < _path_distance_km(pts_old):
                        route = new_route
                        improved = True

        pts_candidate = [(float(x.get("latitude") or 0), float(x.get("longitude") or 0)) for x in route]
        if anchor:
            pts_candidate = [anchor] + pts_candidate
        cand_dist = _path_distance_km(pts_candidate)
        if cand_dist < best_dist:
            best_dist = cand_dist
            best_order = route

    return completed + best_order


async def optimize_day_route(
    day_data: Dict[str, Any],
    start_lat: Optional[float] = None,
    start_lon: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Analyzes a day's itinerary and computes the optimal ordering of activities.
    Returns Before vs Optimized comparison without mutating storage until approved.
    """
    items = day_data.get("items", [])
    if len(items) < 2:
        dist = float(day_data.get("distance_km") or 0.0)
        t_min = int(day_data.get("estimated_time_min") or 0)
        return {
            "day": day_data.get("day", 1),
            "already_optimal": True,
            "before_km": dist,
            "optimized_km": dist,
            "saved_km": 0.0,
            "estimated_time_saved_min": 0,
            "before_distance_km": dist,
            "optimized_distance_km": dist,
            "distance_saved_km": 0.0,
            "before_time_min": t_min,
            "optimized_time_min": t_min,
            "time_saved_min": 0,
            "before_items": items,
            "optimized_items": items,
            "optimized_route_geometry": day_data.get("route_geometry", []),
            "explanation": "Fewer than 2 locations on this day — route is already optimal.",
        }

    before_coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in items
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    before_route = await calculate_route(before_coords)
    before_dist = float(before_route.get("distance_km") or day_data.get("distance_km") or 0.0)
    before_time = int(before_route.get("duration_min") or day_data.get("estimated_time_min") or 0)

    anchor = (start_lat, start_lon) if (start_lat is not None and start_lon is not None) else None
    reordered_raw = _solve_tsp_order(items, start_coord=anchor)

    # Preserve original time slots in sequence so times remain chronological
    original_times = [i.get("time", "09:00 AM") for i in items]
    optimized_items = []
    for idx, item in enumerate(reordered_raw):
        copied = dict(item)
        if idx < len(original_times):
            copied["time"] = original_times[idx]
        optimized_items.append(copied)

    opt_coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in optimized_items
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    opt_route = await calculate_route(opt_coords)
    opt_dist = float(opt_route.get("distance_km") or 0.0)
    opt_time = int(opt_route.get("duration_min") or 0)

    # Ensure if optimized order is identical or no better, keep original
    same_order = [i.get("id") for i in items] == [i.get("id") for i in optimized_items]
    if same_order or opt_dist >= before_dist:
        return {
            "day": day_data.get("day", 1),
            "already_optimal": True,
            "before_km": before_dist,
            "optimized_km": before_dist,
            "saved_km": 0.0,
            "estimated_time_saved_min": 0,
            "before_distance_km": before_dist,
            "optimized_distance_km": before_dist,
            "distance_saved_km": 0.0,
            "before_time_min": before_time,
            "optimized_time_min": before_time,
            "time_saved_min": 0,
            "before_items": items,
            "optimized_items": items,
            "optimized_route_geometry": before_route.get("geometry", []),
            "explanation": "Your current activity sequence already follows the shortest geographical path with no backtracking.",
        }

    saved_km = round(max(0.0, before_dist - opt_dist), 1)
    saved_min = max(1, before_time - opt_time)

    return {
        "day": day_data.get("day", 1),
        "already_optimal": False,
        "before_km": before_dist,
        "optimized_km": opt_dist,
        "saved_km": saved_km,
        "estimated_time_saved_min": saved_min,
        "before_distance_km": before_dist,
        "optimized_distance_km": opt_dist,
        "distance_saved_km": saved_km,
        "before_time_min": before_time,
        "optimized_time_min": opt_time,
        "time_saved_min": saved_min,
        "before_items": items,
        "optimized_items": optimized_items,
        "optimized_route_geometry": opt_route.get("geometry", []),
        "explanation": f"Reordered {len(items)} stops geographically to eliminate backtracking, saving {saved_km} km and ~{saved_min} minutes of travel.",
    }


# ============================================================
# 1. SMART REPLANNING 2.0 ENGINE
# ============================================================

async def generate_smart_replan_alternatives(
    trip: Dict[str, Any],
    day_number: int = 1,
    reason: str = "Rain expected at 3 PM",
    weather_data: Optional[Dict[str, Any]] = None,
    user_location: Optional[Dict[str, float]] = None,
    learned_preferences: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Smart Replanning 2.0:
    Considers:
    - Current user location
    - Remaining trip time & activity duration
    - Travel distance & estimated travel time
    - Current weather & forecast
    - Remaining budget
    - Activity opening/closing hours
    - Completed activities (never overwrites completed activities)
    - User interests & learned preferences
    - Next day capacity (moves high-value outdoor activity to tomorrow if possible)
    Returns detailed diff (what changed, why, original, replacement, time/cost/distance impact)
    and alternative plans for user approval.
    """
    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == day_number), itinerary[0] if itinerary else None)
    if not target_day:
        return {"error": f"Day {day_number} not found"}

    next_day = next((d for d in itinerary if d.get("day") == day_number + 1), None)
    destination = trip.get("destination", "Chennai")
    interests = trip.get("interests", [])
    budget_total = float(trip.get("budget") or trip.get("tripBudget") or 50000.0)
    spent = float(trip.get("spent") or 0.0)
    remaining_budget = max(0.0, budget_total - spent)

    orig_items = target_day.get("items", [])
    orig_coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in orig_items
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    orig_route = await calculate_route(orig_coords)
    orig_dist_km = float(orig_route.get("distance_km") or target_day.get("distance_km") or 0.0)
    orig_time_min = int(orig_route.get("duration_min") or target_day.get("estimated_time_min") or 0)
    orig_cost = sum(float(i.get("estimated_cost") or 0.0) for i in orig_items)

    # Candidate indoor places from dataset
    existing_titles = {
        str(i.get("title") or i.get("name", "")).strip().lower()
        for d in itinerary
        for i in d.get("items", [])
    }
    indoor_df = rec_data[rec_data["indoor"] == 1].copy()
    indoor_df = indoor_df[~indoor_df["place_name"].astype(str).str.strip().str.lower().isin(existing_titles)]
    if indoor_df.empty:
        indoor_df = rec_data.copy()

    # Score indoor candidates considering user interests, budget, and proximity
    ref_lat = (user_location or {}).get("lat") or (orig_items[0].get("latitude") if orig_items else 13.0827) or 13.0827
    ref_lon = (user_location or {}).get("lon") or (orig_items[0].get("longitude") if orig_items else 80.2707) or 80.2707

    def _score_candidate(row):
        base = calculate_score(row, interests=interests, budget=trip.get("budget_level", "Moderate"), use_travel=False)
        plat = float(row.get("latitude_seed") or 13.0827)
        plon = float(row.get("longitude_seed") or 80.2707)
        dist = haversine_distance(float(ref_lat), float(ref_lon), plat, plon)
        prox_bonus = max(0.0, 15.0 - dist * 0.8)
        cost = float(row.get("estimated_cost_inr") or 0.0)
        budget_ok = 5.0 if cost <= remaining_budget else -20.0
        return round(base + prox_bonus + budget_ok, 2)

    indoor_df["smart_score"] = indoor_df.apply(_score_candidate, axis=1)
    indoor_df = indoor_df.sort_values(by=["smart_score", "rating_seed"], ascending=[False, False])
    indoor_pool = indoor_df.to_dict(orient="records")

    # Build Option 1: Smart Weather-Safe Replan (with next-day move + route optimization)
    pool_idx = 0
    new_items_opt1 = []
    changes_opt1 = []
    moved_to_tomorrow_item = None

    for idx, item in enumerate(orig_items):
        # 1. Keep completed activities untouched
        if item.get("completed"):
            new_items_opt1.append(dict(item))
            changes_opt1.append({
                "type": "kept_completed",
                "original_activity": item,
                "replacement_activity": item,
                "what_changed": f"Kept '{item.get('title')}' (Already completed)",
                "why_changed": "Activity was already completed prior to disruption.",
                "time_impact_min": 0,
                "cost_impact_inr": 0.0,
                "distance_impact_km": 0.0,
            })
            continue

        is_vulnerable = bool(item.get("weatherSensitive") or item.get("outdoor", True)) and not bool(item.get("indoor", False))

        if is_vulnerable and pool_idx < len(indoor_pool):
            alt = indoor_pool[pool_idx]
            pool_idx += 1

            alt_lat = float(alt.get("latitude_seed") or 13.0827)
            alt_lon = float(alt.get("longitude_seed") or 80.2707)
            alt_cost = float(alt.get("estimated_cost_inr") or 0.0)
            alt_dur = f"{float(alt.get('duration_hours', 1.5)):.1f}h"
            alt_cat = str(alt.get("category", "Culture"))
            hours_info = get_opening_hours_info(alt_cat, item.get("time", "02:30 PM"))

            replacement = {
                "id": f"act-replan-{uuid.uuid4().hex[:6]}",
                "place_id": str(alt.get("place_id", "")),
                "title": str(alt.get("place_name", "Indoor Museum")),
                "name": str(alt.get("place_name", "Indoor Museum")),
                "time": item.get("time", "02:30 PM"),
                "duration": alt_dur,
                "note": f"Smart Replan: Sheltered indoor alternative ({hours_info['opens_at']}–{hours_info['closes_at']}). {alt.get('description', '')}",
                "category": alt_cat,
                "subcategory": str(alt.get("subcategory", "")),
                "area": str(alt.get("area", destination)),
                "estimated_cost": alt_cost,
                "latitude": alt_lat,
                "longitude": alt_lon,
                "score": float(alt.get("smart_score", 92.0)),
                "rating": float(alt.get("rating_seed", 4.6)),
                "indoor": True,
                "outdoor": False,
                "weatherSensitive": False,
                "completed": False,
                "replanned_from": item.get("title"),
            }

            # Check if we can also reschedule the first outdoor activity to tomorrow
            rescheduled_note = ""
            if next_day is not None and moved_to_tomorrow_item is None:
                moved_to_tomorrow_item = dict(item)
                moved_to_tomorrow_item["time"] = "09:30 AM"
                moved_to_tomorrow_item["note"] = f"Moved from Day {day_number} due to weather alert"
                rescheduled_note = f"'{item.get('title')}' moved to Day {day_number + 1} (09:30 AM); "

            orig_dur_min = int(parse_duration_hours(item.get("duration")) * 60)
            new_dur_min = int(parse_duration_hours(alt_dur) * 60)
            dist_diff = round(
                haversine_distance(float(ref_lat), float(ref_lon), alt_lat, alt_lon)
                - haversine_distance(
                    float(ref_lat),
                    float(ref_lon),
                    float(item.get("latitude") or ref_lat),
                    float(item.get("longitude") or ref_lon),
                ),
                1,
            )
            cost_diff = round(alt_cost - float(item.get("estimated_cost") or 0.0), 2)

            changes_opt1.append({
                "type": "moved_and_replaced" if rescheduled_note else "replaced",
                "original_activity": item,
                "replacement_activity": replacement,
                "moved_to_day": (day_number + 1) if rescheduled_note else None,
                "what_changed": f"{rescheduled_note}'{replacement['title']}' selected as indoor alternative at {replacement['time']}",
                "why_changed": (
                    f"{reason} — '{item.get('title')}' is an outdoor {item.get('category', 'activity')}. "
                    f"'{replacement['title']}' is indoor, matches your interests, costs ₹{alt_cost:,.0f}, "
                    f"and is open ({hours_info['opens_at']}–{hours_info['closes_at']})."
                ),
                "time_impact_min": new_dur_min - orig_dur_min,
                "cost_impact_inr": cost_diff,
                "distance_impact_km": dist_diff,
            })
            new_items_opt1.append(replacement)
        else:
            new_items_opt1.append(dict(item))

    # Optimize route order of the new items
    optimized_new_items = _solve_tsp_order(new_items_opt1, start_coord=(float(ref_lat), float(ref_lon)))
    orig_times = [i.get("time", "09:00 AM") for i in new_items_opt1]
    for idx, it in enumerate(optimized_new_items):
        if idx < len(orig_times):
            it["time"] = orig_times[idx]

    new_coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in optimized_new_items
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    new_route = await calculate_route(new_coords)
    new_dist_km = float(new_route.get("distance_km") or 0.0)
    new_time_min = int(new_route.get("duration_min") or 0)
    new_cost = sum(float(i.get("estimated_cost") or 0.0) for i in optimized_new_items)

    proposed_day_1 = {
        **target_day,
        "items": optimized_new_items,
        "distance_km": new_dist_km,
        "estimated_time_min": new_time_min,
        "route_geometry": new_route.get("geometry", []),
    }

    # Build Option 2: Budget-Saver Express Indoor Plan (keeps only free/low-cost indoor stops)
    budget_df = indoor_df[indoor_df["estimated_cost_inr"] <= 150].copy()
    if budget_df.empty:
        budget_df = indoor_df.copy()
    budget_pool = budget_df.to_dict(orient="records")
    b_idx = 0
    new_items_opt2 = []
    for item in orig_items:
        if item.get("completed"):
            new_items_opt2.append(dict(item))
        elif (item.get("weatherSensitive") or item.get("outdoor", True)) and b_idx < len(budget_pool):
            alt = budget_pool[b_idx]
            b_idx += 1
            new_items_opt2.append({
                "id": f"act-replan-b-{uuid.uuid4().hex[:6]}",
                "place_id": str(alt.get("place_id", "")),
                "title": str(alt.get("place_name", "Indoor Spot")),
                "name": str(alt.get("place_name", "Indoor Spot")),
                "time": item.get("time", "10:00 AM"),
                "duration": f"{float(alt.get('duration_hours', 1.5)):.1f}h",
                "note": f"Budget-friendly indoor alternative: {alt.get('description', '')}",
                "category": str(alt.get("category", "Culture")),
                "subcategory": str(alt.get("subcategory", "")),
                "area": str(alt.get("area", destination)),
                "estimated_cost": float(alt.get("estimated_cost_inr") or 0.0),
                "latitude": float(alt.get("latitude_seed") or 13.0827),
                "longitude": float(alt.get("longitude_seed") or 80.2707),
                "score": float(alt.get("smart_score", 88.0)),
                "rating": float(alt.get("rating_seed", 4.4)),
                "indoor": True,
                "outdoor": False,
                "weatherSensitive": False,
                "completed": False,
            })
        else:
            new_items_opt2.append(dict(item))

    opt2_coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in new_items_opt2
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    opt2_route = await calculate_route(opt2_coords)
    proposed_day_2 = {
        **target_day,
        "items": new_items_opt2,
        "distance_km": float(opt2_route.get("distance_km") or 0.0),
        "estimated_time_min": int(opt2_route.get("duration_min") or 0),
        "route_geometry": opt2_route.get("geometry", []),
    }

    time_diff_min = new_time_min - orig_time_min
    dist_diff_km = round(new_dist_km - orig_dist_km, 1)
    cost_diff_inr = round(new_cost - orig_cost, 2)

    reasons = [
        f"Disruption analyzed: {reason}",
        f"Protected {sum(1 for i in orig_items if i.get('completed'))} completed activity(s) and replaced vulnerable outdoor stops with top-rated indoor alternatives",
    ]
    if moved_to_tomorrow_item:
        reasons.append(f"Rescheduled '{moved_to_tomorrow_item.get('title')}' to Day {day_number + 1} so you don't miss it")
    if dist_diff_km <= 0:
        reasons.append(f"Optimized route saves {abs(dist_diff_km):.1f} km and {max(5, abs(time_diff_min))} minutes of travel")
    else:
        reasons.append(f"Updated indoor route covers {new_dist_km:.1f} km ({new_time_min} min transit) within your ₹{remaining_budget:,.0f} remaining budget")

    return {
        "day": day_number,
        "reason": reason,
        "original_day": target_day,
        "proposed_day": proposed_day_1,
        "moved_to_next_day": moved_to_tomorrow_item,
        "changes": changes_opt1,
        "reasons": reasons,
        "summary_metrics": {
            "original_distance_km": orig_dist_km,
            "new_distance_km": new_dist_km,
            "distance_impact_km": dist_diff_km,
            "original_time_min": orig_time_min,
            "new_time_min": new_time_min,
            "time_impact_min": time_diff_min,
            "original_cost_inr": orig_cost,
            "new_cost_inr": new_cost,
            "cost_impact_inr": cost_diff_inr,
        },
        "alternatives": [
            {
                "id": "alt-smart-indoor",
                "name": "Recommended: Smart Indoor + Next-Day Reschedule",
                "badge": "Best Match",
                "description": "Replaces rain-affected outdoor activities with top-rated indoor cultural spots, optimizes route order, and moves your top outdoor spot to tomorrow.",
                "proposed_day": proposed_day_1,
                "moved_to_next_day": moved_to_tomorrow_item,
                "changes": changes_opt1,
                "metrics": {
                    "distance_km": new_dist_km,
                    "estimated_time_min": new_time_min,
                    "total_cost_inr": new_cost,
                },
            },
            {
                "id": "alt-budget-indoor",
                "name": "Option B: Low-Cost Indoor Saver Plan",
                "badge": "Budget Friendly",
                "description": "Prioritizes free and low-entry-fee indoor museums and heritage sites to preserve your remaining trip budget.",
                "proposed_day": proposed_day_2,
                "moved_to_next_day": None,
                "changes": changes_opt1,
                "metrics": {
                    "distance_km": proposed_day_2["distance_km"],
                    "estimated_time_min": proposed_day_2["estimated_time_min"],
                    "total_cost_inr": sum(float(i.get("estimated_cost") or 0) for i in new_items_opt2),
                },
            },
        ],
    }


# ============================================================
# 8. PERSONAL TRAVEL PREFERENCE LEARNING
# ============================================================

DEFAULT_CATEGORY_SCORES = {
    "Adventure": 65,
    "Food": 80,
    "Museums & Culture": 70,
    "Nature & Parks": 75,
    "Beach": 70,
    "Heritage": 65,
    "Shopping": 50,
}


def compute_user_travel_profile(user: Dict[str, Any], user_trips: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes 'Your Travel Profile' with category affinity scores (0-100)
    learned from user's explicit preferences + actual trip behavior (selected vs skipped activities).
    """
    saved_prefs = user.get("learned_preferences") or {}
    base_scores = dict(DEFAULT_CATEGORY_SCORES)
    if isinstance(saved_prefs.get("category_scores"), dict):
        base_scores.update(saved_prefs["category_scores"])

    favs = [str(f).lower() for f in (user.get("favorite_activities") or [])]
    if "adventure" in favs:
        base_scores["Adventure"] = max(base_scores["Adventure"], 82)
    if "food" in favs:
        base_scores["Food"] = max(base_scores["Food"], 88)
    if "culture" in favs or "art" in favs:
        base_scores["Museums & Culture"] = max(base_scores["Museums & Culture"], 78)
    if "nature" in favs or "wildlife" in favs:
        base_scores["Nature & Parks"] = max(base_scores["Nature & Parks"], 85)
    if "beach" in favs:
        base_scores["Beach"] = max(base_scores["Beach"], 80)
    if "shopping" in favs:
        base_scores["Shopping"] = max(base_scores["Shopping"], 72)
    if "heritage" in favs or "history" in favs:
        base_scores["Heritage"] = max(base_scores["Heritage"], 80)

    # Observe actual trip interactions
    selected_counts: Dict[str, int] = {}
    completed_counts: Dict[str, int] = {}
    durations: List[float] = []
    daily_distances: List[float] = []

    for t in user_trips:
        for d in t.get("itinerary", []):
            if d.get("distance_km"):
                daily_distances.append(float(d["distance_km"]))
            for item in d.get("items", []):
                cat = str(item.get("category") or "Culture").strip()
                durations.append(parse_duration_hours(item.get("duration")))
                mapped_cat = _map_to_profile_category(cat)
                selected_counts[mapped_cat] = selected_counts.get(mapped_cat, 0) + 1
                if item.get("completed"):
                    completed_counts[mapped_cat] = completed_counts.get(mapped_cat, 0) + 1

    # Boost categories that the user frequently selects and completes
    for cat_name, count in selected_counts.items():
        if cat_name in base_scores:
            comp = completed_counts.get(cat_name, 0)
            boost = min(20, count * 2 + comp * 4)
            if not saved_prefs.get("manual_override"):
                base_scores[cat_name] = min(100, base_scores[cat_name] + boost)

    avg_duration = round(sum(durations) / len(durations), 1) if durations else float(saved_prefs.get("preferred_activity_duration_hours", 2.0))
    avg_distance = round(sum(daily_distances) / len(daily_distances), 1) if daily_distances else float(saved_prefs.get("preferred_travel_distance_km", 22.0))

    return {
        "category_scores": base_scores,
        "preferred_budget_range": saved_prefs.get("preferred_budget_range") or user.get("budget_preference", "Moderate"),
        "preferred_travel_distance_km": saved_prefs.get("preferred_travel_distance_km") or avg_distance,
        "preferred_activity_duration_hours": saved_prefs.get("preferred_activity_duration_hours") or avg_duration,
        "food_preferences": saved_prefs.get("food_preferences") or ["Local Specialties", "Authentic Dining"],
        "skipped_categories": saved_prefs.get("skipped_categories") or [],
        "trips_analyzed": len(user_trips),
    }


def _map_to_profile_category(cat: str) -> str:
    c = cat.lower()
    if "adventure" in c or "sport" in c:
        return "Adventure"
    if "food" in c or "dining" in c or "restaurant" in c:
        return "Food"
    if "museum" in c or "culture" in c or "science" in c or "art" in c:
        return "Museums & Culture"
    if "nature" in c or "park" in c or "wildlife" in c:
        return "Nature & Parks"
    if "beach" in c or "coast" in c:
        return "Beach"
    if "shopping" in c or "market" in c:
        return "Shopping"
    return "Heritage"


# ============================================================
# 9 & 10. TRIP ANALYTICS & PLANNED VS ACTUAL ENGINE
# ============================================================

def compute_trip_analytics(trip: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes comprehensive Trip Analytics and Planned vs Actual comparison from real trip data.
    """
    itinerary = trip.get("itinerary", [])
    original_itinerary = trip.get("original_itinerary") or itinerary
    expenses = trip.get("expenses", [])
    total_budget = float(trip.get("budget") or trip.get("tripBudget") or 50000.0)
    total_spent = round(sum(float(e.get("amount", 0.0)) for e in expenses), 2)
    remaining_budget = round(total_budget - total_spent, 2)

    all_items = [item for d in itinerary for item in d.get("items", [])]
    completed_items = [item for item in all_items if item.get("completed")]

    total_planned_count = len(all_items)
    places_visited = len(completed_items)
    completion_pct = round((places_visited / total_planned_count) * 100) if total_planned_count > 0 else 0

    total_route_distance_km = round(sum(float(d.get("distance_km") or 0.0) for d in itinerary), 1)
    # Distance travelled so far (proportional to completed activities per day, or full route if day has completions)
    distance_travelled_km = 0.0
    for d in itinerary:
        d_items = d.get("items", [])
        if not d_items:
            continue
        d_comp = sum(1 for i in d_items if i.get("completed"))
        if d_comp > 0:
            distance_travelled_km += float(d.get("distance_km") or 0.0) * (d_comp / len(d_items))
    distance_travelled_km = round(distance_travelled_km, 1)

    # Category distribution
    cat_counts: Dict[str, int] = {}
    for item in (completed_items if completed_items else all_items):
        cat = str(item.get("category") or "Attraction").strip()
        cat_counts[cat] = cat_counts.get(cat, 0) + 1

    most_visited_category = max(cat_counts.items(), key=lambda x: x[1])[0] if cat_counts else "Sightseeing"

    # Planned vs Actual Comparison
    planned_vs_actual = compute_planned_vs_actual(original_itinerary, itinerary)
    budget_usage_pct = round((total_spent / total_budget) * 100) if total_budget > 0 else 0

    return {
        "places_visited": places_visited,
        "planned_count": total_planned_count,
        "total_planned_activities": total_planned_count,
        "uncompleted_activities": max(0, total_planned_count - places_visited),
        "completion_percent": completion_pct,
        "completion_percentage": completion_pct,
        "total_planned_distance_km": total_route_distance_km,
        "total_route_distance_km": total_route_distance_km,
        "distance_travelled_km": distance_travelled_km,
        "total_spent": total_spent,
        "total_budget": total_budget,
        "remaining_budget": remaining_budget,
        "budget_usage_percent": budget_usage_pct,
        "budget_usage_percentage": budget_usage_pct,
        "planned_vs_completed": {
            "planned": total_planned_count,
            "completed": places_visited,
            "remaining": max(0, total_planned_count - places_visited),
        },
        "most_visited_category": most_visited_category,
        "category_breakdown": [
            {"category": k, "count": v}
            for k, v in sorted(cat_counts.items(), key=lambda x: x[1], reverse=True)
        ],
        "planned_vs_actual": planned_vs_actual,
    }


def compute_planned_vs_actual(
    original_itinerary: List[Dict[str, Any]],
    current_itinerary: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Tracks differences between original itinerary and actual execution without overwriting original history.
    """
    comparisons: List[Dict[str, Any]] = []

    orig_by_day = {d.get("day", 1): d.get("items", []) for d in (original_itinerary or [])}
    curr_by_day = {d.get("day", 1): d.get("items", []) for d in (current_itinerary or [])}

    all_days = sorted(set(orig_by_day.keys()) | set(curr_by_day.keys()))

    for day_num in all_days:
        orig_items = orig_by_day.get(day_num, [])
        curr_items = curr_by_day.get(day_num, [])

        max_len = max(len(orig_items), len(curr_items))
        for idx in range(max_len):
            orig = orig_items[idx] if idx < len(orig_items) else None
            curr = curr_items[idx] if idx < len(curr_items) else None

            if orig and curr:
                planned_title = orig.get("title") or orig.get("name", "Activity")
                actual_title = curr.get("title") or curr.get("name", "Activity")
                planned_time = orig.get("time", "09:00 AM")
                actual_time = curr.get("actual_time") or curr.get("time", planned_time)

                planned_min = parse_time_to_minutes(planned_time)
                actual_min = parse_time_to_minutes(actual_time)
                diff_min = int(curr.get("deviation_minutes")) if curr.get("deviation_minutes") is not None else (actual_min - planned_min)

                if planned_title.strip().lower() != actual_title.strip().lower():
                    status = "replanned"
                    deviation_str = f"Replaced with {actual_title}"
                    if diff_min != 0:
                        deviation_str += f" ({format_deviation(diff_min)})"
                elif curr.get("completed"):
                    status = "completed"
                    deviation_str = format_deviation(diff_min)
                else:
                    status = "scheduled"
                    deviation_str = format_deviation(diff_min) if diff_min != 0 else "On schedule"

                comparisons.append({
                    "day": day_num,
                    "slot_index": idx + 1,
                    "planned_title": planned_title,
                    "planned_time": planned_time,
                    "actual_title": actual_title,
                    "actual_time": actual_time,
                    "completed": bool(curr.get("completed")),
                    "status": status,
                    "deviation_minutes": diff_min,
                    "deviation_label": deviation_str,
                })
            elif curr and not orig:
                comparisons.append({
                    "day": day_num,
                    "slot_index": idx + 1,
                    "planned_title": "— (Not in original plan)",
                    "planned_time": "—",
                    "actual_title": curr.get("title") or curr.get("name", "Added Activity"),
                    "actual_time": curr.get("actual_time") or curr.get("time", "Flexible"),
                    "completed": bool(curr.get("completed")),
                    "status": "added",
                    "deviation_minutes": 0,
                    "deviation_label": "Added during trip",
                })
            elif orig and not curr:
                comparisons.append({
                    "day": day_num,
                    "slot_index": idx + 1,
                    "planned_title": orig.get("title") or orig.get("name", "Removed Activity"),
                    "planned_time": orig.get("time", "09:00 AM"),
                    "actual_title": "Skipped / Removed",
                    "actual_time": "—",
                    "completed": False,
                    "status": "skipped",
                    "deviation_minutes": 0,
                    "deviation_label": "Removed from plan",
                })

    return comparisons


# ============================================================
# 11. UNIFIED MULTI-FACTOR RECOMMENDATION SCORER
# ============================================================

def score_place_for_context(
    place: Dict[str, Any],
    anchor_lat: float,
    anchor_lon: float,
    available_minutes: int = 180,
    remaining_budget: float = 10000.0,
    interests: Optional[List[str]] = None,
    weather_is_rainy: bool = False,
    planned_time_str: str = "11:00 AM",
    existing_categories: Optional[List[str]] = None,
) -> float:
    """
    Unified Recommendation Engine Integration:
    Score = User Preference + Time Fit + Budget Fit + Distance Fit + Weather Fit
            + Availability + Route Efficiency + Current Trip State
    """
    cat = str(place.get("category") or place.get("explore_category") or "Attraction")
    subcat = str(place.get("subcategory") or "")
    title = str(place.get("title") or place.get("name") or "")
    cost = float(place.get("estimated_cost") or 0.0)
    dur_hours = parse_duration_hours(str(place.get("duration") or "1.5h"))
    dur_min = int(round(dur_hours * 60))
    rating = float(place.get("rating") or 4.5)
    p_lat = float(place.get("latitude") or anchor_lat)
    p_lon = float(place.get("longitude") or anchor_lon)

    # 1. User Preference (0 - 25 pts)
    pref_score = 12.0
    user_ints = [str(i).lower() for i in (interests or [])]
    combined_text = f"{cat} {subcat} {title}".lower()
    if user_ints:
        matches = sum(1 for u in user_ints if u in combined_text or any(w in combined_text for w in u.split()))
        if matches > 0:
            pref_score = min(25.0, 16.0 + matches * 5.0)
    pref_score += min(5.0, max(0.0, (rating - 3.8) * 4.0))

    # 2. Time Fit (0 - 20 pts)
    dist_km = haversine_distance(anchor_lat, anchor_lon, p_lat, p_lon)
    road_km = dist_km * 1.28
    one_way_min = max(4, int(round((road_km / 24.0) * 60)))
    total_needed_min = dur_min + (one_way_min * 2)
    if total_needed_min <= available_minutes:
        utilization = total_needed_min / max(30, available_minutes)
        time_score = 20.0 if 0.35 <= utilization <= 0.90 else 15.0
    else:
        overrun = total_needed_min - available_minutes
        time_score = max(0.0, 12.0 - (overrun / 10.0) * 4.0)

    # 3. Budget Fit (0 - 15 pts)
    if cost <= 0:
        budget_fit = 15.0
    elif remaining_budget <= 0:
        budget_fit = 2.0
    elif cost <= remaining_budget * 0.25:
        budget_fit = 15.0
    elif cost <= remaining_budget:
        budget_fit = 10.0
    else:
        budget_fit = 1.0

    # 4. Distance & Route Efficiency (0 - 15 pts)
    if road_km <= 3.0:
        dist_score = 15.0
    elif road_km <= 8.0:
        dist_score = 12.0
    elif road_km <= 15.0:
        dist_score = 8.0
    else:
        dist_score = max(1.0, 15.0 - road_km * 0.5)

    # 5. Weather Fit (0 - 15 pts)
    is_indoor = bool(place.get("indoor", False)) or cat.lower() in ["culture", "museum & science", "museums", "shopping", "cafes", "restaurants"]
    is_weather_sens = bool(place.get("weatherSensitive", False))
    if weather_is_rainy:
        weather_score = 15.0 if is_indoor else (2.0 if is_weather_sens else 7.0)
    else:
        weather_score = 14.0

    # 6. Availability / Opening Hours (0 - 5 pts)
    hours_info = get_opening_hours_info(cat, planned_time_str)
    avail_score = 5.0 if hours_info.get("is_open_at_planned_time", True) else 0.0

    # 7. Current Trip State / Variety Bonus (0 - 5 pts)
    existing_cats = [str(c).lower() for c in (existing_categories or [])]
    variety_score = 5.0 if cat.lower() not in existing_cats else 2.5

    return round(pref_score + time_score + budget_fit + dist_score + weather_score + avail_score + variety_score, 2)


# ============================================================
# 12. "I HAVE 2 HOURS" — QUICK TIME PLANNER ENGINE
# ============================================================

async def generate_quick_time_plan(
    trip: Dict[str, Any],
    day_number: int = 1,
    available_minutes: int = 120,
    user_location: Optional[Dict[str, float]] = None,
    weather_data: Optional[Dict[str, Any]] = None,
    transport_mode: str = "cab",
    start_time_str: Optional[str] = None,
    replace_activity_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates an optimized short mini-itinerary for a given free-time window
    (e.g. 30m, 60m, 120m, 180m, or custom minutes).
    """
    from places_service import explore_nearby_places

    raw_avail_min = int(available_minutes if available_minutes is not None else 120)
    destination = trip.get("destination", "Chennai")
    if raw_avail_min < 20:
        return {
            "trip_id": trip.get("id"),
            "day": day_number,
            "available_minutes": max(0, raw_avail_min),
            "total_minutes": 0,
            "buffer_minutes": max(0, raw_avail_min),
            "total_cost_inr": 0.0,
            "total_distance_km": 0.0,
            "insufficient_time": True,
            "message": "At least 20 minutes of free time is needed to fit travel, a quick stop, and return buffer.",
            "anchor": {
                "lat": float((user_location or {}).get("lat") or 13.0827),
                "lon": float((user_location or {}).get("lon") or 80.2707),
                "label": "Your Current Location" if user_location else f"{destination} Center",
            },
            "weather_note": "Insufficient time window for an excursion",
            "steps": [],
            "activities": [],
            "route_geometry": [],
        }

    avail_min = raw_avail_min
    interests = trip.get("interests", [])
    total_budget = float(trip.get("budget") or trip.get("tripBudget") or 50000.0)
    spent = float(trip.get("spent") or 0.0)
    remaining_budget = max(0.0, total_budget - spent)

    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == day_number), itinerary[0] if itinerary else {"day": day_number, "items": []})
    day_items = target_day.get("items", [])

    # Determine anchor coordinates (user_location -> replaced activity -> last completed -> first activity -> city default)
    anchor_lat: Optional[float] = None
    anchor_lon: Optional[float] = None
    anchor_label = f"{destination} Center"

    if user_location and user_location.get("lat") is not None and user_location.get("lon") is not None:
        anchor_lat = float(user_location["lat"])
        anchor_lon = float(user_location["lon"])
        anchor_label = "Your Current Location"
    elif replace_activity_id:
        rep_item = next((i for i in day_items if i.get("id") == replace_activity_id), None)
        if rep_item and rep_item.get("latitude") is not None:
            anchor_lat = float(rep_item["latitude"])
            anchor_lon = float(rep_item["longitude"])
            anchor_label = rep_item.get("title") or rep_item.get("name") or anchor_label

    if anchor_lat is None or anchor_lon is None:
        completed_items = [i for i in day_items if i.get("completed") and i.get("latitude") is not None]
        ref_item = completed_items[-1] if completed_items else (day_items[0] if day_items else None)
        if ref_item and ref_item.get("latitude") is not None and ref_item.get("longitude") is not None:
            anchor_lat = float(ref_item["latitude"])
            anchor_lon = float(ref_item["longitude"])
            anchor_label = ref_item.get("title") or ref_item.get("name") or anchor_label

    # Exclude places already in the trip itinerary
    existing_titles = [
        str(i.get("title") or i.get("name") or "").strip()
        for d in itinerary
        for i in d.get("items", [])
        if i.get("id") != replace_activity_id
    ]
    existing_cats = [str(i.get("category") or "") for i in day_items]

    nearby_bundle = await explore_nearby_places(
        lat=anchor_lat,
        lon=anchor_lon,
        city=destination,
        category="All",
        radius_km=20.0,
        exclude_names=existing_titles,
        limit=30,
    )
    anchor_lat = float(nearby_bundle["anchor"]["lat"])
    anchor_lon = float(nearby_bundle["anchor"]["lon"])
    candidates = nearby_bundle.get("places", [])

    rain_prob = int((weather_data or {}).get("rain_probability") or 15)
    weather_cond = str((weather_data or {}).get("condition") or "Clear").lower()
    is_rainy = rain_prob >= 60 or "rain" in weather_cond or "storm" in weather_cond

    # Determine start clock time
    if start_time_str:
        current_clock_min = parse_time_to_minutes(start_time_str)
    elif replace_activity_id:
        rep_item = next((i for i in day_items if i.get("id") == replace_activity_id), None)
        current_clock_min = parse_time_to_minutes(rep_item.get("time", "02:00 PM")) if rep_item else 14 * 60
    elif day_items:
        last_item = day_items[-1]
        last_start = parse_time_to_minutes(last_item.get("time", "02:00 PM"))
        last_dur = int(round(parse_duration_hours(last_item.get("duration", "1.5h")) * 60))
        current_clock_min = min(20 * 60, last_start + last_dur + 20)
    else:
        current_clock_min = 10 * 60

    speed_kmh = {
        "walk": 4.8,
        "bike": 15.0,
        "transit": 20.0,
        "cab": 25.0,
    }.get((transport_mode or "cab").lower(), 25.0)

    # Target buffer (at least 15-20% of available window, capped reasonably)
    desired_buffer_min = max(5, min(35, int(round(avail_min * 0.20))))
    usable_budget_min = max(10, avail_min - desired_buffer_min)

    # Score all candidates
    scored_candidates: List[Dict[str, Any]] = []
    for c in candidates:
        if c.get("explore_category") == "Emergency services":
            continue
        score = score_place_for_context(
            place=c,
            anchor_lat=anchor_lat,
            anchor_lon=anchor_lon,
            available_minutes=avail_min,
            remaining_budget=remaining_budget,
            interests=interests,
            weather_is_rainy=is_rainy,
            planned_time_str=minutes_to_time_str(current_clock_min),
            existing_categories=existing_cats,
        )
        scored_candidates.append({**c, "quick_score": score})

    scored_candidates.sort(key=lambda x: x["quick_score"], reverse=True)

    selected_stops: List[Dict[str, Any]] = []
    cur_lat, cur_lon = anchor_lat, anchor_lon
    elapsed_min = 0

    for cand in scored_candidates:
        if len(selected_stops) >= (1 if avail_min <= 70 else 2 if avail_min <= 150 else 3):
            break

        c_lat = float(cand["latitude"])
        c_lon = float(cand["longitude"])
        leg_km = max(0.3, round(haversine_distance(cur_lat, cur_lon, c_lat, c_lon) * 1.25, 1))
        leg_travel_min = max(4, int(round((leg_km / speed_kmh) * 60)))

        return_km = max(0.3, round(haversine_distance(c_lat, c_lon, anchor_lat, anchor_lon) * 1.25, 1))
        return_travel_min = max(4, int(round((return_km / speed_kmh) * 60)))

        raw_dur_min = int(round(parse_duration_hours(cand.get("duration", "1.0h")) * 60))
        # Adapt activity duration to fit the window smoothly
        if avail_min <= 45:
            visit_min = min(raw_dur_min, max(15, usable_budget_min - leg_travel_min - return_travel_min))
        elif len(selected_stops) == 0:
            max_first = int(usable_budget_min * (0.55 if avail_min >= 90 else 0.75))
            visit_min = max(25, min(raw_dur_min, max_first))
        else:
            remaining_for_stop = usable_budget_min - elapsed_min - leg_travel_min - return_travel_min
            visit_min = max(20, min(raw_dur_min, remaining_for_stop))

        # Round visit_min to nearest 5 minutes
        visit_min = max(15, int(round(visit_min / 5.0) * 5))

        if elapsed_min + leg_travel_min + visit_min + return_travel_min <= avail_min - 5:
            if cand["title"] in [s["place"]["title"] for s in selected_stops]:
                continue
            # Prefer a Cafe/Restaurant as the 2nd stop if the 1st was an Attraction/Beach/Park
            if len(selected_stops) == 1:
                first_cat = selected_stops[0]["place"].get("explore_category", "")
                cand_cat = cand.get("explore_category", "")
                if first_cat not in ("Cafes", "Restaurants") and cand_cat not in ("Cafes", "Restaurants"):
                    # Check if there is a high-scoring cafe nearby first
                    cafe_alt = next(
                        (
                            x for x in scored_candidates
                            if x.get("explore_category") in ("Cafes", "Restaurants")
                            and x["title"] not in [s["place"]["title"] for s in selected_stops]
                            and haversine_distance(cur_lat, cur_lon, float(x["latitude"]), float(x["longitude"])) <= 5.0
                        ),
                        None,
                    )
                    if cafe_alt:
                        cand = cafe_alt
                        c_lat = float(cand["latitude"])
                        c_lon = float(cand["longitude"])
                        leg_km = max(0.3, round(haversine_distance(cur_lat, cur_lon, c_lat, c_lon) * 1.25, 1))
                        leg_travel_min = max(4, int(round((leg_km / speed_kmh) * 60)))
                        return_km = max(0.3, round(haversine_distance(c_lat, c_lon, anchor_lat, anchor_lon) * 1.25, 1))
                        return_travel_min = max(4, int(round((return_km / speed_kmh) * 60)))
                        visit_min = min(45, max(25, usable_budget_min - elapsed_min - leg_travel_min - return_travel_min))
                        visit_min = int(round(visit_min / 5.0) * 5)

            selected_stops.append({
                "place": cand,
                "leg_km": leg_km,
                "leg_travel_min": leg_travel_min,
                "visit_min": visit_min,
            })
            elapsed_min += leg_travel_min + visit_min
            cur_lat, cur_lon = c_lat, c_lon

    # Fallback if available_minutes is very tight and no stop matched above
    if not selected_stops and scored_candidates:
        best = scored_candidates[0]
        c_lat, c_lon = float(best["latitude"]), float(best["longitude"])
        leg_km = max(0.3, round(haversine_distance(anchor_lat, anchor_lon, c_lat, c_lon) * 1.2, 1))
        leg_travel_min = min(max(3, avail_min // 5), max(3, int(round((leg_km / speed_kmh) * 60))))
        visit_min = max(10, avail_min - (leg_travel_min * 2) - 5)
        selected_stops.append({
            "place": best,
            "leg_km": leg_km,
            "leg_travel_min": leg_travel_min,
            "visit_min": visit_min,
        })
        cur_lat, cur_lon = c_lat, c_lon

    # Build timeline steps & insertable itinerary items
    steps: List[Dict[str, Any]] = []
    activities_to_insert: List[Dict[str, Any]] = []
    route_coords: List[Tuple[float, float]] = [(anchor_lat, anchor_lon)]
    running_clock = current_clock_min
    total_used_min = 0
    total_cost_inr = 0.0
    total_distance_km = 0.0

    for idx, stop in enumerate(selected_stops):
        place = stop["place"]
        leg_min = stop["leg_travel_min"]
        leg_km = stop["leg_km"]
        visit_min = stop["visit_min"]

        # Travel step
        steps.append({
            "type": "travel",
            "icon": "🚗" if transport_mode != "walk" else "🚶",
            "title": f"Travel to {place['title']}" if idx == 0 else "Travel",
            "duration_min": leg_min,
            "distance_km": leg_km,
            "start_time": minutes_to_time_str(running_clock),
            "end_time": minutes_to_time_str(running_clock + leg_min),
        })
        running_clock += leg_min
        total_used_min += leg_min
        total_distance_km += leg_km

        # Activity step
        act_start_str = minutes_to_time_str(running_clock)
        act_end_str = minutes_to_time_str(running_clock + visit_min)
        exp_cat = place.get("explore_category", "Attractions")
        step_icon = "☕" if exp_cat == "Cafes" else "🍽️" if exp_cat == "Restaurants" else "📍"

        steps.append({
            "type": "activity",
            "icon": step_icon,
            "title": place["title"],
            "category": place.get("category", exp_cat),
            "explore_category": exp_cat,
            "area": place.get("area", destination),
            "duration_min": visit_min,
            "estimated_cost": float(place.get("estimated_cost", 0.0)),
            "rating": float(place.get("rating", 4.5)),
            "start_time": act_start_str,
            "end_time": act_end_str,
            "latitude": float(place["latitude"]),
            "longitude": float(place["longitude"]),
        })

        dur_hours_label = f"{round(visit_min / 60.0, 1)}h" if visit_min >= 45 else f"{visit_min}m"
        activities_to_insert.append({
            "id": f"quick-{uuid.uuid4().hex[:8]}",
            "place_id": place.get("place_id"),
            "title": place["title"],
            "name": place["title"],
            "time": act_start_str,
            "duration": dur_hours_label,
            "category": place.get("category", exp_cat),
            "subcategory": place.get("subcategory", ""),
            "area": place.get("area", destination),
            "note": f"Quick Time Plan ({avail_min} min window) · {place.get('description', '')[:80]}",
            "estimated_cost": float(place.get("estimated_cost", 0.0)),
            "latitude": float(place["latitude"]),
            "longitude": float(place["longitude"]),
            "rating": float(place.get("rating", 4.5)),
            "indoor": bool(place.get("indoor", False)),
            "outdoor": bool(place.get("outdoor", True)),
            "weatherSensitive": bool(place.get("weatherSensitive", False)),
            "completed": False,
        })

        route_coords.append((float(place["latitude"]), float(place["longitude"])))
        running_clock += visit_min
        total_used_min += visit_min
        total_cost_inr += float(place.get("estimated_cost", 0.0))

    # Return step
    if selected_stops:
        ret_km = max(0.3, round(haversine_distance(cur_lat, cur_lon, anchor_lat, anchor_lon) * 1.25, 1))
        ret_min = max(4, min(avail_min - total_used_min, int(round((ret_km / speed_kmh) * 60))))
        steps.append({
            "type": "return",
            "icon": "🚶" if ret_km <= 1.2 else "🚗",
            "title": f"Return to {anchor_label}",
            "duration_min": ret_min,
            "distance_km": ret_km,
            "start_time": minutes_to_time_str(running_clock),
            "end_time": minutes_to_time_str(running_clock + ret_min),
        })
        total_used_min += ret_min
        total_distance_km += ret_km
        route_coords.append((anchor_lat, anchor_lon))

    buffer_min = max(0, avail_min - total_used_min)
    route_info = await calculate_route(route_coords)

    return {
        "trip_id": trip.get("id"),
        "day": day_number,
        "available_minutes": avail_min,
        "total_minutes": total_used_min,
        "buffer_minutes": buffer_min,
        "total_cost_inr": round(total_cost_inr, 2),
        "total_distance_km": round(total_distance_km, 1),
        "anchor": {
            "lat": anchor_lat,
            "lon": anchor_lon,
            "label": anchor_label,
        },
        "weather_note": "Indoor-prioritized due to rain risk" if is_rainy else "Optimal weather for mixed exploration",
        "steps": steps,
        "activities": activities_to_insert,
        "route_geometry": route_info.get("geometry", []),
    }


# ============================================================
# 13. TRAVEL TIME BUFFER ENGINE
# ============================================================

def compute_travel_buffers(
    trip: Dict[str, Any],
    day_number: int = 1,
    buffer_mode: str = "normal",
    transport_mode: str = "cab",
    user_location: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Calculates realistic travel time buffers for every activity in a day's itinerary:
    - Travel distance & raw travel time between consecutive stops (or user's current location)
    - Traffic multiplier & safety buffer based on buffer_mode ('relaxed', 'normal', 'safe')
    - Recommended departure time & 'Leave in X minutes' countdown
    - Schedule conflict detection when consecutive activities overlap
    """
    mode_key = (buffer_mode or trip.get("buffer_mode") or "normal").strip().lower()
    if mode_key not in ("relaxed", "normal", "safe"):
        mode_key = "normal"

    mode_config = {
        "relaxed": {"safety_buffer_min": 20, "traffic_factor": 1.25, "label": "Relaxed (+20m buffer)"},
        "normal": {"safety_buffer_min": 10, "traffic_factor": 1.15, "label": "Normal (+10m buffer)"},
        "safe": {"safety_buffer_min": 25, "traffic_factor": 1.35, "label": "Safe (+25m peak buffer)"},
    }[mode_key]

    trans_key = (transport_mode or trip.get("transport_mode") or "cab").strip().lower()
    base_speed_kmh = {
        "walk": 4.8,
        "bike": 16.0,
        "transit": 20.0,
        "cab": 26.0,
    }.get(trans_key, 26.0)

    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == day_number), itinerary[0] if itinerary else {"day": day_number, "items": []})
    items = target_day.get("items", [])

    # Reference current time for 'Leave in X minutes'
    now_dt = datetime.now()
    now_minutes = now_dt.hour * 60 + now_dt.minute

    u_lat = float(user_location["lat"]) if (user_location and user_location.get("lat") is not None) else None
    u_lon = float(user_location["lon"]) if (user_location and user_location.get("lon") is not None) else None

    activity_buffers: List[Dict[str, Any]] = []
    conflicts_count = 0
    next_up_buffer: Optional[Dict[str, Any]] = None

    for idx, item in enumerate(items):
        act_time_str = item.get("time", "09:00 AM")
        act_start_min = parse_time_to_minutes(act_time_str)
        act_dur_min = int(round(parse_duration_hours(item.get("duration", "1.5h")) * 60))
        act_end_min = act_start_min + act_dur_min

        cur_lat = float(item.get("latitude") or 13.0827)
        cur_lon = float(item.get("longitude") or 80.2707)

        # Determine origin coordinate for this leg
        if idx == 0:
            if u_lat is not None and u_lon is not None:
                from_lat, from_lon = u_lat, u_lon
                from_label = "Current Location"
            else:
                # Default hotel/starting point ~3.5 km away
                from_lat, from_lon = cur_lat - 0.022, cur_lon - 0.018
                from_label = f"{trip.get('destination', 'City')} Starting Point"
        else:
            prev = items[idx - 1]
            if not item.get("completed") and prev.get("completed") and u_lat is not None and u_lon is not None:
                from_lat, from_lon = u_lat, u_lon
                from_label = "Current Location"
            else:
                from_lat = float(prev.get("latitude") or cur_lat)
                from_lon = float(prev.get("longitude") or cur_lon)
                from_label = prev.get("title") or prev.get("name") or f"Stop {idx}"

        straight_km = haversine_distance(from_lat, from_lon, cur_lat, cur_lon)
        road_km = round(max(0.5, straight_km * 1.28), 1)
        base_travel_min = max(5, int(round((road_km / base_speed_kmh) * 60)))
        traffic_travel_min = max(5, int(round(base_travel_min * mode_config["traffic_factor"])))
        safety_buffer_min = mode_config["safety_buffer_min"]
        total_lead_min = traffic_travel_min + safety_buffer_min

        recommended_dep_min = max(0, act_start_min - total_lead_min)
        recommended_dep_str = minutes_to_time_str(recommended_dep_min)

        # Check schedule overlap with previous activity
        has_conflict = False
        conflict_detail = None
        if idx > 0:
            prev_item = items[idx - 1]
            prev_start = parse_time_to_minutes(prev_item.get("time", "09:00 AM"))
            prev_dur = int(round(parse_duration_hours(prev_item.get("duration", "1.5h")) * 60))
            prev_end = prev_start + prev_dur
            if recommended_dep_min < prev_end:
                has_conflict = True
                overlap_min = prev_end - recommended_dep_min
                conflicts_count += 1
                conflict_detail = (
                    f"Tight transition: {prev_item.get('title') or prev_item.get('name')} ends at "
                    f"{minutes_to_time_str(prev_end)}, but recommended departure is {recommended_dep_str} "
                    f"({overlap_min} min overlap)."
                )

        # Compute 'Leave in X minutes' relative to current clock (or simulated relative window)
        diff_from_now = recommended_dep_min - now_minutes
        if item.get("completed"):
            leave_in_min = 0
            leave_label = "Completed"
            urgency = "completed"
        elif diff_from_now > 180:
            leave_in_min = diff_from_now
            leave_label = f"Depart at {recommended_dep_str}"
            urgency = "scheduled"
        elif diff_from_now > 0:
            leave_in_min = diff_from_now
            leave_label = f"Leave in {diff_from_now} minutes"
            urgency = "soon" if diff_from_now <= 30 else "on_time"
        else:
            # If current clock is past the nominal time, compute relative to previous stop or show 15m ready window
            leave_in_min = 15
            leave_label = f"Leave in 15 minutes (Departs {recommended_dep_str})"
            urgency = "ready"

        entry = {
            "activity_id": item.get("id"),
            "title": item.get("title") or item.get("name"),
            "completed": bool(item.get("completed")),
            "from_label": from_label,
            "activity_time": act_time_str,
            "activity_end_time": minutes_to_time_str(act_end_min),
            "duration": item.get("duration", "1.5h"),
            "distance_km": road_km,
            "base_travel_min": base_travel_min,
            "travel_time_min": traffic_travel_min,
            "safety_buffer_min": safety_buffer_min,
            "total_buffer_lead_min": total_lead_min,
            "recommended_departure": recommended_dep_str,
            "leave_in_minutes": leave_in_min,
            "leave_status_label": leave_label,
            "urgency": urgency,
            "has_schedule_conflict": has_conflict,
            "conflict_detail": conflict_detail,
            "buffer_mode": mode_key,
            "transport_mode": trans_key,
        }
        activity_buffers.append(entry)
        if next_up_buffer is None and not item.get("completed"):
            next_up_buffer = entry

    if next_up_buffer is None and activity_buffers:
        next_up_buffer = activity_buffers[0]

    return {
        "trip_id": trip.get("id"),
        "day": day_number,
        "buffer_mode": mode_key,
        "buffer_mode_label": mode_config["label"],
        "transport_mode": trans_key,
        "safety_buffer_min": mode_config["safety_buffer_min"],
        "conflicts_count": conflicts_count,
        "next_up": next_up_buffer,
        "activities": activity_buffers,
    }


# ============================================================
# 14. TRIPNOVA DECISION CENTER ENGINE
# ============================================================

async def compute_decision_center(
    trip: Dict[str, Any],
    day_number: int = 1,
    weather_data: Optional[Dict[str, Any]] = None,
    user_location: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    TripNova Decision Center:
    Analyzes Weather, Budget, Schedule tightness, Travel time & buffers,
    Route efficiency, Opening hours, and Free-time opportunities.
    Returns overall Trip Health (0-100) + structured actionable cards with states:
    'Good' | 'Warning' | 'Critical' | 'Opportunity'
    """
    itinerary = trip.get("itinerary", [])
    target_day = next((d for d in itinerary if d.get("day") == day_number), itinerary[0] if itinerary else {"day": 1, "items": []})
    day_items = target_day.get("items", [])

    health = compute_trip_health_score(trip, weather_data)
    pred_budget = compute_predictive_budget(trip)
    buffers_info = compute_travel_buffers(trip, day_number=day_number, user_location=user_location)
    route_opt = await optimize_day_route(
        target_day,
        start_lat=user_location.get("lat") if user_location else None,
        start_lon=user_location.get("lon") if user_location else None,
    )

    decisions: List[Dict[str, Any]] = []

    # 1. WEATHER ANALYSIS
    rain_prob = int((weather_data or {}).get("rain_probability") or 15)
    condition = str((weather_data or {}).get("condition") or "Partly Cloudy")
    outdoor_upcoming = [
        i for i in day_items
        if not i.get("completed") and (i.get("weatherSensitive") or i.get("outdoor"))
    ]
    if trip.get("active_alert") or (rain_prob >= 60 and outdoor_upcoming):
        affected_name = outdoor_upcoming[0].get("title") if outdoor_upcoming else "outdoor activities"
        affected_time = outdoor_upcoming[0].get("time", "03:00 PM") if outdoor_upcoming else "03:00 PM"
        decisions.append({
            "id": "dec-weather",
            "category": "Weather",
            "state": "Critical" if trip.get("active_alert") or rain_prob >= 75 else "Warning",
            "icon_status": "🔴" if trip.get("active_alert") or rain_prob >= 75 else "🟡",
            "title": f"Rain risk at {affected_time} ({rain_prob}% chance)",
            "description": f"{affected_name} is exposed to weather. Moving outdoor stops or swapping to an indoor museum/gallery protects your schedule.",
            "impact_summary": f"{len(outdoor_upcoming)} outdoor stop(s) affected",
            "action_label": "Find Alternative",
            "action_type": "TRIGGER_SMART_REPLAN",
            "action_payload": {"day": day_number, "reason": f"Rain expected at {affected_time}"},
        })
    else:
        decisions.append({
            "id": "dec-weather",
            "category": "Weather",
            "state": "Good",
            "icon_status": "🟢",
            "title": f"Weather clear for Day {day_number} ({condition}, {rain_prob}% rain)",
            "description": "All scheduled outdoor and indoor stops have favorable weather conditions today.",
            "impact_summary": "0 weather disruptions",
            "action_label": "Simulate Rain",
            "action_type": "OPEN_SIMULATOR",
            "action_payload": {"scenario_type": "rain", "day": day_number},
        })

    # 2. ROUTE EFFICIENCY ANALYSIS
    if not route_opt.get("already_optimal") and float(route_opt.get("saved_km", 0)) >= 0.8:
        saved_km = route_opt["saved_km"]
        saved_min = route_opt["estimated_time_saved_min"]
        decisions.append({
            "id": "dec-route",
            "category": "Route",
            "state": "Opportunity",
            "icon_status": "🔵",
            "title": f"Route can save {saved_min} mins & {saved_km} km",
            "description": route_opt.get("explanation", "Reordering Day stops eliminates geographical backtracking."),
            "impact_summary": f"-{saved_min} min transit · -{saved_km} km",
            "action_label": "Optimize Route",
            "action_type": "OPTIMIZE_ROUTE",
            "action_payload": {"day": day_number, "optimization": route_opt},
        })
    else:
        decisions.append({
            "id": "dec-route",
            "category": "Route",
            "state": "Good",
            "icon_status": "🟢",
            "title": f"Day {day_number} route follows shortest path ({target_day.get('distance_km', 0)} km)",
            "description": "Your activity sequence has zero backtracking and optimal waypoint ordering.",
            "impact_summary": f"~{target_day.get('estimated_time_min', 25)} min total transit",
            "action_label": "Review Plan",
            "action_type": "NAVIGATE",
            "action_payload": {"path": f"/map?day={day_number}"},
        })

    # 3. BUDGET & PREDICTIVE SPEND ANALYSIS
    total_budget = float(pred_budget.get("total_budget") or 50000.0)
    spent = float(pred_budget.get("spent") or 0.0)
    projected = float(pred_budget.get("projected_total_spend") or spent)
    remaining = float(pred_budget.get("remaining") or (total_budget - spent))

    if projected > total_budget or remaining < total_budget * 0.12:
        over_amt = max(0.0, projected - total_budget)
        decisions.append({
            "id": "dec-budget",
            "category": "Budget",
            "state": "Critical" if remaining < 0 or over_amt > total_budget * 0.1 else "Warning",
            "icon_status": "🔴" if remaining < 0 else "🟡",
            "title": (
                f"Projected spend exceeds budget by ₹{int(over_amt):,}"
                if over_amt > 0
                else f"Budget tight — ₹{int(remaining):,} remaining"
            ),
            "description": f"Spent ₹{int(spent):,} of ₹{int(total_budget):,}. Consider lower-cost cultural/nature attractions to stay on track.",
            "impact_summary": f"Projected ₹{int(projected):,} / ₹{int(total_budget):,}",
            "action_label": "View Budget",
            "action_type": "NAVIGATE",
            "action_payload": {"path": "/expenses"},
        })
    else:
        decisions.append({
            "id": "dec-budget",
            "category": "Budget",
            "state": "Good",
            "icon_status": "🟢",
            "title": f"Budget healthy (₹{int(remaining):,} remaining)",
            "description": f"Projected total spend is ₹{int(projected):,}, leaving an estimated saving of ₹{int(pred_budget.get('expected_saving', 0)):,}.",
            "impact_summary": f"{int(round((spent / max(1, total_budget)) * 100))}% spent so far",
            "action_label": "View Budget",
            "action_type": "NAVIGATE",
            "action_payload": {"path": "/expenses"},
        })

    # 4. SCHEDULE, TRAVEL BUFFERS & OPENING HOURS ANALYSIS
    conflicts = [a for a in buffers_info.get("activities", []) if a.get("has_schedule_conflict")]
    closed_stops = []
    for item in day_items:
        if item.get("completed"):
            continue
        h_info = get_opening_hours_info(item.get("category", "Attraction"), item.get("time", "09:00 AM"))
        if not h_info.get("is_open_at_planned_time", True):
            closed_stops.append((item, h_info))

    if closed_stops:
        bad_item, h_info = closed_stops[0]
        decisions.append({
            "id": "dec-schedule",
            "category": "Schedule & Hours",
            "state": "Warning",
            "icon_status": "🟡",
            "title": f"{bad_item.get('title')} scheduled outside opening hours ({h_info['hours_label']})",
            "description": f"Planned at {bad_item.get('time')}, but {bad_item.get('category', 'venue')} operates {h_info['hours_label']}.",
            "impact_summary": "1 timing adjustment recommended",
            "action_label": "Review Plan",
            "action_type": "NAVIGATE",
            "action_payload": {"path": f"/itinerary?day={day_number}"},
        })
    elif conflicts:
        first_c = conflicts[0]
        decisions.append({
            "id": "dec-schedule",
            "category": "Schedule & Buffer",
            "state": "Warning",
            "icon_status": "🟡",
            "title": f"Tight travel buffer before {first_c.get('title')}",
            "description": first_c.get("conflict_detail") or "Travel time plus safety buffer overlaps with the previous activity.",
            "impact_summary": f"{len(conflicts)} buffer overlap(s) detected",
            "action_label": "Review Plan",
            "action_type": "OPEN_SIMULATOR",
            "action_payload": {"scenario_type": "less_time", "day": day_number},
        })
    else:
        next_up = buffers_info.get("next_up")
        next_desc = (
            f"Next up: {next_up['title']} at {next_up['activity_time']} (Recommended departure {next_up['recommended_departure']})."
            if next_up
            else "All activities for today are comfortably spaced."
        )
        decisions.append({
            "id": "dec-schedule",
            "category": "Schedule & Buffer",
            "state": "Good",
            "icon_status": "🟢",
            "title": "Schedule & departure buffers on track",
            "description": next_desc,
            "impact_summary": f"Mode: {buffers_info.get('buffer_mode_label')}",
            "action_label": "Review Plan",
            "action_type": "NAVIGATE",
            "action_payload": {"path": f"/itinerary?day={day_number}"},
        })

    # 5. FREE TIME WINDOW OPPORTUNITY ("I HAVE 2 HOURS")
    total_act_hours = sum(parse_duration_hours(i.get("duration", "1.5h")) for i in day_items if not i.get("completed"))
    free_hours_est = max(1.0, round(9.0 - total_act_hours, 1))
    free_min_est = min(180, max(60, int(round(free_hours_est * 60 / 30.0) * 30)))
    decisions.append({
        "id": "dec-opportunity",
        "category": "Quick Time Opportunity",
        "state": "Opportunity",
        "icon_status": "🔵",
        "title": f"{free_min_est} mins of flexible window available on Day {day_number}",
        "description": f"Generate an instant mini-itinerary around {trip.get('destination', 'your location')} with travel & buffer included.",
        "impact_summary": f"Fits 1–2 nearby spots + buffer",
        "action_label": "Open Quick Planner",
        "action_type": "OPEN_QUICK_PLANNER",
        "action_payload": {"available_minutes": free_min_est, "day": day_number},
    })

    attention_items = [d for d in decisions if d["state"] in ("Warning", "Critical", "Opportunity")]

    return {
        "trip_id": trip.get("id"),
        "day": day_number,
        "health_score": health.get("score", 92),
        "health_label": health.get("overall_label", "Healthy"),
        "health_tone": health.get("overall_tone", "success"),
        "attention_count": len([d for d in decisions if d["state"] in ("Warning", "Critical")]),
        "opportunity_count": len([d for d in decisions if d["state"] == "Opportunity"]),
        "summary_banner": (
            f"Trip Health: {health.get('score', 92)}/100 · "
            f"{len([d for d in decisions if d['state'] in ('Warning', 'Critical')])} item(s) need attention, "
            f"{len([d for d in decisions if d['state'] == 'Opportunity'])} optimization opportunity"
        ),
        "decisions": decisions,
        "travel_buffers": buffers_info,
        "predictive_budget": pred_budget,
    }


# ============================================================
# 15. "WHAT IF?" TRIP SIMULATOR ENGINE
# ============================================================

async def simulate_what_if_scenario(
    trip: Dict[str, Any],
    day_number: int = 1,
    scenario_type: str = "rain",
    parameters: Optional[Dict[str, Any]] = None,
    user_location: Optional[Dict[str, float]] = None,
    weather_data: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Simulates a hypothetical 'What If?' scenario on a copy of the trip without modifying stored state:
    Supported scenarios:
    1. 'rain'                  -> What if it rains tomorrow/today?
    2. 'less_time'             -> What if I have less time?
    3. 'budget_decrease'       -> What if my budget decreases?
    4. 'activity_unavailable'  -> What if an activity becomes unavailable?
    5. 'add_destination'       -> What if I want to add another destination?
    6. 'traffic_increase'      -> What if traffic increases?
    7. 'skip_activity'         -> What if I skip this activity?
    """
    from places_service import explore_nearby_places

    params = parameters or {}
    scen = (scenario_type or "rain").strip().lower()
    itinerary = copy.deepcopy(trip.get("itinerary", []))
    target_day = next((d for d in itinerary if d.get("day") == day_number), itinerary[0] if itinerary else {"day": day_number, "city": trip.get("destination", "Chennai"), "items": []})
    orig_items = copy.deepcopy(target_day.get("items", []))
    destination = trip.get("destination", "Chennai")

    # Baseline metrics for Current Plan
    orig_coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in orig_items
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    orig_route = await calculate_route(orig_coords)
    orig_dist_km = float(orig_route.get("distance_km") or target_day.get("distance_km") or 0.0)
    orig_transit_min = int(orig_route.get("duration_min") or target_day.get("estimated_time_min") or 0)
    orig_visit_min = sum(int(round(parse_duration_hours(i.get("duration", "1.5h")) * 60)) for i in orig_items)
    orig_total_min = orig_transit_min + orig_visit_min
    orig_cost = round(sum(float(i.get("estimated_cost") or 0.0) for i in orig_items), 2)

    sim_items = copy.deepcopy(orig_items)
    changes: List[Dict[str, Any]] = []
    moved_to_next_day: Optional[Dict[str, Any]] = None
    scenario_title = "What If Scenario Simulation"
    explanation = ""
    extra_transit_multiplier = 1.0

    existing_titles = [
        str(i.get("title") or i.get("name") or "")
        for d in itinerary
        for i in d.get("items", [])
    ]

    # 1. RAIN SCENARIO
    if scen in ("rain", "weather"):
        scenario_title = f"What if it rains on Day {day_number}?"
        replan_res = await generate_smart_replan_alternatives(
            trip=trip,
            day_number=day_number,
            reason=f"Simulated Heavy Rain on Day {day_number}",
            weather_data={"condition": "Heavy Rain", "rain_probability": 85},
            user_location=user_location,
        )
        prop_day = replan_res.get("proposed_day") or target_day
        sim_items = prop_day.get("items", sim_items)
        moved_to_next_day = replan_res.get("moved_to_next_day")
        for ch in replan_res.get("changes", []):
            changes.append({
                "type": "weather_swap",
                "original": ch.get("original_title"),
                "replacement": ch.get("replacement_title"),
                "detail": ch.get("what_changed") or f"Swapped {ch.get('original_title')} → {ch.get('replacement_title')}",
            })
        explanation = (
            f"Outdoor weather-sensitive stops on Day {day_number} were replaced with high-rated indoor cultural/museum "
            f"alternatives{', and the primary outdoor highlight was preserved for the next day' if moved_to_next_day else ''}."
        )

    # 2. LESS TIME SCENARIO
    elif scen == "less_time":
        max_hours = float(params.get("max_hours") or 4.0)
        scenario_title = f"What if I only have {max_hours:g} hours on Day {day_number}?"
        uncompleted = [i for i in sim_items if not i.get("completed")]
        if len(uncompleted) > 1:
            # Drop lowest-rated / longest detour stop and compact durations slightly
            to_drop = min(uncompleted, key=lambda x: (float(x.get("rating") or 4.2), -parse_duration_hours(x.get("duration", "1.5h"))))
            sim_items = [i for i in sim_items if i.get("id") != to_drop.get("id")]
            changes.append({
                "type": "removed_for_time",
                "original": to_drop.get("title") or to_drop.get("name"),
                "replacement": "Streamlined Schedule",
                "detail": f"Removed {to_drop.get('title') or to_drop.get('name')} ({to_drop.get('duration', '1.5h')}) to fit your {max_hours:g}h window.",
            })
        # Re-order remaining geographically
        sim_items = _solve_tsp_order(sim_items)
        explanation = f"Compacted Day {day_number} to prioritize top-rated stops and fit comfortably within {max_hours:g} hours."

    # 3. BUDGET DECREASE SCENARIO
    elif scen == "budget_decrease":
        cut_amount = float(params.get("reduce_by_inr") or 1500.0)
        scenario_title = f"What if my budget decreases by ₹{int(cut_amount):,}?"
        nearby = await explore_nearby_places(city=destination, category="All", exclude_names=existing_titles, limit=25)
        low_cost_pool = [p for p in nearby.get("places", []) if float(p.get("estimated_cost", 0)) <= 100 and p.get("explore_category") != "Emergency services"]

        expensive_items = sorted(
            [i for i in sim_items if not i.get("completed") and float(i.get("estimated_cost") or 0) > 150],
            key=lambda x: float(x.get("estimated_cost") or 0),
            reverse=True,
        )
        if expensive_items and low_cost_pool:
            target_exp = expensive_items[0]
            replacement_cheap = low_cost_pool[0]
            for idx, it in enumerate(sim_items):
                if it.get("id") == target_exp.get("id"):
                    sim_items[idx] = {
                        **it,
                        "title": replacement_cheap["title"],
                        "name": replacement_cheap["title"],
                        "category": replacement_cheap.get("category", "Heritage"),
                        "area": replacement_cheap.get("area", destination),
                        "estimated_cost": float(replacement_cheap.get("estimated_cost", 0.0)),
                        "latitude": float(replacement_cheap["latitude"]),
                        "longitude": float(replacement_cheap["longitude"]),
                        "rating": float(replacement_cheap.get("rating", 4.6)),
                        "note": f"Budget-friendly alternative (saves ₹{int(float(target_exp.get('estimated_cost', 0)) - float(replacement_cheap.get('estimated_cost', 0)))})",
                    }
                    changes.append({
                        "type": "budget_swap",
                        "original": target_exp.get("title"),
                        "replacement": replacement_cheap["title"],
                        "detail": f"Swapped {target_exp.get('title')} (₹{int(float(target_exp.get('estimated_cost', 0)))}) → {replacement_cheap['title']} (₹{int(float(replacement_cheap.get('estimated_cost', 0)))})",
                    })
                    break
        elif sim_items:
            # Reduce discretionary cost on highest cost item
            target_exp = max(sim_items, key=lambda x: float(x.get("estimated_cost") or 0))
            old_c = float(target_exp.get("estimated_cost") or 200)
            new_c = max(0.0, round(old_c * 0.4, 0))
            target_exp["estimated_cost"] = new_c
            changes.append({
                "type": "budget_trim",
                "original": f"{target_exp.get('title')} (₹{int(old_c)})",
                "replacement": f"{target_exp.get('title')} Standard Entry (₹{int(new_c)})",
                "detail": f"Switched to standard self-guided entry at {target_exp.get('title')}.",
            })
        explanation = f"Replaced higher-cost paid experiences with top-rated free/low-cost heritage and park spots to save budget."

    # 4. ACTIVITY UNAVAILABLE SCENARIO
    elif scen == "activity_unavailable":
        target_id = params.get("activity_id")
        uncompleted = [i for i in sim_items if not i.get("completed")]
        unavailable_item = (
            next((i for i in sim_items if i.get("id") == target_id), None)
            or (uncompleted[0] if uncompleted else (sim_items[0] if sim_items else None))
        )
        if unavailable_item:
            u_title = unavailable_item.get("title") or unavailable_item.get("name") or "Activity"
            scenario_title = f"What if {u_title} becomes unavailable?"
            u_lat = float(unavailable_item.get("latitude") or 13.0827)
            u_lon = float(unavailable_item.get("longitude") or 80.2707)
            nearby = await explore_nearby_places(lat=u_lat, lon=u_lon, city=destination, category="All", exclude_names=existing_titles + [u_title], limit=15)
            pool = [p for p in nearby.get("places", []) if p.get("explore_category") != "Emergency services"]
            best_alt = pool[0] if pool else None
            if best_alt:
                for idx, it in enumerate(sim_items):
                    if it.get("id") == unavailable_item.get("id"):
                        sim_items[idx] = {
                            **it,
                            "title": best_alt["title"],
                            "name": best_alt["title"],
                            "category": best_alt.get("category", "Attraction"),
                            "area": best_alt.get("area", destination),
                            "duration": best_alt.get("duration", it.get("duration", "1.5h")),
                            "estimated_cost": float(best_alt.get("estimated_cost", 100.0)),
                            "latitude": float(best_alt["latitude"]),
                            "longitude": float(best_alt["longitude"]),
                            "rating": float(best_alt.get("rating", 4.6)),
                            "note": f"Alternative for closed/unavailable {u_title}",
                        }
                        break
                changes.append({
                    "type": "unavailable_replacement",
                    "original": u_title,
                    "replacement": best_alt["title"],
                    "detail": f"Replaced {u_title} with nearby {best_alt['title']} ({best_alt['distance_km']} km away, ★{best_alt['rating']}).",
                })
                explanation = f"Found the closest matching open attraction ({best_alt['title']}) to seamlessly replace {u_title}."

    # 5. ADD ANOTHER DESTINATION / PLACE SCENARIO
    elif scen == "add_destination":
        custom_place_name = params.get("place_name")
        nearby = await explore_nearby_places(city=destination, category="All", exclude_names=existing_titles, limit=15)
        pool = [p for p in nearby.get("places", []) if p.get("explore_category") != "Emergency services"]
        chosen = None
        if custom_place_name:
            chosen = next((p for p in pool if custom_place_name.lower() in p["title"].lower()), None)
        if not chosen and pool:
            chosen = pool[0]

        if chosen:
            scenario_title = f"What if I add {chosen['title']} to Day {day_number}?"
            last_time_min = parse_time_to_minutes(sim_items[-1].get("time", "02:00 PM")) if sim_items else 9 * 60
            last_dur_min = int(round(parse_duration_hours(sim_items[-1].get("duration", "1.5h")) * 60)) if sim_items else 0
            new_time_str = minutes_to_time_str(min(20 * 60, last_time_min + last_dur_min + 30))
            new_item = {
                "id": f"sim-add-{uuid.uuid4().hex[:6]}",
                "place_id": chosen.get("place_id"),
                "title": chosen["title"],
                "name": chosen["title"],
                "time": new_time_str,
                "duration": chosen.get("duration", "1.5h"),
                "category": chosen.get("category", "Attraction"),
                "area": chosen.get("area", destination),
                "estimated_cost": float(chosen.get("estimated_cost", 150.0)),
                "latitude": float(chosen["latitude"]),
                "longitude": float(chosen["longitude"]),
                "rating": float(chosen.get("rating", 4.6)),
                "indoor": bool(chosen.get("indoor", False)),
                "outdoor": bool(chosen.get("outdoor", True)),
                "weatherSensitive": bool(chosen.get("weatherSensitive", False)),
                "completed": False,
                "note": "Added via What-If Simulator & route-optimized",
            }
            sim_items.append(new_item)
            sim_items = _solve_tsp_order(sim_items)
            changes.append({
                "type": "added_stop",
                "original": "—",
                "replacement": chosen["title"],
                "detail": f"Added {chosen['title']} at {new_time_str} and optimized route order.",
            })
            explanation = f"Inserted {chosen['title']} into Day {day_number} and re-sequenced stops to minimize extra travel."

    # 6. TRAFFIC INCREASE SCENARIO
    elif scen == "traffic_increase":
        traffic_pct = int(params.get("traffic_increase_pct") or 45)
        scenario_title = f"What if city traffic increases by {traffic_pct}%?"
        extra_transit_multiplier = 1.0 + (traffic_pct / 100.0)
        sim_items = _solve_tsp_order(sim_items)
        # Shift afternoon times slightly to absorb peak congestion
        for idx, it in enumerate(sim_items):
            if idx > 0 and not it.get("completed"):
                old_t = it.get("time", "12:00 PM")
                shifted_t = minutes_to_time_str(parse_time_to_minutes(old_t) + 15 * idx)
                it["time"] = shifted_t
        changes.append({
            "type": "traffic_resequence",
            "original": f"Standard Transit ({orig_transit_min} min)",
            "replacement": "TSP Re-ordered + Buffer Shifted",
            "detail": f"Reordered waypoints to eliminate cross-city congestion under +{traffic_pct}% traffic load.",
        })
        explanation = f"Under +{traffic_pct}% heavier traffic, reordering stops geographically and adding 15m departure buffers prevents missed slots."

    # 7. SKIP ACTIVITY SCENARIO
    elif scen == "skip_activity":
        target_id = params.get("activity_id")
        uncompleted = [i for i in sim_items if not i.get("completed")]
        skip_item = (
            next((i for i in sim_items if i.get("id") == target_id), None)
            or (uncompleted[-1] if uncompleted else (sim_items[-1] if sim_items else None))
        )
        if skip_item and len(sim_items) > 1:
            s_title = skip_item.get("title") or skip_item.get("name") or "Activity"
            scenario_title = f"What if I skip {s_title}?"
            sim_items = [i for i in sim_items if i.get("id") != skip_item.get("id")]
            changes.append({
                "type": "skipped_activity",
                "original": s_title,
                "replacement": "Skipped (Free Relaxation Buffer)",
                "detail": f"Skipping {s_title} frees up {skip_item.get('duration', '1.5h')} and saves ₹{int(float(skip_item.get('estimated_cost') or 0))}.",
            })
            explanation = f"Skipping {s_title} reduces transit fatigue, saves entry + cab costs, and creates a relaxed pace for the rest of Day {day_number}."

    # Compute Simulated Plan metrics
    sim_coords = [
        (float(i["latitude"]), float(i["longitude"]))
        for i in sim_items
        if i.get("latitude") is not None and i.get("longitude") is not None
    ]
    sim_route = await calculate_route(sim_coords)
    sim_dist_km = float(sim_route.get("distance_km") or 0.0)
    sim_transit_min = int(round(float(sim_route.get("duration_min") or 0) * extra_transit_multiplier))
    sim_visit_min = sum(int(round(parse_duration_hours(i.get("duration", "1.5h")) * 60)) for i in sim_items)
    sim_total_min = sim_transit_min + sim_visit_min
    sim_cost = round(sum(float(i.get("estimated_cost") or 0.0) for i in sim_items), 2)

    # Include transport cost delta (₹18/km)
    transport_cost_delta = round((sim_dist_km - orig_dist_km) * 18.0, 0)
    budget_diff_inr = round((sim_cost - orig_cost) + transport_cost_delta, 0)
    time_diff_min = sim_total_min - orig_total_min
    dist_diff_km = round(sim_dist_km - orig_dist_km, 1)

    simulated_day_obj = {
        **target_day,
        "day": day_number,
        "items": sim_items,
        "distance_km": sim_dist_km,
        "estimated_time_min": sim_transit_min,
        "route_geometry": sim_route.get("geometry", []),
    }

    return {
        "trip_id": trip.get("id"),
        "day": day_number,
        "scenario_type": scen,
        "scenario_title": scenario_title,
        "explanation": explanation,
        "changes": changes,
        "current_plan": {
            "day": day_number,
            "items": orig_items,
            "distance_km": orig_dist_km,
            "transit_time_min": orig_transit_min,
            "total_time_min": orig_total_min,
            "total_cost_inr": orig_cost,
        },
        "simulated_plan": {
            "day": day_number,
            "items": sim_items,
            "distance_km": sim_dist_km,
            "transit_time_min": sim_transit_min,
            "total_time_min": sim_total_min,
            "total_cost_inr": sim_cost,
            "route_geometry": sim_route.get("geometry", []),
        },
        "simulated_day": simulated_day_obj,
        "moved_to_next_day": moved_to_next_day,
        "impacts": {
            "time_impact_min": time_diff_min,
            "time_impact_label": (
                f"Saves {abs(time_diff_min)} mins"
                if time_diff_min < 0
                else (f"+{time_diff_min} mins" if time_diff_min > 0 else "No time change")
            ),
            "budget_impact_inr": budget_diff_inr,
            "budget_impact_label": (
                f"-₹{int(abs(budget_diff_inr)):,} saved"
                if budget_diff_inr < 0
                else (f"+₹{int(budget_diff_inr):,}" if budget_diff_inr > 0 else "₹0 neutral")
            ),
            "distance_impact_km": dist_diff_km,
            "distance_impact_label": (
                f"{dist_diff_km:+.1f} km" if dist_diff_km != 0 else "0 km change"
            ),
        },
    }

