"""
Second Thought Backend — Supabase Database Client
Creates a user-scoped Supabase client that passes operations through RLS.
No service role key is used or stored.
"""
from __future__ import annotations

from supabase import Client, create_client

from app.core.config import Settings


def get_user_db_client(token: str, settings: Settings) -> Client:
    """
    Creates a Supabase client authenticated as the user (via their JWT).
    All DB operations execute under RLS policies as the authenticated user.

    This avoids needing a service role key — all data access is scoped
    to what the user's RLS policies allow.
    """
    client: Client = create_client(settings.supabase_url, settings.supabase_anon_key)
    # Authenticate the PostgREST client with the user's token
    # This makes all table operations execute as the authenticated user
    client.postgrest.auth(token)
    return client
