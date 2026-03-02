import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
const platformMat = () => new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.4 });
const cageMat = () => new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.5, roughness: 0.5, wireframe: true, transparent: true, opacity: 0.3 });
const chainMat = () => new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export function buildVerticalLifter(params: Record<string, any>): BuilderResult {
  const pw = (params.platformWidth ?? 1000) / 1000;
  const pd = (params.platformDepth ?? 1000) / 1000;
  const liftH = (params.liftHeight ?? 3000) / 1000;
  const loadDir = params.loadDirection ?? 'front';
  const group = new THREE.Group();
  const colSize = 0.08;
  const halfW = pw / 2;
  const halfD = pd / 2;
  const totalH = liftH + 0.3; // extra for top frame

  // 4 corner columns
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(group, new THREE.BoxGeometry(colSize, totalH, colSize), frameMat(),
        [sx * (halfW + colSize / 2), totalH / 2, sz * (halfD + colSize / 2)]);
    }
  }

  // Base frame (bottom rectangle)
  for (const axis of ['x', 'z'] as const) {
    if (axis === 'x') {
      addMesh(group, new THREE.BoxGeometry(pw + colSize * 2, colSize, colSize), frameMat(), [0, colSize / 2, -(halfD + colSize / 2)]);
      addMesh(group, new THREE.BoxGeometry(pw + colSize * 2, colSize, colSize), frameMat(), [0, colSize / 2, halfD + colSize / 2]);
    } else {
      addMesh(group, new THREE.BoxGeometry(colSize, colSize, pd + colSize * 2), frameMat(), [-(halfW + colSize / 2), colSize / 2, 0]);
      addMesh(group, new THREE.BoxGeometry(colSize, colSize, pd + colSize * 2), frameMat(), [halfW + colSize / 2, colSize / 2, 0]);
    }
  }

  // Top frame (same as base)
  for (const axis of ['x', 'z'] as const) {
    if (axis === 'x') {
      addMesh(group, new THREE.BoxGeometry(pw + colSize * 2, colSize, colSize), frameMat(), [0, totalH - colSize / 2, -(halfD + colSize / 2)]);
      addMesh(group, new THREE.BoxGeometry(pw + colSize * 2, colSize, colSize), frameMat(), [0, totalH - colSize / 2, halfD + colSize / 2]);
    } else {
      addMesh(group, new THREE.BoxGeometry(colSize, colSize, pd + colSize * 2), frameMat(), [-(halfW + colSize / 2), totalH - colSize / 2, 0]);
      addMesh(group, new THREE.BoxGeometry(colSize, colSize, pd + colSize * 2), frameMat(), [halfW + colSize / 2, totalH - colSize / 2, 0]);
    }
  }

  // Platform at mid-height
  const platY = liftH / 2;
  addMesh(group, new THREE.BoxGeometry(pw, 0.04, pd), platformMat(), [0, platY, 0]);
  // Platform edge rails
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(pw, 0.03, 0.02), platformMat(), [0, platY + 0.025, side * halfD]);
    addMesh(group, new THREE.BoxGeometry(0.02, 0.03, pd), platformMat(), [side * halfW, platY + 0.025, 0]);
  }

  // Chain/belt guides on columns
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(group, new THREE.CylinderGeometry(0.015, 0.015, totalH * 0.9, 8), chainMat(),
        [sx * (halfW + colSize * 0.3), totalH * 0.45, sz * (halfD + colSize * 0.3)]);
    }
  }

  // Safety cage mesh on sides (except load/unload openings)
  const sides = [
    { normal: 'front', pos: [0, totalH / 2, -(halfD + colSize)] as [number, number, number], size: [pw, totalH * 0.85, 0.01] as [number, number, number] },
    { normal: 'back', pos: [0, totalH / 2, halfD + colSize] as [number, number, number], size: [pw, totalH * 0.85, 0.01] as [number, number, number] },
    { normal: 'left', pos: [-(halfW + colSize), totalH / 2, 0] as [number, number, number], size: [0.01, totalH * 0.85, pd] as [number, number, number] },
    { normal: 'right', pos: [halfW + colSize, totalH / 2, 0] as [number, number, number], size: [0.01, totalH * 0.85, pd] as [number, number, number] },
  ];

  for (const side of sides) {
    // Skip load direction side at bottom and top
    if (side.normal === loadDir) continue;
    addMesh(group, new THREE.BoxGeometry(...side.size), cageMat(), side.pos);
  }

  // Determine port positions based on load direction
  const dirMap: Record<string, [number, number, number]> = {
    front: [0, 0, -(halfD + colSize + 0.2)],
    back: [0, 0, halfD + colSize + 0.2],
    left: [-(halfW + colSize + 0.2), 0, 0],
    right: [halfW + colSize + 0.2, 0, 0],
  };
  const dirOffset = dirMap[loadDir] || dirMap.front;

  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [dirOffset[0], 0.1, dirOffset[2]] },
    { id: 'output', type: 'output', localPosition: [dirOffset[0], liftH, dirOffset[2]] },
  ];

  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: liftH };
}
