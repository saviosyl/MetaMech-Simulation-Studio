/**
 * Bend Conveyor Geometry — Curved belt/roller/modular surface + frame
 *
 * Geometry layout (right bend, 90°):
 *   - Center of arc at origin (0, 0, 0)
 *   - Infeed at angle 0 (−X direction incoming → tangent)
 *   - Arc sweeps clockwise (for 'right') or CCW (for 'left')
 *
 * Convention: arc center is at (0, 0, 0).
 *   For a RIGHT bend, infeed comes from −X at Z = +radius,
 *   arc sweeps from angle=0 to angle=bendAngle around Y axis.
 */
import * as THREE from 'three';
import { BendConveyorParams } from './bendTypes';

// Shared materials
const matFrame = new THREE.MeshStandardMaterial({ color: 0xb0b0b0, metalness: 0.7, roughness: 0.3 });
const matBelt = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.1, roughness: 0.8 });
const matRoller = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 0.8, roughness: 0.2 });
const matModular = new THREE.MeshStandardMaterial({ color: 0x4488aa, metalness: 0.3, roughness: 0.5 });
const matGuide = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.5, roughness: 0.4 });
const matAluminum = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.7, roughness: 0.3 });
const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x404040, metalness: 0.8, roughness: 0.2 });
const matFootPad = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.5, roughness: 0.6 });
const matDrive = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });

/** Convert polar (angle, radius) to XZ position on the arc */
function arcXZ(angleDeg: number, radius: number, dir: 'left' | 'right'): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  if (dir === 'right') {
    return [Math.sin(a) * radius, Math.cos(a) * radius];
  } else {
    return [-Math.sin(a) * radius, Math.cos(a) * radius];
  }
}

/** Build curved frame side rails using segmented boxes */
function buildCurvedFrame(params: BendConveyorParams): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'frame';

  const radiusM = params.radiusMm / 1000;
  const halfW = params.widthMm / 2000;
  const heightM = params.heightMm / 1000;
  const angleDeg = params.bendAngleDeg;
  const railH = 0.04;
  const railD = 0.04;

  // Number of segments for smooth curve
  const numSegs = Math.max(8, Math.ceil(angleDeg / 5));
  const segAngle = angleDeg / numSegs;

  for (const offset of [-halfW - railD / 2, halfW + railD / 2]) {
    for (let i = 0; i < numSegs; i++) {
      const a0 = i * segAngle;
      const a1 = (i + 1) * segAngle;
      const aMid = (a0 + a1) / 2;
      const r = radiusM + offset;

      const [x0, z0] = arcXZ(a0, r, params.bendDirection);
      const [x1, z1] = arcXZ(a1, r, params.bendDirection);
      const [xm, zm] = arcXZ(aMid, r, params.bendDirection);

      const segLen = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
      const angle = Math.atan2(x1 - x0, z1 - z0);

      const seg = new THREE.Mesh(
        new THREE.BoxGeometry(railD, railH, segLen),
        matFrame,
      );
      seg.position.set(xm, heightM - railH / 2, zm);
      seg.rotation.y = -angle;
      seg.castShadow = true;
      frame.add(seg);
    }
  }

  // Cross members (radial) every ~30°
  const crossInterval = Math.max(15, 30);
  const numCross = Math.max(2, Math.floor(angleDeg / crossInterval) + 1);
  for (let i = 0; i < numCross; i++) {
    const a = (angleDeg * i) / (numCross - 1);
    const [xi, zi] = arcXZ(a, radiusM - halfW - railD, params.bendDirection);
    const [xo, zo] = arcXZ(a, radiusM + halfW + railD, params.bendDirection);

    const crossLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const crossAngle = Math.atan2(xo - xi, zo - zi);
    const cx = (xi + xo) / 2;
    const cz = (zi + zo) / 2;

    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, crossLen),
      matFrame,
    );
    cross.position.set(cx, heightM - railH - 0.015, cz);
    cross.rotation.y = -crossAngle;
    frame.add(cross);
  }

  return frame;
}

/** Build belt surface as curved segments */
function buildCurvedBelt(params: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'beltSurface';

  const radiusM = params.radiusMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;
  const angleDeg = params.bendAngleDeg;
  const numSegs = Math.max(12, Math.ceil(angleDeg / 3));
  const segAngle = angleDeg / numSegs;

  for (let i = 0; i < numSegs; i++) {
    const a0 = i * segAngle;
    const a1 = (i + 1) * segAngle;
    const aMid = (a0 + a1) / 2;

    const [x0, z0] = arcXZ(a0, radiusM, params.bendDirection);
    const [x1, z1] = arcXZ(a1, radiusM, params.bendDirection);
    const [xm, zm] = arcXZ(aMid, radiusM, params.bendDirection);

    const segLen = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
    const angle = Math.atan2(x1 - x0, z1 - z0);

    const segMesh = new THREE.Mesh(
      new THREE.BoxGeometry(widthM, 0.005, segLen),
      matBelt,
    );
    segMesh.position.set(xm, heightM + 0.0025, zm);
    segMesh.rotation.y = -angle;
    segMesh.receiveShadow = true;
    group.add(segMesh);
  }

  return group;
}

/** Build roller surface on the curve */
function buildCurvedRollers(params: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rollerSurface';

  const radiusM = params.radiusMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;
  const angleDeg = params.bendAngleDeg;
  const rollerR = 0.025;

  // Rollers are tapered/conical on bends for differential speed
  const rollerSpacingDeg = (75 / (radiusM * Math.PI * 2)) * 360; // ~75mm pitch at center
  const numRollers = Math.max(3, Math.floor(angleDeg / rollerSpacingDeg));

  for (let i = 0; i < numRollers; i++) {
    const a = (angleDeg * (i + 0.5)) / numRollers;
    const [xc, zc] = arcXZ(a, radiusM, params.bendDirection);
    const [xi, zi] = arcXZ(a, radiusM - widthM / 2, params.bendDirection);
    const [xo, zo] = arcXZ(a, radiusM + widthM / 2, params.bendDirection);

    const rollerLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const rollerAngle = Math.atan2(xo - xi, zo - zi);

    // Tapered roller (inner radius smaller than outer for differential speed)
    const innerR = rollerR * 0.85;
    const outerR = rollerR;
    const rollerGeo = new THREE.CylinderGeometry(
      params.bendDirection === 'right' ? innerR : outerR,
      params.bendDirection === 'right' ? outerR : innerR,
      rollerLen,
      12,
    );

    const roller = new THREE.Mesh(rollerGeo, matRoller);
    roller.position.set(xc, heightM + rollerR, zc);
    // Rotate cylinder to lay along radial direction
    roller.rotation.set(0, -rollerAngle, Math.PI / 2);
    roller.castShadow = true;
    group.add(roller);
  }

  return group;
}

/** Build modular belt surface on the curve */
function buildCurvedModular(params: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'modularSurface';

  const radiusM = params.radiusMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;
  const angleDeg = params.bendAngleDeg;

  // Modular segments with small gaps
  const numSegs = Math.max(8, Math.ceil(angleDeg / 2));
  const segAngle = angleDeg / numSegs;
  const gap = 0.002;

  for (let i = 0; i < numSegs; i++) {
    const a0 = i * segAngle + 0.15; // tiny gap offset in degrees
    const a1 = (i + 1) * segAngle - 0.15;
    const aMid = (a0 + a1) / 2;

    const [x0, z0] = arcXZ(a0, radiusM, params.bendDirection);
    const [x1, z1] = arcXZ(a1, radiusM, params.bendDirection);
    const [xm, zm] = arcXZ(aMid, radiusM, params.bendDirection);

    const segLen = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
    const angle = Math.atan2(x1 - x0, z1 - z0);

    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(widthM - 0.005, 0.008, segLen - gap),
      matModular,
    );
    seg.position.set(xm, heightM + 0.004, zm);
    seg.rotation.y = -angle;
    seg.receiveShadow = true;
    group.add(seg);
  }

  return group;
}

/** Build curved side guides */
export function buildCurvedGuides(params: BendConveyorParams): THREE.Group | null {
  if (!params.sideGuidesEnabled) return null;

  const group = new THREE.Group();
  group.name = 'sideGuides';

  const radiusM = params.radiusMm / 1000;
  const halfW = params.widthMm / 2000;
  const heightM = params.heightMm / 1000;
  const guideH = params.sideGuideHeightMm / 1000;
  const angleDeg = params.bendAngleDeg;
  const thickness = 0.003;
  const numSegs = Math.max(8, Math.ceil(angleDeg / 5));
  const segAngle = angleDeg / numSegs;

  for (const side of ['inner', 'outer'] as const) {
    const r = side === 'inner' ? radiusM - halfW : radiusM + halfW;

    for (let i = 0; i < numSegs; i++) {
      const a0 = i * segAngle;
      const a1 = (i + 1) * segAngle;
      const aMid = (a0 + a1) / 2;

      const [x0, z0] = arcXZ(a0, r, params.bendDirection);
      const [x1, z1] = arcXZ(a1, r, params.bendDirection);
      const [xm, zm] = arcXZ(aMid, r, params.bendDirection);

      const segLen = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
      const angle = Math.atan2(x1 - x0, z1 - z0);

      const guideSeg = new THREE.Mesh(
        new THREE.BoxGeometry(thickness, guideH, segLen),
        matGuide,
      );
      guideSeg.position.set(xm, heightM + guideH / 2, zm);
      guideSeg.rotation.y = -angle;
      guideSeg.castShadow = true;
      group.add(guideSeg);
    }
  }

  return group;
}

/** Build support stations along the bend */
export function buildCurvedSupports(params: BendConveyorParams): THREE.Group | null {
  if (!params.showSupports) return null;

  const group = new THREE.Group();
  group.name = 'supports';

  const radiusM = params.radiusMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;
  const angleDeg = params.bendAngleDeg;
  const spacingDeg = params.supportSpacingDeg;

  // Support at start, end, and intervals
  const numSupports = Math.max(2, Math.floor(angleDeg / spacingDeg) + 1);
  const postSection = 0.04;

  for (let i = 0; i < numSupports; i++) {
    const a = (angleDeg * i) / (numSupports - 1);
    const station = new THREE.Group();

    // Two posts at inner and outer edges
    for (const side of [-1, 1]) {
      const r = radiusM + side * (widthM / 2 + 0.01);
      const [px, pz] = arcXZ(a, r, params.bendDirection);
      const postH = heightM - postSection;

      const post = new THREE.Mesh(
        new THREE.BoxGeometry(postSection, postH, postSection),
        matAluminum,
      );
      post.position.set(px, postH / 2, pz);
      post.castShadow = true;
      station.add(post);

      // Swivel plate at top
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(postSection * 1.5, postSection * 0.4, postSection * 1.5),
        matDarkSteel,
      );
      plate.position.set(px, heightM - postSection * 0.2, pz);
      station.add(plate);

      // Foot
      if (params.adjustableFeetEnabled) {
        const fp = new THREE.Mesh(
          new THREE.BoxGeometry(postSection * 2, 0.005, postSection * 2),
          matFootPad,
        );
        fp.position.set(px, 0.0025, pz);
        station.add(fp);
      }
    }

    // Cross brace between inner and outer posts
    const [xi, zi] = arcXZ(a, radiusM - widthM / 2 - 0.01, params.bendDirection);
    const [xo, zo] = arcXZ(a, radiusM + widthM / 2 + 0.01, params.bendDirection);
    const braceLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const braceAngle = Math.atan2(xo - xi, zo - zi);

    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(postSection * 0.6, postSection * 0.6, braceLen),
      matAluminum,
    );
    brace.position.set((xi + xo) / 2, heightM * 0.35, (zi + zo) / 2);
    brace.rotation.y = -braceAngle;
    station.add(brace);

    group.add(station);
  }

  return group;
}

/** Build a small drive roller at the outfeed end */
function buildCurvedDrive(params: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'drive';

  const radiusM = params.radiusMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;
  const rollerR = 0.03;

  // Drive roller at outfeed angle
  const a = params.bendAngleDeg;
  const [xi, zi] = arcXZ(a, radiusM - widthM / 2, params.bendDirection);
  const [xo, zo] = arcXZ(a, radiusM + widthM / 2, params.bendDirection);

  const rollerLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2) + 0.02;
  const rollerAngle = Math.atan2(xo - xi, zo - zi);

  const rollerGeo = new THREE.CylinderGeometry(rollerR, rollerR, rollerLen, 16);
  const roller = new THREE.Mesh(rollerGeo, matDrive);
  roller.position.set((xi + xo) / 2, heightM, (zi + zo) / 2);
  roller.rotation.set(0, -rollerAngle, Math.PI / 2);
  roller.castShadow = true;
  group.add(roller);

  // Tail roller at infeed
  const [txi, tzi] = arcXZ(0, radiusM - widthM / 2, params.bendDirection);
  const [txo, tzo] = arcXZ(0, radiusM + widthM / 2, params.bendDirection);
  const tailLen = Math.sqrt((txo - txi) ** 2 + (tzo - tzi) ** 2) + 0.02;
  const tailAngle = Math.atan2(txo - txi, tzo - tzi);

  const tailGeo = new THREE.CylinderGeometry(rollerR * 0.8, rollerR * 0.8, tailLen, 16);
  const tail = new THREE.Mesh(tailGeo, matDrive);
  tail.position.set((txi + txo) / 2, heightM, (tzi + tzo) / 2);
  tail.rotation.set(0, -tailAngle, Math.PI / 2);
  tail.castShadow = true;
  group.add(tail);

  return group;
}

/** Build the complete curved conveyor body */
export function buildBendConveyorBody(params: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'bendConveyorBody';

  // Frame
  group.add(buildCurvedFrame(params));

  // Surface
  switch (params.surfaceType) {
    case 'belt':
      group.add(buildCurvedBelt(params));
      break;
    case 'roller':
      group.add(buildCurvedRollers(params));
      break;
    case 'modular':
      group.add(buildCurvedModular(params));
      break;
  }

  // Drive
  group.add(buildCurvedDrive(params));

  return group;
}
