import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
const beltMat = () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 });
const guideMat = () => new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.5, roughness: 0.4 });
const legMat = () => new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });
const pusherMat = () => new THREE.MeshStandardMaterial({ color: 0xe53e3e, metalness: 0.6, roughness: 0.4 });
const popupMat = () => new THREE.MeshStandardMaterial({ color: 0x3182ce, metalness: 0.7, roughness: 0.3 });

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

// ─── Transfer Bridge ───
export function buildTransferBridge(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 600) / 1000;
  const l = (params.length ?? 1000) / 1000;
  const h = (params.height ?? 800) / 1000;
  const group = new THREE.Group();
  const halfL = l / 2;

  // Platform surface
  addMesh(group, new THREE.BoxGeometry(l, 0.01, w), frameMat(), [0, h, 0]);

  // Side guides
  const guideH = 0.06;
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(l, guideH, 0.004), guideMat(), [0, h + guideH / 2, side * w / 2]);
  }

  // Legs (4 corners)
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(group, new THREE.BoxGeometry(0.05, h, 0.05), legMat(), [sx * (halfL - 0.05), h / 2, sz * (w / 2 - 0.03)]);
      addMesh(group, new THREE.BoxGeometry(0.1, 0.015, 0.1), legMat(), [sx * (halfL - 0.05), 0.0075, sz * (w / 2 - 0.03)]);
    }
  }

  // Cross braces
  addMesh(group, new THREE.BoxGeometry(0.03, 0.03, w), legMat(), [-halfL + 0.05, h * 0.3, 0]);
  addMesh(group, new THREE.BoxGeometry(0.03, 0.03, w), legMat(), [halfL - 0.05, h * 0.3, 0]);

  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, h, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, h, 0] },
  ];

  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: l };
}

// ─── Pop-Up Transfer ───
export function buildPopupTransfer(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 600) / 1000;
  const l = (params.length ?? 1500) / 1000;
  const h = (params.height ?? 800) / 1000;
  const popupH = (params.popupHeight ?? 200) / 1000;
  const direction = params.direction ?? 'left';
  const group = new THREE.Group();
  const halfL = l / 2;
  const halfW = w / 2;

  // Base frame
  addMesh(group, new THREE.BoxGeometry(l, 0.04, w + 0.08), frameMat(), [0, h - 0.02, 0]);

  // Side frames
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(l, 0.08, 0.04), frameMat(), [0, h, side * (halfW + 0.02)]);
  }

  // Popup rollers (rows of small cylinders)
  const numRows = Math.max(3, Math.floor(l / 0.15));
  const rowSpacing = (l - 0.1) / (numRows - 1);
  for (let i = 0; i < numRows; i++) {
    const x = -halfL + 0.05 + i * rowSpacing;
    // Each row: 3 small cylinders across width
    for (let j = 0; j < 3; j++) {
      const z = -halfW * 0.6 + j * halfW * 0.6;
      addMesh(group, new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), popupMat(),
        [x, h + popupH * 0.5, z], [0, 0, Math.PI / 2]);
    }
    // Lift bar
    addMesh(group, new THREE.BoxGeometry(0.01, popupH, 0.02), popupMat(), [x, h + popupH * 0.25, 0]);
  }

  // Side guides
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(l, 0.05, 0.004), guideMat(), [0, h + 0.06, side * halfW]);
  }

  // Legs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(group, new THREE.BoxGeometry(0.05, h - 0.04, 0.05), legMat(),
        [sx * (halfL - 0.05), (h - 0.04) / 2, sz * (halfW + 0.02)]);
    }
  }

  const dirSign = direction === 'left' ? -1 : 1;
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, h, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, h, 0] },
    { id: 'transfer-in', type: 'input', localPosition: [0, h, -dirSign * halfW] },
    { id: 'transfer-out', type: 'output', localPosition: [0, h, dirSign * halfW] },
  ];

  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: l };
}

// ─── Pusher Transfer ───
export function buildPusherTransfer(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 600) / 1000;
  const l = (params.length ?? 2000) / 1000;
  const h = (params.height ?? 800) / 1000;
  const pushAngle = ((params.pushAngle ?? 90) * Math.PI) / 180;
  const pushSide = params.pushSide ?? 'left';
  const group = new THREE.Group();
  const halfL = l / 2;
  const halfW = w / 2;
  const sideSign = pushSide === 'left' ? -1 : 1;

  // Conveyor base surface
  addMesh(group, new THREE.BoxGeometry(l, 0.02, w), beltMat(), [0, h, 0]);

  // Side frames
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(l, 0.08, 0.04), frameMat(), [0, h - 0.04, side * (halfW + 0.02)]);
  }

  // Pusher arm (cylinder)
  const armLen = w * 0.8;
  addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, armLen, 12), pusherMat(),
    [0, h + 0.1, sideSign * halfW * 0.1], [Math.PI / 2, 0, 0]);

  // Pusher plate
  addMesh(group, new THREE.BoxGeometry(0.3, 0.15, 0.02), pusherMat(),
    [0, h + 0.1, -sideSign * (halfW * 0.3)]);

  // Deflector guide on opposite side (angled)
  const deflectorLen = l * 0.4;
  const deflectorGroup = new THREE.Group();
  addMesh(deflectorGroup, new THREE.BoxGeometry(deflectorLen, 0.08, 0.02), guideMat(), [0, 0, 0]);
  deflectorGroup.position.set(halfL * 0.3, h + 0.04, -sideSign * halfW * 0.5);
  deflectorGroup.rotation.y = sideSign * (Math.PI / 2 - pushAngle);
  group.add(deflectorGroup);

  // Legs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(group, new THREE.BoxGeometry(0.05, h - 0.08, 0.05), legMat(),
        [sx * (halfL - 0.05), (h - 0.08) / 2, sz * (halfW + 0.02)]);
    }
  }

  // Divert exit position
  const divertZ = -sideSign * (halfW + 0.3);
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, h, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, h, 0] },
    { id: 'divert', type: 'output', localPosition: [halfL * 0.3, h, divertZ] },
  ];

  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: l };
}

// ─── Merge/Divert Module ───
export function buildMergeDivert(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 600) / 1000;
  const mainLen = (params.mainLength ?? 3000) / 1000;
  const branchLen = (params.branchLength ?? 2000) / 1000;
  const branchAngle = ((params.branchAngle ?? 30) * Math.PI) / 180;
  const h = (params.height ?? 800) / 1000;
  const mode = params.mode ?? 'divert';
  const group = new THREE.Group();
  const halfMainL = mainLen / 2;

  // Main conveyor section
  addMesh(group, new THREE.BoxGeometry(mainLen, 0.02, w), beltMat(), [0, h, 0]);
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(mainLen, 0.06, 0.03), frameMat(), [0, h - 0.03, side * (w / 2 + 0.015)]);
  }

  // Branch section (angled)
  const branchGroup = new THREE.Group();
  addMesh(branchGroup, new THREE.BoxGeometry(branchLen, 0.02, w), beltMat(), [branchLen / 2, 0, 0]);
  for (const side of [-1, 1]) {
    addMesh(branchGroup, new THREE.BoxGeometry(branchLen, 0.06, 0.03), frameMat(), [branchLen / 2, -0.03, side * (w / 2 + 0.015)]);
  }
  // Position at junction point
  const junctionX = halfMainL * 0.3;
  branchGroup.position.set(junctionX, h, w / 2 + 0.015);
  branchGroup.rotation.y = -branchAngle;
  group.add(branchGroup);

  // Junction cover plate
  addMesh(group, new THREE.BoxGeometry(w * 0.8, 0.015, w * 0.8), frameMat(), [junctionX, h + 0.01, w * 0.3]);

  // Legs under main
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      addMesh(group, new THREE.BoxGeometry(0.05, h - 0.06, 0.05), legMat(),
        [sx * (halfMainL - 0.08), (h - 0.06) / 2, sz * (w / 2)]);
    }
  }
  // Legs under branch end
  const branchEndX = junctionX + Math.cos(branchAngle) * branchLen;
  const branchEndZ = w / 2 + Math.sin(branchAngle) * branchLen;
  for (const sz of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(0.05, h - 0.06, 0.05), legMat(),
      [branchEndX, (h - 0.06) / 2, branchEndZ + sz * w / 2]);
  }

  let ports: ConnectionPort[];
  if (mode === 'merge') {
    ports = [
      { id: 'input-main', type: 'input', localPosition: [-halfMainL, h, 0] },
      { id: 'input-branch', type: 'input', localPosition: [branchEndX, h, branchEndZ] },
      { id: 'output', type: 'output', localPosition: [halfMainL, h, 0] },
    ];
  } else {
    ports = [
      { id: 'input', type: 'input', localPosition: [-halfMainL, h, 0] },
      { id: 'output-main', type: 'output', localPosition: [halfMainL, h, 0] },
      { id: 'output-branch', type: 'output', localPosition: [branchEndX, h, branchEndZ] },
    ];
  }

  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: mainLen };
}
