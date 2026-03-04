/**
 * Stopper Module — Pneumatic pop-up blade stop
 *
 * Realistic industrial stop gate that mounts on conveyor frame.
 * Visualizes as a pneumatic cylinder with retractable blade.
 */
import * as THREE from 'three';

import {
  matDarkSteel as matBody,
  matSafetyRed as matBlade,
  matIndustrialBlue as matCylinder,
  matGalvanized as matBracket,
  matChrome as matRod,
} from '../premiumMaterials';

export interface StopperParams {
  enabled: boolean;
  engaged: boolean;
  widthMm: number;       // belt width it spans
  bladeHeightMm: number; // how high blade extends
  mountHeightMm: number; // conveyor belt height
}

export const STOPPER_DEFAULTS: StopperParams = {
  enabled: true,
  engaged: true,
  widthMm: 400,
  bladeHeightMm: 80,
  mountHeightMm: 800,
};

export function buildStopper(params: StopperParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'stopper';

  const beltW = params.widthMm / 1000;
  const bladeH = params.bladeHeightMm / 1000;
  const mountH = params.mountHeightMm / 1000;
  const engaged = params.engaged;

  // ── Mounting bracket (L-shaped, bolts to frame) ──
  const bracketW = beltW + 0.06;
  const bracketGeo = new THREE.BoxGeometry(0.04, 0.06, bracketW);
  const bracket = new THREE.Mesh(bracketGeo, matBracket);
  bracket.position.set(-0.02, mountH - 0.05, 0);
  bracket.castShadow = true;
  group.add(bracket);

  // Bracket vertical tab
  const tabGeo = new THREE.BoxGeometry(0.04, 0.04, bracketW);
  const tab = new THREE.Mesh(tabGeo, matBracket);
  tab.position.set(-0.04, mountH - 0.02, 0);
  group.add(tab);

  // ── Pneumatic cylinder (under belt) ──
  const cylLen = 0.12;
  const cylR = 0.02;
  const cylGeo = new THREE.CylinderGeometry(cylR, cylR, cylLen, 12);
  const cyl = new THREE.Mesh(cylGeo, matCylinder);
  cyl.position.set(0, mountH - 0.08 - cylLen / 2, 0);
  cyl.castShadow = true;
  group.add(cyl);

  // Cylinder end caps
  for (const yOff of [-cylLen / 2, cylLen / 2]) {
    const capGeo = new THREE.CylinderGeometry(cylR * 1.2, cylR * 1.2, 0.008, 12);
    const cap = new THREE.Mesh(capGeo, matBody);
    cap.position.set(0, mountH - 0.08 + yOff, 0);
    group.add(cap);
  }

  // ── Piston rod ──
  const rodLen = engaged ? bladeH + 0.03 : 0.015;
  const rodGeo = new THREE.CylinderGeometry(0.006, 0.006, rodLen, 8);
  const rod = new THREE.Mesh(rodGeo, matRod);
  rod.position.set(0, mountH - 0.02 + rodLen / 2, 0);
  group.add(rod);

  // ── Stop blade (the red plate that actually stops product) ──
  if (engaged) {
    const bladeW = beltW - 0.02;
    const bladeGeo = new THREE.BoxGeometry(0.006, bladeH, bladeW);
    const blade = new THREE.Mesh(bladeGeo, matBlade);
    blade.position.set(0, mountH + bladeH / 2, 0);
    blade.castShadow = true;
    group.add(blade);

    // Blade top strip (rounded look)
    const stripGeo = new THREE.CylinderGeometry(0.003, 0.003, bladeW, 8);
    stripGeo.rotateX(Math.PI / 2);
    const strip = new THREE.Mesh(stripGeo, matBlade);
    strip.position.set(0, mountH + bladeH, 0);
    group.add(strip);
  }

  // ── Mounting bolts (visual detail) ──
  for (const zOff of [-bracketW / 2 + 0.02, bracketW / 2 - 0.02]) {
    const boltGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.01, 6);
    boltGeo.rotateZ(Math.PI / 2);
    const bolt = new THREE.Mesh(boltGeo, matRod);
    bolt.position.set(-0.045, mountH - 0.02, zOff);
    group.add(bolt);
  }

  return group;
}
