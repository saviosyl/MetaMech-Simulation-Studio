/**
 * BeltConveyorGLB — Parametric Conveyor Component
 *
 * Uses the new procedural parametric builder system.
 * Supports belt/roller/modular switching, procedural supports,
 * side guides, and proper snap points.
 */
import React, { useMemo, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { buildConveyor, editorParamsToConveyorParams } from '../../../features/assets/parametric/conveyor/conveyorBuilder';
import { buildSafeGroup } from '../../../lib/modelSafety';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const BeltConveyorGLB: React.FC<Props> = ({ parameters, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Build the conveyor from parameters — use JSON key to detect nested changes
  const paramKey = JSON.stringify(parameters);
  const buildFailureRef = useRef<string | null>(null);
  const built = useMemo(() => {
    try {
      const conveyorParams = editorParamsToConveyorParams(parameters);
      const result = buildConveyor(conveyorParams);
      const safeRoot = buildSafeGroup(
        'belt-conveyor-render-root',
        () => result.root,
        () => {
          const fallback = new THREE.Group();
          const body = new THREE.Mesh(
            new THREE.BoxGeometry(3, 0.7, 0.7),
            new THREE.MeshStandardMaterial({ color: 0x666666, wireframe: true }),
          );
          body.position.set(0, 0.35, 0);
          fallback.add(body);
          return fallback;
        },
      );
      result.root = safeRoot;
      buildFailureRef.current = null;
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      buildFailureRef.current = message;
      console.error('[BeltConveyorGLB] build failed, rendering safe fallback:', error);
      return null;
    }
  }, [paramKey]);

  // Selection highlight
  useEffect(() => {
    if (!built?.root) return;
    built.root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material)
          ? mesh.material as THREE.MeshStandardMaterial[]
          : [mesh.material as THREE.MeshStandardMaterial];
        for (const mat of mats) {
          if (mat.emissive) {
            mat.emissive.set(isSelected ? '#222222' : '#000000');
          }
        }
      }
    });
  }, [isSelected, built]);

  if (!built?.root) {
    return (
      <group ref={groupRef}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[3, 0.7, 0.7]} />
          <meshStandardMaterial color="#cc3344" wireframe />
        </mesh>
        <mesh position={[0, 0.38, 0]} castShadow>
          <boxGeometry args={[3.05, 0.02, 0.72]} />
          <meshStandardMaterial color="#3a3a3a" />
        </mesh>
      </group>
    );
  }

  return (
    <group ref={groupRef}>
      <primitive object={built.root} />
    </group>
  );
};

export default BeltConveyorGLB;
