import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

// Modular conveyor materials
const modularBeltMat = () => new THREE.MeshStandardMaterial({ color: 0x8899aa, metalness: 0.2, roughness: 0.6 });
const chainEdgeMat = () => new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
const plasticGuideMat = () => new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.1, roughness: 0.5 });
const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
const motorMat = () => new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.4 });
const legMat = () => new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
const raisedRibMat = () => new THREE.MeshStandardMaterial({ color: 0x778899, metalness: 0.25, roughness: 0.55 });

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export function buildModularConveyorStraight(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 600) / 1000;
  const l = (params.length ?? 2000) / 1000;
  const h = (params.height ?? 800) / 1000;
  const sideGuides = params.sideGuides ?? true;
  const drivePosition = params.drivePosition ?? 'end';
  const beltType = params.beltType ?? 'flat-top';

  const group = new THREE.Group();
  const halfL = l / 2;
  const frameH = 0.06;
  const frameW = 0.035;
  const beltThickness = 0.015;

  // --- Side frames ---
  for (const side of [-1, 1]) {
    const z = side * (w / 2 + frameW / 2);
    addMesh(group, new THREE.BoxGeometry(l, frameH, frameW), frameMat(), [0, h - frameH / 2, z]);
  }

  // --- Modular belt surface ---
  const bMat = modularBeltMat();
  addMesh(group, new THREE.BoxGeometry(l - 0.02, beltThickness, w - 0.01), bMat,
    [0, h + beltThickness / 2, 0]);

  // --- Belt type details ---
  if (beltType === 'raised-rib') {
    const ribSpacing = 0.05;
    const numRibs = Math.floor((l - 0.04) / ribSpacing);
    const ribGeo = new THREE.BoxGeometry(0.006, 0.008, w - 0.02);
    const rMat = raisedRibMat();
    for (let i = 0; i < numRibs; i++) {
      const rx = -halfL + 0.02 + i * ribSpacing;
      addMesh(group, ribGeo, rMat, [rx, h + beltThickness + 0.004, 0]);
    }
  } else if (beltType === 'flush-grid') {
    // Grid pattern: small gaps in belt represented by thin lines
    const gridSpacing = 0.025;
    const gridMat = new THREE.MeshStandardMaterial({ color: 0x667788, metalness: 0.3, roughness: 0.5 });
    const numGridX = Math.floor((l - 0.04) / gridSpacing);
    const gridGeoX = new THREE.BoxGeometry(0.002, beltThickness + 0.001, w - 0.02);
    for (let i = 0; i < numGridX; i++) {
      const gx = -halfL + 0.02 + i * gridSpacing;
      addMesh(group, gridGeoX, gridMat, [gx, h + beltThickness / 2, 0]);
    }
    const numGridZ = Math.floor((w - 0.02) / gridSpacing);
    const gridGeoZ = new THREE.BoxGeometry(l - 0.04, beltThickness + 0.001, 0.002);
    for (let i = 0; i < numGridZ; i++) {
      const gz = -(w - 0.02) / 2 + i * gridSpacing;
      addMesh(group, gridGeoZ, gridMat, [0, h + beltThickness / 2, gz]);
    }
  }

  // --- Chain edge links along both sides ---
  const chainLinkSpacing = 0.03;
  const numChainLinks = Math.floor((l - 0.02) / chainLinkSpacing);
  const ceMat = chainEdgeMat();
  const chainGeo = new THREE.BoxGeometry(0.015, 0.012, 0.012);
  for (let i = 0; i < numChainLinks; i++) {
    const cx = -halfL + 0.01 + i * chainLinkSpacing;
    for (const side of [-1, 1]) {
      addMesh(group, chainGeo, ceMat, [cx, h + 0.006, side * (w / 2 - 0.006)]);
    }
  }

  // --- End plates ---
  for (const endX of [-halfL, halfL]) {
    addMesh(group, new THREE.BoxGeometry(0.008, frameH + 0.02, w + frameW * 2 + 0.02), frameMat(),
      [endX, h - frameH / 2, 0]);
  }

  // --- Drive motor ---
  const motorX = drivePosition === 'center' ? 0 : halfL - 0.06;
  addMesh(group, new THREE.BoxGeometry(0.1, 0.08, 0.07), motorMat(),
    [motorX, h - 0.04, w / 2 + frameW + 0.05]);

  // --- Side guides ---
  if (sideGuides) {
    const pgMat = plasticGuideMat();
    for (const side of [-1, 1]) {
      const z = side * (w / 2 - 0.003);
      addMesh(group, new THREE.BoxGeometry(l - 0.04, 0.05, 0.005), pgMat,
        [0, h + beltThickness + 0.025, z]);
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

  // --- Cross supports under belt ---
  const numCross = Math.max(2, Math.ceil(l / 0.5));
  for (let i = 0; i < numCross; i++) {
    const cx = -halfL + 0.1 + i * ((l - 0.2) / (numCross - 1));
    addMesh(group, new THREE.BoxGeometry(0.025, 0.025, w + frameW), frameMat(),
      [cx, h - frameH - 0.015, 0]);
  }

  const bounds = new THREE.Box3().setFromObject(group);
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, h, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, h, 0] },
  ];

  return { group, ports, bounds, pathLength: l };
}

export function buildModularConveyorCurve(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 600) / 1000;
  const h = (params.height ?? 800) / 1000;
  const curveAngle = params.curveAngle ?? 90;
  const curveRadius = (params.curveRadius ?? 1000) / 1000;
  const sideGuides = params.sideGuides ?? true;
  const drivePosition = params.drivePosition ?? 'end';
  const beltType = params.beltType ?? 'flat-top';

  const curveAngleRad = curveAngle * Math.PI / 180;
  const group = new THREE.Group();

  const frameH = 0.06;
  const frameW = 0.035;
  const beltThickness = 0.015;
  const innerR = curveRadius - w / 2;
  const outerR = curveRadius + w / 2;
  const segments = Math.max(8, Math.ceil(curveAngle / 5)); // ~5° per segment

  const bMat = modularBeltMat();
  const fMat = frameMat();
  const ceMat = chainEdgeMat();
  const lMat = legMat();

  // Build curve segments
  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * curveAngleRad;
    const a1 = ((i + 1) / segments) * curveAngleRad;
    const aMid = (a0 + a1) / 2;
    const segLen = curveRadius * (a1 - a0);

    // Belt segment
    const bx = curveRadius * Math.cos(aMid);
    const bz = curveRadius * Math.sin(aMid);
    addMesh(group, new THREE.BoxGeometry(segLen + 0.002, beltThickness, w), bMat,
      [bx, h + beltThickness / 2, bz], [0, -(aMid), 0]);

    // Chain edge links on both sides
    for (const rOff of [-w / 2 + 0.006, w / 2 - 0.006]) {
      const cr = curveRadius + rOff;
      const cx = cr * Math.cos(aMid);
      const cz = cr * Math.sin(aMid);
      addMesh(group, new THREE.BoxGeometry(segLen * 0.6, 0.012, 0.012), ceMat,
        [cx, h + 0.006, cz], [0, -(aMid), 0]);
    }

    // Frame sides (inner and outer)
    for (const r of [innerR - frameW / 2, outerR + frameW / 2]) {
      const fx = r * Math.cos(aMid);
      const fz = r * Math.sin(aMid);
      addMesh(group, new THREE.BoxGeometry(segLen + 0.002, frameH, frameW), fMat,
        [fx, h - frameH / 2, fz], [0, -(aMid), 0]);
    }
  }

  // Raised ribs for curve
  if (beltType === 'raised-rib') {
    const ribMat = raisedRibMat();
    const numRibs = Math.ceil(curveAngle / 3);
    for (let i = 0; i < numRibs; i++) {
      const a = (i / numRibs) * curveAngleRad;
      const rx = curveRadius * Math.cos(a);
      const rz = curveRadius * Math.sin(a);
      addMesh(group, new THREE.BoxGeometry(0.006, 0.008, w - 0.02), ribMat,
        [rx, h + beltThickness + 0.004, rz], [0, -a, 0]);
    }
  }

  // --- Side guides along curve ---
  if (sideGuides) {
    const pgMat = plasticGuideMat();
    for (const rOff of [-w / 2 + 0.003, w / 2 - 0.003]) {
      for (let i = 0; i < segments; i++) {
        const aMid = ((i + 0.5) / segments) * curveAngleRad;
        const segLen = curveRadius * (curveAngleRad / segments);
        const r = curveRadius + rOff;
        const gx = r * Math.cos(aMid);
        const gz = r * Math.sin(aMid);
        addMesh(group, new THREE.BoxGeometry(segLen + 0.002, 0.05, 0.005), pgMat,
          [gx, h + beltThickness + 0.025, gz], [0, -(aMid), 0]);
      }
    }
  }

  // End plates
  for (const a of [0, curveAngleRad]) {
    const epx = curveRadius * Math.cos(a);
    const epz = curveRadius * Math.sin(a);
    addMesh(group, new THREE.BoxGeometry(0.008, frameH + 0.02, w + frameW * 2 + 0.02), fMat,
      [epx, h - frameH / 2, epz], [0, -a, 0]);
  }

  // Motor
  const motorAngle = drivePosition === 'center' ? curveAngleRad / 2 : 0;
  const motorR = outerR + frameW + 0.05;
  addMesh(group, new THREE.BoxGeometry(0.1, 0.08, 0.07), motorMat(),
    [motorR * Math.cos(motorAngle), h - 0.04, motorR * Math.sin(motorAngle)],
    [0, -motorAngle, 0]);

  // Support legs at start, middle, end of curve
  const legAngles = [0, curveAngleRad / 2, curveAngleRad];
  const legH = h - frameH;
  for (const a of legAngles) {
    for (const r of [innerR - frameW / 2, outerR + frameW / 2]) {
      const lx = r * Math.cos(a);
      const lz = r * Math.sin(a);
      addMesh(group, new THREE.BoxGeometry(0.05, legH, 0.05), lMat, [lx, legH / 2, lz]);
      addMesh(group, new THREE.BoxGeometry(0.1, 0.015, 0.1), lMat, [lx, 0.0075, lz]);
    }
    // Cross brace
    const bcx = curveRadius * Math.cos(a);
    const bcz = curveRadius * Math.sin(a);
    addMesh(group, new THREE.BoxGeometry(0.03, 0.03, w + frameW * 2), lMat,
      [bcx, legH * 0.3, bcz], [0, -a, 0]);
  }

  const bounds = new THREE.Box3().setFromObject(group);

  // Ports: input at angle=0 (along +X), output at end of curve
  const pathLength = curveRadius * curveAngleRad;
  const inputX = curveRadius;
  const outputX = curveRadius * Math.cos(curveAngleRad);
  const outputZ = curveRadius * Math.sin(curveAngleRad);

  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [inputX, h, 0] },
    { id: 'output', type: 'output', localPosition: [outputX, h, outputZ] },
  ];

  return { group, ports, bounds, pathLength };
}
