import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

import { ParametricAssetDef } from '../../lib/assetManifest';
import { runBuilder } from '../../lib/parametricBuilders';

interface ParametricModelProps {
  assetDef: ParametricAssetDef;
  parameters: Record<string, any>;
  isSelected: boolean;
  onClick: () => void;
}

const ParametricModel: React.FC<ParametricModelProps> = ({ assetDef, parameters, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);

  // Merge defaults with current params
  const mergedParams = useMemo(() => ({
    ...assetDef.defaults,
    ...parameters,
  }), [assetDef.defaults, parameters]);

  // Build the 3D group
  const builderResult = useMemo(() => {
    return runBuilder(assetDef.builder, mergedParams);
  }, [assetDef.builder, JSON.stringify(mergedParams)]);

  // Attach/detach the built group
  useEffect(() => {
    if (!groupRef.current || !builderResult) return;
    const parent = groupRef.current;

    // Clear previous children
    while (parent.children.length > 0) {
      const child = parent.children[0];
      parent.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry?.dispose();
        if (child.material instanceof THREE.Material) child.material.dispose();
      }
    }

    // Add new group's children
    const builtGroup = builderResult.group;
    while (builtGroup.children.length > 0) {
      parent.add(builtGroup.children[0]);
    }
  }, [builderResult]);

  if (!builderResult) {
    // Fallback box
    return (
      <group onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <mesh castShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color="#ff00ff" wireframe />
        </mesh>
      </group>
    );
  }

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <group ref={groupRef} />
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[
            Math.max(1.5, (builderResult.bounds.max.x - builderResult.bounds.min.x) / 2 + 0.2),
            Math.max(1.7, (builderResult.bounds.max.x - builderResult.bounds.min.x) / 2 + 0.4),
            32
          ]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default ParametricModel;
