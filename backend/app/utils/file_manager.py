"""File and project directory management utilities."""

from __future__ import annotations

import json
import shutil
from pathlib import Path
from typing import Optional

import aiofiles

from backend.app.config import settings
from backend.app.models.project import Project


def get_project_dir(project_id: str) -> Path:
    """Get the directory for a specific project."""
    return Path(settings.projects_dir) / project_id


def get_project_subdirs() -> dict[str, str]:
    """Standard subdirectory names within a project."""
    return {
        "script": "script",
        "storyboard": "storyboard",
        "video": "video",
        "audio_dialogue": "audio/dialogue",
        "audio_music": "audio/music",
        "audio_sfx": "audio/sfx",
        "edit": "edit",
        "exports": "exports",
        "assets": "assets",
        "assets_characters": "assets/character_refs",
        "assets_styles": "assets/style_refs",
        "assets_voices": "assets/voice_refs",
    }


def create_project_structure(project_id: str) -> Path:
    """Create the full directory structure for a new project."""
    project_dir = get_project_dir(project_id)
    for subdir in get_project_subdirs().values():
        (project_dir / subdir).mkdir(parents=True, exist_ok=True)
    return project_dir


async def save_project_metadata(project: Project) -> None:
    """Save project metadata to disk."""
    project_dir = get_project_dir(project.id)
    project_dir.mkdir(parents=True, exist_ok=True)
    meta_path = project_dir / "project.json"
    async with aiofiles.open(meta_path, "w") as f:
        await f.write(project.model_dump_json(indent=2))


async def load_project_metadata(project_id: str) -> Optional[Project]:
    """Load project metadata from disk."""
    meta_path = get_project_dir(project_id) / "project.json"
    if not meta_path.exists():
        return None
    async with aiofiles.open(meta_path, "r") as f:
        data = json.loads(await f.read())
    return Project(**data)


def list_projects() -> list[dict]:
    """List all projects with basic metadata."""
    projects_dir = Path(settings.projects_dir)
    if not projects_dir.exists():
        return []
    results = []
    for p in projects_dir.iterdir():
        if p.is_dir():
            meta_file = p / "project.json"
            if meta_file.exists():
                data = json.loads(meta_file.read_text())
                results.append({
                    "id": data.get("id", p.name),
                    "name": data.get("name", "Untitled"),
                    "status": data.get("status", "draft"),
                    "created_at": data.get("created_at", ""),
                    "updated_at": data.get("updated_at", ""),
                })
    return sorted(results, key=lambda x: x.get("updated_at", ""), reverse=True)


def delete_project(project_id: str) -> bool:
    """Delete a project and all its files."""
    project_dir = get_project_dir(project_id)
    if project_dir.exists():
        shutil.rmtree(project_dir)
        return True
    return False


async def save_file(project_id: str, subdir: str, filename: str, content: bytes) -> str:
    """Save a binary file to a project subdirectory and return its path."""
    project_dir = get_project_dir(project_id)
    target_dir = project_dir / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    file_path = target_dir / filename
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(content)
    return str(file_path)
