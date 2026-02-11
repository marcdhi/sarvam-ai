"""Audio generation API routes (voice, music, SFX)."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.app.models.project import (
    CharacterVoice,
    GenerationStatus,
    SceneStatus,
    TaskProgress,
)
from backend.app.pipeline.film_pipeline import _active_tasks
from backend.app.services.music_service import music_service
from backend.app.services.voice_service import voice_service
from backend.app.utils.file_manager import load_project_metadata, save_project_metadata

router = APIRouter(
    prefix="/api/projects/{project_id}/audio", tags=["audio"]
)


class GenerateDialogueRequest(BaseModel):
    scene_indices: list[int] | None = None


class GenerateMusicRequest(BaseModel):
    scene_indices: list[int] | None = None
    custom_prompt: str | None = None


class GenerateSFXRequest(BaseModel):
    scene_index: int
    prompt: str | None = None


class VoiceConfigRequest(BaseModel):
    character_name: str
    voice_id: str
    voice_provider: str = "elevenlabs"


@router.post("/dialogue/generate")
async def generate_dialogue(
    project_id: str,
    req: GenerateDialogueRequest,
    background_tasks: BackgroundTasks,
):
    """Generate dialogue audio for selected or all scenes."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")

    task = TaskProgress(task_type="dialogue")
    _active_tasks[task.task_id] = task

    scenes = project.screenplay.scenes
    indices = req.scene_indices or list(range(len(scenes)))

    char_voices: dict[str, CharacterVoice] = {}
    for cv in project.screenplay.characters:
        char_voices[cv.character_name] = cv

    async def _generate():
        try:
            task.status = GenerationStatus.IN_PROGRESS
            for i, idx in enumerate(indices):
                if idx >= len(scenes):
                    continue
                scene = scenes[idx]
                if not scene.dialogue:
                    continue

                task.progress = i / len(indices)
                task.message = f"Generating dialogue for scene {idx + 1}..."

                audio_paths = await voice_service.generate_scene_dialogue(
                    project_id, scene.scene_number,
                    scene.dialogue, char_voices,
                )
                for j, path in enumerate(audio_paths):
                    if j < len(scene.dialogue):
                        scene.dialogue[j].audio_path = path

                await save_project_metadata(project)

            task.status = GenerationStatus.COMPLETED
            task.progress = 1.0
            task.message = "Dialogue generation completed"
        except Exception as e:
            task.status = GenerationStatus.FAILED
            task.error = str(e)

    background_tasks.add_task(_generate)
    return {"task_id": task.task_id, "status": "started"}


@router.post("/music/generate")
async def generate_music(
    project_id: str,
    req: GenerateMusicRequest,
    background_tasks: BackgroundTasks,
):
    """Generate background music for selected or all scenes."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")

    task = TaskProgress(task_type="music")
    _active_tasks[task.task_id] = task

    scenes = project.screenplay.scenes
    indices = req.scene_indices or list(range(len(scenes)))

    async def _generate():
        try:
            task.status = GenerationStatus.IN_PROGRESS
            for i, idx in enumerate(indices):
                if idx >= len(scenes):
                    continue
                scene = scenes[idx]
                task.progress = i / len(indices)
                task.message = f"Generating music for scene {idx + 1}..."

                music_path = await music_service.generate_music(
                    project_id, scene
                )
                scene.music_path = music_path
                await save_project_metadata(project)

            task.status = GenerationStatus.COMPLETED
            task.progress = 1.0
            task.message = "Music generation completed"
        except Exception as e:
            task.status = GenerationStatus.FAILED
            task.error = str(e)

    background_tasks.add_task(_generate)
    return {"task_id": task.task_id, "status": "started"}


@router.post("/sfx/generate")
async def generate_sfx(project_id: str, req: GenerateSFXRequest):
    """Generate sound effects for a scene."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")
    if req.scene_index >= len(project.screenplay.scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    scene = project.screenplay.scenes[req.scene_index]
    sfx_path = await music_service.generate_sfx(
        project_id, scene, custom_prompt=req.prompt
    )
    scene.sfx_paths.append(sfx_path)
    await save_project_metadata(project)
    return {"sfx_path": sfx_path}


@router.get("/voices")
async def list_voices(project_id: str):
    """List available voices from configured providers."""
    voices = await voice_service.list_elevenlabs_voices()
    return {"voices": voices}


@router.post("/voices/configure")
async def configure_voice(project_id: str, req: VoiceConfigRequest):
    """Assign a voice to a character."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")

    # Find or create character voice config
    found = False
    for cv in project.screenplay.characters:
        if cv.character_name == req.character_name:
            cv.voice_id = req.voice_id
            cv.voice_provider = req.voice_provider
            found = True
            break

    if not found:
        project.screenplay.characters.append(CharacterVoice(
            character_name=req.character_name,
            voice_id=req.voice_id,
            voice_provider=req.voice_provider,
        ))

    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)
    return {"status": "configured"}
