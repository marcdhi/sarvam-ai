"""End-to-end film production pipeline orchestrator."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Callable, Optional

from loguru import logger

from backend.app.config import settings
from backend.app.models.project import (
    CharacterVoice,
    GenerationStatus,
    Project,
    ProjectStatus,
    SceneStatus,
    Screenplay,
    TaskProgress,
)
from backend.app.services.editor_service import editor_service
from backend.app.services.music_service import music_service
from backend.app.services.script_service import script_service
from backend.app.services.storyboard_service import storyboard_service
from backend.app.services.video_service import video_service
from backend.app.services.voice_service import voice_service
from backend.app.utils.file_manager import (
    create_project_structure,
    save_project_metadata,
)


# In-memory task tracking (in production, use Redis or database)
_active_tasks: dict[str, TaskProgress] = {}


def get_task(task_id: str) -> Optional[TaskProgress]:
    return _active_tasks.get(task_id)


def _update_task(
    task: TaskProgress,
    status: GenerationStatus,
    progress: float,
    message: str,
) -> None:
    task.status = status
    task.progress = progress
    task.message = message


class FilmPipeline:
    """Orchestrates the full filmmaking pipeline."""

    async def run_full_pipeline(
        self,
        project: Project,
        prompt: str,
        genre: str = "",
        tone: str = "",
        on_progress: Optional[Callable[[str, float], None]] = None,
    ) -> Project:
        """Run the complete pipeline: script → storyboard → video → audio → edit.

        Returns the updated project with all generated assets.
        """
        task = TaskProgress(
            task_type="full_pipeline",
            status=GenerationStatus.IN_PROGRESS,
            message="Starting full pipeline...",
        )
        _active_tasks[task.task_id] = task

        try:
            create_project_structure(project.id)
            project.status = ProjectStatus.IN_PROGRESS

            # Stage 1: Script Generation (10%)
            _update_task(task, GenerationStatus.IN_PROGRESS, 0.05,
                         "Generating screenplay...")
            project = await self.generate_script(
                project, prompt, genre, tone
            )
            _update_task(task, GenerationStatus.IN_PROGRESS, 0.10,
                         "Screenplay completed")
            await save_project_metadata(project)

            if not project.screenplay or not project.screenplay.scenes:
                raise ValueError("Script generation produced no scenes")

            total_scenes = len(project.screenplay.scenes)

            # Stage 2: Storyboard Generation (10% → 30%)
            _update_task(task, GenerationStatus.IN_PROGRESS, 0.10,
                         "Generating storyboards...")
            for i, scene in enumerate(project.screenplay.scenes):
                progress = 0.10 + (0.20 * (i / total_scenes))
                _update_task(
                    task, GenerationStatus.IN_PROGRESS, progress,
                    f"Generating storyboard for scene {i+1}/{total_scenes}..."
                )
                frames = await storyboard_service.generate_storyboard(
                    project.id, scene,
                    num_frames=settings.storyboard_frames_per_scene,
                    style_notes=project.screenplay.style_notes,
                )
                scene.storyboard_frames = frames
                scene.status = SceneStatus.STORYBOARDED
                await save_project_metadata(project)

            # Stage 3: Video Generation (30% → 60%)
            _update_task(task, GenerationStatus.IN_PROGRESS, 0.30,
                         "Generating video clips...")
            for i, scene in enumerate(project.screenplay.scenes):
                progress = 0.30 + (0.30 * (i / total_scenes))
                _update_task(
                    task, GenerationStatus.IN_PROGRESS, progress,
                    f"Generating video for scene {i+1}/{total_scenes}..."
                )
                ref_image = scene.storyboard_frames[0] if scene.storyboard_frames else None
                video_path = await video_service.generate_video(
                    project.id, scene,
                    reference_image_path=ref_image,
                    duration_seconds=int(scene.duration_seconds),
                )
                scene.video_takes.append(video_path)
                scene.selected_video = video_path
                scene.status = SceneStatus.VIDEO_GENERATED
                await save_project_metadata(project)

            # Stage 4: Audio Generation (60% → 85%)
            _update_task(task, GenerationStatus.IN_PROGRESS, 0.60,
                         "Generating audio...")

            # Build character voice map
            char_voices: dict[str, CharacterVoice] = {}
            if project.screenplay.characters:
                for cv in project.screenplay.characters:
                    char_voices[cv.character_name] = cv

            for i, scene in enumerate(project.screenplay.scenes):
                progress = 0.60 + (0.25 * (i / total_scenes))
                _update_task(
                    task, GenerationStatus.IN_PROGRESS, progress,
                    f"Generating audio for scene {i+1}/{total_scenes}..."
                )

                # Generate dialogue
                if scene.dialogue:
                    audio_paths = await voice_service.generate_scene_dialogue(
                        project.id, scene.scene_number,
                        scene.dialogue, char_voices,
                    )
                    for j, path in enumerate(audio_paths):
                        if j < len(scene.dialogue):
                            scene.dialogue[j].audio_path = path

                # Generate music
                try:
                    music_path = await music_service.generate_music(
                        project.id, scene
                    )
                    scene.music_path = music_path
                except Exception as e:
                    logger.warning(f"Music generation failed for scene {i+1}: {e}")

                # Generate SFX
                try:
                    sfx_path = await music_service.generate_sfx(
                        project.id, scene
                    )
                    scene.sfx_paths.append(sfx_path)
                except Exception as e:
                    logger.warning(f"SFX generation failed for scene {i+1}: {e}")

                scene.status = SceneStatus.AUDIO_GENERATED
                await save_project_metadata(project)

            # Stage 5: Compositing & Assembly (85% → 95%)
            _update_task(task, GenerationStatus.IN_PROGRESS, 0.85,
                         "Compositing scenes...")
            for i, scene in enumerate(project.screenplay.scenes):
                progress = 0.85 + (0.10 * (i / total_scenes))
                _update_task(
                    task, GenerationStatus.IN_PROGRESS, progress,
                    f"Compositing scene {i+1}/{total_scenes}..."
                )
                try:
                    composite_path = await editor_service.composite_scene(
                        project.id, scene
                    )
                    scene.composite_path = composite_path
                    scene.status = SceneStatus.COMPOSITED
                except Exception as e:
                    logger.warning(f"Compositing failed for scene {i+1}: {e}")

            # Build timeline
            project.timeline = await editor_service.assemble_timeline(project)
            await save_project_metadata(project)

            # Stage 6: Final Export (95% → 100%)
            _update_task(task, GenerationStatus.IN_PROGRESS, 0.95,
                         "Exporting final film...")
            try:
                export_path = await editor_service.export_final(project)
                project.metadata["final_export"] = export_path
            except Exception as e:
                logger.warning(f"Final export failed: {e}")

            project.status = ProjectStatus.COMPLETED
            project.updated_at = datetime.utcnow()
            await save_project_metadata(project)

            _update_task(task, GenerationStatus.COMPLETED, 1.0,
                         "Pipeline completed!")
            task.result = {"project_id": project.id}

            return project

        except Exception as e:
            logger.exception(f"Pipeline failed: {e}")
            _update_task(task, GenerationStatus.FAILED, task.progress,
                         f"Pipeline failed: {str(e)}")
            task.error = str(e)
            raise

    async def generate_script(
        self,
        project: Project,
        prompt: str,
        genre: str = "",
        tone: str = "",
    ) -> Project:
        """Generate only the screenplay stage."""
        screenplay = await script_service.generate_screenplay(
            prompt=prompt,
            genre=genre,
            tone=tone,
            target_duration_minutes=project.screenplay.target_duration_minutes
            if project.screenplay else 1.0,
            style_notes=project.screenplay.style_notes
            if project.screenplay else "",
        )
        project.screenplay = screenplay
        project.name = project.name or screenplay.title
        project.updated_at = datetime.utcnow()
        return project

    async def generate_storyboards(self, project: Project) -> Project:
        """Generate storyboards for all scenes."""
        if not project.screenplay:
            raise ValueError("No screenplay to generate storyboards from")

        for scene in project.screenplay.scenes:
            if scene.status.value < SceneStatus.STORYBOARDED.value:
                frames = await storyboard_service.generate_storyboard(
                    project.id, scene,
                    num_frames=settings.storyboard_frames_per_scene,
                    style_notes=project.screenplay.style_notes,
                )
                scene.storyboard_frames = frames
                scene.status = SceneStatus.STORYBOARDED

        project.updated_at = datetime.utcnow()
        await save_project_metadata(project)
        return project

    async def generate_scene_video(
        self,
        project: Project,
        scene_index: int,
    ) -> Project:
        """Generate video for a specific scene."""
        if not project.screenplay:
            raise ValueError("No screenplay")
        if scene_index >= len(project.screenplay.scenes):
            raise ValueError(f"Scene index {scene_index} out of range")

        scene = project.screenplay.scenes[scene_index]
        ref_image = scene.storyboard_frames[0] if scene.storyboard_frames else None

        video_path = await video_service.generate_video(
            project.id, scene,
            reference_image_path=ref_image,
            duration_seconds=int(scene.duration_seconds),
        )
        scene.video_takes.append(video_path)
        scene.selected_video = video_path
        scene.status = SceneStatus.VIDEO_GENERATED

        project.updated_at = datetime.utcnow()
        await save_project_metadata(project)
        return project


film_pipeline = FilmPipeline()
