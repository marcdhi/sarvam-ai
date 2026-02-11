"""Script / screenplay generation API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.app.models.project import Scene
from backend.app.services.script_service import script_service
from backend.app.utils.file_manager import load_project_metadata, save_project_metadata

router = APIRouter(prefix="/api/projects/{project_id}/script", tags=["script"])


class GenerateScriptRequest(BaseModel):
    prompt: str
    genre: str = ""
    tone: str = ""
    target_duration_minutes: float = 1.0
    num_scenes: int | None = None
    style_notes: str = ""


class RewriteSceneRequest(BaseModel):
    notes: str


class ExpandSceneRequest(BaseModel):
    brief: str
    scene_number: int = 1


@router.post("/generate")
async def generate_script(project_id: str, req: GenerateScriptRequest):
    """Generate a screenplay for the project."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    screenplay = await script_service.generate_screenplay(
        prompt=req.prompt,
        genre=req.genre,
        tone=req.tone,
        target_duration_minutes=req.target_duration_minutes,
        num_scenes=req.num_scenes,
        style_notes=req.style_notes,
    )

    project.screenplay = screenplay
    project.name = project.name or screenplay.title
    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)

    return {
        "screenplay": screenplay.model_dump(),
        "scene_count": len(screenplay.scenes),
    }


@router.get("/")
async def get_script(project_id: str):
    """Get the current screenplay."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.screenplay:
        raise HTTPException(status_code=404, detail="No screenplay generated yet")
    return {"screenplay": project.screenplay.model_dump()}


@router.put("/scenes/{scene_index}")
async def update_scene(project_id: str, scene_index: int, scene_data: dict):
    """Manually update a scene."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")
    if scene_index >= len(project.screenplay.scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    scene = project.screenplay.scenes[scene_index]
    for key, value in scene_data.items():
        if hasattr(scene, key):
            setattr(scene, key, value)

    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)
    return {"scene": scene.model_dump()}


@router.post("/scenes/{scene_index}/rewrite")
async def rewrite_scene(
    project_id: str, scene_index: int, req: RewriteSceneRequest
):
    """Rewrite a scene using AI based on director's notes."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")
    if scene_index >= len(project.screenplay.scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    original = project.screenplay.scenes[scene_index]
    rewritten = await script_service.rewrite_scene(original, req.notes)
    project.screenplay.scenes[scene_index] = rewritten

    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)
    return {"scene": rewritten.model_dump()}


@router.post("/scenes/expand")
async def expand_scene(project_id: str, req: ExpandSceneRequest):
    """Expand a brief description into a full scene and add it."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not project.screenplay:
        from backend.app.models.project import Screenplay
        project.screenplay = Screenplay(title=project.name)

    scene = await script_service.expand_scene(req.brief, req.scene_number)
    project.screenplay.scenes.append(scene)

    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)
    return {"scene": scene.model_dump()}


@router.delete("/scenes/{scene_index}")
async def delete_scene(project_id: str, scene_index: int):
    """Delete a scene from the screenplay."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")
    if scene_index >= len(project.screenplay.scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    removed = project.screenplay.scenes.pop(scene_index)
    # Renumber remaining scenes
    for i, scene in enumerate(project.screenplay.scenes):
        scene.scene_number = i + 1

    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)
    return {"removed": removed.model_dump(), "remaining": len(project.screenplay.scenes)}
