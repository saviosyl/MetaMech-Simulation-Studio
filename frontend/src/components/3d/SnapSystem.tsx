import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useEditorStore, getConnectionPorts, ProcessNode, ConnectionPort } from '../../store/editorStore';

const SNAP_THRESHOLD = 0.5;

const SnapSystem: React.FC = () => {
  const { processNodes, edges, selectedObjectId, isDragging, mateMode, setMateSelectedPort, addEdge, updateObject } = useEditorStore();

  // Show ports for all nodes when something is selected, being dragged, or mate mode
  const showPorts = selectedObjectId !== null || isDragging || mateMode.active;

  const portVisuals = useMemo(() => {
    if (!showPorts) return [];

    const visuals: { position: [number, number, number]; type: 'input' | 'output'; nodeId: string; portId: string; connected: boolean }[] = [];

    processNodes.forEach((node: ProcessNode) => {
      const ports = getConnectionPorts(node.type, node.parameters);
      ports.forEach((port: ConnectionPort) => {
        const worldPos: [number, number, number] = [
          node.position[0] + port.localPosition[0],
          node.position[1] + port.localPosition[1],
          node.position[2] + port.localPosition[2],
        ];
        const connected = edges.some(e =>
          (e.from === node.id && e.fromPort === port.id) ||
          (e.to === node.id && e.toPort === port.id)
        );
        visuals.push({ position: worldPos, type: port.type, nodeId: node.id, portId: port.id, connected });
      });
    });

    return visuals;
  }, [processNodes, edges, showPorts]);

  if (!showPorts) return null;

  const handlePortClick = (pv: typeof portVisuals[0]) => {
    if (!mateMode.active) return;

    const selectedPort = mateMode.selectedPort;
    if (!selectedPort) {
      // First click - select this port
      setMateSelectedPort({
        nodeId: pv.nodeId,
        portId: pv.portId,
        type: pv.type,
        worldPosition: pv.position,
      });
    } else {
      // Second click - connect if compatible (output->input or input->output)
      if (selectedPort.type === pv.type) {
        // Same type, just re-select
        setMateSelectedPort({
          nodeId: pv.nodeId,
          portId: pv.portId,
          type: pv.type,
          worldPosition: pv.position,
        });
        return;
      }
      // Auto-align: move the second-clicked object so its port aligns with the first port
      const secondNode = processNodes.find(n => n.id === pv.nodeId);
      if (secondNode) {
        const secondPorts = getConnectionPorts(secondNode.type, secondNode.parameters);
        const secondPort = secondPorts.find(p => p.id === pv.portId);
        if (secondPort) {
          // Calculate where the second node needs to be so its port aligns with the first port
          const newPosition: [number, number, number] = [
            selectedPort.worldPosition[0] - secondPort.localPosition[0],
            0, // Always on ground
            selectedPort.worldPosition[2] - secondPort.localPosition[2],
          ];
          updateObject(pv.nodeId, 'process', { position: newPosition });
        }
      }

      // Create edge: output -> input
      if (selectedPort.type === 'output') {
        addEdge(selectedPort.nodeId, selectedPort.portId, pv.nodeId, pv.portId);
      } else {
        addEdge(pv.nodeId, pv.portId, selectedPort.nodeId, selectedPort.portId);
      }
      setMateSelectedPort(null);
    }
  };

  const isMateSelected = (nodeId: string, portId: string) =>
    mateMode.active && mateMode.selectedPort?.nodeId === nodeId && mateMode.selectedPort?.portId === portId;

  return (
    <group>
      {portVisuals.map((pv) => {
        const selected = isMateSelected(pv.nodeId, pv.portId);
        const portSize = mateMode.active ? 0.15 : 0.08;
        return (
          <group key={`${pv.nodeId}-${pv.portId}`} position={pv.position}>
            {/* Port sphere */}
            <mesh
              onClick={(e) => {
                if (mateMode.active) {
                  e.stopPropagation();
                  handlePortClick(pv);
                }
              }}
              onPointerOver={(e) => {
                if (mateMode.active) {
                  e.stopPropagation();
                  document.body.style.cursor = 'pointer';
                }
              }}
              onPointerOut={() => {
                if (mateMode.active) document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[portSize, 12, 8]} />
              <meshStandardMaterial
                color={selected ? '#ffffff' : pv.connected ? '#6b7280' : pv.type === 'input' ? '#3b82f6' : '#10b981'}
                emissive={selected ? '#06b6d4' : pv.connected ? '#333333' : pv.type === 'input' ? '#3b82f6' : '#10b981'}
                emissiveIntensity={selected ? 1.0 : pv.connected ? 0.1 : 0.5}
                transparent
                opacity={pv.connected ? 0.4 : 0.9}
              />
            </mesh>
            {/* Outer ring indicator */}
            {!pv.connected && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[portSize + 0.02, portSize + 0.07, 16]} />
                <meshBasicMaterial
                  color={selected ? '#06b6d4' : pv.type === 'input' ? '#3b82f6' : '#10b981'}
                  transparent
                  opacity={selected ? 0.8 : 0.4}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// Utility function to check for snap and create connections
export function checkSnap(
  draggedNode: ProcessNode,
  allNodes: ProcessNode[],
  edges: { from: string; to: string; fromPort: string; toPort: string }[]
): { targetNodeId: string; targetPortId: string; dragPortId: string; snapPosition: [number, number, number] } | null {
  const dragPorts = getConnectionPorts(draggedNode.type, draggedNode.parameters);

  for (const otherNode of allNodes) {
    if (otherNode.id === draggedNode.id) continue;
    const otherPorts = getConnectionPorts(otherNode.type, otherNode.parameters);

    for (const dp of dragPorts) {
      const dpWorld = [
        draggedNode.position[0] + dp.localPosition[0],
        draggedNode.position[1] + dp.localPosition[1],
        draggedNode.position[2] + dp.localPosition[2],
      ];

      for (const op of otherPorts) {
        // Only connect output->input
        if (dp.type === op.type) continue;

        // Check if already connected
        const alreadyConnected = edges.some(e =>
          (e.from === draggedNode.id && e.fromPort === dp.id && e.to === otherNode.id && e.toPort === op.id) ||
          (e.from === otherNode.id && e.fromPort === op.id && e.to === draggedNode.id && e.toPort === dp.id)
        );
        if (alreadyConnected) continue;

        const opWorld = [
          otherNode.position[0] + op.localPosition[0],
          otherNode.position[1] + op.localPosition[1],
          otherNode.position[2] + op.localPosition[2],
        ];

        const dist = Math.sqrt(
          (dpWorld[0] - opWorld[0]) ** 2 +
          (dpWorld[1] - opWorld[1]) ** 2 +
          (dpWorld[2] - opWorld[2]) ** 2
        );

        if (dist < SNAP_THRESHOLD) {
          // Calculate snap position: move dragged node so ports align
          const snapPos: [number, number, number] = [
            otherNode.position[0] + op.localPosition[0] - dp.localPosition[0],
            0, // Always on ground
            otherNode.position[2] + op.localPosition[2] - dp.localPosition[2],
          ];

          return {
            targetNodeId: otherNode.id,
            targetPortId: op.id,
            dragPortId: dp.id,
            snapPosition: snapPos,
          };
        }
      }
    }
  }

  return null;
}

export default SnapSystem;
