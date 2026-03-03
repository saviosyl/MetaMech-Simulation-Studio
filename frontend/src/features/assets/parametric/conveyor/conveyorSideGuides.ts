/**
 * Conveyor Side Guide System — Procedural
 */
import * as THREE from 'three';
import { ConveyorParams } from './conveyorTypes';

const matGuide = new THREE.MeshStandardMaterial({
  color: 0xd0d0d0, metalness: 0.5, roughness: 0.4,
});

export function buildSideGuides(params: ConveyorParams): THREE.Group | null {
  if (!params.sideGuidesEnabled) return null;

  const group = new THREE.Group();
  group.name = 'sideGuides';

  const lengthM = params.lengthMm / 1000;
  const widthM = params.widthMm / 1000;
  const heightM = params.heightMm / 1000;
  const guideH = params.sideGuideHeightMm / 1000;
  const thickness = 0.003; // 3mm sheet metal

  for (const side of [-1, 1]) {
    const guideGeo = new THREE.BoxGeometry(lengthM - 0.04, guideH, thickness);
    const guide = new THREE.Mesh(guideGeo, matGuide);
    guide.position.set(0, heightM + guideH / 2, side * widthM / 2);
    guide.castShadow = true;
    group.add(guide);

    // Mounting brackets every ~500mm
    const bracketSpacing = 0.5;
    const numBrackets = Math.max(2, Math.floor(lengthM / bracketSpacing));
    for (let i = 0; i < numBrackets; i++) {
      const x = -lengthM / 2 + 0.1 + (lengthM - 0.2) * (i / (numBrackets - 1));
      const bracketGeo = new THREE.BoxGeometry(0.02, guideH + 0.01, 0.02);
      const bracket = new THREE.Mesh(bracketGeo, matGuide);
      bracket.position.set(x, heightM + guideH / 2, side * (widthM / 2 + 0.01));
      group.add(bracket);
    }
  }

  return group;
}
