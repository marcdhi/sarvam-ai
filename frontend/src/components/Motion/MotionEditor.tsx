/**
 * MotionEditor — main layout for the Jitter-style motion graphics editor.
 *
 * Layout:
 * ┌─────────────────────────────────────────────────┐
 * │ AI Prompt Bar                                    │
 * ├────────┬─────────────────────────┬──────────────┤
 * │ Toolbar│                         │              │
 * │        │                         │              │
 * │ Layers │      Canvas Preview     │  Properties  │
 * │        │                         │              │
 * │ Presets│                         │              │
 * ├────────┴─────────────────────────┴──────────────┤
 * │ Timeline                                         │
 * └─────────────────────────────────────────────────┘
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { useMotionStore } from '../../store/useMotionStore';
import { MotionPrompt } from './MotionPrompt';
import { MotionToolbar } from './MotionToolbar';
import { MotionCanvas } from './MotionCanvas';
import { MotionTimeline } from './MotionTimeline';
import { MotionLayersPanel } from './MotionLayersPanel';
import { MotionPropertiesPanel } from './MotionPropertiesPanel';
import { MotionPresets } from './MotionPresets';

export function MotionEditor() {
  const { playback, setCurrentTime, pause } = useMotionStore();
  const scene = useMotionStore(s => s.activeScene());
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // ─── Playback loop ──────────────────────────────────────────────
  const tick = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const state = useMotionStore.getState();
    const currentScene = state.activeScene();
    if (!currentScene) return;

    let newTime = state.playback.currentTime + delta;
    if (newTime >= currentScene.duration) {
      if (state.playback.loop) {
        newTime = 0;
      } else {
        newTime = currentScene.duration;
        state.pause();
        lastTimeRef.current = 0;
        state.setCurrentTime(newTime);
        return;
      }
    }
    state.setCurrentTime(newTime);
    animFrameRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (playback.isPlaying) {
      lastTimeRef.current = 0;
      animFrameRef.current = requestAnimationFrame(tick);
    } else {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playback.isPlaying, tick]);

  // ─── Keyboard shortcuts ─────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // Space → play/pause
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        const state = useMotionStore.getState();
        state.playback.isPlaying ? state.pause() : state.play();
      }

      // Delete selected layer
      if ((e.key === 'Delete' || e.key === 'Backspace') && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        const state = useMotionStore.getState();
        if (state.selection.layerIds.length > 0) {
          state.removeLayer(state.selection.layerIds[0]);
        }
      }

      // Cmd+D duplicate
      if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
        e.preventDefault();
        const state = useMotionStore.getState();
        if (state.selection.layerIds.length > 0) {
          state.duplicateLayer(state.selection.layerIds[0]);
        }
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <div className="flex flex-col h-full bg-studio-bg">
      {/* AI Prompt */}
      <MotionPrompt />

      {/* Toolbar */}
      <MotionToolbar />

      {/* Main workspace: Layers | Canvas | Properties */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Layers + Presets */}
        <div className="flex flex-col">
          <div className="flex-1 overflow-hidden">
            <MotionLayersPanel />
          </div>
          <MotionPresets />
        </div>

        {/* Center: Canvas */}
        <MotionCanvas />

        {/* Right: Properties */}
        <MotionPropertiesPanel />
      </div>

      {/* Bottom: Timeline */}
      <MotionTimeline />
    </div>
  );
}
