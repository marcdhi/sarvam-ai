import React, { useState } from 'react';
import {
  Music,
  Mic,
  Volume2,
  Sparkles,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { audioApi, projectsApi } from '../../services/api';
import { usePolling } from '../../hooks/usePolling';
import { ProgressBar } from '../Common/ProgressBar';

export function AudioMixer() {
  const {
    currentProject,
    setCurrentProject,
    addNotification,
    setView,
    selectedSceneIndex,
    setSelectedSceneIndex,
  } = useStore();

  const [generatingDialogue, setGeneratingDialogue] = useState(false);
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [generatingSFX, setGeneratingSFX] = useState(false);
  const [dialogueTaskId, setDialogueTaskId] = useState<string | null>(null);
  const [musicTaskId, setMusicTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [sfxPrompt, setSfxPrompt] = useState('');

  const screenplay = currentProject?.screenplay;
  const projectId = currentProject?.id;
  const scenes = screenplay?.scenes || [];
  const currentScene = scenes[selectedSceneIndex];

  // Poll dialogue generation
  usePolling(
    async () => {
      if (!projectId || !dialogueTaskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, dialogueTaskId);
      const task = res.task;
      setProgress(task.progress);
      setProgressMsg(task.message);
      if (task.status === 'completed') {
        const projRes = await projectsApi.get(projectId);
        setCurrentProject(projRes.project);
        addNotification('success', 'Dialogue audio generated');
        setGeneratingDialogue(false);
        setDialogueTaskId(null);
        return true;
      } else if (task.status === 'failed') {
        addNotification('error', `Dialogue generation failed: ${task.error}`);
        setGeneratingDialogue(false);
        setDialogueTaskId(null);
        return true;
      }
      return false;
    },
    3000,
    !!dialogueTaskId
  );

  // Poll music generation
  usePolling(
    async () => {
      if (!projectId || !musicTaskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, musicTaskId);
      const task = res.task;
      if (task.status === 'completed') {
        const projRes = await projectsApi.get(projectId);
        setCurrentProject(projRes.project);
        addNotification('success', 'Music generated');
        setGeneratingMusic(false);
        setMusicTaskId(null);
        return true;
      } else if (task.status === 'failed') {
        addNotification('error', `Music generation failed: ${task.error}`);
        setGeneratingMusic(false);
        setMusicTaskId(null);
        return true;
      }
      return false;
    },
    3000,
    !!musicTaskId
  );

  const handleGenerateDialogue = async (sceneIndices?: number[]) => {
    if (!projectId) return;
    setGeneratingDialogue(true);
    try {
      const res = await audioApi.generateDialogue(projectId, sceneIndices);
      setDialogueTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setGeneratingDialogue(false);
    }
  };

  const handleGenerateMusic = async (sceneIndices?: number[]) => {
    if (!projectId) return;
    setGeneratingMusic(true);
    try {
      const res = await audioApi.generateMusic(projectId, sceneIndices);
      setMusicTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setGeneratingMusic(false);
    }
  };

  const handleGenerateSFX = async () => {
    if (!projectId) return;
    setGeneratingSFX(true);
    try {
      await audioApi.generateSFX(
        projectId,
        selectedSceneIndex,
        sfxPrompt || undefined
      );
      const projRes = await projectsApi.get(projectId);
      setCurrentProject(projRes.project);
      addNotification('success', 'Sound effects generated');
      setSfxPrompt('');
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setGeneratingSFX(false);
    }
  };

  if (!screenplay || scenes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Music size={48} className="text-studio-text-dim mx-auto mb-4" />
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
        <div className="px-2 mb-3">
          <span className="text-xs font-medium text-studio-text-dim uppercase">
            Scenes
          </span>
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
              {scene.dialogue.length} lines
              {scene.music_path ? ' + music' : ''}
            </div>
          </button>
        ))}
      </div>

      {/* Main Audio Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {(generatingDialogue || generatingMusic) && (
          <div className="card mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Loader2 size={16} className="animate-spin text-studio-accent" />
              <span className="font-medium">
                {generatingDialogue ? 'Generating Dialogue' : 'Generating Music'}
              </span>
            </div>
            <ProgressBar progress={progress} message={progressMsg} />
          </div>
        )}

        {currentScene && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="section-title mb-0">
                Scene {currentScene.scene_number} Audio
              </h2>
              <button
                onClick={() => setView('timeline')}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                Next: Timeline
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Dialogue Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Mic size={16} className="text-studio-accent" />
                  Dialogue
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleGenerateDialogue([selectedSceneIndex])}
                    disabled={generatingDialogue || currentScene.dialogue.length === 0}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    <Sparkles size={12} />
                    Generate Scene
                  </button>
                  <button
                    onClick={() => handleGenerateDialogue()}
                    disabled={generatingDialogue}
                    className="btn-secondary text-xs"
                  >
                    Generate All
                  </button>
                </div>
              </div>
              {currentScene.dialogue.length > 0 ? (
                <div className="space-y-3">
                  {currentScene.dialogue.map((line, li) => (
                    <div
                      key={li}
                      className="flex items-start gap-3 p-3 bg-studio-surface rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold text-studio-accent uppercase">
                            {line.character}
                          </span>
                          {line.direction && (
                            <span className="text-xs text-studio-text-dim italic">
                              {line.direction}
                            </span>
                          )}
                        </div>
                        <p className="text-sm">{line.text}</p>
                      </div>
                      {line.audio_path && (
                        <div className="shrink-0">
                          <span className="badge badge-success text-xs">
                            Audio Ready
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-studio-text-muted">
                  No dialogue in this scene
                </p>
              )}
            </div>

            {/* Music Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Music size={16} className="text-purple-400" />
                  Background Music
                </h3>
                <button
                  onClick={() => handleGenerateMusic([selectedSceneIndex])}
                  disabled={generatingMusic}
                  className="btn-secondary text-xs flex items-center gap-1"
                >
                  <Sparkles size={12} />
                  {currentScene.music_path ? 'Regenerate' : 'Generate'}
                </button>
              </div>
              {currentScene.music_path ? (
                <div className="flex items-center gap-3 p-3 bg-studio-surface rounded-lg">
                  <Music size={16} className="text-purple-400" />
                  <span className="text-sm flex-1">Score generated</span>
                  <span className="badge badge-success text-xs">Ready</span>
                </div>
              ) : (
                <p className="text-sm text-studio-text-muted">
                  No music generated yet
                </p>
              )}
            </div>

            {/* SFX Section */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Volume2 size={16} className="text-studio-warning" />
                  Sound Effects
                </h3>
              </div>
              {currentScene.sfx_paths.length > 0 && (
                <div className="space-y-2 mb-4">
                  {currentScene.sfx_paths.map((sfx, si) => (
                    <div
                      key={si}
                      className="flex items-center gap-3 p-2 bg-studio-surface rounded-lg"
                    >
                      <Volume2 size={14} className="text-studio-warning" />
                      <span className="text-sm flex-1">SFX {si + 1}</span>
                      <span className="badge badge-success text-xs">Ready</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  className="input-field flex-1 text-sm"
                  placeholder="Describe sound effect (optional - auto-generated from scene)"
                  value={sfxPrompt}
                  onChange={(e) => setSfxPrompt(e.target.value)}
                />
                <button
                  onClick={handleGenerateSFX}
                  disabled={generatingSFX}
                  className="btn-secondary text-sm flex items-center gap-1"
                >
                  {generatingSFX ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  Add SFX
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
