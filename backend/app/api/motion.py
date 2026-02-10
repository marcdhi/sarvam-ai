"""API endpoints for AI-powered motion graphics."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from loguru import logger

from backend.app.models.motion import (
    MotionEditRequest,
    MotionProject,
    MotionPromptRequest,
    MotionScene,
)
from backend.app.services.motion_service import motion_service

router = APIRouter(prefix="/api/motion", tags=["motion"])


@router.post("/generate", response_model=MotionProject)
async def generate_motion(req: MotionPromptRequest):
    """Generate a motion graphics project from a natural language prompt."""
    try:
        project = await motion_service.generate_from_prompt(
            prompt=req.prompt,
            canvas_width=req.canvas_width,
            canvas_height=req.canvas_height,
            duration=req.duration,
            style=req.style,
        )
        return project
    except Exception as e:
        logger.error(f"Motion generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/edit-scene", response_model=MotionScene)
async def edit_scene(req: MotionEditRequest):
    """Edit an existing scene using AI based on natural language instructions.

    Expects the full scene object in the request body alongside the instruction.
    """
    try:
        # We need the scene data in the body too — parse it from the raw request
        # The client sends { instruction, scene_id, scene: {...} }
        raise HTTPException(
            status_code=501,
            detail="Scene editing requires the full scene object. Use /edit-scene-full instead.",
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Scene edit failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


class SceneEditFullRequest(MotionEditRequest):
    """Full scene edit request including the scene data."""
    scene: MotionScene


@router.post("/edit-scene-full", response_model=MotionScene)
async def edit_scene_full(req: SceneEditFullRequest):
    """Edit a scene by sending the full scene data + instruction."""
    try:
        updated_scene = await motion_service.edit_scene(
            scene=req.scene,
            instruction=req.instruction,
        )
        return updated_scene
    except Exception as e:
        logger.error(f"Scene edit failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/presets")
async def get_presets():
    """Return the list of available animation presets."""
    from backend.app.models.motion import AnimationPreset, EasingName, Keyframe

    presets = [
        AnimationPreset(
            id="fade-in", name="Fade In", category="enter",
            description="Smooth opacity fade from 0 to 1", duration=0.6,
            keyframes={"opacity": [
                Keyframe(id="1", time=0, value=0, easing=EasingName.linear),
                Keyframe(id="2", time=1, value=1, easing=EasingName.ease_out),
            ]},
        ),
        AnimationPreset(
            id="slide-in-left", name="Slide In Left", category="enter",
            description="Slide in from the left with fade", duration=0.8,
            keyframes={
                "x": [
                    Keyframe(id="3", time=0, value=-200, easing=EasingName.linear),
                    Keyframe(id="4", time=1, value=0, easing=EasingName.ease_out),
                ],
                "opacity": [
                    Keyframe(id="5", time=0, value=0, easing=EasingName.linear),
                    Keyframe(id="6", time=0.3, value=1, easing=EasingName.ease_out),
                ],
            },
        ),
        AnimationPreset(
            id="scale-in", name="Scale In", category="enter",
            description="Scale up from zero", duration=0.7,
            keyframes={
                "scaleX": [
                    Keyframe(id="7", time=0, value=0, easing=EasingName.linear),
                    Keyframe(id="8", time=1, value=1, easing=EasingName.spring),
                ],
                "scaleY": [
                    Keyframe(id="9", time=0, value=0, easing=EasingName.linear),
                    Keyframe(id="10", time=1, value=1, easing=EasingName.spring),
                ],
            },
        ),
        AnimationPreset(
            id="bounce-in", name="Bounce In", category="enter",
            description="Bouncy scale entrance", duration=0.8,
            keyframes={
                "scaleX": [
                    Keyframe(id="11", time=0, value=0, easing=EasingName.linear),
                    Keyframe(id="12", time=1, value=1, easing=EasingName.bounce),
                ],
                "scaleY": [
                    Keyframe(id="13", time=0, value=0, easing=EasingName.linear),
                    Keyframe(id="14", time=1, value=1, easing=EasingName.bounce),
                ],
            },
        ),
    ]
    return [p.model_dump() for p in presets]
