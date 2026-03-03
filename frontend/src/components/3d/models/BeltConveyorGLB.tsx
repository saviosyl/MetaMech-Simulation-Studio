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

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const BeltConveyorGLB: React.FC<Props> = ({ parameters, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Build the conveyor from parameters
  const built = useMemo(() => {
    const conveyorParams = editorParamsToConveyorParams(parameters);
    return buildConveyor(conveyorParams);
  }, [parameters]);

  // Selection highlight
  useEffect(() => {
    if (!built.root) return;
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

  return (
    <group ref={groupRef}>
      <primitive object={built.root} />
    </group>
  );
};

export default BeltConveyorGLB;
