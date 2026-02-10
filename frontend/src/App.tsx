import React, { useEffect, useState } from 'react';
import { useStore } from './store/useStore';
import { Sidebar } from './components/Layout/Sidebar';
import { Header } from './components/Layout/Header';
import { Notifications } from './components/Common/Notifications';
import { ProjectManager } from './components/ProjectManager/ProjectManager';
import { ScriptEditor } from './components/ScriptEditor/ScriptEditor';
import { StoryboardView } from './components/Storyboard/StoryboardView';
import { VideoView } from './components/Video/VideoView';
import { AudioMixer } from './components/AudioMixer/AudioMixer';
import { TimelineView } from './components/Timeline/TimelineView';
import { ExportView } from './components/Preview/ExportView';
import { SettingsView } from './components/Settings/SettingsView';
import { healthApi } from './services/api';
import { Loader2, WifiOff } from 'lucide-react';

function App() {
  const { currentView } = useStore();
  const [backendStatus, setBackendStatus] = useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await healthApi.check();
        setBackendStatus('connected');
      } catch {
        setBackendStatus('disconnected');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'projects':
        return <ProjectManager />;
      case 'script':
        return <ScriptEditor />;
      case 'storyboard':
        return <StoryboardView />;
      case 'video':
        return <VideoView />;
      case 'audio':
        return <AudioMixer />;
      case 'timeline':
        return <TimelineView />;
      case 'export':
        return <ExportView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <ProjectManager />;
    }
  };

  if (backendStatus === 'checking') {
    return (
      <div className="h-screen flex items-center justify-center bg-studio-bg">
        <div className="text-center">
          <Loader2
            size={32}
            className="animate-spin text-studio-accent mx-auto mb-4"
          />
          <p className="text-studio-text-muted">Connecting to backend...</p>
        </div>
      </div>
    );
  }

  if (backendStatus === 'disconnected') {
    return (
      <div className="h-screen flex items-center justify-center bg-studio-bg">
        <div className="text-center max-w-md">
          <WifiOff
            size={48}
            className="text-studio-danger mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold mb-2">Backend Not Running</h2>
          <p className="text-studio-text-muted mb-6">
            The AI Filmmaking Studio backend server is not reachable.
            Start it with:
          </p>
          <code className="block bg-studio-card p-4 rounded-lg text-sm font-mono text-studio-accent">
            cd backend && pip install -r requirements.txt && python -m backend.app.main
          </code>
          <p className="text-studio-text-dim text-sm mt-4">
            The server runs on http://127.0.0.1:8741
          </p>
          <button
            onClick={() => setBackendStatus('checking')}
            className="btn-primary mt-4"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-studio-bg overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-hidden">{renderView()}</main>
      </div>
      <Notifications />
    </div>
  );
}

export default App;
