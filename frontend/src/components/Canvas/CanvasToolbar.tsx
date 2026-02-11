import React from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  StickyNote,
  Image,
  Sparkles,
  Trash2,
  Layout,
} from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '../../store/useCanvasStore';
import { useStore } from '../../store/useStore';

export function CanvasToolbar() {
  const { zoom, setZoom, setPan, addNode, nodes, clearCanvas } =
    useCanvasStore();
  const { currentProject, addNotification } = useStore();

  const handleAddNote = () => {
    const id = `note-${Date.now()}`;
    const node: CanvasNode = {
      id,
      type: 'note',
      x: 200 + Math.random() * 300,
      y: 200 + Math.random() * 300,
      width: 240,
      height: 160,
      data: { text: '', color: 'yellow' },
      connections: [],
      zIndex: 0,
      collapsed: false,
    };
    addNode(node);
  };

  const handleAddImage = () => {
    const id = `img-${Date.now()}`;
    const node: CanvasNode = {
      id,
      type: 'image',
      x: 200 + Math.random() * 300,
      y: 200 + Math.random() * 300,
      width: 300,
      height: 220,
      data: { prompt: '', imagePath: '' },
      connections: [],
      zIndex: 0,
      collapsed: false,
    };
    addNode(node);
  };

  const handleAutoLayout = () => {
    if (!currentProject?.screenplay?.scenes.length) {
      addNotification('warning', 'Generate a screenplay first to auto-layout the pipeline');
      return;
    }
    useCanvasStore.getState().autoLayoutPipeline(currentProject.screenplay.scenes);
    addNotification('info', 'Canvas auto-laid out from screenplay');
  };

  const handleReset = () => {
    setZoom(1);
    setPan(0, 0);
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-studio-card/90 backdrop-blur-md border border-studio-border rounded-xl px-2 py-1.5 shadow-lg">
      {/* Zoom controls */}
      <button
        onClick={() => setZoom(zoom - 0.15)}
        className="p-1.5 rounded-lg hover:bg-studio-surface text-studio-text-muted hover:text-studio-text transition-colors"
        title="Zoom Out"
      >
        <ZoomOut size={16} />
      </button>
      <span className="text-xs font-mono text-studio-text-dim w-10 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button
        onClick={() => setZoom(zoom + 0.15)}
        className="p-1.5 rounded-lg hover:bg-studio-surface text-studio-text-muted hover:text-studio-text transition-colors"
        title="Zoom In"
      >
        <ZoomIn size={16} />
      </button>
      <button
        onClick={handleReset}
        className="p-1.5 rounded-lg hover:bg-studio-surface text-studio-text-muted hover:text-studio-text transition-colors"
        title="Reset View"
      >
        <Maximize2 size={16} />
      </button>

      <div className="w-px h-6 bg-studio-border mx-1" />

      {/* Add nodes */}
      <button
        onClick={handleAddNote}
        className="p-1.5 rounded-lg hover:bg-yellow-500/20 text-yellow-400 transition-colors"
        title="Add Sticky Note"
      >
        <StickyNote size={16} />
      </button>
      <button
        onClick={handleAddImage}
        className="p-1.5 rounded-lg hover:bg-purple-500/20 text-purple-400 transition-colors"
        title="Add Image (Nano Banana)"
      >
        <Image size={16} />
      </button>

      <div className="w-px h-6 bg-studio-border mx-1" />

      {/* Pipeline */}
      <button
        onClick={handleAutoLayout}
        className="p-1.5 rounded-lg hover:bg-studio-accent/20 text-studio-accent transition-colors flex items-center gap-1"
        title="Auto-layout pipeline from screenplay"
      >
        <Layout size={16} />
        <span className="text-xs">Pipeline</span>
      </button>

      <div className="w-px h-6 bg-studio-border mx-1" />

      <button
        onClick={() => {
          if (confirm('Clear the entire canvas?')) clearCanvas();
        }}
        className="p-1.5 rounded-lg hover:bg-studio-danger/20 text-studio-text-dim hover:text-studio-danger transition-colors"
        title="Clear Canvas"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}
