import React, { useState } from 'react';
import {
  Image,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Grid3X3,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { storyboardApi, projectsApi } from '../../services/api';
import { usePolling } from '../../hooks/usePolling';
import { ProgressBar } from '../Common/ProgressBar';

export function StoryboardView() {
  const {
    currentProject,
    setCurrentProject,
    addNotification,
    setView,
    selectedSceneIndex,
    setSelectedSceneIndex,
  } = useStore();

  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');

  const screenplay = currentProject?.screenplay;
  const projectId = currentProject?.id;
  const scenes = screenplay?.scenes || [];
  const currentScene = scenes[selectedSceneIndex];

  // Poll for storyboard generation progress
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
        addNotification('success', 'Storyboards generated');
        setGenerating(false);
        setTaskId(null);
        return true;
      } else if (task.status === 'failed') {
        addNotification('error', `Storyboard generation failed: ${task.error}`);
        setGenerating(false);
        setTaskId(null);
        return true;
      }
      return false;
    },
    2000,
    !!taskId
  );

  const handleGenerateAll = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const res = await storyboardApi.generate(projectId, {
        style_notes: screenplay?.style_notes || '',
      });
      setTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setGenerating(false);
    }
  };

  const handleGenerateScene = async (sceneIndex: number) => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const res = await storyboardApi.generate(projectId, {
        scene_indices: [sceneIndex],
        style_notes: screenplay?.style_notes || '',
      });
      setTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setGenerating(false);
    }
  };

  if (!screenplay || scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Image size={48} className="text-studio-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No screenplay yet</h3>
          <p className="text-studio-text-muted mb-4">
            Generate a screenplay first to create storyboards
          </p>
          <button onClick={() => setView('script')} className="btn-primary">
            Go to Script
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Scene List */}
      <div className="w-48 border-r border-studio-border overflow-y-auto p-2">
        <div className="flex items-center justify-between mb-3 px-2">
          <span className="text-xs font-medium text-studio-text-dim uppercase">
            Scenes
          </span>
          <button
            onClick={handleGenerateAll}
            disabled={generating}
            className="btn-ghost text-xs flex items-center gap-1"
            title="Generate all storyboards"
          >
            <Grid3X3 size={12} />
            All
          </button>
        </div>
        {scenes.map((scene, index) => (
          <button
            key={scene.id}
            onClick={() => setSelectedSceneIndex(index)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 transition-colors ${
              selectedSceneIndex === index
                ? 'bg-studio-accent/15 text-studio-accent'
                : 'hover:bg-studio-card text-studio-text-muted'
            }`}
          >
            <div className="text-sm font-medium">Scene {scene.scene_number}</div>
            <div className="text-xs truncate text-studio-text-dim">
              {scene.storyboard_frames.length > 0
                ? `${scene.storyboard_frames.length} frames`
                : 'No frames'}
            </div>
          </button>
        ))}
      </div>

      {/* Main Storyboard Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Progress */}
        {generating && (
          <div className="card mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 size={16} className="animate-spin text-studio-accent" />
              <span className="font-medium">Generating Storyboards</span>
            </div>
            <ProgressBar progress={progress} message={progressMsg} />
          </div>
        )}

        {currentScene && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="section-title mb-0">
                  Scene {currentScene.scene_number}: {currentScene.heading}
                </h2>
                <p className="text-sm text-studio-text-muted">
                  {currentScene.description.slice(0, 150)}...
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateScene(selectedSceneIndex)}
                  disabled={generating}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  {generating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Regenerate
                </button>
                <button
                  onClick={() => setView('video')}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  Next: Video
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Storyboard Frames Grid */}
            {currentScene.storyboard_frames.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentScene.storyboard_frames.map((frame, fi) => (
                  <div key={fi} className="card p-2">
                    <div className="aspect-video bg-studio-surface rounded-lg overflow-hidden mb-2">
                      <img
                        src={`/files/${currentProject!.id}/storyboard/scene_${String(currentScene.scene_number).padStart(3, '0')}/scene_${String(currentScene.scene_number).padStart(3, '0')}_frame_${String(fi).padStart(3, '0')}.png`}
                        alt={`Scene ${currentScene.scene_number} Frame ${fi + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <p className="text-xs text-studio-text-dim text-center">
                      Frame {fi + 1} of {currentScene.storyboard_frames.length}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-16">
                <Image size={48} className="text-studio-text-dim mx-auto mb-4" />
                <h3 className="font-medium mb-2">No storyboard frames yet</h3>
                <p className="text-sm text-studio-text-muted mb-4">
                  Generate storyboard frames for this scene
                </p>
                <button
                  onClick={() => handleGenerateScene(selectedSceneIndex)}
                  disabled={generating}
                  className="btn-primary"
                >
                  <Sparkles size={16} className="inline mr-2" />
                  Generate Storyboard
                </button>
              </div>
            )}

            {/* Scene Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() => setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1))}
                disabled={selectedSceneIndex === 0}
                className="btn-ghost flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Previous Scene
              </button>
              <span className="text-sm text-studio-text-muted">
                {selectedSceneIndex + 1} / {scenes.length}
              </span>
              <button
                onClick={() =>
                  setSelectedSceneIndex(
                    Math.min(scenes.length - 1, selectedSceneIndex + 1)
                  )
                }
                disabled={selectedSceneIndex >= scenes.length - 1}
                className="btn-ghost flex items-center gap-1"
              >
                Next Scene
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
