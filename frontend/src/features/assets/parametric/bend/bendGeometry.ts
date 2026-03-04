/**
 * Bend Conveyor Geometry — Premium Industrial Curved Conveyor
 *
 * Rebuilt to match the straight conveyor family design language:
 * - Proper curved frame side rails (C-channel profile)
 * - Believable belt or modular top surface
 * - Slider bed underneath belt
 * - Inner/outer side guides
 * - Proper supports with cross braces
 * - Entry/exit tangent end plates
 * - Drive roller at outfeed
 *
 * Arc center at local origin (0, 0, 0).
 * Infeed at angle=0, outfeed at angle=bendAngle.
 * All geometry is local — parent node transform handles world placement.
 */
import * as THREE from 'three';
import { BendConveyorParams } from './bendTypes';
import {
  matStainlessSteel,
  matBelt,
  matChrome,
  matModularBelt,
  matGuideRail,
  matAluminum,
  matDarkSteel,
  matFootPad,
} from '../premiumMaterials';

// ─── Helpers ───────────────────────────────────────────────────

function arcPos(angleDeg: number, radius: number, dir: 'left' | 'right'): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  const x = dir === 'right' ? Math.sin(a) * radius : -Math.sin(a) * radius;
  const z = Math.cos(a) * radius;
  return [x, z];
}

/** Create a curved strip (frame rail, guide, bed plate) as segmented boxes */
function buildCurvedStrip(
  params: { radiusM: number; angleDeg: number; dir: 'left' | 'right'; heightY: number; width: number; height: number; segments: number },
  material: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const { radiusM, angleDeg, dir, heightY, width, height, segments } = params;
  const segAngle = angleDeg / segments;

  for (let i = 0; i < segments; i++) {
    const a0 = i * segAngle;
    const a1 = (i + 1) * segAngle;
    const aMid = (a0 + a1) / 2;

    const [x0, z0] = arcPos(a0, radiusM, dir);
    const [x1, z1] = arcPos(a1, radiusM, dir);
    const [xm, zm] = arcPos(aMid, radiusM, dir);

    const segLen = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
    const angle = Math.atan2(x1 - x0, z1 - z0);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, segLen),
      material,
    );
    mesh.position.set(xm, heightY, zm);
    mesh.rotation.y = -angle;
    mesh.castShadow = true;
    g.add(mesh);
  }
  return g;
}

// ─── Frame ─────────────────────────────────────────────────────

function buildFrame(p: BendConveyorParams): THREE.Group {
  const frame = new THREE.Group();
  frame.name = 'frame';

  const R = p.radiusMm / 1000;
  const halfW = p.widthMm / 2000;
  const H = p.heightMm / 1000;
  const railW = 0.04;
  const railH = 0.05;
  const segs = Math.max(12, Math.ceil(p.bendAngleDeg / 4));

  // Inner and outer side rails (C-channel appearance)
  for (const offset of [-halfW - railW / 2, halfW + railW / 2]) {
    // Main rail
    frame.add(buildCurvedStrip({
      radiusM: R + offset, angleDeg: p.bendAngleDeg, dir: p.bendDirection,
      heightY: H - railH / 2, width: railW, height: railH, segments: segs,
    }, matStainlessSteel));

    // Bottom lip (C-channel lower flange)
    frame.add(buildCurvedStrip({
      radiusM: R + offset, angleDeg: p.bendAngleDeg, dir: p.bendDirection,
      heightY: H - railH - 0.005, width: railW, height: 0.008, segments: segs,
    }, matStainlessSteel));

    // Inner web of C-channel (slight inset)
    const webR = offset > 0 ? R + offset - railW * 0.3 : R + offset + railW * 0.3;
    frame.add(buildCurvedStrip({
      radiusM: webR, angleDeg: p.bendAngleDeg, dir: p.bendDirection,
      heightY: H - railH / 2, width: 0.003, height: railH - 0.01, segments: segs,
    }, matDarkSteel));
  }

  // Slider bed plate (curved, under belt)
  frame.add(buildCurvedStrip({
    radiusM: R, angleDeg: p.bendAngleDeg, dir: p.bendDirection,
    heightY: H - 0.003, width: halfW * 2 - 0.01, height: 0.004, segments: segs,
  }, matDarkSteel));

  // Radial cross members
  const crossCount = Math.max(2, Math.floor(p.bendAngleDeg / 25) + 1);
  for (let i = 0; i < crossCount; i++) {
    const a = (p.bendAngleDeg * i) / (crossCount - 1);
    const [xi, zi] = arcPos(a, R - halfW - railW, p.bendDirection);
    const [xo, zo] = arcPos(a, R + halfW + railW, p.bendDirection);

    const len = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const ang = Math.atan2(xo - xi, zo - zi);

    const cross = new THREE.Mesh(
      new THREE.BoxGeometry(0.035, 0.035, len),
      matStainlessSteel,
    );
    cross.position.set((xi + xo) / 2, H - railH - 0.02, (zi + zo) / 2);
    cross.rotation.y = -ang;
    frame.add(cross);
  }

  // End plates (infeed + outfeed)
  for (const endA of [0, p.bendAngleDeg]) {
    const [xi, zi] = arcPos(endA, R - halfW - railW, p.bendDirection);
    const [xo, zo] = arcPos(endA, R + halfW + railW, p.bendDirection);
    const len = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const ang = Math.atan2(xo - xi, zo - zi);

    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(0.008, railH + 0.01, len),
      matDarkSteel,
    );
    plate.position.set((xi + xo) / 2, H - railH / 2, (zi + zo) / 2);
    plate.rotation.y = -ang;
    plate.castShadow = true;
    frame.add(plate);
  }

  return frame;
}

// ─── Belt Surface ──────────────────────────────────────────────

function buildBeltSurface(p: BendConveyorParams): THREE.Group {
  const R = p.radiusMm / 1000;
  const W = p.widthMm / 1000;
  const H = p.heightMm / 1000;
  const segs = Math.max(16, Math.ceil(p.bendAngleDeg / 2.5));

  return buildCurvedStrip({
    radiusM: R, angleDeg: p.bendAngleDeg, dir: p.bendDirection,
    heightY: H + 0.003, width: W - 0.005, height: 0.005, segments: segs,
  }, matBelt);
}

// ─── Roller Surface ────────────────────────────────────────────

function buildRollerSurface(p: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'rollerSurface';

  const R = p.radiusMm / 1000;
  const W = p.widthMm / 1000;
  const H = p.heightMm / 1000;
  const rollerR = 0.022;

  // Tapered rollers along the curve
  const pitchDeg = (75 / (R * Math.PI * 2)) * 360; // ~75mm pitch at center
  const count = Math.max(4, Math.floor(p.bendAngleDeg / pitchDeg));

  for (let i = 0; i < count; i++) {
    const a = (p.bendAngleDeg * (i + 0.5)) / count;
    const [xc, zc] = arcPos(a, R, p.bendDirection);
    const [xi, zi] = arcPos(a, R - W / 2, p.bendDirection);
    const [xo, zo] = arcPos(a, R + W / 2, p.bendDirection);

    const rollerLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const rollerAng = Math.atan2(xo - xi, zo - zi);

    // Tapered roller (inner smaller for differential speed)
    const innerR = rollerR * 0.82;
    const outerR = rollerR;
    const geo = new THREE.CylinderGeometry(
      p.bendDirection === 'right' ? innerR : outerR,
      p.bendDirection === 'right' ? outerR : innerR,
      rollerLen, 12,
    );

    const roller = new THREE.Mesh(geo, matChrome);
    roller.position.set(xc, H + rollerR, zc);
    roller.rotation.set(0, -rollerAng, Math.PI / 2);
    roller.castShadow = true;
    group.add(roller);
  }

  return group;
}

// ─── Modular Surface ───────────────────────────────────────────

function buildModularSurface(p: BendConveyorParams): THREE.Group {
  const R = p.radiusMm / 1000;
  const W = p.widthMm / 1000;
  const H = p.heightMm / 1000;
  const segs = Math.max(12, Math.ceil(p.bendAngleDeg / 2));

  const group = new THREE.Group();
  group.name = 'modularSurface';
  const segAngle = p.bendAngleDeg / segs;
  const gap = 0.002;

  for (let i = 0; i < segs; i++) {
    const a0 = i * segAngle + 0.2;
    const a1 = (i + 1) * segAngle - 0.2;
    const aMid = (a0 + a1) / 2;
    const [x0, z0] = arcPos(a0, R, p.bendDirection);
    const [x1, z1] = arcPos(a1, R, p.bendDirection);
    const [xm, zm] = arcPos(aMid, R, p.bendDirection);
    const len = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
    const ang = Math.atan2(x1 - x0, z1 - z0);

    const seg = new THREE.Mesh(
      new THREE.BoxGeometry(W - 0.01, 0.008, len - gap),
      matModularBelt,
    );
    seg.position.set(xm, H + 0.004, zm);
    seg.rotation.y = -ang;
    seg.receiveShadow = true;
    group.add(seg);
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
  const segs = Math.max(10, Math.ceil(p.bendAngleDeg / 4));

  for (const side of ['inner', 'outer'] as const) {
    const r = side === 'inner' ? R - halfW - 0.002 : R + halfW + 0.002;

    // Guide rail
    group.add(buildCurvedStrip({
      radiusM: r, angleDeg: p.bendAngleDeg, dir: p.bendDirection,
      heightY: H + guideH / 2 + 0.005, width: 0.004, height: guideH, segments: segs,
    }, matGuideRail));

    // Top cap rail
    group.add(buildCurvedStrip({
      radiusM: r, angleDeg: p.bendAngleDeg, dir: p.bendDirection,
      heightY: H + guideH + 0.006, width: 0.015, height: 0.004, segments: segs,
    }, matGuideRail));
  }

  return group;
}

// ─── Supports ──────────────────────────────────────────────────

export function buildCurvedSupports(p: BendConveyorParams): THREE.Group | null {
  if (!p.showSupports) return null;

  const group = new THREE.Group();
  group.name = 'supports';

  const R = p.radiusMm / 1000;
  const W = p.widthMm / 1000;
  const H = p.heightMm / 1000;
  const spacingDeg = p.supportSpacingDeg;
  const numSupports = Math.max(2, Math.floor(p.bendAngleDeg / spacingDeg) + 1);
  const postSize = 0.04;

  for (let i = 0; i < numSupports; i++) {
    const a = (p.bendAngleDeg * i) / (numSupports - 1);
    const station = new THREE.Group();

    for (const side of [-1, 1]) {
      const r = R + side * (W / 2 + 0.02);
      const [px, pz] = arcPos(a, r, p.bendDirection);
      const postH = H - postSize;

      // Vertical post (aluminum extrusion profile)
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(postSize, postH, postSize),
        matAluminum,
      );
      post.position.set(px, postH / 2, pz);
      post.castShadow = true;
      station.add(post);

      // Top mounting plate
      const plate = new THREE.Mesh(
        new THREE.BoxGeometry(postSize * 1.6, postSize * 0.4, postSize * 1.6),
        matDarkSteel,
      );
      plate.position.set(px, H - postSize * 0.2, pz);
      station.add(plate);

      // Foot pad
      if (p.adjustableFeetEnabled) {
        const foot = new THREE.Mesh(
          new THREE.BoxGeometry(postSize * 2.2, 0.006, postSize * 2.2),
          matFootPad,
        );
        foot.position.set(px, 0.003, pz);
        station.add(foot);

        // Adjustment bolt
        const bolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.008, 0.008, 0.025, 6),
          matDarkSteel,
        );
        bolt.position.set(px, 0.018, pz);
        station.add(bolt);
      }
    }

    // Cross brace
    const [xi, zi] = arcPos(a, R - W / 2 - 0.02, p.bendDirection);
    const [xo, zo] = arcPos(a, R + W / 2 + 0.02, p.bendDirection);
    const braceLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2);
    const braceAng = Math.atan2(xo - xi, zo - zi);

    const brace = new THREE.Mesh(
      new THREE.BoxGeometry(postSize * 0.7, postSize * 0.7, braceLen),
      matAluminum,
    );
    brace.position.set((xi + xo) / 2, H * 0.35, (zi + zo) / 2);
    brace.rotation.y = -braceAng;
    station.add(brace);

    group.add(station);
  }

  return group;
}

// ─── Drive Assembly ────────────────────────────────────────────

function buildDrive(p: BendConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'drive';

  const R = p.radiusMm / 1000;
  const W = p.widthMm / 1000;
  const H = p.heightMm / 1000;
  const rollerR = 0.028;

  // Drive roller at outfeed
  for (const [endA, r] of [[p.bendAngleDeg, rollerR], [0, rollerR * 0.75]] as [number, number][]) {
    const [xi, zi] = arcPos(endA, R - W / 2, p.bendDirection);
    const [xo, zo] = arcPos(endA, R + W / 2, p.bendDirection);
    const rollerLen = Math.sqrt((xo - xi) ** 2 + (zo - zi) ** 2) + 0.015;
    const ang = Math.atan2(xo - xi, zo - zi);

    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, rollerLen, 16),
      matDarkSteel,
    );
    roller.position.set((xi + xo) / 2, H, (zi + zo) / 2);
    roller.rotation.set(0, -ang, Math.PI / 2);
    roller.castShadow = true;
    group.add(roller);
  }

  // Motor housing on outfeed outer side
  const motorA = p.bendAngleDeg;
  const motorSide = p.motorSide === 'inner' ? -1 : 1;
  const motorR = R + motorSide * (W / 2 + 0.06);
  const [mx, mz] = arcPos(motorA, motorR, p.bendDirection);

  const motor = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.1, 0.12),
    matDarkSteel,
  );
  motor.position.set(mx, H - 0.05, mz);
  motor.castShadow = true;
  group.add(motor);

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
