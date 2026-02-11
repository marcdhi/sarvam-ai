import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  FolderOpen,
  Sparkles,
  Clock,
  Loader2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { projectsApi } from '../../services/api';
import { Modal } from '../Common/Modal';
import { ProgressBar } from '../Common/ProgressBar';
import { usePolling } from '../../hooks/usePolling';
import type { ProjectSummary } from '../../types';

export function ProjectManager() {
  const {
    projects,
    setProjects,
    setCurrentProject,
    setView,
    addNotification,
    setActiveTask,
    activeTask,
  } = useStore();

  const [showNewProject, setShowNewProject] = useState(false);
  const [showQuickStart, setShowQuickStart] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newDuration, setNewDuration] = useState(1);
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickGenre, setQuickGenre] = useState('');
  const [quickTone, setQuickTone] = useState('');
  const [loading, setLoading] = useState(false);
  const [pipelineProjectId, setPipelineProjectId] = useState<string | null>(null);
  const [pipelineTaskId, setPipelineTaskId] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    try {
      const res = await projectsApi.list();
      setProjects(res.projects);
    } catch (e: any) {
      addNotification('error', `Failed to load projects: ${e.message}`);
    }
  }, [setProjects, addNotification]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Poll pipeline status
  usePolling(
    async () => {
      if (!pipelineProjectId || !pipelineTaskId) return true;
      try {
        const res = await projectsApi.getPipelineStatus(pipelineProjectId, pipelineTaskId);
        const task = res.task;
        setActiveTask(task);
        if (task.status === 'completed') {
          addNotification('success', 'Film pipeline completed!');
          const proj = await projectsApi.get(pipelineProjectId);
          setCurrentProject(proj.project);
          setView('timeline');
          setPipelineProjectId(null);
          setPipelineTaskId(null);
          return true;
        } else if (task.status === 'failed') {
          addNotification('error', `Pipeline failed: ${task.error}`);
          setPipelineProjectId(null);
          setPipelineTaskId(null);
          return true;
        }
      } catch {
        // keep polling
      }
      return false;
    },
    3000,
    !!pipelineTaskId
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      const res = await projectsApi.create({
        name: newName,
        description: newDesc,
        target_duration_minutes: newDuration,
      });
      setCurrentProject(res.project);
      setView('script');
      setShowNewProject(false);
      addNotification('success', `Project "${newName}" created`);
      loadProjects();
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = async () => {
    if (!quickPrompt.trim()) return;
    setLoading(true);
    try {
      const name = quickPrompt.slice(0, 40) + (quickPrompt.length > 40 ? '...' : '');
      const res = await projectsApi.create({
        name,
        description: quickPrompt,
        target_duration_minutes: newDuration,
      });
      const projId = res.project.id;

      const pipelineRes = await projectsApi.runFullPipeline(projId, {
        prompt: quickPrompt,
        genre: quickGenre,
        tone: quickTone,
        target_duration_minutes: newDuration,
      });

      setPipelineProjectId(projId);
      setPipelineTaskId(pipelineRes.task_id);
      setShowQuickStart(false);
      addNotification('info', 'Full pipeline started - generating your film...');
      loadProjects();
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = async (proj: ProjectSummary) => {
    try {
      const res = await projectsApi.get(proj.id);
      setCurrentProject(res.project);
      setView('script');
    } catch (e: any) {
      addNotification('error', e.message);
    }
  };

  const handleDelete = async (proj: ProjectSummary) => {
    if (!confirm(`Delete "${proj.name}"? This cannot be undone.`)) return;
    try {
      await projectsApi.delete(proj.id);
      addNotification('success', 'Project deleted');
      loadProjects();
    } catch (e: any) {
      addNotification('error', e.message);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-studio-accent to-purple-400 bg-clip-text text-transparent">
            AI Filmmaking Studio
          </h1>
          <p className="text-studio-text-muted mt-1">
            Create films with AI - from script to screen
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowQuickStart(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Sparkles size={16} />
            Quick Start
          </button>
          <button
            onClick={() => setShowNewProject(true)}
            className="btn-secondary flex items-center gap-2"
          >
            <Plus size={16} />
            New Project
          </button>
        </div>
      </div>

      {/* Pipeline Progress */}
      {pipelineTaskId && activeTask && (
        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-3">
            <Loader2 size={18} className="animate-spin text-studio-accent" />
            <span className="font-medium">Pipeline Running</span>
          </div>
          <ProgressBar
            progress={activeTask.progress}
            message={activeTask.message}
          />
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-20 h-20 rounded-2xl bg-studio-card flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={32} className="text-studio-text-dim" />
          </div>
          <h3 className="text-lg font-medium mb-2">No projects yet</h3>
          <p className="text-studio-text-muted mb-6">
            Create a new project or use Quick Start to generate a film from a prompt
          </p>
          <button
            onClick={() => setShowQuickStart(true)}
            className="btn-primary"
          >
            <Sparkles size={16} className="inline mr-2" />
            Get Started
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              className="card-hover group"
              onClick={() => handleOpen(proj)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold truncate">{proj.name}</h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(proj);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-studio-danger/20 text-studio-danger transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center gap-2 text-sm text-studio-text-muted">
                <span
                  className={`badge ${
                    proj.status === 'completed'
                      ? 'badge-success'
                      : proj.status === 'in_progress'
                        ? 'badge-warning'
                        : 'badge-info'
                  }`}
                >
                  {proj.status}
                </span>
                <Clock size={12} />
                <span>
                  {new Date(proj.updated_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        title="New Project"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Project Name</label>
            <input
              type="text"
              className="input-field"
              placeholder="My Film"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="textarea-field"
              placeholder="Brief description of your film..."
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Target Duration (minutes)</label>
            <input
              type="number"
              className="input-field"
              min={0.5}
              max={10}
              step={0.5}
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowNewProject(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !newName.trim()}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Quick Start Modal */}
      <Modal
        isOpen={showQuickStart}
        onClose={() => setShowQuickStart(false)}
        title="Quick Start - Generate a Film"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Film Concept</label>
            <textarea
              className="textarea-field min-h-[120px]"
              placeholder="Describe your film idea in detail... e.g., 'A noir detective story set in a rain-soaked Tokyo where an AI detective investigates a murder in a neon-lit alley'"
              value={quickPrompt}
              onChange={(e) => setQuickPrompt(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Genre</label>
              <select
                className="input-field"
                value={quickGenre}
                onChange={(e) => setQuickGenre(e.target.value)}
              >
                <option value="">Any</option>
                <option value="Drama">Drama</option>
                <option value="Thriller">Thriller</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Horror">Horror</option>
                <option value="Comedy">Comedy</option>
                <option value="Romance">Romance</option>
                <option value="Action">Action</option>
                <option value="Documentary">Documentary</option>
                <option value="Fantasy">Fantasy</option>
                <option value="Noir">Noir</option>
                <option value="Animation">Animation</option>
              </select>
            </div>
            <div>
              <label className="label">Tone</label>
              <select
                className="input-field"
                value={quickTone}
                onChange={(e) => setQuickTone(e.target.value)}
              >
                <option value="">Cinematic</option>
                <option value="Dark and moody">Dark & Moody</option>
                <option value="Bright and uplifting">Bright & Uplifting</option>
                <option value="Suspenseful">Suspenseful</option>
                <option value="Whimsical">Whimsical</option>
                <option value="Gritty and realistic">Gritty & Realistic</option>
                <option value="Dreamlike and surreal">Dreamlike & Surreal</option>
                <option value="Epic and grand">Epic & Grand</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Target Duration (minutes)</label>
            <input
              type="number"
              className="input-field"
              min={0.5}
              max={5}
              step={0.5}
              value={newDuration}
              onChange={(e) => setNewDuration(Number(e.target.value))}
            />
            <p className="text-xs text-studio-text-dim mt-1">
              Estimated cost: ~${(newDuration * 4.15).toFixed(2)} (cloud) / ~${(newDuration * 0.55).toFixed(2)} (local models)
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => setShowQuickStart(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleQuickStart}
              disabled={loading || !quickPrompt.trim()}
              className="btn-primary flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Generate Film
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
