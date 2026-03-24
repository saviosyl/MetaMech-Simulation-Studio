import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useEditorStore, getConnectionPorts, ProcessNode, EnvironmentAsset, ConnectionPort } from '../../store/editorStore';
import { getPortWorldPosition, alignNodeToPort, solveMateTransform, localDirToWorld } from '../../lib/nodeTransform';
import { findNearestConveyorSnap, isAccessoryType, isConveyorType, applyAccessorySnap } from '../../lib/accessorySnap';

const SNAP_THRESHOLD = 0.5;

/** Types that should auto-match conveyor belt top height */
const MACHINE_TYPES = new Set([
  'machine', 'checkweigher', 'metal-detector', 'labeler', 'carton-erector',
  'case-packer', 'sealing-station', 'reject-station',
]);

const CONVEYOR_TYPES_SET = new Set([
  'conveyor', 'belt-conveyor', 'roller-conveyor', 'modular-conveyor-straight',
  'modular-conveyor-90-curve', 'modular-conveyor-45-curve', 'incline-conveyor',
  'pallet-conveyor', 'bend-conveyor', 'spiral-conveyor', 'spiral-vyeor-conveyor',
  'transfer-bridge', 'popup-transfer', 'pusher-transfer', 'merge-divert', 'stainless-conveyor',
]);

/** Use the actual matched connection port height as the auto-height source. */
function getPortHeightMm(port: ConnectionPort): number {
  return port.localPosition[1] * 1000;
}

function getMachineConveyorHeightAdjustments(
  movingNode: ProcessNode,
  movingPort: ConnectionPort,
  fixedNode: ProcessNode,
  fixedPort: ConnectionPort,
): { movingParams: Record<string, any> | null; fixedParams: Record<string, any> | null } {
  // Machine connecting to conveyor: update moving machine infeed/outfeed to matched conveyor port height.
  if (MACHINE_TYPES.has(movingNode.type) && CONVEYOR_TYPES_SET.has(fixedNode.type)) {
    const beltTopMm = getPortHeightMm(fixedPort);
    if (movingPort.id === 'input') {
      return {
        movingParams: {
          infeedHeight: beltTopMm,
          outfeedHeight: movingNode.parameters?.outfeedHeight ?? beltTopMm,
        },
        fixedParams: null,
      };
    }
    return {
      movingParams: {
        outfeedHeight: beltTopMm,
        infeedHeight: movingNode.parameters?.infeedHeight ?? beltTopMm,
      },
      fixedParams: null,
    };
  }

  // Conveyor connecting to machine: update fixed machine side height to moving conveyor matched port height.
  if (MACHINE_TYPES.has(fixedNode.type) && CONVEYOR_TYPES_SET.has(movingNode.type)) {
    const beltTopMm = getPortHeightMm(movingPort);
    if (fixedPort.id === 'input') {
      return {
        movingParams: null,
        fixedParams: {
          infeedHeight: beltTopMm,
          outfeedHeight: fixedNode.parameters?.outfeedHeight ?? beltTopMm,
        },
      };
    }
    return {
      movingParams: null,
      fixedParams: {
        outfeedHeight: beltTopMm,
        infeedHeight: fixedNode.parameters?.infeedHeight ?? beltTopMm,
      },
    };
  }

  return { movingParams: null, fixedParams: null };
}

function isHeightAdjustableForSpiralMate(nodeType: string): boolean {
  // Exclude spiral itself; the non-spiral counterpart should adapt to the spiral endpoint.
  if (nodeType === 'spiral-conveyor' || nodeType === 'spiral-vyeor-conveyor') return false;
  return CONVEYOR_TYPES_SET.has(nodeType) || MACHINE_TYPES.has(nodeType);
}

function getSpiralHeightAdjustments(
  movingNode: ProcessNode,
  movingPort: ConnectionPort,
  fixedNode: ProcessNode,
  fixedPort: ConnectionPort,
): { movingParams: Record<string, any> | null; fixedParams: Record<string, any> | null } {
  // Spiral mating should be transform-driven (position + rotation solve) only.
  // Forcing non-spiral infeed/outfeedHeight here can double-apply height:
  // once via node world Y and again via local port Y.
  void movingNode;
  void movingPort;
  void fixedNode;
  void fixedPort;
  return { movingParams: null, fixedParams: null };
}

/** Unified node shape that both ProcessNode and EnvironmentAsset satisfy */
type AnyNode = ProcessNode | EnvironmentAsset;

/** Determine which store category an object belongs to */
function nodeCategory(id: string, processNodesList: ProcessNode[], _environmentAssetsList: EnvironmentAsset[]): 'process' | 'environment' {
  if (processNodesList.some(n => n.id === id)) return 'process';
  return 'environment';
}

const SnapSystem: React.FC = () => {
  const { processNodes, environmentAssets, edges, selectedObjectId, isDragging, mateMode, activeTool, setMateSelectedPort, addEdge, updateObject } = useEditorStore();
  const wasDragging = useRef(false);

  // Merged list of all nodes that can have ports (process + environment)
  const allNodes: AnyNode[] = useMemo(
    () => [...processNodes, ...environmentAssets],
    [processNodes, environmentAssets],
  );

  // Auto-snap on drag end: accessory snap + snap-move port proximity snap
  useEffect(() => {
    if (wasDragging.current && !isDragging && selectedObjectId) {
      const node = allNodes.find(n => n.id === selectedObjectId);
      if (!node) { wasDragging.current = false; return; }
      const cat = nodeCategory(node.id, processNodes, environmentAssets);

      // Accessory snap (process nodes only)
      if (cat === 'process' && isAccessoryType(node.type)) {
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
      // Works for both process nodes AND environment assets (wall-to-wall, fence-to-fence, etc.)
      {
        const SNAP_DIST = activeTool === 'snap-move' ? 0.15 : 0.1;
        const myPorts = getConnectionPorts(node.type, node.parameters, (node as any).assetId);
        let bestDist = SNAP_DIST;
        let bestMatch: { myPort: ConnectionPort; targetNode: AnyNode; targetPort: ConnectionPort; targetWorldPos: [number, number, number]; targetWorldDir: [number, number, number] } | null = null;

        for (const other of allNodes) {
          if (other.id === node.id) continue;
          const otherPorts = getConnectionPorts(other.type, other.parameters, (other as any).assetId);
          for (const mp of myPorts) {
            const mpWorld = getPortWorldPosition(mp.localPosition, node as any);
            for (const op of otherPorts) {
              if (mp.type === op.type) continue;
              const opWorld = getPortWorldPosition(op.localPosition, other as any);
              const dx = mpWorld[0] - opWorld[0];
              const dy = mpWorld[1] - opWorld[1];
              const dz = mpWorld[2] - opWorld[2];
              const planarDist = Math.sqrt(dx * dx + dz * dz);
              const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
              const spiralPair =
                node.type === 'spiral-conveyor' ||
                node.type === 'spiral-vyeor-conveyor' ||
                other.type === 'spiral-conveyor' ||
                other.type === 'spiral-vyeor-conveyor';
              const usePlanarDist =
                spiralPair &&
                (isHeightAdjustableForSpiralMate(node.type) || isHeightAdjustableForSpiralMate(other.type));
              const dist = usePlanarDist ? planarDist : dist3d;
              if (dist < bestDist) {
                bestDist = dist;
                const opWorldDir = localDirToWorld(op.direction, other.rotation);
                bestMatch = { myPort: mp, targetNode: other, targetPort: op, targetWorldPos: opWorld, targetWorldDir: opWorldDir };
              }
            }
          }
        }

        if (bestMatch) {
          // Auto-height: if a machine is connecting to a conveyor, match belt top height
          const targetCat = nodeCategory(bestMatch.targetNode.id, processNodes, environmentAssets);
          let extraParams: Record<string, any> | null = null;
          if (cat === 'process' && targetCat === 'process') {
            const targetAsProcess = bestMatch.targetNode as ProcessNode;
            const nodeAsProcess = node as ProcessNode;
            const spiralAdjust = getSpiralHeightAdjustments(
              nodeAsProcess,
              bestMatch.myPort,
              targetAsProcess,
              bestMatch.targetPort,
            );
            const baseAdjust = spiralAdjust.movingParams || spiralAdjust.fixedParams
              ? spiralAdjust
              : getMachineConveyorHeightAdjustments(
                  nodeAsProcess,
                  bestMatch.myPort,
                  targetAsProcess,
                  bestMatch.targetPort,
                );
            const { movingParams, fixedParams } = baseAdjust;
            if (movingParams) {
              extraParams = movingParams;
            }
            if (fixedParams) {
              updateObject(targetAsProcess.id, 'process', { parameters: { ...targetAsProcess.parameters, ...fixedParams } });
            }
          }

          // Recompute ports if we changed params (so mate uses updated port positions)
          const nodePorts = extraParams
            ? getConnectionPorts(node.type, { ...node.parameters, ...extraParams }, (node as any).assetId)
            : null;
          const myPortUpdated = nodePorts ? (nodePorts.find(p => p.id === bestMatch!.myPort.id) || bestMatch.myPort) : bestMatch.myPort;

          const mate = solveMateTransform(
            bestMatch.targetWorldPos,
            bestMatch.targetWorldDir,
            myPortUpdated.localPosition,
            myPortUpdated.direction,
            node.scale,
          );
          const updates: Record<string, any> = { position: mate.position, rotation: mate.rotation };
          if (extraParams) {
            updates.parameters = { ...node.parameters, ...extraParams };
          }
          updateObject(node.id, cat, updates);

          // Auto-create edge (only for process→process connections)
          if (cat === 'process' && targetCat === 'process') {
            if (bestMatch.myPort.type === 'output') {
              addEdge(node.id, bestMatch.myPort.id, bestMatch.targetNode.id, bestMatch.targetPort.id);
            } else {
              addEdge(bestMatch.targetNode.id, bestMatch.targetPort.id, node.id, bestMatch.myPort.id);
            }
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

    const visuals: { position: [number, number, number]; type: 'input' | 'output'; nodeId: string; portId: string; connected: boolean; category: 'process' | 'environment' }[] = [];

    // Process nodes
    processNodes.forEach((node: ProcessNode) => {
      const ports = getConnectionPorts(node.type, node.parameters, (node as any).assetId);
      ports.forEach((port: ConnectionPort) => {
        const worldPos = getPortWorldPosition(port.localPosition, node);
        const connected = edges.some(e =>
          (e.from === node.id && e.fromPort === port.id) ||
          (e.to === node.id && e.toPort === port.id)
        );
        visuals.push({ position: worldPos, type: port.type, nodeId: node.id, portId: port.id, connected, category: 'process' });
      });
    });

    // Environment assets (edge mate ports for walls, fences, etc.)
    environmentAssets.forEach((asset: EnvironmentAsset) => {
      const ports = getConnectionPorts(asset.type, asset.parameters, (asset as any).assetId);
      ports.forEach((port: ConnectionPort) => {
        const worldPos = getPortWorldPosition(port.localPosition, asset as any);
        visuals.push({ position: worldPos, type: port.type, nodeId: asset.id, portId: port.id, connected: false, category: 'environment' });
      });
    });

    return visuals;
  }, [processNodes, environmentAssets, edges, showPorts]);

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
      // Works for both process nodes AND environment assets
      const firstNode = allNodes.find(n => n.id === selectedPort.nodeId);
      const secondNode = allNodes.find(n => n.id === pv.nodeId);
      if (secondNode && firstNode) {
        const firstCat = nodeCategory(selectedPort.nodeId, processNodes, environmentAssets);
        const secondCat = nodeCategory(pv.nodeId, processNodes, environmentAssets);
        const firstPorts = getConnectionPorts(firstNode.type, firstNode.parameters, (firstNode as any).assetId);
        const firstPort = firstPorts.find(p => p.id === selectedPort.portId);
        const secondPorts = getConnectionPorts(secondNode.type, secondNode.parameters, (secondNode as any).assetId);
        const secondPort = secondPorts.find(p => p.id === pv.portId);
        if (firstPort && secondPort) {
          let secondPortForMate = secondPort;
          let secondParamsUpdate: Record<string, any> | null = null;
          if (firstCat === 'process' && secondCat === 'process') {
            const firstAsProcess = firstNode as ProcessNode;
            const secondAsProcess = secondNode as ProcessNode;
            const spiralAdjust = getSpiralHeightAdjustments(
              secondAsProcess,
              secondPort,
              firstAsProcess,
              firstPort,
            );
            const baseAdjust = spiralAdjust.movingParams || spiralAdjust.fixedParams
              ? spiralAdjust
              : getMachineConveyorHeightAdjustments(
                  secondAsProcess,
                  secondPort,
                  firstAsProcess,
                  firstPort,
                );
            const { movingParams, fixedParams } = baseAdjust;
            if (movingParams) {
              secondParamsUpdate = movingParams;
              const recomputedPorts = getConnectionPorts(
                secondNode.type,
                { ...secondNode.parameters, ...movingParams },
                (secondNode as any).assetId,
              );
              secondPortForMate = recomputedPorts.find(p => p.id === pv.portId) || secondPort;
            }
            if (fixedParams) {
              updateObject(firstAsProcess.id, 'process', { parameters: { ...firstAsProcess.parameters, ...fixedParams } });
            }
          }
          const firstWorldDir = localDirToWorld(
            firstPort.direction,
            firstNode.rotation,
          );
          const mate = solveMateTransform(
            selectedPort.worldPosition,
            firstWorldDir,
            secondPortForMate.localPosition,
            secondPortForMate.direction,
            secondNode.scale,
          );
          const updates: Record<string, any> = {
            position: mate.position,
            rotation: mate.rotation,
          };
          if (secondParamsUpdate) {
            updates.parameters = { ...secondNode.parameters, ...secondParamsUpdate };
          }
          updateObject(pv.nodeId, secondCat, updates);
        }
      }

      // Create edge: output -> input (only for process↔process)
      const firstCat = nodeCategory(selectedPort.nodeId, processNodes, environmentAssets);
      const secondCat = nodeCategory(pv.nodeId, processNodes, environmentAssets);
      if (firstCat === 'process' && secondCat === 'process') {
        if (selectedPort.type === 'output') {
          addEdge(selectedPort.nodeId, selectedPort.portId, pv.nodeId, pv.portId);
        } else {
          addEdge(pv.nodeId, pv.portId, selectedPort.nodeId, selectedPort.portId);
        }
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
                color={selected ? '#ffffff' : pv.connected ? '#6b7280' : pv.category === 'environment' ? '#f59e0b' : pv.type === 'input' ? '#3b82f6' : '#10b981'}
                emissive={selected ? '#06b6d4' : pv.connected ? '#333333' : pv.category === 'environment' ? '#f59e0b' : pv.type === 'input' ? '#3b82f6' : '#10b981'}
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
                  color={selected ? '#06b6d4' : pv.category === 'environment' ? '#f59e0b' : pv.type === 'input' ? '#3b82f6' : '#10b981'}
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
): {
  targetNodeId: string;
  targetPortId: string;
  dragPortId: string;
  snapPosition: [number, number, number];
  snapRotation?: [number, number, number];
  snapParameters?: Record<string, any>;
} | null {
  for (const otherNode of allNodes) {
    if (otherNode.id === draggedNode.id) continue;
    const otherPorts = getConnectionPorts(otherNode.type, otherNode.parameters);

    for (const dp of getConnectionPorts(draggedNode.type, draggedNode.parameters)) {
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
          (dpWorld[2] - opWorld[2]) ** 2
        );
        const spiralPair =
          draggedNode.type === 'spiral-conveyor' ||
          draggedNode.type === 'spiral-vyeor-conveyor' ||
          otherNode.type === 'spiral-conveyor' ||
          otherNode.type === 'spiral-vyeor-conveyor';
        const fullDist = Math.sqrt(
          (dpWorld[0] - opWorld[0]) ** 2 +
          (dpWorld[1] - opWorld[1]) ** 2 +
          (dpWorld[2] - opWorld[2]) ** 2
        );
        const usePlanarDist =
          spiralPair &&
          (isHeightAdjustableForSpiralMate(draggedNode.type) || isHeightAdjustableForSpiralMate(otherNode.type));
        const effectiveDist = usePlanarDist ? dist : fullDist;

        if (effectiveDist < SNAP_THRESHOLD) {
          const spiralConnection =
            draggedNode.type === 'spiral-conveyor' ||
            draggedNode.type === 'spiral-vyeor-conveyor' ||
            otherNode.type === 'spiral-conveyor' ||
            otherNode.type === 'spiral-vyeor-conveyor';

          // Spiral connections should align inline with the spiral tangent direction.
          if (spiralConnection) {
            let adjustedDp = dp;
            let snapParameters: Record<string, any> | undefined;
            const spiralAdjust = getSpiralHeightAdjustments(
              draggedNode,
              dp,
              otherNode,
              op,
            );
            if (spiralAdjust.movingParams) {
              snapParameters = spiralAdjust.movingParams;
              const updatedPorts = getConnectionPorts(
                draggedNode.type,
                { ...draggedNode.parameters, ...spiralAdjust.movingParams },
              );
              adjustedDp = updatedPorts.find(p => p.id === dp.id) || dp;
            }
            const opWorldDir = localDirToWorld(op.direction, otherNode.rotation);
            const mate = solveMateTransform(
              opWorld,
              opWorldDir,
              adjustedDp.localPosition,
              adjustedDp.direction,
              draggedNode.scale,
            );
            return {
              targetNodeId: otherNode.id,
              targetPortId: op.id,
              dragPortId: dp.id,
              snapPosition: mate.position,
              snapRotation: mate.rotation,
              snapParameters,
            };
          }

          // Non-spiral behavior stays unchanged (position-only snap).
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
