"""
Second Thought Backend — FastAPI application entry point.
"""
from __future__ import annotations

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import health, investigations


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan — startup and shutdown hooks."""
    settings = get_settings()
    print(f"[Second Thought] starting in '{settings.app_env}' mode")
    yield
    print("[Second Thought] shutting down")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Second Thought API",
        description="AI-Powered Media & Information Literacy Platform — Backend API",
        version=settings.app_version,
        docs_url="/docs" if settings.app_env == "development" else None,
        redoc_url="/redoc" if settings.app_env == "development" else None,
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────
    # Explicit origin whitelist. Never wildcard.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
    )

    # ── Routers ───────────────────────────────────────────────────────
    app.include_router(health.router)
    app.include_router(investigations.router)

    return app


app = create_app()
