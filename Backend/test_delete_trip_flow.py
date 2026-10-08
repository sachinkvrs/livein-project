import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from main import app


async def test_delete_trip_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Setup User 1 (Alice) & User 2 (Bob) ===")
        uid = uuid.uuid4().hex[:4]
        r_u1 = await client.post(
            "/auth/signup",
            json={"name": "Alice User", "email": f"alice_{uid}@test.com", "password": "passalice123"},
        )
        assert r_u1.status_code == 200
        u1_token = r_u1.json()["token"]
        u1_id = r_u1.json()["user"]["id"]

        r_u2 = await client.post(
            "/auth/signup",
            json={"name": "Bob User", "email": f"bob_{uid}@test.com", "password": "passbob123"},
        )
        assert r_u2.status_code == 200
        u2_token = r_u2.json()["token"]
        u2_id = r_u2.json()["user"]["id"]

        print(f"Alice ID: {u1_id}, Bob ID: {u2_id}")

        print("\n=== 2. Alice creates Trip A (Chennai) and Trip B (Goa) ===")
        r_tripA = await client.post(
            "/trips",
            headers={"X-User-Id": u1_token},
            json={"destination": "Chennai", "startDate": "2026-09-12", "endDate": "2026-09-14", "travellers": 2, "tripBudget": 30000},
        )
        assert r_tripA.status_code == 200
        tripA = r_tripA.json()

        r_tripB = await client.post(
            "/trips",
            headers={"X-User-Id": u1_token},
            json={"destination": "Goa", "startDate": "2026-10-01", "endDate": "2026-10-03", "travellers": 2, "tripBudget": 20000},
        )
        assert r_tripB.status_code == 200
        tripB = r_tripB.json()

        print(f"Alice trips created: {tripA['id']} (Chennai), {tripB['id']} (Goa)")

        print("\n=== 3. Bob creates Trip C (Ooty) ===")
        r_tripC = await client.post(
            "/trips",
            headers={"X-User-Id": u2_token},
            json={"destination": "Ooty", "startDate": "2026-11-05", "endDate": "2026-11-07", "travellers": 2, "tripBudget": 15000},
        )
        assert r_tripC.status_code == 200
        tripC = r_tripC.json()
        print(f"Bob trip created: {tripC['id']} (Ooty)")

        print("\n=== 4. Test User Security: Bob tries to delete Alice's Trip A (Expect 403 Forbidden) ===")
        r_hack = await client.delete(
            f"/trips/{tripA['id']}",
            headers={"X-User-Id": u2_token},
        )
        print(f"Bob delete attempt on Alice's trip response code: {r_hack.status_code}")
        assert r_hack.status_code == 403, f"Expected 403, got {r_hack.status_code}: {r_hack.text}"
        print("Security check passed: Unauthorized delete rejected with 403 Forbidden!")

        print("\n=== 5. Alice deletes Trip A (Chennai) successfully ===")
        r_del = await client.delete(
            f"/trips/{tripA['id']}",
            headers={"X-User-Id": u1_token},
        )
        assert r_del.status_code == 200, r_del.text
        del_data = r_del.json()
        print(f"Delete response: {del_data['message']}")
        assert del_data["deleted"] is True

        print("\n=== 6. Verify Trip A is removed and only Trip B remains for Alice ===")
        r_alice_trips = await client.get("/trips", headers={"X-User-Id": u1_token})
        assert r_alice_trips.status_code == 200
        alice_remaining_ids = [t["id"] for t in r_alice_trips.json()]
        print(f"Alice remaining trips: {alice_remaining_ids}")
        assert tripA["id"] not in alice_remaining_ids
        assert tripB["id"] in alice_remaining_ids

        print("\n=== 7. Verify accessing deleted Trip A returns 404 Not Found ===")
        r_not_found = await client.get(f"/trips/{tripA['id']}")
        assert r_not_found.status_code == 404
        print(f"GET /trips/{tripA['id']} returned 404 as expected.")

        print("\n=== 8. Alice deletes Trip B (Last Remaining Trip) ===")
        r_delB = await client.delete(
            f"/trips/{tripB['id']}",
            headers={"X-User-Id": u1_token},
        )
        assert r_delB.status_code == 200
        r_alice_empty = await client.get("/trips", headers={"X-User-Id": u1_token})
        assert r_alice_empty.status_code == 200
        assert len(r_alice_empty.json()) == 0
        print("Alice now has 0 trips (Empty state test passed).")

        print("\n=== 9. Verify Bob's Trip C is untouched ===")
        r_bob_trips = await client.get("/trips", headers={"X-User-Id": u2_token})
        assert r_bob_trips.status_code == 200
        assert len(r_bob_trips.json()) == 1
        assert r_bob_trips.json()[0]["id"] == tripC["id"]
        print(f"Bob's trip {tripC['id']} is completely intact!")

        print("\n ALL DELETE TRIP FUNCTIONALITY & SECURITY TESTS PASSED 100%!")


if __name__ == "__main__":
    asyncio.run(test_delete_trip_flow())
