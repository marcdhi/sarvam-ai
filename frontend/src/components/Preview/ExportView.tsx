import React, { useState } from 'react';
import {
  Download,
  Film,
  Loader2,
  Settings as SettingsIcon,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { exportApi, projectsApi } from '../../services/api';
import { usePolling } from '../../hooks/usePolling';
import { ProgressBar } from '../Common/ProgressBar';

export function ExportView() {
  const {
    currentProject,
    setCurrentProject,
    addNotification,
  } = useStore();

  const [exporting, setExporting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState('');
  const [exportComplete, setExportComplete] = useState(false);

  const [format, setFormat] = useState('mp4');
  const [resolution, setResolution] = useState('1920x1080');
  const [fps, setFps] = useState(24);
  const [quality, setQuality] = useState('medium');
  const [videoBitrate, setVideoBitrate] = useState('8M');

  const projectId = currentProject?.id;
  const hasExport = currentProject?.metadata?.final_export;

  usePolling(
    async () => {
      if (!projectId || !taskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, taskId);
      const task = res.task;
      setProgress(task.progress);
      setProgressMsg(task.message);
      if (task.status === 'completed') {
        const projRes = await projectsApi.get(projectId);
        setCurrentProject(projRes.project);
        addNotification('success', 'Film exported successfully!');
        setExporting(false);
        setExportComplete(true);
        setTaskId(null);
        return true;
      } else if (task.status === 'failed') {
        addNotification('error', `Export failed: ${task.error}`);
        setExporting(false);
        setTaskId(null);
        return true;
      }
      return false;
    },
    3000,
    !!taskId
  );

  const handleExport = async () => {
    if (!projectId) return;
    setExporting(true);
    setExportComplete(false);
    try {
      const res = await exportApi.render(projectId, {
        format,
        resolution,
        fps,
        quality_preset: quality,
        video_bitrate: videoBitrate,
      });
      setTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setExporting(false);
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="section-title flex items-center gap-2">
        <Download size={20} />
        Export Film
      </h2>

      {/* Export Settings */}
      <div className="card mb-6">
        <h3 className="font-medium flex items-center gap-2 mb-4">
          <SettingsIcon size={16} className="text-studio-text-muted" />
          Export Settings
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Format</label>
            <select
              className="input-field"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="mp4">MP4 (H.264)</option>
              <option value="webm">WebM (VP9)</option>
              <option value="mov">MOV (ProRes)</option>
            </select>
          </div>

          <div>
            <label className="label">Resolution</label>
            <select
              className="input-field"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
            >
              <option value="3840x2160">4K (3840x2160)</option>
              <option value="1920x1080">Full HD (1920x1080)</option>
              <option value="1280x720">HD (1280x720)</option>
              <option value="854x480">SD (854x480)</option>
            </select>
          </div>

          <div>
            <label className="label">Frame Rate</label>
            <select
              className="input-field"
              value={fps}
              onChange={(e) => setFps(Number(e.target.value))}
            >
              <option value={24}>24 fps (Film)</option>
              <option value={25}>25 fps (PAL)</option>
              <option value={30}>30 fps (NTSC)</option>
              <option value={60}>60 fps (Smooth)</option>
            </select>
          </div>

          <div>
            <label className="label">Quality</label>
            <select
              className="input-field"
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
            >
              <option value="veryslow">Maximum (Very Slow)</option>
              <option value="slow">High (Slow)</option>
              <option value="medium">Balanced (Medium)</option>
              <option value="fast">Draft (Fast)</option>
            </select>
          </div>

          <div>
            <label className="label">Video Bitrate</label>
            <select
              className="input-field"
              value={videoBitrate}
              onChange={(e) => setVideoBitrate(e.target.value)}
            >
              <option value="20M">20 Mbps (Ultra)</option>
              <option value="12M">12 Mbps (High)</option>
              <option value="8M">8 Mbps (Standard)</option>
              <option value="4M">4 Mbps (Low)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Progress */}
      {exporting && (
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Loader2 size={16} className="animate-spin text-studio-accent" />
            <span className="font-medium">Rendering Film</span>
          </div>
          <ProgressBar progress={progress} message={progressMsg} />
        </div>
      )}

      {/* Export Complete */}
      {(exportComplete || hasExport) && (
        <div className="card mb-6 border-studio-success">
          <div className="flex items-center gap-3">
            <CheckCircle size={24} className="text-studio-success" />
            <div className="flex-1">
              <h3 className="font-medium">Film Ready</h3>
              <p className="text-sm text-studio-text-muted">
                Your film has been exported and is ready to download.
              </p>
            </div>
            {projectId && (
              <a
                href={exportApi.getDownloadUrl(projectId)}
                download
                className="btn-primary flex items-center gap-2"
              >
                <Download size={16} />
                Download Film
              </a>
            )}
          </div>
        </div>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-lg"
      >
        {exporting ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            Rendering...
          </>
        ) : (
          <>
            <Film size={20} />
            Export Film
          </>
        )}
      </button>

      {/* Info */}
      <div className="mt-6 p-4 bg-studio-surface rounded-lg">
        <h4 className="text-sm font-medium mb-2">Export Process</h4>
        <ol className="text-sm text-studio-text-muted space-y-1 list-decimal list-inside">
          <li>Normalize all scene clips to target resolution and frame rate</li>
          <li>Concatenate scenes in screenplay order</li>
          <li>Mix dialogue, music, and sound effects audio tracks</li>
          <li>Apply transitions between scenes</li>
          <li>Encode final output with selected quality settings</li>
        </ol>
      </div>
    </div>
  );
}
