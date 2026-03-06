/**
 * Conveyor Geometry Builders — Belt, Roller, Modular surfaces + frames
 *
 * Creates the main conveyor body using procedural geometry.
 * The body sits at Y=heightMm, centered at origin along X (length axis).
 */
import * as THREE from 'three';
import { ConveyorParams } from './conveyorTypes';

// Premium shared materials
import {
  matStainlessSteel as matFrame,
  matBelt,
  matChrome as matRoller,
  matModularBelt as matModular,
  matDarkSteel as matDrive,
  matIndustrialBlue as matMotor,
  matCleatRubber as matCleat,
  matSidewall,
} from '../premiumMaterials';

/** Build frame side rails */
function buildFrame(lengthM: number, widthM: number, heightM: number, frameColor?: string): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'frame';
  const railH = 0.04; // 40mm tall rail
  const railD = 0.04; // 40mm deep rail
  const frameMat = frameColor && frameColor !== '#c0c0c0'
    ? new THREE.MeshStandardMaterial({ color: frameColor, metalness: 0.6, roughness: 0.35 })
    : matFrame;

  for (const side of [-1, 1]) {
    const railGeo = new THREE.BoxGeometry(lengthM, railH, railD);
    const rail = new THREE.Mesh(railGeo, frameMat);
    rail.position.set(0, heightM - railH / 2, side * (widthM / 2 + railD / 2));
    rail.castShadow = true;
    frame.add(rail);
  }

  // Bottom cross members (every ~600mm)
  const crossSpacing = 0.6;
  const numCross = Math.max(2, Math.floor(lengthM / crossSpacing));
  for (let i = 0; i < numCross; i++) {
    const x = -lengthM / 2 + 0.05 + (lengthM - 0.1) * (i / (numCross - 1));
    const crossGeo = new THREE.BoxGeometry(0.03, 0.03, widthM + railD * 2);
    const cross = new THREE.Mesh(crossGeo, frameMat);
    cross.position.set(x, heightM - railH - 0.015, 0);
    frame.add(cross);
  }

  return frame;
}

/** Build belt conveyor surface */
function buildBeltSurface(lengthM: number, widthM: number, heightM: number, beltColor?: string): THREE.Group {
  const group = new THREE.Group();
  group.name = 'beltSurface';

  // Belt top surface — user-configurable color
  const beltMat = beltColor && beltColor !== '#1e1e1e'
    ? new THREE.MeshStandardMaterial({ color: beltColor, metalness: 0.05, roughness: 0.75 })
    : matBelt;
  const beltGeo = new THREE.BoxGeometry(lengthM - 0.02, 0.005, widthM);
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.set(0, heightM + 0.0025, 0);
  belt.receiveShadow = true;
  group.add(belt);

  // Slider bed (under belt)
  const bedGeo = new THREE.BoxGeometry(lengthM - 0.04, 0.003, widthM - 0.01);
  const bed = new THREE.Mesh(bedGeo, matFrame);
  bed.position.set(0, heightM - 0.0015, 0);
  group.add(bed);

  return group;
}

/** Build roller conveyor surface */
function buildRollerSurface(lengthM: number, widthM: number, heightM: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rollerSurface';

  const rollerSpacing = 0.075; // 75mm pitch
  const rollerR = 0.025; // 25mm radius
  const numRollers = Math.max(2, Math.floor(lengthM / rollerSpacing));

  for (let i = 0; i < numRollers; i++) {
    const x = -lengthM / 2 + 0.04 + (lengthM - 0.08) * (i / (numRollers - 1));
    const rollerGeo = new THREE.CylinderGeometry(rollerR, rollerR, widthM - 0.01, 12);
    rollerGeo.rotateX(Math.PI / 2); // align along Z (width)
    const roller = new THREE.Mesh(rollerGeo, matRoller);
    roller.position.set(x, heightM + rollerR, 0);
    roller.castShadow = true;
    group.add(roller);
  }

  return group;
}

/** Build modular belt surface */
function buildModularSurface(lengthM: number, widthM: number, heightM: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'modularSurface';

  // Modular belt = segmented top surface
  const segLength = 0.05; // 50mm segments
  const numSegs = Math.max(2, Math.floor(lengthM / segLength));
  const gap = 0.002;

  for (let i = 0; i < numSegs; i++) {
    const x = -lengthM / 2 + segLength / 2 + i * segLength;
    if (x > lengthM / 2) break;
    const segGeo = new THREE.BoxGeometry(segLength - gap, 0.008, widthM - 0.005);
    const seg = new THREE.Mesh(segGeo, matModular);
    seg.position.set(x, heightM + 0.004, 0);
    seg.receiveShadow = true;
    group.add(seg);
  }

  return group;
}

/** Build cleated belt surface — belt with raised cleats for incline transport */
function buildCleatedSurface(lengthM: number, widthM: number, heightM: number, params: ConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'cleatedSurface';

  // Base belt (same as standard belt but darker)
  const beltGeo = new THREE.BoxGeometry(lengthM - 0.02, 0.006, widthM);
  const belt = new THREE.Mesh(beltGeo, matBelt);
  belt.position.set(0, heightM + 0.003, 0);
  belt.receiveShadow = true;
  group.add(belt);

  // Slider bed
  const bedGeo = new THREE.BoxGeometry(lengthM - 0.04, 0.003, widthM - 0.01);
  const bed = new THREE.Mesh(bedGeo, matFrame);
  bed.position.set(0, heightM - 0.0015, 0);
  group.add(bed);

  // Cleats
  const cleatH = params.cleatHeightMm / 1000;
  const cleatSpacing = params.cleatSpacingMm / 1000;
  const numCleats = Math.max(1, Math.floor((lengthM - 0.06) / cleatSpacing));
  const cleatThickness = 0.006; // 6mm thick rubber/plastic cleat

  for (let i = 0; i < numCleats; i++) {
    const x = -lengthM / 2 + 0.03 + cleatSpacing / 2 + i * cleatSpacing;
    if (x > lengthM / 2 - 0.03) break;

    let cleatMesh: THREE.Mesh;

    switch (params.cleatStyle) {
      case 'chevron': {
        // V-shaped cleat: two angled strips forming a chevron pointing forward
        const chevronGroup = new THREE.Group();
        const stripLen = widthM * 0.45;
        for (const side of [-1, 1]) {
          const stripGeo = new THREE.BoxGeometry(stripLen, cleatH, cleatThickness);
          const strip = new THREE.Mesh(stripGeo, matCleat);
          strip.position.set(0, cleatH / 2, side * widthM * 0.15);
          strip.rotation.y = side * 0.4; // ~23° angle
          strip.castShadow = true;
          chevronGroup.add(strip);
        }
        chevronGroup.position.set(x, heightM + 0.006, 0);
        group.add(chevronGroup);
        continue; // skip the single-mesh path below
      }
      case 'angled': {
        // Angled cleat: single strip rotated ~15° from perpendicular
        const cleatGeo = new THREE.BoxGeometry(cleatThickness, cleatH, widthM - 0.02);
        cleatMesh = new THREE.Mesh(cleatGeo, matCleat);
        cleatMesh.position.set(x, heightM + 0.006 + cleatH / 2, 0);
        cleatMesh.rotation.y = 0.26; // ~15°
        break;
      }
      default: {
        // Straight cleat: perpendicular to belt direction
        const cleatGeo = new THREE.BoxGeometry(cleatThickness, cleatH, widthM - 0.02);
        cleatMesh = new THREE.Mesh(cleatGeo, matCleat);
        cleatMesh.position.set(x, heightM + 0.006 + cleatH / 2, 0);
        break;
      }
    }

    cleatMesh.castShadow = true;
    group.add(cleatMesh);
  }

  // Corrugated sidewalls (optional — keeps product from sliding off inclines)
  if (params.sidewallEnabled) {
    const wallH = params.sidewallHeightMm / 1000;
    const wallThickness = 0.004;
    for (const side of [-1, 1]) {
      // Main sidewall panel
      const wallGeo = new THREE.BoxGeometry(lengthM - 0.04, wallH, wallThickness);
      const wall = new THREE.Mesh(wallGeo, matSidewall);
      wall.position.set(0, heightM + 0.006 + wallH / 2, side * (widthM / 2 - wallThickness / 2));
      wall.castShadow = true;
      group.add(wall);

      // Corrugation ribs (vertical stiffeners every ~100mm)
      const ribSpacing = 0.1;
      const numRibs = Math.max(2, Math.floor(lengthM / ribSpacing));
      for (let r = 0; r < numRibs; r++) {
        const rx = -lengthM / 2 + 0.04 + (lengthM - 0.08) * (r / (numRibs - 1));
        const ribGeo = new THREE.BoxGeometry(0.003, wallH - 0.005, 0.008);
        const rib = new THREE.Mesh(ribGeo, matSidewall);
        rib.position.set(rx, heightM + 0.006 + wallH / 2, side * (widthM / 2 + 0.002));
        group.add(rib);
      }
    }
  }

  return group;
}

/** Build drive assembly (end or center) */
function buildDriveAssembly(params: ConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'drive';

  const lengthM = params.lengthMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;

  // Drive roller
  const rollerR = 0.03;
  const rollerGeo = new THREE.CylinderGeometry(rollerR, rollerR, widthM + 0.02, 16);
  rollerGeo.rotateX(Math.PI / 2);
  const roller = new THREE.Mesh(rollerGeo, matDrive);

  // Position based on drive type
  const driveX = params.driveType === 'end'
    ? lengthM / 2 - 0.02  // at output end
    : 0;                    // center
  roller.position.set(driveX, heightM, 0);
  roller.castShadow = true;
  group.add(roller);

  // Motor housing
  const motorW = 0.12;
  const motorH = 0.1;
  const motorD = 0.15;
  const motorGeo = new THREE.BoxGeometry(motorD, motorH, motorW);
  const motor = new THREE.Mesh(motorGeo, matMotor);

  const motorSideZ = params.motorSide === 'right'
    ? widthM / 2 + 0.04 + motorW / 2
    : -(widthM / 2 + 0.04 + motorW / 2);
  motor.position.set(driveX, heightM - motorH / 2, motorSideZ);
  motor.castShadow = true;
  group.add(motor);

  // Tail/deflection roller (only for end drive)
  if (params.driveType === 'end') {
    const tailGeo = new THREE.CylinderGeometry(rollerR * 0.8, rollerR * 0.8, widthM + 0.02, 16);
    tailGeo.rotateX(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, matDrive);
    tail.position.set(-lengthM / 2 + 0.02, heightM, 0);
    tail.castShadow = true;
    group.add(tail);
  }

  return group;
}

/** Build the complete conveyor body (frame + surface + drive) */
export function buildConveyorBody(params: ConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'conveyorBody';

  const lengthM = params.lengthMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;

  // Frame
  group.add(buildFrame(lengthM, widthM, heightM, params.frameColor));

  // Surface based on type
  switch (params.conveyorType) {
    case 'belt':
      group.add(buildBeltSurface(lengthM, widthM, heightM, params.beltColor));
      break;
    case 'roller':
      group.add(buildRollerSurface(lengthM, widthM, heightM));
      break;
    case 'modular':
      group.add(buildModularSurface(lengthM, widthM, heightM));
      break;
    case 'cleated':
      group.add(buildCleatedSurface(lengthM, widthM, heightM, params));
      break;
  }

  // Drive
  group.add(buildDriveAssembly(params));

  // Apply incline
  if (params.angleDeg !== 0) {
    const angleRad = (params.angleDeg * Math.PI) / 180;
    group.rotation.z = angleRad;
  }

  return group;
}
