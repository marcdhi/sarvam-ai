"""Data models for motion graphics projects."""

from __future__ import annotations

from enum import Enum
from typing import Any, Optional, Union

from pydantic import BaseModel, Field


# ─── Easing ─────────────────────────────────────────────────────────────────

class EasingName(str, Enum):
    linear = "linear"
    ease_in = "easeIn"
    ease_out = "easeOut"
    ease_in_out = "easeInOut"
    spring = "spring"
    bounce = "bounce"


EasingType = Union[EasingName, list[float]]  # named or cubic-bezier [x1,y1,x2,y2]


# ─── Keyframe ───────────────────────────────────────────────────────────────

class Keyframe(BaseModel):
    id: str
    time: float  # seconds
    value: Union[float, str]
    easing: EasingType = EasingName.ease_in_out


# ─── Layer Properties ───────────────────────────────────────────────────────

class LayerTransform(BaseModel):
    x: float = 0
    y: float = 0
    width: float = 200
    height: float = 200
    rotation: float = 0
    opacity: float = 1
    scaleX: float = 1
    scaleY: float = 1
    anchorX: float = 0.5
    anchorY: float = 0.5


class LayerAppearance(BaseModel):
    fill: str = "#ffffff"
    stroke: str = "transparent"
    strokeWidth: float = 0
    borderRadius: float = 0


class LayerEffects(BaseModel):
    blur: float = 0
    shadowX: float = 0
    shadowY: float = 0
    shadowBlur: float = 0
    shadowColor: str = "rgba(0,0,0,0.3)"
    shadowOpacity: float = 0


class TextProperties(BaseModel):
    text: str = "Text"
    fontSize: float = 48
    fontFamily: str = "Inter"
    fontWeight: int = 600
    letterSpacing: float = 0
    lineHeight: float = 1.2
    textAlign: str = "center"
    color: str = "#ffffff"


class ShapeProperties(BaseModel):
    shapeType: str = "rectangle"  # rectangle, ellipse, polygon, line, star
    points: Optional[int] = None


class PathProperties(BaseModel):
    trimStart: float = 0
    trimEnd: float = 1


# ─── Layer Types ────────────────────────────────────────────────────────────

class LayerType(str, Enum):
    text = "text"
    shape = "shape"
    image = "image"
    video = "video"
    group = "group"
    svg = "svg"


class MotionLayer(BaseModel):
    id: str
    name: str
    type: LayerType
    visible: bool = True
    locked: bool = False
    inPoint: float = 0
    outPoint: float = 5
    transform: LayerTransform = Field(default_factory=LayerTransform)
    appearance: LayerAppearance = Field(default_factory=LayerAppearance)
    effects: LayerEffects = Field(default_factory=LayerEffects)
    textProps: Optional[TextProperties] = None
    shapeProps: Optional[ShapeProperties] = None
    pathProps: Optional[PathProperties] = None
    imageSrc: Optional[str] = None
    videoSrc: Optional[str] = None
    keyframes: dict[str, list[Keyframe]] = Field(default_factory=dict)
    children: Optional[list[MotionLayer]] = None


# ─── Scene ──────────────────────────────────────────────────────────────────

class TransitionType(str, Enum):
    none = "none"
    fade = "fade"
    slide_left = "slideLeft"
    slide_right = "slideRight"
    slide_up = "slideUp"
    slide_down = "slideDown"
    dissolve = "dissolve"
    wipe = "wipe"


class SceneTransition(BaseModel):
    type: TransitionType = TransitionType.none
    duration: float = 0.5


class MotionScene(BaseModel):
    id: str
    name: str
    duration: float = 5
    bgColor: str = "#000000"
    layers: list[MotionLayer] = Field(default_factory=list)
    transition: Optional[SceneTransition] = None


# ─── Project ────────────────────────────────────────────────────────────────

class MotionProject(BaseModel):
    id: str
    name: str
    canvasWidth: int = 1920
    canvasHeight: int = 1080
    fps: int = 30
    scenes: list[MotionScene] = Field(default_factory=list)
    createdAt: str = ""
    updatedAt: str = ""


# ─── API Request/Response ───────────────────────────────────────────────────

class MotionPromptRequest(BaseModel):
    prompt: str
    canvas_width: int = 1920
    canvas_height: int = 1080
    duration: float = 5
    style: Optional[str] = None  # e.g. "minimal", "bold", "corporate"


class MotionEditRequest(BaseModel):
    instruction: str
    scene_id: str


class AnimationPreset(BaseModel):
    id: str
    name: str
    category: str  # enter, exit, emphasis, transition
    description: str
    keyframes: dict[str, list[Keyframe]]
    duration: float = 1.0
