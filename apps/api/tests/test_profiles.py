"""Profile route tests."""

from fastapi.testclient import TestClient


def test_create_profile(client: TestClient) -> None:
    """POST /profiles creates or returns existing profile."""
    r = client.post(
        "/profiles",
        json={"height_cm": 170, "fit_preference": "regular", "weight_kg": 70},
    )
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "height_cm" in data
    assert "fit_preference" in data


def test_get_profiles_me(client: TestClient) -> None:
    """GET /profiles/me returns profile and default_version."""
    client.post(
        "/profiles",
        json={"height_cm": 172, "fit_preference": "slim", "weight_kg": 65},
    )
    r = client.get("/profiles/me")
    assert r.status_code == 200
    data = r.json()
    assert "profile" in data
    assert "default_version" in data
    assert "height_cm" in data["profile"]


def test_patch_profiles_me(client: TestClient) -> None:
    """PATCH /profiles/me updates profile."""
    client.post(
        "/profiles",
        json={"height_cm": 175, "fit_preference": "regular"},
    )
    r = client.patch("/profiles/me", json={"height_cm": 178})
    assert r.status_code == 200
    data = r.json()
    assert float(data["height_cm"]) == 178


def test_create_profile_version(client: TestClient) -> None:
    """POST /profiles/me/versions creates a fitting profile version."""
    client.post(
        "/profiles",
        json={"height_cm": 176, "fit_preference": "relaxed"},
    )
    r = client.post(
        "/profiles/me/versions",
        json={
            "front_image_url": "https://example.com/front.jpg",
            "side_image_url": "https://example.com/side.jpg",
        },
    )
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert data["front_image_url"] == "https://example.com/front.jpg"
