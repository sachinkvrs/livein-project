import asyncio
from httpx import AsyncClient, ASGITransport
from main import app


async def test_full_add_activity_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Create a Trip to Chennai ===")
        r = await client.post(
            "/trips",
            json={
                "destination": "Chennai",
                "startDate": "2026-09-12",
                "endDate": "2026-09-14",
                "travellers": 3,
                "budgetLevel": "Moderate",
                "tripBudget": 45000,
                "interests": ["Culture", "Food"],
            },
        )
        assert r.status_code == 200, r.text
        trip = r.json()
        trip_id = trip["id"]
        initial_day1 = trip["itinerary"][0]
        initial_count = len(initial_day1["items"])
        initial_dist = initial_day1["distance_km"]
        print(f"Trip ID: {trip_id}")
        print(f"Initial Day 1: {initial_count} activities, {initial_dist} km transit")

        print("\n=== 2. Search for 'Marina Beach' in Chennai ===")
        r_search = await client.get("/places/search?query=Marina%20Beach&city=Chennai")
        assert r_search.status_code == 200
        search_results = r_search.json()
        assert len(search_results) > 0
        marina = next(p for p in search_results if "Marina Beach" in p["title"])
        print(f"Found: {marina['title']} at ({marina['latitude']}, {marina['longitude']}) - Rating: {marina['rating']}")
        assert marina["latitude"] is not None and marina["longitude"] is not None

        print("\n=== 3. Add 'Marina Beach' to Day 1 via POST /trips/{id}/itinerary/activities ===")
        r_add = await client.post(
            f"/trips/{trip_id}/itinerary/activities",
            json={
                "day": 1,
                "title": marina["title"],
                "name": marina["name"],
                "place_id": marina["place_id"],
                "category": marina["category"],
                "area": marina["area"],
                "description": marina["description"],
                "estimated_cost": marina["estimated_cost"],
                "latitude": marina["latitude"],
                "longitude": marina["longitude"],
                "rating": marina["rating"],
                "time": "03:30 PM",
                "duration": "2.0h",
            },
        )
        assert r_add.status_code == 200, r_add.text
        add_res = r_add.json()
        updated_day1 = add_res["day"]
        new_act = add_res["activity"]

        print(f"Successfully added: {new_act['title']} (ID: {new_act['id']})")
        print(f"Day 1 items count: {len(updated_day1['items'])} (Initial: {initial_count})")
        print(f"Day 1 recalculated transit: {updated_day1['distance_km']} km, ~{updated_day1['estimated_time_min']} min")
        print(f"Route geometry waypoints count: {len(updated_day1['route_geometry'])}")

        assert len(updated_day1["items"]) == initial_count + 1
        assert any(i["id"] == new_act["id"] for i in updated_day1["items"])
        assert len(updated_day1["route_geometry"]) > 0

        print("\n=== 4. Verify Immediate Persistence (Simulate page refresh) ===")
        r_refresh = await client.get(f"/trips/{trip_id}")
        assert r_refresh.status_code == 200
        refreshed_day1 = r_refresh.json()["itinerary"][0]
        assert len(refreshed_day1["items"]) == initial_count + 1
        print("Page refresh verification: Activity is persistently saved in backend database!")

        print("\n=== 5. Delete Activity ===")
        r_del = await client.delete(f"/trips/{trip_id}/itinerary/activities/{new_act['id']}?day=1")
        assert r_del.status_code == 200
        r_after = await client.get(f"/trips/{trip_id}")
        assert len(r_after.json()["itinerary"][0]["items"]) == initial_count
        print(f"Activity removed cleanly: Day 1 count back to {initial_count}")

        print("\n=== 6. Test Non-Chennai Destination Suggestions (e.g. Mumbai) ===")
        r_mum = await client.get("/places/suggestions?city=Mumbai")
        assert r_mum.status_code == 200
        mum_sug = r_mum.json()
        print(f"Mumbai suggestions count: {len(mum_sug)}")
        print(f"Top Mumbai places: {[p['title'] for p in mum_sug[:3]]}")
        assert any("Gateway" in p["title"] or "Marine" in p["title"] for p in mum_sug)

        print("\n ALL ADD ACTIVITY INTERACTION & ROUTING TESTS PASSED 100%!")


if __name__ == "__main__":
    asyncio.run(test_full_add_activity_flow())
