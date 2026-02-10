/**
 * Keyframe interpolation engine.
 * Given a set of keyframes and a current time, computes the interpolated value.
 */

import type { Keyframe, MotionLayer, LayerTransform, LayerAppearance, LayerEffects } from '../../../types/motion';
import { resolveEasing } from './easing';

// ─── Color Utilities ──────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const num = parseInt(h.length === 3
    ? h.split('').map(c => c + c).join('')
    : h, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v =>
    Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')
  ).join('');
}

function interpolateColor(from: string, to: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return rgbToHex(
    r1 + (r2 - r1) * t,
    g1 + (g2 - g1) * t,
    b1 + (b2 - b1) * t,
  );
}

// ─── Single Property Interpolation ────────────────────────────────────────────

export function interpolateProperty(
  keyframes: Keyframe[],
  time: number,
): number | string {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return keyframes[0].value;

  // Before first keyframe
  if (time <= keyframes[0].time) return keyframes[0].value;

  // After last keyframe
  if (time >= keyframes[keyframes.length - 1].time) {
    return keyframes[keyframes.length - 1].value;
  }

  // Find surrounding keyframes
  let fromIdx = 0;
  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      fromIdx = i;
      break;
    }
  }

  const from = keyframes[fromIdx];
  const to = keyframes[fromIdx + 1];
  const span = to.time - from.time;
  if (span === 0) return to.value;

  const rawT = (time - from.time) / span;
  const easingFn = resolveEasing(to.easing);
  const t = easingFn(rawT);

  // String values (colors)
  if (typeof from.value === 'string' && typeof to.value === 'string') {
    if (from.value.startsWith('#') && to.value.startsWith('#')) {
      return interpolateColor(from.value, to.value, t);
    }
    // For non-interpolable strings, snap at midpoint
    return t < 0.5 ? from.value : to.value;
  }

  // Numeric interpolation
  const fromVal = typeof from.value === 'number' ? from.value : parseFloat(from.value) || 0;
  const toVal = typeof to.value === 'number' ? to.value : parseFloat(to.value) || 0;
  return fromVal + (toVal - fromVal) * t;
}

// ─── Compute Full Layer State at Time ─────────────────────────────────────────

const TRANSFORM_PROPS = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'scaleX', 'scaleY', 'anchorX', 'anchorY'] as const;
const APPEARANCE_PROPS = ['fill', 'stroke', 'strokeWidth', 'borderRadius'] as const;
const EFFECT_PROPS = ['blur', 'shadowX', 'shadowY', 'shadowBlur', 'shadowOpacity'] as const;

export interface ComputedLayerState {
  transform: LayerTransform;
  appearance: LayerAppearance;
  effects: LayerEffects;
  textProps?: { fontSize?: number; letterSpacing?: number; lineHeight?: number; color?: string };
  pathProps?: { trimStart?: number; trimEnd?: number };
  visible: boolean;
}

export function computeLayerState(layer: MotionLayer, time: number): ComputedLayerState {
  const visible = time >= layer.inPoint && time <= layer.outPoint;

  // Start from base values
  const transform = { ...layer.transform };
  const appearance = { ...layer.appearance };
  const effects = { ...layer.effects };

  if (!visible) {
    return { transform: { ...transform, opacity: 0 }, appearance, effects, visible: false };
  }

  // Apply keyframe interpolation for each animated property
  for (const prop of TRANSFORM_PROPS) {
    const kfs = layer.keyframes[prop];
    if (kfs && kfs.length > 0) {
      (transform as Record<string, number | string>)[prop] = interpolateProperty(kfs, time);
    }
  }

  for (const prop of APPEARANCE_PROPS) {
    const kfs = layer.keyframes[prop];
    if (kfs && kfs.length > 0) {
      (appearance as Record<string, number | string>)[prop] = interpolateProperty(kfs, time);
    }
  }

  for (const prop of EFFECT_PROPS) {
    const kfs = layer.keyframes[prop];
    if (kfs && kfs.length > 0) {
      (effects as Record<string, number | string>)[prop] = interpolateProperty(kfs, time);
    }
  }

  // Text properties
  let textProps: ComputedLayerState['textProps'];
  if (layer.textProps) {
    textProps = {};
    for (const prop of ['fontSize', 'letterSpacing', 'lineHeight'] as const) {
      const kfs = layer.keyframes[prop];
      if (kfs && kfs.length > 0) {
        textProps[prop] = interpolateProperty(kfs, time) as number;
      }
    }
    const colorKfs = layer.keyframes['fill'];
    if (colorKfs && colorKfs.length > 0) {
      textProps.color = interpolateProperty(colorKfs, time) as string;
    }
  }

  // Path properties
  let pathProps: ComputedLayerState['pathProps'];
  if (layer.pathProps) {
    pathProps = {};
    for (const prop of ['trimStart', 'trimEnd'] as const) {
      const kfs = layer.keyframes[prop];
      if (kfs && kfs.length > 0) {
        pathProps[prop] = interpolateProperty(kfs, time) as number;
      }
    }
  }

  return { transform, appearance, effects, textProps, pathProps, visible };
}
