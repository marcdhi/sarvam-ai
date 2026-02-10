"""Export and final rendering API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from pathlib import Path

from backend.app.models.project import (
    ExportSettings,
    GenerationStatus,
    TaskProgress,
)
from backend.app.pipeline.film_pipeline import _active_tasks
from backend.app.services.editor_service import editor_service
from backend.app.utils.file_manager import load_project_metadata, save_project_metadata

router = APIRouter(
    prefix="/api/projects/{project_id}/export", tags=["export"]
)


class CompositeRequest(BaseModel):
    scene_indices: list[int] | None = None


class ExportRequest(BaseModel):
    format: str = "mp4"
    codec: str = "libx264"
    resolution: str = "1920x1080"
    fps: int = 24
    quality_preset: str = "medium"
    video_bitrate: str = "8M"
    audio_bitrate: str = "192k"


@router.post("/composite")
async def composite_scenes(
    project_id: str,
    req: CompositeRequest,
    background_tasks: BackgroundTasks,
):
    """Composite (video + audio) for selected or all scenes."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")

    task = TaskProgress(task_type="composite")
    _active_tasks[task.task_id] = task

    scenes = project.screenplay.scenes
    indices = req.scene_indices or list(range(len(scenes)))

    async def _composite():
        try:
            task.status = GenerationStatus.IN_PROGRESS
            for i, idx in enumerate(indices):
                if idx >= len(scenes):
                    continue
                scene = scenes[idx]
                task.progress = i / len(indices)
                task.message = f"Compositing scene {idx + 1}..."

                composite_path = await editor_service.composite_scene(
                    project_id, scene
                )
                if composite_path:
                    scene.composite_path = composite_path
                await save_project_metadata(project)

            # Auto-assemble timeline
            project.timeline = await editor_service.assemble_timeline(project)
            await save_project_metadata(project)

            task.status = GenerationStatus.COMPLETED
            task.progress = 1.0
            task.message = "Compositing completed"
        except Exception as e:
            task.status = GenerationStatus.FAILED
            task.error = str(e)

    background_tasks.add_task(_composite)
    return {"task_id": task.task_id, "status": "started"}


@router.post("/render")
async def render_final(
    project_id: str,
    req: ExportRequest,
    background_tasks: BackgroundTasks,
):
    """Render the final assembled film."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Update export settings
    project.export_settings = ExportSettings(
        format=req.format,
        codec=req.codec,
        resolution=req.resolution,
        fps=req.fps,
        quality_preset=req.quality_preset,
        video_bitrate=req.video_bitrate,
        audio_bitrate=req.audio_bitrate,
    )
    await save_project_metadata(project)

    task = TaskProgress(task_type="export")
    _active_tasks[task.task_id] = task

    async def _export():
        try:
            task.status = GenerationStatus.IN_PROGRESS
            task.message = "Rendering final film..."
            export_path = await editor_service.export_final(project)
            project.metadata["final_export"] = export_path
            project.updated_at = datetime.utcnow()
            await save_project_metadata(project)

            task.status = GenerationStatus.COMPLETED
            task.progress = 1.0
            task.message = "Export completed"
            task.result = {"path": export_path}
        except Exception as e:
            task.status = GenerationStatus.FAILED
            task.error = str(e)

    background_tasks.add_task(_export)
    return {"task_id": task.task_id, "status": "started"}


@router.get("/download")
async def download_export(project_id: str):
    """Download the final exported film."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    export_path = project.metadata.get("final_export")
    if not export_path or not Path(export_path).exists():
        raise HTTPException(status_code=404, detail="No export available")

    return FileResponse(
        export_path,
        media_type="video/mp4",
        filename=Path(export_path).name,
    )


@router.get("/timeline")
async def get_timeline(project_id: str):
    """Get the current editing timeline."""
    project = await load_project_metadata(project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"timeline": project.timeline.model_dump()}
