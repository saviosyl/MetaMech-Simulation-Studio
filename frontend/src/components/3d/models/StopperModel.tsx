/**
 * StopperModel — Industrial pneumatic stop gate
 */
import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { buildStopper, StopperParams, STOPPER_DEFAULTS } from '../../../features/assets/parametric/modules/stopperBuilder';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const StopperModel: React.FC<Props> = ({ parameters, isSelected }) => {
  const built = useMemo(() => {
    const p: StopperParams = {
      enabled: parameters.enabled ?? STOPPER_DEFAULTS.enabled,
      engaged: parameters.engaged ?? STOPPER_DEFAULTS.engaged,
      widthMm: parameters.width ?? parameters.widthMm ?? STOPPER_DEFAULTS.widthMm,
      bladeHeightMm: parameters.bladeHeight ?? STOPPER_DEFAULTS.bladeHeightMm,
      mountHeightMm: parameters.mountHeight ?? parameters.height ?? STOPPER_DEFAULTS.mountHeightMm,
    };
    return buildStopper(p);
  }, [parameters]);

  useEffect(() => {
    built.traverse((child) => {
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

  const isMounted = !!parameters.parentConveyorId;

  return (
    <group>
      <primitive object={built} />
      {isMounted && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.1, 16]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default StopperModel;
