import React, { useState } from 'react';
import { Sparkles, Loader2, Mic, Music, Volume2 } from 'lucide-react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useStore } from '../../../store/useStore';
import { audioApi, projectsApi } from '../../../services/api';
import { usePolling } from '../../../hooks/usePolling';

interface Props {
  node: CanvasNode;
}

export function AudioNode({ node }: Props) {
  const { currentProject, setCurrentProject, addNotification } = useStore();
  const [generatingDialogue, setGeneratingDialogue] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [dialogueTaskId, setDialogueTaskId] = useState<string | null>(null);
  const [musicTaskId, setMusicTaskId] = useState<string | null>(null);

  const sceneIndex = node.data.sceneIndex;
  const scene = currentProject?.screenplay?.scenes?.[sceneIndex];
  const projectId = currentProject?.id;

  usePolling(
    async () => {
      if (!projectId || !dialogueTaskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, dialogueTaskId);
      if (res.task.status === 'completed') {
        const p = await projectsApi.get(projectId);
        setCurrentProject(p.project);
        setGeneratingDialogue(false);
        setDialogueTaskId(null);
        return true;
      } else if (res.task.status === 'failed') {
        setGeneratingDialogue(false);
        setDialogueTaskId(null);
        return true;
      }
      return false;
    },
    3000,
    !!dialogueTaskId
  );

  usePolling(
    async () => {
      if (!projectId || !musicTaskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, musicTaskId);
      if (res.task.status === 'completed') {
        const p = await projectsApi.get(projectId);
        setCurrentProject(p.project);
        setGeneratingMusic(false);
        setMusicTaskId(null);
        return true;
      } else if (res.task.status === 'failed') {
        setGeneratingMusic(false);
        setMusicTaskId(null);
        return true;
      }
      return false;
    },
    3000,
    !!musicTaskId
  );

  if (!scene) {
    return <div className="text-xs text-studio-text-dim">No scene</div>;
  }

  const hasDialogue = scene.dialogue.some((d) => d.audio_path);
  const hasMusic = !!scene.music_path;
  const hasSFX = scene.sfx_paths.length > 0;

  return (
    <div className="space-y-2">
      {/* Dialogue */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-studio-text-muted">
          <Mic size={12} />
          Dialogue ({scene.dialogue.length} lines)
        </span>
        {hasDialogue ? (
          <span className="badge badge-success text-[10px]">Ready</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!projectId) return;
              setGeneratingDialogue(true);
              audioApi
                .generateDialogue(projectId, [sceneIndex])
                .then((r) => setDialogueTaskId(r.task_id))
                .catch(() => setGeneratingDialogue(false));
            }}
            disabled={generatingDialogue || scene.dialogue.length === 0}
            className="btn-ghost text-[10px] py-0.5 px-1.5"
          >
            {generatingDialogue ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          </button>
        )}
      </div>

      {/* Music */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-studio-text-muted">
          <Music size={12} />
          Music
        </span>
        {hasMusic ? (
          <span className="badge bg-purple-500/20 text-purple-400 text-[10px]">Ready</span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!projectId) return;
              setGeneratingMusic(true);
              audioApi
                .generateMusic(projectId, [sceneIndex])
                .then((r) => setMusicTaskId(r.task_id))
                .catch(() => setGeneratingMusic(false));
            }}
            disabled={generatingMusic}
            className="btn-ghost text-[10px] py-0.5 px-1.5"
          >
            {generatingMusic ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
          </button>
        )}
      </div>

      {/* SFX */}
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs text-studio-text-muted">
          <Volume2 size={12} />
          SFX
        </span>
        {hasSFX ? (
          <span className="badge bg-amber-500/20 text-amber-400 text-[10px]">
            {scene.sfx_paths.length} ready
          </span>
        ) : (
          <span className="text-[10px] text-studio-text-dim">None</span>
        )}
      </div>
    </div>
  );
}
