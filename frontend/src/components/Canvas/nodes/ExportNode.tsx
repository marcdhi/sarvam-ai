import React, { useState } from 'react';
import { Download, Film, Loader2, CheckCircle } from 'lucide-react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useStore } from '../../../store/useStore';
import { exportApi, projectsApi } from '../../../services/api';
import { usePolling } from '../../../hooks/usePolling';

interface Props {
  node: CanvasNode;
}

export function ExportNode({ node }: Props) {
  const { currentProject, setCurrentProject, addNotification } = useStore();
  const [exporting, setExporting] = useState(false);
  const [compositing, setCompositing] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'composite' | 'render' | 'done'>('idle');

  const projectId = currentProject?.id;
  const hasExport = currentProject?.metadata?.final_export;

  usePolling(
    async () => {
      if (!projectId || !taskId) return true;
      const res = await projectsApi.getPipelineStatus(projectId, taskId);
      if (res.task.status === 'completed') {
        const p = await projectsApi.get(projectId);
        setCurrentProject(p.project);

        if (step === 'composite') {
          // Now render
          setStep('render');
          const renderRes = await exportApi.render(projectId, {});
          setTaskId(renderRes.task_id);
          return false; // continue polling for render
        } else {
          setStep('done');
          setExporting(false);
          setTaskId(null);
          addNotification('success', 'Film exported!');
          return true;
        }
      } else if (res.task.status === 'failed') {
        addNotification('error', `Export failed: ${res.task.error}`);
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
    setStep('composite');
    try {
      const res = await exportApi.composite(projectId);
      setTaskId(res.task_id);
    } catch (e: any) {
      addNotification('error', e.message);
      setExporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {hasExport && (
        <div className="flex items-center gap-2 p-2 bg-studio-success/10 rounded-lg border border-studio-success/30">
          <CheckCircle size={14} className="text-studio-success" />
          <span className="text-xs text-studio-success">Film ready</span>
          <a
            href={exportApi.getDownloadUrl(projectId!)}
            download
            onClick={(e) => e.stopPropagation()}
            className="ml-auto text-xs text-studio-accent hover:underline flex items-center gap-1"
          >
            <Download size={12} />
            Download
          </a>
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          handleExport();
        }}
        disabled={exporting}
        className="btn-primary w-full text-xs py-2 flex items-center justify-center gap-1"
      >
        {exporting ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            {step === 'composite' ? 'Compositing...' : 'Rendering...'}
          </>
        ) : (
          <>
            <Film size={14} />
            Export Film
          </>
        )}
      </button>
    </div>
  );
}
