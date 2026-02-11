import React, { useState } from 'react';
import { Sparkles, Loader2, Image } from 'lucide-react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useStore } from '../../../store/useStore';
import { storyboardApi, projectsApi } from '../../../services/api';
import { usePolling } from '../../../hooks/usePolling';

interface Props {
  node: CanvasNode;
}

export function StoryboardNode({ node }: Props) {
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
        addNotification('error', `Storyboard failed: ${res.task.error}`);
        setGenerating(false);
        setTaskId(null);
        return true;
      }
      return false;
    },
    2000,
    !!taskId
  );

  const handleGenerate = async () => {
    if (!projectId) return;
    setGenerating(true);
    try {
      const res = await storyboardApi.generate(projectId, {
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

  const frames = scene.storyboard_frames || [];

  return (
    <div>
      {frames.length > 0 ? (
        <div className="grid grid-cols-3 gap-1 mb-2">
          {frames.slice(0, 3).map((_, fi) => (
            <div
              key={fi}
              className="aspect-video bg-studio-surface rounded overflow-hidden"
            >
              <img
                src={`/files/${projectId}/storyboard/scene_${String(scene.scene_number).padStart(3, '0')}/scene_${String(scene.scene_number).padStart(3, '0')}_frame_${String(fi).padStart(3, '0')}.png`}
                alt={`Frame ${fi + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="aspect-video bg-studio-surface rounded flex items-center justify-center mb-2">
          <Image size={24} className="text-studio-text-dim" />
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
        {frames.length > 0 ? 'Regenerate' : 'Generate'} Storyboard
      </button>
    </div>
  );
}
