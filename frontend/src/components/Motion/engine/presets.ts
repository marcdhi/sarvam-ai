/**
 * Built-in animation presets — ready-to-apply keyframe templates.
 * Times are relative (0 = start, 1 = end of preset duration).
 */

import type { AnimationPreset, Keyframe } from '../../../types/motion';

let _uid = 0;
const uid = () => `preset-kf-${++_uid}`;

function kf(time: number, value: number | string, easing: Keyframe['easing'] = 'easeOut'): Keyframe {
  return { id: uid(), time, value, easing };
}

// ─── Enter Presets ────────────────────────────────────────────────────────────

const fadeIn: AnimationPreset = {
  id: 'fade-in',
  name: 'Fade In',
  category: 'enter',
  description: 'Smooth opacity fade from 0 to 1',
  duration: 0.6,
  keyframes: {
    opacity: [kf(0, 0, 'linear'), kf(1, 1, 'easeOut')],
  },
};

const slideInLeft: AnimationPreset = {
  id: 'slide-in-left',
  name: 'Slide In Left',
  category: 'enter',
  description: 'Slide in from the left with fade',
  duration: 0.8,
  keyframes: {
    x: [kf(0, -200, 'linear'), kf(1, 0, 'easeOut')],
    opacity: [kf(0, 0, 'linear'), kf(0.3, 1, 'easeOut')],
  },
};

const slideInRight: AnimationPreset = {
  id: 'slide-in-right',
  name: 'Slide In Right',
  category: 'enter',
  description: 'Slide in from the right with fade',
  duration: 0.8,
  keyframes: {
    x: [kf(0, 200, 'linear'), kf(1, 0, 'easeOut')],
    opacity: [kf(0, 0, 'linear'), kf(0.3, 1, 'easeOut')],
  },
};

const slideInUp: AnimationPreset = {
  id: 'slide-in-up',
  name: 'Slide In Up',
  category: 'enter',
  description: 'Slide in from below with fade',
  duration: 0.8,
  keyframes: {
    y: [kf(0, 150, 'linear'), kf(1, 0, 'easeOut')],
    opacity: [kf(0, 0, 'linear'), kf(0.3, 1, 'easeOut')],
  },
};

const slideInDown: AnimationPreset = {
  id: 'slide-in-down',
  name: 'Slide In Down',
  category: 'enter',
  description: 'Slide in from above with fade',
  duration: 0.8,
  keyframes: {
    y: [kf(0, -150, 'linear'), kf(1, 0, 'easeOut')],
    opacity: [kf(0, 0, 'linear'), kf(0.3, 1, 'easeOut')],
  },
};

const scaleIn: AnimationPreset = {
  id: 'scale-in',
  name: 'Scale In',
  category: 'enter',
  description: 'Scale up from zero with bounce',
  duration: 0.7,
  keyframes: {
    scaleX: [kf(0, 0, 'linear'), kf(1, 1, 'spring')],
    scaleY: [kf(0, 0, 'linear'), kf(1, 1, 'spring')],
    opacity: [kf(0, 0, 'linear'), kf(0.2, 1, 'easeOut')],
  },
};

const bounceIn: AnimationPreset = {
  id: 'bounce-in',
  name: 'Bounce In',
  category: 'enter',
  description: 'Bouncy scale entrance',
  duration: 0.8,
  keyframes: {
    scaleX: [kf(0, 0, 'linear'), kf(1, 1, 'bounce')],
    scaleY: [kf(0, 0, 'linear'), kf(1, 1, 'bounce')],
    opacity: [kf(0, 0, 'linear'), kf(0.15, 1, 'easeOut')],
  },
};

const blurIn: AnimationPreset = {
  id: 'blur-in',
  name: 'Blur In',
  category: 'enter',
  description: 'Fade in from blurred state',
  duration: 0.8,
  keyframes: {
    blur: [kf(0, 20, 'linear'), kf(1, 0, 'easeOut')],
    opacity: [kf(0, 0, 'linear'), kf(1, 1, 'easeOut')],
  },
};

const typewriter: AnimationPreset = {
  id: 'typewriter',
  name: 'Typewriter',
  category: 'enter',
  description: 'Reveal text character by character',
  duration: 1.5,
  keyframes: {
    trimEnd: [kf(0, 0, 'linear'), kf(1, 1, 'linear')],
  },
};

// ─── Exit Presets ─────────────────────────────────────────────────────────────

const fadeOut: AnimationPreset = {
  id: 'fade-out',
  name: 'Fade Out',
  category: 'exit',
  description: 'Smooth opacity fade to 0',
  duration: 0.6,
  keyframes: {
    opacity: [kf(0, 1, 'linear'), kf(1, 0, 'easeIn')],
  },
};

const slideOutLeft: AnimationPreset = {
  id: 'slide-out-left',
  name: 'Slide Out Left',
  category: 'exit',
  description: 'Slide out to the left with fade',
  duration: 0.8,
  keyframes: {
    x: [kf(0, 0, 'linear'), kf(1, -200, 'easeIn')],
    opacity: [kf(0.7, 1, 'linear'), kf(1, 0, 'easeIn')],
  },
};

const slideOutRight: AnimationPreset = {
  id: 'slide-out-right',
  name: 'Slide Out Right',
  category: 'exit',
  description: 'Slide out to the right with fade',
  duration: 0.8,
  keyframes: {
    x: [kf(0, 0, 'linear'), kf(1, 200, 'easeIn')],
    opacity: [kf(0.7, 1, 'linear'), kf(1, 0, 'easeIn')],
  },
};

const scaleOut: AnimationPreset = {
  id: 'scale-out',
  name: 'Scale Out',
  category: 'exit',
  description: 'Shrink to nothing',
  duration: 0.6,
  keyframes: {
    scaleX: [kf(0, 1, 'linear'), kf(1, 0, 'easeIn')],
    scaleY: [kf(0, 1, 'linear'), kf(1, 0, 'easeIn')],
    opacity: [kf(0.7, 1, 'linear'), kf(1, 0, 'easeIn')],
  },
};

// ─── Emphasis Presets ─────────────────────────────────────────────────────────

const pulse: AnimationPreset = {
  id: 'pulse',
  name: 'Pulse',
  category: 'emphasis',
  description: 'Scale up and down to draw attention',
  duration: 0.6,
  keyframes: {
    scaleX: [kf(0, 1, 'linear'), kf(0.5, 1.15, 'easeInOut'), kf(1, 1, 'easeInOut')],
    scaleY: [kf(0, 1, 'linear'), kf(0.5, 1.15, 'easeInOut'), kf(1, 1, 'easeInOut')],
  },
};

const shake: AnimationPreset = {
  id: 'shake',
  name: 'Shake',
  category: 'emphasis',
  description: 'Quick horizontal shake',
  duration: 0.5,
  keyframes: {
    x: [
      kf(0, 0, 'linear'),
      kf(0.2, -15, 'linear'),
      kf(0.4, 15, 'linear'),
      kf(0.6, -10, 'linear'),
      kf(0.8, 10, 'linear'),
      kf(1, 0, 'easeOut'),
    ],
  },
};

const wiggle: AnimationPreset = {
  id: 'wiggle',
  name: 'Wiggle',
  category: 'emphasis',
  description: 'Quick rotation wiggle',
  duration: 0.6,
  keyframes: {
    rotation: [
      kf(0, 0, 'linear'),
      kf(0.2, -10, 'linear'),
      kf(0.4, 10, 'linear'),
      kf(0.6, -5, 'linear'),
      kf(0.8, 5, 'linear'),
      kf(1, 0, 'easeOut'),
    ],
  },
};

const float: AnimationPreset = {
  id: 'float',
  name: 'Float',
  category: 'emphasis',
  description: 'Gentle up-and-down floating',
  duration: 2.0,
  keyframes: {
    y: [kf(0, 0, 'linear'), kf(0.5, -20, 'easeInOut'), kf(1, 0, 'easeInOut')],
  },
};

const glow: AnimationPreset = {
  id: 'glow',
  name: 'Glow',
  category: 'emphasis',
  description: 'Pulsing shadow glow effect',
  duration: 1.2,
  keyframes: {
    shadowBlur: [kf(0, 0, 'linear'), kf(0.5, 30, 'easeInOut'), kf(1, 0, 'easeInOut')],
    shadowOpacity: [kf(0, 0, 'linear'), kf(0.5, 1, 'easeInOut'), kf(1, 0, 'easeInOut')],
  },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const ANIMATION_PRESETS: AnimationPreset[] = [
  // Enter
  fadeIn, slideInLeft, slideInRight, slideInUp, slideInDown,
  scaleIn, bounceIn, blurIn, typewriter,
  // Exit
  fadeOut, slideOutLeft, slideOutRight, scaleOut,
  // Emphasis
  pulse, shake, wiggle, float, glow,
];

export function getPresetsByCategory(category: AnimationPreset['category']): AnimationPreset[] {
  return ANIMATION_PRESETS.filter(p => p.category === category);
}

export function getPresetById(id: string): AnimationPreset | undefined {
  return ANIMATION_PRESETS.find(p => p.id === id);
}
