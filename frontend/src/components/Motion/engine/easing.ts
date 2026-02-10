/**
 * Easing functions for keyframe interpolation.
 * Each function maps t ∈ [0, 1] → [0, 1].
 */

import type { EasingType, CubicBezier } from '../../../types/motion';

// ─── Named Easing Curves ─────────────────────────────────────────────────────

export function linear(t: number): number {
  return t;
}

export function easeIn(t: number): number {
  return t * t * t;
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function spring(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export function bounce(t: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
}

// ─── Cubic Bezier ─────────────────────────────────────────────────────────────

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  // Newton-Raphson approximation for cubic bezier
  const EPSILON = 1e-6;
  const MAX_ITER = 8;

  return function (t: number): number {
    if (t <= 0) return 0;
    if (t >= 1) return 1;

    // Find x for parameter t using Newton's method
    let guess = t;
    for (let i = 0; i < MAX_ITER; i++) {
      const xGuess = sampleCurve(guess, x1, x2) - t;
      if (Math.abs(xGuess) < EPSILON) break;
      const dX = sampleCurveDerivative(guess, x1, x2);
      if (Math.abs(dX) < EPSILON) break;
      guess -= xGuess / dX;
    }
    return sampleCurve(guess, y1, y2);
  };
}

function sampleCurve(t: number, a: number, b: number): number {
  return ((1 - 3 * b + 3 * a) * t + (3 * b - 6 * a)) * t + 3 * a * t;
  // Equivalent to: (1-t)^3*0 + 3*(1-t)^2*t*a + 3*(1-t)*t^2*b + t^3*1
  // Simplified: 3a(1-t)^2*t + 3b(1-t)*t^2 + t^3
}

function sampleCurveDerivative(t: number, a: number, b: number): number {
  return (3 - 9 * b + 9 * a) * t * t + (6 * b - 12 * a) * t + 3 * a;
}

// ─── Resolver ─────────────────────────────────────────────────────────────────

const easingCache = new Map<string, (t: number) => number>();

export function resolveEasing(easing: EasingType): (t: number) => number {
  if (typeof easing === 'string') {
    switch (easing) {
      case 'linear':    return linear;
      case 'easeIn':    return easeIn;
      case 'easeOut':   return easeOut;
      case 'easeInOut': return easeInOut;
      case 'spring':    return spring;
      case 'bounce':    return bounce;
      default:          return easeInOut;
    }
  }

  // Cubic bezier array
  const key = easing.join(',');
  let fn = easingCache.get(key);
  if (!fn) {
    fn = cubicBezier(easing[0], easing[1], easing[2], easing[3]);
    easingCache.set(key, fn);
  }
  return fn;
}

// ─── Preset Curves (CSS standard) ────────────────────────────────────────────

export const EASING_PRESETS: Record<string, { label: string; value: EasingType }> = {
  linear:    { label: 'Linear',      value: 'linear' },
  easeIn:    { label: 'Ease In',     value: 'easeIn' },
  easeOut:   { label: 'Ease Out',    value: 'easeOut' },
  easeInOut: { label: 'Ease In-Out', value: 'easeInOut' },
  spring:    { label: 'Spring',      value: 'spring' },
  bounce:    { label: 'Bounce',      value: 'bounce' },
  snappy:    { label: 'Snappy',      value: [0.5, 0, 0.1, 1] as CubicBezier },
  smooth:    { label: 'Smooth',      value: [0.4, 0, 0.2, 1] as CubicBezier },
  elastic:   { label: 'Elastic',     value: [0.68, -0.55, 0.27, 1.55] as CubicBezier },
};
