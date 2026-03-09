/**
 * SpiralConveyorModel — Uses uploaded GLB model with parametric scaling
 *
 * The GLB is loaded once and cloned per instance. Scale is driven by
 * totalHeight, diameter, and turns parameters.
 */
import React, { useMemo, useEffect, useRef, Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as THREE from 'three';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

/** Fallback while GLB loads */
const SpiralFallback: React.FC<{ height: number; diameter: number }> = ({ height, diameter }) => (
  <mesh>
    <cylinderGeometry args={[diameter / 2, diameter / 2, height, 24]} />
    <meshStandardMaterial color="#6b7280" transparent opacity={0.3} wireframe />
  </mesh>
);

const SpiralConveyorGLB: React.FC<Props> = ({ parameters, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);
  const gltf = useLoader(GLTFLoader, '/models/spiral-conveyor.glb');

  // Parameters
  const totalHeight = (parameters.totalHeight || 3000) / 1000;
  const diameter = (parameters.diameter || 1800) / 1000;
  const direction = parameters.direction || 'up';

  // Clone the scene so each instance is independent
  const clonedScene = useMemo(() => {
    const scene = gltf.scene.clone(true);
    // Compute the original model's bounding box to get its native size
    const bbox = new THREE.Box3().setFromObject(scene);
    const nativeSize = new THREE.Vector3();
    bbox.getSize(nativeSize);

    // Scale to match target dimensions
    const scaleY = totalHeight / Math.max(nativeSize.y, 0.01);
    const scaleXZ = diameter / Math.max(Math.max(nativeSize.x, nativeSize.z), 0.01);
    scene.scale.set(scaleXZ, scaleY, scaleXZ);

    // Center at origin, base at Y=0
    const scaledBbox = new THREE.Box3().setFromObject(scene);
    const center = new THREE.Vector3();
    scaledBbox.getCenter(center);
    scene.position.set(-center.x, -scaledBbox.min.y, -center.z);

    // Flip for down direction
    if (direction === 'down') {
      scene.rotation.z = Math.PI;
      scene.position.y = totalHeight;
    }

    // Enable shadows
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });

    return scene;
  }, [gltf, totalHeight, diameter, direction]);

  // Selection highlight
  useEffect(() => {
    if (!clonedScene) return;
    clonedScene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? ((child as THREE.Mesh).material as THREE.MeshStandardMaterial[])
          : [(child as THREE.Mesh).material as THREE.MeshStandardMaterial];
        for (const mat of mats) {
          if (mat.emissive) mat.emissive.set(isSelected ? '#222222' : '#000000');
        }
      }
    });
  }, [isSelected, clonedScene]);

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
};

const SpiralConveyorModel: React.FC<Props> = (props) => {
  const h = (props.parameters.totalHeight || 3000) / 1000;
  const d = (props.parameters.diameter || 1800) / 1000;
  return (
    <Suspense fallback={<SpiralFallback height={h} diameter={d} />}>
      <SpiralConveyorGLB {...props} />
    </Suspense>
  );
};

export default SpiralConveyorModel;
