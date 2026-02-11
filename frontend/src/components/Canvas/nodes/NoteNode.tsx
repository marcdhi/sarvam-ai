import React, { useState } from 'react';
import type { CanvasNode } from '../../../store/useCanvasStore';
import { useCanvasStore } from '../../../store/useCanvasStore';

interface Props {
  node: CanvasNode;
}

const noteColors: Record<string, string> = {
  yellow: 'bg-yellow-500/10 border-yellow-500/30',
  blue: 'bg-blue-500/10 border-blue-500/30',
  green: 'bg-green-500/10 border-green-500/30',
  pink: 'bg-pink-500/10 border-pink-500/30',
  purple: 'bg-purple-500/10 border-purple-500/30',
};

const colorOptions = ['yellow', 'blue', 'green', 'pink', 'purple'];

export function NoteNode({ node }: Props) {
  const { updateNode } = useCanvasStore();
  const color = node.data.color || 'yellow';

  return (
    <div>
      <textarea
        className={`w-full min-h-[80px] bg-transparent border-0 resize-none text-sm focus:outline-none focus:ring-0 placeholder:text-studio-text-dim`}
        placeholder="Type your notes, ideas, directions..."
        value={node.data.text || ''}
        onChange={(e) =>
          updateNode(node.id, {
            data: { ...node.data, text: e.target.value },
          })
        }
        onClick={(e) => e.stopPropagation()}
      />
      <div className="flex gap-1 mt-1">
        {colorOptions.map((c) => (
          <button
            key={c}
            onClick={(e) => {
              e.stopPropagation();
              updateNode(node.id, { data: { ...node.data, color: c } });
            }}
            className={`w-4 h-4 rounded-full border-2 transition-transform ${
              c === color ? 'scale-125 ring-1 ring-white/30' : ''
            }`}
            style={{
              backgroundColor:
                c === 'yellow'
                  ? '#eab308'
                  : c === 'blue'
                    ? '#3b82f6'
                    : c === 'green'
                      ? '#22c55e'
                      : c === 'pink'
                        ? '#ec4899'
                        : '#a855f7',
              borderColor: 'transparent',
            }}
          />
        ))}
      </div>
    </div>
  );
}
