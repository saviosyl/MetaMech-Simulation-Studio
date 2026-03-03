/**
 * BeltConveyorGLB — TRUE parametric belt conveyor from Savio's GLB model.
 *
 * GLB structure (organized by Savio):
 *   - "LEG SUPPORT" named nodes — complete leg station assemblies, REPEATABLE
 *   - Everything else — conveyor body (belt, rollers, motor, frame)
 *
 * Base model: 2100mm L × 570mm W × 945mm H
 * Native axes: X=width(0→0.57), Y=length(0→-2.1), Z=height(0→0.945)
 * Z is already UP in the model.
 *
 * World axes: X=length, Y=up, Z=width
 * So we just need to rotate around Z to swap X↔Y, then adjust for Z-up→Y-up.
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

// Enable DRACO decoding (Savio's GLB is DRACO-compressed)
const DRACO_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

const MODEL_URL = '/models/belt-conveyor.glb';
const BASE_LENGTH = 2.1;
const ORIG_W = 0.57;
const ORIG_H = 0.945;
const LEG_CENTER_Y = -0.899; // Y center of leg station in base model

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

function clonePart(src: THREE.Object3D): THREE.Object3D {
  const clone = src.clone(true);
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(m => m.clone());
      } else {
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

  // Split: LEG SUPPORT (repeat) vs BODY (stretch)
  const { bodyParts, legTemplate } = useMemo(() => {
    const scene = gltf.scene;

    // Find conveyor assembly (skip camera)
    let assembly: THREE.Object3D = scene;
    for (const child of scene.children) {
      if ((child as any).isCamera || child instanceof THREE.Camera) continue;
      let hasMesh = false;
      child.traverse((n) => { if ((n as THREE.Mesh).isMesh) hasMesh = true; });
      if (hasMesh) { assembly = child; break; }
    }

    const body: THREE.Object3D[] = [];
    let legRef: THREE.Object3D | null = null;
    let legCount = 0;

    for (const child of assembly.children) {
      const isLeg = child.name.toUpperCase().includes('LEG SUPPORT');
      if (isLeg) {
        legCount++;
        if (!legRef) {
          legRef = child;
          console.log('[BeltConveyorGLB] Leg template found:', child.name);
        }
      } else {
        body.push(child);
      }
    }

    console.log(`[BeltConveyorGLB] Body: ${body.length} parts, Leg stations in model: ${legCount}`);

    // Measure leg template bounds
    if (legRef) {
      const legBBox = new THREE.Box3().setFromObject(legRef);
      const legCenter = new THREE.Vector3();
      legBBox.getCenter(legCenter);
      console.log(`[BeltConveyorGLB] Leg template center: Y=${legCenter.y.toFixed(3)}, size: ${(legBBox.max.y - legBBox.min.y).toFixed(3)}`);
    }

    return { bodyParts: body, legTemplate: legRef };
  }, [gltf]);

  // Build parametric model
  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;

    const scaleW = targetW / ORIG_W;
    const scaleH = targetH / ORIG_H;
    const lengthRatio = targetL / BASE_LENGTH;

    const group = new THREE.Group();

    // === BODY PARTS — stretch along length ===
    for (const src of bodyParts) {
      const c = clonePart(src);
      const name = (src.name || '').toLowerCase();

      // Motor: can mirror
      if (name.includes('motor') || name.includes('0070544') || name.includes('0070311')) {
        c.scale.set(scaleW, lengthRatio, scaleH);
        if (motorSide === 'left') {
          c.scale.x *= -1;
          c.position.x = ORIG_W * scaleW;
        }
      } else {
        c.scale.set(scaleW, lengthRatio, scaleH);
      }
      group.add(c);
    }

    // === LEG SUPPORTS — duplicate at intervals ===
    if (legTemplate) {
      const numStations = Math.max(2, Math.round(targetL / supportSpacing) + 1);

      console.log(`[BeltConveyorGLB] Placing ${numStations} leg stations (spacing: ${supportSpacing}m, length: ${targetL}m)`);

      for (let i = 0; i < numStations; i++) {
        // Fraction along the conveyor (0=drive/head, 1=idle/tail)
        const fraction = i / (numStations - 1);

        // In the SCALED model, the conveyor goes from Y=0 (head) to Y = -BASE_LENGTH * lengthRatio (tail)
        const targetY = -fraction * BASE_LENGTH * lengthRatio;

        // The template leg is at LEG_CENTER_Y in UNSCALED model space
        // We DON'T scale the leg along length (it's a discrete part), just reposition it
        const yOffset = targetY - LEG_CENTER_Y;

        const c = clonePart(legTemplate);
        c.scale.set(scaleW, 1, scaleH);  // scale width + height only, NOT length
        c.position.set(0, yOffset, 0);

        group.add(c);
      }
    }

    // Center: width(X) centered, length(Y) centered, bottom at Z=0
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    group.position.set(-center.x, -center.y, -bbox.min.z);

    return group;
  }, [parameters, bodyParts, legTemplate]);

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

  // Axis remap:
  //   Model: X=width, Y=length(-Y direction), Z=height(up)
  //   World: X=length, Y=height(up), Z=width
  //
  // After centering, model is symmetric around origin.
  // We need Z(up)→Y(up), Y(length)→X(length), X(width)→Z(width)
  //
  // This is a rotation of -90° around X, then +90° around the new Y:
  //   rotX(-90°): Y→Z, Z→-Y  → now: X=width, Y=-height, Z=length
  //   rotY(+90°): X→Z, Z→-X  → now: X=-length, Y=-height, Z=width
  //   We also need to flip signs, so add 180° around Y
  //
  // Simpler: just use rotation order that works.
  // Let's try: the model Z is up, Three.js Y is up.
  // Standard Z-up to Y-up conversion: rotate -90° around X axis.
  // Then to align length along world X: rotate around Y.
  //
  // rot X=-90°: (x,y,z) → (x, z, -y)
  //   width stays X, height(Z) goes to Y(up) ✓, length(-Y) goes to Z → need it in X
  // rot Y=+90°: (x,y,z) → (z, y, -x)  
  //   so: (x, z, -y) → (-y, z, -x) = (length, height, -width)
  //   X=length ✓, Y=height ✓, Z=-width (flipped but OK)
  
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL, DRACO_PATH);

export default BeltConveyorGLB;
