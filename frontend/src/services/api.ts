const API_BASE = '/api';

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(error.detail || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Projects
export const projectsApi = {
  list: () => request<{ projects: any[] }>('/projects/'),
  create: (data: {
    name: string;
    description?: string;
    target_duration_minutes?: number;
    resolution?: string;
    fps?: number;
  }) => request<{ project: any }>('/projects/', { method: 'POST', body: JSON.stringify(data) }),
  get: (id: string) => request<{ project: any }>(`/projects/${id}`),
  delete: (id: string) => request<{ status: string }>(`/projects/${id}`, { method: 'DELETE' }),
  update: (id: string, data: Record<string, any>) =>
    request<{ project: any }>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  runFullPipeline: (id: string, data: {
    prompt: string;
    genre?: string;
    tone?: string;
    style_notes?: string;
    target_duration_minutes?: number;
  }) =>
    request<{ task_id: string }>(`/projects/${id}/pipeline/full`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getPipelineStatus: (projectId: string, taskId: string) =>
    request<{ task: any }>(`/projects/${projectId}/pipeline/status/${taskId}`),
};

// Scripts
export const scriptApi = {
  generate: (projectId: string, data: {
    prompt: string;
    genre?: string;
    tone?: string;
    target_duration_minutes?: number;
    num_scenes?: number;
    style_notes?: string;
  }) =>
    request<{ screenplay: any; scene_count: number }>(
      `/projects/${projectId}/script/generate`,
      { method: 'POST', body: JSON.stringify(data) }
    ),
  get: (projectId: string) =>
    request<{ screenplay: any }>(`/projects/${projectId}/script/`),
  updateScene: (projectId: string, index: number, data: Record<string, any>) =>
    request<{ scene: any }>(`/projects/${projectId}/script/scenes/${index}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  rewriteScene: (projectId: string, index: number, notes: string) =>
    request<{ scene: any }>(`/projects/${projectId}/script/scenes/${index}/rewrite`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
  expandScene: (projectId: string, brief: string, sceneNumber?: number) =>
    request<{ scene: any }>(`/projects/${projectId}/script/scenes/expand`, {
      method: 'POST',
      body: JSON.stringify({ brief, scene_number: sceneNumber }),
    }),
  deleteScene: (projectId: string, index: number) =>
    request<{ removed: any }>(`/projects/${projectId}/script/scenes/${index}`, {
      method: 'DELETE',
    }),
};

// Storyboard
export const storyboardApi = {
  generate: (projectId: string, data: {
    scene_indices?: number[];
    frames_per_scene?: number;
    style_notes?: string;
  }) =>
    request<{ task_id: string }>(`/projects/${projectId}/storyboard/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSceneFrames: (projectId: string, sceneIndex: number) =>
    request<{ frames: string[] }>(`/projects/${projectId}/storyboard/scenes/${sceneIndex}`),
  generateConceptArt: (projectId: string, prompt: string) =>
    request<{ path: string }>(`/projects/${projectId}/storyboard/concept-art`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
};

// Video
export const videoApi = {
  generate: (projectId: string, data: {
    scene_indices?: number[];
    duration_seconds?: number;
  }) =>
    request<{ task_id: string }>(`/projects/${projectId}/video/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getSceneTakes: (projectId: string, sceneIndex: number) =>
    request<{ takes: string[]; selected: string }>(
      `/projects/${projectId}/video/scenes/${sceneIndex}/takes`
    ),
  selectTake: (projectId: string, sceneIndex: number, takePath: string) =>
    request<{ selected: string }>(
      `/projects/${projectId}/video/scenes/${sceneIndex}/select-take`,
      { method: 'PUT', body: JSON.stringify({ take_path: takePath }) }
    ),
};

// Audio
export const audioApi = {
  generateDialogue: (projectId: string, sceneIndices?: number[]) =>
    request<{ task_id: string }>(`/projects/${projectId}/audio/dialogue/generate`, {
      method: 'POST',
      body: JSON.stringify({ scene_indices: sceneIndices }),
    }),
  generateMusic: (projectId: string, sceneIndices?: number[]) =>
    request<{ task_id: string }>(`/projects/${projectId}/audio/music/generate`, {
      method: 'POST',
      body: JSON.stringify({ scene_indices: sceneIndices }),
    }),
  generateSFX: (projectId: string, sceneIndex: number, prompt?: string) =>
    request<{ sfx_path: string }>(`/projects/${projectId}/audio/sfx/generate`, {
      method: 'POST',
      body: JSON.stringify({ scene_index: sceneIndex, prompt }),
    }),
  listVoices: (projectId: string) =>
    request<{ voices: any[] }>(`/projects/${projectId}/audio/voices`),
  configureVoice: (projectId: string, data: {
    character_name: string;
    voice_id: string;
    voice_provider?: string;
  }) =>
    request<{ status: string }>(`/projects/${projectId}/audio/voices/configure`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// Export
export const exportApi = {
  composite: (projectId: string, sceneIndices?: number[]) =>
    request<{ task_id: string }>(`/projects/${projectId}/export/composite`, {
      method: 'POST',
      body: JSON.stringify({ scene_indices: sceneIndices }),
    }),
  render: (projectId: string, settings: {
    format?: string;
    codec?: string;
    resolution?: string;
    fps?: number;
    quality_preset?: string;
    video_bitrate?: string;
    audio_bitrate?: string;
  }) =>
    request<{ task_id: string }>(`/projects/${projectId}/export/render`, {
      method: 'POST',
      body: JSON.stringify(settings),
    }),
  getTimeline: (projectId: string) =>
    request<{ timeline: any }>(`/projects/${projectId}/export/timeline`),
  getDownloadUrl: (projectId: string) => `${API_BASE}/projects/${projectId}/export/download`,
};

// Settings
export const settingsApi = {
  get: () => request<{ settings: any; api_keys_configured: Record<string, boolean> }>('/settings/'),
  updateApiKeys: (keys: Record<string, string>) =>
    request<{ status: string }>('/settings/api-keys', {
      method: 'PUT',
      body: JSON.stringify(keys),
    }),
  updateModels: (models: Record<string, string>) =>
    request<{ status: string }>('/settings/models', {
      method: 'PUT',
      body: JSON.stringify(models),
    }),
};

// Health
export const healthApi = {
  check: () => request<{ status: string }>('/health'),
};
