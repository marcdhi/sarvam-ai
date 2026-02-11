"""Video generation service supporting multiple providers."""

from __future__ import annotations

import asyncio
import base64
from pathlib import Path
from typing import Optional

import httpx
from loguru import logger

from backend.app.config import settings
from backend.app.models.project import Scene
from backend.app.utils.file_manager import get_project_dir


class VideoService:
    """Generates video clips from storyboard frames and scene descriptions."""

    def __init__(self) -> None:
        self._http_client: Optional[httpx.AsyncClient] = None

    @property
    def http_client(self) -> httpx.AsyncClient:
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=300.0)
        return self._http_client

    def _build_video_prompt(self, scene: Scene) -> str:
        """Build a video generation prompt from scene data."""
        parts = [
            f"Cinematic scene: {scene.description}",
        ]
        if scene.action:
            parts.append(f"Action: {scene.action}")
        if scene.camera_notes:
            parts.append(f"Camera movement: {scene.camera_notes}")
        if scene.mood:
            parts.append(f"Mood: {scene.mood}")
        if scene.lighting:
            parts.append(f"Lighting: {scene.lighting}")

        return " ".join(parts)

    async def generate_video(
        self,
        project_id: str,
        scene: Scene,
        reference_image_path: Optional[str] = None,
        duration_seconds: int = 10,
    ) -> str:
        """Generate a video clip for a scene.

        Returns the file path of the generated video.
        """
        provider = settings.video_provider
        logger.info(
            f"Generating video for scene {scene.scene_number} via {provider} "
            f"({duration_seconds}s)"
        )

        prompt = self._build_video_prompt(scene)

        if provider == "runway":
            video_data = await self._generate_runway(
                prompt, reference_image_path, duration_seconds
            )
        elif provider == "replicate":
            video_data = await self._generate_replicate(
                prompt, reference_image_path, duration_seconds
            )
        else:
            raise ValueError(f"Unknown video provider: {provider}")

        # Save to project directory
        scene_dir = (
            get_project_dir(project_id) / "video" /
            f"scene_{scene.scene_number:03d}"
        )
        scene_dir.mkdir(parents=True, exist_ok=True)

        take_number = len(list(scene_dir.glob("take_*.mp4"))) + 1
        filename = f"take_{take_number:03d}.mp4"
        file_path = scene_dir / filename

        file_path.write_bytes(video_data)
        logger.info(f"Saved video: {file_path}")
        return str(file_path)

    async def _generate_runway(
        self,
        prompt: str,
        image_path: Optional[str],
        duration: int,
    ) -> bytes:
        """Generate video using Runway Gen-4 API."""
        api_key = settings.runway_api_key
        if not api_key:
            raise ValueError("FILMSTUDIO_RUNWAY_API_KEY not set")

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "X-Runway-Version": "2024-11-06",
        }

        payload: dict = {
            "model": settings.video_model,
            "promptText": prompt,
            "duration": min(duration, 10),
            "ratio": "16:9",
        }

        # If we have a reference image, use image-to-video
        if image_path and Path(image_path).exists():
            image_data = Path(image_path).read_bytes()
            b64 = base64.b64encode(image_data).decode()
            ext = Path(image_path).suffix.lstrip(".")
            payload["promptImage"] = f"data:image/{ext};base64,{b64}"

        # Create task
        response = await self.http_client.post(
            "https://api.dev.runwayml.com/v1/image_to_video",
            headers=headers,
            json=payload,
        )
        response.raise_for_status()
        task = response.json()
        task_id = task["id"]

        # Poll for completion
        while True:
            poll = await self.http_client.get(
                f"https://api.dev.runwayml.com/v1/tasks/{task_id}",
                headers=headers,
            )
            poll.raise_for_status()
            result = poll.json()

            status = result.get("status")
            if status == "SUCCEEDED":
                video_url = result["output"][0]
                video_response = await self.http_client.get(video_url)
                video_response.raise_for_status()
                return video_response.content
            elif status in ("FAILED", "CANCELLED"):
                raise RuntimeError(
                    f"Runway video generation failed: {result.get('failure')}"
                )

            await asyncio.sleep(5)

    async def _generate_replicate(
        self,
        prompt: str,
        image_path: Optional[str],
        duration: int,
    ) -> bytes:
        """Generate video using Replicate (LTX-Video or Wan)."""
        api_token = settings.replicate_api_token
        if not api_token:
            raise ValueError("FILMSTUDIO_REPLICATE_API_TOKEN not set")

        headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json",
        }

        input_data: dict = {
            "prompt": prompt,
            "num_frames": duration * 24,  # 24 fps
        }

        if image_path and Path(image_path).exists():
            image_data = Path(image_path).read_bytes()
            b64 = base64.b64encode(image_data).decode()
            ext = Path(image_path).suffix.lstrip(".")
            input_data["image"] = f"data:image/{ext};base64,{b64}"

        model = "lightricks/ltx-video"

        response = await self.http_client.post(
            "https://api.replicate.com/v1/predictions",
            headers=headers,
            json={
                "model": model,
                "input": input_data,
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
                video_url = result["output"]
                if isinstance(video_url, list):
                    video_url = video_url[0]
                video_response = await self.http_client.get(video_url)
                video_response.raise_for_status()
                return video_response.content
            elif result["status"] == "failed":
                raise RuntimeError(
                    f"Replicate video generation failed: {result.get('error')}"
                )

            await asyncio.sleep(5)

    async def close(self) -> None:
        if self._http_client:
            await self._http_client.aclose()


video_service = VideoService()
