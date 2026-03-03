/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * Strategy: Clone legs from INSIDE the clone (not from original scene).
 * This preserves all transforms, rotations, and parent relationships.
 * No counter-scaling needed — just shift position.z.
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
        node.traverse((s) => {
          if (s.name && (s.name.includes('0060885') || s.name.includes('0026574'))) has = true;
        });
        if (has) results.push(node);
      }
    });
  }
  return results;
}

function deepClone(src: THREE.Object3D): THREE.Object3D {
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

  // Measure BODY-ONLY bounds (exclude legs)
  const baseInfo = useMemo(() => {
    const scene = gltf.scene;
    const legs = findLegNodes(scene);
    const legNameSet = new Set(legs.map(l => l.name));

    let assembly: THREE.Object3D | null = null;
    for (const child of scene.children) {
      if (child.children.length > 10) { assembly = child; break; }
    }

    const bodyBBox = new THREE.Box3();
    if (assembly) {
      for (const child of assembly.children) {
        if (legNameSet.has(child.name)) continue;
        const cb = new THREE.Box3().setFromObject(child);
        if (!cb.isEmpty()) bodyBBox.union(cb);
      }
    }

    const bodySize = new THREE.Vector3();
    bodyBBox.getSize(bodySize);

    console.log(`[BeltConveyorGLB] BODY: ${bodySize.x.toFixed(3)}W × ${bodySize.y.toFixed(3)}H × ${bodySize.z.toFixed(3)}L`);
    console.log(`[BeltConveyorGLB] Body Z: ${bodyBBox.min.z.toFixed(3)} → ${bodyBBox.max.z.toFixed(3)}`);

    return { bodyWidth: bodySize.x, bodyHeight: bodySize.y, bodyLength: bodySize.z, bodyBBox };
  }, [gltf]);

  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;
    const showLegs = parameters.showLegs !== false;

    const scaleL = targetL / baseInfo.bodyLength;
    const scaleW = targetW / baseInfo.bodyWidth;
    const scaleH = targetH / baseInfo.bodyHeight;

    // Clone whole scene
    const root = deepClone(gltf.scene);

    // Find legs IN THE CLONE
    const clonedLegs = findLegNodes(root);

    // Hide all original legs
    clonedLegs.forEach(leg => { leg.visible = false; });

    // Scale body: X=width, Y=height, Z=length
    root.scale.set(scaleW, scaleH, scaleL);

    // Motor mirror
    if (motorSide === 'left') {
      root.traverse((node) => {
        if (node.name && (node.name.includes('0070544') || node.name.includes('0070311'))) {
          node.scale.x *= -1;
        }
      });
    }

    const group = new THREE.Group();
    group.add(root);

    // === LEGS: clone from the CLONE's own legs ===
    if (showLegs && clonedLegs.length > 0) {
      const templateLeg = clonedLegs[0];
      const parentNode = templateLeg.parent!;

      // Body Z range in model space (before root scaling)
      const bodyZHead = baseInfo.bodyBBox.max.z; // ~0
      const bodyZTail = baseInfo.bodyBBox.min.z; // ~-2.1

      // 250mm from each end in OUTPUT space → model space
      const endOffsetModel = END_OFFSET_M / scaleL;
      const zDriveCenter = bodyZHead - endOffsetModel;
      const zIdleCenter = bodyZTail + endOffsetModel;

      // Middle legs
      const spacingModel = supportSpacing / scaleL;
      const span = Math.abs(zDriveCenter - zIdleCenter);
      const numMiddle = span > spacingModel
        ? Math.min(MAX_LEG_STATIONS - 2, Math.max(0, Math.floor(span / spacingModel) - 1))
        : 0;

      const desiredCenters: number[] = [zDriveCenter, zIdleCenter];
      if (numMiddle > 0) {
        const step = span / (numMiddle + 1);
        for (let i = 1; i <= numMiddle; i++) {
          desiredCenters.push(zDriveCenter - step * i);
        }
      }

      console.log(`[BeltConveyorGLB] Placing ${desiredCenters.length} legs, templatePosZ=${templateLeg.position.z.toFixed(3)}`);

      // The template's position.z is its local Z in parent space
      const templatePosZ = templateLeg.position.z;

      // Measure where the template actually appears (its center in parent space)
      // We need this to convert desired center → position offset
      const templateWorldBox = new THREE.Box3().setFromObject(templateLeg);
      const templateWorldCenter = new THREE.Vector3();
      templateWorldBox.getCenter(templateWorldCenter);
      // But templateWorldCenter is in WORLD space (after root scale)
      // Convert back to model space: divide by scaleL
      const templateModelCenterZ = templateWorldCenter.z / scaleL;
      
      // Internal offset: how far the leg's center is from its position
      const internalOffset = templateModelCenterZ - templatePosZ;

      console.log(`[BeltConveyorGLB] templateModelCenterZ=${templateModelCenterZ.toFixed(3)}, internalOffset=${internalOffset.toFixed(3)}`);

      for (const centerZ of desiredCenters) {
        // Clone from the CLONE (same parent, same transforms)
        const newLeg = deepClone(templateLeg);
        newLeg.visible = true;
        newLeg.name = 'LEG_EXTRA_' + centerZ.toFixed(2);

        // Set position: desired center → local position
        newLeg.position.z = centerZ - internalOffset;

        parentNode.add(newLeg);
      }
    }

    // Center
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
