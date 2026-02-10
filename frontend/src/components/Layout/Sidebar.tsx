import React from 'react';
import {
  Film,
  FileText,
  Image,
  Video,
  Music,
  Scissors,
  Download,
  Settings,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  LayoutDashboard,
} from 'lucide-react';
import type { AppView } from '../../types';
import { useStore } from '../../store/useStore';

const navItems: { view: AppView; label: string; icon: React.ElementType }[] = [
  { view: 'projects', label: 'Projects', icon: FolderOpen },
  { view: 'canvas', label: 'Canvas', icon: LayoutDashboard },
  { view: 'script', label: 'Script', icon: FileText },
  { view: 'storyboard', label: 'Storyboard', icon: Image },
  { view: 'video', label: 'Video', icon: Video },
  { view: 'audio', label: 'Audio', icon: Music },
  { view: 'timeline', label: 'Timeline', icon: Scissors },
  { view: 'export', label: 'Export', icon: Download },
  { view: 'settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const {
    currentView,
    setView,
    isSidebarCollapsed,
    toggleSidebar,
    currentProject,
  } = useStore();

  const projectLoaded = !!currentProject;

  return (
    <aside
      className={`flex flex-col h-full bg-studio-surface border-r border-studio-border transition-all duration-300 ${
        isSidebarCollapsed ? 'w-16' : 'w-56'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-studio-border">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-studio-accent to-purple-500 flex items-center justify-center shrink-0">
          <Clapperboard size={18} className="text-white" />
        </div>
        {!isSidebarCollapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold truncate">AI Film Studio</h1>
            <p className="text-xs text-studio-text-dim truncate">
              {currentProject ? currentProject.name : 'No project'}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map(({ view, label, icon: Icon }) => {
          const isActive = currentView === view;
          const disabled = view !== 'projects' && view !== 'settings' && !projectLoaded;

          return (
            <button
              key={view}
              onClick={() => !disabled && setView(view)}
              disabled={disabled}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-200 ${
                isActive
                  ? 'bg-studio-accent/15 text-studio-accent border border-studio-accent/30'
                  : disabled
                    ? 'text-studio-text-dim cursor-not-allowed opacity-40'
                    : 'text-studio-text-muted hover:bg-studio-card hover:text-studio-text'
              }`}
              title={isSidebarCollapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!isSidebarCollapsed && (
                <span className="text-sm font-medium">{label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={toggleSidebar}
        className="p-3 border-t border-studio-border text-studio-text-dim hover:text-studio-text transition-colors"
      >
        {isSidebarCollapsed ? (
          <ChevronRight size={18} />
        ) : (
          <ChevronLeft size={18} />
        )}
      </button>
    </aside>
  );
}
