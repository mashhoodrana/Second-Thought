"""
Second Thought Backend — Configuration
Reads all settings from environment variables.
"""
from __future__ import annotations

from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Supabase ────────────────────────────────────────────────────
    # Only the public anon key is needed. JWT verification is performed
    # by calling supabase.auth.get_user(token) — no JWT secret stored here.
    supabase_url: str
    supabase_anon_key: str

    # ── Application ─────────────────────────────────────────────────
    app_env: str = "development"
    app_version: str = "1.0.0"

    # ── CORS ────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Phase 2+ (not used in Phase 1) ──────────────────────────────
    gemini_api_key: Optional[str] = None
    gemini_default_model: Optional[str] = None
    gemini_analysis_model: Optional[str] = None
    search_api_key: Optional[str] = None


def get_settings() -> Settings:
    return Settings()
