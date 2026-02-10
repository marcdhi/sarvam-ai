"""Settings and configuration API routes."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.config import settings

router = APIRouter(prefix="/api/settings", tags=["settings"])


class APIKeysRequest(BaseModel):
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    replicate_api_token: str | None = None
    elevenlabs_api_key: str | None = None
    runway_api_key: str | None = None
    stability_api_key: str | None = None


class ModelPreferencesRequest(BaseModel):
    script_model: str | None = None
    image_provider: str | None = None
    image_model: str | None = None
    video_provider: str | None = None
    video_model: str | None = None
    voice_provider: str | None = None
    voice_model: str | None = None
    music_provider: str | None = None
    music_model: str | None = None


@router.get("/")
async def get_settings():
    """Get current application settings (redacting API keys)."""
    return {
        "settings": {
            "app_name": settings.app_name,
            "app_version": settings.app_version,
            "projects_dir": settings.projects_dir,
            "script_model": settings.script_model,
            "image_provider": settings.image_provider,
            "image_model": settings.image_model,
            "video_provider": settings.video_provider,
            "video_model": settings.video_model,
            "voice_provider": settings.voice_provider,
            "voice_model": settings.voice_model,
            "music_provider": settings.music_provider,
            "music_model": settings.music_model,
            "default_resolution": settings.default_resolution,
            "default_fps": settings.default_fps,
            "storyboard_frames_per_scene": settings.storyboard_frames_per_scene,
        },
        "api_keys_configured": {
            "anthropic": bool(settings.anthropic_api_key),
            "openai": bool(settings.openai_api_key),
            "replicate": bool(settings.replicate_api_token),
            "elevenlabs": bool(settings.elevenlabs_api_key),
            "runway": bool(settings.runway_api_key),
            "stability": bool(settings.stability_api_key),
        },
    }


@router.put("/api-keys")
async def update_api_keys(req: APIKeysRequest):
    """Update API keys (runtime only - for persistence, use .env file)."""
    if req.anthropic_api_key is not None:
        settings.anthropic_api_key = req.anthropic_api_key
    if req.openai_api_key is not None:
        settings.openai_api_key = req.openai_api_key
    if req.replicate_api_token is not None:
        settings.replicate_api_token = req.replicate_api_token
    if req.elevenlabs_api_key is not None:
        settings.elevenlabs_api_key = req.elevenlabs_api_key
    if req.runway_api_key is not None:
        settings.runway_api_key = req.runway_api_key
    if req.stability_api_key is not None:
        settings.stability_api_key = req.stability_api_key
    return {"status": "updated", "api_keys_configured": {
        "anthropic": bool(settings.anthropic_api_key),
        "openai": bool(settings.openai_api_key),
        "replicate": bool(settings.replicate_api_token),
        "elevenlabs": bool(settings.elevenlabs_api_key),
        "runway": bool(settings.runway_api_key),
        "stability": bool(settings.stability_api_key),
    }}


@router.put("/models")
async def update_model_preferences(req: ModelPreferencesRequest):
    """Update default AI model preferences."""
    if req.script_model is not None:
        settings.script_model = req.script_model
    if req.image_provider is not None:
        settings.image_provider = req.image_provider
    if req.image_model is not None:
        settings.image_model = req.image_model
    if req.video_provider is not None:
        settings.video_provider = req.video_provider
    if req.video_model is not None:
        settings.video_model = req.video_model
    if req.voice_provider is not None:
        settings.voice_provider = req.voice_provider
    if req.voice_model is not None:
        settings.voice_model = req.voice_model
    if req.music_provider is not None:
        settings.music_provider = req.music_provider
    if req.music_model is not None:
        settings.music_model = req.music_model
    return {"status": "updated"}
