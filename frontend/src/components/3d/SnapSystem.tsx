import React, { useMemo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useEditorStore, getConnectionPorts, ProcessNode, EnvironmentAsset, ConnectionPort } from '../../store/editorStore';
import { getPortWorldPosition, alignNodeToPort, solveMateTransform, localDirToWorld } from '../../lib/nodeTransform';
import { findNearestConveyorSnap, isAccessoryType, isConveyorType, applyAccessorySnap } from '../../lib/accessorySnap';

const SNAP_THRESHOLD = 0.34;

function getAdaptivePortSize(ports: ConnectionPort[], mateModeActive: boolean): number {
  if (!ports.length) return mateModeActive ? 0.014 : 0.009;
  const box = new THREE.Box3();
  for (const port of ports) {
    const p = new THREE.Vector3(
      port.localPosition[0],
      port.localPosition[1],
      port.localPosition[2],
    );
    box.expandByPoint(p);
  }
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z);
  const base = Number.isFinite(span) && span > 0 ? span * 0.06 : 0.008;
  const clamped = THREE.MathUtils.clamp(base, 0.0035, 0.02);
  return mateModeActive ? clamped * 1.12 : clamped;
}

/** Types that should auto-match conveyor belt top height */
const MACHINE_TYPES = new Set([
  'machine', 'checkweigher', 'metal-detector', 'labeler', 'carton-erector',
  'case-packer', 'sealing-station', 'reject-station',
]);

const CONVEYOR_TYPES_SET = new Set([
  'conveyor', 'belt-conveyor', 'roller-conveyor', 'modular-conveyor-straight',
  'modular-conveyor-90-curve', 'modular-conveyor-45-curve', 'incline-conveyor',
  'pallet-conveyor', 'bend-conveyor', 'spiral-conveyor',
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
  if (nodeType === 'spiral-conveyor') return false;
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
  const [successPortKeys, setSuccessPortKeys] = useState<Set<string>>(new Set());
  const [hoveredPortKey, setHoveredPortKey] = useState<string | null>(null);
  const [invalidPortKey, setInvalidPortKey] = useState<string | null>(null);
  const previousEdgeCountRef = useRef(edges.length);

  // Merged list of all nodes that can have ports (process + environment)
  const allNodes: AnyNode[] = useMemo(
    () => [...processNodes, ...environmentAssets],
    [processNodes, environmentAssets],
  );

  useEffect(() => {
    if (edges.length > previousEdgeCountRef.current) {
      const lastEdge = edges[edges.length - 1];
      if (lastEdge) {
        const next = new Set<string>([
          `${lastEdge.from}-${lastEdge.fromPort}`,
          `${lastEdge.to}-${lastEdge.toPort}`,
        ]);
        setSuccessPortKeys(next);
        const timeoutId = setTimeout(() => setSuccessPortKeys(new Set()), 900);
        previousEdgeCountRef.current = edges.length;
        return () => {
          clearTimeout(timeoutId);
        };
      }
    }
    previousEdgeCountRef.current = edges.length;
  }, [edges]);

  useEffect(() => {
    if (!mateMode.active) {
      setHoveredPortKey(null);
      setInvalidPortKey(null);
      document.body.style.cursor = 'auto';
    }
  }, [mateMode.active]);

  const dragMatePreview = useMemo(() => {
    if (!isDragging || !selectedObjectId) return null;
    const moving = allNodes.find((entry) => entry.id === selectedObjectId);
    if (!moving) return null;

    const movingPorts = getConnectionPorts(moving.type, moving.parameters, (moving as any).assetId);
    if (movingPorts.length === 0) return null;

    const threshold = activeTool === 'snap-move' ? 0.22 : 0.14;
    let bestCompatible: { key: string; dist: number } | null = null;
    let bestInvalid: { key: string; dist: number } | null = null;

    for (const other of allNodes) {
      if (other.id === moving.id) continue;
      const otherPorts = getConnectionPorts(other.type, other.parameters, (other as any).assetId);
      for (const mp of movingPorts) {
        const mpWorld = getPortWorldPosition(mp.localPosition, moving as any);
        for (const op of otherPorts) {
          const opWorld = getPortWorldPosition(op.localPosition, other as any);
          const dx = mpWorld[0] - opWorld[0];
          const dy = mpWorld[1] - opWorld[1];
          const dz = mpWorld[2] - opWorld[2];
          const planarDist = Math.sqrt(dx * dx + dz * dz);
          const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const spiralPair = moving.type === 'spiral-conveyor' || other.type === 'spiral-conveyor';
          const usePlanarDist =
            spiralPair &&
            (isHeightAdjustableForSpiralMate(moving.type) || isHeightAdjustableForSpiralMate(other.type));
          const dist = usePlanarDist ? planarDist : dist3d;
          if (dist > threshold) continue;
          const key = `${other.id}-${op.id}`;
          if (mp.type !== op.type) {
            if (!bestCompatible || dist < bestCompatible.dist) bestCompatible = { key, dist };
          } else if (!bestInvalid || dist < bestInvalid.dist) {
            bestInvalid = { key, dist };
          }
        }
      }
    }

    return {
      previewPortKey: bestCompatible?.key || null,
      invalidPortKey: bestCompatible ? null : (bestInvalid?.key || null),
    };
  }, [isDragging, selectedObjectId, allNodes, activeTool]);

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
        const SNAP_DIST = activeTool === 'snap-move' ? 0.22 : 0.16;
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
              const spiralPair = node.type === 'spiral-conveyor' || other.type === 'spiral-conveyor';
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
  }, [isDragging, selectedObjectId, allNodes, processNodes, environmentAssets, activeTool, edges, updateObject, addEdge]);

  // Show ports for all nodes when something is selected, being dragged, or mate mode
  const showPorts = selectedObjectId !== null || isDragging || mateMode.active;

  const portVisuals = useMemo(() => {
    if (!showPorts) return [];

    const visuals: {
      position: [number, number, number];
      type: 'input' | 'output';
      nodeId: string;
      portId: string;
      connected: boolean;
      category: 'process' | 'environment';
      markerSize: number;
      state: 'available' | 'preview' | 'invalid' | 'success';
    }[] = [];

    // Process nodes
    processNodes.forEach((node: ProcessNode) => {
      const ports = getConnectionPorts(node.type, node.parameters, (node as any).assetId);
      const markerSize = getAdaptivePortSize(ports, mateMode.active);
      ports.forEach((port: ConnectionPort) => {
        const worldPos = getPortWorldPosition(port.localPosition, node);
        const connected = edges.some(e =>
          (e.from === node.id && e.fromPort === port.id) ||
          (e.to === node.id && e.toPort === port.id)
        );
        const key = `${node.id}-${port.id}`;
        const state: 'available' | 'preview' | 'invalid' | 'success' =
          successPortKeys.has(key)
            ? 'success'
            : dragMatePreview?.previewPortKey === key
              ? 'preview'
              : dragMatePreview?.invalidPortKey === key
                ? 'invalid'
                : 'available';
        visuals.push({
          position: worldPos,
          type: port.type,
          nodeId: node.id,
          portId: port.id,
          connected,
          category: 'process',
          markerSize,
          state,
        });
      });
    });

    // Environment assets (edge mate ports for walls, fences, etc.)
    environmentAssets.forEach((asset: EnvironmentAsset) => {
      const ports = getConnectionPorts(asset.type, asset.parameters, (asset as any).assetId);
      const markerSize = getAdaptivePortSize(ports, mateMode.active);
      ports.forEach((port: ConnectionPort) => {
        const worldPos = getPortWorldPosition(port.localPosition, asset as any);
        const key = `${asset.id}-${port.id}`;
        const state: 'available' | 'preview' | 'invalid' | 'success' =
          successPortKeys.has(key)
            ? 'success'
            : dragMatePreview?.previewPortKey === key
              ? 'preview'
              : dragMatePreview?.invalidPortKey === key
                ? 'invalid'
                : 'available';
        visuals.push({
          position: worldPos,
          type: port.type,
          nodeId: asset.id,
          portId: port.id,
          connected: false,
          category: 'environment',
          markerSize,
          state,
        });
      });
    });

    return visuals;
  }, [processNodes, environmentAssets, edges, showPorts, successPortKeys, dragMatePreview, mateMode.active]);

  const matePreview = useMemo(() => {
    if (!mateMode.active || !mateMode.selectedPort) return null;
    const selected = mateMode.selectedPort;
    let best: { pv: typeof portVisuals[number]; distance: number } | null = null;
    for (const pv of portVisuals) {
      if (pv.nodeId === selected.nodeId) continue;
      if (pv.type === selected.type) continue;
      const dx = pv.position[0] - selected.worldPosition[0];
      const dy = pv.position[1] - selected.worldPosition[1];
      const dz = pv.position[2] - selected.worldPosition[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d > 0.5) continue;
      if (!best || d < best.distance) best = { pv, distance: d };
    }
    return best;
  }, [mateMode.active, mateMode.selectedPort, portVisuals]);

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
      // Hard validation: only output<->input across different nodes.
      if (selectedPort.nodeId === pv.nodeId || selectedPort.type === pv.type) {
        const key = `${pv.nodeId}-${pv.portId}`;
        setInvalidPortKey(key);
        window.setTimeout(() => {
          setInvalidPortKey((curr) => (curr === key ? null : curr));
        }, 350);
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
        const portKey = `${pv.nodeId}-${pv.portId}`;
        const hovered = hoveredPortKey === portKey;
        const invalidPulse = invalidPortKey === portKey;
        const selectedPort = mateMode.selectedPort;
        const compatiblePreview = Boolean(
          mateMode.active
          && selectedPort
          && selectedPort.nodeId !== pv.nodeId
          && selectedPort.type !== pv.type
        );
        const nearMatePreview = Boolean(matePreview && matePreview.pv.nodeId === pv.nodeId && matePreview.pv.portId === pv.portId);

        const portSize = pv.state === 'preview'
          ? pv.markerSize * 1.2
          : pv.state === 'invalid'
            ? pv.markerSize * 1.1
            : pv.markerSize;
        const baseColor = pv.connected
          ? '#6b7280'
          : pv.type === 'input'
            ? '#2563eb'
            : '#16a34a';
        const stateColor = invalidPulse
          ? '#ef4444'
          : pv.state === 'success'
            ? '#22c55e'
            : pv.state === 'preview'
              ? '#f59e0b'
              : pv.state === 'invalid'
                ? '#ef4444'
                : nearMatePreview
                  ? '#22c55e'
                  : hovered
                    ? '#22d3ee'
                    : baseColor;
        const emissiveIntensity = selected
          ? 1.0
          : pv.state === 'success'
            ? 0.95
            : pv.state === 'preview'
              ? 0.9
              : pv.state === 'invalid' || invalidPulse
                ? 0.9
                : nearMatePreview
                  ? 0.92
                  : hovered
                    ? 0.92
                    : pv.connected
                      ? 0.1
                      : 0.5;
        const hitRadius = mateMode.active
          ? Math.max(portSize * 3.25, 0.045)
          : Math.max(portSize * 2.45, 0.03);
        return (
          <group key={`${pv.nodeId}-${pv.portId}`} position={pv.position}>
            {/* Larger invisible hit area keeps selection easy even with small premium icons */}
            <mesh
              onPointerDown={(e) => {
                if (!mateMode.active) return;
                e.stopPropagation();
                handlePortClick(pv);
              }}
              onPointerOver={(e) => {
                if (!mateMode.active) return;
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
                setHoveredPortKey(portKey);
              }}
              onPointerOut={() => {
                if (!mateMode.active) return;
                document.body.style.cursor = 'auto';
                setHoveredPortKey((prev) => (prev === portKey ? null : prev));
              }}
            >
              <sphereGeometry args={[hitRadius, 10, 8]} />
              <meshBasicMaterial transparent opacity={0} depthWrite={false} />
            </mesh>

            {/* Visible premium icon */}
            <mesh>
              {pv.type === 'input' ? (
                <sphereGeometry args={[portSize * 0.72, 12, 10]} />
              ) : (
                <octahedronGeometry args={[portSize * 0.78, 0]} />
              )}
              <meshStandardMaterial
                color={selected ? '#ffffff' : stateColor}
                emissive={selected ? '#06b6d4' : stateColor}
                emissiveIntensity={emissiveIntensity}
                transparent
                opacity={pv.connected ? 0.45 : 0.92}
              />
            </mesh>

            {/* Outer ring indicator */}
            {!pv.connected && (
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[portSize + 0.005, portSize + (selected || nearMatePreview ? 0.02 : 0.016), 18]} />
                <meshBasicMaterial
                  color={selected ? '#06b6d4' : stateColor}
                  transparent
                  opacity={selected ? 0.76 : nearMatePreview ? 0.74 : compatiblePreview ? 0.62 : pv.state === 'preview' ? 0.62 : pv.state === 'invalid' || invalidPulse ? 0.68 : pv.state === 'success' ? 0.64 : hovered ? 0.58 : 0.34}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Visual attach preview: shows likely pair to be mated */}
      {mateMode.active && mateMode.selectedPort && matePreview && (() => {
        const start = mateMode.selectedPort.worldPosition;
        const end = matePreview.pv.position;
        const dx = end[0] - start[0];
        const dy = end[1] - start[1];
        const dz = end[2] - start[2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-4) return null;
        const mid: [number, number, number] = [
          (start[0] + end[0]) / 2,
          (start[1] + end[1]) / 2,
          (start[2] + end[2]) / 2,
        ];
        const dir = new THREE.Vector3(dx / len, dy / len, dz / len);
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        return (
          <mesh position={mid} quaternion={quat}>
            <cylinderGeometry args={[0.012, 0.012, len, 12]} />
            <meshBasicMaterial color="#22c55e" transparent opacity={0.52} />
          </mesh>
        );
      })()}
    </group>
  );
};

// Utility function to check for snap and create connections
export function checkSnap(
  draggedNode: ProcessNode,
  allNodes: ProcessNode[],
  edges: { from: string; to: string; fromPort: string; toPort: string }[],
  options?: { snapThreshold?: number }
): {
  targetNodeId: string;
  targetPortId: string;
  dragPortId: string;
  snapPosition: [number, number, number];
  snapRotation?: [number, number, number];
  snapParameters?: Record<string, any>;
  distance: number;
  dragPortWorld: [number, number, number];
  targetPortWorld: [number, number, number];
} | null {
  const threshold = options?.snapThreshold ?? SNAP_THRESHOLD;
  let bestMatch: {
    targetNodeId: string;
    targetPortId: string;
    dragPortId: string;
    snapPosition: [number, number, number];
    snapRotation?: [number, number, number];
    snapParameters?: Record<string, any>;
    distance: number;
    dragPortWorld: [number, number, number];
    targetPortWorld: [number, number, number];
  } | null = null;

  for (const otherNode of allNodes) {
    if (otherNode.id === draggedNode.id) continue;
    const otherPorts = getConnectionPorts(otherNode.type, otherNode.parameters, (otherNode as any).assetId);

    for (const dp of getConnectionPorts(draggedNode.type, draggedNode.parameters, (draggedNode as any).assetId)) {
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
          draggedNode.type === 'spiral-conveyor' || otherNode.type === 'spiral-conveyor';
        const fullDist = Math.sqrt(
          (dpWorld[0] - opWorld[0]) ** 2 +
          (dpWorld[1] - opWorld[1]) ** 2 +
          (dpWorld[2] - opWorld[2]) ** 2
        );
        const usePlanarDist =
          spiralPair &&
          (isHeightAdjustableForSpiralMate(draggedNode.type) || isHeightAdjustableForSpiralMate(otherNode.type));
        const effectiveDist = usePlanarDist ? dist : fullDist;

        if (effectiveDist < threshold && (!bestMatch || effectiveDist < bestMatch.distance)) {
          const spiralConnection =
            draggedNode.type === 'spiral-conveyor' || otherNode.type === 'spiral-conveyor';

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
                (draggedNode as any).assetId,
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
            bestMatch = {
              targetNodeId: otherNode.id,
              targetPortId: op.id,
              dragPortId: dp.id,
              snapPosition: mate.position,
              snapRotation: mate.rotation,
              snapParameters,
              distance: effectiveDist,
              dragPortWorld: dpWorld,
              targetPortWorld: opWorld,
            };
            continue;
          }

          // Non-spiral behavior stays unchanged (position-only snap).
          const snapPos = alignNodeToPort(dp.localPosition, opWorld, draggedNode.rotation, draggedNode.scale);

          bestMatch = {
            targetNodeId: otherNode.id,
            targetPortId: op.id,
            dragPortId: dp.id,
            snapPosition: snapPos,
            distance: effectiveDist,
            dragPortWorld: dpWorld,
            targetPortWorld: opWorld,
          };
        }
      }
    }
  }

  return bestMatch;
}

export default SnapSystem;
