"""Try-on job route tests."""

from fastapi.testclient import TestClient


def _ensure_profile_and_product(client: TestClient) -> int:
    """Ensure user has profile and a product. Returns product_id."""
    client.post(
        "/profiles",
        json={"height_cm": 170, "fit_preference": "regular", "weight_kg": 70},
    )
    r = client.post(
        "/profiles/me/versions",
        json={
            "front_image_url": "https://example.com/f.jpg",
            "side_image_url": "https://example.com/s.jpg",
        },
    )
    assert r.status_code == 200

    r = client.post(
        "/products/resolve",
        json={
            "sourceSite": "zara",
            "sourceUrl": "https://zara.com/tryon-test",
            "title": "Tryon Product",
            "imageUrl": "https://img.com/p.jpg",
        },
    )
    assert r.status_code == 200
    return r.json()["productId"]


def test_create_tryon_job(client: TestClient) -> None:
    """POST /tryon/jobs creates a queued job."""
    product_id = _ensure_profile_and_product(client)
    r = client.post("/tryon/jobs", json={"productId": product_id})
    assert r.status_code == 200
    data = r.json()
    assert "jobId" in data
    assert data["status"] == "queued"


def test_create_tryon_job_invalid_product(client: TestClient) -> None:
    """POST /tryon/jobs returns 400 for invalid product."""
    _ensure_profile_and_product(client)
    r = client.post("/tryon/jobs", json={"productId": 99999})
    assert r.status_code == 400


def test_get_tryon_job(client: TestClient) -> None:
    """GET /tryon/jobs/{id} returns job status."""
    product_id = _ensure_profile_and_product(client)
    r = client.post("/tryon/jobs", json={"productId": product_id})
    job_id = r.json()["jobId"]

    r = client.get(f"/tryon/jobs/{job_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "queued"
    assert r.json()["id"] == job_id


def test_get_tryon_job_404(client: TestClient) -> None:
    """GET /tryon/jobs/{id} returns 404 for unknown job."""
    r = client.get("/tryon/jobs/99999")
    assert r.status_code == 404


def test_get_tryon_result_not_completed(client: TestClient) -> None:
    """GET /tryon/jobs/{id}/result returns 404 when not completed."""
    product_id = _ensure_profile_and_product(client)
    r = client.post("/tryon/jobs", json={"productId": product_id})
    job_id = r.json()["jobId"]

    r = client.get(f"/tryon/jobs/{job_id}/result")
    assert r.status_code == 404


def test_mock_complete_and_get_result(client: TestClient) -> None:
    """POST mock-complete then GET result returns the result."""
    product_id = _ensure_profile_and_product(client)
    r = client.post("/tryon/jobs", json={"productId": product_id})
    job_id = r.json()["jobId"]

    r = client.post(f"/tryon/jobs/{job_id}/mock-complete")
    assert r.status_code == 200
    data = r.json()
    assert "result_image_url" in data
    assert "mock.tryl.local" in data["result_image_url"]

    r = client.get(f"/tryon/jobs/{job_id}/result")
    assert r.status_code == 200
    assert r.json()["result_image_url"] == data["result_image_url"]
