/**
 * Bend Conveyor Geometry — Premium Industrial Curved Conveyor
 *
 * FULL REDESIGN — uses smooth BufferGeometry arcs, not segmented boxes.
 *
 * Design language matches the straight conveyor family:
 * - Continuous curved frame side rails (C-profile, 40mm)
 * - Smooth curved transport surface (belt/roller/modular)
 * - Slider bed underneath belt
 * - Curved side guides with top rail
 * - Support stations with posts, plates, feet, cross braces
 * - Drive roller at outfeed + motor housing
 * - Tangent entry/exit end plates with visible flanges
 *
 * Arc geometry: center of curvature at local origin.
 * Infeed at angle = 0 (positive Z), sweeps clockwise (right) or counterclockwise (left).
 * Convention:
 *   angle=0 → point at (0, y, R)
 *   angle=θ right → point at (R·sin θ, y, R·cos θ)
 */
import * as THREE from 'three';
import { BendConveyorParams } from './bendTypes';
import {
  matStainlessSteel,
  matBelt,
  getBeltMaterial,
  matChrome,
  matModularBelt,
  matGuideRail,
  matAluminum,
  matDarkSteel,
  matFootPad,
  buildSEWMotor,
} from '../premiumMaterials';

// ─── Arc Helpers ───────────────────────────────────────────────

/** Get XZ position on arc at given angle (degrees) and radius */
function arcXZ(angleDeg: number, radius: number, dir: 'left' | 'right'): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  return dir === 'right'
    ? [Math.sin(a) * radius, Math.cos(a) * radius]
    : [-Math.sin(a) * radius, Math.cos(a) * radius];
}

/** Build a smooth curved ribbon as a BufferGeometry mesh.
 *  The ribbon has width (radial direction) and height (Y direction)
 *  and follows an arc from angle 0 to bendAngleDeg.
 */
function curvedRibbon(
  innerR: number, outerR: number, y: number, height: number,
  angleDeg: number, dir: 'left' | 'right', segments: number,
  material: THREE.Material, receiveShadow = false,
): THREE.Mesh {
  const verts: number[] = [];
  const indices: number[] = [];
  const normals: number[] = [];

  // 4 rows: bottom-inner, bottom-outer, top-inner, top-outer
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const [xiBot, ziBot] = arcXZ(t * angleDeg, innerR, dir);
    const [xoBot, zoBot] = arcXZ(t * angleDeg, outerR, dir);

    // Bottom inner
    verts.push(xiBot, y, ziBot);
    normals.push(0, -1, 0);
    // Bottom outer
    verts.push(xoBot, y, zoBot);
    normals.push(0, -1, 0);
    // Top inner
    verts.push(xiBot, y + height, ziBot);
    normals.push(0, 1, 0);
    // Top outer
    verts.push(xoBot, y + height, zoBot);
    normals.push(0, 1, 0);
  }

  for (let i = 0; i < segments; i++) {
    const base = i * 4;
    const next = (i + 1) * 4;

    // Top face (indices 2,3 → top inner/outer)
    indices.push(base + 2, next + 2, base + 3);
    indices.push(base + 3, next + 2, next + 3);

    // Bottom face
    indices.push(base, base + 1, next);
    indices.push(base + 1, next + 1, next);

    // Outer side face (indices 1,3 → outer bottom/top)
    indices.push(base + 1, base + 3, next + 1);
    indices.push(base + 3, next + 3, next + 1);

    // Inner side face (indices 0,2 → inner bottom/top)
    indices.push(base, next, base + 2);
    indices.push(base + 2, next, next + 2);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

/** Build a thin curved slab (for belt surface, slider bed, etc.) */
function curvedSlab(
  innerR: number, outerR: number, y: number, thickness: number,
  angleDeg: number, dir: 'left' | 'right', segments: number,
  material: THREE.Material,
): THREE.Mesh {
  return curvedRibbon(innerR, outerR, y, thickness, angleDeg, dir, segments, material, true);
}

// ─── Frame ─────────────────────────────────────────────────────

function buildFrame(p: BendConveyorParams): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'frame';

  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;
  const railH = 0.04; // 40mm — matches straight conveyor
  const railD = 0.04; // 40mm depth
  const segs = Math.max(16, Math.ceil(p.bendAngleDeg / 3));

  // Inner side rail
  frame.add(curvedRibbon(
    R - halfW - railD, R - halfW,
    H - railH, railH, p.bendAngleDeg, p.bendDirection, segs, matStainlessSteel,
  ));

  // Outer side rail
  frame.add(curvedRibbon(
    R + halfW, R + halfW + railD,
    H - railH, railH, p.bendAngleDeg, p.bendDirection, segs, matStainlessSteel,
  ));

  // Slider bed plate (under belt, between rails)
  frame.add(curvedSlab(
    R - halfW + 0.005, R + halfW - 0.005,
    H - 0.003, 0.003, p.bendAngleDeg, p.bendDirection, segs, matDarkSteel,
  ));

  // Cross members (radial beams connecting inner to outer rail)
  const crossCount = Math.max(2, Math.floor(p.bendAngleDeg / 25) + 1);
  for (let i = 0; i < crossCount; i++) {
    const a = crossCount === 1 ? p.bendAngleDeg / 2 : (p.bendAngleDeg * i) / (crossCount - 1);
    const [xi, zi] = arcXZ(a, R - halfW - railD, p.bendDirection);
    const [xo, zo] = arcXZ(a, R + halfW + railD, p.bendDirection);

    const len = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const ang = Math.atan2(xo - xi, zo - zi);

    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(0.03, 0.03, len),
      matStainlessSteel,
    );
    cross.position.set((xi + xo) / 2, H - railH - 0.015, (zi + zo) / 2);
    cross.rotation.y = -ang;
    frame.add(cross);
  }

  // End plates at infeed and outfeed (tangent end flanges)
  for (const endA of [0, p.bendAngleDeg]) {
    const [xi, zi] = arcXZ(endA, R - halfW - railD, p.bendDirection);
    const [xo, zo] = arcXZ(endA, R + halfW + railD, p.bendDirection);
    const len = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const ang = Math.atan2(xo - xi, zo - zi);

    // Vertical end plate
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.006, railH + 0.01, len),
      matDarkSteel,
    );
    plate.position.set((xi + xo) / 2, H - railH / 2, (zi + zo) / 2);
    plate.rotation.y = -ang;
    plate.castShadow = true;
    frame.add(plate);

    // Top lip of end plate (flange)
    const lip = new THREE.Mesh(
      new THREE.BoxGeometry(0.015, 0.005, len),
      matStainlessSteel,
    );
    lip.position.set((xi + xo) / 2, H + 0.002, (zi + zo) / 2);
    lip.rotation.y = -ang;
    frame.add(lip);
  }

  return frame;
}

// ─── Belt Surface ──────────────────────────────────────────────

function buildBeltSurface(p: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'beltSurface';
  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;
  const segs = Math.max(24, Math.ceil(p.bendAngleDeg / 2));

  // Main belt — smooth curved slab (uses custom color if provided)
  const beltMat = p.beltColor ? getBeltMaterial(p.beltColor) : matBelt;
  group.add(curvedSlab(
    R - halfW + 0.003, R + halfW - 0.003,
    H, 0.005, p.bendAngleDeg, p.bendDirection, segs, beltMat,
  ));

  return group;
}

// ─── Roller Surface ────────────────────────────────────────────

function buildRollerSurface(p: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rollerSurface';

  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;
  const rollerR = 0.025; // 25mm radius — matches straight

  // Tapered rollers along arc at ~75mm pitch
  const arcLen = R * (p.bendAngleDeg * Math.PI / 180);
  const pitchM = 0.075;
  const count = Math.max(3, Math.floor(arcLen / pitchM));

  for (let i = 0; i < count; i++) {
    const a = (p.bendAngleDeg * (i + 0.5)) / count;
    const [xi, zi] = arcXZ(a, R - halfW + 0.005, p.bendDirection);
    const [xo, zo] = arcXZ(a, R + halfW - 0.005, p.bendDirection);

    const rollerLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const ang = Math.atan2(xo - xi, zo - zi);

    // Tapered — inner end slightly smaller for differential speed
    const innerR = rollerR * 0.8;
    const outerR = rollerR;
    const geo = new THREE.CylinderGeometry(
      p.bendDirection === 'right' ? innerR : outerR,
      p.bendDirection === 'right' ? outerR : innerR,
      rollerLen, 12,
    );

    const roller = new THREE.Mesh(geo, matChrome);
    roller.position.set((xi + xo) / 2, H + rollerR, (zi + zo) / 2);
    roller.rotation.set(0, -ang, Math.PI / 2);
    roller.castShadow = true;
    group.add(roller);

    // Shaft ends visible at each side
    for (const [sx, sz] of [[xi, zi], [xo, zo]]) {
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.02, 6),
        matDarkSteel,
      );
      shaft.position.set(sx, H + rollerR, sz);
      shaft.rotation.set(0, -ang, Math.PI / 2);
      group.add(shaft);
    }
  }

  return group;
}

// ─── Modular Surface ───────────────────────────────────────────

function buildModularSurface(p: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'modularSurface';
  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;

  // Modular chain links — segmented curved slabs with visible gaps
  const linkCount = Math.max(8, Math.ceil(p.bendAngleDeg / 4));
  const linkAngle = p.bendAngleDeg / linkCount;
  const gapAngle = 0.3; // small gap between links (degrees)

  for (let i = 0; i < linkCount; i++) {
    const startA = i * linkAngle + gapAngle / 2;
    const endA = (i + 1) * linkAngle - gapAngle / 2;
    const spanDeg = endA - startA;
    if (spanDeg <= 0) continue;

    // Each link is a small curved slab
    const linkSegs = Math.max(3, Math.ceil(spanDeg / 3));

    // Create link by building a mini curved slab
    const verts: number[] = [];
    const indices: number[] = [];
    for (let j = 0; j <= linkSegs; j++) {
      const t = j / linkSegs;
      const a = startA + t * spanDeg;
      const [xi, zi] = arcXZ(a, R - halfW + 0.003, p.bendDirection);
      const [xo, zo] = arcXZ(a, R + halfW - 0.003, p.bendDirection);

      // Bottom
      verts.push(xi, H, zi);
      verts.push(xo, H, zo);
      // Top
      verts.push(xi, H + 0.008, zi);
      verts.push(xo, H + 0.008, zo);

      if (j < linkSegs) {
        const b = j * 4;
        const n = (j + 1) * 4;
        // Top face
        indices.push(b + 2, n + 2, b + 3);
        indices.push(b + 3, n + 2, n + 3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    const link = new THREE.Mesh(geo, matModularBelt);
    link.receiveShadow = true;
    group.add(link);

    // Hinge pin at each link joint
    if (i < linkCount - 1) {
      const pinA = (i + 1) * linkAngle;
      const [px, pz] = arcXZ(pinA, R, p.bendDirection);
      const [pxi, pzi] = arcXZ(pinA, R - halfW + 0.005, p.bendDirection);
      const [pxo, pzo] = arcXZ(pinA, R + halfW - 0.005, p.bendDirection);
      const pinLen = Math.sqrt((pxo - pxi) ** 2 + (pzo - pzi) ** 2);
      const pinAng = Math.atan2(pxo - pxi, pzo - pzi);

      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.002, 0.002, pinLen, 6),
        matDarkSteel,
      );
      pin.position.set(px, H + 0.004, pz);
      pin.rotation.set(0, -pinAng, Math.PI / 2);
      group.add(pin);
    }
  }

  return group;
}

// ─── Side Guides ───────────────────────────────────────────────

export function buildCurvedGuides(p: BendConveyorParams): THREE.Group | null {
  if (!p.sideGuidesEnabled) return null;

  const group = new THREE.Group();
  group.name = 'sideGuides';

  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;
  const guideH = p.sideGuideHeightMm / 1000;
  const segs = Math.max(16, Math.ceil(p.bendAngleDeg / 3));

  for (const side of ['inner', 'outer'] as const) {
    const guideInnerR = side === 'inner' ? R - halfW - 0.002 : R + halfW;
    const guideOuterR = side === 'inner' ? R - halfW : R + halfW + 0.002;

    // Guide wall — smooth curved ribbon
    group.add(curvedRibbon(
      guideInnerR, guideOuterR,
      H + 0.005, guideH, p.bendAngleDeg, p.bendDirection, segs, matGuideRail,
    ));

    // Top cap rail — wider for product containment feel
    const capMidR = (guideInnerR + guideOuterR) / 2;
    group.add(curvedRibbon(
      capMidR - 0.008, capMidR + 0.008,
      H + 0.005 + guideH, 0.004, p.bendAngleDeg, p.bendDirection, segs, matGuideRail,
    ));
  }

  return group;
}

// ─── Supports ──────────────────────────────────────────────────

export function buildCurvedSupports(p: BendConveyorParams): THREE.Group | null {
  if (!p.showSupports) return null;

  const group = new THREE.Group();
  group.name = 'supports';

  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;
  const railD = 0.04;
  const spacingDeg = p.supportSpacingDeg;
  const numSupports = Math.max(2, Math.floor(p.bendAngleDeg / spacingDeg) + 1);
  const postSize = 0.04;

  for (let i = 0; i < numSupports; i++) {
    const a = numSupports === 1
      ? p.bendAngleDeg / 2
      : (p.bendAngleDeg * i) / (numSupports - 1);
    const station = new THREE.Group();

    // Two posts (inner + outer) at this angle
    for (const side of [-1, 1]) {
      const r = R + side * (halfW + railD + postSize / 2);
      const [px, pz] = arcXZ(a, r, p.bendDirection);
      const legH = H - railD - postSize * 0.4;

      // Vertical post (aluminum extrusion appearance)
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(postSize, legH, postSize),
        matAluminum,
      );
      post.position.set(px, legH / 2, pz);
      post.castShadow = true;
      station.add(post);

      // Post T-slot groove (dark line down center)
      const groove = new THREE.Mesh(
        new THREE.BoxGeometry(postSize * 0.25, legH - 0.02, postSize + 0.001),
        matDarkSteel,
      );
      groove.position.set(px, legH / 2, pz);
      station.add(groove);

      // Top mounting plate
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(postSize * 1.5, 0.008, postSize * 1.5),
        matDarkSteel,
      );
      plate.position.set(px, legH + 0.004, pz);
      station.add(plate);

      // Foot pad with adjustment bolt
      if (p.adjustableFeetEnabled) {
        const foot = new THREE.Mesh(
          new THREE.BoxGeometry(postSize * 2, 0.005, postSize * 2),
          matFootPad,
        );
        foot.position.set(px, 0.0025, pz);
        station.add(foot);

        const bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.007, 0.007, 0.02, 6),
          matDarkSteel,
        );
        bolt.position.set(px, 0.015, pz);
        station.add(bolt);
      }
    }

    // Intentionally omit the center tie member to keep the curved support frame cleaner.

    group.add(station);
  }

  return group;
}

// ─── Drive Assembly ────────────────────────────────────────────

function buildDrive(p: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'drive';

  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;

  // Drive rollers removed — clean belt surface only

  // SEW-style geared motor on outfeed side
  const motorSide = p.motorSide === 'inner' ? -1 : 1;
  const motorR = R + motorSide * (halfW + 0.08);
  const [mx, mz] = arcXZ(p.bendAngleDeg, motorR, p.bendDirection);
  const motorAng = (p.bendAngleDeg * Math.PI) / 180;
  const motorYaw = p.bendDirection === 'right' ? -motorAng : motorAng;

  const sewMotor = buildSEWMotor(0.9);
  sewMotor.position.set(mx, H - 0.05, mz);
  sewMotor.rotation.set(0, motorYaw + (motorSide > 0 ? -Math.PI / 2 : Math.PI / 2), 0);
  group.add(sewMotor);

  return group;
}

// ─── Main Assembly ─────────────────────────────────────────────

export function buildBendConveyorBody(p: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'bendConveyorBody';

  group.add(buildFrame(p));

  switch (p.surfaceType) {
    case 'belt':
      group.add(buildBeltSurface(p));
      break;
    case 'roller':
      group.add(buildRollerSurface(p));
      break;
    case 'modular':
      group.add(buildModularSurface(p));
      break;
  }

  group.add(buildDrive(p));

  return group;
}
