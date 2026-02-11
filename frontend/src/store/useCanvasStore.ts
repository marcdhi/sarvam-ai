import { create } from 'zustand';

export interface CanvasNode {
  id: string;
  type: 'script' | 'scene' | 'storyboard' | 'video' | 'audio' | 'music' | 'sfx' | 'note' | 'image' | 'export';
  x: number;
  y: number;
  width: number;
  height: number;
  data: Record<string, any>;
  connections: string[]; // IDs of connected nodes
  zIndex: number;
  collapsed: boolean;
}

export interface CanvasConnection {
  id: string;
  from: string;
  to: string;
  label?: string;
}

interface CanvasState {
  // Viewport
  panX: number;
  panY: number;
  zoom: number;
  setPan: (x: number, y: number) => void;
  setZoom: (zoom: number) => void;

  // Nodes
  nodes: CanvasNode[];
  addNode: (node: CanvasNode) => void;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  removeNode: (id: string) => void;
  moveNode: (id: string, x: number, y: number) => void;

  // Connections
  connections: CanvasConnection[];
  addConnection: (conn: CanvasConnection) => void;
  removeConnection: (id: string) => void;

  // Selection
  selectedNodeId: string | null;
  setSelectedNode: (id: string | null) => void;

  // Drag state
  isDragging: boolean;
  setDragging: (dragging: boolean) => void;
  isPanning: boolean;
  setPanning: (panning: boolean) => void;

  // Layout helpers
  autoLayoutPipeline: (scenes: any[]) => void;
  clearCanvas: () => void;
}

let nextZ = 1;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  panX: 0,
  panY: 0,
  zoom: 1,
  setPan: (x, y) => set({ panX: x, panY: y }),
  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(3, zoom)) }),

  nodes: [],
  addNode: (node) =>
    set((s) => ({ nodes: [...s.nodes, { ...node, zIndex: nextZ++ }] })),
  updateNode: (id, updates) =>
    set((s) => ({
      nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  removeNode: (id) =>
    set((s) => ({
      nodes: s.nodes.filter((n) => n.id !== id),
      connections: s.connections.filter((c) => c.from !== id && c.to !== id),
      selectedNodeId: s.selectedNodeId === id ? null : s.selectedNodeId,
    })),
  moveNode: (id, x, y) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, x, y, zIndex: nextZ++ } : n
      ),
    })),

  connections: [],
  addConnection: (conn) =>
    set((s) => ({ connections: [...s.connections, conn] })),
  removeConnection: (id) =>
    set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),

  selectedNodeId: null,
  setSelectedNode: (id) => set({ selectedNodeId: id }),

  isDragging: false,
  setDragging: (dragging) => set({ isDragging: dragging }),
  isPanning: false,
  setPanning: (panning) => set({ isPanning: panning }),

  clearCanvas: () =>
    set({ nodes: [], connections: [], selectedNodeId: null, panX: 0, panY: 0, zoom: 1 }),

  autoLayoutPipeline: (scenes) => {
    const nodes: CanvasNode[] = [];
    const connections: CanvasConnection[] = [];

    // Master script node
    const scriptId = 'node-script';
    nodes.push({
      id: scriptId,
      type: 'script',
      x: 100,
      y: 100,
      width: 320,
      height: 200,
      data: { label: 'Screenplay' },
      connections: [],
      zIndex: nextZ++,
      collapsed: false,
    });

    const exportId = 'node-export';

    scenes.forEach((scene: any, i: number) => {
      const baseX = 100;
      const baseY = 380 + i * 340;

      // Scene node
      const sceneId = `node-scene-${i}`;
      nodes.push({
        id: sceneId,
        type: 'scene',
        x: baseX,
        y: baseY,
        width: 280,
        height: 160,
        data: { sceneIndex: i, scene },
        connections: [],
        zIndex: nextZ++,
        collapsed: false,
      });
      connections.push({
        id: `conn-script-scene-${i}`,
        from: scriptId,
        to: sceneId,
        label: `Scene ${i + 1}`,
      });

      // Storyboard node
      const sbId = `node-sb-${i}`;
      nodes.push({
        id: sbId,
        type: 'storyboard',
        x: baseX + 340,
        y: baseY,
        width: 300,
        height: 200,
        data: { sceneIndex: i, scene },
        connections: [],
        zIndex: nextZ++,
        collapsed: false,
      });
      connections.push({ id: `conn-scene-sb-${i}`, from: sceneId, to: sbId });

      // Video node
      const vidId = `node-vid-${i}`;
      nodes.push({
        id: vidId,
        type: 'video',
        x: baseX + 700,
        y: baseY,
        width: 300,
        height: 200,
        data: { sceneIndex: i, scene },
        connections: [],
        zIndex: nextZ++,
        collapsed: false,
      });
      connections.push({ id: `conn-sb-vid-${i}`, from: sbId, to: vidId });

      // Audio node
      const audId = `node-aud-${i}`;
      nodes.push({
        id: audId,
        type: 'audio',
        x: baseX + 1060,
        y: baseY,
        width: 260,
        height: 180,
        data: { sceneIndex: i, scene },
        connections: [],
        zIndex: nextZ++,
        collapsed: false,
      });
      connections.push({ id: `conn-vid-aud-${i}`, from: vidId, to: audId });

      // Connect audio to export
      connections.push({ id: `conn-aud-export-${i}`, from: audId, to: exportId });
    });

    // Export node at the end
    nodes.push({
      id: exportId,
      type: 'export',
      x: 1480,
      y: 100,
      width: 260,
      height: 160,
      data: { label: 'Final Export' },
      connections: [],
      zIndex: nextZ++,
      collapsed: false,
    });

    set({ nodes, connections, panX: 0, panY: 0, zoom: 0.85 });
  },
}));
