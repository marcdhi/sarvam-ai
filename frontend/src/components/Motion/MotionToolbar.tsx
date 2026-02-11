/**
 * MotionToolbar — tools for adding layers, scene management,
 * and canvas format selection.
 */

import React, { useState } from 'react';
import {
  Type, Square, Circle, Image, Film,
  Plus, Trash2, ChevronDown,
} from 'lucide-react';
import { useMotionStore } from '../../store/useMotionStore';

const CANVAS_PRESETS = [
  { label: '16:9 (1920x1080)', w: 1920, h: 1080 },
  { label: '1:1 (1080x1080)', w: 1080, h: 1080 },
  { label: '9:16 (1080x1920)', w: 1080, h: 1920 },
  { label: '4:5 (1080x1350)', w: 1080, h: 1350 },
  { label: 'YouTube (2560x1440)', w: 2560, h: 1440 },
];

export function MotionToolbar() {
  const { project, addLayer, addScene, removeScene, activeSceneId, setActiveScene, updateScene } = useMotionStore();
  const scene = useMotionStore(s => s.activeScene());
  const [showSceneMenu, setShowSceneMenu] = useState(false);

  if (!project) return null;

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 bg-studio-surface border-b border-studio-border">
      {/* Add layer tools */}
      <div className="flex items-center gap-0.5 mr-2">
        <ToolBtn icon={Type} label="Text" onClick={() => addLayer('text')} />
        <ToolBtn icon={Square} label="Rectangle" onClick={() => addLayer('shape')} />
        <ToolBtn icon={Image} label="Image" onClick={() => addLayer('image')} />
      </div>

      <div className="w-px h-5 bg-studio-border mx-1" />

      {/* Scene selector */}
      <div className="relative">
        <button
          className="flex items-center gap-1 px-2 py-1 text-xs text-studio-text-muted hover:text-white hover:bg-studio-card rounded"
          onClick={() => setShowSceneMenu(!showSceneMenu)}
        >
          <Film size={12} />
          <span>{scene?.name ?? 'Scene'}</span>
          <ChevronDown size={10} />
        </button>

        {showSceneMenu && (
          <div className="absolute top-full left-0 mt-1 bg-studio-card border border-studio-border rounded-lg shadow-xl z-50 min-w-[160px]">
            {project.scenes.map(s => (
              <button
                key={s.id}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-studio-accent/10 ${
                  s.id === activeSceneId ? 'text-studio-accent' : 'text-studio-text-muted'
                }`}
                onClick={() => { setActiveScene(s.id); setShowSceneMenu(false); }}
              >
                {s.name} ({s.duration}s)
              </button>
            ))}
            <div className="border-t border-studio-border">
              <button
                className="w-full text-left px-3 py-1.5 text-xs text-studio-text-dim hover:bg-studio-accent/10 flex items-center gap-1"
                onClick={() => { addScene(); setShowSceneMenu(false); }}
              >
                <Plus size={10} /> Add Scene
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Scene duration */}
      {scene && (
        <div className="flex items-center gap-1 ml-2">
          <label className="text-[10px] text-studio-text-dim">Duration</label>
          <input
            type="number"
            className="w-14 bg-studio-card text-xs text-studio-text p-0.5 rounded border border-studio-border"
            value={scene.duration}
            onChange={(e) => updateScene(scene.id, { duration: parseFloat(e.target.value) || 1 })}
            step={0.5}
            min={0.5}
          />
          <span className="text-[10px] text-studio-text-dim">s</span>
        </div>
      )}

      {/* Scene bg color */}
      {scene && (
        <div className="flex items-center gap-1 ml-2">
          <label className="text-[10px] text-studio-text-dim">BG</label>
          <input
            type="color"
            className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            value={scene.bgColor}
            onChange={(e) => updateScene(scene.id, { bgColor: e.target.value })}
          />
        </div>
      )}

      {/* Canvas size info */}
      <div className="ml-auto text-[10px] text-studio-text-dim">
        {project.canvasWidth}x{project.canvasHeight} &middot; {project.fps}fps
      </div>
    </div>
  );
}

function ToolBtn({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      className="p-1.5 text-studio-text-muted hover:text-white hover:bg-studio-card rounded transition-colors"
      onClick={onClick}
      title={label}
    >
      <Icon size={14} />
    </button>
  );
}
