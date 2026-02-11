import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Film,
  Users,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { scriptApi } from '../../services/api';
import type { Scene } from '../../types';

export function ScriptEditor() {
  const {
    currentProject,
    setCurrentProject,
    addNotification,
    setView,
    selectedSceneIndex,
    setSelectedSceneIndex,
  } = useStore();

  const [prompt, setPrompt] = useState('');
  const [genre, setGenre] = useState('');
  const [tone, setTone] = useState('');
  const [styleNotes, setStyleNotes] = useState('');
  const [generating, setGenerating] = useState(false);
  const [expandedScene, setExpandedScene] = useState<number | null>(null);
  const [rewriteNotes, setRewriteNotes] = useState('');
  const [rewritingScene, setRewritingScene] = useState<number | null>(null);

  const screenplay = currentProject?.screenplay;
  const projectId = currentProject?.id;

  const handleGenerate = async () => {
    if (!projectId || !prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await scriptApi.generate(projectId, {
        prompt,
        genre,
        tone,
        target_duration_minutes: screenplay?.target_duration_minutes || 1,
        style_notes: styleNotes,
      });
      // Reload project
      const { projectsApi } = await import('../../services/api');
      const projRes = await projectsApi.get(projectId);
      setCurrentProject(projRes.project);
      addNotification('success', `Screenplay generated: ${res.scene_count} scenes`);
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleRewrite = async (sceneIndex: number) => {
    if (!projectId || !rewriteNotes.trim()) return;
    setRewritingScene(sceneIndex);
    try {
      await scriptApi.rewriteScene(projectId, sceneIndex, rewriteNotes);
      const { projectsApi } = await import('../../services/api');
      const projRes = await projectsApi.get(projectId);
      setCurrentProject(projRes.project);
      setRewriteNotes('');
      addNotification('success', 'Scene rewritten');
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setRewritingScene(null);
    }
  };

  const handleDeleteScene = async (index: number) => {
    if (!projectId) return;
    try {
      await scriptApi.deleteScene(projectId, index);
      const { projectsApi } = await import('../../services/api');
      const projRes = await projectsApi.get(projectId);
      setCurrentProject(projRes.project);
      addNotification('success', 'Scene deleted');
    } catch (e: any) {
      addNotification('error', e.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'finalized': return 'badge-success';
      case 'composited':
      case 'audio_generated':
      case 'video_generated': return 'badge-warning';
      case 'storyboarded': return 'badge-info';
      default: return 'bg-studio-surface text-studio-text-muted';
    }
  };

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Generation Form */}
        {(!screenplay || screenplay.scenes.length === 0) && (
          <div className="max-w-2xl mx-auto">
            <h2 className="section-title flex items-center gap-2">
              <Film size={20} />
              Generate Screenplay
            </h2>
            <div className="card space-y-4">
              <div>
                <label className="label">Film Concept</label>
                <textarea
                  className="textarea-field min-h-[120px]"
                  placeholder="Describe your film idea in detail..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Genre</label>
                  <input
                    className="input-field"
                    placeholder="e.g., Sci-Fi Thriller"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">Tone</label>
                  <input
                    className="input-field"
                    placeholder="e.g., Dark and suspenseful"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="label">Visual Style Notes</label>
                <input
                  className="input-field"
                  placeholder="e.g., Neon-noir aesthetic, Blade Runner vibes"
                  value={styleNotes}
                  onChange={(e) => setStyleNotes(e.target.value)}
                />
              </div>
              <button
                onClick={handleGenerate}
                disabled={generating || !prompt.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating Screenplay...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Screenplay
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Screenplay Display */}
        {screenplay && screenplay.scenes.length > 0 && (
          <div>
            {/* Screenplay Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">{screenplay.title}</h2>
                {screenplay.logline && (
                  <p className="text-studio-text-muted mt-1 italic">
                    {screenplay.logline}
                  </p>
                )}
                <div className="flex gap-2 mt-2">
                  {screenplay.genre && <span className="badge badge-info">{screenplay.genre}</span>}
                  {screenplay.tone && <span className="badge bg-purple-500/20 text-purple-400">{screenplay.tone}</span>}
                  <span className="badge bg-studio-surface text-studio-text-muted">
                    {screenplay.scenes.length} scenes
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPrompt(screenplay.synopsis || screenplay.logline);
                    setGenre(screenplay.genre);
                    setTone(screenplay.tone);
                  }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Regenerate
                </button>
                <button
                  onClick={() => setView('storyboard')}
                  className="btn-primary flex items-center gap-2"
                >
                  Next: Storyboard
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Characters */}
            {screenplay.characters.length > 0 && (
              <div className="card mb-4">
                <h3 className="text-sm font-medium text-studio-text-muted flex items-center gap-2 mb-2">
                  <Users size={14} />
                  Characters
                </h3>
                <div className="flex flex-wrap gap-2">
                  {screenplay.characters.map((c) => (
                    <span key={c.character_name} className="badge badge-info">
                      {c.character_name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Scene List */}
            <div className="space-y-3">
              {screenplay.scenes.map((scene, index) => (
                <div
                  key={scene.id}
                  className={`card cursor-pointer transition-all ${
                    selectedSceneIndex === index
                      ? 'border-studio-accent'
                      : 'hover:border-studio-accent/30'
                  }`}
                  onClick={() => {
                    setSelectedSceneIndex(index);
                    setExpandedScene(expandedScene === index ? null : index);
                  }}
                >
                  {/* Scene Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-studio-accent/20 text-studio-accent flex items-center justify-center text-sm font-mono font-bold">
                        {scene.scene_number}
                      </span>
                      <div>
                        <h4 className="font-medium font-mono text-sm">
                          {scene.heading}
                        </h4>
                        <p className="text-xs text-studio-text-muted">
                          {scene.duration_seconds}s
                          {scene.mood && ` / ${scene.mood}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${getStatusColor(scene.status)}`}>
                        {scene.status}
                      </span>
                      {expandedScene === index ? (
                        <ChevronUp size={16} className="text-studio-text-dim" />
                      ) : (
                        <ChevronDown size={16} className="text-studio-text-dim" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Scene Details */}
                  {expandedScene === index && (
                    <div className="mt-4 space-y-3 border-t border-studio-border pt-4">
                      <div>
                        <label className="text-xs font-medium text-studio-text-dim uppercase">
                          Description
                        </label>
                        <p className="text-sm mt-1">{scene.description}</p>
                      </div>

                      {scene.action && (
                        <div>
                          <label className="text-xs font-medium text-studio-text-dim uppercase">
                            Action
                          </label>
                          <p className="text-sm mt-1">{scene.action}</p>
                        </div>
                      )}

                      {scene.dialogue.length > 0 && (
                        <div>
                          <label className="text-xs font-medium text-studio-text-dim uppercase">
                            Dialogue
                          </label>
                          <div className="mt-1 space-y-2">
                            {scene.dialogue.map((line, di) => (
                              <div key={di} className="pl-4 border-l-2 border-studio-accent/30">
                                <span className="text-xs font-bold text-studio-accent uppercase">
                                  {line.character}
                                </span>
                                {line.direction && (
                                  <span className="text-xs text-studio-text-dim italic ml-1">
                                    {line.direction}
                                  </span>
                                )}
                                <p className="text-sm">{line.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {scene.camera_notes && (
                        <div>
                          <label className="text-xs font-medium text-studio-text-dim uppercase">
                            Camera
                          </label>
                          <p className="text-sm mt-1 text-studio-text-muted">
                            {scene.camera_notes}
                          </p>
                        </div>
                      )}

                      {/* Rewrite section */}
                      <div className="pt-2 border-t border-studio-border">
                        <label className="text-xs font-medium text-studio-text-dim uppercase">
                          Director's Notes (AI Rewrite)
                        </label>
                        <div className="flex gap-2 mt-1">
                          <input
                            className="input-field flex-1 text-sm"
                            placeholder="e.g., Make the dialogue more tense, add a plot twist..."
                            value={rewriteNotes}
                            onChange={(e) => setRewriteNotes(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRewrite(index);
                            }}
                            disabled={rewritingScene === index || !rewriteNotes.trim()}
                            className="btn-secondary text-sm flex items-center gap-1"
                          >
                            {rewritingScene === index ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <RefreshCw size={14} />
                            )}
                            Rewrite
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteScene(index);
                            }}
                            className="btn-danger text-sm"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
