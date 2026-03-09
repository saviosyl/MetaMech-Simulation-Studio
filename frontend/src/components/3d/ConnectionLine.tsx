import React, { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useEditorStore, getConnectionPorts } from '../../store/editorStore';
import { getPortWorldPosition } from '../../lib/nodeTransform';

const ConnectionLines: React.FC = () => {
  const { processNodes, edges } = useEditorStore();

  const lines = useMemo(() => {
    return edges.map(edge => {
      const fromNode = processNodes.find(n => n.id === edge.from);
      const toNode = processNodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return null;

      const fromPorts = getConnectionPorts(fromNode.type, fromNode.parameters);
      const toPorts = getConnectionPorts(toNode.type, toNode.parameters);
      const fromPort = fromPorts.find(p => p.id === edge.fromPort);
      const toPort = toPorts.find(p => p.id === edge.toPort);
      if (!fromPort || !toPort) return null;

      const start = getPortWorldPosition(fromPort.localPosition, fromNode);
      const end = getPortWorldPosition(toPort.localPosition, toNode);

      // Create a slight arc
      const mid: [number, number, number] = [
        (start[0] + end[0]) / 2,
        Math.max(start[1], end[1]) + 0.3,
        (start[2] + end[2]) / 2,
      ];

      return { id: edge.id, points: [start, mid, end] };
    }).filter(Boolean) as { id: string; points: [number, number, number][] }[];
  }, [processNodes, edges]);

  return (
    <group>
      {lines.map(line => (
        <Line
          key={line.id}
          points={line.points}
          color="#06b6d4"
          lineWidth={1.5}
          transparent
          opacity={0.6}
        />
      ))}
    </group>
  );
};

export default ConnectionLines;
