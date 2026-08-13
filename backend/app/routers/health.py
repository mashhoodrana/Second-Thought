"""
Second Thought Backend — Health router
GET /health — public endpoint, no auth required.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.config import Settings, get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(settings: Settings = Depends(get_settings)) -> dict:
    """
    Returns the service health status.
    Used by load balancers, Vercel previews, and CI checks.
    """
    return {
        "status": "ok",
        "version": settings.app_version,
        "env": settings.app_env,
    }
