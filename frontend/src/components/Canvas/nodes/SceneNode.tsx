import React from 'react';
import { Film, Clock, MessageSquare } from 'lucide-react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useStore } from '../../../store/useStore';

interface Props {
  node: CanvasNode;
}

export function SceneNode({ node }: Props) {
  const { currentProject } = useStore();
  const sceneIndex = node.data.sceneIndex;
  const scene = currentProject?.screenplay?.scenes?.[sceneIndex];

  if (!scene) {
    return <div className="text-xs text-studio-text-dim">Scene not found</div>;
  }

  const statusColors: Record<string, string> = {
    scripted: 'bg-blue-500/20 text-blue-400',
    storyboarded: 'bg-purple-500/20 text-purple-400',
    video_generated: 'bg-pink-500/20 text-pink-400',
    audio_generated: 'bg-green-500/20 text-green-400',
    composited: 'bg-emerald-500/20 text-emerald-400',
    finalized: 'bg-studio-success/20 text-studio-success',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-mono text-xs font-bold truncate flex-1">
          {scene.heading}
        </h4>
        <span className={`badge text-[10px] ${statusColors[scene.status] || 'bg-studio-surface text-studio-text-dim'}`}>
          {scene.status}
        </span>
      </div>
      <p className="text-xs text-studio-text-muted line-clamp-3 mb-2">
        {scene.description}
      </p>
      <div className="flex items-center gap-3 text-[10px] text-studio-text-dim">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {scene.duration_seconds}s
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare size={10} />
          {scene.dialogue.length} lines
        </span>
        {scene.mood && (
          <span className="flex items-center gap-1">
            <Film size={10} />
            {scene.mood}
          </span>
        )}
      </div>
    </div>
  );
}
