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
    const showLegs = parameters.showLegs !== false; // default true

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
    if (analysis.legTemplate && showLegs) {
      // Measure template center BEFORE any scaling (original position in scene)
      const origBox = new THREE.Box3().setFromObject(analysis.legTemplate);
      const origCenter = new THREE.Vector3();
      origBox.getCenter(origCenter);

      // Body center X for width alignment
      const bodyCenterX = (analysis.sceneBBox.min.x + analysis.sceneBBox.max.x) / 2;

      // In scaled space, body spans:
      const zHead = analysis.sceneBBox.max.z * scaleL; // drive/head (~0)
      const zTail = analysis.sceneBBox.min.z * scaleL;  // idle/tail (negative)

      // Fixed end positions (250mm inward from each end)
      const zDriveEnd = zHead - END_OFFSET;
      const zIdleEnd = zTail + END_OFFSET;

      // Middle legs based on support spacing
      const middleSpan = Math.abs(zDriveEnd - zIdleEnd);
      const numMiddleLegs = middleSpan > supportSpacing
        ? Math.min(MAX_LEG_STATIONS - 2, Math.max(0, Math.floor(middleSpan / supportSpacing) - 1))
        : 0;

      const legPositions: number[] = [zIdleEnd, zDriveEnd];
      if (numMiddleLegs > 0) {
        const middleSpacing = middleSpan / (numMiddleLegs + 1);
        for (let i = 1; i <= numMiddleLegs; i++) {
          legPositions.push(zDriveEnd - middleSpacing * i);
        }
      }

      // Scaled body center for alignment
      const scaledBodyCenterX = bodyCenterX * scaleW;

      console.log(`[BeltConveyorGLB] Placing ${legPositions.length} legs, origCenter=(${origCenter.x.toFixed(3)},${origCenter.y.toFixed(3)},${origCenter.z.toFixed(3)}), bodyCenter=${scaledBodyCenterX.toFixed(3)}`);

      for (const targetZ of legPositions) {
        const legClone = deepClone(analysis.legTemplate);
        legClone.visible = true;

        // Use wrapper group: center the leg at origin, scale, then position
        // This ensures scaling happens around the leg's center, not around world origin
        const wrapper = new THREE.Group();

        // 1. Offset leg so its center is at origin
        legClone.position.x += -origCenter.x;
        legClone.position.y += -origCenter.y;
        legClone.position.z += -origCenter.z;

        wrapper.add(legClone);

        // 2. Scale the wrapper (scales around origin = leg center)
        wrapper.scale.set(scaleW, scaleH, 1);

        // 3. Position wrapper at target location
        wrapper.position.set(
          scaledBodyCenterX,  // X: aligned with body center
          origCenter.y * scaleH,  // Y: same height ratio as body
          targetZ              // Z: target position along length
        );

        group.add(wrapper);
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
