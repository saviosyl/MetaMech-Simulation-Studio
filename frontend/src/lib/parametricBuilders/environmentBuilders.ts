import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
}

export function wallBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 5000) / 1000;
  const h = (params.height ?? 3000) / 1000;
  const t = (params.thickness ?? 200) / 1000;

  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.1, roughness: 0.8 });
  addMesh(group, new THREE.BoxGeometry(w, h, t), mat, [0, h / 2, 0]);

  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function doorBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1200) / 1000;
  const h = (params.height ?? 2400) / 1000;
  const t = (params.thickness ?? 100) / 1000;

  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, metalness: 0.3, roughness: 0.6 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xa0522d, metalness: 0.2, roughness: 0.7 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 });

  const frameW = 0.06;
  // Top frame
  addMesh(group, new THREE.BoxGeometry(w + frameW * 2, frameW, t), frameMat, [0, h + frameW / 2, 0]);
  // Side frames
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [-(w / 2 + frameW / 2), h / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [(w / 2 + frameW / 2), h / 2, 0]);
  // Door panel
  addMesh(group, new THREE.BoxGeometry(w - 0.02, h - 0.02, t * 0.6), panelMat, [0, h / 2, 0]);
  // Handle
  addMesh(group, new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), handleMat, [w / 2 - 0.08, h * 0.45, t / 2 + 0.02], [Math.PI / 2, 0, 0]);

  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function windowBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1500) / 1000;
  const h = (params.height ?? 1200) / 1000;
  const t = (params.thickness ?? 100) / 1000;

  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.6, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.4 });

  const frameW = 0.04;
  // Frame (4 sides)
  addMesh(group, new THREE.BoxGeometry(w, frameW, t), frameMat, [0, h / 2 + frameW / 2, 0]); // top
  addMesh(group, new THREE.BoxGeometry(w, frameW, t), frameMat, [0, -(h / 2 + frameW / 2 - h), 0]); // bottom – centered at sill
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [-(w / 2), h / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [(w / 2), h / 2, 0]);
  // Cross bar
  addMesh(group, new THREE.BoxGeometry(w - frameW * 2, frameW * 0.6, t * 0.5), frameMat, [0, h / 2, 0]);
  // Glass
  addMesh(group, new THREE.BoxGeometry(w - frameW * 2, h - frameW * 2, 0.006), glassMat, [0, h / 2, 0]);

  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function palletRackBuilder(params: Record<string, any>): BuilderResult {
  const bayW = (params.bayWidth ?? 2700) / 1000;
  const depth = (params.depth ?? 1100) / 1000;
  const totalH = (params.height ?? 5000) / 1000;
  const levels = params.levels ?? 4;

  const group = new THREE.Group();
  const uprightMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.7, roughness: 0.3 });
  const beamMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.6, roughness: 0.3 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0xc4a882, metalness: 0.1, roughness: 0.8 });

  const uprightW = 0.08;
  const beamH = 0.1;

  // 4 uprights (corners)
  for (const x of [-bayW / 2, bayW / 2]) {
    for (const z of [-depth / 2, depth / 2]) {
      addMesh(group, new THREE.BoxGeometry(uprightW, totalH, uprightW), uprightMat, [x, totalH / 2, z]);
      // Foot plate
      addMesh(group, new THREE.BoxGeometry(0.15, 0.02, 0.15), uprightMat, [x, 0.01, z]);
    }
  }

  // Beams and decking per level
  const levelH = totalH / levels;
  for (let lvl = 1; lvl <= levels; lvl++) {
    const y = lvl * levelH;
    // Front and back beams
    for (const z of [-depth / 2, depth / 2]) {
      addMesh(group, new THREE.BoxGeometry(bayW - uprightW, beamH, 0.04), beamMat, [0, y - beamH / 2, z]);
    }
    // Decking (3 boards)
    const deckW = bayW - uprightW * 2 - 0.02;
    const boardDepth = (depth - 0.06) / 3;
    for (let b = 0; b < 3; b++) {
      const dz = -depth / 2 + 0.03 + boardDepth / 2 + b * (boardDepth + 0.01);
      addMesh(group, new THREE.BoxGeometry(deckW, 0.018, boardDepth), deckMat, [0, y, dz]);
    }
  }

  // Diagonal bracing on sides
  for (const x of [-bayW / 2, bayW / 2]) {
    for (let lvl = 0; lvl < levels; lvl++) {
      const y1 = lvl * levelH;
      const y2 = (lvl + 1) * levelH;
      const midY = (y1 + y2) / 2;
      const braceLen = Math.sqrt(Math.pow(levelH, 2) + Math.pow(depth - uprightW, 2));
      const braceAngle = Math.atan2(levelH, depth - uprightW);
      addMesh(group, new THREE.BoxGeometry(0.03, braceLen, 0.015), uprightMat,
        [x, midY, 0], [0, 0, braceAngle * (lvl % 2 === 0 ? 1 : -1)]);
    }
  }

  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function stairsBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1200) / 1000;
  const stepCount = params.stepCount ?? 12;
  const stepH = (params.stepHeight ?? 180) / 1000;
  const stepD = (params.stepDepth ?? 280) / 1000;

  const group = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.3 });
  const stringerMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });

  const totalH = stepCount * stepH;
  const totalD = stepCount * stepD;

  // Steps
  for (let i = 0; i < stepCount; i++) {
    const y = (i + 1) * stepH;
    const z = i * stepD;
    // Tread
    addMesh(group, new THREE.BoxGeometry(w, 0.005, stepD), stepMat, [0, y, z]);
    // Riser
    addMesh(group, new THREE.BoxGeometry(w, stepH, 0.005), stepMat, [0, y - stepH / 2, z - stepD / 2]);
  }

  // Stringers (side plates)
  const stringerLen = Math.sqrt(totalH * totalH + totalD * totalD);
  const stringerAngle = Math.atan2(totalH, totalD);
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(0.01, 0.15, stringerLen), stringerMat,
      [side * (w / 2 + 0.005), totalH / 2, totalD / 2 - stepD / 2], [stringerAngle, 0, 0]);
  }

  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}
