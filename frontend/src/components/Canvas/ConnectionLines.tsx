import React from 'react';
import { useCanvasStore } from '../../store/useCanvasStore';

export function ConnectionLines() {
  const { nodes, connections } = useCanvasStore();

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Calculate SVG bounds
  let minX = 0,
    minY = 0,
    maxX = 4000,
    maxY = 4000;
  nodes.forEach((n) => {
    maxX = Math.max(maxX, n.x + n.width + 200);
    maxY = Math.max(maxY, n.y + n.height + 200);
  });

  return (
    <svg
      className="absolute top-0 left-0 pointer-events-none"
      style={{ width: maxX, height: maxY }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="8"
          markerHeight="6"
          refX="8"
          refY="3"
          orient="auto"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill="rgba(99,102,241,0.5)"
          />
        </marker>
      </defs>

      {connections.map((conn) => {
        const fromNode = nodeMap.get(conn.from);
        const toNode = nodeMap.get(conn.to);
        if (!fromNode || !toNode) return null;

        // From right center of source to left center of target
        const x1 = fromNode.x + fromNode.width;
        const y1 = fromNode.y + fromNode.height / 2;
        const x2 = toNode.x;
        const y2 = toNode.y + toNode.height / 2;

        // Bezier control points
        const dx = Math.abs(x2 - x1) * 0.4;
        const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

        return (
          <g key={conn.id}>
            <path
              d={path}
              fill="none"
              stroke="rgba(99,102,241,0.25)"
              strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
            {conn.label && (
              <text
                x={(x1 + x2) / 2}
                y={(y1 + y2) / 2 - 8}
                textAnchor="middle"
                fill="rgba(148,163,184,0.6)"
                fontSize="11"
                fontFamily="Inter, system-ui"
              >
                {conn.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
