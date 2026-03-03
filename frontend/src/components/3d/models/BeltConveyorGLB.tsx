/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * SolidWorks GLTF bakes Z-up → Y-up. After loading: X=width, Y=height(up), Z=length.
 * Three.js replaces spaces with underscores: "LEG SUPPORT" → "LEG_SUPPORT".
 *
 * Leg placement strategy (Savio's spec):
 *   - Fixed leg at 250mm from idle (tail) end
 *   - Fixed leg at 250mm from drive (head) end
 *   - Additional legs in between based on support spacing
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';
const END_OFFSET = 0.25; // 250mm from each end
const MAX_LEG_STATIONS = 30; // safety cap

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

/** Find nodes by name (Three.js converts spaces to underscores in GLTF) */
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

/** Clone with materials */
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

  // Analyze scene once
  const analysis = useMemo(() => {
    const scene = gltf.scene;

    const sceneBBox = new THREE.Box3().setFromObject(scene);
    const sceneSize = new THREE.Vector3();
    sceneBBox.getSize(sceneSize);
    console.log('[BeltConveyorGLB] Scene bounds:',
      `X:${sceneSize.x.toFixed(3)} Y:${sceneSize.y.toFixed(3)} Z:${sceneSize.z.toFixed(3)}`
    );

    // Find legs: "LEG_SUPPORT" (Three.js replaces spaces with underscores)
    let legNodes = findNodesByName(scene, 'LEG_SUPPORT');
    console.log(`[BeltConveyorGLB] Found ${legNodes.length} LEG_SUPPORT nodes by name`);

    // Fallback: structure-based detection
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
      if (legNodes.length > 0) console.log(`[BeltConveyorGLB] Fallback found ${legNodes.length} legs`);
    }

    let legTemplate: THREE.Object3D | null = null;
    let legWorldZ = 0;

    for (const leg of legNodes) {
      const box = new THREE.Box3().setFromObject(leg);
      const center = new THREE.Vector3();
      box.getCenter(center);
      console.log(`  Leg: center Z=${center.z.toFixed(3)}`);
      if (!legTemplate) {
        legTemplate = leg;
        legWorldZ = center.z;
      }
    }

    return {
      legNodes,
      legTemplate,
      legWorldZ,
      baseWidth: sceneSize.x,
      baseHeight: sceneSize.y,
      baseLength: sceneSize.z,
      sceneBBox,
    };
  }, [gltf]);

  // Build parametric model
  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;

    const scaleL = targetL / analysis.baseLength;
    const scaleW = targetW / analysis.baseWidth;
    const scaleH = targetH / analysis.baseHeight;

    // Clone scene
    const root = deepClone(gltf.scene);

    // Hide original legs in clone
    const clonedLegs = findNodesByName(root, 'LEG_SUPPORT');
    if (clonedLegs.length === 0) {
      // Fallback
      root.traverse((node) => {
        if (node.children.length >= 15 && node.children.length <= 20 && node !== root) {
          let hasLegParts = false;
          node.traverse((sub) => {
            if (sub.name && (sub.name.includes('0060885') || sub.name.includes('0026574'))) hasLegParts = true;
          });
          if (hasLegParts) clonedLegs.push(node);
        }
      });
    }
    clonedLegs.forEach(leg => { leg.visible = false; });

    // Scale body
    root.scale.set(scaleW, scaleH, scaleL);

    // Motor mirror
    if (motorSide === 'left') {
      [...findNodesByName(root, '0070544'), ...findNodesByName(root, '0070311')].forEach(part => {
        part.scale.x *= -1;
      });
    }

    const group = new THREE.Group();
    group.add(root);

    // === LEG PLACEMENT (Savio's strategy) ===
    // Fixed legs at 250mm from each end, additional in middle
    if (analysis.legTemplate) {
      // In loaded space, Z goes from max (head/drive, ~0) to min (tail/idle, ~-3.6)
      // After body scaling: Z goes from max*scaleL to min*scaleL
      const zHead = analysis.sceneBBox.max.z * scaleL; // head end (~0)
      const zTail = analysis.sceneBBox.min.z * scaleL;  // tail end (negative)
      // Head end = zHead, so leg near head = zHead - 0.25 (more negative)
      // Tail end = zTail, so leg near tail = zTail + 0.25 (less negative)
      const endOffsetScaled = END_OFFSET;
      const zDriveEnd = zHead - endOffsetScaled;
      const zIdleEnd = zTail + endOffsetScaled;

      // Calculate middle legs
      const middleSpan = Math.abs(zDriveEnd - zIdleEnd);
      const numMiddleLegs = middleSpan > supportSpacing
        ? Math.min(MAX_LEG_STATIONS - 2, Math.max(0, Math.floor(middleSpan / supportSpacing) - 1))
        : 0;

      // Collect all leg Z positions
      const legPositions: number[] = [zIdleEnd, zDriveEnd]; // always have end legs
      if (numMiddleLegs > 0) {
        const middleSpacing = middleSpan / (numMiddleLegs + 1);
        for (let i = 1; i <= numMiddleLegs; i++) {
          legPositions.push(zDriveEnd - middleSpacing * i);
        }
      }

      console.log(`[BeltConveyorGLB] Placing ${legPositions.length} leg stations (${numMiddleLegs} middle)`);

      for (const targetZ of legPositions) {
        const legClone = deepClone(analysis.legTemplate);
        legClone.visible = true;
        legClone.scale.set(scaleW, scaleH, 1);

        // Measure center after scaling
        const legBox = new THREE.Box3().setFromObject(legClone);
        const legCenter = new THREE.Vector3();
        legBox.getCenter(legCenter);

        // Move to target Z
        legClone.position.z += (targetZ - legCenter.z);

        group.add(legClone);
      }
    }

    // Center: X centered, Z centered, bottom at Y=0
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.set(-center.x, -bbox.min.y, -center.z);

    return group;
  }, [parameters, gltf, analysis]);

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
