import React, { useState, useEffect } from 'react';
import {
  Settings,
  Key,
  Cpu,
  Save,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { settingsApi } from '../../services/api';

export function SettingsView() {
  const { addNotification } = useStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiKeysConfigured, setApiKeysConfigured] = useState<
    Record<string, boolean>
  >({});
  const [currentSettings, setCurrentSettings] = useState<Record<string, string>>({});

  // API Key form
  const [anthropicKey, setAnthropicKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [replicateToken, setReplicateToken] = useState('');
  const [elevenlabsKey, setElevenlabsKey] = useState('');
  const [runwayKey, setRunwayKey] = useState('');
  const [stabilityKey, setStabilityKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');

  // Model preferences
  const [scriptModel, setScriptModel] = useState('claude-sonnet-4-20250514');
  const [imageProvider, setImageProvider] = useState('gemini');
  const [videoProvider, setVideoProvider] = useState('runway');
  const [voiceProvider, setVoiceProvider] = useState('elevenlabs');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await settingsApi.get();
      setApiKeysConfigured(res.api_keys_configured);
      setCurrentSettings(res.settings);
      setScriptModel(res.settings.script_model || 'claude-sonnet-4-20250514');
      setImageProvider(res.settings.image_provider || 'gemini');
      setVideoProvider(res.settings.video_provider || 'runway');
      setVoiceProvider(res.settings.voice_provider || 'elevenlabs');
    } catch (e: any) {
      addNotification('error', `Failed to load settings: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKeys = async () => {
    setSaving(true);
    try {
      const keys: Record<string, string> = {};
      if (anthropicKey) keys.anthropic_api_key = anthropicKey;
      if (openaiKey) keys.openai_api_key = openaiKey;
      if (replicateToken) keys.replicate_api_token = replicateToken;
      if (elevenlabsKey) keys.elevenlabs_api_key = elevenlabsKey;
      if (runwayKey) keys.runway_api_key = runwayKey;
      if (stabilityKey) keys.stability_api_key = stabilityKey;
      if (googleKey) keys.google_api_key = googleKey;

      if (Object.keys(keys).length > 0) {
        await settingsApi.updateApiKeys(keys);
      }

      await settingsApi.updateModels({
        script_model: scriptModel,
        image_provider: imageProvider,
        video_provider: videoProvider,
        voice_provider: voiceProvider,
      });

      addNotification('success', 'Settings saved');
      await loadSettings();
      // Clear key fields
      setAnthropicKey('');
      setOpenaiKey('');
      setReplicateToken('');
      setElevenlabsKey('');
      setRunwayKey('');
      setStabilityKey('');
      setGoogleKey('');
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 size={24} className="animate-spin text-studio-accent" />
      </div>
    );
  }

  const KeyStatus = ({ configured }: { configured: boolean }) =>
    configured ? (
      <CheckCircle size={14} className="text-studio-success" />
    ) : (
      <XCircle size={14} className="text-studio-text-dim" />
    );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="section-title flex items-center gap-2">
        <Settings size={20} />
        Settings
      </h2>

      {/* API Keys */}
      <div className="card mb-6">
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <Key size={16} className="text-studio-accent" />
          API Keys
        </h3>
        <p className="text-sm text-studio-text-muted mb-4">
          Configure API keys for AI services. Keys are stored in memory only.
          For persistence, set them as environment variables with the
          FILMSTUDIO_ prefix.
        </p>

        <div className="space-y-3">
          <div>
            <label className="label flex items-center gap-2">
              <KeyStatus configured={apiKeysConfigured.anthropic} />
              Anthropic API Key (Script Generation)
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={apiKeysConfigured.anthropic ? '********' : 'sk-ant-...'}
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <KeyStatus configured={apiKeysConfigured.openai} />
              OpenAI API Key (Images, TTS)
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={apiKeysConfigured.openai ? '********' : 'sk-...'}
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <KeyStatus configured={apiKeysConfigured.replicate} />
              Replicate API Token (Flux, Video, Audio)
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={apiKeysConfigured.replicate ? '********' : 'r8_...'}
              value={replicateToken}
              onChange={(e) => setReplicateToken(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <KeyStatus configured={apiKeysConfigured.elevenlabs} />
              ElevenLabs API Key (Voice, SFX)
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={apiKeysConfigured.elevenlabs ? '********' : 'Enter key...'}
              value={elevenlabsKey}
              onChange={(e) => setElevenlabsKey(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <KeyStatus configured={apiKeysConfigured.runway} />
              Runway API Key (Video Generation)
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={apiKeysConfigured.runway ? '********' : 'Enter key...'}
              value={runwayKey}
              onChange={(e) => setRunwayKey(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <KeyStatus configured={apiKeysConfigured.stability} />
              Stability AI API Key (Music)
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={apiKeysConfigured.stability ? '********' : 'Enter key...'}
              value={stabilityKey}
              onChange={(e) => setStabilityKey(e.target.value)}
            />
          </div>

          <div>
            <label className="label flex items-center gap-2">
              <KeyStatus configured={apiKeysConfigured.google} />
              Google API Key (Nano Banana / Gemini Images)
            </label>
            <input
              type="password"
              className="input-field"
              placeholder={apiKeysConfigured.google ? '********' : 'Enter key...'}
              value={googleKey}
              onChange={(e) => setGoogleKey(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Model Preferences */}
      <div className="card mb-6">
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <Cpu size={16} className="text-purple-400" />
          AI Model Preferences
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Script Generation Model</label>
            <select
              className="input-field"
              value={scriptModel}
              onChange={(e) => setScriptModel(e.target.value)}
            >
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-opus-4-20250514">Claude Opus 4</option>
              <option value="gpt-4o">GPT-4o</option>
            </select>
          </div>

          <div>
            <label className="label">Image Provider</label>
            <select
              className="input-field"
              value={imageProvider}
              onChange={(e) => setImageProvider(e.target.value)}
            >
              <option value="gemini">Nano Banana (Gemini)</option>
              <option value="openai">OpenAI (DALL-E 3)</option>
              <option value="replicate">Replicate (Flux Pro)</option>
            </select>
          </div>

          <div>
            <label className="label">Video Provider</label>
            <select
              className="input-field"
              value={videoProvider}
              onChange={(e) => setVideoProvider(e.target.value)}
            >
              <option value="runway">Runway (Gen-4)</option>
              <option value="replicate">Replicate (LTX-Video)</option>
            </select>
          </div>

          <div>
            <label className="label">Voice Provider</label>
            <select
              className="input-field"
              value={voiceProvider}
              onChange={(e) => setVoiceProvider(e.target.value)}
            >
              <option value="elevenlabs">ElevenLabs</option>
              <option value="openai">OpenAI TTS</option>
            </select>
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSaveKeys}
        disabled={saving}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Save size={16} />
        )}
        Save Settings
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-studio-surface rounded-lg">
        <h4 className="text-sm font-medium mb-2">Required API Keys</h4>
        <ul className="text-sm text-studio-text-muted space-y-1 list-disc list-inside">
          <li>
            <strong>Anthropic or OpenAI</strong> - Required for script
            generation
          </li>
          <li>
            <strong>Google (Nano Banana), OpenAI, or Replicate</strong> - Required for storyboard
            images
          </li>
          <li>
            <strong>Runway or Replicate</strong> - Required for video generation
          </li>
          <li>
            <strong>ElevenLabs or OpenAI</strong> - Required for voice/dialogue
          </li>
          <li>
            <strong>Replicate or ElevenLabs</strong> - Required for music/SFX
          </li>
        </ul>
      </div>
    </div>
  );
}
