import re
import uuid
from typing import Dict, Any, List, Optional

from places_service import search_places, get_suggested_places
from geocoding import calculate_route, geocode_place, haversine_distance
from storage import update_trip, add_expense, get_trip
from trip_intelligence import (
    compute_trip_health_score,
    compute_predictive_budget,
    optimize_day_route,
    parse_duration_hours,
)


async def process_ai_chat(
    message: str,
    trip: Optional[Dict[str, Any]] = None,
    active_day: int = 1,
    weather_data: Optional[Dict[str, Any]] = None,
    user_location: Optional[Dict[str, float]] = None,
    last_recommended_places: Optional[List[Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Context-aware TripNova AI Assistant engine.
    Understands natural language requests using real trip data and executes validated backend actions:
    User request -> Understand intent -> Validate request -> Backend action -> Return updated state + recommendations.
    """
    clean_msg = (message or "").strip()
    lower_msg = clean_msg.lower()

    if not trip:
        # Handle when user has no active trip yet
        suggestions = await get_suggested_places(city="Chennai", limit=3)
        return {
            "text": (
                "You don't have an active trip selected right now. "
                "Head to **Plan Trip** or **My Trips** to select a trip so I can help you manage your itinerary, "
                "budget, live route, and weather-aware recommendations!"
            ),
            "recommendations": suggestions,
            "action_performed": None,
            "intent": "no_active_trip",
        }

    trip_id = trip.get("id")
    destination = trip.get("destination", "Chennai")
    itinerary = trip.get("itinerary", [])
    total_days = len(itinerary) or int(trip.get("number_of_days") or 1)
    active_day = max(1, min(total_days, int(active_day or 1)))
    current_day_obj = next((d for d in itinerary if d.get("day") == active_day), itinerary[0] if itinerary else None)
    current_items = (current_day_obj or {}).get("items", [])

    budget_total = float(trip.get("budget") or trip.get("tripBudget") or 50000.0)
    spent_total = float(trip.get("spent") or 0.0)
    remaining_budget = max(0.0, budget_total - spent_total)

    existing_titles = [
        str(i.get("title") or i.get("name", ""))
        for d in itinerary
        for i in d.get("items", [])
    ]

    # ------------------------------------------------------------
    # INTENT 1: REMOVE ACTIVITY ("Remove tomorrow morning's activity", "Remove Marina Beach")
    # ------------------------------------------------------------
    if any(w in lower_msg for w in ["remove ", "delete ", "cancel ", "skip ", "drop "]) and (
        "activity" in lower_msg
        or "morning" in lower_msg
        or "afternoon" in lower_msg
        or "evening" in lower_msg
        or "tomorrow" in lower_msg
        or "today" in lower_msg
        or any(str(t).lower() in lower_msg for t in existing_titles if len(str(t)) > 3)
    ):
        target_day_num = active_day
        if "tomorrow" in lower_msg:
            target_day_num = min(total_days, active_day + 1)
        else:
            day_match = re.search(r"day\s*(\d+)", lower_msg)
            if day_match:
                target_day_num = max(1, min(total_days, int(day_match.group(1))))

        day_obj = next((d for d in itinerary if d.get("day") == target_day_num), None)
        if not day_obj or not day_obj.get("items"):
            return {
                "text": f"Day {target_day_num} doesn't have any scheduled activities to remove.",
                "recommendations": [],
                "action_performed": None,
                "intent": "remove_activity_failed",
            }

        day_items = day_obj.get("items", [])
        target_item = None

        # Check by explicit name match across all days first
        for d in itinerary:
            for item in d.get("items", []):
                title_l = str(item.get("title") or item.get("name", "")).strip().lower()
                if title_l and title_l in lower_msg:
                    target_item = item
                    target_day_num = d.get("day", target_day_num)
                    day_obj = d
                    break
            if target_item:
                break

        # Otherwise check by time of day (morning / afternoon / evening / first / last)
        if not target_item:
            if "morning" in lower_msg or "first" in lower_msg:
                target_item = next((i for i in day_items if "AM" in str(i.get("time", "")).upper()), day_items[0])
            elif "afternoon" in lower_msg:
                target_item = next(
                    (i for i in day_items if any(h in str(i.get("time", "")) for h in ["12:", "01:", "02:", "03:", "1:", "2:", "3:"])),
                    day_items[len(day_items) // 2],
                )
            elif "evening" in lower_msg or "night" in lower_msg or "last" in lower_msg:
                target_item = day_items[-1]
            else:
                target_item = day_items[0]

        removed_title = target_item.get("title") or target_item.get("name", "Activity")
        removed_time = target_item.get("time", "")
        day_obj["items"] = [i for i in day_obj.get("items", []) if i.get("id") != target_item.get("id")]

        # Recalculate route for that day
        coords = [
            (float(i["latitude"]), float(i["longitude"]))
            for i in day_obj["items"]
            if i.get("latitude") is not None and i.get("longitude") is not None
        ]
        route_info = await calculate_route(coords)
        day_obj["distance_km"] = route_info.get("distance_km", 0.0)
        day_obj["estimated_time_min"] = route_info.get("duration_min", 0)
        day_obj["route_geometry"] = route_info.get("geometry", [])

        update_trip(trip_id, {"itinerary": itinerary})

        return {
            "text": (
                f"Done! I removed **{removed_title}** ({removed_time}) from **Day {target_day_num}** "
                f"and recalculated your route ({day_obj['distance_km']} km, ~{day_obj['estimated_time_min']} min transit)."
            ),
            "recommendations": [],
            "action_performed": {
                "type": "REMOVE_ACTIVITY",
                "day": target_day_num,
                "removed_activity": target_item,
                "itinerary": itinerary,
            },
            "intent": "remove_activity",
        }

    # ------------------------------------------------------------
    # INTENT 2: ADD PLACE TO ITINERARY ("Add Marina Beach to Day 2", "Add this place to Day 2")
    # ------------------------------------------------------------
    add_match = re.search(r"add\s+(.+?)\s+to\s+day\s*(\d+)", lower_msg)
    if not add_match and lower_msg.startswith("add ") and "expense" not in lower_msg and "₹" not in lower_msg:
        # e.g., "Add Fort St. George" (defaults to active_day)
        simple_add = re.search(r"^add\s+(.+?)(?:\s+today|\s+tomorrow)?$", clean_msg, re.IGNORECASE)
        if simple_add:
            inferred_day = min(total_days, active_day + 1) if "tomorrow" in lower_msg else active_day
            add_match = (simple_add.group(1), str(inferred_day))

    if add_match:
        if isinstance(add_match, tuple):
            raw_place_query, day_str = add_match
        else:
            raw_place_query = add_match.group(1).strip()
            day_str = add_match.group(2).strip()

        target_day_num = max(1, min(total_days, int(day_str)))
        place_to_add = None

        # Handle "this place" or "that place" using last_recommended_places or top suggestion
        if raw_place_query.lower() in ("this place", "that place", "this", "it", "first place", "the first one"):
            if last_recommended_places and len(last_recommended_places) > 0:
                place_to_add = last_recommended_places[0]
            else:
                suggs = await get_suggested_places(city=destination, exclude_names=existing_titles, limit=1)
                if suggs:
                    place_to_add = suggs[0]
        else:
            # Search real places in destination
            found = await search_places(query=raw_place_query, city=destination, limit=3)
            if found:
                place_to_add = found[0]
            else:
                geo = await geocode_place(f"{raw_place_query}, {destination}")
                place_to_add = {
                    "title": raw_place_query.title(),
                    "name": raw_place_query.title(),
                    "category": "Attraction",
                    "area": destination,
                    "estimated_cost": 100.0,
                    "duration": "1.5h",
                    "latitude": geo["lat"] if geo else 13.0827,
                    "longitude": geo["lon"] if geo else 80.2707,
                    "rating": 4.5,
                    "indoor": False,
                    "outdoor": True,
                }

        if place_to_add:
            day_obj = next((d for d in itinerary if d.get("day") == target_day_num), None)
            if not day_obj:
                day_obj = {
                    "day": target_day_num,
                    "city": destination,
                    "date": trip.get("start_date", ""),
                    "items": [],
                    "distance_km": 0.0,
                    "estimated_time_min": 0,
                    "route_geometry": [],
                }
                itinerary.append(day_obj)

            new_act = {
                "id": f"act-{target_day_num}-{uuid.uuid4().hex[:6]}",
                "place_id": place_to_add.get("place_id") or f"p-{uuid.uuid4().hex[:6]}",
                "title": place_to_add.get("title") or place_to_add.get("name"),
                "name": place_to_add.get("title") or place_to_add.get("name"),
                "time": "04:30 PM",
                "duration": place_to_add.get("duration", "1.5h"),
                "note": place_to_add.get("description") or f"Added via TripNova AI in {destination}",
                "category": place_to_add.get("category", "Attraction"),
                "subcategory": place_to_add.get("subcategory", ""),
                "area": place_to_add.get("area", destination),
                "estimated_cost": float(place_to_add.get("estimated_cost") or 0.0),
                "latitude": float(place_to_add.get("latitude") or 13.0827),
                "longitude": float(place_to_add.get("longitude") or 80.2707),
                "score": 92.0,
                "rating": float(place_to_add.get("rating") or 4.5),
                "indoor": bool(place_to_add.get("indoor", False)),
                "outdoor": bool(place_to_add.get("outdoor", True)),
                "weatherSensitive": bool(place_to_add.get("weatherSensitive", False)),
                "completed": False,
            }
            day_obj.setdefault("items", []).append(new_act)

            coords = [
                (float(i["latitude"]), float(i["longitude"]))
                for i in day_obj["items"]
                if i.get("latitude") is not None and i.get("longitude") is not None
            ]
            route_info = await calculate_route(coords)
            day_obj["distance_km"] = route_info.get("distance_km", 0.0)
            day_obj["estimated_time_min"] = route_info.get("duration_min", 0)
            day_obj["route_geometry"] = route_info.get("geometry", [])

            update_trip(trip_id, {"itinerary": itinerary})

            return {
                "text": (
                    f"Added **{new_act['title']}** to **Day {target_day_num}** ({new_act['time']})! "
                    f"Estimated cost: ₹{new_act['estimated_cost']:,.0f}. "
                    f"Day {target_day_num} route is now {day_obj['distance_km']} km (~{day_obj['estimated_time_min']} min driving)."
                ),
                "recommendations": [],
                "action_performed": {
                    "type": "ADD_ACTIVITY",
                    "day": target_day_num,
                    "activity": new_act,
                    "itinerary": itinerary,
                },
                "intent": "add_activity",
            }

    # ------------------------------------------------------------
    # INTENT 3: LOG EXPENSE VIA CHAT ("Spent ₹450 on lunch", "Add ₹300 transport expense")
    # ------------------------------------------------------------
    exp_match = re.search(r"(?:spent|add|log|record).*?(?:₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)", lower_msg)
    if exp_match and any(w in lower_msg for w in ["spent", "expense", "food", "lunch", "dinner", "taxi", "cab", "transport", "ticket", "hotel", "shopping"]):
        amount = float(exp_match.group(1))
        category = "Food"
        if any(w in lower_msg for w in ["taxi", "cab", "bus", "train", "auto", "transport", "uber", "ola"]):
            category = "Transport"
        elif any(w in lower_msg for w in ["hotel", "stay", "room", "accommodation"]):
            category = "Accommodation"
        elif any(w in lower_msg for w in ["ticket", "entry", "museum"]):
            category = "Tickets"
        elif any(w in lower_msg for w in ["shop", "souvenir", "gift"]):
            category = "Shopping"

        exp_obj = add_expense(trip_id, {
            "category": category,
            "amount": amount,
            "title": f"{category} (via AI Assistant)",
            "description": clean_msg,
        })
        updated_trip = get_trip(trip_id)
        new_spent = float(updated_trip.get("spent", 0.0))
        new_rem = max(0.0, budget_total - new_spent)

        return {
            "text": (
                f"Recorded **₹{amount:,.0f}** under **{category}**! "
                f"Your total spent is now **₹{new_spent:,.0f}** with **₹{new_rem:,.0f}** remaining."
            ),
            "recommendations": [],
            "action_performed": {
                "type": "ADD_EXPENSE",
                "expense": exp_obj,
                "expenses": updated_trip.get("expenses", []),
                "spent": new_spent,
            },
            "intent": "add_expense",
        }

    # ------------------------------------------------------------
    # INTENT 4: BUDGET-CONSTRAINED QUERY ("I have ₹2,000 left. What can I do today?")
    # ------------------------------------------------------------
    money_match = re.search(r"(?:₹|rs\.?|inr)\s*([\d,]+)", lower_msg)
    if money_match or ("budget" in lower_msg or "left" in lower_msg or "afford" in lower_msg or "cheap" in lower_msg or "free" in lower_msg):
        if money_match:
            user_specified_limit = float(money_match.group(1).replace(",", ""))
        else:
            user_specified_limit = remaining_budget

        all_suggs = await get_suggested_places(city=destination, exclude_names=existing_titles, limit=12)
        affordable = [
            p for p in all_suggs
            if float(p.get("estimated_cost") or 0.0) <= user_specified_limit
        ]
        # Weather-aware sorting: if rain_probability >= 50, prioritize indoor
        rain_prob = int((weather_data or {}).get("rain_probability", 15))
        if rain_prob >= 50:
            affordable.sort(key=lambda x: (not bool(x.get("indoor")), float(x.get("estimated_cost") or 0)))
        else:
            affordable.sort(key=lambda x: (-float(x.get("rating") or 4.5), float(x.get("estimated_cost") or 0)))

        top_picks = affordable[:4]
        total_picks_cost = sum(float(p.get("estimated_cost") or 0) for p in top_picks)
        pred = compute_predictive_budget(trip)

        picks_summary = ", ".join(
            f"**{p['title']}** (₹{float(p.get('estimated_cost') or 0):,.0f}, {p.get('duration', '1.5h')})"
            for p in top_picks
        ) if top_picks else "free local heritage walks and beaches"

        return {
            "text": (
                f"With **₹{user_specified_limit:,.0f}** available (Trip remaining budget: **₹{remaining_budget:,.0f}**, "
                f"projected remaining spend: **₹{pred['estimated_remaining_spend']:,.0f}**), "
                f"here are the best places in **{destination}** that fit comfortably within your budget: "
                f"{picks_summary}. Combined entry cost is just **₹{total_picks_cost:,.0f}**! "
                f"Click **+** on any card below or say *\"Add this place to Day {active_day}\"*."
            ),
            "recommendations": top_picks,
            "action_performed": None,
            "intent": "budget_recommendation",
        }

    # ------------------------------------------------------------
    # INTENT 5: TIME-CONSTRAINED QUERY ("I only have 3 hours. What should I do?")
    # ------------------------------------------------------------
    hours_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b)", lower_msg)
    if hours_match or "short time" in lower_msg or "quick" in lower_msg:
        max_hours = float(hours_match.group(1)) if hours_match else 2.5
        all_suggs = await get_suggested_places(city=destination, exclude_names=existing_titles, limit=12)

        # Anchor coordinates for distance check
        ref_lat = (user_location or {}).get("lat") or (current_items[0].get("latitude") if current_items else 13.0827) or 13.0827
        ref_lon = (user_location or {}).get("lon") or (current_items[0].get("longitude") if current_items else 80.2707) or 80.2707

        fitting = []
        for p in all_suggs:
            act_hrs = parse_duration_hours(p.get("duration", "1.5h"))
            dist_km = haversine_distance(
                float(ref_lat),
                float(ref_lon),
                float(p.get("latitude") or ref_lat),
                float(p.get("longitude") or ref_lon),
            )
            transit_hrs = (dist_km * 1.3) / 28.0
            total_hrs = round(act_hrs + transit_hrs, 1)
            if total_hrs <= max_hours + 0.3:
                p_copy = dict(p)
                p_copy["distanceKm"] = round(dist_km, 1)
                p_copy["total_time_needed_hours"] = total_hrs
                fitting.append(p_copy)

        fitting.sort(key=lambda x: (x.get("distanceKm", 5.0), -float(x.get("rating", 4.5))))
        top_fitting = fitting[:4] if fitting else all_suggs[:3]

        picks_text = ", ".join(
            f"**{p['title']}** ({p.get('duration', '1.5h')} visit, {p.get('distanceKm', 2.5)} km away)"
            for p in top_fitting
        )

        return {
            "text": (
                f"Since you have **{max_hours:g} hours**, I factored in both visit duration and travel time in **{destination}**. "
                f"Best options right now: {picks_text}. "
                f"You can add any of these directly to **Day {active_day}**!"
            ),
            "recommendations": top_fitting,
            "action_performed": None,
            "intent": "time_constrained_recommendation",
        }

    # ------------------------------------------------------------
    # INTENT 6: NEARBY DISCOVERY ("Find something interesting nearby", "What is near me?")
    # ------------------------------------------------------------
    if any(w in lower_msg for w in ["nearby", "near me", "around here", "close by", "interesting", "recommend", "suggest"]):
        ref_lat = (user_location or {}).get("lat") or (current_items[-1].get("latitude") if current_items else 13.0827) or 13.0827
        ref_lon = (user_location or {}).get("lon") or (current_items[-1].get("longitude") if current_items else 80.2707) or 80.2707

        all_suggs = await get_suggested_places(city=destination, exclude_names=existing_titles, limit=12)
        for p in all_suggs:
            p["distanceKm"] = round(
                haversine_distance(
                    float(ref_lat),
                    float(ref_lon),
                    float(p.get("latitude") or ref_lat),
                    float(p.get("longitude") or ref_lon),
                ),
                1,
            )

        rain_prob = int((weather_data or {}).get("rain_probability", 15))
        if rain_prob >= 50:
            all_suggs.sort(key=lambda x: (not bool(x.get("indoor")), x.get("distanceKm", 10.0)))
        else:
            all_suggs.sort(key=lambda x: (x.get("distanceKm", 10.0), -float(x.get("rating", 4.5))))

        nearby_picks = all_suggs[:4]
        picks_desc = ", ".join(
            f"**{p['title']}** ({p.get('distanceKm', 1.8)} km · ★ {p.get('rating', 4.6)})"
            for p in nearby_picks
        )

        return {
            "text": (
                f"Here are top-rated places near your current position in **{destination}** "
                f"(ranked for {weather_data.get('condition', 'current weather') if weather_data else 'today'}): "
                f"{picks_desc}. Click **+** on a card or tell me *\"Add this place to Day {active_day}\"*."
            ),
            "recommendations": nearby_picks,
            "action_performed": None,
            "intent": "nearby_discovery",
        }

    # ------------------------------------------------------------
    # INTENT 7: ROUTE OPTIMIZATION ("Optimize today's route")
    # ------------------------------------------------------------
    if "optimize" in lower_msg or ("route" in lower_msg and ("save" in lower_msg or "better" in lower_msg or "short" in lower_msg)):
        if not current_day_obj:
            return {
                "text": "No active day found to optimize.",
                "recommendations": [],
                "action_performed": None,
                "intent": "optimize_route",
            }
        opt_res = await optimize_day_route(current_day_obj)
        if opt_res.get("already_optimal"):
            return {
                "text": (
                    f"I analyzed **Day {active_day}** ({opt_res['before_distance_km']} km across {len(current_items)} stops). "
                    f"{opt_res['explanation']}"
                ),
                "recommendations": [],
                "action_performed": None,
                "intent": "optimize_route",
            }
        return {
            "text": (
                f"I found a more efficient route for **Day {active_day}**! "
                f"Before: **{opt_res['before_distance_km']} km** → Optimized: **{opt_res['optimized_distance_km']} km** "
                f"(Saves **{opt_res['distance_saved_km']} km** and **~{opt_res['time_saved_min']} minutes**). "
                f"You can review and approve this optimized order on your Itinerary or Dashboard!"
            ),
            "recommendations": [],
            "action_performed": {
                "type": "ROUTE_OPTIMIZATION_PROPOSAL",
                "optimization": opt_res,
            },
            "intent": "optimize_route",
        }

    # ------------------------------------------------------------
    # INTENT 8: WEATHER / HEALTH / SCHEDULE STATUS
    # ------------------------------------------------------------
    health = compute_trip_health_score(trip, weather_data, user_location)
    pred_budget = compute_predictive_budget(trip)
    uncompleted_today = [i for i in current_items if not i.get("completed")]
    next_up = uncompleted_today[0] if uncompleted_today else None
    suggs = await get_suggested_places(city=destination, exclude_names=existing_titles, limit=3)

    for p in suggs:
        p["distanceKm"] = 2.4

    next_up_str = (
        f"Next up on **Day {active_day}** is **{next_up.get('title')}** at **{next_up.get('time', 'flexible time')}**."
        if next_up
        else f"You've completed all scheduled activities for **Day {active_day}**!"
    )

    weather_str = (
        f"Current weather in **{destination}** is **{weather_data.get('temperature', 28)}°C ({weather_data.get('condition', 'Clear')})** "
        f"with **{weather_data.get('rain_probability', 15)}%** rain chance."
        if weather_data
        else f"Weather in **{destination}** looks pleasant."
    )

    return {
        "text": (
            f"**{destination} Trip Status (Health: {health['score']}/100 — {health['overall_label']})**\n"
            f"• {next_up_str}\n"
            f"• {weather_str}\n"
            f"• Budget: **₹{spent_total:,.0f}** spent of **₹{budget_total:,.0f}** (**₹{remaining_budget:,.0f}** remaining · "
            f"Estimated remaining spend: **₹{pred_budget['estimated_remaining_spend']:,.0f}**).\n\n"
            f"You can ask me commands like:\n"
            f"- *\"I have ₹2,000 left. What can I do today?\"*\n"
            f"- *\"I only have 3 hours. What should I do?\"*\n"
            f"- *\"Add {suggs[0]['title'] if suggs else 'Marina Beach'} to Day {active_day}\"*\n"
            f"- *\"Remove tomorrow morning's activity\"*"
        ),
        "recommendations": suggs,
        "action_performed": None,
        "intent": "trip_status_overview",
    }
