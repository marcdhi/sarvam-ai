/**
 * MotionPropertiesPanel — edit properties of the selected layer.
 * Shows transform, appearance, effects, and text/shape-specific props.
 * Each property has a keyframe toggle button.
 */

import React from 'react';
import { Diamond, Palette, Move, Sparkles, Type } from 'lucide-react';
import { useMotionStore } from '../../store/useMotionStore';
import type { MotionLayer, AnimatableProperty } from '../../types/motion';

export function MotionPropertiesPanel() {
  const layer = useMotionStore(s => s.selectedLayer());
  const { updateLayer, addKeyframe, playback } = useMotionStore();

  if (!layer) {
    return (
      <div className="w-64 bg-studio-surface border-l border-studio-border p-4">
        <p className="text-xs text-studio-text-dim text-center mt-8">
          Select a layer to edit its properties
        </p>
      </div>
    );
  }

  return (
    <div className="w-64 bg-studio-surface border-l border-studio-border overflow-y-auto">
      {/* Layer name */}
      <div className="px-3 py-2 border-b border-studio-border">
        <input
          type="text"
          className="w-full bg-transparent text-sm font-medium text-studio-text outline-none"
          value={layer.name}
          onChange={(e) => updateLayer(layer.id, { name: e.target.value })}
        />
        <span className="text-[10px] text-studio-text-dim uppercase">{layer.type}</span>
      </div>

      {/* Timing */}
      <PropSection title="Timing" icon={<Sparkles size={12} />}>
        <PropRow label="In" value={layer.inPoint} onChange={(v) =>
          updateLayer(layer.id, { inPoint: v as number })
        } type="number" step={0.1} />
        <PropRow label="Out" value={layer.outPoint} onChange={(v) =>
          updateLayer(layer.id, { outPoint: v as number })
        } type="number" step={0.1} />
      </PropSection>

      {/* Transform */}
      <PropSection title="Transform" icon={<Move size={12} />}>
        <TransformProp layer={layer} prop="x" label="X" step={1} />
        <TransformProp layer={layer} prop="y" label="Y" step={1} />
        <TransformProp layer={layer} prop="width" label="W" step={1} />
        <TransformProp layer={layer} prop="height" label="H" step={1} />
        <TransformProp layer={layer} prop="rotation" label="Rot" step={1} suffix="°" />
        <TransformProp layer={layer} prop="opacity" label="Opacity" step={0.05} min={0} max={1} />
        <TransformProp layer={layer} prop="scaleX" label="Scale X" step={0.05} />
        <TransformProp layer={layer} prop="scaleY" label="Scale Y" step={0.05} />
      </PropSection>

      {/* Appearance */}
      <PropSection title="Appearance" icon={<Palette size={12} />}>
        <PropRow label="Fill" value={layer.appearance.fill} onChange={(v) =>
          updateLayer(layer.id, { appearance: { ...layer.appearance, fill: v as string } })
        } type="color" />
        <PropRow label="Stroke" value={layer.appearance.stroke} onChange={(v) =>
          updateLayer(layer.id, { appearance: { ...layer.appearance, stroke: v as string } })
        } type="color" />
        <PropRow label="Stroke W" value={layer.appearance.strokeWidth} onChange={(v) =>
          updateLayer(layer.id, { appearance: { ...layer.appearance, strokeWidth: v as number } })
        } type="number" step={1} min={0} />
        <PropRow label="Radius" value={layer.appearance.borderRadius} onChange={(v) =>
          updateLayer(layer.id, { appearance: { ...layer.appearance, borderRadius: v as number } })
        } type="number" step={1} min={0} />
      </PropSection>

      {/* Effects */}
      <PropSection title="Effects" icon={<Sparkles size={12} />}>
        <PropRow label="Blur" value={layer.effects.blur} onChange={(v) =>
          updateLayer(layer.id, { effects: { ...layer.effects, blur: v as number } })
        } type="number" step={0.5} min={0} />
        <PropRow label="Shadow X" value={layer.effects.shadowX} onChange={(v) =>
          updateLayer(layer.id, { effects: { ...layer.effects, shadowX: v as number } })
        } type="number" step={1} />
        <PropRow label="Shadow Y" value={layer.effects.shadowY} onChange={(v) =>
          updateLayer(layer.id, { effects: { ...layer.effects, shadowY: v as number } })
        } type="number" step={1} />
        <PropRow label="Sh. Blur" value={layer.effects.shadowBlur} onChange={(v) =>
          updateLayer(layer.id, { effects: { ...layer.effects, shadowBlur: v as number } })
        } type="number" step={1} min={0} />
        <PropRow label="Sh. Opacity" value={layer.effects.shadowOpacity} onChange={(v) =>
          updateLayer(layer.id, { effects: { ...layer.effects, shadowOpacity: v as number } })
        } type="number" step={0.05} min={0} max={1} />
      </PropSection>

      {/* Text Props */}
      {layer.type === 'text' && layer.textProps && (
        <PropSection title="Text" icon={<Type size={12} />}>
          <div className="col-span-2 mb-1">
            <textarea
              className="w-full bg-studio-card text-sm text-studio-text p-1.5 rounded border border-studio-border resize-none"
              rows={2}
              value={layer.textProps.text}
              onChange={(e) => updateLayer(layer.id, {
                textProps: { ...layer.textProps!, text: e.target.value },
              })}
            />
          </div>
          <PropRow label="Size" value={layer.textProps.fontSize} onChange={(v) =>
            updateLayer(layer.id, { textProps: { ...layer.textProps!, fontSize: v as number } })
          } type="number" step={1} min={1} />
          <PropRow label="Weight" value={layer.textProps.fontWeight} onChange={(v) =>
            updateLayer(layer.id, { textProps: { ...layer.textProps!, fontWeight: v as number } })
          } type="number" step={100} min={100} max={900} />
          <PropRow label="Spacing" value={layer.textProps.letterSpacing} onChange={(v) =>
            updateLayer(layer.id, { textProps: { ...layer.textProps!, letterSpacing: v as number } })
          } type="number" step={0.5} />
          <PropRow label="Color" value={layer.textProps.color} onChange={(v) =>
            updateLayer(layer.id, { textProps: { ...layer.textProps!, color: v as string } })
          } type="color" />
          <div className="col-span-2">
            <label className="text-[10px] text-studio-text-dim">Font Family</label>
            <select
              className="w-full bg-studio-card text-xs text-studio-text p-1 rounded border border-studio-border"
              value={layer.textProps.fontFamily}
              onChange={(e) => updateLayer(layer.id, {
                textProps: { ...layer.textProps!, fontFamily: e.target.value },
              })}
            >
              <option value="Inter">Inter</option>
              <option value="Roboto">Roboto</option>
              <option value="Montserrat">Montserrat</option>
              <option value="Playfair Display">Playfair Display</option>
              <option value="Space Grotesk">Space Grotesk</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
            </select>
          </div>
        </PropSection>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────

function PropSection({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border-b border-studio-border">
      <div className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-semibold text-studio-text-dim uppercase tracking-wider">
        {icon} {title}
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1 px-3 pb-2">
        {children}
      </div>
    </div>
  );
}

interface PropRowProps {
  label: string;
  value: number | string;
  onChange: (v: number | string) => void;
  type?: 'number' | 'color' | 'text';
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}

function PropRow({ label, value, onChange, type = 'number', step = 1, min, max, suffix }: PropRowProps) {
  return (
    <div className="flex items-center gap-1">
      <label className="text-[10px] text-studio-text-dim w-12 shrink-0">{label}</label>
      {type === 'color' ? (
        <div className="flex items-center gap-1 flex-1">
          <input
            type="color"
            className="w-5 h-5 rounded cursor-pointer border-0 p-0"
            value={typeof value === 'string' && value.startsWith('#') ? value : '#ffffff'}
            onChange={(e) => onChange(e.target.value)}
          />
          <input
            type="text"
            className="flex-1 bg-studio-card text-[10px] text-studio-text p-0.5 rounded border border-studio-border w-0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      ) : (
        <input
          type="number"
          className="flex-1 bg-studio-card text-[10px] text-studio-text p-0.5 rounded border border-studio-border w-0"
          value={typeof value === 'number' ? value : parseFloat(String(value)) || 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          step={step}
          min={min}
          max={max}
        />
      )}
    </div>
  );
}

function TransformProp({ layer, prop, label, step = 1, min, max, suffix }: {
  layer: MotionLayer;
  prop: keyof MotionLayer['transform'];
  label: string;
  step?: number;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const { updateLayer, addKeyframe, playback } = useMotionStore();
  const value = layer.transform[prop];
  const hasKeyframes = (layer.keyframes[prop]?.length ?? 0) > 0;

  return (
    <div className="flex items-center gap-0.5">
      <button
        className={`p-0.5 ${hasKeyframes ? 'text-yellow-400' : 'text-studio-text-dim hover:text-yellow-400'}`}
        title={hasKeyframes ? 'Has keyframes' : 'Add keyframe'}
        onClick={() => addKeyframe(layer.id, prop, playback.currentTime, value)}
      >
        <Diamond size={8} fill={hasKeyframes ? 'currentColor' : 'none'} />
      </button>
      <label className="text-[10px] text-studio-text-dim w-9 shrink-0">{label}</label>
      <input
        type="number"
        className="flex-1 bg-studio-card text-[10px] text-studio-text p-0.5 rounded border border-studio-border w-0"
        value={typeof value === 'number' ? value : 0}
        onChange={(e) => {
          const v = parseFloat(e.target.value) || 0;
          updateLayer(layer.id, {
            transform: { ...layer.transform, [prop]: v },
          });
        }}
        step={step}
        min={min}
        max={max}
      />
    </div>
  );
}
