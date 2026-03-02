import * as THREE from 'three';

export interface ConnectionPort {
  id: string;
  type: 'input' | 'output';
  localPosition: [number, number, number];
}

export interface BuilderResult {
  group: THREE.Group;
  ports: ConnectionPort[];
  bounds: THREE.Box3;
  pathLength: number;
}

// Materials (shared)
const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
const beltMat = () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 });
const motorMat = () => new THREE.MeshStandardMaterial({ color: 0x2563eb, metalness: 0.6, roughness: 0.4 });
const drumMat = () => new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.9, roughness: 0.2 });
const guideMat = () => new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.5, roughness: 0.4 });
const legMat = () => new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.7, roughness: 0.3 });

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export function buildBeltConveyor(params: Record<string, any>): BuilderResult {
  const w = ((params.width ?? 600) / 1000);       // convert mm to m
  const l = ((params.length ?? 3000) / 1000);
  const h = ((params.height ?? 800) / 1000);
  const angle = (params.angle ?? 0) * Math.PI / 180;
  const sideGuides = params.sideGuides ?? true;
  const driveEnd = params.driveEnd ?? 'right';
  const supportSpacing = ((params.supportSpacing ?? 1500) / 1000);

  const group = new THREE.Group();

  const drumRadius = 0.06;
  const frameChannelH = 0.08;
  const frameChannelW = 0.04;
  const beltThickness = 0.012;

  // Main conveyor group that can be angled
  const convGroup = new THREE.Group();
  if (angle > 0) {
    convGroup.rotation.z = driveEnd === 'right' ? -angle : angle;
  }

  const halfL = l / 2;

  // --- Head section (drive end) ---
  const headX = driveEnd === 'right' ? halfL : -halfL;
  const headDir = driveEnd === 'right' ? 1 : -1;

  // Drive drum
  addMesh(convGroup, new THREE.CylinderGeometry(drumRadius, drumRadius, w + 0.02, 16), drumMat(),
    [headX, h, 0], [0, 0, Math.PI / 2]);

  // Bearing blocks
  for (const side of [-1, 1]) {
    addMesh(convGroup, new THREE.BoxGeometry(0.06, 0.06, 0.04), frameMat(),
      [headX, h, side * (w / 2 + 0.025)]);
  }

  // Motor housing
  const motorSide = 1;
  addMesh(convGroup, new THREE.BoxGeometry(0.12, 0.1, 0.08), motorMat(),
    [headX + headDir * 0.02, h - 0.05, motorSide * (w / 2 + 0.07)]);

  // Frame end plate
  addMesh(convGroup, new THREE.BoxGeometry(0.01, frameChannelH * 2, w + 0.04), frameMat(),
    [headX + headDir * 0.06, h - frameChannelH, 0]);

  // --- Tail section ---
  const tailX = driveEnd === 'right' ? -halfL : halfL;
  const tailDir = driveEnd === 'right' ? -1 : 1;

  // Tail drum (slightly smaller)
  addMesh(convGroup, new THREE.CylinderGeometry(drumRadius * 0.85, drumRadius * 0.85, w + 0.02, 16), drumMat(),
    [tailX, h, 0], [0, 0, Math.PI / 2]);

  // Tension block
  addMesh(convGroup, new THREE.BoxGeometry(0.08, 0.04, 0.05), frameMat(),
    [tailX + tailDir * 0.05, h - 0.02, 0]);

  // Frame end plate
  addMesh(convGroup, new THREE.BoxGeometry(0.01, frameChannelH * 2, w + 0.04), frameMat(),
    [tailX + tailDir * 0.06, h - frameChannelH, 0]);

  // --- Mid sections (side frame channels + cross braces) ---
  const midSectionLen = 0.5;
  const numMidSections = Math.max(1, Math.floor((l - 0.2) / midSectionLen));
  const actualSpacing = (l - 0.12) / numMidSections;

  for (let i = 0; i <= numMidSections; i++) {
    const x = -halfL + 0.06 + i * actualSpacing;

    // Side channels (C-channel: top flange, web, bottom flange per side)
    for (const side of [-1, 1]) {
      const z = side * (w / 2 + frameChannelW / 2);
      // Web (vertical)
      addMesh(convGroup, new THREE.BoxGeometry(actualSpacing * 0.95, frameChannelH, 0.005), frameMat(),
        [x, h - frameChannelH / 2, z]);
      // Top flange
      addMesh(convGroup, new THREE.BoxGeometry(actualSpacing * 0.95, 0.005, frameChannelW), frameMat(),
        [x, h, z]);
      // Bottom flange
      addMesh(convGroup, new THREE.BoxGeometry(actualSpacing * 0.95, 0.005, frameChannelW), frameMat(),
        [x, h - frameChannelH, z]);
    }

    // Cross brace underneath (every other section)
    if (i % 2 === 0) {
      addMesh(convGroup, new THREE.BoxGeometry(0.03, 0.03, w + frameChannelW * 2), frameMat(),
        [x, h - frameChannelH - 0.02, 0]);
    }
  }

  // --- Belt surface ---
  addMesh(convGroup, new THREE.BoxGeometry(l - 0.04, beltThickness, w - 0.01), beltMat(),
    [0, h + drumRadius - beltThickness / 2, 0]);

  // --- Side guides (optional) ---
  if (sideGuides) {
    const guideHeight = 0.06;
    const guideThickness = 0.004;
    for (const side of [-1, 1]) {
      const z = side * (w / 2 - 0.005);
      // Rail
      addMesh(convGroup, new THREE.BoxGeometry(l - 0.08, guideHeight, guideThickness), guideMat(),
        [0, h + drumRadius + guideHeight / 2, z]);

      // Bracket supports every ~1m
      const numBrackets = Math.max(2, Math.ceil(l / 1.0));
      for (let b = 0; b < numBrackets; b++) {
        const bx = -halfL + 0.1 + b * ((l - 0.2) / (numBrackets - 1));
        addMesh(convGroup, new THREE.BoxGeometry(0.02, guideHeight + 0.02, 0.015), guideMat(),
          [bx, h + drumRadius + guideHeight / 2 - 0.01, z + side * 0.008]);
      }
    }
  }

  group.add(convGroup);

  // --- Support legs ---
  const numLegs = Math.max(2, Math.ceil(l / supportSpacing) + 1);
  const legSpacing = l / (numLegs - 1);

  for (let i = 0; i < numLegs; i++) {
    const x = -halfL + i * legSpacing;
    const legH = h - frameChannelH - 0.02;

    for (const side of [-1, 1]) {
      const z = side * (w / 2 + frameChannelW / 2);
      // Vertical post
      addMesh(group, new THREE.BoxGeometry(0.05, legH, 0.05), legMat(),
        [x, legH / 2, z]);
      // Floor pad
      addMesh(group, new THREE.BoxGeometry(0.1, 0.015, 0.1), legMat(),
        [x, 0.0075, z]);
    }

    // Cross brace between legs
    addMesh(group, new THREE.BoxGeometry(0.03, 0.03, w + frameChannelW * 2), legMat(),
      [x, legH * 0.3, 0]);
  }

  // Compute bounds
  const bounds = new THREE.Box3().setFromObject(group);

  // Connection ports
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, h, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, h, 0] },
  ];

  return { group, ports, bounds, pathLength: l };
}
