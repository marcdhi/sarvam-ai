export interface DialogueLine {
  character: string;
  text: string;
  direction?: string;
  audio_path?: string;
}

export interface CharacterVoice {
  character_name: string;
  voice_id?: string;
  voice_provider: string;
  voice_settings?: Record<string, number>;
}

export interface Scene {
  id: string;
  scene_number: number;
  heading: string;
  location: string;
  time_of_day: string;
  description: string;
  action: string;
  dialogue: DialogueLine[];
  camera_notes: string;
  mood: string;
  lighting: string;
  duration_seconds: number;
  status: string;
  storyboard_frames: string[];
  video_takes: string[];
  selected_video?: string;
  music_path?: string;
  sfx_paths: string[];
  composite_path?: string;
}

export interface Screenplay {
  title: string;
  logline: string;
  genre: string;
  tone: string;
  target_duration_minutes: number;
  synopsis: string;
  scenes: Scene[];
  characters: CharacterVoice[];
  style_notes: string;
  raw_text: string;
}

export interface TimelineClip {
  id: string;
  scene_id: string;
  track: string;
  source_path: string;
  start_time: number;
  end_time: number;
  in_point: number;
  out_point?: number;
  volume: number;
  opacity: number;
  transition_in?: string;
  transition_duration: number;
}

export interface Timeline {
  clips: TimelineClip[];
  total_duration: number;
  resolution: string;
  fps: number;
}

export interface ExportSettings {
  format: string;
  codec: string;
  resolution: string;
  fps: number;
  audio_codec: string;
  audio_bitrate: string;
  video_bitrate: string;
  quality_preset: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  status: string;
  project_dir: string;
  screenplay?: Screenplay;
  timeline: Timeline;
  export_settings: ExportSettings;
  style_reference_images: string[];
  metadata: Record<string, string>;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TaskProgress {
  task_id: string;
  task_type: string;
  status: string;
  progress: number;
  message: string;
  result?: Record<string, string>;
  error?: string;
}

export type PipelineStage =
  | 'idle'
  | 'script'
  | 'storyboard'
  | 'video'
  | 'audio'
  | 'composite'
  | 'export';

export type AppView =
  | 'projects'
  | 'canvas'
  | 'motion'
  | 'script'
  | 'storyboard'
  | 'video'
  | 'audio'
  | 'timeline'
  | 'export'
  | 'settings';
