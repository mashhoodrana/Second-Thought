"""
conftest.py — pytest fixtures for Second Thought backend tests.

Strategy:
- Tests that don't require live Supabase run fully offline by mocking
  the security dependency and the DB client.
- Tests that require live Supabase are marked with @pytest.mark.integration
  and are skipped unless SUPABASE_URL + SUPABASE_ANON_KEY are set.
"""
from __future__ import annotations

import os
from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient

# Set minimal env vars before importing app (pydantic-settings reads at import)
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

from app.core.security import UserContext, get_current_user  # noqa: E402
from app.main import app  # noqa: E402

TEST_USER_ID = uuid4()
FAKE_TOKEN = "fake.jwt.token"


def override_get_current_user() -> UserContext:
    """Dependency override that returns a fixed test user without calling Supabase."""
    return UserContext(user_id=TEST_USER_ID)


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    """
    TestClient with NO auth override — tests using this must supply
    their own Authorization header or expect 401.
    """
    with TestClient(app) as c:
        yield c


@pytest.fixture()
def authenticated_client() -> Generator[TestClient, None, None]:
    """
    TestClient with get_current_user overridden to skip JWT verification.
    DB calls are still mocked per-test.
    """
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
