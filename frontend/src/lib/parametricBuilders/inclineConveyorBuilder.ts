import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

type Vec3 = [number, number, number];

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function mm(v: any, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function addMesh(
  group: THREE.Group,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  pos: Vec3,
  rot?: Vec3,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

function addBeamBetween(
  group: THREE.Group,
  start: Vec3,
  end: Vec3,
  thicknessY: number,
  thicknessZ: number,
  mat: THREE.Material,
  upOffset = 0,
) {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const dir = new THREE.Vector3().subVectors(e, s);
  const len = dir.length();
  if (len < 1e-5) return;
  const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
  if (upOffset !== 0) mid.y += upOffset;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize());
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(len, thicknessY, thicknessZ), mat);
  mesh.position.copy(mid);
  mesh.quaternion.copy(q);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function yAtX(x: number, x0: number, x1: number, x2: number, x3: number, inY: number, outY: number): number {
  if (x <= x1) return inY;
  if (x <= x2) {
    const span = Math.max(1e-6, x2 - x1);
    const t = (x - x1) / span;
    return inY + (outY - inY) * t;
  }
  if (x <= x3) return outY;
  return outY;
}

function resolveSegmentLengths(params: Record<string, any>) {
  let infeedLenMm = clamp(mm(params.infeedStraightLength, 1200), 200, 30000);
  let inclineLenMm = clamp(mm(params.inclinedLength, 2600), 200, 30000);
  let outfeedLenMm = clamp(mm(params.outfeedStraightLength, 1200), 200, 30000);
  const overallLenMm = clamp(mm(params.overallLength, infeedLenMm + inclineLenMm + outfeedLenMm), 600, 60000);
  const sum = Math.max(1, infeedLenMm + inclineLenMm + outfeedLenMm);
  const scale = overallLenMm / sum;
  infeedLenMm *= scale;
  inclineLenMm *= scale;
  outfeedLenMm *= scale;
  return { infeedLenMm, inclineLenMm, outfeedLenMm };
}

function frameMaterial(finish: string) {
  if (finish === 'Stainless Steel Brushed') {
    return new THREE.MeshStandardMaterial({ color: '#b9c0c8', metalness: 0.86, roughness: 0.31 });
  }
  if (finish === 'Anodized Aluminium') {
    return new THREE.MeshStandardMaterial({ color: '#9aa7b5', metalness: 0.78, roughness: 0.36 });
  }
  return new THREE.MeshStandardMaterial({ color: '#4a5563', metalness: 0.7, roughness: 0.42 });
}

export function buildInclineConveyor(params: Record<string, any>): BuilderResult {
  const width = clamp(mm(params.conveyorWidth, 650), 250, 1800) / 1000;
  const inY = clamp(mm(params.infeedHeightFromFloor, 800), 0, 12000) / 1000;
  const outY = clamp(mm(params.outfeedHeightFromFloor, 1500), 0, 12000) / 1000;
  const sideGuideHeight = clamp(mm(params.sideGuideHeight, 90), 0, 400) / 1000;
  const sideGuidesEnabled = params.sideGuidesEnabled !== false;
  const chainType = String(params.chainType ?? 'Friction Top Chain');
  const cleatPitch = clamp(mm(params.cleatPitch, 240), 60, 1200) / 1000;
  const supportMode = String(params.supportMode ?? 'Standard');
  const supportSpacing = clamp(mm(params.supportSpacing, 1500), 400, 5000) / 1000;
  const driveSide = String(params.driveSide ?? 'Right').toLowerCase().includes('left') ? -1 : 1;
  const motorPosition = String(params.motorPosition ?? 'Outfeed');
  const finish = String(params.frameFinish ?? 'Powder-Coated Steel');

  const { infeedLenMm, inclineLenMm: requestedInclineLenMm, outfeedLenMm } = resolveSegmentLengths(params);
  const infeedLen = infeedLenMm / 1000;
  let inclineLen = requestedInclineLenMm / 1000;
  const outfeedLen = outfeedLenMm / 1000;

  const rise = outY - inY;
  if (Math.abs(rise) >= inclineLen) {
    inclineLen = Math.abs(rise) + 0.08; // ensure valid slope geometry while preserving endpoint heights
  }
  const inclineHoriz = Math.sqrt(Math.max(0.05 * 0.05, inclineLen * inclineLen - rise * rise));
  const totalHoriz = infeedLen + inclineHoriz + outfeedLen;

  const x0 = -totalHoriz / 2;
  const x1 = x0 + infeedLen;
  const x2 = x1 + inclineHoriz;
  const x3 = x2 + outfeedLen;

  const p0: Vec3 = [x0, inY, 0];
  const p1: Vec3 = [x1, inY, 0];
  const p2: Vec3 = [x2, outY, 0];
  const p3: Vec3 = [x3, outY, 0];

  const group = new THREE.Group();
  const frame = frameMaterial(finish);
  const frameLight = new THREE.MeshStandardMaterial({ color: '#8a96a6', metalness: 0.74, roughness: 0.35 });
  const chain = new THREE.MeshStandardMaterial({ color: '#2e3744', metalness: 0.12, roughness: 0.68 });
  const chainFriction = new THREE.MeshStandardMaterial({ color: '#1f2933', metalness: 0.08, roughness: 0.92 });
  const cleatMat = new THREE.MeshStandardMaterial({ color: '#536173', metalness: 0.22, roughness: 0.62 });
  const guideMat = new THREE.MeshStandardMaterial({ color: '#d8dde6', metalness: 0.72, roughness: 0.32 });
  const motorMat = new THREE.MeshStandardMaterial({ color: '#2563eb', metalness: 0.56, roughness: 0.38 });
  const footMat = new THREE.MeshStandardMaterial({ color: '#677281', metalness: 0.6, roughness: 0.45 });

  const chainThickness = 0.012;
  const frameDrop = 0.062;
  const railDepth = 0.05;
  const frameZ = width / 2 + 0.03;

  // Top chain surface (3 sections)
  addBeamBetween(group, p0, p1, chainThickness, width * 0.96, chain);
  addBeamBetween(group, p1, p2, chainThickness, width * 0.96, chain);
  addBeamBetween(group, p2, p3, chainThickness, width * 0.96, chain);

  if (chainType === 'Friction Top Chain') {
    addBeamBetween(group, p0, p1, chainThickness * 0.5, width * 0.72, chainFriction, chainThickness * 0.45);
    addBeamBetween(group, p1, p2, chainThickness * 0.5, width * 0.72, chainFriction, chainThickness * 0.45);
    addBeamBetween(group, p2, p3, chainThickness * 0.5, width * 0.72, chainFriction, chainThickness * 0.45);
  } else {
    const seg = new THREE.Vector3().subVectors(new THREE.Vector3(...p2), new THREE.Vector3(...p1));
    const segLen = seg.length();
    if (segLen > 0.08) {
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), seg.clone().normalize());
      const count = Math.min(96, Math.max(2, Math.floor(segLen / cleatPitch)));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const pos = new THREE.Vector3(
          p1[0] + (p2[0] - p1[0]) * t,
          p1[1] + (p2[1] - p1[1]) * t,
          0,
        );
        const cleat = new THREE.Mesh(
          new THREE.BoxGeometry(0.02, 0.03, width * 0.9),
          cleatMat,
        );
        cleat.position.copy(pos);
        cleat.position.y += chainThickness * 0.45 + 0.015;
        cleat.quaternion.copy(q);
        cleat.castShadow = true;
        cleat.receiveShadow = true;
        group.add(cleat);
      }
    }
  }

  // Frame side rails (offset from chain line)
  for (const s of [-1, 1]) {
    const off: Vec3 = [0, -frameDrop, s * frameZ];
    addBeamBetween(group, [p0[0], p0[1] + off[1], off[2]], [p1[0], p1[1] + off[1], off[2]], 0.035, railDepth, frame);
    addBeamBetween(group, [p1[0], p1[1] + off[1], off[2]], [p2[0], p2[1] + off[1], off[2]], 0.035, railDepth, frame);
    addBeamBetween(group, [p2[0], p2[1] + off[1], off[2]], [p3[0], p3[1] + off[1], off[2]], 0.035, railDepth, frame);
  }

  // Return path (lower chain track) — keep intentional, avoid ultra-thin rod look
  const returnDrop = 0.18;
  const r0: Vec3 = [p0[0], p0[1] - returnDrop, 0];
  const r1: Vec3 = [p1[0], p1[1] - returnDrop, 0];
  const r2: Vec3 = [p2[0], p2[1] - returnDrop, 0];
  const r3: Vec3 = [p3[0], p3[1] - returnDrop, 0];
  addBeamBetween(group, r0, r1, 0.014, width * 0.72, chainFriction);
  addBeamBetween(group, r1, r2, 0.014, width * 0.72, chainFriction);
  addBeamBetween(group, r2, r3, 0.014, width * 0.72, chainFriction);

  // End housings + bracket plates (clean profile, no exposed round cross-bars)
  for (const [x, y] of [[x0, inY], [x3, outY]] as [number, number][]) {
    addMesh(group, new THREE.BoxGeometry(0.075, 0.09, width + 0.06), frameLight, [x, y, 0]);
    addMesh(group, new THREE.BoxGeometry(0.025, 0.12, width + 0.12), frame, [x, y - 0.06, 0]);
    for (const s of [-1, 1]) {
      addMesh(
        group,
        new THREE.BoxGeometry(0.04, 0.05, 0.04),
        frameLight,
        [x, y - 0.01, s * (width / 2 + 0.03)],
      );
    }
  }

  // Side guides
  if (sideGuidesEnabled && sideGuideHeight > 0.001) {
    for (const s of [-1, 1]) {
      const z = s * (width / 2 - 0.008);
      addBeamBetween(group, [p0[0], p0[1] + sideGuideHeight / 2, z], [p1[0], p1[1] + sideGuideHeight / 2, z], sideGuideHeight, 0.006, guideMat);
      addBeamBetween(group, [p1[0], p1[1] + sideGuideHeight / 2, z], [p2[0], p2[1] + sideGuideHeight / 2, z], sideGuideHeight, 0.006, guideMat);
      addBeamBetween(group, [p2[0], p2[1] + sideGuideHeight / 2, z], [p3[0], p3[1] + sideGuideHeight / 2, z], sideGuideHeight, 0.006, guideMat);
    }
  }

  // Support stations (feet always at floor)
  const spacingFactor = supportMode === 'Minimal' ? 1.35 : supportMode === 'Heavy Duty' ? 0.8 : 1;
  const stationSpacing = supportSpacing * spacingFactor;
  const stations = Math.max(2, Math.floor(totalHoriz / stationSpacing) + 1);
  const legT = supportMode === 'Heavy Duty' ? 0.06 : supportMode === 'Minimal' ? 0.038 : 0.048;
  const supportZ = width / 2 + 0.1;
  const supportTopDrop = frameDrop + 0.02;
  const stationX: number[] = [];

  for (let i = 0; i < stations; i++) {
    const x = x0 + (i / (stations - 1)) * (x3 - x0);
    stationX.push(x);
    const topY = yAtX(x, x0, x1, x2, x3, inY, outY) - supportTopDrop;
    const legH = Math.max(0.08, topY);

    for (const s of [-1, 1]) {
      const z = s * supportZ;
      addMesh(group, new THREE.BoxGeometry(legT, legH, legT), frame, [x, legH / 2, z]);
      addMesh(group, new THREE.BoxGeometry(0.13, 0.012, 0.13), footMat, [x, 0.006, z]);
      addMesh(group, new THREE.BoxGeometry(0.032, 0.024, 0.032), footMat, [x, 0.024, z]);
    }

    addMesh(group, new THREE.BoxGeometry(legT * 0.8, legT * 0.8, supportZ * 2), frameLight, [x, Math.max(0.04, legH - 0.03), 0]);

    // Keep extra bracing only in heavy-duty mode to avoid stray thin-bar visuals in standard mode.
    if (supportMode === 'Heavy Duty') {
      const diagLen = Math.sqrt((supportZ * 2) ** 2 + (legH * 0.55) ** 2);
      addMesh(
        group,
        new THREE.BoxGeometry(0.024, diagLen, 0.024),
        frameLight,
        [x, legH * 0.42, 0],
        [Math.PI / 2, 0, Math.atan2(supportZ * 2, legH * 0.55)],
      );
    }
  }

  // Longitudinal bracing between support frames
  if (supportMode === 'Heavy Duty' && stationX.length > 1) {
    for (let i = 0; i < stationX.length - 1; i++) {
      const xa = stationX[i];
      const xb = stationX[i + 1];
      for (const s of [-1, 1]) {
        const z = s * supportZ;
        const ya = Math.max(0.12, yAtX(xa, x0, x1, x2, x3, inY, outY) - supportTopDrop * 1.65);
        const yb = Math.max(0.12, yAtX(xb, x0, x1, x2, x3, inY, outY) - supportTopDrop * 1.65);
        addBeamBetween(group, [xa, ya, z], [xb, yb, z], 0.02, 0.02, frameLight);
      }
    }
  }

  // Drive + motor assembly
  const motorX = motorPosition === 'Infeed' ? x0 + 0.18 : motorPosition === 'Center' ? (x0 + x3) * 0.5 : x3 - 0.18;
  const motorY = yAtX(motorX, x0, x1, x2, x3, inY, outY) - frameDrop - 0.045;
  const motorZ = driveSide * (width / 2 + 0.16);
  addMesh(group, new THREE.BoxGeometry(0.22, 0.14, 0.11), motorMat, [motorX, motorY, motorZ]);
  addMesh(group, new THREE.BoxGeometry(0.12, 0.09, 0.09), frameLight, [motorX + 0.08, motorY + 0.01, motorZ]);

  const bounds = new THREE.Box3().setFromObject(group);
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [x0 + 0.01, inY, 0] },
    { id: 'output', type: 'output', localPosition: [x3 - 0.01, outY, 0] },
  ];

  return {
    group,
    ports,
    bounds,
    pathLength: infeedLen + inclineLen + outfeedLen,
  };
}

