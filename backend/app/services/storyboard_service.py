"""Storyboard and concept art generation service."""

from __future__ import annotations

import base64
import uuid
from pathlib import Path
from typing import Optional

import httpx
import openai
from loguru import logger

from backend.app.config import settings
from backend.app.models.project import Scene
from backend.app.utils.file_manager import get_project_dir


class StoryboardService:
    """Generates storyboard frames from scene descriptions."""

    def __init__(self) -> None:
        self._openai_client: Optional[openai.AsyncOpenAI] = None
        self._http_client: Optional[httpx.AsyncClient] = None

    @property
    def openai_client(self) -> openai.AsyncOpenAI:
        if self._openai_client is None:
            self._openai_client = openai.AsyncOpenAI(
                api_key=settings.openai_api_key
            )
        return self._openai_client

    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=120.0)
        return self._http_client

    def _build_image_prompt(
        self,
        scene: Scene,
        frame_index: int,
        total_frames: int,
        style_notes: str = "",
    ) -> str:
        """Build a detailed image generation prompt from scene data."""
        time_position = ""
        if total_frames > 1:
            if frame_index == 0:
                time_position = "Opening moment of the scene. "
            elif frame_index == total_frames - 1:
                time_position = "Final moment of the scene. "
            else:
                time_position = f"Mid-scene moment ({frame_index}/{total_frames}). "

        prompt_parts = [
            "Cinematic film still, high production value, 35mm film aesthetic.",
            f"Scene: {scene.heading}.",
            time_position,
            f"Description: {scene.description}",
        ]

        if scene.action:
            prompt_parts.append(f"Action: {scene.action}")
        if scene.mood:
            prompt_parts.append(f"Mood: {scene.mood}")
        if scene.lighting:
            prompt_parts.append(f"Lighting: {scene.lighting}")
        if scene.camera_notes:
            prompt_parts.append(f"Camera: {scene.camera_notes}")
        if style_notes:
            prompt_parts.append(f"Style: {style_notes}")

        prompt_parts.append(
            "Photorealistic, cinematic composition, film grain, "
            "professional cinematography, 16:9 aspect ratio."
        )

        return " ".join(prompt_parts)

    async def generate_storyboard(
        self,
        project_id: str,
        scene: Scene,
        num_frames: int = 3,
        style_notes: str = "",
    ) -> list[str]:
        """Generate storyboard frames for a scene.

        Returns list of file paths to generated images.
        """
        provider = settings.image_provider
        logger.info(
            f"Generating {num_frames} storyboard frames for scene "
            f"{scene.scene_number} via {provider}"
        )

        frame_paths: list[str] = []
        for i in range(num_frames):
            prompt = self._build_image_prompt(scene, i, num_frames, style_notes)

            if provider == "openai":
                image_data = await self._generate_openai(prompt)
            elif provider == "replicate":
                image_data = await self._generate_replicate(prompt)
            else:
                raise ValueError(f"Unknown image provider: {provider}")

            # Save to project directory
            filename = f"scene_{scene.scene_number:03d}_frame_{i:03d}.png"
            scene_dir = (
                get_project_dir(project_id) / "storyboard" /
                f"scene_{scene.scene_number:03d}"
            )
            scene_dir.mkdir(parents=True, exist_ok=True)
            file_path = scene_dir / filename

            file_path.write_bytes(image_data)
            frame_paths.append(str(file_path))
            logger.info(f"Saved storyboard frame: {file_path}")

        return frame_paths

    async def _generate_openai(self, prompt: str) -> bytes:
        """Generate image using OpenAI DALL-E."""
        response = await self.openai_client.images.generate(
            model=settings.image_model,
            prompt=prompt,
            size="1792x1024",  # Closest to 16:9 available
            quality="hd",
            n=1,
            response_format="b64_json",
        )
        b64_data = response.data[0].b64_json
        return base64.b64decode(b64_data)

    async def _generate_replicate(self, prompt: str) -> bytes:
        """Generate image using Replicate (Flux Pro or SDXL)."""
        api_token = settings.replicate_api_token
        if not api_token:
            raise ValueError("FILMSTUDIO_REPLICATE_API_TOKEN not set")

        # Use Flux Pro for high quality
        model = "black-forest-labs/flux-1.1-pro"

        response = await self.http_client.post(
            "https://api.replicate.com/v1/predictions",
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            json={
                "version": None,
                "model": model,
                "input": {
                    "prompt": prompt,
                    "aspect_ratio": "16:9",
                    "output_format": "png",
                    "output_quality": 95,
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
                image_url = result["output"]
                if isinstance(image_url, list):
                    image_url = image_url[0]
                img_response = await self.http_client.get(image_url)
                img_response.raise_for_status()
                return img_response.content
            elif result["status"] == "failed":
                raise RuntimeError(f"Image generation failed: {result.get('error')}")

            import asyncio
            await asyncio.sleep(2)

    async def generate_single_frame(
        self,
        prompt: str,
        output_path: Optional[str] = None,
    ) -> bytes:
        """Generate a single image from a prompt. Useful for concept art."""
        provider = settings.image_provider
        if provider == "openai":
            data = await self._generate_openai(prompt)
        elif provider == "replicate":
            data = await self._generate_replicate(prompt)
        else:
            raise ValueError(f"Unknown image provider: {provider}")

        if output_path:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            Path(output_path).write_bytes(data)

        return data

    async def close(self) -> None:
        if self._http_client:
            await self._http_client.aclose()


storyboard_service = StoryboardService()
