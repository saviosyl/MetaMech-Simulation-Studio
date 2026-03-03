/**
 * BeltConveyorGLB — Directly loads and displays the real belt conveyor GLB model.
 * Dead simple. No builder chain. No fallbacks.
 *
 * Model: item belt conveyor (949KB, 94 meshes, 77 assembly parts)
 * Native axes: X=width(0.57m), Y=length(2.1m, -Y), Z=height(0.945m)
 * World axes:  X=length, Y=height(up), Z=width
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const BeltConveyorGLB: React.FC<Props> = ({ parameters, isSelected }) => {
  const gltf = useGLTF(MODEL_URL);

  // Extract only the conveyor assembly (skip camera node)
  const { model, origSize, origCenter, origMinZ } = useMemo(() => {
    const scene = gltf.scene;

    // Find the mesh group (node 1), skip camera (node 0)
    let target: THREE.Object3D = scene;
    for (const child of scene.children) {
      if ((child as any).isCamera || child instanceof THREE.Camera) continue;
      let hasMesh = false;
      child.traverse((n) => { if ((n as THREE.Mesh).isMesh) hasMesh = true; });
      if (hasMesh) { target = child; break; }
    }

    // Clone it
    const clone = target.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.set(1, 1, 1);

    // Enable shadows + clone materials
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (Array.isArray(mesh.material)) {
          mesh.material = mesh.material.map(m => m.clone());
        } else {
          mesh.material = (mesh.material as THREE.Material).clone();
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });

    // Measure
    const bbox = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    console.log('[BeltConveyorGLB] Model loaded ✓ Size:', size.x.toFixed(3), '×', size.y.toFixed(3), '×', size.z.toFixed(3));

    return { model: clone, origSize: size, origCenter: center, origMinZ: bbox.min.z };
  }, [gltf]);

  // Selection highlight
  useEffect(() => {
    model.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.MeshStandardMaterial[]
          : [(child as THREE.Mesh).material as THREE.MeshStandardMaterial];
        for (const mat of mats) {
          if (mat.emissive) {
            mat.emissive.set(isSelected ? '#333333' : '#000000');
          }
        }
      }
    });
  }, [isSelected, model]);

  // Parametric scaling
  const transforms = useMemo(() => {
    const targetW = (parameters.width ?? 600) / 1000;
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;

    const sx = targetW / origSize.x;
    const sy = targetL / origSize.y;
    const sz = targetH / origSize.z;

    // Center in model space, then we'll rotate to world space
    const px = -origCenter.x * sx;
    const py = -origCenter.y * sy;
    const pz = -origMinZ * sz; // bottom at Z=0

    return { sx, sy, sz, px, py, pz };
  }, [parameters, origSize, origCenter, origMinZ]);

  /*
   * Axis remapping:
   * Model: X=width(0.57), Y=length(2.1,-Y), Z=height(0.95)
   * World: X=length, Y=height, Z=width
   *
   * We rotate the outer group to remap axes.
   * -90° around X puts Z(height) → Y(up)
   * -90° around new Y swaps the remaining axes so length→X, width→Z
   */
  return (
    <group rotation={[-Math.PI / 2, -Math.PI / 2, 0]}>
      <primitive
        object={model}
        position={[transforms.px, transforms.py, transforms.pz]}
        scale={[transforms.sx, transforms.sy, transforms.sz]}
      />
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default BeltConveyorGLB;
