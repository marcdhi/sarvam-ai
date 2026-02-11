"""Application configuration with environment variable support."""

from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Global application settings loaded from environment variables."""

    # Application
    app_name: str = "AI Filmmaking Studio"
    app_version: str = "1.0.0"
    debug: bool = False
    host: str = "127.0.0.1"
    port: int = 8741
    projects_dir: str = str(Path.home() / "AIFilmStudio" / "projects")
    temp_dir: str = str(Path.home() / "AIFilmStudio" / "temp")

    # AI Provider API Keys
    anthropic_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    google_api_key: Optional[str] = None
    replicate_api_token: Optional[str] = None
    elevenlabs_api_key: Optional[str] = None
    runway_api_key: Optional[str] = None
    stability_api_key: Optional[str] = None

    # Default AI Model Preferences
    script_model: str = "claude-sonnet-4-20250514"
    image_provider: str = "gemini"  # gemini (Nano Banana), openai, replicate
    image_model: str = "gemini-2.5-flash-preview-image-generation"
    video_provider: str = "runway"  # runway, replicate
    video_model: str = "gen4_turbo"
    voice_provider: str = "elevenlabs"  # elevenlabs, openai
    voice_model: str = "eleven_multilingual_v2"
    music_provider: str = "replicate"  # replicate
    music_model: str = "stable-audio"

    # Generation Defaults
    default_resolution: str = "1920x1080"
    default_fps: int = 24
    default_video_format: str = "mp4"
    default_audio_format: str = "wav"
    max_scene_duration_seconds: int = 30
    storyboard_frames_per_scene: int = 3

    # Database
    database_url: str = "sqlite+aiosqlite:///./filmstudio.db"

    model_config = {"env_prefix": "FILMSTUDIO_", "env_file": ".env"}


settings = Settings()


def ensure_directories() -> None:
    """Create required directories if they don't exist."""
    Path(settings.projects_dir).mkdir(parents=True, exist_ok=True)
    Path(settings.temp_dir).mkdir(parents=True, exist_ok=True)
