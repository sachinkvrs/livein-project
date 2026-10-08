import asyncio
from httpx import AsyncClient, ASGITransport
from main import app, calculate_trip_days


async def test_date_flow():
    print("=== 1. Test Date Calculation Helper ===")
    assert calculate_trip_days("2026-09-12", "2026-09-16") == 5, "12 to 16 should be 5 days"
    assert calculate_trip_days("2026-09-12", "2026-09-12") == 1, "Same day should be 1 day"
    assert calculate_trip_days("2026-09-12", "2026-09-14") == 3, "12 to 14 should be 3 days"
    print("Date calculation helper verified: 12-09-2026 to 16-09-2026 -> 5 days OK!")

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("\n=== 2. Create Trip Without Category & Without Manual Duration ===")
        payload = {
            "destination": "Chennai",
            "travellers": 3,
            "travelling_with": "friends",
            "startDate": "2026-09-12",
            "endDate": "2026-09-16",
            "budgetLevel": "Moderate",
            "preferred_time": "morning",
            "tripBudget": 50000,
            "interests": ["Culture", "Food", "History"],
        }
        r = await client.post("/trips", json=payload)
        assert r.status_code == 200, r.text
        trip = r.json()

        print(f"Created Trip ID: {trip['id']}")
        print(f"Destination: {trip['destination']}")
        print(f"Calculated Days: {trip['number_of_days']} (Expected: 5)")
        print(f"Itinerary Days: {len(trip['itinerary'])}")

        assert trip["number_of_days"] == 5, f"Expected 5 days, got {trip['number_of_days']}"
        assert len(trip["itinerary"]) == 5, f"Expected 5 days in itinerary, got {len(trip['itinerary'])}"

        for day in trip["itinerary"]:
            day_num = day["day"]
            items_count = len(day["items"])
            first_title = day["items"][0]["title"] if day["items"] else "None"
            print(f"  Day {day_num}: {items_count} activities (First: {first_title})")
            assert items_count > 0

        print("\n=== 3. Verify Trip Retrieval in Dashboard / Itinerary APIs ===")
        r_get = await client.get(f"/trips/{trip['id']}")
        assert r_get.status_code == 200
        assert r_get.json()["number_of_days"] == 5

        print("\n ALL AUTOMATIC DURATION & PLAN TRIP FLOW TESTS PASSED 100%!")


if __name__ == "__main__":
    asyncio.run(test_date_flow())
