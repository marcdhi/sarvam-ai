/**
 * MotionCanvas — renders animated layers on a visual canvas.
 * Uses DOM elements with CSS transforms for real-time preview.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useMotionStore } from '../../store/useMotionStore';
import { computeLayerState } from './engine/interpolate';
import type { MotionLayer, MotionScene } from '../../types/motion';

interface CanvasViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export function MotionCanvas() {
  const { project, playback, selection, selectLayer, deselectAll } = useMotionStore();
  const scene = useMotionStore(s => s.activeScene());
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<CanvasViewport>({ zoom: 0.5, panX: 0, panY: 0 });

  const canvasW = project?.canvasWidth ?? 1920;
  const canvasH = project?.canvasHeight ?? 1080;

  // Fit canvas to container on mount
  useEffect(() => {
    if (!containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const scaleX = (clientWidth - 80) / canvasW;
    const scaleY = (clientHeight - 80) / canvasH;
    const zoom = Math.min(scaleX, scaleY, 1);
    setViewport({ zoom, panX: 0, panY: 0 });
  }, [canvasW, canvasH]);

  // Zoom with scroll
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      setViewport(v => ({
        ...v,
        zoom: Math.max(0.1, Math.min(2, v.zoom - e.deltaY * 0.001)),
      }));
    }
  }, []);

  if (!scene || !project) {
    return (
      <div className="flex-1 flex items-center justify-center bg-studio-bg text-studio-text-dim">
        Generate a motion to preview
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 relative overflow-hidden bg-neutral-900"
      onWheel={handleWheel}
      onClick={(e) => { if (e.target === e.currentTarget) deselectAll(); }}
    >
      {/* Checkerboard / background */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          width: canvasW,
          height: canvasH,
          transform: `translate(-50%, -50%) translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          transformOrigin: 'center center',
          backgroundColor: scene.bgColor,
          boxShadow: '0 0 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Render layers bottom to top */}
        {scene.layers.filter(l => l.visible).map((layer, idx) => (
          <LayerRenderer
            key={layer.id}
            layer={layer}
            time={playback.currentTime}
            isSelected={selection.layerIds.includes(layer.id)}
            zIndex={idx}
            onSelect={() => selectLayer(layer.id)}
          />
        ))}
      </div>

      {/* Canvas size indicator */}
      <div className="absolute bottom-3 right-3 text-xs text-studio-text-dim bg-black/50 px-2 py-1 rounded">
        {canvasW} x {canvasH} &middot; {Math.round(viewport.zoom * 100)}%
      </div>
    </div>
  );
}

// ─── Layer Renderer ────────────────────────────────────────────────────────

interface LayerRendererProps {
  layer: MotionLayer;
  time: number;
  isSelected: boolean;
  zIndex: number;
  onSelect: () => void;
}

function LayerRenderer({ layer, time, isSelected, zIndex, onSelect }: LayerRendererProps) {
  const computed = computeLayerState(layer, time);
  if (!computed.visible && !isSelected) return null;

  const { transform, appearance, effects } = computed;
  const cx = transform.anchorX * transform.width;
  const cy = transform.anchorY * transform.height;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: transform.x,
    top: transform.y,
    width: transform.width,
    height: transform.height,
    opacity: transform.opacity,
    transform: `translate(-${cx}px, -${cy}px) rotate(${transform.rotation}deg) scale(${transform.scaleX}, ${transform.scaleY})`,
    transformOrigin: `${cx}px ${cy}px`,
    zIndex,
    borderRadius: appearance.borderRadius,
    backgroundColor: layer.type !== 'text' ? appearance.fill : undefined,
    border: appearance.strokeWidth > 0 ? `${appearance.strokeWidth}px solid ${appearance.stroke}` : undefined,
    filter: effects.blur > 0 ? `blur(${effects.blur}px)` : undefined,
    boxShadow: effects.shadowOpacity > 0
      ? `${effects.shadowX}px ${effects.shadowY}px ${effects.shadowBlur}px rgba(0,0,0,${effects.shadowOpacity})`
      : undefined,
    cursor: layer.locked ? 'default' : 'move',
    outline: isSelected ? '2px solid #6366f1' : undefined,
    outlineOffset: isSelected ? '1px' : undefined,
    pointerEvents: layer.locked ? 'none' : 'auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  return (
    <div style={style} onClick={(e) => { e.stopPropagation(); onSelect(); }}>
      {layer.type === 'text' && layer.textProps && (
        <TextLayerContent layer={layer} computed={computed} />
      )}
      {layer.type === 'shape' && layer.shapeProps?.shapeType === 'ellipse' && (
        <div className="w-full h-full rounded-full" style={{ backgroundColor: appearance.fill }} />
      )}
      {layer.type === 'image' && layer.imageSrc && (
        <img src={layer.imageSrc} alt={layer.name} className="w-full h-full object-cover" />
      )}
    </div>
  );
}

// ─── Text Content ──────────────────────────────────────────────────────────

function TextLayerContent({ layer, computed }: { layer: MotionLayer; computed: ReturnType<typeof computeLayerState> }) {
  const tp = layer.textProps!;
  const fontSize = computed.textProps?.fontSize ?? tp.fontSize;
  const letterSpacing = computed.textProps?.letterSpacing ?? tp.letterSpacing;
  const lineHeight = computed.textProps?.lineHeight ?? tp.lineHeight;
  const color = computed.textProps?.color ?? tp.color;

  return (
    <div
      style={{
        fontSize,
        fontFamily: tp.fontFamily,
        fontWeight: tp.fontWeight,
        letterSpacing,
        lineHeight,
        textAlign: tp.textAlign as React.CSSProperties['textAlign'],
        color,
        width: '100%',
        padding: '4px 8px',
        wordWrap: 'break-word',
        whiteSpace: 'pre-wrap',
      }}
    >
      {tp.text}
    </div>
  );
}
