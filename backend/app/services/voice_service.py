"""Voice synthesis / text-to-speech service for dialogue and narration."""

from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Optional

import httpx
import openai
from loguru import logger

from backend.app.config import settings
from backend.app.models.project import CharacterVoice, DialogueLine
from backend.app.utils.file_manager import get_project_dir


class VoiceService:
    """Generates dialogue audio using TTS APIs."""

    def __init__(self) -> None:
        self._http_client: Optional[httpx.AsyncClient] = None
        self._openai_client: Optional[openai.AsyncOpenAI] = None

    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=120.0)
        return self._http_client

    @property
    def openai_client(self) -> openai.AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = openai.AsyncOpenAI(
                api_key=settings.openai_api_key
            )
        return self._openai_client

    async def generate_dialogue(
        self,
        project_id: str,
        scene_number: int,
        dialogue: DialogueLine,
        voice_config: Optional[CharacterVoice] = None,
        line_index: int = 0,
    ) -> str:
        """Generate audio for a single dialogue line.

        Returns file path of the generated audio.
        """
        provider = voice_config.voice_provider if voice_config else settings.voice_provider
        logger.info(
            f"Generating dialogue for '{dialogue.character}' via {provider}"
        )

        text = dialogue.text
        if dialogue.direction:
            # Prepend direction as SSML-style hint
            text = f"[{dialogue.direction}] {text}"

        if provider == "elevenlabs":
            audio_data = await self._generate_elevenlabs(
                text, voice_config
            )
        elif provider == "openai":
            audio_data = await self._generate_openai(text, voice_config)
        else:
            raise ValueError(f"Unknown voice provider: {provider}")

        # Save to project directory
        dialogue_dir = get_project_dir(project_id) / "audio" / "dialogue"
        dialogue_dir.mkdir(parents=True, exist_ok=True)

        safe_name = dialogue.character.lower().replace(" ", "_")
        filename = f"scene_{scene_number:03d}_{safe_name}_{line_index:03d}.mp3"
        file_path = dialogue_dir / filename

        file_path.write_bytes(audio_data)
        logger.info(f"Saved dialogue audio: {file_path}")
        return str(file_path)

    async def generate_scene_dialogue(
        self,
        project_id: str,
        scene_number: int,
        dialogue_lines: list[DialogueLine],
        character_voices: dict[str, CharacterVoice],
    ) -> list[str]:
        """Generate audio for all dialogue lines in a scene.

        Returns list of file paths.
        """
        paths: list[str] = []
        for i, line in enumerate(dialogue_lines):
            voice_config = character_voices.get(line.character)
            path = await self.generate_dialogue(
                project_id, scene_number, line, voice_config, i
            )
            paths.append(path)
        return paths

    async def _generate_elevenlabs(
        self,
        text: str,
        voice_config: Optional[CharacterVoice] = None,
    ) -> bytes:
        """Generate speech using ElevenLabs API."""
        api_key = settings.elevenlabs_api_key
        if not api_key:
            raise ValueError("FILMSTUDIO_ELEVENLABS_API_KEY not set")

        voice_id = (voice_config.voice_id if voice_config and voice_config.voice_id
                     else "21m00Tcm4TlvDq8ikWAM")  # Default: Rachel

        voice_settings = (
            voice_config.voice_settings if voice_config
            else {"stability": 0.5, "similarity_boost": 0.75, "style": 0.5}
        )

        response = await self.http_client.post(
            f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
            headers={
                "xi-api-key": api_key,
                "Content-Type": "application/json",
            },
            json={
                "text": text,
                "model_id": settings.voice_model,
                "voice_settings": voice_settings,
            },
        )
        response.raise_for_status()
        return response.content

    async def _generate_openai(
        self,
        text: str,
        voice_config: Optional[CharacterVoice] = None,
    ) -> bytes:
        """Generate speech using OpenAI TTS API."""
        voice = "alloy"
        if voice_config and voice_config.voice_id:
            voice = voice_config.voice_id

        response = await self.openai_client.audio.speech.create(
            model="tts-1-hd",
            voice=voice,
            input=text,
            response_format="mp3",
        )
        return response.content

    async def list_elevenlabs_voices(self) -> list[dict]:
        """List available ElevenLabs voices."""
        api_key = settings.elevenlabs_api_key
        if not api_key:
            return []

        response = await self.http_client.get(
            "https://api.elevenlabs.io/v1/voices",
            headers={"xi-api-key": api_key},
        )
        response.raise_for_status()
        data = response.json()
        return [
            {
                "voice_id": v["voice_id"],
                "name": v["name"],
                "category": v.get("category", ""),
                "labels": v.get("labels", {}),
            }
            for v in data.get("voices", [])
        ]

    async def close(self) -> None:
        if self._http_client:
            await self._http_client.aclose()


voice_service = VoiceService()
