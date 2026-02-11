/**
 * MotionLayersPanel — layer list with visibility, lock, reorder, and actions.
 */

import React from 'react';
import {
  Eye, EyeOff, Lock, Unlock, Copy, Trash2,
  Type, Square, ImageIcon, Film, Layers, Code,
  GripVertical,
} from 'lucide-react';
import { useMotionStore } from '../../store/useMotionStore';
import type { MotionLayer } from '../../types/motion';

const LAYER_ICONS: Record<string, React.ElementType> = {
  text: Type,
  shape: Square,
  image: ImageIcon,
  video: Film,
  group: Layers,
  svg: Code,
};

export function MotionLayersPanel() {
  const {
    selection, selectLayer, deselectAll,
    removeLayer, duplicateLayer, updateLayer,
  } = useMotionStore();
  const scene = useMotionStore(s => s.activeScene());

  if (!scene) return null;

  // Display layers in reverse order (top layer first in the list, like Figma)
  const displayLayers = [...scene.layers].reverse();

  return (
    <div className="w-52 bg-studio-surface border-r border-studio-border flex flex-col">
      <div className="px-3 py-2 border-b border-studio-border">
        <h3 className="text-xs font-semibold text-studio-text-muted uppercase tracking-wider">Layers</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {displayLayers.map(layer => {
          const isSelected = selection.layerIds.includes(layer.id);
          const Icon = LAYER_ICONS[layer.type] || Square;

          return (
            <div
              key={layer.id}
              className={`group flex items-center gap-1.5 px-2 py-1.5 border-b border-studio-border/30 cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-studio-accent/15 text-studio-accent'
                  : 'text-studio-text-muted hover:bg-studio-card'
              }`}
              onClick={() => selectLayer(layer.id)}
            >
              <GripVertical size={10} className="text-studio-text-dim shrink-0 opacity-0 group-hover:opacity-50 cursor-grab" />
              <Icon size={12} className="shrink-0" />
              <span className="text-xs truncate flex-1">{layer.name}</span>

              {/* Quick actions (show on hover) */}
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { visible: !layer.visible }); }}
                  className="p-0.5 hover:text-white"
                  title={layer.visible ? 'Hide' : 'Show'}
                >
                  {layer.visible ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); updateLayer(layer.id, { locked: !layer.locked }); }}
                  className="p-0.5 hover:text-white"
                  title={layer.locked ? 'Unlock' : 'Lock'}
                >
                  {layer.locked ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); duplicateLayer(layer.id); }}
                  className="p-0.5 hover:text-white"
                  title="Duplicate"
                >
                  <Copy size={10} />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeLayer(layer.id); }}
                  className="p-0.5 hover:text-red-400"
                  title="Delete"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </div>
          );
        })}

        {scene.layers.length === 0 && (
          <div className="px-3 py-6 text-xs text-studio-text-dim text-center">
            No layers yet. Use the toolbar or AI prompt to add elements.
          </div>
        )}
      </div>
    </div>
  );
}
