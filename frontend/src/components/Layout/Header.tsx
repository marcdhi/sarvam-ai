import React from 'react';
import { useStore } from '../../store/useStore';
import { ProgressBar } from '../Common/ProgressBar';

export function Header() {
  const { activeTask, currentProject, pipelineStage } = useStore();

  return (
    <header className="h-12 bg-studio-surface border-b border-studio-border flex items-center px-4 gap-4">
      {/* Project info */}
      {currentProject && (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium truncate">
            {currentProject.name}
          </span>
          <span
            className={`badge ${
              currentProject.status === 'completed'
                ? 'badge-success'
                : currentProject.status === 'in_progress'
                  ? 'badge-warning'
                  : 'badge-info'
            }`}
          >
            {currentProject.status}
          </span>
        </div>
      )}

      {/* Active task progress */}
      {activeTask && activeTask.status === 'in_progress' && (
        <div className="flex-1 max-w-md">
          <ProgressBar
            progress={activeTask.progress}
            message={activeTask.message}
          />
        </div>
      )}

      <div className="flex-1" />

      {/* Pipeline stage indicator */}
      {pipelineStage !== 'idle' && (
        <span className="badge badge-warning">
          Pipeline: {pipelineStage}
        </span>
      )}
    </header>
  );
}
