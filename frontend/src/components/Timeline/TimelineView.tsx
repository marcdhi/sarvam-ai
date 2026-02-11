import React, { useState } from 'react';
import {
  Scissors,
  Play,
  ArrowRight,
  Loader2,
  Film,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { exportApi, projectsApi } from '../../services/api';
import { usePolling } from '../../hooks/usePolling';
import { ProgressBar } from '../Common/ProgressBar';

export function TimelineView() {
  const {
    currentProject,
    setCurrentProject,
    addNotification,
    setView,
  } = useStore();

  const [compositing, setCompositing] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');

  const screenplay = currentProject?.screenplay;
  const projectId = currentProject?.id;
  const timeline = currentProject?.timeline;
  const scenes = screenplay?.scenes || [];

  usePolling(
    async () => {
      if (!projectId || !taskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, taskId);
      const task = res.task;
      setProgress(task.progress);
      setProgressMsg(task.message);
      if (task.status === 'completed') {
        const projRes = await projectsApi.get(projectId);
        setCurrentProject(projRes.project);
        addNotification('success', 'Scenes composited');
        setCompositing(false);
        setTaskId(null);
        return true;
      } else if (task.status === 'failed') {
        addNotification('error', `Compositing failed: ${task.error}`);
        setCompositing(false);
        setTaskId(null);
        return true;
      }
      return false;
    },
    3000,
    !!taskId
  );

  const handleCompositeAll = async () => {
    if (!projectId) return;
    setCompositing(true);
    try {
      const res = await exportApi.composite(projectId);
      setTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setCompositing(false);
    }
  };

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration_seconds, 0);

  if (!screenplay || scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Scissors size={48} className="text-studio-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No screenplay yet</h3>
          <button onClick={() => setView('script')} className="btn-primary">
            Go to Script
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-studio-border flex items-center justify-between">
        <div>
          <h2 className="section-title mb-0">Timeline</h2>
          <p className="text-sm text-studio-text-muted">
            {scenes.length} scenes - {totalDuration.toFixed(1)}s total
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCompositeAll}
            disabled={compositing}
            className="btn-secondary flex items-center gap-2"
          >
            {compositing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Film size={14} />
            )}
            Composite All
          </button>
          <button
            onClick={() => setView('export')}
            className="btn-primary flex items-center gap-2"
          >
            Export
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Progress */}
      {compositing && (
        <div className="p-4 border-b border-studio-border">
          <ProgressBar progress={progress} message={progressMsg} />
        </div>
      )}

      {/* Timeline Visualization */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        {/* Time ruler */}
        <div className="flex items-end mb-2 pl-32">
          {Array.from({ length: Math.ceil(totalDuration / 5) + 1 }).map(
            (_, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-xs text-studio-text-dim font-mono"
                style={{ width: `${5 * 40}px` }}
              >
                {formatTime(i * 5)}
              </div>
            )
          )}
        </div>

        {/* Video Track */}
        <div className="flex items-center mb-2">
          <div className="w-32 shrink-0 pr-3 text-right">
            <span className="text-xs font-medium text-studio-text-muted uppercase">
              Video
            </span>
          </div>
          <div
            className="flex h-16 bg-studio-surface rounded-lg overflow-hidden"
            style={{ width: `${totalDuration * 40}px`, minWidth: '100%' }}
          >
            {scenes.map((scene, i) => {
              const hasVideo = !!scene.selected_video || !!scene.composite_path;
              return (
                <div
                  key={scene.id}
                  className={`h-full border-r border-studio-bg flex items-center justify-center transition-colors ${
                    hasVideo
                      ? 'bg-studio-accent/30 hover:bg-studio-accent/40'
                      : 'bg-studio-card hover:bg-studio-border'
                  }`}
                  style={{ width: `${scene.duration_seconds * 40}px` }}
                  title={`Scene ${scene.scene_number}: ${scene.heading}`}
                >
                  <span className="text-xs font-mono truncate px-1">
                    S{scene.scene_number}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dialogue Track */}
        <div className="flex items-center mb-2">
          <div className="w-32 shrink-0 pr-3 text-right">
            <span className="text-xs font-medium text-studio-text-muted uppercase">
              Dialogue
            </span>
          </div>
          <div
            className="flex h-10 bg-studio-surface rounded-lg overflow-hidden"
            style={{ width: `${totalDuration * 40}px`, minWidth: '100%' }}
          >
            {scenes.map((scene) => {
              const hasDialogue = scene.dialogue.some((d) => d.audio_path);
              return (
                <div
                  key={scene.id}
                  className={`h-full border-r border-studio-bg ${
                    hasDialogue
                      ? 'bg-green-500/20'
                      : scene.dialogue.length > 0
                        ? 'bg-studio-card'
                        : 'bg-transparent'
                  }`}
                  style={{ width: `${scene.duration_seconds * 40}px` }}
                >
                  {hasDialogue && (
                    <div className="h-full flex items-center px-1">
                      <div className="w-full h-3 bg-green-500/40 rounded-full" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Music Track */}
        <div className="flex items-center mb-2">
          <div className="w-32 shrink-0 pr-3 text-right">
            <span className="text-xs font-medium text-studio-text-muted uppercase">
              Music
            </span>
          </div>
          <div
            className="flex h-10 bg-studio-surface rounded-lg overflow-hidden"
            style={{ width: `${totalDuration * 40}px`, minWidth: '100%' }}
          >
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`h-full border-r border-studio-bg ${
                  scene.music_path
                    ? 'bg-purple-500/20'
                    : 'bg-transparent'
                }`}
                style={{ width: `${scene.duration_seconds * 40}px` }}
              >
                {scene.music_path && (
                  <div className="h-full flex items-center px-1">
                    <div className="w-full h-3 bg-purple-500/40 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* SFX Track */}
        <div className="flex items-center mb-2">
          <div className="w-32 shrink-0 pr-3 text-right">
            <span className="text-xs font-medium text-studio-text-muted uppercase">
              SFX
            </span>
          </div>
          <div
            className="flex h-10 bg-studio-surface rounded-lg overflow-hidden"
            style={{ width: `${totalDuration * 40}px`, minWidth: '100%' }}
          >
            {scenes.map((scene) => (
              <div
                key={scene.id}
                className={`h-full border-r border-studio-bg ${
                  scene.sfx_paths.length > 0
                    ? 'bg-amber-500/20'
                    : 'bg-transparent'
                }`}
                style={{ width: `${scene.duration_seconds * 40}px` }}
              >
                {scene.sfx_paths.length > 0 && (
                  <div className="h-full flex items-center px-1">
                    <div className="w-full h-3 bg-amber-500/40 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scene Details */}
      <div className="border-t border-studio-border p-4">
        <h3 className="text-sm font-medium text-studio-text-muted mb-3">
          Scene Overview
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {scenes.map((scene) => {
            const status = scene.composite_path
              ? 'composited'
              : scene.selected_video
                ? 'video'
                : scene.storyboard_frames.length > 0
                  ? 'storyboard'
                  : 'script';
            const colors: Record<string, string> = {
              composited: 'border-studio-success bg-studio-success/10',
              video: 'border-studio-warning bg-studio-warning/10',
              storyboard: 'border-studio-accent bg-studio-accent/10',
              script: 'border-studio-border bg-studio-surface',
            };
            return (
              <div
                key={scene.id}
                className={`p-2 rounded-lg border ${colors[status]} text-center`}
              >
                <div className="text-xs font-mono font-bold">
                  S{scene.scene_number}
                </div>
                <div className="text-xs text-studio-text-dim mt-1">
                  {scene.duration_seconds}s
                </div>
                <div className="text-xs text-studio-text-dim">{status}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
