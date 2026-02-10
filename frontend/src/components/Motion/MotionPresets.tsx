/**
 * MotionPresets — preset animation library panel.
 * Shows categorized presets that can be applied to selected layers.
 */

import React, { useState } from 'react';
import { Zap, LogIn, LogOut, Sparkles } from 'lucide-react';
import { useMotionStore } from '../../store/useMotionStore';
import { ANIMATION_PRESETS, getPresetsByCategory } from './engine/presets';
import type { AnimationPreset } from '../../types/motion';

type Category = 'enter' | 'exit' | 'emphasis';

const CATEGORIES: { id: Category; label: string; icon: React.ElementType }[] = [
  { id: 'enter', label: 'Enter', icon: LogIn },
  { id: 'exit', label: 'Exit', icon: LogOut },
  { id: 'emphasis', label: 'Emphasis', icon: Sparkles },
];

export function MotionPresets() {
  const [activeCategory, setActiveCategory] = useState<Category>('enter');
  const { selection, playback, applyPreset } = useMotionStore();
  const selectedLayerId = selection.layerIds[0] ?? null;

  const presets = getPresetsByCategory(activeCategory);

  const handleApply = (preset: AnimationPreset) => {
    if (!selectedLayerId) return;
    applyPreset(selectedLayerId, preset, playback.currentTime);
  };

  return (
    <div className="border-t border-studio-border bg-studio-surface">
      <div className="flex items-center gap-1 px-3 py-1.5 border-b border-studio-border">
        <Zap size={12} className="text-yellow-400" />
        <span className="text-[10px] font-semibold text-studio-text-dim uppercase tracking-wider">Presets</span>
      </div>

      {/* Category tabs */}
      <div className="flex border-b border-studio-border">
        {CATEGORIES.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] transition-colors ${
              activeCategory === id
                ? 'text-studio-accent border-b-2 border-studio-accent'
                : 'text-studio-text-dim hover:text-white'
            }`}
            onClick={() => setActiveCategory(id)}
          >
            <Icon size={10} />
            {label}
          </button>
        ))}
      </div>

      {/* Preset list */}
      <div className="max-h-32 overflow-y-auto p-1.5 space-y-0.5">
        {presets.map(preset => (
          <button
            key={preset.id}
            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
              selectedLayerId
                ? 'text-studio-text-muted hover:bg-studio-accent/10 hover:text-white cursor-pointer'
                : 'text-studio-text-dim opacity-40 cursor-not-allowed'
            }`}
            onClick={() => handleApply(preset)}
            disabled={!selectedLayerId}
            title={preset.description}
          >
            <div className="font-medium">{preset.name}</div>
            <div className="text-[10px] text-studio-text-dim">{preset.description} &middot; {preset.duration}s</div>
          </button>
        ))}
      </div>

      {!selectedLayerId && (
        <div className="px-3 py-2 text-[10px] text-studio-text-dim text-center">
          Select a layer to apply presets
        </div>
      )}
    </div>
  );
}
