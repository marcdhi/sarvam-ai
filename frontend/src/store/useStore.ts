import { create } from 'zustand';
import type {
  AppView,
  PipelineStage,
  Project,
  ProjectSummary,
  TaskProgress,
} from '../types';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
}

interface AppState {
  // Navigation
  currentView: AppView;
  setView: (view: AppView) => void;

  // Projects
  projects: ProjectSummary[];
  setProjects: (projects: ProjectSummary[]) => void;
  currentProject: Project | null;
  setCurrentProject: (project: Project | null) => void;

  // Pipeline
  pipelineStage: PipelineStage;
  setPipelineStage: (stage: PipelineStage) => void;
  activeTask: TaskProgress | null;
  setActiveTask: (task: TaskProgress | null) => void;

  // UI State
  selectedSceneIndex: number;
  setSelectedSceneIndex: (index: number) => void;
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // Notifications
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string) => void;
  removeNotification: (id: string) => void;

  // Loading
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
  loadingMessage: string;
  setLoadingMessage: (message: string) => void;
}

export const useStore = create<AppState>((set) => ({
  // Navigation
  currentView: 'projects',
  setView: (view) => set({ currentView: view }),

  // Projects
  projects: [],
  setProjects: (projects) => set({ projects }),
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // Pipeline
  pipelineStage: 'idle',
  setPipelineStage: (stage) => set({ pipelineStage: stage }),
  activeTask: null,
  setActiveTask: (task) => set({ activeTask: task }),

  // UI State
  selectedSceneIndex: 0,
  setSelectedSceneIndex: (index) => set({ selectedSceneIndex: index }),
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Notifications
  notifications: [],
  addNotification: (type, message) =>
    set((state) => ({
      notifications: [
        ...state.notifications,
        { id: Date.now().toString(), type, message },
      ],
    })),
  removeNotification: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  // Loading
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
  loadingMessage: '',
  setLoadingMessage: (message) => set({ loadingMessage: message }),
}));
