import os
from starlette.testclient import TestClient
from main import app

client = TestClient(app)

def test_full_backend():
    print("--- 1. Testing Health Check ---")
    res = client.get("/api/health")
    assert res.status_code == 200, res.text
    print("Health check OK:", res.json())

    print("\n--- 2. Testing Login ---")
    login_res = client.post("/api/users/login", json={
        "email": "demo@jeemain.ai",
        "password": "password123"
    })
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Login OK. Token received. Student:", login_res.json()["user"]["full_name"])

    print("\n--- 3. Testing Dashboard Overview ---")
    dash_res = client.get("/api/analysis/dashboard", headers=headers)
    assert dash_res.status_code == 200, dash_res.text
    dash = dash_res.json()
    print("Dashboard OK. Total tests:", dash["total_tests"], "Average Marks:", dash["average_marks"], "Latest:", dash["latest_test_name"])

    print("\n--- 4. Testing Weak Topics Analysis ---")
    weak_res = client.get("/api/analysis/weak-topics", headers=headers)
    assert weak_res.status_code == 200, weak_res.text
    weak_data = weak_res.json()
    print("Weak topics OK. Strongest Subject:", weak_data["strongest_subject"], "Weakest Subject:", weak_data["weakest_subject"], "Weak topics count:", len(weak_data["weak_topics"]))

    print("\n--- 5. Testing Target Predictor ---")
    pred_res = client.get("/api/predictions/target-analysis", headers=headers)
    assert pred_res.status_code == 200, pred_res.text
    pred_data = pred_res.json()
    print("Target Predictor OK. Current avg:", pred_data["current_average_marks"], "Target:", pred_data["target_marks"], "Gap:", pred_data["marks_gap"])

    print("\n--- 6. Testing 7-Day Study Planner ---")
    plan_res = client.get("/api/study-planner", headers=headers)
    assert plan_res.status_code == 200, plan_res.text
    plan_data = plan_res.json()
    print("Study Planner OK. Tasks count:", len(plan_data["tasks"]))

    print("\n--- 7. Testing CSV Upload and Auto-Parser ---")
    csv_file_path = r"c:\jee_main_test_analyzer\sample_tests\allen_mock_test_result.csv"
    with open(csv_file_path, "rb") as f:
        upload_res = client.post(
            "/api/uploads/process",
            headers=headers,
            files={"file": ("allen_mock_test_result.csv", f, "text/csv")}
        )
    assert upload_res.status_code == 200, upload_res.text
    preview = upload_res.json()
    print("Upload & Parse OK! Extracted Test Name:", preview["test_name"], "Subjects:", len(preview["subjects"]), "Questions:", len(preview["questions"]), "Status:", preview["validation_status"])

    print("\n--- 8. Testing Confirm & Save Test ---")
    confirm_payload = {
        "test_name": "Verified " + preview["test_name"],
        "test_date": "2026-01-18",
        "test_type": "Mock Test",
        "shift": "Shift 2",
        "duration_minutes": 180,
        "total_questions": preview["total_questions"],
        "max_marks": preview["max_marks"],
        "marks_obtained": preview["marks_obtained"],
        "subjects": preview["subjects"],
        "questions": preview["questions"][:15]  # save subset
    }
    confirm_res = client.post("/api/uploads/confirm", headers=headers, json=confirm_payload)
    assert confirm_res.status_code == 200, confirm_res.text
    saved = confirm_res.json()
    print("Save Verified Test OK! New Test ID:", saved["id"], "Total Marks:", saved["marks_obtained"], "Accuracy:", saved["overall_accuracy"])

    print("\n=== ALL BACKEND INTEGRATION TESTS PASSED PERFECTLY! ===")

if __name__ == "__main__":
    test_full_backend()
