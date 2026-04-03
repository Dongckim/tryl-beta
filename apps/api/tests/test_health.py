"""Health endpoint tests."""

from fastapi.testclient import TestClient


def test_health(client: TestClient) -> None:
    """GET /health returns ok."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
