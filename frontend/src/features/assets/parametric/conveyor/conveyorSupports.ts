/**
 * Conveyor Support/Leg Assembly — Procedural Geometry
 *
 * Creates industrial-style support legs with:
 * - Vertical posts (aluminum extrusion look)
 * - Cross braces
 * - Foot plates with adjustable feet
 * - Swivel plates at top
 */
import * as THREE from 'three';
import { ConveyorParams } from './conveyorTypes';

// Materials (shared, reused)
const matAluminum = new THREE.MeshStandardMaterial({
  color: 0xc0c0c0, metalness: 0.7, roughness: 0.3,
});
const matDarkSteel = new THREE.MeshStandardMaterial({
  color: 0x404040, metalness: 0.8, roughness: 0.2,
});
const matFootPad = new THREE.MeshStandardMaterial({
  color: 0x333333, metalness: 0.5, roughness: 0.6,
});

/** Compute support positions along the conveyor length */
export function computeSupportPositions(lengthMm: number, spacingMm: number): number[] {
  const lengthM = lengthMm / 1000;
  const spacingM = spacingMm / 1000;
  const endOffset = 0.25; // 250mm from each end

  if (lengthM < 0.6) return [0]; // Very short: single center support

  const driveEndX = lengthM / 2 - endOffset;
  const idleEndX = -lengthM / 2 + endOffset;

  const positions = [idleEndX, driveEndX];

  // Add middle supports
  const span = driveEndX - idleEndX;
  if (span > spacingM * 1.1) {
    const numMiddle = Math.max(0, Math.floor(span / spacingM) - 1);
    if (numMiddle > 0) {
      const step = span / (numMiddle + 1);
      for (let i = 1; i <= numMiddle; i++) {
        positions.push(idleEndX + step * i);
      }
    }
  }

  return positions.sort((a, b) => a - b);
}

/** Build a single support station */
function buildSupportStation(widthM: number, heightM: number, adjustMm: number, hasFeet: boolean): THREE.Group {
  const station = new THREE.Group();
  const halfW = widthM / 2;
  const postW = 0.04; // 40mm post width
  const postD = 0.04;
  const footD = 0.04;
  const adjustM = adjustMm / 1000;

  // Two vertical posts (left + right)
  for (const side of [-1, 1]) {
    const postH = heightM - postW; // leave room for top plate
    const postGeo = new THREE.BoxGeometry(postW, postH, postD);
    const post = new THREE.Mesh(postGeo, matAluminum);
    post.position.set(side * (halfW - postW / 2), postH / 2, 0);
    post.castShadow = true;
    station.add(post);

    // Top swivel plate
    const plateGeo = new THREE.BoxGeometry(postW * 1.5, postW * 0.4, postD * 1.5);
    const plate = new THREE.Mesh(plateGeo, matDarkSteel);
    plate.position.set(side * (halfW - postW / 2), heightM - postW * 0.2, 0);
    plate.castShadow = true;
    station.add(plate);

    // Foot plate + adjustable foot
    if (hasFeet) {
      // Foot plate
      const fpGeo = new THREE.BoxGeometry(postW * 2, 0.005, postD * 2);
      const fp = new THREE.Mesh(fpGeo, matFootPad);
      fp.position.set(side * (halfW - postW / 2), 0.0025, 0);
      station.add(fp);

      // Adjustable foot (threaded rod + pad)
      const footGeo = new THREE.CylinderGeometry(footD / 2, footD / 2 * 1.3, adjustM + 0.015, 8);
      const foot = new THREE.Mesh(footGeo, matDarkSteel);
      foot.position.set(side * (halfW - postW / 2), -(adjustM + 0.015) / 2, 0);
      station.add(foot);
    }
  }

  // Cross brace (horizontal bar between posts)
  const braceY = heightM * 0.35;
  const braceLen = widthM - postW * 2;
  const braceGeo = new THREE.BoxGeometry(braceLen, postW * 0.6, postD * 0.6);
  const brace = new THREE.Mesh(braceGeo, matAluminum);
  brace.position.set(0, braceY, 0);
  brace.castShadow = true;
  station.add(brace);

  return station;
}

/** Build all support assemblies for a conveyor */
export function buildSupportAssembly(params: ConveyorParams): THREE.Group | null {
  if (!params.showSupports) return null;

  const group = new THREE.Group();
  group.name = 'supports';

  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;
  const positions = computeSupportPositions(params.lengthMm, params.supportSpacingMm);

  for (const xPos of positions) {
    const station = buildSupportStation(
      widthM + 0.02, // slightly wider than belt
      heightM,
      params.adjustableFeetEnabled ? params.footAdjustmentMm : 0,
      params.adjustableFeetEnabled,
    );
    station.position.x = xPos;
    group.add(station);
  }

  return group;
}
