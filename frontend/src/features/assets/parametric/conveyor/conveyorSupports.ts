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

// Premium shared materials
import {
  matAluminum,
  matDarkSteel,
  matFootPad,
} from '../premiumMaterials';

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

/** Build a single support station
 *
 * Conveyor axes: X = length, Y = height, Z = width
 * Posts spread along Z (width), cross brace spans Z.
 */
function buildSupportStation(widthM: number, heightM: number, adjustMm: number, hasFeet: boolean): THREE.Group {
  const station = new THREE.Group();
  const halfW = widthM / 2;
  const postSection = 0.04; // 40mm square extrusion
  const footD = 0.04;
  const adjustM = adjustMm / 1000;

  // Two vertical posts — left (−Z) and right (+Z)
  for (const side of [-1, 1]) {
    const postH = heightM - postSection;
    const postGeo = new THREE.BoxGeometry(postSection, postH, postSection);
    const post = new THREE.Mesh(postGeo, matAluminum);
    post.position.set(0, postH / 2, side * (halfW - postSection / 2));
    post.castShadow = true;
    station.add(post);

    // Top swivel plate (connects post to frame rail)
    const plateGeo = new THREE.BoxGeometry(postSection * 1.5, postSection * 0.4, postSection * 1.5);
    const plate = new THREE.Mesh(plateGeo, matDarkSteel);
    plate.position.set(0, heightM - postSection * 0.2, side * (halfW - postSection / 2));
    plate.castShadow = true;
    station.add(plate);

    // Foot plate + adjustable foot
    if (hasFeet) {
      const fpGeo = new THREE.BoxGeometry(postSection * 2, 0.005, postSection * 2);
      const fp = new THREE.Mesh(fpGeo, matFootPad);
      fp.position.set(0, 0.0025, side * (halfW - postSection / 2));
      station.add(fp);

      const footGeo = new THREE.CylinderGeometry(footD / 2, footD / 2 * 1.3, adjustM + 0.015, 8);
      const foot = new THREE.Mesh(footGeo, matDarkSteel);
      foot.position.set(0, -(adjustM + 0.015) / 2, side * (halfW - postSection / 2));
      station.add(foot);
    }
  }

  // Cross brace — horizontal bar spanning between posts along Z (width)
  const braceY = heightM * 0.35;
  const braceLen = widthM - postSection * 2;
  // Brace: thin along X (length), short along Y, spans Z (width)
  const braceGeo = new THREE.BoxGeometry(postSection * 0.6, postSection * 0.6, braceLen);
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
