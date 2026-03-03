/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * SIMPLE APPROACH: 
 * 1. Clone the whole scene, scale it (body + original 2 legs all scale together)
 * 2. For additional legs: clone from INSIDE the already-scaled clone
 * 3. Original 2 legs stay visible and correct (they're part of the model!)
 * 4. Extra legs cloned from those, repositioned along Z
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
const END_OFFSET_M = 0.25;
const MAX_LEG_STATIONS = 30;

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

function findLegNodes(root: THREE.Object3D): THREE.Object3D[] {
  const results: THREE.Object3D[] = [];
  // Name-based search (Three.js converts spaces to underscores)
  root.traverse((node) => {
    if (node.name && node.name.toUpperCase().includes('LEG_SUPPORT')) {
      results.push(node);
    }
  });
  // Fallback: structure-based
  if (results.length === 0) {
    root.traverse((node) => {
      if (node.children.length >= 15 && node.children.length <= 20 && node !== root) {
        let has = false;
        node.traverse((s) => { if (s.name && (s.name.includes('0060885') || s.name.includes('0026574'))) has = true; });
        if (has) results.push(node);
      }
    });
  }
  return results;
}

function deepCloneNode(src: THREE.Object3D): THREE.Object3D {
  const clone = src.clone(true);
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(m => m.clone());
      } else if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return clone;
}

const BeltConveyorGLB: React.FC<Props> = ({ parameters, isSelected }) => {
  const gltf = useGLTF(MODEL_URL, DRACO_PATH);

  // Measure base model once
  const baseInfo = useMemo(() => {
    const scene = gltf.scene;
    const bbox = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Find legs in original to get their Z positions
    const legs = findLegNodes(scene);
    const legZPositions: number[] = [];
    for (const leg of legs) {
      const lb = new THREE.Box3().setFromObject(leg);
      const lc = new THREE.Vector3();
      lb.getCenter(lc);
      legZPositions.push(lc.z);
    }
    legZPositions.sort((a, b) => a - b); // sort by Z (most negative first)

    console.log(`[BeltConveyorGLB] Base: ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}, legs: ${legs.length} at Z=[${legZPositions.map(z => z.toFixed(2)).join(', ')}]`);

    return { baseWidth: size.x, baseHeight: size.y, baseLength: size.z, bbox, legZPositions };
  }, [gltf]);

  // Build parametric model
  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;
    const showLegs = parameters.showLegs !== false;

    const scaleL = targetL / baseInfo.baseLength;
    const scaleW = targetW / baseInfo.baseWidth;
    const scaleH = targetH / baseInfo.baseHeight;

    // Clone whole scene (includes body + original 2 legs)
    const root = deepCloneNode(gltf.scene);

    // Find legs inside the clone
    const clonedLegs = findLegNodes(root);

    if (!showLegs) {
      // Hide all legs
      clonedLegs.forEach(leg => { leg.visible = false; });
    }

    // Scale everything: X=width, Y=height, Z=length
    // Original legs scale WITH the body — they stay in correct position
    root.scale.set(scaleW, scaleH, scaleL);

    // Motor mirror
    if (motorSide === 'left') {
      root.traverse((node) => {
        if (node.name && (node.name.includes('0070544') || node.name.includes('0070311'))) {
          node.scale.x *= -1;
        }
      });
    }

    // === ADDITIONAL LEGS ===
    // Original model has 2 legs. We may need more based on support spacing.
    if (showLegs && clonedLegs.length > 0 && baseInfo.legZPositions.length >= 2) {
      const templateLeg = clonedLegs[0]; // use first leg as template
      const parentNode = templateLeg.parent!;

      // In the SCALED root, positions are in model space (root.scale applies on render).
      // The model Z goes from bbox.max.z (~0) to bbox.min.z (~-3.6)
      const zHead = baseInfo.bbox.max.z;
      const zTail = baseInfo.bbox.min.z;

      // End positions: 250mm from each end in OUTPUT space → convert to MODEL space
      const endOffsetModel = END_OFFSET_M / scaleL;
      const zDriveEnd = zHead - endOffsetModel;
      const zIdleEnd = zTail + endOffsetModel;

      // All desired leg positions in MODEL space
      const supportSpacingModel = supportSpacing / scaleL;
      const span = Math.abs(zDriveEnd - zIdleEnd);
      const numMiddle = span > supportSpacingModel
        ? Math.min(MAX_LEG_STATIONS - 2, Math.max(0, Math.floor(span / supportSpacingModel) - 1))
        : 0;

      const desiredZ: number[] = [zIdleEnd, zDriveEnd];
      if (numMiddle > 0) {
        const step = span / (numMiddle + 1);
        for (let i = 1; i <= numMiddle; i++) {
          desiredZ.push(zDriveEnd - step * i);
        }
      }

      // Remove positions that are close to existing legs (within 0.05m)
      const existingZ = baseInfo.legZPositions;
      const newPositions = desiredZ.filter(dz => {
        return !existingZ.some(ez => Math.abs(dz - ez) < 0.05);
      });

      console.log(`[BeltConveyorGLB] Adding ${newPositions.length} extra legs (${clonedLegs.length} original kept)`);

      // Template leg center Z in model space
      const templateBox = new THREE.Box3().setFromObject(templateLeg);
      const templateCenter = new THREE.Vector3();
      templateBox.getCenter(templateCenter);

      for (const targetZ of newPositions) {
        const newLeg = deepCloneNode(templateLeg);
        newLeg.visible = true;

        // Offset: shift from template Z to target Z (in model space)
        // The leg inherits its parent's local coordinate system
        // We need to shift relative to where the template is
        newLeg.position.z += (targetZ - templateCenter.z);

        // Counter-scale Z so the leg doesn't stretch
        // Parent has scale Z = scaleL, we want leg Z scale = 1 effectively
        // So set leg scale.z = 1/scaleL (cancels parent's Z scale)
        newLeg.scale.z = 1 / scaleL;

        parentNode.add(newLeg);
      }
    }

    // Wrap in group and center
    const group = new THREE.Group();
    group.add(root);

    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.set(-center.x, -bbox.min.y, -center.z);

    return group;
  }, [parameters, gltf, baseInfo]);

  // Selection highlight
  useEffect(() => {
    builtGroup.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.MeshStandardMaterial[]
          : [(child as THREE.Mesh).material as THREE.MeshStandardMaterial];
        for (const mat of mats) {
          if (mat.emissive) mat.emissive.set(isSelected ? '#333333' : '#000000');
        }
      }
    });
  }, [isSelected, builtGroup]);

  // Loaded space: X=width, Y=height(up), Z=length
  // Rotate +90° around Y to map Z(length) → X
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);

export default BeltConveyorGLB;
