/**
 * Zustand store for the Motion Graphics editor.
 * Manages scenes, layers, keyframes, playback, and selection state.
 */

import { create } from 'zustand';
import type {
  MotionProject,
  MotionScene,
  MotionLayer,
  Keyframe,
  PlaybackState,
  SelectionState,
  AnimationPreset,
  EasingType,
} from '../types/motion';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _uid = 0;
export const uid = () => `m-${Date.now().toString(36)}-${(++_uid).toString(36)}`;

function defaultLayer(type: MotionLayer['type'], sceneW: number, sceneH: number): MotionLayer {
  const base: MotionLayer = {
    id: uid(),
    name: type === 'text' ? 'Text' : type === 'shape' ? 'Shape' : 'Layer',
    type,
    visible: true,
    locked: false,
    inPoint: 0,
    outPoint: 5,
    transform: {
      x: sceneW / 2 - 100, y: sceneH / 2 - 50,
      width: 200, height: 100,
      rotation: 0, opacity: 1,
      scaleX: 1, scaleY: 1,
      anchorX: 0.5, anchorY: 0.5,
    },
    appearance: { fill: '#ffffff', stroke: 'transparent', strokeWidth: 0, borderRadius: 0 },
    effects: { blur: 0, shadowX: 0, shadowY: 0, shadowBlur: 0, shadowColor: 'rgba(0,0,0,0.3)', shadowOpacity: 0 },
    keyframes: {},
  };

  if (type === 'text') {
    base.textProps = {
      text: 'Text', fontSize: 48, fontFamily: 'Inter', fontWeight: 600,
      letterSpacing: 0, lineHeight: 1.2, textAlign: 'center', color: '#ffffff',
    };
    base.transform.width = 400;
    base.transform.height = 80;
    base.transform.x = sceneW / 2 - 200;
    base.transform.y = sceneH / 2 - 40;
  }

  if (type === 'shape') {
    base.shapeProps = { shapeType: 'rectangle' };
    base.appearance.fill = '#6366f1';
    base.appearance.borderRadius = 12;
  }

  return base;
}

// ─── Store Interface ──────────────────────────────────────────────────────────

interface MotionStoreState {
  // Project
  project: MotionProject | null;
  activeSceneId: string | null;
  isGenerating: boolean;

  // Playback
  playback: PlaybackState;

  // Selection
  selection: SelectionState;

  // Timeline
  timelineZoom: number; // px per second
  timelineScroll: number;

  // Project actions
  setProject: (project: MotionProject) => void;
  clearProject: () => void;
  setGenerating: (v: boolean) => void;

  // Scene actions
  setActiveScene: (id: string) => void;
  addScene: () => void;
  removeScene: (id: string) => void;
  updateScene: (id: string, updates: Partial<MotionScene>) => void;

  // Layer actions
  addLayer: (type: MotionLayer['type']) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<MotionLayer>) => void;
  reorderLayer: (layerId: string, newIndex: number) => void;
  duplicateLayer: (layerId: string) => void;

  // Keyframe actions
  addKeyframe: (layerId: string, property: string, time: number, value: number | string, easing?: EasingType) => void;
  updateKeyframe: (layerId: string, property: string, keyframeId: string, updates: Partial<Keyframe>) => void;
  removeKeyframe: (layerId: string, property: string, keyframeId: string) => void;

  // Preset actions
  applyPreset: (layerId: string, preset: AnimationPreset, startTime: number) => void;

  // Playback
  play: () => void;
  pause: () => void;
  stop: () => void;
  setCurrentTime: (t: number) => void;
  toggleLoop: () => void;

  // Selection
  selectLayer: (id: string) => void;
  deselectAll: () => void;

  // Timeline
  setTimelineZoom: (z: number) => void;
  setTimelineScroll: (s: number) => void;

  // Computed
  activeScene: () => MotionScene | null;
  selectedLayer: () => MotionLayer | null;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useMotionStore = create<MotionStoreState>((set, get) => {
  // Helper to mutate the active scene's layers
  const mutateScene = (fn: (scene: MotionScene) => MotionScene) => {
    const { project, activeSceneId } = get();
    if (!project || !activeSceneId) return;
    set({
      project: {
        ...project,
        scenes: project.scenes.map(s => s.id === activeSceneId ? fn(s) : s),
      },
    });
  };

  const mutateLayer = (layerId: string, fn: (layer: MotionLayer) => MotionLayer) => {
    mutateScene(scene => ({
      ...scene,
      layers: scene.layers.map(l => l.id === layerId ? fn(l) : l),
    }));
  };

  return {
    project: null,
    activeSceneId: null,
    isGenerating: false,
    playback: { isPlaying: false, currentTime: 0, loop: false },
    selection: { layerIds: [], keyframeIds: [] },
    timelineZoom: 100,
    timelineScroll: 0,

    // ─── Project ────────────────────────────────────────────────────

    setProject: (project) => {
      set({
        project,
        activeSceneId: project.scenes[0]?.id ?? null,
        playback: { isPlaying: false, currentTime: 0, loop: false },
        selection: { layerIds: [], keyframeIds: [] },
      });
    },

    clearProject: () => set({ project: null, activeSceneId: null }),
    setGenerating: (v) => set({ isGenerating: v }),

    // ─── Scene ──────────────────────────────────────────────────────

    setActiveScene: (id) => set({ activeSceneId: id, playback: { ...get().playback, currentTime: 0 } }),

    addScene: () => {
      const { project } = get();
      if (!project) return;
      const scene: MotionScene = {
        id: uid(), name: `Scene ${project.scenes.length + 1}`,
        duration: 5, bgColor: '#000000', layers: [],
      };
      set({
        project: { ...project, scenes: [...project.scenes, scene] },
        activeSceneId: scene.id,
      });
    },

    removeScene: (id) => {
      const { project, activeSceneId } = get();
      if (!project || project.scenes.length <= 1) return;
      const newScenes = project.scenes.filter(s => s.id !== id);
      set({
        project: { ...project, scenes: newScenes },
        activeSceneId: activeSceneId === id ? newScenes[0].id : activeSceneId,
      });
    },

    updateScene: (id, updates) => {
      const { project } = get();
      if (!project) return;
      set({
        project: {
          ...project,
          scenes: project.scenes.map(s => s.id === id ? { ...s, ...updates } : s),
        },
      });
    },

    // ─── Layer ──────────────────────────────────────────────────────

    addLayer: (type) => {
      const { project } = get();
      if (!project) return;
      const layer = defaultLayer(type, project.canvasWidth, project.canvasHeight);
      const scene = get().activeScene();
      if (scene) layer.outPoint = scene.duration;
      mutateScene(s => ({ ...s, layers: [...s.layers, layer] }));
      set({ selection: { layerIds: [layer.id], keyframeIds: [] } });
    },

    removeLayer: (layerId) => {
      mutateScene(s => ({ ...s, layers: s.layers.filter(l => l.id !== layerId) }));
      set(state => ({
        selection: {
          ...state.selection,
          layerIds: state.selection.layerIds.filter(id => id !== layerId),
        },
      }));
    },

    updateLayer: (layerId, updates) => {
      mutateLayer(layerId, l => ({ ...l, ...updates }));
    },

    reorderLayer: (layerId, newIndex) => {
      mutateScene(scene => {
        const layers = [...scene.layers];
        const oldIndex = layers.findIndex(l => l.id === layerId);
        if (oldIndex === -1) return scene;
        const [layer] = layers.splice(oldIndex, 1);
        layers.splice(newIndex, 0, layer);
        return { ...scene, layers };
      });
    },

    duplicateLayer: (layerId) => {
      mutateScene(scene => {
        const layer = scene.layers.find(l => l.id === layerId);
        if (!layer) return scene;
        const clone = JSON.parse(JSON.stringify(layer)) as MotionLayer;
        clone.id = uid();
        clone.name = `${layer.name} copy`;
        // Re-id all keyframes
        for (const kfs of Object.values(clone.keyframes)) {
          for (const kf of kfs) kf.id = uid();
        }
        return { ...scene, layers: [...scene.layers, clone] };
      });
    },

    // ─── Keyframe ───────────────────────────────────────────────────

    addKeyframe: (layerId, property, time, value, easing = 'easeInOut') => {
      const kf: Keyframe = { id: uid(), time, value, easing };
      mutateLayer(layerId, layer => {
        const existing = layer.keyframes[property] ?? [];
        const updated = [...existing, kf].sort((a, b) => a.time - b.time);
        return { ...layer, keyframes: { ...layer.keyframes, [property]: updated } };
      });
    },

    updateKeyframe: (layerId, property, keyframeId, updates) => {
      mutateLayer(layerId, layer => {
        const kfs = (layer.keyframes[property] ?? []).map(kf =>
          kf.id === keyframeId ? { ...kf, ...updates } : kf
        ).sort((a, b) => a.time - b.time);
        return { ...layer, keyframes: { ...layer.keyframes, [property]: kfs } };
      });
    },

    removeKeyframe: (layerId, property, keyframeId) => {
      mutateLayer(layerId, layer => {
        const kfs = (layer.keyframes[property] ?? []).filter(kf => kf.id !== keyframeId);
        const keyframes = { ...layer.keyframes };
        if (kfs.length === 0) {
          delete keyframes[property];
        } else {
          keyframes[property] = kfs;
        }
        return { ...layer, keyframes };
      });
    },

    // ─── Presets ────────────────────────────────────────────────────

    applyPreset: (layerId, preset, startTime) => {
      mutateLayer(layerId, layer => {
        const newKeyframes = { ...layer.keyframes };
        for (const [prop, relativeKfs] of Object.entries(preset.keyframes)) {
          const absoluteKfs: Keyframe[] = relativeKfs.map(kf => ({
            id: uid(),
            time: startTime + kf.time * preset.duration,
            value: typeof kf.value === 'number'
              ? (prop === 'x' ? layer.transform.x + kf.value : prop === 'y' ? layer.transform.y + kf.value : kf.value)
              : kf.value,
            easing: kf.easing,
          }));
          const existing = newKeyframes[prop] ?? [];
          newKeyframes[prop] = [...existing, ...absoluteKfs].sort((a, b) => a.time - b.time);
        }
        return { ...layer, keyframes: newKeyframes };
      });
    },

    // ─── Playback ───────────────────────────────────────────────────

    play: () => set(s => ({ playback: { ...s.playback, isPlaying: true } })),
    pause: () => set(s => ({ playback: { ...s.playback, isPlaying: false } })),
    stop: () => set(s => ({ playback: { ...s.playback, isPlaying: false, currentTime: 0 } })),
    setCurrentTime: (t) => set(s => ({ playback: { ...s.playback, currentTime: t } })),
    toggleLoop: () => set(s => ({ playback: { ...s.playback, loop: !s.playback.loop } })),

    // ─── Selection ──────────────────────────────────────────────────

    selectLayer: (id) => set({ selection: { layerIds: [id], keyframeIds: [] } }),
    deselectAll: () => set({ selection: { layerIds: [], keyframeIds: [] } }),

    // ─── Timeline ───────────────────────────────────────────────────

    setTimelineZoom: (z) => set({ timelineZoom: Math.max(30, Math.min(300, z)) }),
    setTimelineScroll: (s) => set({ timelineScroll: Math.max(0, s) }),

    // ─── Computed ───────────────────────────────────────────────────

    activeScene: () => {
      const { project, activeSceneId } = get();
      if (!project || !activeSceneId) return null;
      return project.scenes.find(s => s.id === activeSceneId) ?? null;
    },

    selectedLayer: () => {
      const scene = get().activeScene();
      const { selection } = get();
      if (!scene || selection.layerIds.length === 0) return null;
      return scene.layers.find(l => l.id === selection.layerIds[0]) ?? null;
    },
  };
});
