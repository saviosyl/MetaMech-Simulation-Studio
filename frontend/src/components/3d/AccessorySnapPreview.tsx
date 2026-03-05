/**
 * AccessorySnapPreview — Visual indicator during drag
 *
 * Shows a glowing ring/indicator on the conveyor where the
 * accessory will snap to. Only visible when dragging an accessory
 * near a conveyor.
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useEditorStore } from '../../store/editorStore';
import { findNearestConveyorSnap, isAccessoryType, isConveyorType, AccessorySnapResult } from '../../lib/accessorySnap';

const AccessorySnapPreview: React.FC = () => {
  const { processNodes, selectedObjectId, isDragging } = useEditorStore();
  const ringRef = React.useRef<THREE.Mesh>(null);
  const lineRef = React.useRef<THREE.Line>(null);
  const [snapResult, setSnapResult] = React.useState<AccessorySnapResult | null>(null);

  useFrame(() => {
    if (!isDragging || !selectedObjectId) {
      if (snapResult) setSnapResult(null);
      return;
    }

    const node = processNodes.find(n => n.id === selectedObjectId);
    if (!node || !isAccessoryType(node.type)) {
      if (snapResult) setSnapResult(null);
      return;
    }

    const conveyors = processNodes.filter(n => isConveyorType(n.type));
    const snap = findNearestConveyorSnap(node.position, conveyors, node.type);
    setSnapResult(snap);

    // Animate the ring
    if (ringRef.current && snap) {
      ringRef.current.rotation.y += 0.02;
    }
  });

  if (!snapResult) return null;

  const { snapPosition, snapRotationY, tangent, mountSide } = snapResult;

  // Conveyor highlight line (shows path segment near snap point)
  const arrowLen = 0.4;
  const arrowDir = new THREE.Vector3(tangent[0], 0, tangent[2]).normalize();

  return (
    <group>
      {/* Snap ring indicator */}
      <group position={snapPosition}>
        <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.12, 0.18, 24]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>

        {/* Inner glow */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.12, 24]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.15} side={THREE.DoubleSide} />
        </mesh>

        {/* Direction arrow */}
        <mesh
          position={[arrowDir.x * arrowLen / 2, 0.02, arrowDir.z * arrowLen / 2]}
          rotation={[0, snapRotationY, 0]}
        >
          <coneGeometry args={[0.05, 0.15, 8]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.6} />
        </mesh>

        {/* Side indicator label */}
        {mountSide !== 'center' && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <planeGeometry args={[0.5, 0.5]} />
            <meshBasicMaterial color="#22d3ee" transparent opacity={0.08} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>

      {/* Conveyor path highlight near snap point */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([
              snapPosition[0] - arrowDir.x * 0.5,
              snapPosition[1] + 0.02,
              snapPosition[2] - arrowDir.z * 0.5,
              snapPosition[0] + arrowDir.x * 0.5,
              snapPosition[1] + 0.02,
              snapPosition[2] + arrowDir.z * 0.5,
            ])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color="#22d3ee" transparent opacity={0.5} />
      </line>
    </group>
  );
};

export default AccessorySnapPreview;
