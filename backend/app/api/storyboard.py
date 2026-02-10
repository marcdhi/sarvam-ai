"""Storyboard generation API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.models.project import GenerationStatus, SceneStatus, TaskProgress
from backend.app.pipeline.film_pipeline import _active_tasks
from backend.app.services.storyboard_service import storyboard_service
from backend.app.utils.file_manager import load_project_metadata, save_project_metadata

router = APIRouter(
    prefix="/api/projects/{project_id}/storyboard", tags=["storyboard"]
)


class GenerateStoryboardRequest(BaseModel):
    scene_indices: list[int] | None = None  # None = all scenes
    frames_per_scene: int = 3
    style_notes: str = ""


class ConceptArtRequest(BaseModel):
    prompt: str


class EditImageRequest(BaseModel):
    image_path: str
    instruction: str


@router.post("/generate")
async def generate_storyboards(
    project_id: str,
    req: GenerateStoryboardRequest,
    background_tasks: BackgroundTasks,
):
    """Generate storyboard frames for selected or all scenes."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")

    task = TaskProgress(task_type="storyboard")
    _active_tasks[task.task_id] = task

    scenes = project.screenplay.scenes
    indices = req.scene_indices or list(range(len(scenes)))
    style = req.style_notes or project.screenplay.style_notes

    async def _generate():
        try:
            task.status = GenerationStatus.IN_PROGRESS
            for i, idx in enumerate(indices):
                if idx >= len(scenes):
                    continue
                scene = scenes[idx]
                task.progress = i / len(indices)
                task.message = f"Generating storyboard for scene {idx + 1}..."

                frames = await storyboard_service.generate_storyboard(
                    project_id, scene,
                    num_frames=req.frames_per_scene,
                    style_notes=style,
                )
                scene.storyboard_frames = frames
                scene.status = SceneStatus.STORYBOARDED
                await save_project_metadata(project)

            task.status = GenerationStatus.COMPLETED
            task.progress = 1.0
            task.message = "Storyboards completed"
        except Exception as e:
            task.status = GenerationStatus.FAILED
            task.error = str(e)

    background_tasks.add_task(_generate)
    return {"task_id": task.task_id, "status": "started"}


@router.get("/scenes/{scene_index}")
async def get_scene_storyboard(project_id: str, scene_index: int):
    """Get storyboard frames for a specific scene."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")
    if scene_index >= len(project.screenplay.scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    scene = project.screenplay.scenes[scene_index]
    return {
        "scene_number": scene.scene_number,
        "frames": scene.storyboard_frames,
        "status": scene.status,
    }


@router.post("/concept-art")
async def generate_concept_art(project_id: str, req: ConceptArtRequest):
    """Generate a single concept art image."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    from backend.app.utils.file_manager import get_project_dir

    output_dir = get_project_dir(project_id) / "assets" / "concept_art"
    output_dir.mkdir(parents=True, exist_ok=True)

    import uuid
    filename = f"concept_{uuid.uuid4().hex[:8]}.png"
    output_path = str(output_dir / filename)

    await storyboard_service.generate_single_frame(req.prompt, output_path)
    return {"path": output_path}


@router.post("/edit-image")
async def edit_image(project_id: str, req: EditImageRequest):
    """Edit an existing image using Nano Banana (Gemini) conversational editing.

    Send an image path and a natural language instruction to modify it.
    Examples: "Remove the background", "Make it nighttime", "Add rain".
    """
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if settings.image_provider != "gemini":
        raise HTTPException(
            status_code=400,
            detail="Image editing requires Gemini (Nano Banana) as the image provider"
        )

    from backend.app.utils.file_manager import get_project_dir
    import uuid

    output_dir = get_project_dir(project_id) / "assets" / "edited"
    output_dir.mkdir(parents=True, exist_ok=True)
    filename = f"edited_{uuid.uuid4().hex[:8]}.png"
    output_path = str(output_dir / filename)

    await storyboard_service.edit_image_gemini(
        req.image_path, req.instruction, output_path
    )
    return {"path": output_path}
