// ─── Easing ───────────────────────────────────────────────────────────────────

export type CubicBezier = [number, number, number, number];

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'spring'
  | 'bounce'
  | CubicBezier;

// ─── Keyframes ────────────────────────────────────────────────────────────────

export interface Keyframe {
  id: string;
  time: number; // seconds
  value: number | string;
  easing: EasingType;
}

/** A single animatable property path, e.g. "x", "opacity", "fill" */
export type AnimatableProperty =
  | 'x'
  | 'y'
  | 'width'
  | 'height'
  | 'rotation'
  | 'opacity'
  | 'scaleX'
  | 'scaleY'
  | 'anchorX'
  | 'anchorY'
  | 'fill'
  | 'stroke'
  | 'strokeWidth'
  | 'borderRadius'
  | 'blur'
  | 'shadowX'
  | 'shadowY'
  | 'shadowBlur'
  | 'shadowOpacity'
  | 'fontSize'
  | 'letterSpacing'
  | 'lineHeight'
  | 'trimStart'
  | 'trimEnd';

// ─── Layer Properties ─────────────────────────────────────────────────────────

export interface LayerTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  anchorX: number; // 0-1 relative
  anchorY: number; // 0-1 relative
}

export interface LayerAppearance {
  fill: string;
  stroke: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface LayerEffects {
  blur: number;
  shadowX: number;
  shadowY: number;
  shadowBlur: number;
  shadowColor: string;
  shadowOpacity: number;
}

export interface TextProperties {
  text: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: number;
  letterSpacing: number;
  lineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  color: string;
}

export type ShapeType = 'rectangle' | 'ellipse' | 'polygon' | 'line' | 'star';

export interface ShapeProperties {
  shapeType: ShapeType;
  points?: number; // polygon/star vertex count
}

export interface PathProperties {
  trimStart: number; // 0-1 for stroke draw-on
  trimEnd: number;
}

// ─── Layers ───────────────────────────────────────────────────────────────────

export type LayerType = 'text' | 'shape' | 'image' | 'video' | 'group' | 'svg';

export interface MotionLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  inPoint: number;  // when layer appears (seconds)
  outPoint: number; // when layer disappears (seconds)
  transform: LayerTransform;
  appearance: LayerAppearance;
  effects: LayerEffects;
  textProps?: TextProperties;
  shapeProps?: ShapeProperties;
  pathProps?: PathProperties;
  imageSrc?: string;
  videoSrc?: string;
  keyframes: Record<string, Keyframe[]>; // propertyPath → sorted keyframes
  children?: MotionLayer[]; // nested group children
}

// ─── Scenes ───────────────────────────────────────────────────────────────────

export type TransitionType = 'none' | 'fade' | 'slideLeft' | 'slideRight' | 'slideUp' | 'slideDown' | 'dissolve' | 'wipe';

export interface SceneTransition {
  type: TransitionType;
  duration: number; // seconds
}

export interface MotionScene {
  id: string;
  name: string;
  duration: number; // seconds
  bgColor: string;
  layers: MotionLayer[];
  transition?: SceneTransition;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface MotionProject {
  id: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  fps: number;
  scenes: MotionScene[];
  createdAt: string;
  updatedAt: string;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

export interface AnimationPreset {
  id: string;
  name: string;
  category: 'enter' | 'exit' | 'emphasis' | 'transition';
  description: string;
  keyframes: Record<string, Keyframe[]>; // property -> keyframes (relative time 0-1)
  duration: number; // default duration in seconds
}

// ─── Editor State ─────────────────────────────────────────────────────────────

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  loop: boolean;
}

export interface SelectionState {
  layerIds: string[];
  keyframeIds: string[];
}
