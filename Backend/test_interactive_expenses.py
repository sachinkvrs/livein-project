import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from main import app


async def test_full_interactive_expenses_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Setup User 1 (Alice) & User 2 (Bob) ===")
        uid = uuid.uuid4().hex[:4]
        r_u1 = await client.post(
            "/auth/signup",
            json={"name": "Alice Traveler", "email": f"alice_exp_{uid}@test.com", "password": "alicepass123"},
        )
        assert r_u1.status_code == 200
        u1_token = r_u1.json()["token"]

        r_u2 = await client.post(
            "/auth/signup",
            json={"name": "Bob Traveler", "email": f"bob_exp_{uid}@test.com", "password": "bobpass123"},
        )
        assert r_u2.status_code == 200
        u2_token = r_u2.json()["token"]

        print("\n=== 2. Alice creates Chennai Trip (Budget: INR 10,000) & Goa Trip (Budget: INR 20,000) ===")
        r_chn = await client.post(
            "/trips",
            headers={"X-User-Id": u1_token},
            json={
                "destination": "Chennai",
                "startDate": "2026-09-12",
                "endDate": "2026-09-14",
                "tripBudget": 10000,
            },
        )
        assert r_chn.status_code == 200
        chennai_trip_id = r_chn.json()["id"]

        r_goa = await client.post(
            "/trips",
            headers={"X-User-Id": u1_token},
            json={
                "destination": "Goa",
                "startDate": "2026-10-01",
                "endDate": "2026-10-03",
                "tripBudget": 20000,
            },
        )
        assert r_goa.status_code == 200
        goa_trip_id = r_goa.json()["id"]

        print(f"Chennai Trip ID: {chennai_trip_id}, Goa Trip ID: {goa_trip_id}")

        print("\n=== 3. Add INR 500 Food expense to Chennai Trip ===")
        r_exp1 = await client.post(
            f"/trips/{chennai_trip_id}/expenses",
            headers={"X-User-Id": u1_token},
            json={
                "category": "Food",
                "amount": 500.0,
                "title": "Lunch at Marina Beach",
                "date": "2026-09-12",
            },
        )
        assert r_exp1.status_code == 200, r_exp1.text
        exp1_data = r_exp1.json()
        exp1_id = exp1_data["expense"]["id"]
        print(f"Added expense: {exp1_data['expense']['title']}, Amount: INR {exp1_data['expense']['amount']}")
        print(f"Spent so far: INR {exp1_data['spent']} / INR {exp1_data['budget']}")
        assert exp1_data["spent"] == 500.0
        assert exp1_data["budget"] == 10000.0

        print("\n=== 4. Add INR 1,000 Transport expense to Chennai Trip ===")
        r_exp2 = await client.post(
            f"/trips/{chennai_trip_id}/expenses",
            headers={"X-User-Id": u1_token},
            json={
                "category": "Transport",
                "amount": 1000.0,
                "title": "Airport Cab",
                "date": "2026-09-12",
            },
        )
        assert r_exp2.status_code == 200
        exp2_data = r_exp2.json()
        print(f"Spent so far: INR {exp2_data['spent']} / INR {exp2_data['budget']} (15% used)")
        assert exp2_data["spent"] == 1500.0

        print("\n=== 5. Add INR 700 Food expense to Goa Trip ===")
        r_exp_goa = await client.post(
            f"/trips/{goa_trip_id}/expenses",
            headers={"X-User-Id": u1_token},
            json={
                "category": "Food",
                "amount": 700.0,
                "title": "Beach Shack Dinner",
                "date": "2026-10-01",
            },
        )
        assert r_exp_goa.status_code == 200
        goa_data = r_exp_goa.json()
        assert goa_data["spent"] == 700.0

        print("\n=== 6. Verify Trip Expense Isolation (No Mixing Between Trips) ===")
        r_chn_list = await client.get(f"/trips/{chennai_trip_id}/expenses", headers={"X-User-Id": u1_token})
        assert r_chn_list.status_code == 200
        chn_expenses = r_chn_list.json()
        print(f"Chennai expenses count: {len(chn_expenses)} (Total: INR {sum(e['amount'] for e in chn_expenses)})")
        assert len(chn_expenses) == 2
        assert sum(e["amount"] for e in chn_expenses) == 1500.0

        r_goa_list = await client.get(f"/trips/{goa_trip_id}/expenses", headers={"X-User-Id": u1_token})
        assert r_goa_list.status_code == 200
        goa_expenses = r_goa_list.json()
        print(f"Goa expenses count: {len(goa_expenses)} (Total: INR {sum(e['amount'] for e in goa_expenses)})")
        assert len(goa_expenses) == 1
        assert goa_expenses[0]["amount"] == 700.0

        print("\n=== 7. Test User Ownership Security: Bob tries to add expense to Alice's trip (Expect 403) ===")
        r_hack = await client.post(
            f"/trips/{chennai_trip_id}/expenses",
            headers={"X-User-Id": u2_token},
            json={"category": "Food", "amount": 999.0, "title": "Unauthorized Expense"},
        )
        print(f"Bob attempt response status: {r_hack.status_code}")
        assert r_hack.status_code == 403

        print("\n=== 8. Amount Validation Test: Negative or Zero Amount (Expect 400) ===")
        r_invalid = await client.post(
            f"/trips/{chennai_trip_id}/expenses",
            headers={"X-User-Id": u1_token},
            json={"category": "Food", "amount": -100.0, "title": "Invalid Negative Expense"},
        )
        assert r_invalid.status_code == 400

        print("\n=== 9. Delete INR 500 Food expense from Chennai Trip ===")
        r_del = await client.delete(
            f"/trips/{chennai_trip_id}/expenses/{exp1_id}",
            headers={"X-User-Id": u1_token},
        )
        assert r_del.status_code == 200
        del_data = r_del.json()
        print(f"Delete response: {del_data}")
        print(f"Spent after deletion: INR {del_data['spent']}")
        assert del_data["spent"] == 1000.0

        print("\n=== 10. Persistence Verification (Simulate Page Reload) ===")
        r_refresh = await client.get(f"/trips/{chennai_trip_id}", headers={"X-User-Id": u1_token})
        assert r_refresh.status_code == 200
        persisted = r_refresh.json()
        assert persisted["spent"] == 1000.0
        assert len(persisted["expenses"]) == 1
        assert persisted["expenses"][0]["title"] == "Airport Cab"
        print("Persistence verified: Database reflects correct recalculation!")

        print("\n ALL INTERACTIVE EXPENSES & BUDGET TESTS PASSED 100%!")


if __name__ == "__main__":
    asyncio.run(test_full_interactive_expenses_flow())
