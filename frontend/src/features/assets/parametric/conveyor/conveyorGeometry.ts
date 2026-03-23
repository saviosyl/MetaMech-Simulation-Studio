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
  buildSEWMotor,
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
  const driveRollerFaceW = Math.max(0.16, widthM - 0.03); // keep roller inside belt side profile
  const tailRollerFaceW = Math.max(0.14, widthM - 0.04);
  const rollerGeo = new THREE.CylinderGeometry(rollerR, rollerR, driveRollerFaceW, 16);
  rollerGeo.rotateX(Math.PI / 2);
  const roller = new THREE.Mesh(rollerGeo, matDrive);

  // Position based on drive type
  const endInset = 0.04;
  const driveX = params.driveType === 'end'
    ? lengthM / 2 - endInset  // slightly recessed for realistic belt-end wrap
    : 0;                    // center
  roller.position.set(driveX, heightM, 0);
  roller.castShadow = true;
  group.add(roller);

  // SEW-style geared motor
  const sewMotor = buildSEWMotor(1.0);
  const motorSideSign = params.motorSide === 'right' ? 1 : -1;
  const rollerShaftEndZ = motorSideSign * (driveRollerFaceW / 2 + 0.005);
  const motorOutputShaftCenterZ = motorSideSign * (driveRollerFaceW / 2 + 0.038);
  // buildSEWMotor output shaft is at local +X, so place origin further outboard.
  const motorSideZ = motorOutputShaftCenterZ + motorSideSign * 0.145;
  // Align gearbox output centerline with the drive roller axis for a proper end-drive look.
  sewMotor.position.set(driveX, heightM + 0.005, motorSideZ);
  const shaftDir = new THREE.Vector3(0, 0, -motorSideSign);
  const motorQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), shaftDir);
  sewMotor.setRotationFromQuaternion(motorQ);
  group.add(sewMotor);

  // Short coupling between gearbox output and drive roller shaft.
  const couplingStartZ = rollerShaftEndZ;
  const couplingEndZ = motorOutputShaftCenterZ;
  const couplingLen = Math.abs(couplingEndZ - couplingStartZ);
  if (couplingLen > 0.001) {
    const couplingGeo = new THREE.CylinderGeometry(0.011, 0.011, couplingLen, 14);
    couplingGeo.rotateX(Math.PI / 2);
    const coupling = new THREE.Mesh(couplingGeo, matRoller);
    coupling.position.set(driveX, heightM, (couplingStartZ + couplingEndZ) / 2);
    coupling.castShadow = true;
    group.add(coupling);
  }

  // Motor mount plate and gusset to integrate drive package with frame rail.
  const mountPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.01, 0.08), matFrame);
  mountPlate.position.set(driveX, heightM - 0.065, motorSideSign * (driveRollerFaceW / 2 + 0.108));
  mountPlate.castShadow = true;
  group.add(mountPlate);
  const gusset = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.01), matFrame);
  gusset.position.set(driveX, heightM - 0.045, motorSideSign * (driveRollerFaceW / 2 + 0.074));
  gusset.castShadow = true;
  group.add(gusset);

  const addEndRefinement = (x: number, endRollerR: number, rollerFaceW: number) => {
    // End plate with bearing blocks to avoid placeholder-looking conveyor ends.
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.075, rollerFaceW + 0.04), matDrive);
    plate.position.set(x, heightM - 0.028, 0);
    plate.castShadow = true;
    group.add(plate);

    // Rounded nose cap around each roller to keep the family look clean and engineered.
    const noseGeo = new THREE.CylinderGeometry(endRollerR + 0.012, endRollerR + 0.012, rollerFaceW + 0.025, 20, 1, true);
    noseGeo.rotateX(Math.PI / 2);
    const nose = new THREE.Mesh(noseGeo, matFrame);
    nose.position.set(x, heightM, 0);
    nose.castShadow = true;
    group.add(nose);

    for (const side of [-1, 1]) {
      const bearingBlock = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.032, 0.04), matDrive);
      bearingBlock.position.set(x, heightM - 0.004, side * (rollerFaceW / 2 + 0.012));
      bearingBlock.castShadow = true;
      group.add(bearingBlock);
    }
  };

  addEndRefinement(driveX, rollerR, driveRollerFaceW);

  // Tail/deflection roller (only for end drive)
  if (params.driveType === 'end') {
    const tailGeo = new THREE.CylinderGeometry(rollerR * 0.8, rollerR * 0.8, tailRollerFaceW, 16);
    tailGeo.rotateX(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeo, matDrive);
    const tailX = -lengthM / 2 + endInset;
    tail.position.set(tailX, heightM, 0);
    tail.castShadow = true;
    group.add(tail);
    addEndRefinement(tailX, rollerR * 0.8, tailRollerFaceW);
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
