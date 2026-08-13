"""
Second Thought Backend — JWT Security
Verifies Supabase JWTs by calling the Supabase Auth API.
No JWT secret is stored or used locally.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from supabase import Client, create_client

from app.core.config import Settings, get_settings


class UserContext:
    """Represents a verified, authenticated user extracted from their JWT."""

    def __init__(self, user_id: UUID) -> None:
        self.user_id = user_id


def _extract_bearer_token(request: Request) -> str:
    """
    Extract the Bearer token from the Authorization header.
    Raises 401 if the header is missing or malformed.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected: Bearer <token>",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is empty",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token


async def get_current_user(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> UserContext:
    """
    FastAPI dependency that verifies a Supabase JWT.

    Verification approach: calls supabase.auth.get_user(token) which makes
    an HTTP request to the Supabase Auth API. This is the current
    Supabase-recommended approach — no JWT secret is stored on the backend.

    Returns a UserContext with the verified user_id on success.
    Raises HTTP 401 on any failure.
    """
    token = _extract_bearer_token(request)

    try:
        # Create a Supabase client scoped to this request
        client: Client = create_client(settings.supabase_url, settings.supabase_anon_key)

        # Verify the token via the Supabase Auth API
        auth_response = client.auth.get_user(token)

        if auth_response is None or auth_response.user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token",
                headers={"WWW-Authenticate": "Bearer"},
            )

        user_id = UUID(auth_response.user.id)
        return UserContext(user_id=user_id)

    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token verification failed",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
