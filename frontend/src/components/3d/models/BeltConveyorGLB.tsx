/**
 * BeltConveyorGLB — TRUE parametric belt conveyor using the real GLB model.
 * 
 * Approach: Load the GLB, decompose it into logical zones by analyzing mesh
 * bounding boxes, then reassemble with proper parametric behavior:
 *   - Head section (drive end): fixed, includes drive roller, motor mount
 *   - Tail section (idle end): fixed, includes deflection roller
 *   - Mid sections: repeatable frame/support segments
 *   - Legs: duplicated per support station
 *   - Motor: can be mirrored left/right
 *   - Belt: stretched to match length
 *
 * Native model: 2000mm L × 570mm W × 945mm H
 * Axes: X=width, Y=length(negative), Z=height
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';

// Y positions of the 2 leg stations in the base model (from GLB analysis)
const BASE_LENGTH = 2.1;      // total model length in Y
const TAIL_Y = -0.899;        // tail leg station Y center  
const HEAD_ZONE = -0.35;      // Y threshold: anything > this is head zone
const TAIL_ZONE = -0.75;      // Y threshold: anything < this is tail zone

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

/** Classify a Three.js object into a zone based on its bounding box center Y */
function classifyPart(obj: THREE.Object3D): 'head' | 'tail' | 'mid' | 'motor' | 'fullspan' {
  const name = obj.name.toLowerCase();
  
  // Motor parts (always identifiable by name)
  if (name.includes('motor') || name.includes('0070544') || name.includes('0070311')) {
    return 'motor';
  }
  
  // Compute world bbox
  const bbox = new THREE.Box3().setFromObject(obj);
  const centerY = (bbox.min.y + bbox.max.y) / 2;
  const spanY = bbox.max.y - bbox.min.y;
  
  // Full-span parts (belt, drive roller, deflection roller, main frame profiles)
  // These span >70% of the total length
  if (spanY > BASE_LENGTH * 0.7) {
    return 'fullspan';
  }
  
  // Head zone (near Y=0, drive end)
  if (centerY > HEAD_ZONE) {
    return 'head';
  }
  
  // Tail zone (near Y=-2.1)
  if (centerY < TAIL_ZONE) {
    return 'tail';
  }
  
  // Everything else is mid section
  return 'mid';
}

const BeltConveyorGLB: React.FC<Props> = ({ parameters, isSelected }) => {
  const gltf = useGLTF(MODEL_URL);

  // Decompose model into zones
  const zones = useMemo(() => {
    const scene = gltf.scene;
    
    // Find conveyor assembly (skip camera)
    let assembly: THREE.Object3D = scene;
    for (const child of scene.children) {
      if ((child as any).isCamera || child instanceof THREE.Camera) continue;
      let hasMesh = false;
      child.traverse((n) => { if ((n as THREE.Mesh).isMesh) hasMesh = true; });
      if (hasMesh) { assembly = child; break; }
    }

    const head: THREE.Object3D[] = [];
    const tail: THREE.Object3D[] = [];
    const mid: THREE.Object3D[] = [];
    const motor: THREE.Object3D[] = [];
    const fullspan: THREE.Object3D[] = [];

    for (const child of assembly.children) {
      const zone = classifyPart(child);
      switch (zone) {
        case 'head': head.push(child); break;
        case 'tail': tail.push(child); break;
        case 'mid': mid.push(child); break;
        case 'motor': motor.push(child); break;
        case 'fullspan': fullspan.push(child); break;
      }
    }

    console.log(`[BeltConveyorGLB] Zones: head=${head.length}, tail=${tail.length}, mid=${mid.length}, motor=${motor.length}, fullspan=${fullspan.length}`);
    
    return { head, tail, mid, motor, fullspan, assembly };
  }, [gltf]);

  // Build the parametric model
  const builtGroup = useMemo(() => {
    const targetL = (parameters.length ?? 3000) / 1000;
    const targetW = (parameters.width ?? 600) / 1000;
    const targetH = (parameters.height ?? 800) / 1000;
    const motorSide = parameters.motorSide ?? 'right';
    const supportSpacing = (parameters.supportSpacing ?? 1500) / 1000;

    // Original dimensions
    const origW = 0.57;
    const origH = 0.945;
    const origL = BASE_LENGTH;

    // Scale factors
    const scaleW = targetW / origW;
    const scaleH = targetH / origH;
    const lengthRatio = targetL / origL;

    const group = new THREE.Group();

    // Helper: clone an object with fresh materials
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

    // === FULL-SPAN PARTS (belt, rollers, main frame) ===
    // Scale these along the length axis
    for (const src of zones.fullspan) {
      const clone = clonePart(src);
      // Scale: width(X), length(Y), height(Z)
      clone.scale.set(scaleW, lengthRatio, scaleH);
      group.add(clone);
    }

    // === HEAD SECTION (drive end, near Y=0) ===
    // Keep at original position, just scale width and height
    for (const src of zones.head) {
      const clone = clonePart(src);
      clone.scale.set(scaleW, 1, scaleH);
      group.add(clone);
    }

    // === TAIL SECTION (idle end) ===
    // Move to match new length: original tail was at ~Y=-0.9, 
    // needs to shift proportionally with length
    const tailShift = (targetL - origL); // how much further the tail needs to go
    for (const src of zones.tail) {
      const clone = clonePart(src);
      clone.scale.set(scaleW, 1, scaleH);
      // Shift tail parts further along -Y to match new length
      clone.position.y = tailShift * (TAIL_Y / origL);
      group.add(clone);
    }

    // === MID SECTIONS (support frames between legs) ===
    // Calculate how many mid-section repeats we need
    const numSupports = Math.max(0, Math.floor((targetL - 0.5) / supportSpacing) - 1);
    
    if (numSupports > 0 && zones.mid.length > 0) {
      // Original mid parts span from roughly Y=-0.36 to Y=-0.72
      // We need to place copies at even intervals
      const usableLength = targetL - 0.4; // exclude head/tail zones
      const spacing = usableLength / (numSupports + 1);
      
      for (let i = 0; i < numSupports; i++) {
        const yPos = -(0.2 + spacing * (i + 1)); // position along -Y
        const origMidY = -0.5; // approximate original mid center
        const yOffset = yPos - origMidY;
        
        for (const src of zones.mid) {
          const clone = clonePart(src);
          clone.scale.set(scaleW, 1, scaleH);
          clone.position.y = yOffset;
          group.add(clone);
        }
      }
    } else {
      // Just include original mid parts with width/height scaling
      for (const src of zones.mid) {
        const clone = clonePart(src);
        clone.scale.set(scaleW, 1, scaleH);
        group.add(clone);
      }
    }

    // === MOTOR ===
    for (const src of zones.motor) {
      const clone = clonePart(src);
      clone.scale.set(scaleW, lengthRatio, scaleH);
      
      // Mirror motor to other side if requested
      if (motorSide === 'left') {
        // Mirror across the width center (X axis)
        // Original motor is on right side (high X ~0.5)
        // Width center is ~0.22
        clone.scale.x *= -1;
        clone.position.x = origW * scaleW; // flip to other side
      }
      
      group.add(clone);
    }

    // Now center the entire group and remap axes
    // Compute bounds of what we built
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);

    // Shift to center on X(width) and Y(length), bottom at Z=0
    group.position.set(-center.x, -center.y, -bbox.min.z);

    return group;
  }, [parameters, zones]);

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

  // Remap axes: model X(width)→world Z, model Y(length)→world X, model Z(height)→world Y
  return (
    <group rotation={[-Math.PI / 2, -Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default BeltConveyorGLB;
