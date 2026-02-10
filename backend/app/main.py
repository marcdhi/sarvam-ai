"""AI Filmmaking Studio - FastAPI Backend Server."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger

from backend.app.api import audio, export, motion, projects, scripts, settings as settings_api, storyboard, video
from backend.app.config import ensure_directories, settings

# Configure logging
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO",
)
logger.add(
    "filmstudio.log",
    rotation="10 MB",
    retention="7 days",
    level="DEBUG",
)

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="AI-powered end-to-end filmmaking studio",
)

# CORS for Electron/local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(projects.router)
app.include_router(scripts.router)
app.include_router(storyboard.router)
app.include_router(video.router)
app.include_router(audio.router)
app.include_router(export.router)
app.include_router(settings_api.router)
app.include_router(motion.router)

# Serve project files (storyboards, videos, etc.) statically
projects_dir = Path(settings.projects_dir)
if projects_dir.exists():
    app.mount(
        "/files",
        StaticFiles(directory=str(projects_dir)),
        name="project_files",
    )


@app.on_event("startup")
async def startup():
    ensure_directories()
    # Mount files after directory creation
    projects_dir = Path(settings.projects_dir)
    if projects_dir.exists() and not any(
        r.path == "/files" for r in app.routes
    ):
        app.mount(
            "/files",
            StaticFiles(directory=str(projects_dir)),
            name="project_files",
        )
    logger.info(f"{settings.app_name} v{settings.app_version} starting")
    logger.info(f"Projects directory: {settings.projects_dir}")


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "app": settings.app_name,
        "version": settings.app_version,
    }


def start_server():
    """Entry point for running the server."""
    import uvicorn
    uvicorn.run(
        "backend.app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
    )


if __name__ == "__main__":
    start_server()
