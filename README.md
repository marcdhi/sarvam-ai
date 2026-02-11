# AI Filmmaking Studio

A production-ready, end-to-end AI-powered filmmaking studio desktop application. Generate complete films from a text prompt — the system handles script writing, storyboard creation, video generation, voice synthesis, music composition, sound effects, and final editing/export.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Electron Desktop App                                        │
│  ┌────────────────────────┐  ┌────────────────────────────┐  │
│  │  React + TypeScript UI │  │  Electron Main Process     │  │
│  │  - Project Manager     │  │  - Window management       │  │
│  │  - Script Editor       │  │  - Backend lifecycle       │  │
│  │  - Storyboard View     │  │  - File system access      │  │
│  │  - Video Preview       │  │                            │  │
│  │  - Audio Mixer         │  └────────────┬───────────────┘  │
│  │  - Timeline Editor     │               │                  │
│  │  - Export Settings     │  ┌────────────▼───────────────┐  │
│  └────────────┬───────────┘  │  Python FastAPI Backend    │  │
│               │              │  - Script generation (LLM) │  │
│               └──────────────│  - Storyboard (DALL-E/Flux)│  │
│                    REST API  │  - Video (Runway/LTX)      │  │
│                              │  - Voice (ElevenLabs/TTS)  │  │
│                              │  - Music (Stable Audio)    │  │
│                              │  - SFX (ElevenLabs)        │  │
│                              │  - Editing (FFmpeg)        │  │
│                              └────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Pipeline

```
Prompt → Script → Storyboard → Video → Audio → Timeline → Export
         (LLM)   (Images)     (AI)    (TTS+    (FFmpeg)   (Final
                                       Music+             Render)
                                       SFX)
```

## Features

- **Script Generation** — AI-powered screenplay writing with scene breakdowns, dialogue, camera notes, and mood descriptions. Supports rewriting individual scenes with director's notes.
- **Storyboard Creation** — Generates cinematic keyframe images for each scene using DALL-E 3 or Flux Pro, with consistent style references.
- **Video Generation** — Creates video clips from storyboard frames using Runway Gen-4 or LTX-Video, with multiple take support.
- **Voice Synthesis** — Character dialogue with per-character voice configuration via ElevenLabs or OpenAI TTS.
- **Music Composition** — AI-generated background scores matching scene mood via Stable Audio.
- **Sound Effects** — Context-aware SFX generation via ElevenLabs Sound Generation or Stable Audio.
- **Timeline Editor** — Visual multi-track timeline with video, dialogue, music, and SFX tracks.
- **Scene Compositing** — FFmpeg-based audio/video mixing per scene with automatic level balancing.
- **Final Export** — Full film rendering with configurable resolution (up to 4K), frame rate, codec, and quality settings.
- **Project Management** — Full project lifecycle with auto-save, version history, and multiple project support.
- **Quick Start** — One-click full pipeline: enter a prompt and get a complete film.
- **Configurable AI Providers** — Swap between different AI services per pipeline stage.

## Supported AI Providers

| Stage | Primary | Alternative |
|-------|---------|-------------|
| Script | Anthropic Claude | OpenAI GPT-4o |
| Images | OpenAI DALL-E 3 | Replicate (Flux Pro) |
| Video | Runway Gen-4 | Replicate (LTX-Video) |
| Voice | ElevenLabs | OpenAI TTS |
| Music | Replicate (Stable Audio) | — |
| SFX | ElevenLabs Sound Gen | Replicate (Stable Audio) |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- FFmpeg (for video editing/export)

### 1. Install Dependencies

```bash
# Install all dependencies
npm run setup

# Or manually:
cd frontend && npm install
cd ../backend && pip3 install -r requirements.txt
```

### 2. Configure API Keys

```bash
cp .env.example .env
# Edit .env with your API keys
```

At minimum, you need:
- **Anthropic or OpenAI** key (for script generation)
- **OpenAI or Replicate** key (for image generation)
- **Runway or Replicate** key (for video generation)
- **ElevenLabs or OpenAI** key (for voice synthesis)

### 3. Run in Development Mode

```bash
# Start both backend and frontend
npm run dev

# Or separately:
npm run dev:backend   # Starts FastAPI on http://127.0.0.1:8741
npm run dev:frontend  # Starts Vite dev server on http://localhost:3000
```

### 4. Run as Desktop App

```bash
npm run build
npm run start
```

### 5. Package for Distribution

```bash
npm run package
# Outputs to dist-electron/
```

## Project Structure

```
ai-filmmaking-studio/
├── backend/                    # Python FastAPI backend
│   ├── app/
│   │   ├── main.py            # FastAPI application entry point
│   │   ├── config.py          # Configuration & environment settings
│   │   ├── models/
│   │   │   └── project.py     # Pydantic data models (Project, Scene, Timeline)
│   │   ├── services/
│   │   │   ├── script_service.py      # LLM screenplay generation
│   │   │   ├── storyboard_service.py  # Image generation (DALL-E / Flux)
│   │   │   ├── video_service.py       # Video generation (Runway / LTX)
│   │   │   ├── voice_service.py       # TTS (ElevenLabs / OpenAI)
│   │   │   ├── music_service.py       # Music & SFX generation
│   │   │   └── editor_service.py      # FFmpeg compositing & export
│   │   ├── pipeline/
│   │   │   └── film_pipeline.py       # End-to-end pipeline orchestrator
│   │   ├── api/                       # REST API route handlers
│   │   │   ├── projects.py
│   │   │   ├── scripts.py
│   │   │   ├── storyboard.py
│   │   │   ├── video.py
│   │   │   ├── audio.py
│   │   │   ├── export.py
│   │   │   └── settings.py
│   │   └── utils/
│   │       └── file_manager.py        # Project file management
│   └── requirements.txt
├── frontend/                   # React + TypeScript UI
│   ├── src/
│   │   ├── App.tsx            # Main application component
│   │   ├── components/
│   │   │   ├── Layout/        # Sidebar, Header
│   │   │   ├── ProjectManager/# Project CRUD
│   │   │   ├── ScriptEditor/  # Screenplay editor
│   │   │   ├── Storyboard/    # Storyboard viewer
│   │   │   ├── Video/         # Video preview & take selection
│   │   │   ├── AudioMixer/    # Dialogue, music, SFX management
│   │   │   ├── Timeline/      # Multi-track timeline editor
│   │   │   ├── Preview/       # Export settings & download
│   │   │   ├── Settings/      # API key & model configuration
│   │   │   └── Common/        # Shared UI components
│   │   ├── services/api.ts    # Backend API client
│   │   ├── store/useStore.ts  # Zustand state management
│   │   ├── hooks/             # Custom React hooks
│   │   └── types/             # TypeScript type definitions
│   └── package.json
├── electron/                   # Electron desktop wrapper
│   ├── main.ts                # Main process (window + backend lifecycle)
│   └── preload.ts             # Preload script
├── package.json               # Root package.json
├── .env.example               # Environment variable template
└── .gitignore
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/projects/` | List projects |
| POST | `/api/projects/` | Create project |
| GET | `/api/projects/{id}` | Get project |
| DELETE | `/api/projects/{id}` | Delete project |
| POST | `/api/projects/{id}/pipeline/full` | Run full pipeline |
| POST | `/api/projects/{id}/script/generate` | Generate screenplay |
| POST | `/api/projects/{id}/script/scenes/{i}/rewrite` | Rewrite scene |
| POST | `/api/projects/{id}/storyboard/generate` | Generate storyboards |
| POST | `/api/projects/{id}/video/generate` | Generate videos |
| POST | `/api/projects/{id}/audio/dialogue/generate` | Generate dialogue |
| POST | `/api/projects/{id}/audio/music/generate` | Generate music |
| POST | `/api/projects/{id}/audio/sfx/generate` | Generate SFX |
| POST | `/api/projects/{id}/export/composite` | Composite scenes |
| POST | `/api/projects/{id}/export/render` | Render final film |
| GET | `/api/projects/{id}/export/download` | Download film |
| GET | `/api/settings/` | Get settings |
| PUT | `/api/settings/api-keys` | Update API keys |
| PUT | `/api/settings/models` | Update model preferences |

## Estimated Costs

| Component | Provider | Cost per Minute of Film |
|-----------|----------|------------------------|
| Script | Claude Sonnet | ~$0.05 |
| Storyboard (6 frames) | DALL-E 3 / Flux Pro | ~$0.30 |
| Video (6x10s clips) | Runway Gen-4 Turbo | ~$3.00 |
| Dialogue | ElevenLabs | ~$0.50 |
| Music | Stable Audio | ~$0.20 |
| Sound Effects | ElevenLabs SFX | ~$0.10 |
| **Total** | **Cloud providers** | **~$4.15/min** |

## License

MIT
