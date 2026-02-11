/**
 * MotionPrompt — AI-powered motion graphics generation input.
 * Users describe the animation they want in natural language,
 * and the AI generates the full motion spec.
 */

import React, { useState } from 'react';
import { Wand2, Loader2, Sparkles, Edit3, RotateCcw } from 'lucide-react';
import { useMotionStore } from '../../store/useMotionStore';
import type { MotionProject } from '../../types/motion';

const API_BASE = '/api/motion';

const STYLE_OPTIONS = [
  { label: 'Any', value: '' },
  { label: 'Minimal', value: 'minimal' },
  { label: 'Bold', value: 'bold' },
  { label: 'Corporate', value: 'corporate' },
  { label: 'Playful', value: 'playful' },
  { label: 'Cinematic', value: 'cinematic' },
  { label: 'Retro', value: 'retro' },
  { label: 'Neon', value: 'neon' },
];

const CANVAS_PRESETS = [
  { label: '16:9', w: 1920, h: 1080 },
  { label: '1:1', w: 1080, h: 1080 },
  { label: '9:16', w: 1080, h: 1920 },
];

const EXAMPLE_PROMPTS = [
  'A bold title "LAUNCH DAY" that fades in from blur, then subtitle slides up from below',
  'Animated logo reveal: circle expands, brand name types in letter by letter with a glow effect',
  'Social media ad: product image slides in from right, price tag bounces in, CTA button pulses',
  'Countdown timer from 3 to 1 with each number scaling in and bouncing, then "GO!" explodes in',
  'Kinetic typography: words appear one by one sliding from different directions, bold and colorful',
  'Minimal lower third: thin line draws on, name slides in from left, title fades in below',
];

export function MotionPrompt() {
  const { setProject, setGenerating, isGenerating, project } = useMotionStore();
  const [prompt, setPrompt] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [canvasPreset, setCanvasPreset] = useState(0);
  const [duration, setDuration] = useState(5);
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [error, setError] = useState('');

  const canvas = CANVAS_PRESETS[canvasPreset];

  const handleGenerate = async () => {
    const text = mode === 'generate' ? prompt : editPrompt;
    if (!text.trim()) return;
    setError('');
    setGenerating(true);

    try {
      if (mode === 'generate') {
        const res = await fetch(`${API_BASE}/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: text,
            canvas_width: canvas.w,
            canvas_height: canvas.h,
            duration,
            style: style || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'Generation failed');
        }
        const data: MotionProject = await res.json();
        setProject(data);
        setPrompt('');
      } else {
        // Edit existing scene
        const scene = useMotionStore.getState().activeScene();
        if (!scene) throw new Error('No active scene to edit');
        const res = await fetch(`${API_BASE}/edit-scene-full`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instruction: text,
            scene_id: scene.id,
            scene,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ detail: res.statusText }));
          throw new Error(err.detail || 'Edit failed');
        }
        const updatedScene = await res.json();
        const currentProject = useMotionStore.getState().project;
        if (currentProject) {
          setProject({
            ...currentProject,
            scenes: currentProject.scenes.map(s => s.id === scene.id ? { ...updatedScene, id: scene.id } : s),
          });
        }
        setEditPrompt('');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-studio-surface border-b border-studio-border">
      {/* Mode tabs */}
      <div className="flex border-b border-studio-border">
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
            mode === 'generate'
              ? 'text-studio-accent border-b-2 border-studio-accent'
              : 'text-studio-text-dim hover:text-white'
          }`}
          onClick={() => setMode('generate')}
        >
          <Wand2 size={12} />
          Generate New
        </button>
        <button
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs transition-colors ${
            mode === 'edit'
              ? 'text-studio-accent border-b-2 border-studio-accent'
              : 'text-studio-text-dim hover:text-white'
          } ${!project ? 'opacity-30 pointer-events-none' : ''}`}
          onClick={() => setMode('edit')}
        >
          <Edit3 size={12} />
          Edit Scene
        </button>
      </div>

      <div className="p-3 space-y-2">
        {mode === 'generate' ? (
          <>
            {/* Prompt input */}
            <textarea
              className="w-full bg-studio-card text-sm text-studio-text p-2.5 rounded-lg border border-studio-border resize-none placeholder-studio-text-dim focus:border-studio-accent focus:outline-none"
              rows={3}
              placeholder="Describe the motion graphics you want to create..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
            />

            {/* Options row */}
            <div className="flex items-center gap-2 flex-wrap">
              <select
                className="bg-studio-card text-[10px] text-studio-text px-1.5 py-1 rounded border border-studio-border"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
              >
                {STYLE_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>

              <div className="flex rounded border border-studio-border overflow-hidden">
                {CANVAS_PRESETS.map((p, i) => (
                  <button
                    key={i}
                    className={`px-2 py-0.5 text-[10px] ${
                      i === canvasPreset ? 'bg-studio-accent text-white' : 'bg-studio-card text-studio-text-dim hover:bg-studio-card/80'
                    }`}
                    onClick={() => setCanvasPreset(i)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  className="w-10 bg-studio-card text-[10px] text-studio-text p-0.5 rounded border border-studio-border"
                  value={duration}
                  onChange={(e) => setDuration(parseFloat(e.target.value) || 3)}
                  min={1}
                  max={30}
                  step={1}
                />
                <span className="text-[10px] text-studio-text-dim">sec</span>
              </div>
            </div>

            {/* Example prompts */}
            <div className="flex flex-wrap gap-1">
              {EXAMPLE_PROMPTS.slice(0, 3).map((ex, i) => (
                <button
                  key={i}
                  className="text-[10px] text-studio-text-dim hover:text-studio-accent bg-studio-card px-1.5 py-0.5 rounded-full border border-studio-border/50 truncate max-w-[200px]"
                  onClick={() => setPrompt(ex)}
                  title={ex}
                >
                  {ex.slice(0, 50)}...
                </button>
              ))}
            </div>
          </>
        ) : (
          /* Edit mode */
          <textarea
            className="w-full bg-studio-card text-sm text-studio-text p-2.5 rounded-lg border border-studio-border resize-none placeholder-studio-text-dim focus:border-studio-accent focus:outline-none"
            rows={2}
            placeholder="Describe what to change... e.g. 'Make the title red and add a bounce animation'"
            value={editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
          />
        )}

        {/* Generate button */}
        <button
          className="w-full py-2 bg-gradient-to-r from-studio-accent to-purple-500 text-white text-sm font-medium rounded-lg hover:opacity-90 disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          onClick={handleGenerate}
          disabled={isGenerating || (mode === 'generate' ? !prompt.trim() : !editPrompt.trim())}
        >
          {isGenerating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              {mode === 'generate' ? 'Generating motion...' : 'Editing scene...'}
            </>
          ) : (
            <>
              <Sparkles size={14} />
              {mode === 'generate' ? 'Generate Motion' : 'Apply Edit'}
              <span className="text-[10px] opacity-60 ml-1">⌘↵</span>
            </>
          )}
        </button>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
