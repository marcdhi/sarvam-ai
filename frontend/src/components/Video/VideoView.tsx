import React, { useState } from 'react';
import {
  Video,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Play,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { videoApi, projectsApi } from '../../services/api';
import { usePolling } from '../../hooks/usePolling';
import { ProgressBar } from '../Common/ProgressBar';

export function VideoView() {
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
        addNotification('success', 'Videos generated');
        setGenerating(false);
        setTaskId(null);
        return true;
      } else if (task.status === 'failed') {
        addNotification('error', `Video generation failed: ${task.error}`);
        setGenerating(false);
        setTaskId(null);
        return true;
      }
      return false;
    },
    5000,
    !!taskId
  );

  const handleGenerateAll = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const res = await videoApi.generate(projectId, {});
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
      const res = await videoApi.generate(projectId, {
        scene_indices: [sceneIndex],
      });
      setTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setGenerating(false);
    }
  };

  const handleSelectTake = async (sceneIndex: number, takePath: string) => {
    if (!projectId) return;
    try {
      await videoApi.selectTake(projectId, sceneIndex, takePath);
      const projRes = await projectsApi.get(projectId);
      setCurrentProject(projRes.project);
      addNotification('success', 'Take selected');
    } catch (e: any) {
      addNotification('error', e.message);
    }
  };

  if (!screenplay || scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Video size={48} className="text-studio-text-dim mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No screenplay yet</h3>
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
            className="btn-ghost text-xs"
          >
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
            <div className="text-xs text-studio-text-dim">
              {scene.video_takes.length > 0
                ? `${scene.video_takes.length} takes`
                : 'No video'}
            </div>
          </button>
        ))}
      </div>

      {/* Main Video Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {generating && (
          <div className="card mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 size={16} className="animate-spin text-studio-accent" />
              <span className="font-medium">Generating Videos</span>
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
                  {currentScene.duration_seconds}s
                  {currentScene.mood && ` - ${currentScene.mood}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateScene(selectedSceneIndex)}
                  disabled={generating}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  Generate New Take
                </button>
                <button
                  onClick={() => setView('audio')}
                  className="btn-primary flex items-center gap-2 text-sm"
                >
                  Next: Audio
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Video Preview */}
            {currentScene.selected_video ? (
              <div className="card mb-4">
                <h3 className="text-sm font-medium text-studio-text-muted mb-2">
                  Selected Take
                </h3>
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    key={currentScene.selected_video}
                    controls
                    className="w-full h-full"
                    src={`/files/${currentProject!.id}/video/scene_${String(currentScene.scene_number).padStart(3, '0')}/${currentScene.selected_video.split('/').pop()}`}
                  />
                </div>
              </div>
            ) : (
              <div className="card text-center py-16 mb-4">
                <Video size={48} className="text-studio-text-dim mx-auto mb-4" />
                <h3 className="font-medium mb-2">No video generated</h3>
                <p className="text-sm text-studio-text-muted mb-4">
                  Generate a video from the storyboard frames
                </p>
                <button
                  onClick={() => handleGenerateScene(selectedSceneIndex)}
                  disabled={generating}
                  className="btn-primary"
                >
                  <Sparkles size={16} className="inline mr-2" />
                  Generate Video
                </button>
              </div>
            )}

            {/* All Takes */}
            {currentScene.video_takes.length > 1 && (
              <div>
                <h3 className="text-sm font-medium text-studio-text-muted mb-2">
                  All Takes ({currentScene.video_takes.length})
                </h3>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentScene.video_takes.map((take, ti) => {
                    const isSelected = take === currentScene.selected_video;
                    return (
                      <div
                        key={ti}
                        className={`card p-2 cursor-pointer ${
                          isSelected ? 'border-studio-accent' : 'hover:border-studio-accent/30'
                        }`}
                        onClick={() =>
                          handleSelectTake(selectedSceneIndex, take)
                        }
                      >
                        <div className="aspect-video bg-black rounded overflow-hidden mb-2 flex items-center justify-center">
                          <Play size={24} className="text-white/50" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-studio-text-muted">
                            Take {ti + 1}
                          </span>
                          {isSelected && (
                            <CheckCircle size={14} className="text-studio-success" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={() =>
                  setSelectedSceneIndex(Math.max(0, selectedSceneIndex - 1))
                }
                disabled={selectedSceneIndex === 0}
                className="btn-ghost flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                Previous
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
                Next
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
