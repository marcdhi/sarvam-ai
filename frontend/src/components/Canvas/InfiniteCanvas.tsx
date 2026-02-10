import React, { useRef, useCallback, useEffect } from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';
import { CanvasNodeRenderer } from './CanvasNodeRenderer';
import { ConnectionLines } from './ConnectionLines';
import { CanvasToolbar } from './CanvasToolbar';

export function InfiniteCanvas() {
  const {
    panX,
    panY,
    zoom,
    setPan,
    setZoom,
    nodes,
    isPanning,
    setPanning,
    selectedNodeId,
    setSelectedNode,
  } = useCanvasStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        setZoom(zoom + delta);
      } else {
        setPan(panX - e.deltaX, panY - e.deltaY);
      }
    },
    [zoom, panX, panY, setPan, setZoom]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Middle mouse button or Space+click for panning
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        e.preventDefault();
        setPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX,
          panY,
        };
      } else if (e.button === 0 && e.target === e.currentTarget) {
        // Click on empty canvas area - deselect
        setSelectedNode(null);
      }
    },
    [panX, panY, setPanning, setSelectedNode]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan(panStartRef.current.panX + dx, panStartRef.current.panY + dy);
      }
    },
    [isPanning, setPan]
  );

  const handleMouseUp = useCallback(() => {
    setPanning(false);
  }, [setPanning]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '=' || e.key === '+') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setZoom(zoom + 0.1);
        }
      } else if (e.key === '-') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setZoom(zoom - 0.1);
        }
      } else if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoom(1);
        setPan(0, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom, setZoom, setPan]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-studio-bg">
      {/* Canvas Toolbar */}
      <CanvasToolbar />

      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)
          `,
          backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
          backgroundPosition: `${panX % (24 * zoom)}px ${panY % (24 * zoom)}px`,
        }}
      />

      {/* Canvas viewport */}
      <div
        ref={containerRef}
        className="absolute inset-0"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'default' }}
      >
        {/* Transform layer */}
        <div
          style={{
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        >
          {/* Connection lines (SVG) */}
          <ConnectionLines />

          {/* Nodes */}
          {nodes.map((node) => (
            <CanvasNodeRenderer key={node.id} node={node} />
          ))}
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 bg-studio-card/80 backdrop-blur-sm rounded-lg px-3 py-1.5 text-xs font-mono text-studio-text-muted border border-studio-border">
        {Math.round(zoom * 100)}%
      </div>

      {/* Mini-map hint */}
      <div className="absolute bottom-4 left-4 text-xs text-studio-text-dim space-y-0.5">
        <div>Scroll to pan / Ctrl+Scroll to zoom</div>
        <div>Alt+Click to pan / Ctrl+0 to reset</div>
      </div>
    </div>
  );
}
