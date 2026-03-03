/**
 * BeltConveyorGLB — TRUE parametric belt conveyor from Savio's GLB model.
 *
 * The GLB is organized by Savio with named groups:
 *   - "LEG SUPPORT" nodes (2x) — complete leg station assemblies, REPEATABLE
 *   - Everything else — conveyor body (belt, rollers, motor, frame), STRETCH with length
 *
 * Base model: 2100mm L × 570mm W × 945mm H
 * Native axes: X=width, Y=length(negative), Z=height
 * LEG SUPPORT center Y ≈ -0.899 in base model
 *
 * Connections: infeed = idle end, outfeed = drive end
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';
const BASE_LENGTH = 2.1;   // model length in meters
const ORIG_W = 0.57;       // model width
const ORIG_H = 0.945;      // model height
const LEG_CENTER_Y = -0.899; // Y center of leg stations in base model

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
  const gltf = useGLTF(MODEL_URL);

  // Split model into BODY (stretch) and LEG SUPPORT (repeat)
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

    for (const child of assembly.children) {
      if (child.name.includes('LEG SUPPORT')) {
        // Use first LEG SUPPORT as template, skip the rest
        if (!legRef) legRef = child;
      } else {
        body.push(child);
      }
    }

    console.log(`[BeltConveyorGLB] Body parts: ${body.length}, Leg template: ${legRef ? 'found' : 'missing'}`);
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

    // === BODY — scale uniformly with length, width, height ===
    for (const src of bodyParts) {
      const c = clonePart(src);
      const name = src.name.toLowerCase();

      // Motor parts: mirror if motorSide = left
      if (name.includes('motor') || name.includes('0070544') || name.includes('0070311')) {
        c.scale.set(scaleW, lengthRatio, scaleH);
        if (motorSide === 'left') {
          c.scale.x *= -1;
          c.position.x = ORIG_W * scaleW;
        }
      } else {
        // All other body parts: stretch with length
        c.scale.set(scaleW, lengthRatio, scaleH);
      }

      group.add(c);
    }

    // === LEG SUPPORTS — place at regular intervals along length ===
    if (legTemplate) {
      // How many stations do we need?
      const numStations = Math.max(2, Math.round(targetL / supportSpacing) + 1);
      const actualSpacing = targetL / (numStations - 1);

      for (let i = 0; i < numStations; i++) {
        // Target position along the conveyor (0 = head, targetL = tail)
        const distFromHead = actualSpacing * i;
        // Convert to model Y coordinate (scaled)
        // In base model, head=Y:0, tail=Y:-2.1
        // After body scaling: head=Y:0, tail=Y:-2.1*lengthRatio
        const targetY = -(distFromHead / targetL) * BASE_LENGTH * lengthRatio;

        // The leg template is at Y ≈ LEG_CENTER_Y in model space
        // We need to offset it to the target position
        const yOffset = targetY - (LEG_CENTER_Y * lengthRatio);

        const c = clonePart(legTemplate);
        // Legs: scale width and height, but NOT length (they're discrete parts)
        c.scale.set(scaleW, 1, scaleH);
        c.position.y = yOffset;

        group.add(c);
      }
    }

    // Center the group: centered on width(X) and length(Y), bottom at Z=0
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

  // Axis remap: Model +Y (after centering) = drive end → World +X (outfeed)
  // Model Z = height → World Y (up)
  // Model X = width → World Z
  // Euler (XYZ): rotate -90° around X (Z→Y), then -90° around new Y
  return (
    <group rotation={[-Math.PI / 2, -Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default BeltConveyorGLB;
