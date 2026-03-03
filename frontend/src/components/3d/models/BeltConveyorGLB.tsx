/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * SolidWorks GLTF exporter bakes Z-up → Y-up into each node's matrix.
 * After loading: X=width, Y=height(up), Z=length(negative direction)
 * We rotate π/2 around Y to map Z(length) → X(length).
 *
 * LEG SUPPORT assemblies: two named groups at different Z positions.
 * These are hidden + cloned at regular intervals for parametric legs.
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

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

  // Analyze scene: find leg supports, measure dimensions
  const analysis = useMemo(() => {
    const scene = gltf.scene;

    // Measure the loaded scene bounds (after SolidWorks Y-up bake)
    const sceneBBox = new THREE.Box3().setFromObject(scene);
    const sceneSize = new THREE.Vector3();
    sceneBBox.getSize(sceneSize);
    console.log('[BeltConveyorGLB] Loaded scene bounds:',
      'X:', sceneBBox.min.x.toFixed(3), '→', sceneBBox.max.x.toFixed(3), `(${sceneSize.x.toFixed(3)})`,
      'Y:', sceneBBox.min.y.toFixed(3), '→', sceneBBox.max.y.toFixed(3), `(${sceneSize.y.toFixed(3)})`,
      'Z:', sceneBBox.min.z.toFixed(3), '→', sceneBBox.max.z.toFixed(3), `(${sceneSize.z.toFixed(3)})`
    );

    // Find leg support nodes
    const legNodes = findNodesByName(scene, 'LEG SUPPORT');
    console.log(`[BeltConveyorGLB] Found ${legNodes.length} LEG SUPPORT nodes`);

    let legTemplate: THREE.Object3D | null = null;
    let legWorldZ = 0; // Z position of template leg in loaded space

    for (const leg of legNodes) {
      const box = new THREE.Box3().setFromObject(leg);
      const center = new THREE.Vector3();
      box.getCenter(center);
      console.log(`  Leg: "${leg.name.substring(0, 50)}" center=(${center.x.toFixed(3)}, ${center.y.toFixed(3)}, ${center.z.toFixed(3)})`);
      if (!legTemplate) {
        legTemplate = leg;
        legWorldZ = center.z;
      }
    }

    // Base dimensions in loaded space (after SolidWorks bake):
    // X = width, Y = height, Z = length (negative)
    const baseWidth = sceneSize.x;   // ~0.57
    const baseHeight = sceneSize.y;  // ~0.945
    const baseLength = sceneSize.z;  // ~2.1

    return { legNodes, legTemplate, legWorldZ, baseWidth, baseHeight, baseLength, sceneBBox };
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

    // Clone the entire scene
    const root = deepClone(gltf.scene);

    // Find and hide leg supports in clone
    const clonedLegs = findNodesByName(root, 'LEG SUPPORT');
    clonedLegs.forEach(leg => { leg.visible = false; });

    // Scale the body: X=width, Y=height, Z=length
    root.scale.set(scaleW, scaleH, scaleL);

    // Motor mirror
    if (motorSide === 'left') {
      const motorParts = [
        ...findNodesByName(root, '0070544'),
        ...findNodesByName(root, '0070311')
      ];
      motorParts.forEach(part => {
        part.scale.x *= -1;
      });
    }

    const group = new THREE.Group();
    group.add(root);

    // Place leg stations at intervals
    if (analysis.legTemplate) {
      const numStations = Math.max(2, Math.round(targetL / supportSpacing) + 1);
      console.log(`[BeltConveyorGLB] Placing ${numStations} leg stations (spacing ${supportSpacing}m)`);

      // In loaded space, Z is length. Scene goes from some Z_min to Z_max.
      const zMin = analysis.sceneBBox.min.z; // tail end (most negative)
      const zMax = analysis.sceneBBox.max.z; // head end (near 0)

      // After scaling, the body spans zMin*scaleL to zMax*scaleL
      const scaledZMin = zMin * scaleL;
      const scaledZMax = zMax * scaleL;

      for (let i = 0; i < numStations; i++) {
        const fraction = i / (numStations - 1);
        // Target Z in scaled space
        const targetZ = scaledZMax - fraction * (scaledZMax - scaledZMin);

        const legClone = deepClone(analysis.legTemplate);
        legClone.visible = true;

        // Measure where the cloned leg currently is
        const legBox = new THREE.Box3().setFromObject(legClone);
        const legCenter = new THREE.Vector3();
        legBox.getCenter(legCenter);

        // Offset to move it to target position
        // Scale width(X) and height(Y), keep Z at 1 (discrete part)
        legClone.scale.set(scaleW, scaleH, 1);

        // Recalculate center after scaling
        const legBoxScaled = new THREE.Box3().setFromObject(legClone);
        const legCenterScaled = new THREE.Vector3();
        legBoxScaled.getCenter(legCenterScaled);

        // Move to target Z
        legClone.position.z += (targetZ - legCenterScaled.z);
        // Align X center with body
        legClone.position.x += (analysis.sceneBBox.min.x * scaleW + analysis.sceneBBox.max.x * scaleW) / 2 - legCenterScaled.x;

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
  // We want: X=length, Y=height(up), Z=width
  // Rotate +90° around Y: (x,y,z) → (z, y, -x)
  //   Z(length) → X ✓, Y(height) → Y ✓, X(width) → -Z ✓
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);

export default BeltConveyorGLB;
