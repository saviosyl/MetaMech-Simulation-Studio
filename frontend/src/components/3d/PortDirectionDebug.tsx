import React, { useMemo } from 'react';
import { Html, Line } from '@react-three/drei';
import { useEditorStore, getConnectionPorts, ProcessNode, EnvironmentAsset } from '../../store/editorStore';
import { getPortWorldPosition, getPortWorldDirection } from '../../lib/nodeTransform';

type DebugPort = {
  key: string;
  nodeId: string;
  portId: string;
  portType: 'input' | 'output';
  localPosition: [number, number, number];
  worldPosition: [number, number, number];
  localDirection: [number, number, number];
  worldDirection: [number, number, number];
};

const ARROW_LENGTH = 0.28;

function fmt(v: [number, number, number]): string {
  return `${v[0].toFixed(2)}, ${v[1].toFixed(2)}, ${v[2].toFixed(2)}`;
}

const PortDirectionDebug: React.FC = () => {
  const processNodes = useEditorStore((s) => s.processNodes);
  const environmentAssets = useEditorStore((s) => s.environmentAssets);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const directionDebugVisible = useEditorStore((s) => s.directionDebugVisible);

  const debugPorts = useMemo<DebugPort[]>(() => {
    if (!directionDebugVisible || !selectedObjectId) return [];
    const node =
      (processNodes.find((n) => n.id === selectedObjectId) as ProcessNode | undefined)
      || (environmentAssets.find((a) => a.id === selectedObjectId) as EnvironmentAsset | undefined);
    if (!node) return [];
    const ports = getConnectionPorts(node.type, node.parameters, (node as { assetId?: string }).assetId);
    return ports.map((port) => {
      const worldPosition = getPortWorldPosition(port.localPosition, node as { position: [number, number, number]; rotation: [number, number, number]; scale?: [number, number, number] });
      const worldDirection = getPortWorldDirection(port.direction, node as { rotation: [number, number, number]; scale?: [number, number, number] });
      return {
        key: `${node.id}:${port.id}`,
        nodeId: node.id,
        portId: port.id,
        portType: port.type,
        localPosition: port.localPosition,
        worldPosition,
        localDirection: port.direction,
        worldDirection,
      };
    });
  }, [directionDebugVisible, selectedObjectId, processNodes, environmentAssets]);

  if (!directionDebugVisible || debugPorts.length === 0) return null;

  return (
    <group>
      {debugPorts.map((p) => {
        const end: [number, number, number] = [
          p.worldPosition[0] + p.worldDirection[0] * ARROW_LENGTH,
          p.worldPosition[1] + p.worldDirection[1] * ARROW_LENGTH,
          p.worldPosition[2] + p.worldDirection[2] * ARROW_LENGTH,
        ];
        const color = p.portType === 'input' ? '#60a5fa' : '#34d399';
        return (
          <group key={p.key}>
            <Line points={[p.worldPosition, end]} color={color} lineWidth={2.3} depthTest={false} />
            <mesh position={end}>
              <sphereGeometry args={[0.025, 10, 10]} />
              <meshBasicMaterial color={color} />
            </mesh>
            <Html
              position={[p.worldPosition[0], p.worldPosition[1] + 0.055, p.worldPosition[2]]}
              style={{
                pointerEvents: 'none',
                fontSize: 10,
                lineHeight: 1.2,
                padding: '4px 6px',
                borderRadius: 6,
                background: 'rgba(15, 23, 42, 0.74)',
                border: '1px solid rgba(148, 163, 184, 0.35)',
                color: '#e2e8f0',
                whiteSpace: 'pre',
              }}
            >
              {`${p.portId} (${p.portType})
L: [${fmt(p.localDirection)}]
W: [${fmt(p.worldDirection)}]`}
            </Html>
          </group>
        );
      })}
    </group>
  );
};

export default PortDirectionDebug;
