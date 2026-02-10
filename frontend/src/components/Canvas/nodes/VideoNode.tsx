import React, { useState } from 'react';
import { Sparkles, Loader2, Video, Play } from 'lucide-react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useStore } from '../../../store/useStore';
import { videoApi, projectsApi } from '../../../services/api';
import { usePolling } from '../../../hooks/usePolling';

interface Props {
  node: CanvasNode;
}

export function VideoNode({ node }: Props) {
  const { currentProject, setCurrentProject, addNotification } = useStore();
  const [generating, setGenerating] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);

  const sceneIndex = node.data.sceneIndex;
  const scene = currentProject?.screenplay?.scenes?.[sceneIndex];
  const projectId = currentProject?.id;

  usePolling(
    async () => {
      if (!projectId || !taskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, taskId);
      if (res.task.status === 'completed') {
        const p = await projectsApi.get(projectId);
        setCurrentProject(p.project);
        setGenerating(false);
        setTaskId(null);
        return true;
      } else if (res.task.status === 'failed') {
        addNotification('error', `Video failed: ${res.task.error}`);
        setGenerating(false);
        setTaskId(null);
        return true;
      }
      return false;
    },
    5000,
    !!taskId
  );

  const handleGenerate = async () => {
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

  if (!scene) {
    return <div className="text-xs text-studio-text-dim">No scene</div>;
  }

  const hasVideo = !!scene.selected_video;

  return (
    <div>
      {hasVideo ? (
        <div className="aspect-video bg-black rounded overflow-hidden mb-2 relative group">
          <video
            src={`/files/${projectId}/video/scene_${String(scene.scene_number).padStart(3, '0')}/${scene.selected_video?.split('/').pop()}`}
            className="w-full h-full object-cover"
            controls
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute top-1 right-1 badge badge-success text-[10px]">
            {scene.video_takes.length} take{scene.video_takes.length > 1 ? 's' : ''}
          </div>
        </div>
      ) : (
        <div className="aspect-video bg-studio-surface rounded flex items-center justify-center mb-2">
          <Video size={24} className="text-studio-text-dim" />
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleGenerate();
        }}
        disabled={generating}
        className="btn-secondary w-full text-xs py-1 flex items-center justify-center gap-1"
      >
        {generating ? (
          <Loader2 size={12} className="animate-spin" />
        ) : (
          <Sparkles size={12} />
        )}
        {hasVideo ? 'New Take' : 'Generate Video'}
      </button>
    </div>
  );
}
