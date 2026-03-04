/**
 * Spiral Conveyor Geometry — Premium industrial spiral path generation
 *
 * Creates a helical transport surface with proper width, side rails,
 * slat texture, and structural support brackets.
 */
import * as THREE from 'three';
import { SpiralConveyorParams } from './spiralTypes';

// Premium shared materials
import {
  matGuideRail,
  matGalvanized as matBracket,
  matAluminum as matColumn,
  matCastIron as matBase,
  matDarkSteel as matBaseTop,
  matStainlessSteel as matFrameCore,
} from '../premiumMaterials';

// Spiral-specific materials (belt surface needs double-side for proper visual)
const matSlat = new THREE.MeshStandardMaterial({
  color: 0x2a2a2a, metalness: 0.15, roughness: 0.70, side: THREE.DoubleSide,
});
const matSlatEdge = new THREE.MeshStandardMaterial({
  color: 0x3a6080, metalness: 0.40, roughness: 0.45,
});

// ── Constants ──
const SEGMENTS_PER_TURN = 72;        // smooth helix
// Slat visual segments handled via line rendering
const BRACKET_INTERVAL_DEG = 90;     // structural bracket every 90°
export const INFEED_LENGTH_M = 0.4;         // straight infeed/outfeed transition
export const OUTFEED_LENGTH_M = 0.4;

/** Generate points along the spiral centerline */
export function generateSpiralPath(
  params: SpiralConveyorParams,
): { points: THREE.Vector3[]; totalAngleRad: number } {
  const radius = params.diameterMm / 2000;
  const totalHeight = params.totalHeightMm / 1000;
  const turns = params.turns;
  const totalAngleRad = turns * Math.PI * 2;
  const segments = Math.ceil(turns * SEGMENTS_PER_TURN);
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const points: THREE.Vector3[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * totalAngleRad;
    const y = params.direction === 'up' ? t * totalHeight : totalHeight - t * totalHeight;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    points.push(new THREE.Vector3(x, y, z));
  }

  return { points, totalAngleRad };
}

/** Build the spiral belt/slat surface */
export function buildSpiralBelt(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'spiralBelt';

  const radius = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const totalHeight = params.totalHeightMm / 1000;
  const turns = params.turns;
  const totalAngleRad = turns * Math.PI * 2;
  const segments = Math.ceil(turns * SEGMENTS_PER_TURN);
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const halfW = beltW / 2;
  const beltThickness = 0.008; // 8mm thick slat belt

  // Build belt as a series of quads (for slat appearance)
  const vertices: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + t * totalAngleRad;
    const y = params.direction === 'up' ? t * totalHeight : totalHeight - t * totalHeight;

    // Width: use radial direction (inner/outer)
    const inX = Math.cos(angle) * (radius - halfW);
    const inZ = Math.sin(angle) * (radius - halfW);
    const outX = Math.cos(angle) * (radius + halfW);
    const outZ = Math.sin(angle) * (radius + halfW);

    const idx = i * 2;
    vertices.push(inX, y + beltThickness, inZ);   // inner edge
    vertices.push(outX, y + beltThickness, outZ);  // outer edge
    normals.push(0, 1, 0, 0, 1, 0);
    uvs.push(t * turns * 10, 0, t * turns * 10, 1);

    if (i < segments) {
      const a = idx, b = idx + 1, c = idx + 2, d = idx + 3;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();

  const belt = new THREE.Mesh(geo, matSlat);
  belt.castShadow = true;
  belt.receiveShadow = true;
  group.add(belt);

  // Belt edge strips (side-flex chain look)
  for (const edgeR of [radius - halfW, radius + halfW]) {
    const edgeVerts: number[] = [];
    const edgeIndices: number[] = [];
    const edgeNormals: number[] = [];
    const edgeH = 0.012; // 12mm edge strip height

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * totalAngleRad;
      const y = params.direction === 'up' ? t * totalHeight : totalHeight - t * totalHeight;
      const ex = Math.cos(angle) * edgeR;
      const ez = Math.sin(angle) * edgeR;

      edgeVerts.push(ex, y, ez);
      edgeVerts.push(ex, y + edgeH, ez);
      // Normal pointing outward
      const nx = Math.cos(angle) * (edgeR > radius ? 1 : -1);
      const nz = Math.sin(angle) * (edgeR > radius ? 1 : -1);
      edgeNormals.push(nx, 0, nz, nx, 0, nz);

      if (i < segments) {
        const idx = i * 2;
        edgeIndices.push(idx, idx + 2, idx + 1, idx + 1, idx + 2, idx + 3);
      }
    }

    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgeVerts, 3));
    edgeGeo.setAttribute('normal', new THREE.Float32BufferAttribute(edgeNormals, 3));
    edgeGeo.setIndex(edgeIndices);
    edgeGeo.computeVertexNormals();

    const edgeMesh = new THREE.Mesh(edgeGeo, matSlatEdge);
    edgeMesh.castShadow = true;
    group.add(edgeMesh);
  }

  // Slat lines (visual texture — small ridges across belt every ~50mm)
  const slatPitch = 0.05;
  const numSlats = Math.floor((turns * Math.PI * 2 * radius) / slatPitch);
  const maxSlats = Math.min(numSlats, 600); // cap for performance
  for (let s = 0; s < maxSlats; s++) {
    const t = s / maxSlats;
    const angle = startAngle + t * totalAngleRad;
    const y = params.direction === 'up' ? t * totalHeight : totalHeight - t * totalHeight;

    const inX = Math.cos(angle) * (radius - halfW + 0.005);
    const inZ = Math.sin(angle) * (radius - halfW + 0.005);
    const outX = Math.cos(angle) * (radius + halfW - 0.005);
    const outZ = Math.sin(angle) * (radius + halfW - 0.005);

    const slatGeo = new THREE.BufferGeometry();
    const sv = new Float32Array([inX, y + beltThickness + 0.001, inZ, outX, y + beltThickness + 0.001, outZ]);
    slatGeo.setAttribute('position', new THREE.BufferAttribute(sv, 3));
    const slatLine = new THREE.Line(slatGeo, new THREE.LineBasicMaterial({ color: 0x555555 }));
    group.add(slatLine);
  }

  return group;
}

/** Build side guide rails along the spiral */
export function buildSpiralGuides(params: SpiralConveyorParams): THREE.Group | null {
  if (!params.sideGuidesEnabled) return null;

  const group = new THREE.Group();
  group.name = 'spiralGuides';

  const radius = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const halfW = beltW / 2;
  const totalHeight = params.totalHeightMm / 1000;
  const turns = params.turns;
  const totalAngleRad = turns * Math.PI * 2;
  const segments = Math.ceil(turns * SEGMENTS_PER_TURN);
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const guideH = params.guideHeightMm / 1000;
  const beltThickness = 0.008;

  for (const edgeR of [radius - halfW - 0.002, radius + halfW + 0.002]) {
    const verts: number[] = [];
    const idx: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const angle = startAngle + t * totalAngleRad;
      const y = params.direction === 'up' ? t * totalHeight : totalHeight - t * totalHeight;
      const ex = Math.cos(angle) * edgeR;
      const ez = Math.sin(angle) * edgeR;

      verts.push(ex, y + beltThickness, ez);
      verts.push(ex, y + beltThickness + guideH, ez);

      if (i < segments) {
        const vi = i * 2;
        idx.push(vi, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, matGuideRail);
    mesh.castShadow = true;
    group.add(mesh);
  }

  return group;
}

/** Build the center support column or framed core */
export function buildCenterStructure(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'centerStructure';

  const totalHeight = params.totalHeightMm / 1000;
  const columnHeight = totalHeight + 0.15; // extend slightly above

  if (params.centerStructure === 'column') {
    // Heavy cylindrical column
    const colRadius = Math.min(0.2, params.diameterMm / 8000); // proportional
    const colGeo = new THREE.CylinderGeometry(colRadius, colRadius, columnHeight, 24);
    const col = new THREE.Mesh(colGeo, matColumn);
    col.position.y = columnHeight / 2;
    col.castShadow = true;
    group.add(col);

    // Column cap
    const capGeo = new THREE.CylinderGeometry(colRadius * 1.3, colRadius * 1.3, 0.03, 24);
    const cap = new THREE.Mesh(capGeo, matColumn);
    cap.position.y = columnHeight + 0.015;
    group.add(cap);

    // Column base ring
    const baseRingGeo = new THREE.CylinderGeometry(colRadius * 1.5, colRadius * 1.5, 0.04, 24);
    const baseRing = new THREE.Mesh(baseRingGeo, matColumn);
    baseRing.position.y = 0.02;
    group.add(baseRing);

  } else {
    // Framed core — 4 vertical posts with cross braces
    const postSize = 0.05;
    const coreR = Math.min(0.15, params.diameterMm / 10000);

    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const px = Math.cos(angle) * coreR;
      const pz = Math.sin(angle) * coreR;

      // Vertical post
      const postGeo = new THREE.BoxGeometry(postSize, columnHeight, postSize);
      const post = new THREE.Mesh(postGeo, matFrameCore);
      post.position.set(px, columnHeight / 2, pz);
      post.castShadow = true;
      group.add(post);

      // Horizontal cross braces every 1m
      const numBraces = Math.ceil(columnHeight);
      for (let b = 0; b < numBraces; b++) {
        const by = (b + 0.5) * (columnHeight / numBraces);
        const nextAngle = ((i + 1) % 4 * Math.PI) / 2;
        const nx = Math.cos(nextAngle) * coreR;
        const nz = Math.sin(nextAngle) * coreR;

        const dx = nx - px, dz = nz - pz;
        const len = Math.sqrt(dx * dx + dz * dz);
        const braceGeo = new THREE.BoxGeometry(len, 0.025, 0.025);
        const brace = new THREE.Mesh(braceGeo, matFrameCore);
        brace.position.set((px + nx) / 2, by, (pz + nz) / 2);
        brace.rotation.y = Math.atan2(dz, dx);
        group.add(brace);
      }
    }
  }

  return group;
}

/** Build structural brackets connecting spiral to center column */
export function buildSpiralBrackets(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'spiralBrackets';

  const radius = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const innerR = radius - beltW / 2;
  const totalHeight = params.totalHeightMm / 1000;
  const turns = params.turns;
  const totalAngleRad = turns * Math.PI * 2;
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;

  const bracketIntervalRad = (BRACKET_INTERVAL_DEG * Math.PI) / 180;
  const numBrackets = Math.floor(totalAngleRad / bracketIntervalRad);

  const bracketThick = 0.015;
  const bracketDepth = 0.04;

  for (let i = 0; i <= numBrackets; i++) {
    const angle = startAngle + i * bracketIntervalRad;
    const t = (i * bracketIntervalRad) / totalAngleRad;
    const y = params.direction === 'up' ? t * totalHeight : totalHeight - t * totalHeight;

    // Bracket from center to inner belt edge
    const armLen = innerR - 0.05; // from near center to belt inner edge
    const cx = Math.cos(angle) * (armLen / 2 + 0.05);
    const cz = Math.sin(angle) * (armLen / 2 + 0.05);

    const bracketGeo = new THREE.BoxGeometry(armLen, bracketDepth, bracketThick);
    const bracket = new THREE.Mesh(bracketGeo, matBracket);
    bracket.position.set(cx, y - bracketDepth / 2, cz);
    bracket.rotation.y = -angle + Math.PI / 2;
    bracket.castShadow = true;
    group.add(bracket);

    // Small vertical support tab
    const tabGeo = new THREE.BoxGeometry(bracketThick, bracketDepth * 1.5, bracketThick * 2);
    const tab = new THREE.Mesh(tabGeo, matBracket);
    const tabR = innerR - 0.01;
    tab.position.set(Math.cos(angle) * tabR, y - bracketDepth, Math.sin(angle) * tabR);
    tab.rotation.y = -angle;
    group.add(tab);
  }

  return group;
}

/** Build the base/foundation structure */
export function buildBaseStructure(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'base';

  const radius = params.diameterMm / 2000;

  if (params.baseType === 'reinforced') {
    // Heavy reinforced base plate with feet
    const plateR = radius + 0.15;
    const plateH = 0.025;
    const plateGeo = new THREE.CylinderGeometry(plateR, plateR, plateH, 32);
    const plate = new THREE.Mesh(plateGeo, matBase);
    plate.position.y = plateH / 2;
    plate.receiveShadow = true;
    group.add(plate);

    // Top ring on base plate
    const ringGeo = new THREE.TorusGeometry(plateR - 0.02, 0.015, 8, 32);
    const ring = new THREE.Mesh(ringGeo, matBaseTop);
    ring.position.y = plateH;
    ring.rotation.x = Math.PI / 2;
    group.add(ring);

    // 6 leveling feet
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const fx = Math.cos(angle) * (plateR - 0.06);
      const fz = Math.sin(angle) * (plateR - 0.06);

      // Foot pad
      const padGeo = new THREE.CylinderGeometry(0.03, 0.035, 0.012, 8);
      const pad = new THREE.Mesh(padGeo, matBase);
      pad.position.set(fx, -0.006, fz);
      group.add(pad);

      // Adjustable bolt
      const boltGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.025, 6);
      const bolt = new THREE.Mesh(boltGeo, matColumn);
      bolt.position.set(fx, 0.012, fz);
      group.add(bolt);
    }
  } else {
    // Compact base — simple square frame
    const frameSize = radius * 1.4;
    const tubeH = 0.06;
    const tubeW = 0.06;

    for (const [dx, dz, rotY, len] of [
      [0, frameSize / 2, 0, frameSize],
      [0, -frameSize / 2, 0, frameSize],
      [frameSize / 2, 0, Math.PI / 2, frameSize],
      [-frameSize / 2, 0, Math.PI / 2, frameSize],
    ] as [number, number, number, number][]) {
      const tubeGeo = new THREE.BoxGeometry(len, tubeH, tubeW);
      const tube = new THREE.Mesh(tubeGeo, matBase);
      tube.position.set(dx, tubeH / 2, dz);
      tube.rotation.y = rotY;
      tube.castShadow = true;
      group.add(tube);
    }
  }

  return group;
}

/** Build infeed/outfeed straight transition sections */
export function buildTransitions(params: SpiralConveyorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'transitions';

  const radius = params.diameterMm / 2000;
  const beltW = params.beltWidthMm / 1000;
  const totalHeight = params.totalHeightMm / 1000;
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const endAngle = startAngle + params.turns * Math.PI * 2;

  const beltThick = 0.008;
  const transLen = INFEED_LENGTH_M;
  const guideH = params.sideGuidesEnabled ? params.guideHeightMm / 1000 : 0;

  // Infeed transition
  const infeedY = params.direction === 'up' ? 0 : totalHeight;
  const infeedDirX = -Math.sin(startAngle);
  const infeedDirZ = Math.cos(startAngle);

  const infeedGroup = buildTransitionSection(
    radius, startAngle, infeedY, infeedDirX, infeedDirZ,
    beltW, transLen, beltThick, guideH, 'infeed'
  );
  group.add(infeedGroup);

  // Outfeed transition
  const outfeedY = params.direction === 'up' ? totalHeight : 0;
  const outfeedDirX = -Math.sin(endAngle);
  const outfeedDirZ = Math.cos(endAngle);

  const outfeedGroup = buildTransitionSection(
    radius, endAngle, outfeedY, outfeedDirX, outfeedDirZ,
    beltW, transLen, beltThick, guideH, 'outfeed'
  );
  group.add(outfeedGroup);

  return group;
}

function buildTransitionSection(
  radius: number, angle: number, y: number,
  dirX: number, dirZ: number,
  beltW: number, length: number, thickness: number,
  guideH: number, name: string,
): THREE.Group {
  const section = new THREE.Group();
  section.name = name;

  // Belt surface at the tangent point
  const startX = Math.cos(angle) * radius;
  const startZ = Math.sin(angle) * radius;

  // Straight belt section
  const beltGeo = new THREE.BoxGeometry(length, thickness, beltW);
  const belt = new THREE.Mesh(beltGeo, matSlat);
  belt.castShadow = true;
  belt.receiveShadow = true;

  // Position along tangent direction
  const midX = startX + dirX * length / 2;
  const midZ = startZ + dirZ * length / 2;
  belt.position.set(midX, y + thickness / 2, midZ);
  belt.rotation.y = -angle;
  section.add(belt);

  // Side rails
  for (const side of [-1, 1]) {
    const railGeo = new THREE.BoxGeometry(length, 0.03, 0.004);
    const rail = new THREE.Mesh(railGeo, matGuideRail);
    rail.position.set(midX, y + 0.015, midZ);
    rail.rotation.y = -angle;
    // Offset along width
    const offX = Math.cos(angle) * side * beltW / 2;
    const offZ = Math.sin(angle) * side * beltW / 2;
    rail.position.x += offX;
    rail.position.z += offZ;
    section.add(rail);
  }

  // Guide walls on transitions
  if (guideH > 0) {
    for (const side of [-1, 1]) {
      const guideGeo = new THREE.BoxGeometry(length, guideH, 0.003);
      const guide = new THREE.Mesh(guideGeo, matGuideRail);
      guide.position.set(midX, y + thickness + guideH / 2, midZ);
      guide.rotation.y = -angle;
      const offX = Math.cos(angle) * side * (beltW / 2 + 0.002);
      const offZ = Math.sin(angle) * side * (beltW / 2 + 0.002);
      guide.position.x += offX;
      guide.position.z += offZ;
      section.add(guide);
    }
  }

  return section;
}
