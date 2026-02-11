import React, { useState } from 'react';
import { Sparkles, Loader2, Image, Pencil } from 'lucide-react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useCanvasStore } from '../../../store/useCanvasStore';
import { useStore } from '../../../store/useStore';
import { storyboardApi } from '../../../services/api';

interface Props {
  node: CanvasNode;
}

export function ImageNode({ node }: Props) {
  const { currentProject, addNotification } = useStore();
  const { updateNode } = useCanvasStore();
  const [prompt, setPrompt] = useState(node.data.prompt || '');
  const [editPrompt, setEditPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const projectId = currentProject?.id;
  const imagePath = node.data.imagePath;

  const handleGenerate = async () => {
    if (!projectId || !prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await storyboardApi.generateConceptArt(projectId, prompt);
      updateNode(node.id, {
        data: { ...node.data, prompt, imagePath: res.path },
      });
      addNotification('success', 'Image generated via Nano Banana');
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleEdit = async () => {
    if (!projectId || !editPrompt.trim() || !imagePath) return;
    setEditing(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/storyboard/edit-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_path: imagePath,
          instruction: editPrompt,
        }),
      });
      const data = await res.json();
      if (data.path) {
        updateNode(node.id, {
          data: { ...node.data, imagePath: data.path },
        });
        addNotification('success', 'Image edited via Nano Banana');
        setEditPrompt('');
        setShowEdit(false);
      }
    } catch (e: any) {
      addNotification('error', e.message);
    } finally {
      setEditing(false);
    }
  };

  return (
    <div>
      {imagePath ? (
        <div>
          <div className="aspect-video bg-studio-surface rounded overflow-hidden mb-2 relative group">
            <img
              src={`/files/${imagePath.split('/projects/')[1] || ''}`}
              alt="Generated"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '';
              }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowEdit(!showEdit);
              }}
              className="absolute bottom-1 right-1 p-1 rounded bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              title="Edit with Nano Banana"
            >
              <Pencil size={12} />
            </button>
          </div>
          {showEdit && (
            <div className="flex gap-1 mb-2">
              <input
                className="input-field text-xs flex-1"
                placeholder="Edit: 'Make it night time'..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleEdit();
                }}
                disabled={editing}
                className="btn-primary text-xs py-1 px-2"
              >
                {editing ? <Loader2 size={12} className="animate-spin" /> : <Pencil size={12} />}
              </button>
            </div>
          )}
          <p className="text-[10px] text-studio-text-dim truncate">{prompt}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="aspect-video bg-studio-surface rounded flex items-center justify-center">
            <Image size={24} className="text-studio-text-dim" />
          </div>
          <input
            className="input-field text-xs"
            placeholder="Describe the image to generate..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGenerate();
            }}
            disabled={generating || !prompt.trim()}
            className="btn-primary w-full text-xs py-1.5 flex items-center justify-center gap-1"
          >
            {generating ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Sparkles size={12} />
            )}
            Generate (Nano Banana)
          </button>
        </div>
      )}
    </div>
  );
}
