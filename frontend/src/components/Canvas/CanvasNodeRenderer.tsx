import React, { useRef, useCallback } from 'react';
import { X, GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';
import { useCanvasStore, type CanvasNode } from '../../store/useCanvasStore';
import { ScriptNode } from './nodes/ScriptNode';
import { SceneNode } from './nodes/SceneNode';
import { StoryboardNode } from './nodes/StoryboardNode';
import { VideoNode } from './nodes/VideoNode';
import { AudioNode } from './nodes/AudioNode';
import { NoteNode } from './nodes/NoteNode';
import { ImageNode } from './nodes/ImageNode';
import { ExportNode } from './nodes/ExportNode';

const nodeColors: Record<string, { border: string; header: string; glow: string }> = {
  script: { border: 'border-blue-500/50', header: 'bg-blue-500/20', glow: 'shadow-blue-500/10' },
  scene: { border: 'border-indigo-500/50', header: 'bg-indigo-500/20', glow: 'shadow-indigo-500/10' },
  storyboard: { border: 'border-purple-500/50', header: 'bg-purple-500/20', glow: 'shadow-purple-500/10' },
  video: { border: 'border-pink-500/50', header: 'bg-pink-500/20', glow: 'shadow-pink-500/10' },
  audio: { border: 'border-green-500/50', header: 'bg-green-500/20', glow: 'shadow-green-500/10' },
  music: { border: 'border-violet-500/50', header: 'bg-violet-500/20', glow: 'shadow-violet-500/10' },
  sfx: { border: 'border-amber-500/50', header: 'bg-amber-500/20', glow: 'shadow-amber-500/10' },
  note: { border: 'border-yellow-500/50', header: 'bg-yellow-500/20', glow: 'shadow-yellow-500/10' },
  image: { border: 'border-fuchsia-500/50', header: 'bg-fuchsia-500/20', glow: 'shadow-fuchsia-500/10' },
  export: { border: 'border-emerald-500/50', header: 'bg-emerald-500/20', glow: 'shadow-emerald-500/10' },
};

const nodeLabels: Record<string, string> = {
  script: 'Screenplay',
  scene: 'Scene',
  storyboard: 'Storyboard',
  video: 'Video',
  audio: 'Audio',
  music: 'Music',
  sfx: 'SFX',
  note: 'Note',
  image: 'Image',
  export: 'Export',
};

interface Props {
  node: CanvasNode;
}

export function CanvasNodeRenderer({ node }: Props) {
  const {
    selectedNodeId,
    setSelectedNode,
    moveNode,
    removeNode,
    updateNode,
    setDragging,
    zoom,
  } = useCanvasStore();

  const dragRef = useRef({ startX: 0, startY: 0, nodeX: 0, nodeY: 0 });
  const isSelected = selectedNodeId === node.id;
  const colors = nodeColors[node.type] || nodeColors.note;

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setSelectedNode(node.id);
      setDragging(true);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        nodeX: node.x,
        nodeY: node.y,
      };

      const handleMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - dragRef.current.startX) / zoom;
        const dy = (ev.clientY - dragRef.current.startY) / zoom;
        moveNode(node.id, dragRef.current.nodeX + dx, dragRef.current.nodeY + dy);
      };

      const handleUp = () => {
        setDragging(false);
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('mouseup', handleUp);
      };

      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
    },
    [node.id, node.x, node.y, zoom, moveNode, setSelectedNode, setDragging]
  );

  const renderContent = () => {
    switch (node.type) {
      case 'script':
        return <ScriptNode node={node} />;
      case 'scene':
        return <SceneNode node={node} />;
      case 'storyboard':
        return <StoryboardNode node={node} />;
      case 'video':
        return <VideoNode node={node} />;
      case 'audio':
        return <AudioNode node={node} />;
      case 'note':
        return <NoteNode node={node} />;
      case 'image':
        return <ImageNode node={node} />;
      case 'export':
        return <ExportNode node={node} />;
      default:
        return <div className="p-2 text-sm text-studio-text-muted">Unknown node type</div>;
    }
  };

  return (
    <div
      className={`absolute rounded-xl border bg-studio-card/95 backdrop-blur-sm shadow-lg transition-shadow ${
        colors.border
      } ${isSelected ? `ring-2 ring-studio-accent shadow-xl ${colors.glow}` : ''}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        zIndex: node.zIndex,
        minHeight: node.collapsed ? 'auto' : undefined,
      }}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedNode(node.id);
      }}
    >
      {/* Header / Drag handle */}
      <div
        className={`flex items-center justify-between px-3 py-2 rounded-t-xl cursor-grab active:cursor-grabbing ${colors.header}`}
        onMouseDown={handleDragStart}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-studio-text-dim" />
          <span className="text-xs font-semibold uppercase tracking-wide text-studio-text-muted">
            {nodeLabels[node.type]}
          </span>
          {node.data.sceneIndex !== undefined && (
            <span className="text-xs font-mono text-studio-text-dim">
              #{node.data.sceneIndex + 1}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              updateNode(node.id, { collapsed: !node.collapsed });
            }}
            className="p-0.5 rounded hover:bg-white/10 transition-colors"
          >
            {node.collapsed ? (
              <Maximize2 size={12} className="text-studio-text-dim" />
            ) : (
              <Minimize2 size={12} className="text-studio-text-dim" />
            )}
          </button>
          {(node.type === 'note' || node.type === 'image') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeNode(node.id);
              }}
              className="p-0.5 rounded hover:bg-red-500/30 transition-colors"
            >
              <X size={12} className="text-studio-text-dim" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {!node.collapsed && (
        <div className="p-3 text-sm">{renderContent()}</div>
      )}
    </div>
  );
}
