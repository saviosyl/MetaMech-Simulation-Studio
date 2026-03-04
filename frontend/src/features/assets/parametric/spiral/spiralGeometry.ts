/**
 * Spiral Conveyor Geometry — Premium Industrial Vertical Spiral
 *
 * FULL REDESIGN for AmbaFlex/Ryson-style industrial spiral conveyor.
 *
 * Key visual elements:
 * 1. LARGE center drum (proportional to diameter) — the visual anchor
 * 2. Helical slat belt surface climbing the drum with visible thickness
 * 3. Structural radial arms from drum to belt at regular intervals
 * 4. Continuous inner/outer guide rails following the helix
 * 5. Straight infeed/outfeed transition sections with frame rails
 * 6. Heavy industrial base with leveling feet
 * 7. Top crown ring at the drum peak
 *
 * The spiral must read as "vertical transport machine" from any angle.
 */
import * as THREE from 'three';
import { SpiralConveyorParams } from './spiralTypes';
import {
  matGuideRail,
  matAluminum,
  matCastIron,
  matDarkSteel,
  matStainlessSteel,
  matBelt,
  matFootPad,
} from '../premiumMaterials';

// Spiral-specific materials
const matSlatBelt = new THREE.MeshStandardMaterial({
  color: 0x1e1e1e, metalness: 0.1, roughness: 0.72, side: THREE.DoubleSide,
});
const matDrumSurface = new THREE.MeshStandardMaterial({
  color: 0xb0b0b0, metalness: 0.7, roughness: 0.3,
});
const matDrumRing = new THREE.MeshStandardMaterial({
  color: 0x666666, metalness: 0.8, roughness: 0.2,
});
const matBracketArm = new THREE.MeshStandardMaterial({
  color: 0x909090, metalness: 0.65, roughness: 0.35,
});

// ── Constants ──
const SEGMENTS_PER_TURN = 72;
const BRACKET_INTERVAL_DEG = 60; // support arm every 60°
export const INFEED_LENGTH_M = 0.5;
export const OUTFEED_LENGTH_M = 0.5;

// ── Helpers ──

function helixXZ(angle: number, radius: number): [number, number] {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius];
}

function helixY(t: number, totalH: number, dir: 'up' | 'down'): number {
  return dir === 'up' ? t * totalH : totalH * (1 - t);
}

// ─── Spiral Path Points ────────────────────────────────────────

export function generateSpiralPath(
  params: SpiralConveyorParams,
): { points: THREE.Vector3[]; totalAngleRad: number } {
  const radius = params.diameterMm / 2000;
  const totalHeight = params.totalHeightMm / 1000;
  const totalAngleRad = params.turns * Math.PI * 2;
  const segments = Math.ceil(params.turns * SEGMENTS_PER_TURN);
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * totalAngleRad;
    const y = helixY(t, totalHeight, params.direction);
    const [x, z] = helixXZ(angle, radius);
    points.push(new THREE.Vector3(x, y, z));
  }

  return { points, totalAngleRad };
}

// ─── Center Drum ───────────────────────────────────────────────

export function buildCenterStructure(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'centerDrum';

  const totalH = params.totalHeightMm / 1000;
  const beltW = params.beltWidthMm / 1000;
  const outerR = params.diameterMm / 2000;

  // Drum radius: substantial — 35-45% of belt inner edge radius
  // This makes the drum visually dominant (like real AmbaFlex)
  const innerBeltR = outerR - beltW / 2;
  const drumR = Math.max(0.12, innerBeltR * 0.65);
  const drumH = totalH + 0.1; // extend slightly above/below belt

  if (params.centerStructure === 'column') {
    // ─── Solid drum style (AmbaFlex SVn) ───

    // Main drum cylinder
    const drumGeo = new THREE.CylinderGeometry(drumR, drumR, drumH, 32);
    const drum = new THREE.Mesh(drumGeo, matDrumSurface);
    drum.position.y = drumH / 2 - 0.02;
    drum.castShadow = true;
    group.add(drum);

    // Stiffening rings every ~400mm — these are what make it look industrial
    const ringSpacing = 0.4;
    const ringCount = Math.max(3, Math.ceil(drumH / ringSpacing));
    for (let i = 0; i <= ringCount; i++) {
      const ry = (drumH * i) / ringCount - 0.02;
      const ringGeo = new THREE.TorusGeometry(drumR + 0.012, 0.012, 8, 32);
      const ring = new THREE.Mesh(ringGeo, matDrumRing);
      ring.position.y = ry;
      ring.rotation.x = Math.PI / 2;
      group.add(ring);
    }

    // Top crown plate
    const crownGeo = new THREE.CylinderGeometry(drumR + 0.025, drumR + 0.025, 0.03, 32);
    const crown = new THREE.Mesh(crownGeo, matDarkSteel);
    crown.position.y = drumH - 0.005;
    group.add(crown);

    // Bottom mounting flange
    const flangeGeo = new THREE.CylinderGeometry(drumR + 0.04, drumR + 0.04, 0.04, 32);
    const flange = new THREE.Mesh(flangeGeo, matDarkSteel);
    flange.position.y = 0;
    group.add(flange);

  } else {
    // ─── Framed core style (Ryson) ───
    const postCount = 6;
    const postSize = 0.045;

    for (let i = 0; i < postCount; i++) {
      const angle = (i * Math.PI * 2) / postCount;
      const [px, pz] = helixXZ(angle, drumR);

      // Vertical post
      const post = new THREE.Mesh(
        new THREE.BoxGeometry(postSize, drumH, postSize),
        matStainlessSteel,
      );
      post.position.set(px, drumH / 2 - 0.02, pz);
      post.castShadow = true;
      group.add(post);
    }

    // Horizontal ring braces every ~600mm
    const ringCount = Math.max(3, Math.ceil(drumH / 0.6));
    for (let r = 0; r <= ringCount; r++) {
      const ry = (drumH * r) / ringCount - 0.02;
      for (let i = 0; i < postCount; i++) {
        const a0 = (i * Math.PI * 2) / postCount;
        const a1 = ((i + 1) * Math.PI * 2) / postCount;
        const [x0, z0] = helixXZ(a0, drumR);
        const [x1, z1] = helixXZ(a1, drumR);
        const len = Math.sqrt((x1 - x0) ** 2 + (z1 - z0) ** 2);
        const ang = Math.atan2(x1 - x0, z1 - z0);

        const brace = new THREE.Mesh(
          new THREE.BoxGeometry(0.025, 0.025, len),
          matStainlessSteel,
        );
        brace.position.set((x0 + x1) / 2, ry, (z0 + z1) / 2);
        brace.rotation.y = -ang;
        group.add(brace);
      }
    }

    // Top and bottom ring plates
    for (const ry of [-0.02, drumH - 0.02]) {
      const plate = new THREE.Mesh(
        new THREE.CylinderGeometry(drumR + 0.03, drumR + 0.03, 0.02, 32),
        matDarkSteel,
      );
      plate.position.y = ry;
      group.add(plate);
    }
  }

  return group;
}

// ─── Spiral Belt Surface ───────────────────────────────────────

export function buildSpiralBelt(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'spiralBelt';

  const radius = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const halfW = beltW / 2;
  const totalH = params.totalHeightMm / 1000;
  const totalAngle = params.turns * Math.PI * 2;
  const segments = Math.ceil(params.turns * SEGMENTS_PER_TURN);
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const beltThick = 0.01; // 10mm — visible thickness

  // ─── Top surface ───
  const topVerts: number[] = [];
  const topIdx: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * totalAngle;
    const y = helixY(t, totalH, params.direction);

    const [inX, inZ] = helixXZ(angle, radius - halfW);
    const [outX, outZ] = helixXZ(angle, radius + halfW);

    topVerts.push(inX, y + beltThick, inZ);
    topVerts.push(outX, y + beltThick, outZ);

    if (i < segments) {
      const b = i * 2;
      topIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }

  const topGeo = new THREE.BufferGeometry();
  topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topVerts, 3));
  topGeo.setIndex(topIdx);
  topGeo.computeVertexNormals();
  const topMesh = new THREE.Mesh(topGeo, matSlatBelt);
  topMesh.castShadow = true;
  topMesh.receiveShadow = true;
  group.add(topMesh);

  // ─── Bottom surface (gives belt visible depth) ───
  const botVerts: number[] = [];
  const botIdx: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * totalAngle;
    const y = helixY(t, totalH, params.direction);

    const [inX, inZ] = helixXZ(angle, radius - halfW);
    const [outX, outZ] = helixXZ(angle, radius + halfW);

    botVerts.push(inX, y, inZ);
    botVerts.push(outX, y, outZ);

    if (i < segments) {
      const b = i * 2;
      // Reverse winding for bottom face
      botIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const botGeo = new THREE.BufferGeometry();
  botGeo.setAttribute('position', new THREE.Float32BufferAttribute(botVerts, 3));
  botGeo.setIndex(botIdx);
  botGeo.computeVertexNormals();
  const botMesh = new THREE.Mesh(botGeo, matDarkSteel);
  group.add(botMesh);

  // ─── Inner edge face (vertical strip along inner radius) ───
  const innerVerts: number[] = [];
  const innerIdx: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * totalAngle;
    const y = helixY(t, totalH, params.direction);
    const [x, z] = helixXZ(angle, radius - halfW);

    innerVerts.push(x, y, z);           // bottom
    innerVerts.push(x, y + beltThick, z); // top

    if (i < segments) {
      const b = i * 2;
      innerIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
    }
  }

  const innerGeo = new THREE.BufferGeometry();
  innerGeo.setAttribute('position', new THREE.Float32BufferAttribute(innerVerts, 3));
  innerGeo.setIndex(innerIdx);
  innerGeo.computeVertexNormals();
  group.add(new THREE.Mesh(innerGeo, matBelt));

  // ─── Outer edge face ───
  const outerVerts: number[] = [];
  const outerIdx: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * totalAngle;
    const y = helixY(t, totalH, params.direction);
    const [x, z] = helixXZ(angle, radius + halfW);

    outerVerts.push(x, y, z);
    outerVerts.push(x, y + beltThick, z);

    if (i < segments) {
      const b = i * 2;
      outerIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
    }
  }

  const outerGeo = new THREE.BufferGeometry();
  outerGeo.setAttribute('position', new THREE.Float32BufferAttribute(outerVerts, 3));
  outerGeo.setIndex(outerIdx);
  outerGeo.computeVertexNormals();
  group.add(new THREE.Mesh(outerGeo, matBelt));

  // ─── Slat grooves (visual texture lines across belt surface) ───
  // Use thin box segments instead of Lines for better visibility
  const arcLen = radius * totalAngle;
  const slatPitch = 0.06; // 60mm
  const slatCount = Math.min(400, Math.floor(arcLen / slatPitch));

  for (let s = 0; s < slatCount; s++) {
    const t = s / slatCount;
    const angle = startAngle + t * totalAngle;
    const y = helixY(t, totalH, params.direction) + beltThick + 0.001;

    const [inX, inZ] = helixXZ(angle, radius - halfW + 0.008);
    const [outX, outZ] = helixXZ(angle, radius + halfW - 0.008);

    const slatLen = Math.sqrt((outX - inX) ** 2 + (outZ - inZ) ** 2);
    const slatAng = Math.atan2(outX - inX, outZ - inZ);

    const slat = new THREE.Mesh(
      new THREE.BoxGeometry(0.002, 0.002, slatLen),
      matDarkSteel,
    );
    slat.position.set((inX + outX) / 2, y, (inZ + outZ) / 2);
    slat.rotation.y = -slatAng;
    group.add(slat);
  }

  return group;
}

// ─── Guide Rails ───────────────────────────────────────────────

export function buildSpiralGuides(params: SpiralConveyorParams): THREE.Group | null {
  if (!params.sideGuidesEnabled) return null;

  const group = new THREE.Group();
  group.name = 'spiralGuides';

  const radius = params.diameterMm / 2000;
  const halfW = params.beltWidthMm / 2000;
  const totalH = params.totalHeightMm / 1000;
  const totalAngle = params.turns * Math.PI * 2;
  const segments = Math.ceil(params.turns * SEGMENTS_PER_TURN);
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const guideH = params.guideHeightMm / 1000;
  const beltTop = 0.01; // belt thickness

  for (const edgeSign of [-1, 1]) {
    const guideR = radius + edgeSign * (halfW + 0.003);

    // Guide wall — continuous helical ribbon
    const wallVerts: number[] = [];
    const wallIdx: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * totalAngle;
      const y = helixY(t, totalH, params.direction) + beltTop;
      const [x, z] = helixXZ(angle, guideR);

      wallVerts.push(x, y, z);           // bottom
      wallVerts.push(x, y + guideH, z);  // top

      if (i < segments) {
        const b = i * 2;
        if (edgeSign > 0) {
          wallIdx.push(b, b + 2, b + 1, b + 1, b + 2, b + 3);
        } else {
          wallIdx.push(b, b + 1, b + 2, b + 1, b + 3, b + 2);
        }
      }
    }

    const wallGeo = new THREE.BufferGeometry();
    wallGeo.setAttribute('position', new THREE.Float32BufferAttribute(wallVerts, 3));
    wallGeo.setIndex(wallIdx);
    wallGeo.computeVertexNormals();

    const wall = new THREE.Mesh(wallGeo, matGuideRail);
    wall.castShadow = true;
    group.add(wall);

    // Top cap rail (wide bar along top of guide)
    const capVerts: number[] = [];
    const capIdx: number[] = [];
    const capW = 0.012;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * totalAngle;
      const y = helixY(t, totalH, params.direction) + beltTop + guideH;
      const [xi, zi] = helixXZ(angle, guideR - capW / 2);
      const [xo, zo] = helixXZ(angle, guideR + capW / 2);

      capVerts.push(xi, y, zi);
      capVerts.push(xo, y, zo);
      capVerts.push(xi, y + 0.005, zi);
      capVerts.push(xo, y + 0.005, zo);

      if (i < segments) {
        const b = i * 4;
        const n = (i + 1) * 4;
        capIdx.push(b + 2, n + 2, b + 3, b + 3, n + 2, n + 3);
      }
    }

    const capGeo = new THREE.BufferGeometry();
    capGeo.setAttribute('position', new THREE.Float32BufferAttribute(capVerts, 3));
    capGeo.setIndex(capIdx);
    capGeo.computeVertexNormals();
    group.add(new THREE.Mesh(capGeo, matGuideRail));
  }

  return group;
}

// ─── Radial Support Arms (Drum to Belt) ────────────────────────

export function buildSpiralBrackets(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'supportArms';

  const radius = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const innerBeltR = radius - beltW / 2;
  const drumR = Math.max(0.12, innerBeltR * 0.65);
  const totalH = params.totalHeightMm / 1000;
  const totalAngle = params.turns * Math.PI * 2;
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;

  const intervalRad = (BRACKET_INTERVAL_DEG * Math.PI) / 180;
  const numArms = Math.floor(totalAngle / intervalRad) + 1;

  const armThick = 0.02;
  const armHeight = 0.035;

  for (let i = 0; i <= numArms; i++) {
    const angle = startAngle + i * intervalRad;
    const t = Math.min(1, (i * intervalRad) / totalAngle);
    const y = helixY(t, totalH, params.direction);

    // Arm from drum outer surface to belt inner edge
    const armLen = innerBeltR - drumR - 0.01;
    const armCenterR = (drumR + innerBeltR) / 2;
    const [ax, az] = helixXZ(angle, armCenterR);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(armThick, armHeight, armLen),
      matBracketArm,
    );
    arm.position.set(ax, y - armHeight / 2, az);
    arm.rotation.y = -angle + Math.PI / 2;
    arm.castShadow = true;
    group.add(arm);

    // Gusset triangle at drum end (small triangular stiffener)
    const gusset = new THREE.Mesh(
      new THREE.BoxGeometry(armThick, armHeight * 0.6, armHeight * 0.6),
      matBracketArm,
    );
    const [gx, gz] = helixXZ(angle, drumR + armHeight * 0.3);
    gusset.position.set(gx, y - armHeight * 0.7, gz);
    gusset.rotation.y = -angle + Math.PI / 2;
    group.add(gusset);
  }

  return group;
}

// ─── Base Structure ────────────────────────────────────────────

export function buildBaseStructure(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'base';

  const outerR = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const baseR = outerR + beltW / 2 + 0.1;

  if (params.baseType === 'reinforced') {
    // Heavy octagonal base plate
    const plateH = 0.03;
    const plateGeo = new THREE.CylinderGeometry(baseR, baseR, plateH, 8);
    const plate = new THREE.Mesh(plateGeo, matCastIron);
    plate.position.y = plateH / 2 - 0.02;
    plate.receiveShadow = true;
    group.add(plate);

    // Top ring accent
    const ringGeo = new THREE.TorusGeometry(baseR - 0.03, 0.01, 8, 32);
    const ring = new THREE.Mesh(ringGeo, matDarkSteel);
    ring.position.y = plateH - 0.02;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // 6 leveling feet around perimeter
    for (let i = 0; i < 6; i++) {
      const fa = (i * Math.PI * 2) / 6;
      const [fx, fz] = helixXZ(fa, baseR - 0.06);

      // Foot pad
      const pad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.03, 0.035, 0.01, 8),
        matFootPad,
      );
      pad.position.set(fx, -0.025, fz);
      group.add(pad);

      // Adjustment bolt
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.009, 0.025, 6),
        matDarkSteel,
      );
      bolt.position.set(fx, -0.008, fz);
      group.add(bolt);
    }

  } else {
    // Compact square frame base
    const frameW = baseR * 1.3;
    const tubeH = 0.06;
    const tubeD = 0.06;

    for (const [dx, dz, rotY] of [
      [0, frameW / 2, 0],
      [0, -frameW / 2, 0],
      [frameW / 2, 0, Math.PI / 2],
      [-frameW / 2, 0, Math.PI / 2],
    ] as [number, number, number][]) {
      const tube = new THREE.Mesh(
        new THREE.BoxGeometry(frameW, tubeH, tubeD),
        matCastIron,
      );
      tube.position.set(dx, tubeH / 2 - 0.02, dz);
      tube.rotation.y = rotY;
      tube.castShadow = true;
      group.add(tube);
    }
  }

  return group;
}

// ─── Infeed / Outfeed Transitions ──────────────────────────────

export function buildTransitions(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'transitions';

  const radius = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const totalH = params.totalHeightMm / 1000;
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const endAngle = startAngle + params.turns * Math.PI * 2;
  const beltThick = 0.01;
  const guideH = params.sideGuidesEnabled ? params.guideHeightMm / 1000 : 0;

  // Infeed
  const infeedY = params.direction === 'up' ? 0 : totalH;
  group.add(buildTransitionSection(
    radius, startAngle, infeedY, beltW, INFEED_LENGTH_M, beltThick, guideH, 'infeed',
  ));

  // Outfeed
  const outfeedY = params.direction === 'up' ? totalH : 0;
  group.add(buildTransitionSection(
    radius, endAngle, outfeedY, beltW, OUTFEED_LENGTH_M, beltThick, guideH, 'outfeed',
  ));

  return group;
}

function buildTransitionSection(
  radius: number, angle: number, y: number,
  beltW: number, length: number, beltThick: number,
  guideH: number, name: string,
): THREE.Group {
  const section = new THREE.Group();
  section.name = name;

  // Tangent direction at this angle on the spiral
  const tangentX = -Math.sin(angle);
  const tangentZ = Math.cos(angle);

  // Start at edge of spiral
  const [startX, startZ] = helixXZ(angle, radius);
  const midX = startX + tangentX * length / 2;
  const midZ = startZ + tangentZ * length / 2;

  // Belt surface (straight section)
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(beltW, beltThick, length),
    matSlatBelt,
  );
  belt.position.set(midX, y + beltThick / 2, midZ);
  belt.rotation.y = angle;
  belt.castShadow = true;
  belt.receiveShadow = true;
  section.add(belt);

  // Frame side rails (matching straight conveyor style)
  for (const side of [-1, 1]) {
    const railOffset = side * (beltW / 2 + 0.02);
    // Rotate the offset perpendicular to tangent
    const perpX = Math.cos(angle);
    const perpZ = Math.sin(angle);
    const railX = midX + perpX * railOffset;
    const railZ = midZ + perpZ * railOffset;

    // Horizontal rail
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.04, length),
      matStainlessSteel,
    );
    rail.position.set(railX, y - 0.02, railZ);
    rail.rotation.y = angle;
    rail.castShadow = true;
    section.add(rail);
  }

  // Support legs under transition
  for (const legT of [0.2, 0.8]) {
    const legX = startX + tangentX * length * legT;
    const legZ = startZ + tangentZ * length * legT;

    for (const side of [-1, 1]) {
      const perpX = Math.cos(angle);
      const perpZ = Math.sin(angle);
      const lx = legX + perpX * side * (beltW / 2 + 0.02);
      const lz = legZ + perpZ * side * (beltW / 2 + 0.02);
      const legH = y - 0.04;

      if (legH > 0.05) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.04, legH, 0.04),
          matAluminum,
        );
        leg.position.set(lx, legH / 2, lz);
        leg.castShadow = true;
        section.add(leg);

        // Foot
        const foot = new THREE.Mesh(
          new THREE.BoxGeometry(0.07, 0.005, 0.07),
          matFootPad,
        );
        foot.position.set(lx, 0.0025, lz);
        section.add(foot);
      }
    }
  }

  // Side guides on transition
  if (guideH > 0) {
    for (const side of [-1, 1]) {
      const perpX = Math.cos(angle);
      const perpZ = Math.sin(angle);
      const gx = midX + perpX * side * (beltW / 2 + 0.005);
      const gz = midZ + perpZ * side * (beltW / 2 + 0.005);

      const guide = new THREE.Mesh(
        new THREE.BoxGeometry(0.003, guideH, length),
        matGuideRail,
      );
      guide.position.set(gx, y + beltThick + guideH / 2, gz);
      guide.rotation.y = angle;
      section.add(guide);
    }
  }

  // End plate (at the free end of the transition)
  const endX = startX + tangentX * length;
  const endZ = startZ + tangentZ * length;

  const endPlate = new THREE.Mesh(
    new THREE.BoxGeometry(beltW + 0.08, 0.05, 0.005),
    matDarkSteel,
  );
  endPlate.position.set(endX, y - 0.015, endZ);
  endPlate.rotation.y = angle;
  section.add(endPlate);

  return section;
}
