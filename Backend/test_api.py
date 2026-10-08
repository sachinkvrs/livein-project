import asyncio
from httpx import AsyncClient, ASGITransport
from main import app


async def run_tests():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Health check ===")
        r = await client.get("/health")
        assert r.status_code == 200, r.text
        print("Health:", r.json())

        print("\n=== 2. Create Trip (Chennai, 5 days, 3 travellers, 50000 budget) ===")
        payload = {
            "destination": "Chennai",
            "category": "Beach",
            "travellers": 3,
            "startDate": "2026-09-12",
            "endDate": "2026-09-16",
            "duration": "5 Days",
            "tripBudget": 50000,
            "interests": ["Culture", "Food", "History"],
        }
        r = await client.post("/trips", json=payload)
        assert r.status_code == 200, r.text
        trip = r.json()
        trip_id = trip["id"]
        print(f"Created Trip ID: {trip_id}")
        print(f"Destination: {trip['destination']}, Days: {trip['days']}, Travellers: {trip['travellers']}, Budget: {trip['budget']}")
        print(f"Itinerary days count: {len(trip['itinerary'])}")
        assert len(trip["itinerary"]) == 5, "Expected 5 days"
        day1 = trip["itinerary"][0]
        print(f"Day 1 items count: {len(day1['items'])}")
        print(f"Day 1 first stop: {day1['items'][0]['title']} at ({day1['items'][0]['latitude']}, {day1['items'][0]['longitude']})")
        print(f"Day 1 route distance: {day1['distance_km']} km, est time: {day1['estimated_time_min']} min")
        assert day1["items"][0]["latitude"] is not None

        print("\n=== 3. Live Weather ===")
        r = await client.get(f"/trips/{trip_id}/weather")
        assert r.status_code == 200, r.text
        weather = r.json()
        print("Weather response:", weather)
        assert "tempC" in weather or "temp_c" in weather

        print("\n=== 4. Expense Tracking ===")
        r = await client.post(
            f"/trips/{trip_id}/expenses",
            json={"category": "Food", "amount": 1500.0, "title": "Seafood Dinner"},
        )
        assert r.status_code == 200, r.text
        exp_res = r.json()
        print("Expense added:", exp_res)
        assert exp_res["spent"] == 1500.0

        r = await client.get(f"/trips/{trip_id}/expenses")
        assert r.status_code == 200, r.text
        expenses = r.json()
        assert len(expenses) == 1
        print(f"Expenses list verified: {len(expenses)} item")

        print("\n=== 5. Route for Day 1 ===")
        r = await client.get(f"/trips/{trip_id}/route?day=1")
        assert r.status_code == 200, r.text
        route = r.json()
        print(f"Route calculated: {route['distance_km']} km, waypoints: {route['places_count']}")

        print("\n=== 6. Simulate Weather Alert & Replanning ===")
        r = await client.post(f"/trips/{trip_id}/simulate-alert", json={"day": 1})
        assert r.status_code == 200, r.text
        alert_res = r.json()
        print("Alert simulated:", alert_res["alert"]["title"])
        print("Proposed day replanned items count:", len(alert_res["proposed_day"]["items"]))
        print("First indoor alternative:", alert_res["proposed_day"]["items"][0]["title"])

        print("\n=== 7. Accept Replan ===")
        r = await client.post(f"/trips/{trip_id}/accept-replan?day_number=1")
        assert r.status_code == 200, r.text
        accepted = r.json()
        print("Replan accepted. Updated Day 1 places:", [i["title"] for i in accepted["itinerary"][0]["items"]])

        print("\n=== 8. List Trips ===")
        r = await client.get("/trips")
        assert r.status_code == 200, r.text
        trips = r.json()
        print(f"Total trips in storage: {len(trips)}")
        assert len(trips) >= 1

        print("\n ALL 8 BACKEND TESTS PASSED PERFECTLY!")


if __name__ == "__main__":
    asyncio.run(run_tests())
