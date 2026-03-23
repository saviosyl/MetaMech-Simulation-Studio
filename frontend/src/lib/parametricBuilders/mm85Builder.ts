import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

export interface MM85SourceMappingEntry {
  id: string;
  sourceArchive: string;
  sourceAsset: string;
  extractedAsset: string;
  customerName: string;
}

export const MM85_SOURCE_NAME_MAP: MM85SourceMappingEntry[] = [
  {
    id: 'mm85-conveyor-section',
    sourceArchive: 'X85/Beam.vcm',
    sourceAsset: 'flexlink_xbcb_1a85.stl',
    extractedAsset: '/models/mm85/conveyor-beam-straight.stl',
    customerName: 'MM-85 Conveyor Section',
  },
  {
    id: 'mm85-drive-end',
    sourceArchive: 'X85/EndDrive.vcm',
    sourceAsset: 'xbeb_0a85cnrp.stl',
    extractedAsset: '/models/mm85/drive-end-unit.stl',
    customerName: 'MM-85 Drive End',
  },
  {
    id: 'mm85-idler-end',
    sourceArchive: 'X85/Idler.vcm',
    sourceAsset: 'xbej_a85.stl',
    extractedAsset: '/models/mm85/idler-end-unit.stl',
    customerName: 'MM-85 Idler End',
  },
  {
    id: 'mm85-guide-rail',
    sourceArchive: 'Guide Rails/FixedAluminium.vcm + Guide Rails/FixedPlastic.vcm',
    sourceAsset: 'flexlink_xlrb_48x30.stl + flexlink_xlrb_16x42_c_0.stl',
    extractedAsset: '/models/mm85/guide-rail-fixed-aluminium.stl + /models/mm85/guide-rail-fixed-plastic.stl',
    customerName: 'MM-85 Guide Rails',
  },
  {
    id: 'mm85-support-leg',
    sourceArchive: 'Support/SingleSupport.vcm',
    sourceAsset: 'xucs_44_-_5112469_01-1.stl',
    extractedAsset: '/models/mm85/support-leg-single.stl',
    customerName: 'MM-85 Support Leg',
  },
  {
    id: 'mm85-end-drive-support',
    sourceArchive: 'Support/EndDriveSupport.vcm',
    sourceAsset: 'flexlink_5116741.stl',
    extractedAsset: '/models/mm85/support-end-drive.stl',
    customerName: 'MM-85 End Drive Support',
  },
];

const matFrame = () => new THREE.MeshStandardMaterial({ color: 0x4f5b66, metalness: 0.72, roughness: 0.34 });
const matChain = () => new THREE.MeshStandardMaterial({ color: 0x2f353c, metalness: 0.22, roughness: 0.68 });
const matSteel = () => new THREE.MeshStandardMaterial({ color: 0xa7b0ba, metalness: 0.86, roughness: 0.22 });
const matGuide = () => new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.5, roughness: 0.4 });
const matMotor = () => new THREE.MeshStandardMaterial({ color: 0x2463eb, metalness: 0.65, roughness: 0.36 });
const matFoot = () => new THREE.MeshStandardMaterial({ color: 0x3f4953, metalness: 0.58, roughness: 0.42 });

function addMesh(
  group: THREE.Group,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  position: [number, number, number],
  rotation?: [number, number, number],
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function createBounds(group: THREE.Group): THREE.Box3 {
  return new THREE.Box3().setFromObject(group);
}

function straightPorts(lengthM: number, elevationM: number): ConnectionPort[] {
  const halfL = Math.max(0.12, lengthM / 2);
  return [
    { id: 'input', type: 'input', localPosition: [-halfL, elevationM, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, elevationM, 0] },
  ];
}

export function buildMM85ConveyorSection(params: Record<string, any>): BuilderResult {
  const lengthM = Math.max(0.35, Number(params.sectionLength ?? params.length ?? 1000) / 1000);
  const chainWidthM = Math.max(0.06, Number(params.chainWidth ?? 85) / 1000);
  const elevationM = Math.max(0.25, Number(params.elevation ?? params.height ?? 850) / 1000);
  const sectionStyle = String(params.sectionStyle ?? 'Standard');
  const sideGuidesEnabled = Boolean(params.sideGuidesEnabled ?? true);
  const guideHeightM = Math.max(0.015, Number(params.guideHeight ?? 35) / 1000);

  const group = new THREE.Group();

  const frameSpan = chainWidthM + 0.085;
  const sideRailZ = frameSpan / 2;
  const frameDepth = 0.024;
  const frameHeight = sectionStyle === 'Heavy Duty' ? 0.064 : 0.054;
  const beltTopY = elevationM;
  const frameY = beltTopY - frameHeight / 2;
  const halfL = lengthM / 2;

  for (const side of [-1, 1]) {
    addMesh(
      group,
      new THREE.BoxGeometry(lengthM, frameHeight, frameDepth),
      matFrame(),
      [0, frameY, side * sideRailZ],
    );
  }

  const tieCount = Math.max(2, Math.floor(lengthM / 0.35));
  const tieGeo = new THREE.BoxGeometry(0.02, 0.03, frameSpan + 0.005);
  for (let i = 0; i <= tieCount; i++) {
    const x = -halfL + (lengthM * i) / tieCount;
    addMesh(group, tieGeo, matFrame(), [x, beltTopY - frameHeight + 0.012, 0]);
  }

  addMesh(
    group,
    new THREE.BoxGeometry(lengthM - 0.02, 0.01, chainWidthM),
    matChain(),
    [0, beltTopY + 0.005, 0],
  );

  const chainPitch = 0.04;
  const lugGeo = new THREE.BoxGeometry(0.018, 0.007, chainWidthM - 0.01);
  const lugCount = Math.max(4, Math.floor((lengthM - 0.04) / chainPitch));
  for (let i = 0; i < lugCount; i++) {
    const x = -halfL + 0.02 + i * chainPitch;
    addMesh(group, lugGeo, matSteel(), [x, beltTopY + 0.011, 0]);
  }

  if (sideGuidesEnabled) {
    for (const side of [-1, 1]) {
      const z = side * (chainWidthM / 2 + 0.014);
      addMesh(
        group,
        new THREE.BoxGeometry(lengthM - 0.04, guideHeightM, 0.006),
        matGuide(),
        [0, beltTopY + guideHeightM / 2 + 0.006, z],
      );
    }
  }

  return {
    group,
    ports: straightPorts(lengthM, beltTopY),
    bounds: createBounds(group),
    pathLength: lengthM,
  };
}

export function buildMM85DriveEnd(params: Record<string, any>): BuilderResult {
  const moduleLengthM = Math.max(0.28, Number(params.moduleLength ?? 450) / 1000);
  const chainWidthM = Math.max(0.06, Number(params.chainWidth ?? 85) / 1000);
  const elevationM = Math.max(0.25, Number(params.elevation ?? params.height ?? 850) / 1000);
  const motorSide = String(params.motorSide ?? 'Right');
  const includeEncoder = Boolean(params.includeEncoder ?? true);

  const group = new THREE.Group();
  const frameSpan = chainWidthM + 0.085;
  const halfL = moduleLengthM / 2;
  const frameHeight = 0.058;
  const frameDepth = 0.024;
  const rollerR = 0.038;
  const beltTopY = elevationM;

  for (const side of [-1, 1]) {
    addMesh(
      group,
      new THREE.BoxGeometry(moduleLengthM, frameHeight, frameDepth),
      matFrame(),
      [0, beltTopY - frameHeight / 2, side * frameSpan / 2],
    );
  }

  addMesh(
    group,
    new THREE.CylinderGeometry(rollerR, rollerR, chainWidthM + 0.02, 20),
    matSteel(),
    [halfL - 0.05, beltTopY, 0],
    [0, 0, Math.PI / 2],
  );

  addMesh(
    group,
    new THREE.BoxGeometry(moduleLengthM - 0.02, 0.01, chainWidthM),
    matChain(),
    [0, beltTopY + 0.005, 0],
  );

  const sideSign = motorSide.toLowerCase() === 'left' ? -1 : 1;
  addMesh(
    group,
    new THREE.BoxGeometry(0.11, 0.08, 0.07),
    matMotor(),
    [halfL - 0.08, beltTopY - 0.03, sideSign * (frameSpan / 2 + 0.055)],
  );
  addMesh(
    group,
    new THREE.CylinderGeometry(0.012, 0.012, 0.05, 12),
    matSteel(),
    [halfL - 0.05, beltTopY, sideSign * (chainWidthM / 2 + 0.025)],
    [0, 0, Math.PI / 2],
  );

  if (includeEncoder) {
    addMesh(
      group,
      new THREE.CylinderGeometry(0.02, 0.02, 0.03, 14),
      matSteel(),
      [halfL - 0.05, beltTopY, -sideSign * (chainWidthM / 2 + 0.035)],
      [0, 0, Math.PI / 2],
    );
  }

  return {
    group,
    ports: straightPorts(moduleLengthM, beltTopY),
    bounds: createBounds(group),
    pathLength: moduleLengthM,
  };
}

export function buildMM85IdlerEnd(params: Record<string, any>): BuilderResult {
  const moduleLengthM = Math.max(0.26, Number(params.moduleLength ?? 420) / 1000);
  const chainWidthM = Math.max(0.06, Number(params.chainWidth ?? 85) / 1000);
  const elevationM = Math.max(0.25, Number(params.elevation ?? params.height ?? 850) / 1000);
  const withProtectionCover = Boolean(params.withProtectionCover ?? true);

  const group = new THREE.Group();
  const frameSpan = chainWidthM + 0.085;
  const halfL = moduleLengthM / 2;
  const frameHeight = 0.056;
  const frameDepth = 0.024;
  const rollerR = 0.034;
  const beltTopY = elevationM;

  for (const side of [-1, 1]) {
    addMesh(
      group,
      new THREE.BoxGeometry(moduleLengthM, frameHeight, frameDepth),
      matFrame(),
      [0, beltTopY - frameHeight / 2, side * frameSpan / 2],
    );
  }

  addMesh(
    group,
    new THREE.CylinderGeometry(rollerR, rollerR, chainWidthM + 0.018, 18),
    matSteel(),
    [halfL - 0.045, beltTopY, 0],
    [0, 0, Math.PI / 2],
  );

  addMesh(
    group,
    new THREE.BoxGeometry(moduleLengthM - 0.02, 0.01, chainWidthM),
    matChain(),
    [0, beltTopY + 0.005, 0],
  );

  if (withProtectionCover) {
    addMesh(
      group,
      new THREE.BoxGeometry(0.08, 0.045, chainWidthM + 0.03),
      matFrame(),
      [halfL - 0.035, beltTopY + 0.008, 0],
    );
  }

  return {
    group,
    ports: straightPorts(moduleLengthM, beltTopY),
    bounds: createBounds(group),
    pathLength: moduleLengthM,
  };
}

export function buildMM85GuideRail(params: Record<string, any>): BuilderResult {
  const railLengthM = Math.max(0.3, Number(params.railLength ?? 1000) / 1000);
  const railSpacingM = Math.max(0.08, Number(params.railSpacing ?? 130) / 1000);
  const railHeightM = Math.max(0.02, Number(params.railHeight ?? 35) / 1000);
  const elevationM = Math.max(0.2, Number(params.elevation ?? 900) / 1000);
  const railType = String(params.railType ?? 'Fixed Aluminium');

  const group = new THREE.Group();
  const halfL = railLengthM / 2;
  const railY = elevationM + railHeightM / 2;
  const railZ = railSpacingM / 2;
  const isPlastic = railType.toLowerCase().includes('plastic');
  const railThickness = isPlastic ? 0.007 : 0.006;

  for (const side of [-1, 1]) {
    addMesh(
      group,
      new THREE.BoxGeometry(railLengthM, railHeightM, railThickness),
      matGuide(),
      [0, railY, side * railZ],
    );
  }

  if (isPlastic) {
    // Add a subtle center runner in plastic mode to differentiate the family variant visually.
    addMesh(
      group,
      new THREE.BoxGeometry(railLengthM - 0.06, 0.006, 0.02),
      matGuide(),
      [0, railY + railHeightM * 0.2, 0],
    );
  }

  const bracketCount = Math.max(2, Math.floor(railLengthM / 0.35));
  for (let i = 0; i <= bracketCount; i++) {
    const x = -halfL + (railLengthM * i) / bracketCount;
    addMesh(
      group,
      new THREE.BoxGeometry(0.016, railHeightM + 0.03, railSpacingM + 0.01),
      matSteel(),
      [x, elevationM + (railHeightM + 0.03) / 2, 0],
    );
  }

  return {
    group,
    ports: straightPorts(railLengthM, elevationM + 0.02),
    bounds: createBounds(group),
    pathLength: railLengthM,
  };
}

export function buildMM85SupportLeg(params: Record<string, any>): BuilderResult {
  const supportHeightM = Math.max(0.35, Number(params.supportHeight ?? 850) / 1000);
  const supportSpanM = Math.max(0.12, Number(params.supportSpan ?? 220) / 1000);
  const braceMode = String(params.braceMode ?? 'Cross Brace');
  const footSizeM = Math.max(0.05, Number(params.footSize ?? 80) / 1000);

  const group = new THREE.Group();
  const legSize = 0.04;

  for (const side of [-1, 1]) {
    const z = side * supportSpanM / 2;
    addMesh(
      group,
      new THREE.BoxGeometry(legSize, supportHeightM, legSize),
      matFoot(),
      [0, supportHeightM / 2, z],
    );
    addMesh(
      group,
      new THREE.BoxGeometry(footSizeM, 0.01, footSizeM),
      matFoot(),
      [0, 0.005, z],
    );
  }

  addMesh(
    group,
    new THREE.BoxGeometry(0.05, 0.03, supportSpanM + 0.02),
    matFrame(),
    [0, supportHeightM - 0.015, 0],
  );

  if (braceMode.toLowerCase().includes('cross')) {
    const braceL = Math.sqrt((supportHeightM * 0.75) ** 2 + supportSpanM ** 2);
    for (const sign of [-1, 1]) {
      addMesh(
        group,
        new THREE.BoxGeometry(0.012, braceL, 0.012),
        matSteel(),
        [0, supportHeightM * 0.45, 0],
        [0, 0, sign * Math.atan2(supportSpanM, supportHeightM * 0.75)],
      );
    }
  }

  return {
    group,
    ports: [],
    bounds: createBounds(group),
    pathLength: 0,
  };
}

export function buildMM85EndDriveSupport(params: Record<string, any>): BuilderResult {
  const supportHeightM = Math.max(0.35, Number(params.supportHeight ?? 850) / 1000);
  const supportSpanM = Math.max(0.14, Number(params.supportSpan ?? 260) / 1000);
  const heavyDuty = Boolean(params.heavyDuty ?? true);
  const footSizeM = Math.max(0.05, Number(params.footSize ?? 90) / 1000);

  const group = new THREE.Group();
  const legSize = heavyDuty ? 0.045 : 0.04;
  const beamHeight = heavyDuty ? 0.04 : 0.032;

  for (const side of [-1, 1]) {
    const z = side * supportSpanM / 2;
    addMesh(
      group,
      new THREE.BoxGeometry(legSize, supportHeightM, legSize),
      matFoot(),
      [0, supportHeightM / 2, z],
    );
    addMesh(
      group,
      new THREE.BoxGeometry(footSizeM, 0.012, footSizeM),
      matFoot(),
      [0, 0.006, z],
    );
  }

  addMesh(
    group,
    new THREE.BoxGeometry(0.08, beamHeight, supportSpanM + 0.03),
    matFrame(),
    [0, supportHeightM - beamHeight / 2, 0],
  );

  addMesh(
    group,
    new THREE.BoxGeometry(0.06, 0.02, supportSpanM + 0.05),
    matSteel(),
    [0, supportHeightM + 0.012, 0],
  );

  return {
    group,
    ports: [],
    bounds: createBounds(group),
    pathLength: 0,
  };
}
