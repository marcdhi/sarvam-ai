/**
 * MotionTimeline — horizontal timeline with layer tracks, keyframe diamonds,
 * a scrubber/playhead, and playback controls.
 */

import React, { useRef, useCallback } from 'react';
import {
  Play, Pause, SkipBack, SkipForward, Repeat,
  ChevronRight,
} from 'lucide-react';
import { useMotionStore } from '../../store/useMotionStore';
import type { MotionLayer, Keyframe } from '../../types/motion';

export function MotionTimeline() {
  const {
    playback, selection, timelineZoom, timelineScroll,
    play, pause, stop, setCurrentTime, toggleLoop,
    selectLayer, setTimelineZoom,
    addKeyframe, removeKeyframe,
  } = useMotionStore();
  const scene = useMotionStore(s => s.activeScene());
  const selectedLayer = useMotionStore(s => s.selectedLayer());
  const trackAreaRef = useRef<HTMLDivElement>(null);

  const pxPerSec = timelineZoom;
  const duration = scene?.duration ?? 5;
  const totalWidth = duration * pxPerSec;

  // Click on track area to set time
  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (!trackAreaRef.current) return;
    const rect = trackAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineScroll;
    const time = Math.max(0, Math.min(duration, x / pxPerSec));
    setCurrentTime(time);
  }, [pxPerSec, duration, timelineScroll, setCurrentTime]);

  // Double-click to add keyframe
  const handleTrackDoubleClick = useCallback((e: React.MouseEvent, layerId: string) => {
    if (!trackAreaRef.current) return;
    const rect = trackAreaRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left + timelineScroll;
    const time = Math.max(0, Math.min(duration, x / pxPerSec));
    // Add opacity keyframe at current value as default
    const layer = scene?.layers.find(l => l.id === layerId);
    if (layer) {
      addKeyframe(layerId, 'opacity', time, layer.transform.opacity);
    }
  }, [pxPerSec, duration, timelineScroll, scene, addKeyframe]);

  if (!scene) {
    return <div className="h-48 bg-studio-surface border-t border-studio-border" />;
  }

  const playheadX = playback.currentTime * pxPerSec;

  return (
    <div className="flex flex-col bg-studio-surface border-t border-studio-border select-none" style={{ height: 240 }}>
      {/* Playback Controls + Time */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-studio-border">
        <button onClick={stop} className="p-1 hover:text-white text-studio-text-muted" title="Stop">
          <SkipBack size={14} />
        </button>
        <button
          onClick={playback.isPlaying ? pause : play}
          className="p-1.5 bg-studio-accent rounded-full text-white hover:bg-studio-accent/80"
          title={playback.isPlaying ? 'Pause' : 'Play'}
        >
          {playback.isPlaying ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button onClick={() => setCurrentTime(duration)} className="p-1 hover:text-white text-studio-text-muted" title="End">
          <SkipForward size={14} />
        </button>
        <button
          onClick={toggleLoop}
          className={`p-1 ${playback.loop ? 'text-studio-accent' : 'text-studio-text-muted hover:text-white'}`}
          title="Loop"
        >
          <Repeat size={14} />
        </button>

        <div className="ml-3 text-xs font-mono text-studio-text-muted">
          {formatTime(playback.currentTime)} / {formatTime(duration)}
        </div>

        {/* Zoom */}
        <div className="ml-auto flex items-center gap-1 text-xs text-studio-text-dim">
          <button onClick={() => setTimelineZoom(timelineZoom - 20)} className="px-1 hover:text-white">-</button>
          <span className="w-8 text-center">{Math.round(timelineZoom)}x</span>
          <button onClick={() => setTimelineZoom(timelineZoom + 20)} className="px-1 hover:text-white">+</button>
        </div>
      </div>

      {/* Timeline Tracks */}
      <div className="flex flex-1 overflow-hidden">
        {/* Layer labels */}
        <div className="w-40 shrink-0 border-r border-studio-border overflow-y-auto">
          {scene.layers.map(layer => (
            <div
              key={layer.id}
              className={`h-8 flex items-center px-2 text-xs truncate cursor-pointer border-b border-studio-border/50 ${
                selection.layerIds.includes(layer.id)
                  ? 'bg-studio-accent/10 text-studio-accent'
                  : 'text-studio-text-muted hover:bg-studio-card'
              }`}
              onClick={() => selectLayer(layer.id)}
            >
              <ChevronRight size={10} className="mr-1 shrink-0" />
              <span className="truncate">{layer.name}</span>
            </div>
          ))}
        </div>

        {/* Tracks + Playhead */}
        <div className="flex-1 overflow-x-auto overflow-y-auto relative" ref={trackAreaRef}>
          {/* Time ruler */}
          <div className="h-5 sticky top-0 bg-studio-surface z-10 border-b border-studio-border/50" onClick={handleTrackClick}>
            <svg width={totalWidth} height={20}>
              {Array.from({ length: Math.ceil(duration) + 1 }, (_, i) => (
                <g key={i}>
                  <line x1={i * pxPerSec} y1={14} x2={i * pxPerSec} y2={20} stroke="#555" strokeWidth={1} />
                  <text x={i * pxPerSec + 3} y={12} fill="#888" fontSize={9} fontFamily="monospace">
                    {i}s
                  </text>
                  {/* Half-second ticks */}
                  {i < duration && (
                    <line x1={(i + 0.5) * pxPerSec} y1={16} x2={(i + 0.5) * pxPerSec} y2={20} stroke="#444" strokeWidth={1} />
                  )}
                </g>
              ))}
            </svg>
          </div>

          {/* Layer tracks */}
          <div style={{ width: totalWidth }} onClick={handleTrackClick}>
            {scene.layers.map(layer => (
              <LayerTrack
                key={layer.id}
                layer={layer}
                pxPerSec={pxPerSec}
                duration={duration}
                isSelected={selection.layerIds.includes(layer.id)}
                onDoubleClick={(e) => handleTrackDoubleClick(e, layer.id)}
                onRemoveKeyframe={(prop, kfId) => removeKeyframe(layer.id, prop, kfId)}
              />
            ))}
          </div>

          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-px bg-red-500 pointer-events-none z-20"
            style={{ left: playheadX }}
          >
            <div className="w-2.5 h-2.5 bg-red-500 rounded-full -translate-x-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Layer Track ────────────────────────────────────────────────────────────

interface LayerTrackProps {
  layer: MotionLayer;
  pxPerSec: number;
  duration: number;
  isSelected: boolean;
  onDoubleClick: (e: React.MouseEvent) => void;
  onRemoveKeyframe: (prop: string, kfId: string) => void;
}

function LayerTrack({ layer, pxPerSec, duration, isSelected, onDoubleClick, onRemoveKeyframe }: LayerTrackProps) {
  const inX = layer.inPoint * pxPerSec;
  const outX = layer.outPoint * pxPerSec;
  const barWidth = outX - inX;

  // Collect all keyframes across properties
  const allKeyframes: { prop: string; kf: Keyframe }[] = [];
  for (const [prop, kfs] of Object.entries(layer.keyframes)) {
    for (const kf of kfs) {
      allKeyframes.push({ prop, kf });
    }
  }

  return (
    <div
      className={`h-8 relative border-b border-studio-border/30 ${isSelected ? 'bg-studio-accent/5' : ''}`}
      onDoubleClick={onDoubleClick}
    >
      {/* Duration bar */}
      <div
        className={`absolute top-1 bottom-1 rounded ${
          isSelected ? 'bg-indigo-500/30' : 'bg-white/10'
        }`}
        style={{ left: inX, width: Math.max(barWidth, 2) }}
      />

      {/* Keyframe diamonds */}
      {allKeyframes.map(({ prop, kf }) => {
        const x = kf.time * pxPerSec;
        return (
          <div
            key={kf.id}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-yellow-400 hover:bg-yellow-300 cursor-pointer border border-yellow-600"
            style={{ left: x }}
            title={`${prop}: ${kf.value} @ ${kf.time.toFixed(2)}s`}
            onDoubleClick={(e) => { e.stopPropagation(); onRemoveKeyframe(prop, kf.id); }}
          />
        );
      })}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const s = Math.floor(seconds);
  const ms = Math.floor((seconds - s) * 100);
  return `${s}.${ms.toString().padStart(2, '0')}`;
}
