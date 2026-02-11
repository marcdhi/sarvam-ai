import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-1
  message?: string;
  showPercentage?: boolean;
  variant?: 'default' | 'success' | 'warning';
}

export function ProgressBar({
  progress,
  message,
  showPercentage = true,
  variant = 'default',
}: ProgressBarProps) {
  const pct = Math.round(progress * 100);
  const colorClass =
    variant === 'success'
      ? 'bg-studio-success'
      : variant === 'warning'
        ? 'bg-studio-warning'
        : 'bg-studio-accent';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        {message && (
          <span className="text-sm text-studio-text-muted truncate mr-2">
            {message}
          </span>
        )}
        {showPercentage && (
          <span className="text-sm font-mono text-studio-text-muted">
            {pct}%
          </span>
        )}
      </div>
      <div className="w-full bg-studio-surface rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
