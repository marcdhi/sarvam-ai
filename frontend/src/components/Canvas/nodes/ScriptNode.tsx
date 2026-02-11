import React, { useState } from 'react';
import { Sparkles, Loader2, FileText } from 'lucide-react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useStore } from '../../../store/useStore';
import { scriptApi, projectsApi } from '../../../services/api';

interface Props {
  node: CanvasNode;
}

export function ScriptNode({ node }: Props) {
  const { currentProject, setCurrentProject, addNotification } = useStore();
  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('');
  const [generating, setGenerating] = useState(false);

  const screenplay = currentProject?.screenplay;
  const projectId = currentProject?.id;

  const handleGenerate = async () => {
    if (!projectId || !prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await scriptApi.generate(projectId, {
        prompt,
        genre,
        target_duration_minutes: 1,
      });
      const projRes = await projectsApi.get(projectId);
      setCurrentProject(projRes.project);

      // Auto-layout the canvas with new scenes
      if (projRes.project.screenplay?.scenes) {
        useCanvasStore.getState().autoLayoutPipeline(projRes.project.screenplay.scenes);
      }
      addNotification('success', `Screenplay generated: ${res.scene_count} scenes`);
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (screenplay && screenplay.scenes.length > 0) {
    return (
      <div>
        <h3 className="font-semibold text-sm mb-1">{screenplay.title}</h3>
        {screenplay.logline && (
          <p className="text-xs text-studio-text-muted italic mb-2 line-clamp-2">
            {screenplay.logline}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-studio-text-dim">
          <FileText size={12} />
          <span>{screenplay.scenes.length} scenes</span>
          {screenplay.genre && <span className="badge badge-info text-[10px]">{screenplay.genre}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        className="textarea-field text-xs min-h-[60px]"
        placeholder="Describe your film concept..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
      <input
        className="input-field text-xs"
        placeholder="Genre (e.g., Sci-Fi Thriller)"
        value={genre}
        onChange={(e) => setGenre(e.target.value)}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleGenerate();
        }}
        disabled={generating || !prompt.trim()}
        className="btn-primary w-full text-xs py-1.5 flex items-center justify-center gap-1"
      >
        {generating ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} />
        )}
        {generating ? 'Generating...' : 'Generate Script'}
      </button>
    </div>
  );
}
