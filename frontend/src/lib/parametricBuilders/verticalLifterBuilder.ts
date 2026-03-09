import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

/* ── Materials ─────────────────────────────────── */
const steelFrame = () => new THREE.MeshStandardMaterial({ color: 0x5a5a5a, metalness: 0.85, roughness: 0.25 });
const steelLight = () => new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.3 });
const beltMat    = () => new THREE.MeshStandardMaterial({ color: 0x2d2d2d, metalness: 0.3, roughness: 0.7 });
const platMat    = () => new THREE.MeshStandardMaterial({ color: 0x3b82f6, metalness: 0.6, roughness: 0.35 });
const rollerMat  = () => new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.85, roughness: 0.15 });
const fenceMat   = () => new THREE.MeshStandardMaterial({
  color: 0xcccccc, metalness: 0.5, roughness: 0.4,
  transparent: true, opacity: 0.35, wireframe: true,
});
const yellowMat  = () => new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.3, roughness: 0.5 });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function buildVerticalLifter(params: Record<string, any>): BuilderResult {
  const pw      = (params.platformWidth  ?? 1000) / 1000;  // m
  const pd      = (params.platformDepth  ?? 1000) / 1000;  // m
  const liftH   = (params.liftHeight     ?? 3000) / 1000;  // m
  const infeedH = (params.infeedHeight   ?? 0)    / 1000;  // m
  const outfeedH= (params.outfeedHeight  ?? params.liftHeight ?? 3000) / 1000;
  const loadDir = params.loadDirection   ?? 'front';
  const fenceOn = params.fenceEnabled    !== false;  // default ON

  const group = new THREE.Group();

  // ── Dimensions ──
  const col   = 0.06;        // column thickness
  const halfW = pw / 2;
  const halfD = pd / 2;
  const totalH = Math.max(infeedH, outfeedH) + 0.15; // frame extends slightly above highest point
  const baseH  = 0.05;       // base plate height

  // Corner positions (columns are INSIDE the footprint)
  const cx = halfW + col / 2;
  const cz = halfD + col / 2;
  const corners: [number, number][] = [[-cx, -cz], [-cx, cz], [cx, -cz], [cx, cz]];

  // ── Base plate ──
  group.add(mesh(
    new THREE.BoxGeometry(pw + col * 4, baseH, pd + col * 4), steelFrame(),
    [0, baseH / 2, 0]
  ));

  // ── 4 Vertical columns (C-channel profile) ──
  for (const [x, z] of corners) {
    // Main column
    group.add(mesh(
      new THREE.BoxGeometry(col, totalH, col), steelFrame(),
      [x, totalH / 2 + baseH, z]
    ));
    // Channel groove (inner face)
    group.add(mesh(
      new THREE.BoxGeometry(col * 0.35, totalH - 0.05, col * 0.35), steelLight(),
      [x * 0.92, totalH / 2 + baseH, z * 0.92]
    ));
  }

  // ── Top cross beam ──
  group.add(mesh(
    new THREE.BoxGeometry(pw + col * 3, col, col * 0.8), steelFrame(),
    [0, totalH + baseH, 0]
  ));
  group.add(mesh(
    new THREE.BoxGeometry(col * 0.8, col, pd + col * 3), steelFrame(),
    [0, totalH + baseH, 0]
  ));

  // ── Flat belt drives (2 vertical belts on left & right sides) ──
  for (const side of [-1, 1]) {
    group.add(mesh(
      new THREE.BoxGeometry(0.03, totalH * 0.92, 0.06), beltMat(),
      [side * (halfW + col + 0.02), totalH / 2 + baseH, 0]
    ));
    // Belt pulleys (top + bottom)
    for (const yf of [0.08, totalH - 0.02]) {
      group.add(mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.05, 12), steelLight(),
        [side * (halfW + col + 0.02), yf + baseH, 0],
        [0, 0, Math.PI / 2]
      ));
    }
  }

  // ── Cross bracing (diagonal on back side) ──
  const braceLen = Math.sqrt(totalH * totalH + pd * pd) * 0.6;
  for (const side of [-1, 1]) {
    group.add(mesh(
      new THREE.BoxGeometry(0.015, braceLen, 0.015), steelLight(),
      [side * cx, totalH / 2 + baseH, 0],
      [0, 0, Math.atan2(pd * 0.5, totalH * 0.6) * side]
    ));
  }

  // ── Platform / carriage (at mid-travel by default for preview) ──
  const platY = (infeedH + outfeedH) / 2; // default preview position
  const carriageGroup = new THREE.Group();
  carriageGroup.name = 'lift-carriage';

  // Platform base
  carriageGroup.add(mesh(
    new THREE.BoxGeometry(pw - 0.02, 0.04, pd - 0.02), platMat(),
    [0, 0, 0]
  ));

  // Roller conveyor on platform (6 rollers)
  const numRollers = 6;
  for (let i = 0; i < numRollers; i++) {
    const rz = -pd / 2 + 0.08 + (pd - 0.16) * (i / (numRollers - 1));
    carriageGroup.add(mesh(
      new THREE.CylinderGeometry(0.018, 0.018, pw - 0.08, 8), rollerMat(),
      [0, 0.04, rz],
      [0, 0, Math.PI / 2]
    ));
  }

  // Side rails on carriage
  for (const side of [-1, 1]) {
    carriageGroup.add(mesh(
      new THREE.BoxGeometry(0.02, 0.06, pd - 0.02), steelLight(),
      [side * (halfW - 0.02), 0.03, 0]
    ));
  }

  // Carriage guide shoes (clamp onto columns)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      carriageGroup.add(mesh(
        new THREE.BoxGeometry(col * 0.6, 0.12, col * 0.6), steelFrame(),
        [sx * cx * 0.92, 0, sz * cz * 0.92]
      ));
    }
  }

  carriageGroup.position.set(0, platY + baseH, 0);
  group.add(carriageGroup);

  // ── Safety warning stripes at openings ──
  const dirOffsets: Record<string, { x: number; z: number; rotY: number; w: number }> = {
    front: { x: 0, z: -(halfD + col + 0.01), rotY: 0, w: pw },
    back:  { x: 0, z: (halfD + col + 0.01),  rotY: 0, w: pw },
    left:  { x: -(halfW + col + 0.01), z: 0, rotY: Math.PI / 2, w: pd },
    right: { x: (halfW + col + 0.01),  z: 0, rotY: Math.PI / 2, w: pd },
  };

  // Bottom + top warning stripes at load side
  const loadSide = dirOffsets[loadDir] || dirOffsets.front;
  for (const h of [baseH + 0.01, totalH + baseH - 0.01]) {
    group.add(mesh(
      new THREE.BoxGeometry(loadSide.w + 0.02, 0.03, 0.01), yellowMat(),
      [loadSide.x, h, loadSide.z],
      [0, loadSide.rotY, 0]
    ));
  }

  // ── Optional fence / guarding ──
  if (fenceOn) {
    const fenceH = totalH * 0.9;
    const fenceY = totalH / 2 + baseH;
    const fenceOffset = 0.01; // slight offset from frame

    const fencePanels: { x: number; z: number; w: number; d: number; ry: number; skip: boolean }[] = [
      { x: 0, z: -(halfD + col + fenceOffset), w: pw + col * 2, d: 0.01, ry: 0, skip: loadDir === 'front' },
      { x: 0, z:  (halfD + col + fenceOffset), w: pw + col * 2, d: 0.01, ry: 0, skip: loadDir === 'back' },
      { x: -(halfW + col + fenceOffset), z: 0, w: 0.01, d: pd + col * 2, ry: 0, skip: loadDir === 'left' },
      { x:  (halfW + col + fenceOffset), z: 0, w: 0.01, d: pd + col * 2, ry: 0, skip: loadDir === 'right' },
    ];

    for (const panel of fencePanels) {
      if (panel.skip) continue;
      group.add(mesh(
        new THREE.BoxGeometry(panel.w, fenceH, panel.d), fenceMat(),
        [panel.x, fenceY, panel.z],
        [0, panel.ry, 0]
      ));
      // Horizontal fence bars (3 bars per panel for realism)
      for (let bi = 1; bi <= 3; bi++) {
        const barY = baseH + fenceH * (bi / 4);
        group.add(mesh(
          new THREE.BoxGeometry(panel.w, 0.015, panel.d + 0.005),
          steelLight(),
          [panel.x, barY, panel.z]
        ));
      }
    }
  }

  // ── Connection ports — right at the transfer zone, not on outer frame ──
  // Ports sit at the actual roller surface of the platform
  const portInset = 0.02; // very close to platform edge
  const rollerTopOffset = 0.06; // platform base (0.04) + roller radius (0.018)

  const dirPortMap: Record<string, { dx: number; dz: number }> = {
    front: { dx: 0, dz: -(halfD - portInset) },
    back:  { dx: 0, dz:  (halfD - portInset) },
    left:  { dx: -(halfW - portInset), dz: 0 },
    right: { dx:  (halfW - portInset), dz: 0 },
  };
  const portDir = dirPortMap[loadDir] || dirPortMap.front;

  // Unload side is opposite to load side
  const unloadDir = loadDir === 'front' ? 'back' : loadDir === 'back' ? 'front' : loadDir === 'left' ? 'right' : 'left';
  const portDirOut = dirPortMap[unloadDir] || dirPortMap.back;

  const ports: ConnectionPort[] = [
    {
      id: 'input',
      type: 'input',
      localPosition: [portDir.dx, infeedH + rollerTopOffset + baseH, portDir.dz],
    },
    {
      id: 'output',
      type: 'output',
      localPosition: [portDirOut.dx, outfeedH + rollerTopOffset + baseH, portDirOut.dz],
    },
  ];

  return {
    group,
    ports,
    bounds: new THREE.Box3().setFromObject(group),
    pathLength: Math.abs(outfeedH - infeedH),
  };
}
