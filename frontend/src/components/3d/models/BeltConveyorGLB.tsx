/**
 * BeltConveyorGLB — Parametric belt conveyor from real SolidWorks GLB.
 *
 * CRITICAL: baseLength must be measured from BODY ONLY (excluding legs),
 * because legs extend beyond the belt. Body length ≈ 2.1m, but scene
 * with legs = 3.6m. Using scene bounds would give wrong scale factor.
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

  const baseInfo = useMemo(() => {
    const scene = gltf.scene;

    // Find legs
    const legs = findLegNodes(scene);
    const legNames = new Set<string>();
    legs.forEach(l => legNames.add(l.name));

    // Measure BODY-ONLY bounds (exclude leg supports!)
    // This is critical — legs extend beyond the belt
    const bodyBBox = new THREE.Box3();
    const legBBox = new THREE.Box3();
    
    // Find the assembly node
    let assembly: THREE.Object3D | null = null;
    for (const child of scene.children) {
      if (child.children.length > 10) { assembly = child; break; }
    }
    
    if (assembly) {
      for (const child of assembly.children) {
        const isLeg = legNames.has(child.name) || 
                      child.name.toUpperCase().includes('LEG_SUPPORT');
        const childBox = new THREE.Box3().setFromObject(child);
        if (!childBox.isEmpty()) {
          if (isLeg) {
            legBBox.union(childBox);
          } else {
            bodyBBox.union(childBox);
          }
        }
      }
    }

    const bodySize = new THREE.Vector3();
    bodyBBox.getSize(bodySize);

    // Leg data
    const legData: { centerZ: number; posZ: number }[] = [];
    for (const leg of legs) {
      const lb = new THREE.Box3().setFromObject(leg);
      const lc = new THREE.Vector3();
      lb.getCenter(lc);
      legData.push({ centerZ: lc.z, posZ: leg.position.z });
    }
    legData.sort((a, b) => a.centerZ - b.centerZ);

    console.log(`[BeltConveyorGLB] BODY: ${bodySize.x.toFixed(3)}W × ${bodySize.y.toFixed(3)}H × ${bodySize.z.toFixed(3)}L`);
    console.log(`[BeltConveyorGLB] Body Z: ${bodyBBox.min.z.toFixed(3)} → ${bodyBBox.max.z.toFixed(3)}`);
    legData.forEach((d, i) => console.log(`  Leg ${i}: center.z=${d.centerZ.toFixed(3)}, pos.z=${d.posZ.toFixed(3)}`));

    return {
      bodyWidth: bodySize.x,
      bodyHeight: bodySize.y,
      bodyLength: bodySize.z,  // TRUE belt length, not including legs
      bodyBBox,
      legData,
    };
  }, [gltf]);

  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;
    const showLegs = parameters.showLegs !== false;

    // Scale based on BODY dimensions (not scene with legs)
    const scaleL = targetL / baseInfo.bodyLength;
    const scaleW = targetW / baseInfo.bodyWidth;
    const scaleH = targetH / baseInfo.bodyHeight;

    const root = deepCloneNode(gltf.scene);
    
    // Hide ALL original legs (we'll place our own)
    const clonedLegs = findLegNodes(root);
    clonedLegs.forEach(leg => { leg.visible = false; });

    // Scale body
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

    // === PLACE ALL LEGS (hide originals, place fresh ones) ===
    if (showLegs && baseInfo.legData.length > 0) {
      // Use the first ORIGINAL leg from gltf.scene as template
      const origLegs = findLegNodes(gltf.scene);
      if (origLegs.length > 0) {
        const templateLeg = origLegs[0];
        const templatePosZ = baseInfo.legData[0].posZ;
        const templateCenterZ = baseInfo.legData[0].centerZ;
        const internalOffset = templateCenterZ - templatePosZ;

        // Body spans in loaded space: bodyBBox.min.z to bodyBBox.max.z
        const bodyZHead = baseInfo.bodyBBox.max.z; // drive/head end
        const bodyZTail = baseInfo.bodyBBox.min.z; // idle/tail end

        // Desired leg CENTERS in model space (body coordinates)
        // 250mm from each end in OUTPUT space → convert to model space
        const endOffsetModel = END_OFFSET_M / scaleL;
        const zDriveCenter = bodyZHead - endOffsetModel;
        const zIdleCenter = bodyZTail + endOffsetModel;

        // Middle legs
        const spacingModel = supportSpacing / scaleL;
        const span = Math.abs(zDriveCenter - zIdleCenter);
        const numMiddle = span > spacingModel
          ? Math.min(MAX_LEG_STATIONS - 2, Math.max(0, Math.floor(span / spacingModel) - 1))
          : 0;

        const centers: number[] = [zDriveCenter, zIdleCenter];
        if (numMiddle > 0) {
          const step = span / (numMiddle + 1);
          for (let i = 1; i <= numMiddle; i++) {
            centers.push(zDriveCenter - step * i);
          }
        }

        console.log(`[BeltConveyorGLB] Placing ${centers.length} legs (scaleL=${scaleL.toFixed(3)}, bodyZ: ${bodyZTail.toFixed(2)}→${bodyZHead.toFixed(2)})`);

        // Find assembly in clone to add legs to
        let clonedAssembly: THREE.Object3D = root;
        for (const child of root.children) {
          if (child.children.length > 10) { clonedAssembly = child; break; }
        }

        for (const centerZ of centers) {
          const newLeg = deepCloneNode(templateLeg);
          newLeg.visible = true;
          // Set position: convert center to local position
          newLeg.position.z = centerZ - internalOffset;
          // Counter-scale Z so legs don't stretch with the body
          newLeg.scale.z = 1 / scaleL;
          clonedAssembly.add(newLeg);
        }
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
