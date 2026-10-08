import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from main import app


async def test_separated_dashboard_and_map_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Signup and Authenticate User ===")
        uid = uuid.uuid4().hex[:4]
        r_auth = await client.post(
            "/auth/signup",
            json={"name": "Siddharth Verma", "email": f"sid_{uid}@test.com", "password": "passsidverma123"},
        )
        assert r_auth.status_code == 200
        token = r_auth.json()["token"]

        print("\n=== 2. Create Dynamic 4-Day Chennai Trip ===")
        r_trip = await client.post(
            "/trips",
            headers={"X-User-Id": token},
            json={
                "destination": "Chennai",
                "startDate": "2026-09-12",
                "endDate": "2026-09-15",
                "travellers": 3,
                "budgetLevel": "Moderate",
                "tripBudget": 60000,
                "interests": ["Culture", "Beach", "Food"],
            },
        )
        assert r_trip.status_code == 200
        trip = r_trip.json()
        trip_id = trip["id"]
        print(f"Created trip: {trip_id}, Destination: {trip['destination']}, Days: {trip['number_of_days']}, Travellers: {trip['travellers']}")

        print("\n=== 3. Verify Dashboard Data Integrity ===")
        assert trip["destination"] == "Chennai"
        assert trip["number_of_days"] == 4
        assert trip["travellers"] == 3
        assert trip["budget"] == 60000.0
        assert trip["spent"] == 0.0
        initial_day1_items = len(trip["itinerary"][0]["items"])
        print(f"Dashboard initial state: 0 spent, Day 1 has {initial_day1_items} activities")

        print("\n=== 4. Add Expense (Simulate Dashboard Budget Update) ===")
        r_exp = await client.post(
            f"/trips/{trip_id}/expenses",
            headers={"X-User-Id": token},
            json={"title": "Local Transport Cab", "category": "Transport", "amount": 1800.0},
        )
        assert r_exp.status_code == 200
        exp_data = r_exp.json()
        print(f"Expense added: INR {exp_data['expense']['amount']}, Total Spent: INR {exp_data['spent']}")
        assert exp_data["spent"] == 1800.0

        print("\n=== 5. Verify Live Weather API for Dashboard ===")
        r_weather = await client.get(f"/trips/{trip_id}/weather")
        assert r_weather.status_code == 200
        w = r_weather.json()
        print(f"Weather in {trip['destination']}: {w.get('temperature')}°C, Condition: {w.get('condition')}, Rain Chance: {w.get('rain_probability')}%")
        assert "temperature" in w
        assert "condition" in w

        print("\n=== 6. Verify Map Page Place Search & Waypoint Coordinates ===")
        r_search = await client.get("/places/search?query=Kapaleeshwarar&city=Chennai")
        assert r_search.status_code == 200
        places = r_search.json()
        assert len(places) > 0
        kapaleeshwarar = places[0]
        print(f"Map Place Search Result: {kapaleeshwarar['title']} at ({kapaleeshwarar['latitude']}, {kapaleeshwarar['longitude']})")
        assert kapaleeshwarar["latitude"] is not None and kapaleeshwarar["longitude"] is not None

        print("\n=== 7. Add Activity from Map to Day 1 & Recalculate Route ===")
        r_add = await client.post(
            f"/trips/{trip_id}/itinerary/activities",
            headers={"X-User-Id": token},
            json={
                "day": 1,
                "title": kapaleeshwarar["title"],
                "name": kapaleeshwarar["name"],
                "category": kapaleeshwarar["category"],
                "area": kapaleeshwarar["area"],
                "latitude": kapaleeshwarar["latitude"],
                "longitude": kapaleeshwarar["longitude"],
                "time": "04:30 PM",
                "duration": "1.5h",
                "rating": kapaleeshwarar["rating"],
            },
        )
        assert r_add.status_code == 200
        add_res = r_add.json()
        updated_day1 = add_res["day"]
        print(f"Day 1 items count after addition: {len(updated_day1['items'])} (Old: {initial_day1_items})")
        print(f"Day 1 OSRM transit route: {updated_day1['distance_km']} km, ~{updated_day1['estimated_time_min']} min, {len(updated_day1['route_geometry'])} waypoints")
        assert len(updated_day1["items"]) == initial_day1_items + 1
        assert len(updated_day1["route_geometry"]) > 0

        print("\n=== 8. Verify Dashboard Reflects New Activity Count and Map Sync ===")
        r_check = await client.get(f"/trips/{trip_id}", headers={"X-User-Id": token})
        assert r_check.status_code == 200
        fresh_trip = r_check.json()
        total_activities = sum(len(d["items"]) for d in fresh_trip["itinerary"])
        print(f"Synchronized Total Trip Activities: {total_activities}")
        assert total_activities > 0

        print("\n ALL DASHBOARD & MAP SEPARATION AND DATA SYNCHRONIZATION TESTS PASSED 100%!")


if __name__ == "__main__":
    asyncio.run(test_separated_dashboard_and_map_flow())
