import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface GLBModelProps {
  url: string;
  targetSize?: number;
  isSelected: boolean;
}

const GLBModel: React.FC<GLBModelProps> = ({ url, targetSize = 2, isSelected }) => {
  const { scene } = useGLTF(url);

  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    
    // Compute bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);

    // Center
    clone.position.sub(center);
    clone.position.y += size.y / 2; // sit on ground

    // Scale to target size
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const s = targetSize / maxDim;
      clone.scale.multiplyScalar(s);
      clone.position.multiplyScalar(s);
    }

    // Apply selection emissive
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          if (isSelected) {
            mat.emissive = new THREE.Color('#222222');
          }
          mesh.material = mat;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      }
    });

    return clone;
  }, [scene, targetSize, isSelected]);

  return <primitive object={clonedScene} />;
};

export default GLBModel;
