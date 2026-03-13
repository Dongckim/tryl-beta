"""Saved looks (archive) route tests."""

from fastapi.testclient import TestClient


def _get_completed_result_id(client: TestClient) -> int:
    """Create profile, product, job, mock-complete. Returns result id."""
    client.post(
        "/profiles",
        json={"height_cm": 170, "fit_preference": "regular"},
    )
    client.post(
        "/profiles/me/versions",
        json={
            "front_image_url": "https://ex.com/f.jpg",
            "side_image_url": "https://ex.com/s.jpg",
        },
    )
    r = client.post(
        "/products/resolve",
        json={
            "sourceSite": "zara",
            "sourceUrl": "https://zara.com/looks-test",
            "title": "Look Product",
            "imageUrl": "https://img.com/l.jpg",
        },
    )
    product_id = r.json()["productId"]
    r = client.post("/tryon/jobs", json={"productId": product_id})
    job_id = r.json()["jobId"]
    r = client.post(f"/tryon/jobs/{job_id}/mock-complete")
    return r.json()["id"]


def test_save_look(client: TestClient) -> None:
    """POST /looks/save saves a completed result."""
    result_id = _get_completed_result_id(client)
    r = client.post(
        "/looks/save",
        json={"tryonResultId": result_id, "note": "My favorite look"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["tryon_result_id"] == result_id
    assert data["note"] == "My favorite look"
    assert "result_image_url" in data


def test_save_look_invalid_result(client: TestClient) -> None:
    """POST /looks/save returns 400 for invalid result."""
    _get_completed_result_id(client)  # ensure user exists
    r = client.post("/looks/save", json={"tryonResultId": 99999})
    assert r.status_code == 400


def test_list_looks_returns_list(client: TestClient) -> None:
    """GET /looks/me returns list (may have prior saves from other tests)."""
    r = client.get("/looks/me")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_list_looks(client: TestClient) -> None:
    """GET /looks/me returns saved looks newest first."""
    result_id = _get_completed_result_id(client)
    client.post("/looks/save", json={"tryonResultId": result_id})

    r = client.get("/looks/me")
    assert r.status_code == 200
    looks = r.json()
    assert len(looks) >= 1
    assert looks[0]["tryon_result_id"] == result_id
    assert "result_image_url" in looks[0]
    assert "created_at" in looks[0]


def test_save_look_idempotent(client: TestClient) -> None:
    """POST /looks/save is idempotent (re-save same result)."""
    result_id = _get_completed_result_id(client)
    r1 = client.post("/looks/save", json={"tryonResultId": result_id})
    r2 = client.post("/looks/save", json={"tryonResultId": result_id})
    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r1.json()["id"] == r2.json()["id"]
