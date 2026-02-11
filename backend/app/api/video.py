"""Video generation API routes."""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from backend.app.models.project import GenerationStatus, SceneStatus, TaskProgress
from backend.app.pipeline.film_pipeline import _active_tasks
from backend.app.services.video_service import video_service
from backend.app.utils.file_manager import load_project_metadata, save_project_metadata

router = APIRouter(
    prefix="/api/projects/{project_id}/video", tags=["video"]
)


class GenerateVideoRequest(BaseModel):
    scene_indices: list[int] | None = None
    duration_seconds: int | None = None


class SelectTakeRequest(BaseModel):
    take_path: str


@router.post("/generate")
async def generate_videos(
    project_id: str,
    req: GenerateVideoRequest,
    background_tasks: BackgroundTasks,
):
    """Generate video clips for selected or all scenes."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")

    task = TaskProgress(task_type="video")
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
                task.message = f"Generating video for scene {idx + 1}..."

                ref_image = (
                    scene.storyboard_frames[0]
                    if scene.storyboard_frames else None
                )
                duration = req.duration_seconds or int(scene.duration_seconds)

                video_path = await video_service.generate_video(
                    project_id, scene,
                    reference_image_path=ref_image,
                    duration_seconds=duration,
                )
                scene.video_takes.append(video_path)
                scene.selected_video = video_path
                scene.status = SceneStatus.VIDEO_GENERATED
                await save_project_metadata(project)

            task.status = GenerationStatus.COMPLETED
            task.progress = 1.0
            task.message = "Video generation completed"
        except Exception as e:
            task.status = GenerationStatus.FAILED
            task.error = str(e)

    background_tasks.add_task(_generate)
    return {"task_id": task.task_id, "status": "started"}


@router.get("/scenes/{scene_index}/takes")
async def get_scene_takes(project_id: str, scene_index: int):
    """Get all video takes for a specific scene."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")
    if scene_index >= len(project.screenplay.scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    scene = project.screenplay.scenes[scene_index]
    return {
        "scene_number": scene.scene_number,
        "takes": scene.video_takes,
        "selected": scene.selected_video,
    }


@router.put("/scenes/{scene_index}/select-take")
async def select_take(
    project_id: str, scene_index: int, req: SelectTakeRequest
):
    """Select which video take to use for a scene."""
    project = await load_project_metadata(project_id)
    if not project or not project.screenplay:
        raise HTTPException(status_code=404, detail="Project/screenplay not found")
    if scene_index >= len(project.screenplay.scenes):
        raise HTTPException(status_code=404, detail="Scene not found")

    scene = project.screenplay.scenes[scene_index]
    if req.take_path not in scene.video_takes:
        raise HTTPException(status_code=400, detail="Take not found in scene")

    scene.selected_video = req.take_path
    project.updated_at = datetime.utcnow()
    await save_project_metadata(project)
    return {"selected": scene.selected_video}
