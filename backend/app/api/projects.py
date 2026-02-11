"""Project management API routes."""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.app.models.project import (
    ExportSettings,
    Project,
    ProjectStatus,
    Screenplay,
    TaskProgress,
)
from backend.app.pipeline.film_pipeline import (
    _active_tasks,
    film_pipeline,
    get_task,
)
from backend.app.utils.file_manager import (
    create_project_structure,
    delete_project,
    list_projects,
    load_project_metadata,
    save_project_metadata,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""
    target_duration_minutes: float = 1.0
    resolution: str = "1920x1080"
    fps: int = 24


class FullPipelineRequest(BaseModel):
    prompt: str
    genre: str = ""
    tone: str = ""
    style_notes: str = ""
    target_duration_minutes: float = 1.0


@router.get("/")
async def get_projects():
    """List all projects."""
    return {"projects": list_projects()}


@router.post("/")
async def create_project(req: CreateProjectRequest):
    """Create a new project."""
    project = Project(
        name=req.name,
        description=req.description,
        screenplay=Screenplay(
            title=req.name,
            target_duration_minutes=req.target_duration_minutes,
        ),
        export_settings=ExportSettings(
            resolution=req.resolution,
            fps=req.fps,
        ),
    )
    project.project_dir = str(create_project_structure(project.id))
    await save_project_metadata(project)
    return {"project": project.model_dump()}


@router.get("/{project_id}")
async def get_project(project_id: str):
    """Get project details."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": project.model_dump()}


@router.delete("/{project_id}")
async def remove_project(project_id: str):
    """Delete a project."""
    if delete_project(project_id):
        return {"status": "deleted"}
    raise HTTPException(status_code=404, detail="Project not found")


@router.put("/{project_id}")
async def update_project(project_id: str, updates: dict):
    """Update project metadata."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    for key, value in updates.items():
        if hasattr(project, key) and key not in ("id", "created_at"):
            setattr(project, key, value)

    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)
    return {"project": project.model_dump()}


@router.post("/{project_id}/pipeline/full")
async def run_full_pipeline(
    project_id: str,
    req: FullPipelineRequest,
    background_tasks: BackgroundTasks,
):
    """Run the complete filmmaking pipeline in the background."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.screenplay:
        project.screenplay.target_duration_minutes = req.target_duration_minutes
        project.screenplay.style_notes = req.style_notes

    task = TaskProgress(task_type="full_pipeline")
    _active_tasks[task.task_id] = task

    async def _run():
        try:
            await film_pipeline.run_full_pipeline(
                project, req.prompt, req.genre, req.tone
            )
        except Exception:
            pass  # Error is captured in task

    background_tasks.add_task(_run)

    return {"task_id": task.task_id, "status": "started"}


@router.get("/{project_id}/pipeline/status/{task_id}")
async def get_pipeline_status(project_id: str, task_id: str):
    """Get the status of a pipeline task."""
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"task": task.model_dump()}
