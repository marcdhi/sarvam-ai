"""Music and sound effects generation service."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

import httpx
from loguru import logger

from backend.app.config import settings
from backend.app.models.project import Scene
from backend.app.utils.file_manager import get_project_dir


class MusicService:
    """Generates background music and sound effects for scenes."""

    def __init__(self) -> None:
        self._http_client: Optional[httpx.AsyncClient] = None

    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=180.0)
        return self._http_client

    def _build_music_prompt(self, scene: Scene) -> str:
        """Build a music generation prompt from scene data."""
        parts = [
            "Cinematic film score.",
            f"Mood: {scene.mood or 'dramatic'}.",
        ]
        if scene.lighting:
            parts.append(f"Atmosphere: {scene.lighting}.")
        parts.append(f"Scene: {scene.description[:200]}.")
        parts.append(f"Duration: {scene.duration_seconds} seconds.")
        parts.append("Instrumental, professional film quality, no vocals.")
        return " ".join(parts)

    def _build_sfx_prompt(self, scene: Scene) -> str:
        """Build a sound effects prompt from scene data."""
        parts = [
            f"Sound effects for: {scene.description[:200]}.",
        ]
        if scene.action:
            parts.append(f"Action sounds: {scene.action[:200]}.")
        if scene.location:
            parts.append(f"Ambient sounds for: {scene.location}.")
        return " ".join(parts)

    async def generate_music(
        self,
        project_id: str,
        scene: Scene,
        duration_seconds: Optional[float] = None,
    ) -> str:
        """Generate background music for a scene.

        Returns file path of the generated audio.
        """
        duration = duration_seconds or scene.duration_seconds
        prompt = self._build_music_prompt(scene)

        logger.info(
            f"Generating music for scene {scene.scene_number} ({duration}s)"
        )

        audio_data = await self._generate_via_replicate(
            prompt, duration, model_type="music"
        )

        music_dir = get_project_dir(project_id) / "audio" / "music"
        music_dir.mkdir(parents=True, exist_ok=True)

        filename = f"scene_{scene.scene_number:03d}_score.wav"
        file_path = music_dir / filename

        file_path.write_bytes(audio_data)
        logger.info(f"Saved music: {file_path}")
        return str(file_path)

    async def generate_sfx(
        self,
        project_id: str,
        scene: Scene,
        custom_prompt: Optional[str] = None,
    ) -> str:
        """Generate sound effects for a scene.

        Returns file path of the generated audio.
        """
        prompt = custom_prompt or self._build_sfx_prompt(scene)

        logger.info(f"Generating SFX for scene {scene.scene_number}")

        # Try ElevenLabs SFX first, fall back to Replicate
        if settings.elevenlabs_api_key:
            audio_data = await self._generate_elevenlabs_sfx(
                prompt, scene.duration_seconds
            )
        else:
            audio_data = await self._generate_via_replicate(
                prompt, scene.duration_seconds, model_type="sfx"
            )

        sfx_dir = get_project_dir(project_id) / "audio" / "sfx"
        sfx_dir.mkdir(parents=True, exist_ok=True)

        existing = list(sfx_dir.glob(f"scene_{scene.scene_number:03d}_*.wav"))
        sfx_index = len(existing) + 1
        filename = f"scene_{scene.scene_number:03d}_sfx_{sfx_index:03d}.wav"
        file_path = sfx_dir / filename

        file_path.write_bytes(audio_data)
        logger.info(f"Saved SFX: {file_path}")
        return str(file_path)

    async def _generate_elevenlabs_sfx(
        self,
        prompt: str,
        duration_seconds: float,
    ) -> bytes:
        """Generate sound effects using ElevenLabs SFX API."""
        api_key = settings.elevenlabs_api_key
        if not api_key:
            raise ValueError("FILMSTUDIO_ELEVENLABS_API_KEY not set")

        response = await self.http_client.post(
            "https://api.elevenlabs.io/v1/sound-generation",
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": prompt,
                "duration_seconds": min(duration_seconds, 22.0),
            },
        )
        response.raise_for_status()
        return response.content

    async def _generate_via_replicate(
        self,
        prompt: str,
        duration_seconds: float,
        model_type: str = "music",
    ) -> bytes:
        """Generate audio using Replicate (Stable Audio)."""
        api_token = settings.replicate_api_token
        if not api_token:
            raise ValueError("FILMSTUDIO_REPLICATE_API_TOKEN not set")

        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

        model = "stability-ai/stable-audio-open-1.0"

        response = await self.http_client.post(
            "https://api.replicate.com/v1/predictions",
            headers=headers,
            json={
                "model": model,
                "input": {
                    "prompt": prompt,
                    "duration": min(duration_seconds, 47.0),
                    "output_format": "wav",
                },
            },
        )
        response.raise_for_status()
        prediction = response.json()

        # Poll for completion
        prediction_url = prediction["urls"]["get"]
        while True:
            poll = await self.http_client.get(
                prediction_url,
                headers={"Authorization": f"Bearer {api_token}"},
            )
            poll.raise_for_status()
            result = poll.json()

            if result["status"] == "succeeded":
                audio_url = result["output"]
                if isinstance(audio_url, list):
                    audio_url = audio_url[0]
                audio_response = await self.http_client.get(audio_url)
                audio_response.raise_for_status()
                return audio_response.content
            elif result["status"] == "failed":
                raise RuntimeError(
                    f"Audio generation failed: {result.get('error')}"
                )

            await asyncio.sleep(3)

    async def close(self) -> None:
        if self._http_client:
            await self._http_client.aclose()


music_service = MusicService()
