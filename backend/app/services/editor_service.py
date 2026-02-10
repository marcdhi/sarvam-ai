"""Video editing and compositing service using MoviePy and FFmpeg."""

from __future__ import annotations

import asyncio
import subprocess
from pathlib import Path
from typing import Optional

from loguru import logger

from backend.app.config import settings
from backend.app.models.project import (
    ExportSettings,
    Project,
    Scene,
    Timeline,
    TimelineClip,
)
from backend.app.utils.file_manager import get_project_dir


class EditorService:
    """Handles video compositing, timeline assembly, and final export."""

    async def composite_scene(
        self,
        project_id: str,
        scene: Scene,
    ) -> Optional[str]:
        """Composite a single scene: combine video + dialogue + music + sfx.

        Returns path to the composited scene file.
        """
        if not scene.selected_video:
            logger.warning(f"Scene {scene.scene_number}: no video selected")
            return None

        video_path = Path(scene.selected_video)
        if not video_path.exists():
            logger.error(f"Video file not found: {video_path}")
            return None

        scene_dir = (
            get_project_dir(project_id) / "edit"
        )
        scene_dir.mkdir(parents=True, exist_ok=True)
        output_path = scene_dir / f"scene_{scene.scene_number:03d}_composite.mp4"

        # Build FFmpeg filter complex for audio mixing
        inputs = ["-i", str(video_path)]
        filter_parts = []
        audio_inputs = []
        input_index = 1

        # Add dialogue audio files
        for line in scene.dialogue:
            if line.audio_path and Path(line.audio_path).exists():
                inputs.extend(["-i", line.audio_path])
                audio_inputs.append(f"[{input_index}:a]")
                input_index += 1

        # Add music
        if scene.music_path and Path(scene.music_path).exists():
            inputs.extend(["-i", scene.music_path])
            # Lower music volume
            filter_parts.append(
                f"[{input_index}:a]volume=0.3[music]"
            )
            audio_inputs.append("[music]")
            input_index += 1

        # Add SFX
        for sfx_path in scene.sfx_paths:
            if Path(sfx_path).exists():
                inputs.extend(["-i", sfx_path])
                filter_parts.append(
                    f"[{input_index}:a]volume=0.7[sfx{input_index}]"
                )
                audio_inputs.append(f"[sfx{input_index}]")
                input_index += 1

        cmd = ["ffmpeg", "-y"]
        cmd.extend(inputs)

        if audio_inputs:
            # Build amix filter
            n_audio = len(audio_inputs)
            mix_inputs = "".join(audio_inputs)
            filter_complex = ";".join(filter_parts) if filter_parts else ""
            if filter_complex:
                filter_complex += ";"
            filter_complex += (
                f"{mix_inputs}amix=inputs={n_audio}:"
                f"duration=longest:normalize=0[aout]"
            )

            cmd.extend([
                "-filter_complex", filter_complex,
                "-map", "0:v",
                "-map", "[aout]",
                "-c:v", "libx264",
                "-c:a", "aac",
                "-b:a", "192k",
                "-shortest",
                str(output_path),
            ])
        else:
            # No audio to mix, just copy video
            cmd.extend([
                "-c:v", "libx264",
                "-an",
                str(output_path),
            ])

        logger.info(f"Compositing scene {scene.scene_number}")
        result = await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, text=True
        )
        if result.returncode != 0:
            logger.error(f"FFmpeg error: {result.stderr}")
            raise RuntimeError(f"Scene compositing failed: {result.stderr}")

        logger.info(f"Composited scene saved: {output_path}")
        return str(output_path)

    async def assemble_timeline(
        self,
        project: Project,
        transition: str = "fade",
        transition_duration: float = 0.5,
    ) -> Timeline:
        """Auto-assemble a timeline from all composited scenes."""
        timeline = Timeline(
            resolution=project.export_settings.resolution,
            fps=project.export_settings.fps,
        )

        if not project.screenplay:
            return timeline

        current_time = 0.0
        for scene in project.screenplay.scenes:
            source = scene.composite_path or scene.selected_video
            if not source:
                continue

            # Get actual duration from the file
            duration = await self._get_media_duration(source)
            if duration <= 0:
                duration = scene.duration_seconds

            clip = TimelineClip(
                scene_id=scene.id,
                track="video",
                source_path=source,
                start_time=current_time,
                end_time=current_time + duration,
                transition_in=transition if current_time > 0 else None,
                transition_duration=transition_duration,
            )
            timeline.clips.append(clip)
            current_time += duration

        timeline.total_duration = current_time
        return timeline

    async def export_final(
        self,
        project: Project,
        output_filename: Optional[str] = None,
    ) -> str:
        """Export the final assembled film."""
        project_dir = get_project_dir(project.id)
        exports_dir = project_dir / "exports"
        exports_dir.mkdir(parents=True, exist_ok=True)

        if not output_filename:
            title_slug = (
                project.name.lower().replace(" ", "_")[:30]
                if project.name else "film"
            )
            ext = project.export_settings.format
            output_filename = f"{title_slug}_final.{ext}"

        output_path = exports_dir / output_filename
        es = project.export_settings

        # Collect all scene composites in order
        scene_files: list[str] = []
        if project.screenplay:
            for scene in project.screenplay.scenes:
                source = scene.composite_path or scene.selected_video
                if source and Path(source).exists():
                    scene_files.append(source)

        if not scene_files:
            raise ValueError("No scene files to export")

        if len(scene_files) == 1:
            # Single scene - just re-encode
            cmd = [
                "ffmpeg", "-y",
                "-i", scene_files[0],
                "-c:v", es.codec,
                "-b:v", es.video_bitrate,
                "-c:a", es.audio_codec,
                "-b:a", es.audio_bitrate,
                "-preset", es.quality_preset,
                "-r", str(es.fps),
                str(output_path),
            ]
        else:
            # Multiple scenes - concatenate with filter_complex
            concat_file = project_dir / "edit" / "concat_list.txt"
            concat_file.parent.mkdir(parents=True, exist_ok=True)

            # First, normalize all inputs to same resolution and fps
            normalized_dir = project_dir / "edit" / "normalized"
            normalized_dir.mkdir(parents=True, exist_ok=True)

            normalized_files: list[str] = []
            width, height = es.resolution.split("x")

            for i, sf in enumerate(scene_files):
                norm_path = normalized_dir / f"norm_{i:03d}.mp4"
                norm_cmd = [
                    "ffmpeg", "-y", "-i", sf,
                    "-vf", f"scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2",
                    "-r", str(es.fps),
                    "-c:v", es.codec,
                    "-c:a", es.audio_codec,
                    "-b:a", es.audio_bitrate,
                    "-preset", "fast",
                    str(norm_path),
                ]
                result = await asyncio.to_thread(
                    subprocess.run, norm_cmd, capture_output=True, text=True
                )
                if result.returncode != 0:
                    logger.warning(f"Normalization issue for {sf}: {result.stderr[:200]}")
                    # Use original if normalization fails
                    normalized_files.append(sf)
                else:
                    normalized_files.append(str(norm_path))

            # Write concat list
            with open(concat_file, "w") as f:
                for nf in normalized_files:
                    f.write(f"file '{nf}'\n")

            cmd = [
                "ffmpeg", "-y",
                "-f", "concat", "-safe", "0",
                "-i", str(concat_file),
                "-c:v", es.codec,
                "-b:v", es.video_bitrate,
                "-c:a", es.audio_codec,
                "-b:a", es.audio_bitrate,
                "-preset", es.quality_preset,
                "-r", str(es.fps),
                str(output_path),
            ]

        logger.info(f"Exporting final film: {output_path}")
        result = await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, text=True
        )
        if result.returncode != 0:
            logger.error(f"Export FFmpeg error: {result.stderr}")
            raise RuntimeError(f"Export failed: {result.stderr}")

        logger.info(f"Final export saved: {output_path}")
        return str(output_path)

    async def _get_media_duration(self, file_path: str) -> float:
        """Get the duration of a media file in seconds."""
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1",
            file_path,
        ]
        result = await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, text=True
        )
        try:
            return float(result.stdout.strip())
        except (ValueError, AttributeError):
            return 0.0

    async def generate_thumbnail(
        self,
        video_path: str,
        output_path: str,
        time_offset: float = 0.5,
    ) -> str:
        """Extract a thumbnail frame from a video."""
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(time_offset),
            "-i", video_path,
            "-vframes", "1",
            "-q:v", "2",
            output_path,
        ]
        await asyncio.to_thread(
            subprocess.run, cmd, capture_output=True, text=True
        )
        return output_path


editor_service = EditorService()
