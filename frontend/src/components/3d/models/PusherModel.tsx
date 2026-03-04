/**
 * PusherModel — Industrial pneumatic side-push diverter
 */
import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { buildPusher, PusherParams, PUSHER_DEFAULTS } from '../../../features/assets/parametric/modules/pusherBuilder';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const PusherModel: React.FC<Props> = ({ parameters, isSelected }) => {
  const built = useMemo(() => {
    const p: PusherParams = {
      enabled: parameters.enabled ?? PUSHER_DEFAULTS.enabled,
      side: parameters.side ?? PUSHER_DEFAULTS.side,
      strokeMm: parameters.stroke ?? parameters.strokeMm ?? PUSHER_DEFAULTS.strokeMm,
      plateWidthMm: parameters.plateWidth ?? PUSHER_DEFAULTS.plateWidthMm,
      plateHeightMm: parameters.plateHeight ?? PUSHER_DEFAULTS.plateHeightMm,
      mountHeightMm: parameters.mountHeight ?? parameters.height ?? PUSHER_DEFAULTS.mountHeightMm,
      extended: parameters.extended ?? PUSHER_DEFAULTS.extended,
    };
    return buildPusher(p);
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

  return <primitive object={built} />;
};

export default PusherModel;
