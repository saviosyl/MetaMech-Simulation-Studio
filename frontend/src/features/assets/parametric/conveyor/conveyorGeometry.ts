/**
 * Conveyor Geometry Builders — Belt, Roller, Modular surfaces + frames
 *
 * Creates the main conveyor body using procedural geometry.
 * The body sits at Y=heightMm, centered at origin along X (length axis).
 */
import * as THREE from 'three';
import { ConveyorParams } from './conveyorTypes';

// Shared materials
const matFrame = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, metalness: 0.7, roughness: 0.3 });
const matBelt = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.1, roughness: 0.8 });
const matRoller = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.2 });
const matModular = new THREE.MeshStandardMaterial({ color: 0x4488aa, metalness: 0.3, roughness: 0.5 });
const matDrive = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });
const matMotor = new THREE.MeshStandardMaterial({ color: 0x336699, metalness: 0.7, roughness: 0.3 });

/** Build frame side rails */
function buildFrame(lengthM: number, widthM: number, heightM: number): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'frame';
  const railH = 0.04; // 40mm tall rail
  const railD = 0.04; // 40mm deep rail

  for (const side of [-1, 1]) {
    const railGeo = new THREE.BoxGeometry(lengthM, railH, railD);
    const rail = new THREE.Mesh(railGeo, matFrame);
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
    const cross = new THREE.Mesh(crossGeo, matFrame);
    cross.position.set(x, heightM - railH - 0.015, 0);
    frame.add(cross);
  }

  return frame;
}

/** Build belt conveyor surface */
function buildBeltSurface(lengthM: number, widthM: number, heightM: number): THREE.Group {
  const group = new THREE.Group();
  group.name = 'beltSurface';

  // Belt top surface
  const beltGeo = new THREE.BoxGeometry(lengthM - 0.02, 0.005, widthM);
  const belt = new THREE.Mesh(beltGeo, matBelt);
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
  group.add(buildFrame(lengthM, widthM, heightM));

  // Surface based on type
  switch (params.conveyorType) {
    case 'belt':
      group.add(buildBeltSurface(lengthM, widthM, heightM));
      break;
    case 'roller':
      group.add(buildRollerSurface(lengthM, widthM, heightM));
      break;
    case 'modular':
      group.add(buildModularSurface(lengthM, widthM, heightM));
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
