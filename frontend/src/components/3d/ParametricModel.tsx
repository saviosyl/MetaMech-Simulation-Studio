import React, { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ParametricAssetDef } from '../../lib/assetManifest';
import { runBuilder } from '../../lib/parametricBuilders';
import { isBeltConveyorGLBReady } from '../../lib/parametricBuilders/beltConveyorGLBBuilder';

interface ParametricModelProps {
  assetDef: ParametricAssetDef;
  parameters: Record<string, any>;
  isSelected: boolean;
  onClick: () => void;
}

const ParametricModel: React.FC<ParametricModelProps> = ({ assetDef, parameters, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [glbReady, setGlbReady] = useState(isBeltConveyorGLBReady());

  // Poll for GLB readiness if this is a belt conveyor and GLB isn't loaded yet
  useFrame(() => {
    if (!glbReady && assetDef.builder === 'beltConveyorBuilder' && isBeltConveyorGLBReady()) {
      setGlbReady(true);
    }
  });

  // Merge defaults with current params
  const mergedParams = useMemo(() => ({
    ...assetDef.defaults,
    ...parameters,
  }), [assetDef.defaults, parameters]);

  // Build the 3D group — rebuilds when params change OR when GLB becomes available
  const builderResult = useMemo(() => {
    return runBuilder(assetDef.builder, mergedParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetDef.builder, JSON.stringify(mergedParams), glbReady]);

  // Attach/detach the built group
  useEffect(() => {
    if (!groupRef.current || !builderResult) return;
    const parent = groupRef.current;

    // Clear previous children and dispose resources
    while (parent.children.length > 0) {
      const child = parent.children[0];
      parent.remove(child);
      child.traverse?.((node: any) => {
        if (node instanceof THREE.Mesh) {
          node.geometry?.dispose();
          if (Array.isArray(node.material)) {
            node.material.forEach((m: THREE.Material) => m.dispose());
          } else if (node.material instanceof THREE.Material) {
            node.material.dispose();
          }
        }
      });
    }

    // Add new group's children
    const builtGroup = builderResult.group;
    while (builtGroup.children.length > 0) {
      parent.add(builtGroup.children[0]);
    }
  }, [builderResult]);

  if (!builderResult) {
    // Fallback box while loading
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
