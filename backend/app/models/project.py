"""Core data models for film projects."""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProjectStatus(str, Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class SceneStatus(str, Enum):
    SCRIPTED = "scripted"
    STORYBOARDED = "storyboarded"
    VIDEO_GENERATED = "video_generated"
    AUDIO_GENERATED = "audio_generated"
    COMPOSITED = "composited"
    FINALIZED = "finalized"


class GenerationStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class CharacterVoice(BaseModel):
    """Voice configuration for a character."""
    character_name: str
    voice_id: Optional[str] = None
    voice_provider: str = "elevenlabs"
    voice_settings: dict = Field(default_factory=lambda: {
        "stability": 0.5,
        "similarity_boost": 0.75,
        "style": 0.5,
    })


class DialogueLine(BaseModel):
    """A single line of dialogue."""
    character: str
    text: str
    direction: Optional[str] = None  # e.g., "(whispering)", "(angry)"
    audio_path: Optional[str] = None


class Scene(BaseModel):
    """A single scene in the screenplay."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scene_number: int
    heading: str  # e.g., "INT. OFFICE - DAY"
    location: str
    time_of_day: str = "DAY"
    description: str
    action: str = ""
    dialogue: list[DialogueLine] = Field(default_factory=list)
    camera_notes: str = ""
    mood: str = ""
    lighting: str = ""
    duration_seconds: float = 10.0
    status: SceneStatus = SceneStatus.SCRIPTED

    # Generated assets
    storyboard_frames: list[str] = Field(default_factory=list)  # file paths
    video_takes: list[str] = Field(default_factory=list)  # file paths
    selected_video: Optional[str] = None
    music_path: Optional[str] = None
    sfx_paths: list[str] = Field(default_factory=list)
    composite_path: Optional[str] = None


class Screenplay(BaseModel):
    """Full screenplay structure."""
    title: str
    logline: str = ""
    genre: str = ""
    tone: str = ""
    target_duration_minutes: float = 1.0
    synopsis: str = ""
    scenes: list[Scene] = Field(default_factory=list)
    characters: list[CharacterVoice] = Field(default_factory=list)
    style_notes: str = ""
    raw_text: str = ""


class TimelineClip(BaseModel):
    """A clip on the editing timeline."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    scene_id: str
    track: str  # "video", "dialogue", "music", "sfx"
    source_path: str
    start_time: float  # seconds on timeline
    end_time: float
    in_point: float = 0.0  # trim start
    out_point: Optional[float] = None  # trim end
    volume: float = 1.0
    opacity: float = 1.0
    transition_in: Optional[str] = None  # "fade", "dissolve", "cut"
    transition_duration: float = 0.5


class Timeline(BaseModel):
    """The editing timeline."""
    clips: list[TimelineClip] = Field(default_factory=list)
    total_duration: float = 0.0
    resolution: str = "1920x1080"
    fps: int = 24


class ExportSettings(BaseModel):
    """Settings for final export."""
    format: str = "mp4"
    codec: str = "libx264"
    resolution: str = "1920x1080"
    fps: int = 24
    audio_codec: str = "aac"
    audio_bitrate: str = "192k"
    video_bitrate: str = "8M"
    quality_preset: str = "medium"  # ultrafast, fast, medium, slow, veryslow


class Project(BaseModel):
    """A complete film project."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    status: ProjectStatus = ProjectStatus.DRAFT
    project_dir: str = ""
    screenplay: Optional[Screenplay] = None
    timeline: Timeline = Field(default_factory=Timeline)
    export_settings: ExportSettings = Field(default_factory=ExportSettings)
    style_reference_images: list[str] = Field(default_factory=list)
    metadata: dict = Field(default_factory=dict)


class TaskProgress(BaseModel):
    """Progress tracking for async tasks."""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_type: str  # "script", "storyboard", "video", "audio", "export"
    status: GenerationStatus = GenerationStatus.PENDING
    progress: float = 0.0  # 0.0 to 1.0
    message: str = ""
    result: Optional[dict] = None
    error: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
