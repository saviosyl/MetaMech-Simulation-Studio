/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * SolidWorks GLTF exporter bakes Z-up → Y-up into each node's matrix.
 * After loading: X=width, Y=height(up), Z=length(negative direction)
 * We rotate π/2 around Y to map Z(length) → X(length).
 *
 * LEG SUPPORT assemblies: two named groups in the GLB (nodes 76, 110).
 * These are hidden + cloned at regular intervals for parametric legs.
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';
// DRACO decoder from Google CDN (model is DRACO-compressed by SolidWorks)
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

/** Deep search: find all nodes whose name includes a substring */
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

    // Measure loaded scene bounds
    const sceneBBox = new THREE.Box3().setFromObject(scene);
    const sceneSize = new THREE.Vector3();
    sceneBBox.getSize(sceneSize);
    console.log('[BeltConveyorGLB] Scene bounds:',
      `X: ${sceneBBox.min.x.toFixed(3)}→${sceneBBox.max.x.toFixed(3)} (${sceneSize.x.toFixed(3)})`,
      `Y: ${sceneBBox.min.y.toFixed(3)}→${sceneBBox.max.y.toFixed(3)} (${sceneSize.y.toFixed(3)})`,
      `Z: ${sceneBBox.min.z.toFixed(3)}→${sceneBBox.max.z.toFixed(3)} (${sceneSize.z.toFixed(3)})`
    );

    // Find leg support nodes
    const legNodes = findNodesByName(scene, 'LEG SUPPORT');
    console.log(`[BeltConveyorGLB] Found ${legNodes.length} LEG SUPPORT nodes`);

    // If name search fails, try finding by child count (17 children = leg assembly)
    let effectiveLegNodes = legNodes;
    if (legNodes.length === 0) {
      console.log('[BeltConveyorGLB] Name search failed, trying structure-based detection...');
      // Walk second-level children looking for groups with ~17 children
      scene.traverse((node) => {
        if (node.children.length >= 15 && node.children.length <= 20 && node !== scene) {
          // Check if it has foot-plate-like meshes
          let hasLegParts = false;
          node.traverse((sub) => {
            if (sub.name && (sub.name.includes('0060885') || sub.name.includes('0026574') || sub.name.includes('0071639'))) {
              hasLegParts = true;
            }
          });
          if (hasLegParts) {
            console.log(`[BeltConveyorGLB] Structure-detected leg: "${node.name}" (${node.children.length} children)`);
            effectiveLegNodes.push(node);
          }
        }
      });
    }

    let legTemplate: THREE.Object3D | null = null;
    let legWorldZ = 0;

    for (const leg of effectiveLegNodes) {
      const box = new THREE.Box3().setFromObject(leg);
      const center = new THREE.Vector3();
      box.getCenter(center);
      console.log(`  Leg: "${leg.name.substring(0, 50)}" center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`);
      if (!legTemplate) {
        legTemplate = leg;
        legWorldZ = center.z;
      }
    }

    // Debug: log all direct children of the assembly
    let assembly: THREE.Object3D | null = null;
    for (const child of scene.children) {
      if (child.children.length > 10) {
        assembly = child;
        break;
      }
    }
    if (assembly && effectiveLegNodes.length === 0) {
      console.log('[BeltConveyorGLB] Assembly children (looking for legs):');
      for (const child of assembly.children) {
        console.log(`  "${child.name?.substring(0, 60)}" children:${child.children.length}`);
      }
    }

    return {
      legNodes: effectiveLegNodes,
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

    // Hide original leg supports
    const clonedLegs = findNodesByName(root, 'LEG SUPPORT');
    // Also try structure-based hiding
    if (clonedLegs.length === 0) {
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

    // Scale body: X=width, Y=height, Z=length
    root.scale.set(scaleW, scaleH, scaleL);

    // Motor mirror
    if (motorSide === 'left') {
      [...findNodesByName(root, '0070544'), ...findNodesByName(root, '0070311')].forEach(part => {
        part.scale.x *= -1;
      });
    }

    const group = new THREE.Group();
    group.add(root);

    // Place leg stations
    if (analysis.legTemplate) {
      const numStations = Math.max(2, Math.round(targetL / supportSpacing) + 1);
      console.log(`[BeltConveyorGLB] Placing ${numStations} leg stations`);

      const zMin = analysis.sceneBBox.min.z;
      const zMax = analysis.sceneBBox.max.z;
      const scaledZMin = zMin * scaleL;
      const scaledZMax = zMax * scaleL;

      for (let i = 0; i < numStations; i++) {
        const fraction = i / (numStations - 1);
        const targetZ = scaledZMax - fraction * (scaledZMax - scaledZMin);

        const legClone = deepClone(analysis.legTemplate);
        legClone.visible = true;
        legClone.scale.set(scaleW, scaleH, 1);

        // Measure center after scaling
        const legBoxScaled = new THREE.Box3().setFromObject(legClone);
        const legCenterScaled = new THREE.Vector3();
        legBoxScaled.getCenter(legCenterScaled);

        // Move to target position
        legClone.position.z += (targetZ - legCenterScaled.z);

        group.add(legClone);
      }
    }

    // Center
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

  // After SolidWorks Y-up bake: X=width, Y=height(up), Z=length
  // Rotate +90° around Y: Z(length)→X, Y stays up, X(width)→-Z
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);

export default BeltConveyorGLB;
