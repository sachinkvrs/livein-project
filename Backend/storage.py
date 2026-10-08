import json
import os
import uuid
import hmac
import hashlib
import copy
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime

DATA_DIR = Path(__file__).resolve().parent / "data"
TRIPS_FILE = DATA_DIR / "trips.json"
USERS_FILE = DATA_DIR / "users.json"

SECRET_KEY = os.getenv("TRIPNOVA_SECRET_KEY", "tripnova-adaptive-companion-secret-2026")


def _legacy_hash_password(password: str) -> str:
    return hashlib.sha256(f"tripnova_salt_{password}".encode("utf-8")).hexdigest()


def _hash_password(password: str) -> str:
    salt = uuid.uuid4().hex[:16]
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return f"pbkdf2_sha256${salt}${dk.hex()}"


def _verify_password(password: str, stored_hash: str) -> bool:
    if not stored_hash or not password:
        return False
    if stored_hash.startswith("pbkdf2_sha256$"):
        parts = stored_hash.split("$")
        if len(parts) != 3:
            return False
        _, salt, expected_hex = parts
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
        return hmac.compare_digest(dk.hex(), expected_hex)
    # Backward compatibility for existing legacy SHA-256 hashes in users.json
    return hmac.compare_digest(_legacy_hash_password(password), stored_hash)


def create_auth_token(user_id: str) -> str:
    """Creates an HMAC-SHA256 signed session token for the user."""
    sig = hmac.new(SECRET_KEY.encode("utf-8"), user_id.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
    return f"{user_id}.{sig}"


def resolve_user_id_from_token(token_str: Optional[str]) -> Optional[str]:
    """Resolves and verifies a signed token or valid user_id header."""
    if not token_str:
        return None
    clean = token_str.strip()
    if "." in clean:
        user_id, sig = clean.split(".", 1)
        expected_sig = hmac.new(SECRET_KEY.encode("utf-8"), user_id.encode("utf-8"), hashlib.sha256).hexdigest()[:24]
        if hmac.compare_digest(sig, expected_sig):
            return user_id
        return None
    # Support direct user_id header used by existing clients/tests
    return clean


def _ensure_storage():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not TRIPS_FILE.exists():
        with open(TRIPS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=2)
    if not USERS_FILE.exists():
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump({}, f, indent=2)


# ============================================================
# USER STORAGE & AUTH
# ============================================================

def load_all_users() -> Dict[str, Any]:
    _ensure_storage()
    try:
        with open(USERS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[TripNova Storage] Error loading users: {e}")
        return {}


def save_all_users(users: Dict[str, Any]):
    _ensure_storage()
    try:
        with open(USERS_FILE, "w", encoding="utf-8") as f:
            json.dump(users, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[TripNova Storage] Error saving users: {e}")


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    resolved_id = resolve_user_id_from_token(user_id) or user_id
    users = load_all_users()
    user = users.get(resolved_id)
    if user:
        user_copy = dict(user)
        user_copy.pop("password_hash", None)
        return user_copy
    return None


def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    if not email:
        return None
    users = load_all_users()
    clean_email = email.strip().lower()
    for u in users.values():
        if u.get("email", "").strip().lower() == clean_email:
            return u
    return None


def create_user(name: str, email: str, password: str) -> Dict[str, Any]:
    users = load_all_users()
    clean_email = email.strip().lower()
    if get_user_by_email(clean_email):
        raise ValueError(f"User with email '{clean_email}' already exists.")

    user_id = f"user_{uuid.uuid4().hex[:8]}"
    user_data = {
        "id": user_id,
        "name": name.strip(),
        "email": clean_email,
        "password_hash": _hash_password(password),
        "profile_image": None,
        "budget_preference": "Moderate",
        "travel_style": "Balanced",
        "favorite_activities": ["Nature", "Culture", "Food"],
        "learned_preferences": {
            "category_scores": {
                "Adventure": 65,
                "Food": 85,
                "Museums & Culture": 75,
                "Nature & Parks": 80,
                "Beach": 70,
                "Heritage": 70,
                "Shopping": 50,
            },
            "preferred_budget_range": "Moderate",
            "preferred_travel_distance_km": 20.0,
            "preferred_activity_duration_hours": 2.0,
            "food_preferences": ["Local Specialties", "Authentic Dining"],
            "skipped_categories": [],
        },
        "created_at": datetime.utcnow().isoformat(),
    }

    users[user_id] = user_data
    save_all_users(users)

    user_copy = dict(user_data)
    user_copy.pop("password_hash", None)
    return user_copy


def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    user = get_user_by_email(email)
    if not user:
        return None
    stored_hash = user.get("password_hash", "")
    if not _verify_password(password, stored_hash):
        return None

    # Transparently upgrade legacy hash to PBKDF2-SHA256 on successful login
    if not stored_hash.startswith("pbkdf2_sha256$"):
        users = load_all_users()
        uid = user["id"]
        if uid in users:
            users[uid]["password_hash"] = _hash_password(password)
            save_all_users(users)

    user_copy = dict(user)
    user_copy.pop("password_hash", None)
    return user_copy


def update_user(user_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    resolved_id = resolve_user_id_from_token(user_id) or user_id
    users = load_all_users()
    if resolved_id not in users:
        return None

    updates.pop("password_hash", None)
    updates.pop("id", None)

    users[resolved_id].update(updates)
    save_all_users(users)

    user_copy = dict(users[resolved_id])
    user_copy.pop("password_hash", None)
    return user_copy


def record_user_preference_signal(user_id: Optional[str], category: Optional[str], action: str = "select"):
    """
    Updates non-sensitive learned travel preferences when a user selects, completes, or skips an activity.
    """
    if not user_id or not category:
        return
    resolved_id = resolve_user_id_from_token(user_id) or user_id
    users = load_all_users()
    if resolved_id not in users:
        return

    user = users[resolved_id]
    prefs = user.setdefault("learned_preferences", {})
    cat_scores = prefs.setdefault("category_scores", {
        "Adventure": 65,
        "Food": 80,
        "Museums & Culture": 70,
        "Nature & Parks": 75,
        "Beach": 70,
        "Heritage": 65,
        "Shopping": 50,
    })

    c_low = category.lower()
    target_key = "Heritage"
    if "adventure" in c_low or "sport" in c_low:
        target_key = "Adventure"
    elif "food" in c_low or "dining" in c_low:
        target_key = "Food"
    elif "museum" in c_low or "culture" in c_low or "art" in c_low or "science" in c_low:
        target_key = "Museums & Culture"
    elif "nature" in c_low or "park" in c_low or "wildlife" in c_low:
        target_key = "Nature & Parks"
    elif "beach" in c_low:
        target_key = "Beach"
    elif "shop" in c_low:
        target_key = "Shopping"

    cur_val = int(cat_scores.get(target_key, 65))
    if action in ("select", "add", "complete"):
        cat_scores[target_key] = min(100, cur_val + (4 if action == "complete" else 3))
    elif action in ("skip", "remove"):
        cat_scores[target_key] = max(15, cur_val - 4)
        skipped = prefs.setdefault("skipped_categories", [])
        if category not in skipped and cat_scores[target_key] < 40:
            skipped.append(category)

    save_all_users(users)


# ============================================================
# TRIP STORAGE (USER-SCOPED)
# ============================================================

def load_all_trips() -> Dict[str, Any]:
    _ensure_storage()
    try:
        with open(TRIPS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"[TripNova Storage] Error loading trips: {e}")
        return {}


def save_all_trips(trips: Dict[str, Any]):
    _ensure_storage()
    try:
        with open(TRIPS_FILE, "w", encoding="utf-8") as f:
            json.dump(trips, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"[TripNova Storage] Error saving trips: {e}")


def get_trip(trip_id: str) -> Optional[Dict[str, Any]]:
    trips = load_all_trips()
    return trips.get(trip_id)


def list_trips(user_id: Optional[str] = None) -> List[Dict[str, Any]]:
    resolved_id = resolve_user_id_from_token(user_id) if user_id else None
    if not resolved_id:
        return []
    trips = load_all_trips()
    trips_list = [t for t in trips.values() if t.get("user_id") == resolved_id]

    return sorted(
        trips_list,
        key=lambda t: t.get("created_at", ""),
        reverse=True,
    )


def save_trip(trip_data: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    trips = load_all_trips()
    trip_id = trip_data.get("id") or f"trip-{uuid.uuid4().hex[:8]}"
    trip_data["id"] = trip_id
    resolved_uid = resolve_user_id_from_token(user_id) if user_id else None
    if resolved_uid:
        trip_data["user_id"] = resolved_uid
    elif "user_id" not in trip_data:
        trip_data["user_id"] = "guest_user"

    if "created_at" not in trip_data:
        trip_data["created_at"] = datetime.utcnow().isoformat()
    if "expenses" not in trip_data:
        trip_data["expenses"] = []
    if "spent" not in trip_data:
        trip_data["spent"] = sum(e.get("amount", 0) for e in trip_data["expenses"])

    # Preserve original_itinerary for Planned vs Actual tracking (#10)
    if "original_itinerary" not in trip_data and "itinerary" in trip_data:
        trip_data["original_itinerary"] = copy.deepcopy(trip_data["itinerary"])

    trips[trip_id] = trip_data
    save_all_trips(trips)
    return trip_data


def update_trip(trip_id: str, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    trips = load_all_trips()
    if trip_id not in trips:
        return None
    # Never overwrite original_itinerary unless explicitly initializing it
    if "original_itinerary" not in trips[trip_id] and "itinerary" in trips[trip_id]:
        trips[trip_id]["original_itinerary"] = copy.deepcopy(trips[trip_id]["itinerary"])
    trips[trip_id].update(updates)
    save_all_trips(trips)
    return trips[trip_id]


def delete_trip(trip_id: str) -> bool:
    trips = load_all_trips()
    if trip_id in trips:
        del trips[trip_id]
        save_all_trips(trips)
        return True
    return False


def get_expenses(trip_id: str) -> List[Dict[str, Any]]:
    trip = get_trip(trip_id)
    if not trip:
        return []
    return trip.get("expenses", [])


def add_expense(trip_id: str, expense_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    trips = load_all_trips()
    if trip_id not in trips:
        return None

    trip = trips[trip_id]
    if "expenses" not in trip:
        trip["expenses"] = []

    exp_id = expense_data.get("id") or f"exp-{uuid.uuid4().hex[:8]}"
    expense_data["id"] = exp_id
    if not expense_data.get("title"):
        expense_data["title"] = expense_data.get("description") or f"{expense_data.get('category', 'Expense')} expense"
    if not expense_data.get("description"):
        expense_data["description"] = expense_data.get("title", "")
    if "created_at" not in expense_data:
        expense_data["created_at"] = datetime.utcnow().isoformat()
    if "date" not in expense_data or not expense_data["date"]:
        expense_data["date"] = datetime.utcnow().strftime("%Y-%m-%d")

    expense_data["amount"] = float(expense_data.get("amount", 0.0))

    trip["expenses"].append(expense_data)
    trip["spent"] = round(sum(float(e.get("amount", 0)) for e in trip["expenses"]), 2)
    save_all_trips(trips)
    return expense_data


def delete_expense(trip_id: str, expense_id: str) -> bool:
    trips = load_all_trips()
    if trip_id not in trips:
        return False

    trip = trips[trip_id]
    expenses = trip.get("expenses", [])
    initial_len = len(expenses)
    trip["expenses"] = [e for e in expenses if e.get("id") != expense_id]
    if len(trip["expenses"]) != initial_len:
        trip["spent"] = round(sum(float(e.get("amount", 0)) for e in trip["expenses"]), 2)
        save_all_trips(trips)
        return True
    return False
