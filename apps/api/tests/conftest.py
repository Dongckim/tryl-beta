"""Pytest fixtures. Tests use real DB; set DATABASE_URL for test database."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app
from app.core.dependencies import get_current_user


def _mock_get_current_user():
    return {"id": "1", "email": "test@tryl.local"}


@pytest.fixture(autouse=True)
def _mock_queue():
    """Mock queue enqueue so tests don't require Redis."""
    with patch("app.services.tryon_service.enqueue_tryon_job"):
        yield


@pytest.fixture
def client() -> TestClient:
    """FastAPI test client with mock auth."""
    with patch.object(
        type("", (), {"__call__": lambda: _mock_get_current_user()}),
        "__call__",
        _mock_get_current_user,
    ):
        pass
    app.dependency_overrides[get_current_user] = _mock_get_current_user
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(get_current_user, None)
