"""Me endpoint tests."""

from fastapi.testclient import TestClient


def test_me(client: TestClient) -> None:
    """GET /me returns mock current user."""
    r = client.get("/me")
    assert r.status_code == 200
    data = r.json()
    assert "id" in data
    assert "email" in data
    assert data["email"] == "test@tryl.local"
