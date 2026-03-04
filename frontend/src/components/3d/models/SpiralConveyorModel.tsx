/**
 * SpiralConveyorModel — Premium industrial spiral conveyor component
 */
import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { buildSpiralConveyor, editorParamsToSpiralParams } from '../../../features/assets/parametric/spiral/spiralBuilder';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const SpiralConveyorModel: React.FC<Props> = ({ parameters, isSelected }) => {
  const built = useMemo(() => {
    const spiralParams = editorParamsToSpiralParams(parameters);
    return buildSpiralConveyor(spiralParams);
  }, [parameters]);

  useEffect(() => {
    if (!built.root) return;
    built.root.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.MeshStandardMaterial[]
          : [(child as THREE.Mesh).material as THREE.MeshStandardMaterial];
        for (const mat of mats) {
          if (mat.emissive) mat.emissive.set(isSelected ? '#222222' : '#000000');
        }
      }
    });
  }, [isSelected, built]);

  return (
    <group>
      <primitive object={built.root} />
    </group>
  );
};

export default SpiralConveyorModel;
