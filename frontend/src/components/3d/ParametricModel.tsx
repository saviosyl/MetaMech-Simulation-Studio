import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { ParametricAssetDef } from '../../lib/assetManifest';
import { runBuilder, getBuilderRenderVersion, validateBuilderResult } from '../../lib/parametricBuilders';
import { isBeltConveyorGLBReady } from '../../lib/parametricBuilders/beltConveyorGLBBuilder';

interface ParametricModelProps {
  assetDef: ParametricAssetDef;
  parameters: Record<string, any>;
  isSelected: boolean;
  onClick: () => void;
}

const ParametricModel: React.FC<ParametricModelProps> = ({ assetDef, parameters, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  // Track GLB readiness with a version counter to force rebuilds
  const [buildVersion, setBuildVersion] = useState(0);
  const glbWasReady = useRef(isBeltConveyorGLBReady());

  // Poll every frame: if GLB just became ready, bump version to force rebuild
  useFrame(() => {
    if (!glbWasReady.current && isBeltConveyorGLBReady()) {
      glbWasReady.current = true;
      setBuildVersion(v => v + 1);
    }
  });

  // Merge defaults with current params
  const mergedParams = useMemo(() => ({
    ...assetDef.defaults,
    ...parameters,
  }), [assetDef.defaults, parameters]);

  const builderRenderVersion = useMemo(() => getBuilderRenderVersion(assetDef.builder), [assetDef.builder]);

  // Build the 3D group — rebuilds when params change OR when source assets become available
  const builderResult = useMemo(() => {
    const result = runBuilder(assetDef.builder, mergedParams);
    if (!result) return null;
    if (!validateBuilderResult(assetDef.builder, result)) return null;
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetDef.builder, JSON.stringify(mergedParams), buildVersion, builderRenderVersion]);

  // Safely detach old children (without disposing shared GLB geometries)
  const clearGroup = useCallback((parent: THREE.Group) => {
    while (parent.children.length > 0) {
      const child = parent.children[0];
      parent.remove(child);
    }
  }, []);

  // Attach the built group
  useEffect(() => {
    if (!groupRef.current || !builderResult) return;
    const parent = groupRef.current;

    // Remove previous children
    clearGroup(parent);

    // Add new group's children
    const builtGroup = builderResult.group;
    while (builtGroup.children.length > 0) {
      parent.add(builtGroup.children[0]);
    }
  }, [builderResult, clearGroup]);

  if (!builderResult) {
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
