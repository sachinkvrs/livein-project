import asyncio
from httpx import AsyncClient, ASGITransport
from main import app


async def test_places_and_activities():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Test Places Search for Chennai (Marina Beach) ===")
        r_search = await client.get("/places/search?query=Marina%20Beach&city=Chennai")
        assert r_search.status_code == 200, r_search.text
        places = r_search.json()
        print(f"Found {len(places)} search results for 'Marina Beach':")
        for p in places[:3]:
            print(f"  - {p['title']} ({p['category']}, Rating: {p['rating']}, Lat: {p['latitude']}, Lon: {p['longitude']})")
        assert len(places) > 0
        assert "Marina Beach" in [p["title"] for p in places]

        print("\n=== 2. Test City Suggestions (Chennai vs Mumbai) ===")
        r_sug_chn = await client.get("/places/suggestions?city=Chennai")
        assert r_sug_chn.status_code == 200
        chn_places = [p["title"] for p in r_sug_chn.json()]
        print("Chennai suggestions:", chn_places)
        assert any("Kapaleeshwarar" in name or "Marina" in name or "DakshinaChitra" in name for name in chn_places)

        r_sug_mum = await client.get("/places/suggestions?city=Mumbai")
        assert r_sug_mum.status_code == 200
        mum_places = [p["title"] for p in r_sug_mum.json()]
        print("Mumbai suggestions:", mum_places)
        assert any("Gateway of India" in name or "Marine Drive" in name or "Elephanta" in name for name in mum_places)

        print("\n=== 3. Create a 3-Day Chennai Trip ===")
        r_trip = await client.post(
            "/trips",
            json={
                "destination": "Chennai",
                "startDate": "2026-09-12",
                "endDate": "2026-09-14",
                "travellers": 2,
                "budgetLevel": "Moderate",
                "tripBudget": 30000,
            },
        )
        assert r_trip.status_code == 200
        trip = r_trip.json()
        trip_id = trip["id"]
        initial_day1_items = len(trip["itinerary"][0]["items"])
        initial_dist = trip["itinerary"][0]["distance_km"]
        print(f"Created trip {trip_id}: Day 1 has {initial_day1_items} activities, {initial_dist} km transit")

        print("\n=== 4. Add 'Marina Beach' to Day 1 ===")
        r_add = await client.post(
            f"/trips/{trip_id}/itinerary/activities",
            json={
                "day": 1,
                "title": "Marina Beach",
                "time": "03:30 PM",
                "duration": "2.0h",
                "category": "Beach",
                "area": "Marina, Chennai",
                "latitude": 13.05382,
                "longitude": 80.28271,
                "rating": 4.6,
                "estimated_cost": 200,
                "note": "Famous natural urban beach along Bay of Bengal",
            },
        )
        assert r_add.status_code == 200, r_add.text
        add_data = r_add.json()
        new_act = add_data["activity"]
        updated_day = add_data["day"]
        print(f"Added activity: {new_act['title']} (ID: {new_act['id']})")
        print(f"Day 1 now has: {len(updated_day['items'])} activities (Old: {initial_day1_items})")
        print(f"Day 1 recalculated transit: {updated_day['distance_km']} km, {updated_day['estimated_time_min']} min")
        assert len(updated_day["items"]) == initial_day1_items + 1
        assert any(item["title"] == "Marina Beach" for item in updated_day["items"])

        print("\n=== 5. Verify Persistence in GET /trips/{id} ===")
        r_check = await client.get(f"/trips/{trip_id}")
        assert r_check.status_code == 200
        persisted_day1 = r_check.json()["itinerary"][0]
        assert len(persisted_day1["items"]) == initial_day1_items + 1
        print("Persistence verified: activity exists in stored trip JSON!")

        print("\n=== 6. Delete Activity ===")
        r_del = await client.delete(f"/trips/{trip_id}/itinerary/activities/{new_act['id']}?day=1")
        assert r_del.status_code == 200
        r_after_del = await client.get(f"/trips/{trip_id}")
        day1_after_del = r_after_del.json()["itinerary"][0]
        assert len(day1_after_del["items"]) == initial_day1_items
        print(f"Day 1 items count restored to: {len(day1_after_del['items'])}")

        print("\n ALL PLACES SEARCH, SUGGESTIONS, AND ACTIVITY CRUD TESTS PASSED 100%!")


if __name__ == "__main__":
    asyncio.run(test_places_and_activities())
