import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
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

  // Build the 3D group — rebuilds when params change OR when GLB becomes available
  const builderResult = useMemo(() => {
    return runBuilder(assetDef.builder, mergedParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetDef.builder, JSON.stringify(mergedParams), buildVersion]);

  const selectionBounds = useMemo(() => {
    if (!builderResult) return null;
    const min = builderResult.bounds.min;
    const max = builderResult.bounds.max;
    const padding = 0.03;
    const size: [number, number, number] = [
      Math.max(0.03, (max.x - min.x) + padding),
      Math.max(0.03, (max.y - min.y) + padding),
      Math.max(0.03, (max.z - min.z) + padding),
    ];
    const center: [number, number, number] = [
      (min.x + max.x) / 2,
      (min.y + max.y) / 2,
      (min.z + max.z) / 2,
    ];
    return { size, center };
  }, [builderResult]);

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
      onPointerDown={(e) => { e.stopPropagation(); onClick(); }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <group ref={groupRef} />
      {isSelected && selectionBounds && (
        <group position={selectionBounds.center}>
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...selectionBounds.size)]} />
            <lineBasicMaterial color="#38bdf8" transparent opacity={0.95} />
          </lineSegments>
          <mesh>
            <boxGeometry args={selectionBounds.size} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.04} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default ParametricModel;
