import asyncio
from httpx import AsyncClient, ASGITransport
from main import app


async def test_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        print("=== 1. Signup User 1 (Sachin Kumar) ===")
        r1 = await client.post(
            "/auth/signup",
            json={
                "name": "Sachin Kumar",
                "email": "sachin@test.com",
                "password": "secretpassword123",
            },
        )
        assert r1.status_code == 200, r1.text
        u1 = r1.json()["user"]
        t1 = r1.json()["token"]
        print(f"User 1 created: ID={u1['id']}, Name={u1['name']}, Email={u1['email']}")
        assert "password" not in u1 and "password_hash" not in u1

        print("\n=== 2. Signup User 2 (Rahul Kumar) ===")
        r2 = await client.post(
            "/auth/signup",
            json={
                "name": "Rahul Kumar",
                "email": "rahul@test.com",
                "password": "rahulpassword123",
            },
        )
        assert r2.status_code == 200, r2.text
        u2 = r2.json()["user"]
        t2 = r2.json()["token"]
        print(f"User 2 created: ID={u2['id']}, Name={u2['name']}, Email={u2['email']}")

        print("\n=== 3. Login User 1 ===")
        login_res = await client.post(
            "/auth/login",
            json={"email": "sachin@test.com", "password": "secretpassword123"},
        )
        assert login_res.status_code == 200, login_res.text
        print("Login OK for:", login_res.json()["user"]["name"])

        print("\n=== 4. GET /users/me for User 1 ===")
        me_res = await client.get("/users/me", headers={"X-User-Id": t1})
        assert me_res.status_code == 200, me_res.text
        print("Me response:", me_res.json())
        assert me_res.json()["name"] == "Sachin Kumar"

        print("\n=== 5. Update Profile (Name & Travel Style) ===")
        update_res = await client.put(
            "/users/me",
            headers={"X-User-Id": t1},
            json={"name": "Sachin K.", "travel_style": "Adventure"},
        )
        assert update_res.status_code == 200, update_res.text
        print("Updated user:", update_res.json())
        assert update_res.json()["name"] == "Sachin K."

        print("\n=== 6. Create Trip for User 1 ===")
        trip1_res = await client.post(
            "/trips",
            headers={"X-User-Id": t1},
            json={
                "destination": "Goa",
                "category": "Beach",
                "travellers": 2,
                "duration": "3 Days",
                "tripBudget": 30000,
            },
        )
        assert trip1_res.status_code == 200, trip1_res.text
        trip1 = trip1_res.json()
        print(f"Trip 1 created for {u1['name']}: {trip1['id']} ({trip1['destination']})")

        print("\n=== 7. Create Trip for User 2 ===")
        trip2_res = await client.post(
            "/trips",
            headers={"X-User-Id": t2},
            json={
                "destination": "Munnar",
                "category": "Nature & Parks",
                "travellers": 4,
                "duration": "2 Days",
                "tripBudget": 25000,
            },
        )
        assert trip2_res.status_code == 200, trip2_res.text
        trip2 = trip2_res.json()
        print(f"Trip 2 created for {u2['name']}: {trip2['id']} ({trip2['destination']})")

        print("\n=== 8. Verify Trip Isolation between User 1 and User 2 ===")
        u1_trips = await client.get("/trips", headers={"X-User-Id": t1})
        assert u1_trips.status_code == 200
        u1_destinations = [t["destination"] for t in u1_trips.json()]
        print(f"User 1 ({u1['name']}) trips:", u1_destinations)
        assert "Goa" in u1_destinations
        assert "Munnar" not in u1_destinations

        u2_trips = await client.get("/trips", headers={"X-User-Id": t2})
        assert u2_trips.status_code == 200
        u2_destinations = [t["destination"] for t in u2_trips.json()]
        print(f"User 2 ({u2['name']}) trips:", u2_destinations)
        assert "Munnar" in u2_destinations
        assert "Goa" not in u2_destinations

        print("\n ALL AUTH & USER-TRIP ISOLATION TESTS PASSED!")


if __name__ == "__main__":
    asyncio.run(test_auth())
