/**
 * BeltConveyorGLB — Parametric belt conveyor from real GLB model.
 *
 * Strategy: SIMPLE AND CORRECT
 * 1. Load the GLB as-is (DRACO compressed)
 * 2. Deep-search for "LEG SUPPORT" nodes by name
 * 3. Clone the entire scene for each parameter change
 * 4. Hide original leg supports, place cloned ones at intervals
 * 5. Minimal rotation: just Z-up → Y-up (-90° around X)
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

// Base model dimensions (meters)
const BASE_LENGTH = 2.1;   // along model -Y
const BASE_WIDTH = 0.57;   // along model X
const BASE_HEIGHT = 0.945; // along model Z

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

/** Deep search: find all nodes whose name includes a substring */
function findNodesByName(root: THREE.Object3D, substr: string): THREE.Object3D[] {
  const results: THREE.Object3D[] = [];
  root.traverse((node) => {
    if (node.name && node.name.toUpperCase().includes(substr.toUpperCase())) {
      results.push(node);
    }
  });
  return results;
}

/** Clone an object with materials */
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

  // Analyze the loaded scene once
  const analysis = useMemo(() => {
    const scene = gltf.scene;

    // Log full scene tree for debugging
    console.log('[BeltConveyorGLB] Scene structure:');
    scene.traverse((node) => {
      const depth = [];
      let p = node.parent;
      while (p) { depth.push(' '); p = p.parent; }
      const info = [];
      if ((node as THREE.Mesh).isMesh) info.push('MESH');
      if (node.children.length > 0) info.push(`children:${node.children.length}`);
      console.log(`${depth.join('')}${node.name || '(unnamed)'} [${node.type}] ${info.join(' ')}`);
    });

    // Find leg support nodes by deep search
    const legNodes = findNodesByName(scene, 'LEG SUPPORT');
    console.log(`[BeltConveyorGLB] Found ${legNodes.length} LEG SUPPORT nodes`);
    legNodes.forEach((n, i) => {
      const box = new THREE.Box3().setFromObject(n);
      const center = new THREE.Vector3();
      box.getCenter(center);
      console.log(`  Leg ${i}: "${n.name}" center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`);
    });

    // Get the first leg as template
    const legTemplate = legNodes.length > 0 ? legNodes[0] : null;

    // Measure leg template center in model space
    let legCenterY = -0.899;
    if (legTemplate) {
      const box = new THREE.Box3().setFromObject(legTemplate);
      const center = new THREE.Vector3();
      box.getCenter(center);
      legCenterY = center.y;
    }

    return { legNodes, legTemplate, legCenterY };
  }, [gltf]);

  // Build parametric group
  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;

    const scaleL = targetL / BASE_LENGTH;
    const scaleW = targetW / BASE_WIDTH;
    const scaleH = targetH / BASE_HEIGHT;

    // Clone the entire scene
    const root = deepClone(gltf.scene);

    // Find leg supports in the clone (by name)
    const clonedLegs = findNodesByName(root, 'LEG SUPPORT');
    console.log(`[BeltConveyorGLB] Cloned legs found: ${clonedLegs.length}`);

    // Hide all original leg supports
    clonedLegs.forEach(leg => { leg.visible = false; });

    // Scale the entire model: width(X) × length(Y) × height(Z)
    // The root scene node gets scaled
    root.scale.set(scaleW, scaleL, scaleH);

    // Motor mirror: find motor parts and flip X if left side
    if (motorSide === 'left') {
      const motorParts = findNodesByName(root, '0070544');
      const motorMount = findNodesByName(root, '0070311');
      [...motorParts, ...motorMount].forEach(part => {
        part.scale.x *= -1;
        part.position.x = BASE_WIDTH; // flip to other side
      });
    }

    // Create a wrapper group
    const group = new THREE.Group();
    group.add(root);

    // Now add leg stations at intervals
    // Legs need to be placed in SCALED model space
    if (analysis.legTemplate) {
      const numStations = Math.max(2, Math.round(targetL / supportSpacing) + 1);
      console.log(`[BeltConveyorGLB] Placing ${numStations} leg stations`);

      for (let i = 0; i < numStations; i++) {
        const fraction = i / (numStations - 1);
        // In model space, head = Y:0, tail = Y:-BASE_LENGTH
        // In scaled space, tail = Y:-BASE_LENGTH * scaleL
        const targetY = -fraction * BASE_LENGTH;

        // Clone the ORIGINAL (unscaled) leg template
        const legClone = deepClone(analysis.legTemplate);
        legClone.visible = true;

        // Calculate offset: move from template position to target position
        // The template is at legCenterY in model space
        // We want it at targetY in model space
        // But the clone inherits the template's local transform, so we offset
        const offsetY = targetY - analysis.legCenterY;
        legClone.position.y += offsetY;

        // Scale the leg: width(X) and height(Z) only, keep length(Y) at 1
        // But we need to account for parent scale — the leg is NOT inside the scaled root
        // It's added to `group` which has no scale
        legClone.scale.set(scaleW, 1, scaleH);

        group.add(legClone);
      }
    }

    // Center the group
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    // Center XY, bottom at Z=0 (model Z is up)
    group.position.set(-center.x, -center.y, -bbox.min.z);

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

  // Axis remap: Model Z-up → Three.js Y-up
  // Step 1: -90° around X: (x,y,z) → (x, z, -y) → Z(height)→Y(up), Y(length)→-Z
  // Step 2: +90° around Y: (x,y,z) → (z, y, -x) → -Z(length)→-X, X(width)→-Z
  // Hmm that gives length along -X. We want length along +X.
  // Instead: Step 2: -90° around Y: (x,y,z) → (-z, y, x) → applied after step1:
  //   (x, z, -y) → (y, z, x) → Model Y(length)→WorldX ✓, Model Z→WorldY ✓, Model X→WorldZ ✓
  // But model Y is negative (-2.1→0), so worldX goes from positive to 0. After centering it's fine.
  //
  // Euler XYZ: x=-π/2, y=-π/2
  return (
    <group rotation={[-Math.PI / 2, -Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);

export default BeltConveyorGLB;
