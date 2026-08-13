"""
Tests for GET /health
"""
from __future__ import annotations

from fastapi.testclient import TestClient


def test_health_returns_200(client: TestClient) -> None:
    """Health endpoint must be publicly accessible and return 200."""
    response = client.get("/health")
    assert response.status_code == 200


def test_health_response_structure(client: TestClient) -> None:
    """Health response must include status, version, and env fields."""
    response = client.get("/health")
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data
    assert "env" in data


def test_health_env_is_test(client: TestClient) -> None:
    """In test mode, env should be 'test'."""
    response = client.get("/health")
    assert response.json()["env"] == "test"


def test_health_no_auth_required(client: TestClient) -> None:
    """Health must not require an Authorization header."""
    response = client.get("/health")
    assert response.status_code != 401
