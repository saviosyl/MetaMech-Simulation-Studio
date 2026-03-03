/**
 * BeltConveyorGLB — TRUE parametric belt conveyor.
 * 
 * Zones:
 *   driveEnd  — drive roller, drive fittings (fixed at outfeed end)
 *   idleEnd   — deflection roller, tail fittings (fixed at infeed end)
 *   legStation — foot plates, adjustable feet, swivel plates, caps (REPEATABLE)
 *   tieBeam   — cross-supports, connections between legs (REPEATABLE)
 *   motor     — motor + mounting (mirrorable left/right)
 *   fullspan  — belt surface, main frame rails (stretch with length)
 *
 * Base model: 2000mm L × 570mm W × 945mm H
 * Native axes: X=width, Y=length(neg), Z=height
 * 
 * Connections: infeed = idle end, outfeed = drive end
 */
import React, { useMemo, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

const MODEL_URL = '/models/belt-conveyor.glb';

const BASE_LENGTH = 2.1;
const ORIG_W = 0.57;
const ORIG_H = 0.945;

// Part numbers for leg station components
const LEG_PARTS = ['0060885', '0026574', '0071639', '0002601'];
// Part numbers for motor
const MOTOR_PARTS = ['0070544', '0070311'];
// Part numbers for drive end only (drive roller, drive fittings)
const DRIVE_PARTS = ['0070512', '0070272'];
// Part numbers for idle end only (deflection roller, tail fittings, fine adjustment)
const IDLE_PARTS = ['0070522', '0070296', '0071505'];

function getPartNumber(name: string): string {
  const match = name.match(/(\d{7})/);
  return match ? match[1] : '';
}

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

type Zone = 'driveEnd' | 'idleEnd' | 'legStation' | 'tieBeam' | 'motor' | 'fullspan';

function classifyPart(obj: THREE.Object3D): Zone {
  const name = obj.name || '';
  const partNum = getPartNumber(name);

  // Motor
  if (MOTOR_PARTS.includes(partNum)) return 'motor';
  
  // Drive end parts
  if (DRIVE_PARTS.includes(partNum)) return 'driveEnd';
  
  // Idle end parts  
  if (IDLE_PARTS.includes(partNum)) return 'idleEnd';
  
  // Leg station parts (foot plates, adjustable feet, swivel plates, end caps)
  if (LEG_PARTS.includes(partNum)) return 'legStation';

  // Check span — full-length parts (belt, main frame profiles)
  const bbox = new THREE.Box3().setFromObject(obj);
  const spanY = Math.abs(bbox.max.y - bbox.min.y);
  if (spanY > BASE_LENGTH * 0.7) return 'fullspan';

  // Everything else is tie beam / mid connection
  return 'tieBeam';
}

/** Group leg station parts by their Y position cluster */
function groupLegStations(parts: THREE.Object3D[]): { template: THREE.Object3D[]; positions: number[] } {
  // Find Y center of each part
  const partPositions: { obj: THREE.Object3D; centerY: number }[] = [];
  for (const p of parts) {
    const bbox = new THREE.Box3().setFromObject(p);
    partPositions.push({ obj: p, centerY: (bbox.min.y + bbox.max.y) / 2 });
  }

  // Cluster by Y position (parts within 0.1m are same station)
  const clusters: Map<number, THREE.Object3D[]> = new Map();
  for (const { obj, centerY } of partPositions) {
    let foundCluster = false;
    for (const [key, arr] of clusters) {
      if (Math.abs(centerY - key) < 0.1) {
        arr.push(obj);
        foundCluster = true;
        break;
      }
    }
    if (!foundCluster) {
      clusters.set(centerY, [obj]);
    }
  }

  const positions = Array.from(clusters.keys()).sort((a, b) => a - b);
  // Use the first cluster as template
  const template = clusters.get(positions[0]) || [];

  return { template, positions };
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

  const zones = useMemo(() => {
    const scene = gltf.scene;
    let assembly: THREE.Object3D = scene;
    for (const child of scene.children) {
      if ((child as any).isCamera || child instanceof THREE.Camera) continue;
      let hasMesh = false;
      child.traverse((n) => { if ((n as THREE.Mesh).isMesh) hasMesh = true; });
      if (hasMesh) { assembly = child; break; }
    }

    const driveEnd: THREE.Object3D[] = [];
    const idleEnd: THREE.Object3D[] = [];
    const legStation: THREE.Object3D[] = [];
    const tieBeam: THREE.Object3D[] = [];
    const motor: THREE.Object3D[] = [];
    const fullspan: THREE.Object3D[] = [];

    for (const child of assembly.children) {
      const zone = classifyPart(child);
      switch (zone) {
        case 'driveEnd': driveEnd.push(child); break;
        case 'idleEnd': idleEnd.push(child); break;
        case 'legStation': legStation.push(child); break;
        case 'tieBeam': tieBeam.push(child); break;
        case 'motor': motor.push(child); break;
        case 'fullspan': fullspan.push(child); break;
      }
    }

    // Analyze leg stations
    const legData = groupLegStations(legStation);
    
    // Analyze tie beam positions for template
    const tiePositions: { obj: THREE.Object3D; centerY: number }[] = [];
    for (const t of tieBeam) {
      const bbox = new THREE.Box3().setFromObject(t);
      tiePositions.push({ obj: t, centerY: (bbox.min.y + bbox.max.y) / 2 });
    }
    // Get one cluster of tie beam parts as template
    const tieClusters: Map<number, THREE.Object3D[]> = new Map();
    for (const { obj, centerY } of tiePositions) {
      let found = false;
      for (const [key, arr] of tieClusters) {
        if (Math.abs(centerY - key) < 0.15) { arr.push(obj); found = true; break; }
      }
      if (!found) tieClusters.set(centerY, [obj]);
    }
    const tieClusterKeys = Array.from(tieClusters.keys()).sort((a, b) => a - b);
    const tieTemplate = tieClusterKeys.length > 0 ? (tieClusters.get(tieClusterKeys[0]) || []) : [];
    const tieTemplateY = tieClusterKeys.length > 0 ? tieClusterKeys[0] : -0.5;

    console.log(`[BeltConveyorGLB] driveEnd=${driveEnd.length}, idleEnd=${idleEnd.length}, legs=${legStation.length}(${legData.positions.length} stations), ties=${tieBeam.length}(${tieClusterKeys.length} clusters), motor=${motor.length}, fullspan=${fullspan.length}`);

    return { driveEnd, idleEnd, legData, tieTemplate, tieTemplateY, tieClusterKeys, motor, fullspan };
  }, [gltf]);

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

    // === FULLSPAN (belt, main frame) — stretch to length ===
    for (const src of zones.fullspan) {
      const c = clonePart(src);
      c.scale.set(scaleW, lengthRatio, scaleH);
      group.add(c);
    }

    // === DRIVE END (outfeed, near Y=0) — scale width/height, stretch with length ===
    for (const src of zones.driveEnd) {
      const c = clonePart(src);
      c.scale.set(scaleW, lengthRatio, scaleH);
      group.add(c);
    }

    // === IDLE END (infeed, near Y=-2.1) — scale width/height, stretch with length ===
    for (const src of zones.idleEnd) {
      const c = clonePart(src);
      c.scale.set(scaleW, lengthRatio, scaleH);
      group.add(c);
    }

    // === MOTOR — stretch with length, mirror if needed ===
    for (const src of zones.motor) {
      const c = clonePart(src);
      c.scale.set(scaleW, lengthRatio, scaleH);
      if (motorSide === 'left') {
        c.scale.x *= -1;
        c.position.x = ORIG_W * scaleW;
      }
      group.add(c);
    }

    // === LEG STATIONS — place at regular intervals ===
    const numStations = Math.max(2, Math.floor(targetL / supportSpacing) + 1);
    const actualSpacing = targetL / (numStations - 1);
    const { template: legTemplate, positions: origLegPositions } = zones.legData;
    const templateY = origLegPositions.length > 0 ? origLegPositions[0] : -0.176;

    for (let i = 0; i < numStations; i++) {
      // Target Y position for this station (in model coords, -Y direction)
      const stationY = -(actualSpacing * i) * (BASE_LENGTH / targetL);
      // Offset from template position
      const yOffset = stationY - templateY;

      for (const src of legTemplate) {
        const c = clonePart(src);
        c.scale.set(scaleW, 1, scaleH);
        c.position.y = yOffset;
        group.add(c);
      }
    }

    // === TIE BEAMS — place between each pair of leg stations ===
    const { tieTemplate, tieTemplateY } = zones;
    if (tieTemplate.length > 0) {
      for (let i = 0; i < numStations - 1; i++) {
        const midY = -(actualSpacing * (i + 0.5)) * (BASE_LENGTH / targetL);
        const yOffset = midY - tieTemplateY;

        for (const src of tieTemplate) {
          const c = clonePart(src);
          c.scale.set(scaleW, 1, scaleH);
          c.position.y = yOffset;
          group.add(c);
        }
      }
    }

    // Center the group
    const bbox = new THREE.Box3().setFromObject(group);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
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

  // Axis remap after centering:
  //   Model: X=width, +Y=drive end(outfeed), -Y=idle end(infeed), Z=height
  //   World: X=length(+X=outfeed), Y=height(up), Z=width
  //
  // Step 1: Rotate -90° around X → Z becomes Y (height up), Y becomes -Z
  // Step 2: Rotate -90° around Y → X becomes Z (width), -Z(was+Y) becomes X (length)
  // Combined: model+Y → world+X ✓, modelZ → worldY ✓, modelX → worldZ ✓
  //
  // Euler (XYZ order): x=-π/2, y=-π/2, z=0
  return (
    <group rotation={[-Math.PI / 2, -Math.PI / 2, 0]}>
      <primitive object={builtGroup} />
    </group>
  );
};

useGLTF.preload(MODEL_URL);

export default BeltConveyorGLB;
