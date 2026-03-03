/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * KEY INSIGHT: Legs are added inside the scaled root, cloned from a
 * sibling leg. Position offset uses MODEL-SPACE coordinates only
 * (from the unscaled original), applied to the leg's LOCAL position.
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
  root.traverse((node) => {
    if (node.name && node.name.toUpperCase().includes('LEG_SUPPORT')) {
      results.push(node);
    }
  });
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

  // Measure base model ONCE from the unscaled original
  const baseInfo = useMemo(() => {
    const scene = gltf.scene;
    const bbox = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    bbox.getSize(size);

    // Find legs and record both their BOUNDS CENTER and LOCAL POSITION
    const legs = findLegNodes(scene);
    const legData: { centerZ: number; posZ: number }[] = [];
    for (const leg of legs) {
      const lb = new THREE.Box3().setFromObject(leg);
      const lc = new THREE.Vector3();
      lb.getCenter(lc);
      legData.push({ centerZ: lc.z, posZ: leg.position.z });
    }
    legData.sort((a, b) => a.centerZ - b.centerZ);

    console.log(`[BeltConveyorGLB] Base: ${size.x.toFixed(2)}×${size.y.toFixed(2)}×${size.z.toFixed(2)}, legs: ${legs.length}`);
    legData.forEach((d, i) => console.log(`  Leg ${i}: center.z=${d.centerZ.toFixed(3)}, position.z=${d.posZ.toFixed(3)}`));

    return { baseWidth: size.x, baseHeight: size.y, baseLength: size.z, bbox, legData };
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

    // Clone whole scene
    const root = deepCloneNode(gltf.scene);
    const clonedLegs = findLegNodes(root);

    if (!showLegs) {
      clonedLegs.forEach(leg => { leg.visible = false; });
    }

    // Scale everything
    root.scale.set(scaleW, scaleH, scaleL);

    // Motor mirror
    if (motorSide === 'left') {
      root.traverse((node) => {
        if (node.name && (node.name.includes('0070544') || node.name.includes('0070311'))) {
          node.scale.x *= -1;
        }
      });
    }

    // === EXTRA LEGS ===
    if (showLegs && clonedLegs.length > 0 && baseInfo.legData.length > 0) {
      const templateLeg = clonedLegs[0];
      const parentNode = templateLeg.parent!;

      // Use the ORIGINAL (unscaled) data for all position math
      const templateCenterZ = baseInfo.legData[0].centerZ; // bounds center in model space
      const templatePosZ = baseInfo.legData[0].posZ;        // local position in model space

      // The offset between local position and bounds center (internal structure offset)
      const internalOffset = templateCenterZ - templatePosZ;

      // Model space: Z goes from bbox.max.z (~0) to bbox.min.z (~-3.6)
      const zHead = baseInfo.bbox.max.z;
      const zTail = baseInfo.bbox.min.z;

      // Desired leg CENTER positions in MODEL space
      // 250mm from each end (in output space → divide by scaleL for model space)
      const endOffsetModel = END_OFFSET_M / scaleL;
      const zDriveCenter = zHead - endOffsetModel;
      const zIdleCenter = zTail + endOffsetModel;

      // Middle legs
      const supportSpacingModel = supportSpacing / scaleL;
      const span = Math.abs(zDriveCenter - zIdleCenter);
      const numMiddle = span > supportSpacingModel
        ? Math.min(MAX_LEG_STATIONS - 2, Math.max(0, Math.floor(span / supportSpacingModel) - 1))
        : 0;

      const desiredCenters: number[] = [zIdleCenter, zDriveCenter];
      if (numMiddle > 0) {
        const step = span / (numMiddle + 1);
        for (let i = 1; i <= numMiddle; i++) {
          desiredCenters.push(zDriveCenter - step * i);
        }
      }

      // Filter out positions close to existing legs (< 0.1m in model space)
      const existingCenters = baseInfo.legData.map(d => d.centerZ);
      const newCenters = desiredCenters.filter(dc =>
        !existingCenters.some(ec => Math.abs(dc - ec) < 0.1)
      );

      console.log(`[BeltConveyorGLB] ${newCenters.length} extra legs needed (${existingCenters.length} originals kept)`);

      for (const targetCenterZ of newCenters) {
        const newLeg = deepCloneNode(templateLeg);
        newLeg.visible = true;

        // Convert desired CENTER position to LOCAL position:
        // localPosZ = targetCenterZ - internalOffset
        newLeg.position.z = targetCenterZ - internalOffset;

        parentNode.add(newLeg);
      }
    }

    // Wrap and center
    const group = new THREE.Group();
    group.add(root);
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.set(-center.x, -bbox.min.y, -center.z);

    return group;
  }, [parameters, gltf, baseInfo]);

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

  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);

export default BeltConveyorGLB;
