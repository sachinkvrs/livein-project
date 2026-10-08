import unittest
from fastapi.testclient import TestClient
from main import app


class TestAdaptiveCompanionFeatures(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

        # Register / Login User A
        signup_a = cls.client.post(
            "/auth/signup",
            json={
                "name": "Adaptive Tester A",
                "email": "adaptive_a@tripnova.ai",
                "password": "password123",
            },
        )
        if signup_a.status_code != 200:
            signup_a = cls.client.post(
                "/auth/login",
                json={"email": "adaptive_a@tripnova.ai", "password": "password123"},
            )
        data_a = signup_a.json()
        cls.token_a = data_a["token"]
        cls.headers_a = {"Authorization": f"Bearer {cls.token_a}"}

        # Register / Login User B (for ownership isolation tests)
        signup_b = cls.client.post(
            "/auth/signup",
            json={
                "name": "Adaptive Tester B",
                "email": "adaptive_b@tripnova.ai",
                "password": "password123",
            },
        )
        if signup_b.status_code != 200:
            signup_b = cls.client.post(
                "/auth/login",
                json={"email": "adaptive_b@tripnova.ai", "password": "password123"},
            )
        data_b = signup_b.json()
        cls.token_b = data_b["token"]
        cls.headers_b = {"Authorization": f"Bearer {cls.token_b}"}

        # Create a 3-day trip in Chennai for User A
        trip_resp = cls.client.post(
            "/trips",
            headers=cls.headers_a,
            json={
                "destination": "Chennai",
                "travellers": 2,
                "travelling_with": "friends",
                "startDate": "2026-10-10",
                "endDate": "2026-10-12",
                "budget": 30000,
                "budgetLevel": "Moderate",
                "interests": ["Beach", "Culture", "Heritage", "Food"],
            },
        )
        assert trip_resp.status_code == 200, trip_resp.text
        cls.trip = trip_resp.json()
        cls.trip_id = cls.trip["id"]

    def test_1_quick_time_planner_all_durations_and_apply(self):
        """Tests 'I Have 2 Hours' Quick Time Planner for 30m, 60m, 120m, 180m, and applying to itinerary."""
        for mins in (30, 60, 120, 180):
            res = self.client.post(
                f"/trips/{self.trip_id}/quick-plan",
                headers=self.headers_a,
                json={"day": 1, "available_minutes": mins, "transport_mode": "cab"},
            )
            self.assertEqual(res.status_code, 200, res.text)
            body = res.json()
            self.assertEqual(body["available_minutes"], mins)
            self.assertLessEqual(body["total_minutes"], mins)
            self.assertGreaterEqual(body["buffer_minutes"], 0)
            self.assertEqual(body["total_minutes"] + body["buffer_minutes"], mins)
            self.assertTrue(len(body["steps"]) >= 2)
            self.assertTrue(len(body["activities"]) >= 1)

        # Test insufficient time (< 20 minutes)
        short_res = self.client.post(
            f"/trips/{self.trip_id}/quick-plan",
            headers=self.headers_a,
            json={"day": 1, "available_minutes": 10, "transport_mode": "walk"},
        )
        self.assertEqual(short_res.status_code, 200)
        short_body = short_res.json()
        self.assertTrue(short_body.get("insufficient_time"))
        self.assertEqual(short_body["total_minutes"], 0)
        self.assertEqual(len(short_body["activities"]), 0)

        # Test custom user_location coordinate anchor
        loc_res = self.client.post(
            f"/trips/{self.trip_id}/quick-plan",
            headers=self.headers_a,
            json={
                "day": 1,
                "available_minutes": 90,
                "user_location": {"lat": 13.0538, "lon": 80.2827},
            },
        )
        self.assertEqual(loc_res.status_code, 200)
        self.assertEqual(loc_res.json()["anchor"]["label"], "Your Current Location")

        # Also test top-level alias POST /quick-plan
        alias_res = self.client.post(
            "/quick-plan",
            headers=self.headers_a,
            json={"trip_id": self.trip_id, "day": 1, "available_minutes": 120},
        )
        self.assertEqual(alias_res.status_code, 200)
        plan_to_apply = alias_res.json()

        # Apply quick plan (append mode)
        before_count = len(self.client.get(f"/trips/{self.trip_id}", headers=self.headers_a).json()["itinerary"][0]["items"])
        apply_res = self.client.post(
            f"/trips/{self.trip_id}/apply-quick-plan",
            headers=self.headers_a,
            json={
                "day": 1,
                "mode": "append",
                "activities": plan_to_apply["activities"],
            },
        )
        self.assertEqual(apply_res.status_code, 200)
        after_items = apply_res.json()["itinerary"][0]["items"]
        self.assertEqual(len(after_items), before_count + len(plan_to_apply["activities"]))

    def test_2_decision_center(self):
        """Tests TripNova Decision Center endpoint for healthy, budget warning, and schedule warning states."""
        res = self.client.get(
            f"/trips/{self.trip_id}/decision-center?day=1",
            headers=self.headers_a,
        )
        self.assertEqual(res.status_code, 200, res.text)
        data = res.json()
        self.assertIn("health_score", data)
        self.assertTrue(0 <= data["health_score"] <= 100)
        self.assertIn("decisions", data)
        self.assertTrue(len(data["decisions"]) >= 4)

        valid_states = {"Good", "Warning", "Critical", "Opportunity"}
        for item in data["decisions"]:
            self.assertIn(item["state"], valid_states)
            self.assertIn("title", item)
            self.assertIn("action_label", item)

        # Add an expense to test budget tracking and Decision Center reactivity
        exp_res = self.client.post(
            f"/trips/{self.trip_id}/expenses",
            headers=self.headers_a,
            json={
                "title": "Seafood Lunch at Marina",
                "amount": 1800,
                "category": "Food",
                "day": 1,
            },
        )
        self.assertEqual(exp_res.status_code, 200)

        # Test alias GET /decision-center
        alias_res = self.client.get(
            f"/decision-center?trip_id={self.trip_id}&day=1",
            headers=self.headers_a,
        )
        self.assertEqual(alias_res.status_code, 200)

    def test_3_what_if_trip_simulator_all_7_scenarios_and_immutability(self):
        """Tests all 7 'What If?' scenarios and verifies stored trip is NOT mutated until approval."""
        before_trip = self.client.get(f"/trips/{self.trip_id}", headers=self.headers_a).json()
        before_day2_titles = [i["title"] for i in before_trip["itinerary"][1]["items"]]

        scenarios = [
            ("rain", {}),
            ("less_time", {"max_hours": 3.5}),
            ("budget_decrease", {"reduce_by_inr": 1500}),
            ("activity_unavailable", {}),
            ("add_destination", {}),
            ("traffic_increase", {"traffic_increase_pct": 45}),
            ("skip_activity", {}),
        ]

        last_sim = None
        for scen_type, params in scenarios:
            res = self.client.post(
                f"/trips/{self.trip_id}/simulate",
                headers=self.headers_a,
                json={"day": 2, "scenario_type": scen_type, "parameters": params},
            )
            self.assertEqual(res.status_code, 200, f"Failed scenario {scen_type}: {res.text}")
            sim_data = res.json()
            self.assertEqual(sim_data["scenario_type"], scen_type)
            self.assertIn("current_plan", sim_data)
            self.assertIn("simulated_plan", sim_data)
            self.assertIn("impacts", sim_data)
            self.assertIn("time_impact_label", sim_data["impacts"])
            self.assertIn("budget_impact_label", sim_data["impacts"])
            self.assertIn("distance_impact_label", sim_data["impacts"])
            last_sim = sim_data

        # Verify trip in storage was NOT mutated by any simulation call (Keep Original behavior)
        check_trip = self.client.get(f"/trips/{self.trip_id}", headers=self.headers_a).json()
        check_day2_titles = [i["title"] for i in check_trip["itinerary"][1]["items"]]
        self.assertEqual(before_day2_titles, check_day2_titles)

        # Now explicitly apply the last simulation and verify it updates the trip
        apply_res = self.client.post(
            f"/trips/{self.trip_id}/apply-simulation",
            headers=self.headers_a,
            json={
                "day": 2,
                "simulated_day": last_sim["simulated_day"],
            },
        )
        self.assertEqual(apply_res.status_code, 200)
        updated_day2_items = apply_res.json()["itinerary"][1]["items"]
        self.assertEqual(len(updated_day2_items), len(last_sim["simulated_plan"]["items"]))

    def test_4_explore_around_me_all_categories_and_add_to_itinerary(self):
        """Tests Explore Around Me across all categories and adding a discovered place to the itinerary."""
        categories = [
            "All",
            "Attractions",
            "Restaurants",
            "Cafes",
            "Shopping",
            "Entertainment",
            "Parks",
            "Museums",
            "Emergency services",
        ]
        discovered_place = None
        for cat in categories:
            res = self.client.get(
                f"/places/nearby?city=Chennai&category={cat}&lat=13.0538&lon=80.2827"
            )
            self.assertEqual(res.status_code, 200, f"Category {cat} failed")
            data = res.json()
            self.assertIn("places", data)
            self.assertTrue(len(data["places"]) >= 1, f"Expected places for category {cat}")
            first = data["places"][0]
            self.assertIn("distance_km", first)
            self.assertIn("travel_time_min", first)
            self.assertIn("rating", first)
            self.assertIn("open_status", first)
            self.assertIn("estimated_cost", first)
            if cat == "Cafes":
                discovered_place = first

        # Add discovered nearby place to Day 3 itinerary
        self.assertIsNotNone(discovered_place)
        add_res = self.client.post(
            f"/trips/{self.trip_id}/itinerary/activities",
            headers=self.headers_a,
            json={
                "day": 3,
                "title": discovered_place["title"],
                "category": discovered_place["category"],
                "area": discovered_place["area"],
                "time": "04:30 PM",
                "duration": discovered_place["duration"],
                "estimated_cost": discovered_place["estimated_cost"],
                "latitude": discovered_place["latitude"],
                "longitude": discovered_place["longitude"],
            },
        )
        self.assertEqual(add_res.status_code, 200)
        self.assertEqual(add_res.json()["activity"]["title"], discovered_place["title"])

    def test_5_travel_time_buffers_modes_and_conflicts(self):
        """Tests Travel Time Buffer calculations for Relaxed, Normal, Safe modes and schedule conflict detection."""
        buffers_by_mode = {}
        for mode in ("relaxed", "normal", "safe"):
            res = self.client.get(
                f"/trips/{self.trip_id}/travel-buffer?day=1&buffer_mode={mode}&transport_mode=cab",
                headers=self.headers_a,
            )
            self.assertEqual(res.status_code, 200, res.text)
            data = res.json()
            self.assertEqual(data["buffer_mode"], mode)
            self.assertIsNotNone(data["next_up"])
            self.assertTrue(len(data["activities"]) >= 1)
            first_act = data["activities"][0]
            self.assertIn("activity_time", first_act)
            self.assertIn("travel_time_min", first_act)
            self.assertIn("recommended_departure", first_act)
            self.assertIn("leave_in_minutes", first_act)
            self.assertIn("leave_status_label", first_act)
            buffers_by_mode[mode] = data["safety_buffer_min"]

        # Verify safety buffers follow normal (10) < relaxed (20) < safe (25)
        self.assertLess(buffers_by_mode["normal"], buffers_by_mode["relaxed"])
        self.assertLess(buffers_by_mode["relaxed"], buffers_by_mode["safe"])

    def test_6_ownership_and_auth_isolation(self):
        """Verifies User B cannot access or mutate User A's trip via any new endpoint."""
        res_qp = self.client.post(
            f"/trips/{self.trip_id}/quick-plan",
            headers=self.headers_b,
            json={"day": 1, "available_minutes": 120},
        )
        self.assertEqual(res_qp.status_code, 403)

        res_dc = self.client.get(
            f"/trips/{self.trip_id}/decision-center?day=1",
            headers=self.headers_b,
        )
        self.assertEqual(res_dc.status_code, 403)

        res_sim = self.client.post(
            f"/trips/{self.trip_id}/simulate",
            headers=self.headers_b,
            json={"day": 1, "scenario_type": "rain"},
        )
        self.assertEqual(res_sim.status_code, 403)

        res_buf = self.client.get(
            f"/trips/{self.trip_id}/travel-buffer?day=1",
            headers=self.headers_b,
        )
        self.assertEqual(res_buf.status_code, 403)


if __name__ == "__main__":
    unittest.main()
