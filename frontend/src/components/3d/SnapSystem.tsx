import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useEditorStore, getConnectionPorts, ProcessNode, ConnectionPort } from '../../store/editorStore';
import { getPortWorldPosition, alignNodeToPort, solveMateTransform, localDirToWorld } from '../../lib/nodeTransform';
import { findNearestConveyorSnap, isAccessoryType, isConveyorType, applyAccessorySnap } from '../../lib/accessorySnap';

const SNAP_THRESHOLD = 0.5;

const SnapSystem: React.FC = () => {
  const { processNodes, edges, selectedObjectId, isDragging, mateMode, activeTool, setMateSelectedPort, addEdge, updateObject } = useEditorStore();
  const wasDragging = useRef(false);

  // Auto-snap on drag end: accessory snap + snap-move port proximity snap
  useEffect(() => {
    if (wasDragging.current && !isDragging && selectedObjectId) {
      const node = processNodes.find(n => n.id === selectedObjectId);
      if (!node) { wasDragging.current = false; return; }

      // Accessory snap (any mode)
      if (isAccessoryType(node.type)) {
        const conveyors = processNodes.filter(n => isConveyorType(n.type));
        const snap = findNearestConveyorSnap(node.position, conveyors, node.type);
        if (snap) {
          const applied = applyAccessorySnap(snap);
          updateObject(node.id, 'process', {
            position: applied.position,
            rotation: applied.rotation,
            parameters: { ...node.parameters, ...applied.parameters },
          });
        }
      }

      // Auto-mate: snap to nearest compatible port when close enough
      // Works in snap-move mode (150mm) or normal move mode (100mm for any node with ports)
      {
        const SNAP_DIST = activeTool === 'snap-move' ? 0.15 : 0.1; // snap-move: 150mm, normal: 100mm
        const myPorts = getConnectionPorts(node.type, node.parameters);
        let bestDist = SNAP_DIST;
        let bestMatch: { myPort: ConnectionPort; targetNode: ProcessNode; targetPort: ConnectionPort; targetWorldPos: [number, number, number]; targetWorldDir: [number, number, number] } | null = null;

        for (const other of processNodes) {
          if (other.id === node.id) continue;
          const otherPorts = getConnectionPorts(other.type, other.parameters);
          for (const mp of myPorts) {
            const mpWorld = getPortWorldPosition(mp.localPosition, node);
            for (const op of otherPorts) {
              // Compatible: output↔input
              if (mp.type === op.type) continue;
              const opWorld = getPortWorldPosition(op.localPosition, other);
              const dx = mpWorld[0] - opWorld[0];
              const dy = mpWorld[1] - opWorld[1];
              const dz = mpWorld[2] - opWorld[2];
              const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
              if (dist < bestDist) {
                bestDist = dist;
                const opWorldDir = localDirToWorld(op.direction, other.rotation);
                bestMatch = { myPort: mp, targetNode: other, targetPort: op, targetWorldPos: opWorld, targetWorldDir: opWorldDir };
              }
            }
          }
        }

        if (bestMatch) {
          const mate = solveMateTransform(
            bestMatch.targetWorldPos,
            bestMatch.targetWorldDir,
            bestMatch.myPort.localPosition,
            bestMatch.myPort.direction,
            node.scale,
          );
          updateObject(node.id, 'process', { position: mate.position, rotation: mate.rotation });

          // Auto-create edge
          if (bestMatch.myPort.type === 'output') {
            addEdge(node.id, bestMatch.myPort.id, bestMatch.targetNode.id, bestMatch.targetPort.id);
          } else {
            addEdge(bestMatch.targetNode.id, bestMatch.targetPort.id, node.id, bestMatch.myPort.id);
          }
        }
      }
    }
    wasDragging.current = isDragging;
  }, [isDragging]);

  // Show ports for all nodes when something is selected, being dragged, or mate mode
  const showPorts = selectedObjectId !== null || isDragging || mateMode.active;

  const portVisuals = useMemo(() => {
    if (!showPorts) return [];

    const visuals: { position: [number, number, number]; type: 'input' | 'output'; nodeId: string; portId: string; connected: boolean }[] = [];

    processNodes.forEach((node: ProcessNode) => {
      const ports = getConnectionPorts(node.type, node.parameters);
      ports.forEach((port: ConnectionPort) => {
        const worldPos = getPortWorldPosition(port.localPosition, node);
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
      // Full 3D mate: move AND rotate the second object so ports align face-to-face
      const firstNode = processNodes.find(n => n.id === selectedPort.nodeId);
      const secondNode = processNodes.find(n => n.id === pv.nodeId);
      if (secondNode && firstNode) {
        const firstPorts = getConnectionPorts(firstNode.type, firstNode.parameters);
        const firstPort = firstPorts.find(p => p.id === selectedPort.portId);
        const secondPorts = getConnectionPorts(secondNode.type, secondNode.parameters);
        const secondPort = secondPorts.find(p => p.id === pv.portId);
        if (firstPort && secondPort) {
          // Get first port's world direction
          const firstWorldDir = localDirToWorld(
            firstPort.direction,
            firstNode.rotation,
          );
          // Solve: position + rotation for second node
          const mate = solveMateTransform(
            selectedPort.worldPosition,
            firstWorldDir,
            secondPort.localPosition,
            secondPort.direction,
            secondNode.scale,
          );
          updateObject(pv.nodeId, 'process', {
            position: mate.position,
            rotation: mate.rotation,
          });
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
      const dpWorld = getPortWorldPosition(dp.localPosition, draggedNode);

      for (const op of otherPorts) {
        // Only connect output->input
        if (dp.type === op.type) continue;

        // Check if already connected
        const alreadyConnected = edges.some(e =>
          (e.from === draggedNode.id && e.fromPort === dp.id && e.to === otherNode.id && e.toPort === op.id) ||
          (e.from === otherNode.id && e.fromPort === op.id && e.to === draggedNode.id && e.toPort === dp.id)
        );
        if (alreadyConnected) continue;

        const opWorld = getPortWorldPosition(op.localPosition, otherNode);

        const dist = Math.sqrt(
          (dpWorld[0] - opWorld[0]) ** 2 +
          (dpWorld[1] - opWorld[1]) ** 2 +
          (dpWorld[2] - opWorld[2]) ** 2
        );

        if (dist < SNAP_THRESHOLD) {
          // Calculate snap position: move dragged node so ports align (rotation-aware)
          const snapPos = alignNodeToPort(dp.localPosition, opWorld, draggedNode.rotation, draggedNode.scale);

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
