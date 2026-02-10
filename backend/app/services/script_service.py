"""Script and screenplay generation service using LLMs."""

from __future__ import annotations

import json
from typing import Optional

import anthropic
import openai
from loguru import logger

from backend.app.config import settings
from backend.app.models.project import (
    CharacterVoice,
    DialogueLine,
    Scene,
    Screenplay,
)

SCREENPLAY_SYSTEM_PROMPT = """You are an expert screenwriter and film director. You write professional screenplays in structured JSON format.

When generating a screenplay, produce a JSON object with this exact structure:
{
  "title": "Film Title",
  "logline": "A one-sentence summary of the story",
  "genre": "Genre",
  "tone": "Tone description",
  "synopsis": "Brief synopsis",
  "style_notes": "Visual style, cinematography notes",
  "characters": [
    {
      "character_name": "Character Name",
      "voice_provider": "elevenlabs"
    }
  ],
  "scenes": [
    {
      "scene_number": 1,
      "heading": "INT./EXT. LOCATION - TIME",
      "location": "Location description",
      "time_of_day": "DAY/NIGHT/DAWN/DUSK",
      "description": "Detailed visual description of the scene for image generation",
      "action": "What happens in the scene - physical actions, movements",
      "dialogue": [
        {
          "character": "CHARACTER NAME",
          "text": "What they say",
          "direction": "(emotional direction)"
        }
      ],
      "camera_notes": "Camera angles, movements, shot types",
      "mood": "Emotional mood of the scene",
      "lighting": "Lighting description",
      "duration_seconds": 10
    }
  ]
}

IMPORTANT GUIDELINES:
- Each scene description should be highly visual and specific enough to generate images from
- Include detailed visual descriptions of settings, characters, colors, and atmosphere
- Camera notes should reference specific shot types (wide, close-up, tracking, etc.)
- Dialogue should feel natural and cinematic
- Duration should be realistic (5-30 seconds per scene)
- Total duration should approximately match the target duration
- Make the story compelling with a clear beginning, middle, and end
"""

REWRITE_PROMPT = """You are an expert screenwriter. Rewrite and improve the following scene based on the given notes. Return ONLY a JSON object with the same scene structure (scene_number, heading, location, time_of_day, description, action, dialogue, camera_notes, mood, lighting, duration_seconds). Do not include any other text."""

SCENE_EXPAND_PROMPT = """You are an expert screenwriter. Take the following brief scene description and expand it into a fully detailed scene. Return ONLY a JSON object with the complete scene structure. Make the description highly visual and cinematic."""


class ScriptService:
    """Generates and manages screenplays using LLMs."""

    def __init__(self) -> None:
        self._anthropic_client: Optional[anthropic.AsyncAnthropic] = None
        self._openai_client: Optional[openai.AsyncOpenAI] = None

    @property
    def anthropic_client(self) -> anthropic.AsyncAnthropic:
        if self._anthropic_client is None:
            self._anthropic_client = anthropic.AsyncAnthropic(
                api_key=settings.anthropic_api_key
            )
        return self._anthropic_client

    @property
    def openai_client(self) -> openai.AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = openai.AsyncOpenAI(
                api_key=settings.openai_api_key
            )
        return self._openai_client

    async def generate_screenplay(
        self,
        prompt: str,
        genre: str = "",
        tone: str = "",
        target_duration_minutes: float = 1.0,
        num_scenes: Optional[int] = None,
        style_notes: str = "",
    ) -> Screenplay:
        """Generate a complete screenplay from a prompt."""
        if num_scenes is None:
            num_scenes = max(3, int(target_duration_minutes * 4))

        user_message = f"""Create a screenplay based on the following:

CONCEPT: {prompt}
GENRE: {genre or 'Any'}
TONE: {tone or 'Cinematic'}
TARGET DURATION: {target_duration_minutes} minutes (approximately {num_scenes} scenes)
STYLE NOTES: {style_notes or 'Modern cinematic style'}

Generate a compelling, visually rich screenplay with approximately {num_scenes} scenes.
Each scene should have detailed visual descriptions suitable for AI image/video generation.
Return ONLY the JSON object, no other text."""

        raw_json = await self._call_llm(user_message)
        return self._parse_screenplay(raw_json, target_duration_minutes)

    async def rewrite_scene(
        self,
        scene: Scene,
        notes: str,
    ) -> Scene:
        """Rewrite a single scene based on director's notes."""
        user_message = f"""Original scene:
{scene.model_dump_json(indent=2)}

Director's notes for rewrite:
{notes}

Rewrite this scene incorporating the notes. Return ONLY the JSON object."""

        raw_json = await self._call_llm(user_message, system=REWRITE_PROMPT)
        data = json.loads(raw_json)
        return Scene(
            id=scene.id,
            scene_number=data.get("scene_number", scene.scene_number),
            heading=data.get("heading", scene.heading),
            location=data.get("location", scene.location),
            time_of_day=data.get("time_of_day", scene.time_of_day),
            description=data.get("description", scene.description),
            action=data.get("action", scene.action),
            dialogue=[DialogueLine(**d) for d in data.get("dialogue", [])],
            camera_notes=data.get("camera_notes", scene.camera_notes),
            mood=data.get("mood", scene.mood),
            lighting=data.get("lighting", scene.lighting),
            duration_seconds=data.get("duration_seconds", scene.duration_seconds),
            status=scene.status,
            storyboard_frames=scene.storyboard_frames,
            video_takes=scene.video_takes,
            selected_video=scene.selected_video,
        )

    async def expand_scene(self, brief: str, scene_number: int = 1) -> Scene:
        """Expand a brief description into a full scene."""
        user_message = f"""Brief description: {brief}
Scene number: {scene_number}

Expand this into a full, detailed cinematic scene. Return ONLY the JSON object."""

        raw_json = await self._call_llm(user_message, system=SCENE_EXPAND_PROMPT)
        data = json.loads(raw_json)
        return Scene(
            scene_number=data.get("scene_number", scene_number),
            heading=data.get("heading", "INT. UNKNOWN - DAY"),
            location=data.get("location", "Unknown"),
            time_of_day=data.get("time_of_day", "DAY"),
            description=data.get("description", brief),
            action=data.get("action", ""),
            dialogue=[DialogueLine(**d) for d in data.get("dialogue", [])],
            camera_notes=data.get("camera_notes", ""),
            mood=data.get("mood", ""),
            lighting=data.get("lighting", ""),
            duration_seconds=data.get("duration_seconds", 10),
        )

    async def _call_llm(
        self,
        user_message: str,
        system: Optional[str] = None,
    ) -> str:
        """Call the configured LLM and return the raw text response."""
        system_prompt = system or SCREENPLAY_SYSTEM_PROMPT

        if settings.anthropic_api_key:
            return await self._call_anthropic(user_message, system_prompt)
        elif settings.openai_api_key:
            return await self._call_openai(user_message, system_prompt)
        else:
            raise ValueError(
                "No AI API key configured. Set FILMSTUDIO_ANTHROPIC_API_KEY "
                "or FILMSTUDIO_OPENAI_API_KEY."
            )

    async def _call_anthropic(self, user_message: str, system: str) -> str:
        """Call Anthropic Claude API."""
        logger.info(f"Calling Anthropic {settings.script_model}")
        message = await self.anthropic_client.messages.create(
            model=settings.script_model,
            max_tokens=8192,
            system=system,
            messages=[{"role": "user", "content": user_message}],
        )
        text = message.content[0].text
        # Extract JSON from potential markdown code blocks
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0]
        elif "```" in text:
            text = text.split("```")[1].split("```")[0]
        return text.strip()

    async def _call_openai(self, user_message: str, system: str) -> str:
        """Call OpenAI API."""
        logger.info("Calling OpenAI GPT")
        response = await self.openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_message},
            ],
            max_tokens=8192,
            response_format={"type": "json_object"},
        )
        return response.choices[0].message.content or "{}"

    def _parse_screenplay(self, raw_json: str, target_duration: float) -> Screenplay:
        """Parse LLM output into a Screenplay model."""
        data = json.loads(raw_json)

        scenes = []
        for s in data.get("scenes", []):
            scene = Scene(
                scene_number=s.get("scene_number", len(scenes) + 1),
                heading=s.get("heading", "INT. UNKNOWN - DAY"),
                location=s.get("location", "Unknown"),
                time_of_day=s.get("time_of_day", "DAY"),
                description=s.get("description", ""),
                action=s.get("action", ""),
                dialogue=[DialogueLine(**d) for d in s.get("dialogue", [])],
                camera_notes=s.get("camera_notes", ""),
                mood=s.get("mood", ""),
                lighting=s.get("lighting", ""),
                duration_seconds=s.get("duration_seconds", 10),
            )
            scenes.append(scene)

        characters = []
        for c in data.get("characters", []):
            characters.append(CharacterVoice(
                character_name=c.get("character_name", "Unknown"),
                voice_provider=c.get("voice_provider", "elevenlabs"),
            ))

        return Screenplay(
            title=data.get("title", "Untitled"),
            logline=data.get("logline", ""),
            genre=data.get("genre", ""),
            tone=data.get("tone", ""),
            synopsis=data.get("synopsis", ""),
            target_duration_minutes=target_duration,
            scenes=scenes,
            characters=characters,
            style_notes=data.get("style_notes", ""),
            raw_text=raw_json,
        )


script_service = ScriptService()
