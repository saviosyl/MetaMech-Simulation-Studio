import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
const rollerMat = () => new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.9, roughness: 0.15 });
const railMat = () => new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.5, roughness: 0.4 });
const legMat = () => new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
const motorMat = () => new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.4 });

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export function buildRollerConveyor(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 600) / 1000;
  const l = (params.length ?? 3000) / 1000;
  const h = (params.height ?? 800) / 1000;
  const rollerPitch = (params.rollerPitch ?? 100) / 1000;
  const driven = params.driven ?? true;
  const sideRails = params.sideRails ?? true;

  const group = new THREE.Group();
  const halfL = l / 2;
  const rollerRadius = 0.025;
  const frameH = 0.06;
  const frameW = 0.04;

  // --- Side frames (full length) ---
  for (const side of [-1, 1]) {
    const z = side * (w / 2 + frameW / 2);
    // Main frame rail
    addMesh(group, new THREE.BoxGeometry(l, frameH, frameW), frameMat(), [0, h - frameH / 2, z]);
  }

  // --- Rollers ---
  const numRollers = Math.max(2, Math.floor(l / rollerPitch));
  const actualPitch = l / numRollers;
  const rMat = rollerMat();
  const rollerGeo = new THREE.CylinderGeometry(rollerRadius, rollerRadius, w, 12);

  for (let i = 0; i <= numRollers; i++) {
    const x = -halfL + i * actualPitch;
    addMesh(group, rollerGeo, rMat, [x, h, 0], [0, 0, Math.PI / 2]);
  }

  // --- End plates ---
  for (const endX of [-halfL, halfL]) {
    addMesh(group, new THREE.BoxGeometry(0.01, frameH + 0.02, w + frameW * 2 + 0.02), frameMat(),
      [endX, h - frameH / 2, 0]);
  }

  // --- Motor (if driven) ---
  if (driven) {
    addMesh(group, new THREE.BoxGeometry(0.1, 0.08, 0.07), motorMat(),
      [halfL - 0.06, h - 0.04, w / 2 + frameW + 0.05]);
  }

  // --- Side rails (optional, safety yellow) ---
  if (sideRails) {
    for (const side of [-1, 1]) {
      const z = side * (w / 2 - 0.005);
      addMesh(group, new THREE.BoxGeometry(l - 0.04, 0.05, 0.004), railMat(),
        [0, h + rollerRadius + 0.025, z]);
    }
  }

  // --- Support legs ---
  const numLegs = Math.max(2, Math.ceil(l / 1.5) + 1);
  const legSpacing = l / (numLegs - 1);
  const legH = h - frameH;

  for (let i = 0; i < numLegs; i++) {
    const x = -halfL + i * legSpacing;
    for (const side of [-1, 1]) {
      const z = side * (w / 2 + frameW / 2);
      addMesh(group, new THREE.BoxGeometry(0.05, legH, 0.05), legMat(), [x, legH / 2, z]);
      addMesh(group, new THREE.BoxGeometry(0.1, 0.015, 0.1), legMat(), [x, 0.0075, z]);
    }
    addMesh(group, new THREE.BoxGeometry(0.03, 0.03, w + frameW * 2), legMat(), [x, legH * 0.3, 0]);
  }

  const bounds = new THREE.Box3().setFromObject(group);
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, h, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, h, 0] },
  ];

  return { group, ports, bounds, pathLength: l };
}
