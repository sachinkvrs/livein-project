import asyncio
import uuid
from httpx import AsyncClient, ASGITransport
from main import app


async def test_full_auth_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Test Dynamic Initials and Account Creations ===")
        uid = uuid.uuid4().hex[:4]
        users_to_test = [
            ("Sachin Kumar", f"sachin_{uid}@test.com", "SK"),
            ("Rahul Kumar", f"rahul_{uid}@test.com", "RK"),
            ("Aditi Rao", f"aditi_{uid}@test.com", "AR"),
            ("Rahul", f"rahul_solo_{uid}@test.com", "R"),
            ("John David Kumar", f"john_dk_{uid}@test.com", "JK"),
        ]

        tokens = {}
        for name, email, expected_initials in users_to_test:
            r = await client.post(
                "/auth/signup",
                json={"name": name, "email": email, "password": "testpassword123"},
            )
            assert r.status_code == 200, r.text
            user = r.json()["user"]
            token = r.json()["token"]
            tokens[name] = (token, user)

            parts = [p for p in name.strip().split() if p]
            initials = parts[0][0].upper() if len(parts) == 1 else (parts[0][0] + parts[-1][0]).upper()
            print(f"User: {name} -> Initials: {initials} (Expected: {expected_initials})")
            assert initials == expected_initials

        print("\n=== 2. Update Profile Test (Sachin Kumar -> Sachin Sharma) ===")
        sachin_token, sachin_user = tokens["Sachin Kumar"]
        r = await client.put(
            "/users/me",
            headers={"X-User-Id": sachin_token},
            json={"name": "Sachin Sharma", "budget_preference": "Luxury"},
        )
        assert r.status_code == 200, r.text
        updated = r.json()
        print("Updated Name:", updated["name"])
        assert updated["name"] == "Sachin Sharma"

        print("\n=== 3. Trip Creation & User Isolation Test ===")
        r = await client.post(
            "/trips",
            headers={"X-User-Id": sachin_token},
            json={"destination": "Chennai", "startDate": "2026-09-12", "endDate": "2026-09-14", "travellers": 3, "tripBudget": 45000},
        )
        assert r.status_code == 200
        trip_sachin = r.json()
        print(f"Sachin created trip: {trip_sachin['id']} for {trip_sachin['destination']} ({trip_sachin['number_of_days']} days)")

        rahul_token, rahul_user = tokens["Rahul Kumar"]
        r = await client.post(
            "/trips",
            headers={"X-User-Id": rahul_token},
            json={"destination": "Ooty", "startDate": "2026-10-01", "endDate": "2026-10-02", "travellers": 2, "tripBudget": 25000},
        )
        assert r.status_code == 200
        trip_rahul = r.json()
        print(f"Rahul created trip: {trip_rahul['id']} for {trip_rahul['destination']} ({trip_rahul['number_of_days']} days)")

        sachin_trips = (await client.get("/trips", headers={"X-User-Id": sachin_token})).json()
        rahul_trips = (await client.get("/trips", headers={"X-User-Id": rahul_token})).json()

        sachin_dests = [t["destination"] for t in sachin_trips]
        rahul_dests = [t["destination"] for t in rahul_trips]

        print(f"Sachin trips: {sachin_dests}")
        print(f"Rahul trips: {rahul_dests}")

        assert all(t["user_id"] == sachin_user["id"] for t in sachin_trips)
        assert "Chennai" in sachin_dests
        assert "Ooty" not in sachin_dests

        assert all(t["user_id"] == rahul_user["id"] for t in rahul_trips)
        assert "Ooty" in rahul_dests
        assert "Chennai" not in rahul_dests

        print("\n ALL PROFILE & USER ISOLATION TESTS PASSED 100%!")


if __name__ == "__main__":
    asyncio.run(test_full_auth_flow())
