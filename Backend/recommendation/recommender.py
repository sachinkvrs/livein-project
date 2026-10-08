from pathlib import Path
import pandas as pd
import numpy as np
import re
import uuid
from typing import Optional, List, Dict, Any


# ============================================================
# DATASET
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent

DATASET_PATH = BASE_DIR / "Dataset" / "Recommendation.csv"

rec = pd.read_csv(DATASET_PATH)


# ============================================================
# DATA USED BY RECOMMENDER
# ============================================================

rec_data = rec.copy()


# ============================================================
# FEATURE COLUMNS
# ============================================================

travel_group_cols = [
    "family",
    "friends",
    "couple",
    "solo",
]

time_cols = [
    "morning",
    "afternoon",
    "evening",
    "night",
]

interest_cols = [
    "nature",
    "beach",
    "adventure",
    "history",
    "religious",
    "culture",
    "shopping",
    "food",
    "photography",
    "relaxation",
    "wildlife",
    "art",
    "science",
    "entertainment",
    "heritage",
    "indoor",
    "outdoor",
    "romantic",
    "peaceful",
    "crowded",
    "quiet",
    "educational",
    "fun",
    "scenic",
    "instagrammable",
]


# ============================================================
# WEIGHTS (Transparent Scoring System)
# ============================================================

WEIGHTS = {
    "travel": 0.18,
    "budget": 0.18,
    "time": 0.12,
    "interest": 0.24,
    "rating": 0.08,
    "weather": 0.12,
    "preference": 0.08,
}


# ============================================================
# BUDGET SCORE
# ============================================================

def budget_score(user_budget, destination_budget):
    levels = {
        "Free": 0,
        "Budget": 1,
        "Moderate": 2,
        "High": 3,
        "Premium": 4,
        "Luxury": 4,
    }

    user_budget = str(user_budget).strip().title()
    destination_budget = str(destination_budget).strip().title()

    if (
        user_budget not in levels
        or destination_budget not in levels
    ):
        return 0.0

    difference = abs(
        levels[user_budget]
        - levels[destination_budget]
    )

    if difference == 0:
        return 1.0
    if difference == 1:
        return 0.7
    if difference == 2:
        return 0.4

    return 0.0


# ============================================================
# TIME SCORE
# ============================================================

def time_score(destination, user_time):
    column = str(user_time).strip().lower()

    if column not in time_cols:
        return 0.0

    if column not in destination.index:
        return 0.0

    return float(destination[column])


# ============================================================
# INTEREST SCORE
# ============================================================

def interest_score(destination, user_interests):
    if not user_interests:
        return None

    scores = []

    for interest in user_interests:
        column = str(interest).strip().lower()
        if not column:
            continue

        weight_column = f"{column}_weight"

        if weight_column in destination.index:
            scores.append(
                float(destination[weight_column])
            )
        elif column in interest_cols and column in destination.index:
            scores.append(
                float(destination[column])
            )

    if not scores:
        return None

    return float(np.mean(scores))


# ============================================================
# RATING SCORE
# ============================================================

def rating_score(destination):
    if "rating_seed" not in destination.index:
        return 0.0

    return max(
        0.0,
        min(
            1.0,
            float(destination["rating_seed"]) / 5,
        ),
    )


# ============================================================
# TRAVEL GROUP SCORE
# ============================================================

def travel_group_score(destination, user_group):
    column = str(user_group).strip().lower()

    if column not in travel_group_cols:
        return None

    if column not in destination.index:
        return None

    return float(destination[column])


# ============================================================
# 7. WEATHER-AWARE ACTIVITY SCORE
# ============================================================

def weather_score(destination, weather_data: Optional[Dict[str, Any]] = None) -> Optional[float]:
    """
    Calculates weather suitability score (0.0 to 1.0).
    - Rain expected (rain_probability >= 50 or rainy condition):
        Indoor activities -> higher priority (1.0)
        Outdoor activities -> lower priority (0.25)
    - Excellent weather (rain_probability < 30 and pleasant temp):
        Outdoor activities -> higher priority (1.0)
        Indoor activities -> normal priority (0.78)
    """
    if not weather_data:
        return None

    rain_prob = int(weather_data.get("rain_probability", 15))
    condition = str(weather_data.get("condition", "")).lower()
    temp_c = float(weather_data.get("temperature") or weather_data.get("tempC") or 28.0)

    is_indoor = bool(destination.get("indoor", 0) == 1)
    is_outdoor = bool(destination.get("outdoor", 1) == 1)

    is_rainy = rain_prob >= 50 or any(w in condition for w in ["rain", "storm", "drizzle", "thunder", "shower"])

    if is_rainy:
        if is_indoor and not is_outdoor:
            return 1.0
        if is_indoor and is_outdoor:
            return 0.8
        return 0.25

    if temp_c >= 36.0:
        # Very hot weather: indoor or shaded places get slight priority
        return 0.95 if is_indoor else 0.65

    # Pleasant / clear weather: outdoor activities get higher priority
    if is_outdoor:
        return 1.0
    return 0.78


# ============================================================
# 8. LEARNED USER PREFERENCE SCORE
# ============================================================

def learned_preference_score(destination, learned_preferences: Optional[Dict[str, Any]] = None) -> Optional[float]:
    """
    Adjusts candidate ranking based on user's learned Travel Profile (category affinities & skipped categories).
    """
    if not learned_preferences:
        return None

    cat_scores = learned_preferences.get("category_scores") or {}
    skipped = [str(s).lower() for s in (learned_preferences.get("skipped_categories") or [])]

    raw_cat = str(destination.get("category", "")).strip()
    raw_sub = str(destination.get("subcategory", "")).strip()
    combined = f"{raw_cat} {raw_sub}".lower()

    if any(sk in combined for sk in skipped if sk):
        return 0.2

    # Match against Travel Profile categories
    matched_vals = []
    for k, val in cat_scores.items():
        k_low = k.lower()
        if any(word in combined for word in k_low.split("&")) or k_low in combined:
            matched_vals.append(float(val) / 100.0)

    if matched_vals:
        return max(0.0, min(1.0, float(np.mean(matched_vals))))

    return 0.65


# ============================================================
# CHECK TRAVEL FEATURE
# ============================================================

def travel_feature_available(candidates, user_group):
    column = str(user_group).strip().lower()

    if column not in travel_group_cols:
        return False

    if column not in candidates.columns:
        return False

    return candidates[column].nunique(dropna=True) > 1


# ============================================================
# FINAL SCORE
# ============================================================

def calculate_score(
    destination,
    travelling_with=None,
    budget=None,
    preferred_time=None,
    interests=None,
    use_travel=True,
    weather_data=None,
    learned_preferences=None,
):
    scores = {}
    weights = {}

    # Travelling with
    if travelling_with and use_travel:
        score = travel_group_score(destination, travelling_with)
        if score is not None:
            scores["travel"] = score
            weights["travel"] = WEIGHTS["travel"]

    # Budget
    if budget and "budget_level" in destination.index:
        scores["budget"] = budget_score(budget, destination["budget_level"])
        weights["budget"] = WEIGHTS["budget"]

    # Preferred time
    if preferred_time:
        scores["time"] = time_score(destination, preferred_time)
        weights["time"] = WEIGHTS["time"]

    # Interests
    if interests:
        score = interest_score(destination, interests)
        if score is not None:
            scores["interest"] = score
            weights["interest"] = WEIGHTS["interest"]

    # Rating
    if "rating_seed" in destination.index:
        scores["rating"] = rating_score(destination)
        weights["rating"] = WEIGHTS["rating"]

    # Weather-Aware Factor
    if weather_data:
        w_score = weather_score(destination, weather_data)
        if w_score is not None:
            scores["weather"] = w_score
            weights["weather"] = WEIGHTS["weather"]

    # Learned Travel Profile Factor
    if learned_preferences:
        p_score = learned_preference_score(destination, learned_preferences)
        if p_score is not None:
            scores["preference"] = p_score
            weights["preference"] = WEIGHTS["preference"]

    if not scores:
        return 0.0

    total_weight = sum(weights.values())
    final_score = sum(
        scores[feature] * weights[feature] for feature in scores
    ) / total_weight

    return round(final_score * 100, 2)


# ============================================================
# PARSE TRIP DAYS
# ============================================================

def parse_trip_days(duration):
    if duration is None:
        return 1

    if isinstance(duration, (int, float)):
        return max(1, min(5, int(duration)))

    text = str(duration).strip().lower()
    match = re.search(r"([1-5])\s*days?", text)

    if match:
        return int(match.group(1))

    return 1


# ============================================================
# BUILD ITINERARY
# ============================================================

SCHEDULE_TIMES = ["09:00 AM", "11:30 AM", "02:30 PM", "05:00 PM"]


def build_itinerary(places, trip_days, city="Chennai"):
    itinerary = []

    for day in range(1, trip_days + 1):
        start = (day - 1) * 3
        end = start + 3
        day_places = places[start:end]

        items = []
        for idx, p in enumerate(day_places):
            time_slot = SCHEDULE_TIMES[idx % len(SCHEDULE_TIMES)]
            duration_val = p.get("duration", "1.5h")
            if not str(duration_val).endswith("h"):
                duration_val = f"{duration_val}h"

            items.append({
                "id": f"act-{day}-{idx+1}-{uuid.uuid4().hex[:6]}",
                "place_id": p.get("place_id", f"P{day}{idx}"),
                "title": p.get("name") or p.get("title", "Attraction"),
                "time": time_slot,
                "duration": duration_val,
                "note": p.get("description") or f"Explore {p.get('name', 'location')} in {p.get('area', city)}",
                "category": p.get("category", "Attraction"),
                "subcategory": p.get("subcategory", ""),
                "area": p.get("area", city),
                "estimated_cost": float(p.get("estimated_cost", 0)),
                "latitude": float(p["latitude"]) if p.get("latitude") is not None else None,
                "longitude": float(p["longitude"]) if p.get("longitude") is not None else None,
                "score": float(p.get("score", 0)),
                "weather_tag": p.get("weather_tag", "Weather-Optimal"),
                "rating": float(p.get("rating", 4.0)),
                "indoor": bool(p.get("indoor", False)),
                "outdoor": bool(p.get("outdoor", True)),
                "weatherSensitive": bool(p.get("weatherSensitive", False)),
                "completed": False,
            })

        if items:
            itinerary.append({
                "day": day,
                "city": city,
                "items": items,
                "places": day_places,
            })

    return itinerary


# ============================================================
# MAIN RECOMMENDER
# ============================================================

def recommend(
    category=None,
    travelling_with=None,
    budget=None,
    preferred_time=None,
    trip_days=None,
    duration=None,
    interests=None,
    destination="Chennai",
    weather_data=None,
    learned_preferences=None,
):
    if trip_days is not None:
        num_days = max(1, min(5, int(trip_days)))
    elif duration is not None:
        num_days = parse_trip_days(duration)
    else:
        num_days = 3

    # 1. Filter by category if provided, otherwise score all candidates
    if category and str(category).strip() and str(category).strip().lower() != "all":
        candidates = rec_data[
            rec_data["category"]
            .astype(str)
            .str.strip()
            .str.lower()
            == str(category).strip().lower()
        ].copy()
    else:
        candidates = rec_data.copy()

    # If category had too few results, supplement with all dataset candidates
    if len(candidates) < num_days * 3:
        candidates = rec_data.copy()

    # 2. Travel group availability
    use_travel = (
        travelling_with is not None
        and travel_feature_available(candidates, travelling_with)
    )

    # 3. Calculate score (including Weather-Aware & Learned Preferences)
    candidates["score"] = candidates.apply(
        lambda row: calculate_score(
            row,
            travelling_with=travelling_with,
            budget=budget,
            preferred_time=preferred_time,
            interests=interests,
            use_travel=use_travel,
            weather_data=weather_data,
            learned_preferences=learned_preferences,
        ),
        axis=1,
    )

    # 4. Sort by score and rating
    candidates = candidates.sort_values(
        by=["score", "rating_seed"],
        ascending=[False, False],
    )

    places_needed = min(len(candidates), num_days * 3)
    selected = candidates.head(places_needed)

    rain_prob = int((weather_data or {}).get("rain_probability", 15))
    is_rainy = rain_prob >= 50

    ranked_places = []
    for _, row in selected.iterrows():
        lat = row.get("latitude_seed")
        lon = row.get("longitude_seed")
        if pd.isna(lat) or pd.isna(lon):
            continue

        is_indoor = bool(row.get("indoor", 0) == 1)
        is_outdoor = bool(row.get("outdoor", 1) == 1)

        if is_rainy and is_indoor:
            weather_tag = "Indoor Priority (Rain Expected)"
        elif not is_rainy and is_outdoor:
            weather_tag = "Boosted for Clear Weather"
        else:
            weather_tag = "All-Weather Match"

        ranked_places.append({
            "place_id": str(row.get("place_id", "")),
            "name": str(row["place_name"]),
            "title": str(row["place_name"]),
            "category": str(row.get("category", "")),
            "subcategory": str(row.get("subcategory", "")),
            "area": str(row.get("area", "")),
            "description": str(row.get("description", "")),
            "estimated_cost": float(row.get("estimated_cost_inr", 0)),
            "duration": f"{float(row.get('duration_hours', 1.5)):.1f}h",
            "latitude": float(lat),
            "longitude": float(lon),
            "score": float(row["score"]),
            "weather_tag": weather_tag,
            "rating": float(row.get("rating_seed", 4.0)),
            "indoor": is_indoor,
            "outdoor": is_outdoor,
            "weatherSensitive": is_outdoor and not is_indoor,
        })

    return {
        "trip_days": num_days,
        "weather_considered": bool(weather_data),
        "itinerary": build_itinerary(ranked_places, num_days, city=destination),
    }


# ============================================================
# WEATHER ALERT REPLANNER
# ============================================================

def replan_day_for_weather(day_data, destination="Chennai", interests=None):
    """
    Given an ItineraryDay object or dict, replaces uncompleted outdoor / weather-sensitive places
    with suitable indoor places from the recommendation dataset.
    Preserves already completed activities!
    """
    items = day_data.get("items", [])
    if not items:
        return day_data

    # Find indoor alternatives from dataset
    indoor_candidates = rec_data[rec_data["indoor"] == 1].copy()

    # Exclude places already in the day
    existing_names = {item.get("title") for item in items}
    indoor_candidates = indoor_candidates[
        ~indoor_candidates["place_name"].isin(existing_names)
    ]

    if indoor_candidates.empty:
        indoor_candidates = rec_data.copy()

    # Score indoor candidates
    indoor_candidates["score"] = indoor_candidates.apply(
        lambda row: calculate_score(row, interests=interests, use_travel=False),
        axis=1,
    )
    indoor_candidates = indoor_candidates.sort_values(
        by=["score", "rating_seed"], ascending=[False, False]
    )

    indoor_pool = indoor_candidates.to_dict(orient="records")
    pool_idx = 0

    new_items = []
    for item in items:
        # Never overwrite already completed activities
        if item.get("completed"):
            new_items.append(item)
            continue

        # Check if outdoor/weather sensitive
        if item.get("weatherSensitive", True) or item.get("outdoor", False):
            if pool_idx < len(indoor_pool):
                alt = indoor_pool[pool_idx]
                pool_idx += 1
                new_items.append({
                    "id": f"act-replan-{uuid.uuid4().hex[:6]}",
                    "place_id": str(alt.get("place_id", "")),
                    "title": str(alt.get("place_name", "Indoor Activity")),
                    "time": item.get("time", "10:00 AM"),
                    "duration": f"{float(alt.get('duration_hours', 1.5)):.1f}h",
                    "note": f"Indoor alternative safe for rain: {alt.get('description', alt.get('place_name', ''))}",
                    "category": str(alt.get("category", "Culture")),
                    "subcategory": str(alt.get("subcategory", "")),
                    "area": str(alt.get("area", destination)),
                    "estimated_cost": float(alt.get("estimated_cost_inr", 0)),
                    "latitude": float(alt.get("latitude_seed", 13.0827)),
                    "longitude": float(alt.get("longitude_seed", 80.2707)),
                    "score": float(alt.get("score", 90.0)),
                    "rating": float(alt.get("rating_seed", 4.5)),
                    "indoor": True,
                    "outdoor": False,
                    "weatherSensitive": False,
                    "completed": False,
                    "replanned_from": item.get("title"),
                })
            else:
                new_items.append(item)
        else:
            new_items.append(item)

    updated_day = dict(day_data)
    updated_day["items"] = new_items
    return updated_day