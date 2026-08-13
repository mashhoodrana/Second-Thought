"""
Tests for POST /investigations

Covers the requirements:
  ✅ Unauthenticated request → 401
  ✅ Invalid/malformed token → 401
  ✅ Valid authenticated request with text → 201 + session_id
  ✅ Empty text → 422
  ✅ Whitespace-only text → 422
  ✅ Unsupported content_type → 422
  ✅ Missing raw_text → 422

DB calls are mocked — these tests do not require live Supabase.
"""
from __future__ import annotations

from unittest.mock import MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

FAKE_SESSION_ID = str(uuid4())
FAKE_NOW = "2026-08-10T00:00:00+00:00"

MOCK_SESSION_ROW = {
    "id": FAKE_SESSION_ID,
    "user_id": "00000000-0000-0000-0000-000000000001",
    "status": "complete",
    "created_at": FAKE_NOW,
    "completed_at": None,
}


def _make_mock_db():
    """Build a mock Supabase client that mimics the table chain."""
    mock_db = MagicMock()

    # Mock: .table("investigation_sessions").insert({}).execute()
    # Returns a result with the session row
    session_insert_result = MagicMock()
    session_insert_result.data = [MOCK_SESSION_ROW]

    # Mock: .table("investigation_inputs").insert({}).execute()
    input_insert_result = MagicMock()
    input_insert_result.data = [{"id": str(uuid4())}]

    # Mock: .table("investigation_sessions").update({}).eq(...).execute()
    session_update_result = MagicMock()
    session_update_result.data = [MOCK_SESSION_ROW]

    # Chain: table → insert → execute
    mock_table = MagicMock()
    mock_db.table.return_value = mock_table

    mock_insert = MagicMock()
    mock_table.insert.return_value = mock_insert
    mock_insert.execute.side_effect = [
        session_insert_result,  # first call: session insert
        input_insert_result,    # second call: input insert
    ]

    # Chain: table → update → eq → execute
    mock_update = MagicMock()
    mock_table.update.return_value = mock_update
    mock_eq = MagicMock()
    mock_update.eq.return_value = mock_eq
    mock_eq.execute.return_value = session_update_result

    return mock_db


# ── Authentication tests ──────────────────────────────────────────

class TestInvestigationAuth:
    def test_no_auth_header_returns_401(self, client: TestClient) -> None:
        """Request without Authorization header must return 401."""
        response = client.post(
            "/investigations",
            json={"content_type": "text", "raw_text": "Some content"},
        )
        assert response.status_code == 401

    def test_malformed_auth_header_returns_401(self, client: TestClient) -> None:
        """Authorization header without 'Bearer ' prefix must return 401."""
        response = client.post(
            "/investigations",
            json={"content_type": "text", "raw_text": "Some content"},
            headers={"Authorization": "Token abc123"},
        )
        assert response.status_code == 401

    def test_empty_bearer_token_returns_401(self, client: TestClient) -> None:
        """Empty Bearer token must return 401."""
        response = client.post(
            "/investigations",
            json={"content_type": "text", "raw_text": "Some content"},
            headers={"Authorization": "Bearer "},
        )
        assert response.status_code == 401

    def test_invalid_token_returns_401(self, client: TestClient) -> None:
        """An invalid token (Supabase API will reject it) must return 401."""
        with patch("app.routers.investigations.get_user_db_client"):
            # Don't override get_current_user — let it call Supabase Auth API
            # which will fail for a fake token (mocked to raise)
            with patch("app.core.security.create_client") as mock_create:
                mock_supabase = MagicMock()
                mock_supabase.auth.get_user.return_value = MagicMock(user=None)
                mock_create.return_value = mock_supabase

                response = client.post(
                    "/investigations",
                    json={"content_type": "text", "raw_text": "Some content"},
                    headers={"Authorization": "Bearer invalid.token.here"},
                )
        assert response.status_code == 401


# ── Validation tests ──────────────────────────────────────────────

class TestInvestigationValidation:
    def test_empty_raw_text_returns_422(self, authenticated_client: TestClient) -> None:
        """Empty string for raw_text must return 422."""
        response = authenticated_client.post(
            "/investigations",
            json={"content_type": "text", "raw_text": ""},
        )
        assert response.status_code == 422

    def test_whitespace_only_text_returns_422(self, authenticated_client: TestClient) -> None:
        """Whitespace-only text must be rejected with 422."""
        response = authenticated_client.post(
            "/investigations",
            json={"content_type": "text", "raw_text": "   \n\t  "},
        )
        assert response.status_code == 422

    def test_missing_raw_text_returns_422(self, authenticated_client: TestClient) -> None:
        """Missing raw_text field for text content_type must return 422."""
        response = authenticated_client.post(
            "/investigations",
            json={"content_type": "text"},
        )
        assert response.status_code == 422

    def test_url_content_type_rejected_422(self, authenticated_client: TestClient) -> None:
        """content_type='url' is not supported in Phase 1 — must return 422."""
        response = authenticated_client.post(
            "/investigations",
            json={"content_type": "url", "source_url": "https://example.com"},
        )
        assert response.status_code == 422

    def test_image_content_type_rejected_422(self, authenticated_client: TestClient) -> None:
        """content_type='image' is not supported in Phase 1 — must return 422."""
        response = authenticated_client.post(
            "/investigations",
            json={"content_type": "image", "file_path": "/some/path.jpg"},
        )
        assert response.status_code == 422

    def test_unknown_content_type_rejected_422(self, authenticated_client: TestClient) -> None:
        """Unknown content_type must return 422."""
        response = authenticated_client.post(
            "/investigations",
            json={"content_type": "video", "raw_text": "Something"},
        )
        assert response.status_code == 422

    def test_text_too_long_returns_422(self, authenticated_client: TestClient) -> None:
        """Text exceeding 10,000 characters must return 422."""
        response = authenticated_client.post(
            "/investigations",
            json={"content_type": "text", "raw_text": "x" * 10_001},
        )
        assert response.status_code == 422


# ── Success tests ─────────────────────────────────────────────────

class TestInvestigationSuccess:
    def test_valid_text_submission_returns_201(
        self, authenticated_client: TestClient
    ) -> None:
        """Valid text submission must return 201 with session_id and status."""
        with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
            mock_get_db.return_value = _make_mock_db()

            response = authenticated_client.post(
                "/investigations",
                json={"content_type": "text", "raw_text": "Is this claim true?"},
                headers={"Authorization": "Bearer fake.token"},
            )

        assert response.status_code == 201
        data = response.json()
        assert "session_id" in data
        assert data["status"] == "pending"
        assert "created_at" in data

    def test_response_session_id_is_uuid(
        self, authenticated_client: TestClient
    ) -> None:
        """session_id in response must be a valid UUID string."""
        with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
            mock_get_db.return_value = _make_mock_db()

            response = authenticated_client.post(
                "/investigations",
                json={"content_type": "text", "raw_text": "Test claim"},
                headers={"Authorization": "Bearer fake.token"},
            )

        import re
        uuid_pattern = re.compile(
            r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
        )
        assert uuid_pattern.match(response.json()["session_id"])

    def test_db_called_with_correct_user_id(
        self, authenticated_client: TestClient
    ) -> None:
        """The user_id used in DB inserts must come from the JWT, not the request body."""
        from tests.conftest import TEST_USER_ID

        captured_inserts: list[dict] = []

        mock_db = _make_mock_db()
        original_table = mock_db.table

        def capturing_table(name: str):
            tbl = original_table(name)
            original_insert = tbl.insert

            def capturing_insert(data: dict):
                captured_inserts.append({"table": name, "data": data})
                return original_insert(data)

            tbl.insert = capturing_insert
            return tbl

        mock_db.table = capturing_table

        with patch("app.routers.investigations.get_user_db_client") as mock_get_db:
            mock_get_db.return_value = mock_db

            authenticated_client.post(
                "/investigations",
                json={"content_type": "text", "raw_text": "Test claim"},
                headers={"Authorization": "Bearer fake.token"},
            )

        # Find the session insert
        session_insert = next(
            (i for i in captured_inserts if i["table"] == "investigation_sessions"), None
        )
        assert session_insert is not None
        assert session_insert["data"]["user_id"] == str(TEST_USER_ID)
