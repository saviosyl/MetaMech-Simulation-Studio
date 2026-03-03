/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * SolidWorks GLTF bakes Z-up → Y-up. After loading: X=width, Y=height(up), Z=length.
 * Three.js replaces spaces with underscores: "LEG SUPPORT" → "LEG_SUPPORT".
 *
 * Leg strategy: legs are added INSIDE the scaled root group.
 * They counter-scale on Z to stay as discrete (non-stretched) parts.
 * Fixed leg at 250mm from each end, additional legs in middle.
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
const END_OFFSET_M = 0.25; // 250mm from each end (in meters, unscaled model space)
const MAX_LEG_STATIONS = 30;

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

function findNodesByName(root: THREE.Object3D, substr: string): THREE.Object3D[] {
  const results: THREE.Object3D[] = [];
  const upper = substr.toUpperCase();
  root.traverse((node) => {
    if (node.name && node.name.toUpperCase().includes(upper)) {
      results.push(node);
    }
  });
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

  const analysis = useMemo(() => {
    const scene = gltf.scene;
    const sceneBBox = new THREE.Box3().setFromObject(scene);
    const sceneSize = new THREE.Vector3();
    sceneBBox.getSize(sceneSize);

    // Find legs by name (underscore version)
    let legNodes = findNodesByName(scene, 'LEG_SUPPORT');
    // Fallback: by structure
    if (legNodes.length === 0) {
      scene.traverse((node) => {
        if (node.children.length >= 15 && node.children.length <= 20 && node !== scene) {
          let hasLegParts = false;
          node.traverse((sub) => {
            if (sub.name && (sub.name.includes('0060885') || sub.name.includes('0026574'))) hasLegParts = true;
          });
          if (hasLegParts) legNodes.push(node);
        }
      });
    }

    let legTemplate: THREE.Object3D | null = null;
    let legCenterZ = -1.2; // fallback

    if (legNodes.length > 0) {
      legTemplate = legNodes[0];
      const box = new THREE.Box3().setFromObject(legTemplate);
      const center = new THREE.Vector3();
      box.getCenter(center);
      legCenterZ = center.z;
    }

    // Find the assembly node (parent of all parts)
    let assemblyNode: THREE.Object3D | null = null;
    for (const child of scene.children) {
      if (child.children.length > 10) { assemblyNode = child; break; }
    }

    console.log(`[BeltConveyorGLB] Size: ${sceneSize.x.toFixed(2)}×${sceneSize.y.toFixed(2)}×${sceneSize.z.toFixed(2)}, Legs: ${legNodes.length}, legCenterZ: ${legCenterZ.toFixed(3)}`);

    return { legNodes, legTemplate, legCenterZ, baseWidth: sceneSize.x, baseHeight: sceneSize.y, baseLength: sceneSize.z, sceneBBox, assemblyNode };
  }, [gltf]);

  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;
    const showLegs = parameters.showLegs !== false;

    const scaleL = targetL / analysis.baseLength;
    const scaleW = targetW / analysis.baseWidth;
    const scaleH = targetH / analysis.baseHeight;

    // Clone entire scene
    const root = deepClone(gltf.scene);

    // Find and hide ALL original legs in clone
    const clonedLegs = findNodesByName(root, 'LEG_SUPPORT');
    if (clonedLegs.length === 0) {
      root.traverse((node) => {
        if (node.children.length >= 15 && node.children.length <= 20 && node !== root) {
          let has = false;
          node.traverse((s) => { if (s.name && (s.name.includes('0060885') || s.name.includes('0026574'))) has = true; });
          if (has) clonedLegs.push(node);
        }
      });
    }
    clonedLegs.forEach(leg => { leg.visible = false; });

    // Scale the entire root: X=width, Y=height, Z=length
    root.scale.set(scaleW, scaleH, scaleL);

    // Motor mirror
    if (motorSide === 'left') {
      [...findNodesByName(root, '0070544'), ...findNodesByName(root, '0070311')].forEach(part => {
        part.scale.x *= -1;
      });
    }

    // === ADD LEGS INSIDE THE SCALED ROOT ===
    // Since root is scaled, legs added inside will be in the correct coordinate space.
    // But we need to counter-scale Z so legs don't stretch along length.
    if (analysis.legTemplate && showLegs && analysis.assemblyNode) {
      // Find the assembly node in the clone (it's root's child with many children)
      let clonedAssembly: THREE.Object3D | null = null;
      for (const child of root.children) {
        if (child.children.length > 10) { clonedAssembly = child; break; }
      }
      if (!clonedAssembly) clonedAssembly = root;

      // Leg positions in UNSCALED model space
      // Model Z goes from sceneBBox.max.z (~0) to sceneBBox.min.z (~-3.6)
      const zHead = analysis.sceneBBox.max.z; // head/drive end (~0)
      const zTail = analysis.sceneBBox.min.z; // tail/idle end (~-3.6)

      // 250mm from each end in SCALED space → convert to unscaled
      const endOffsetUnscaled = END_OFFSET_M / scaleL;
      const zDriveEnd = zHead - endOffsetUnscaled;
      const zIdleEnd = zTail + endOffsetUnscaled;

      // Middle legs: support spacing is in scaled meters → convert to unscaled
      const supportSpacingUnscaled = supportSpacing / scaleL;
      const middleSpan = Math.abs(zDriveEnd - zIdleEnd);
      const numMiddleLegs = middleSpan > supportSpacingUnscaled
        ? Math.min(MAX_LEG_STATIONS - 2, Math.max(0, Math.floor(middleSpan / supportSpacingUnscaled) - 1))
        : 0;

      const legZPositions: number[] = [zIdleEnd, zDriveEnd];
      if (numMiddleLegs > 0) {
        const spacing = middleSpan / (numMiddleLegs + 1);
        for (let i = 1; i <= numMiddleLegs; i++) {
          legZPositions.push(zDriveEnd - spacing * i);
        }
      }

      console.log(`[BeltConveyorGLB] ${legZPositions.length} legs inside root (scaleL=${scaleL.toFixed(3)})`);

      // Clone the ORIGINAL leg template (from gltf.scene, not the scaled clone)
      for (const targetZ of legZPositions) {
        const legClone = deepClone(analysis.legTemplate);
        legClone.visible = true;

        // Shift Z from template position to target position
        const zShift = targetZ - analysis.legCenterZ;
        legClone.position.z += zShift;

        // Counter-scale Z: the root scales Z by scaleL, but we don't want legs stretched
        // So apply 1/scaleL on the leg's Z to cancel out the root's Z scaling
        legClone.scale.z = 1 / scaleL;

        // Add INSIDE the assembly (shares X/Y scaling with body)
        clonedAssembly.add(legClone);
      }
    }

    // Center the whole thing
    const group = new THREE.Group();
    group.add(root);

    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.set(-center.x, -bbox.min.y, -center.z);

    return group;
  }, [parameters, gltf, analysis]);

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
