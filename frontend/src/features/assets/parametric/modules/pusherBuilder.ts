/**
 * Pusher Module — Pneumatic side-push diverter
 *
 * Realistic industrial pusher with guided plate, pneumatic actuator,
 * and frame mounting. Used for reject/divert operations.
 */
import * as THREE from 'three';

import {
  matCastIron as matFrame,
  matPusherOrange as matPlate,
  matIndustrialBlue as matCylinder,
  matChrome as matRod,
  matGalvanized as matGuide,
  matSensorBody as matSensor,
} from '../premiumMaterials';

export interface PusherParams {
  enabled: boolean;
  side: 'left' | 'right';
  strokeMm: number;
  plateWidthMm: number;
  plateHeightMm: number;
  mountHeightMm: number; // belt height
  extended: boolean;     // visual state
}

export const PUSHER_DEFAULTS: PusherParams = {
  enabled: true,
  side: 'right',
  strokeMm: 300,
  plateWidthMm: 250,
  plateHeightMm: 100,
  mountHeightMm: 800,
  extended: false,
};

export function buildPusher(params: PusherParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'pusher';

  const stroke = params.strokeMm / 1000;
  const plateW = params.plateWidthMm / 1000;
  const plateH = params.plateHeightMm / 1000;
  const mountH = params.mountHeightMm / 1000;
  const sideSign = params.side === 'right' ? 1 : -1;
  const extended = params.extended;

  // Offset from belt center along Z (width axis)
  const baseZ = sideSign * 0.35; // mounted beside conveyor

  // ── Mounting frame (vertical bracket) ──
  const frameW = plateW + 0.06;
  const frameH = plateH + 0.12;
  const frameGeo = new THREE.BoxGeometry(frameW, frameH, 0.04);
  const frame = new THREE.Mesh(frameGeo, matFrame);
  frame.position.set(0, mountH + plateH / 2, baseZ);
  frame.castShadow = true;
  group.add(frame);

  // Frame feet (two legs to ground)
  for (const xOff of [-frameW / 2 + 0.03, frameW / 2 - 0.03]) {
    const legGeo = new THREE.BoxGeometry(0.04, mountH, 0.04);
    const leg = new THREE.Mesh(legGeo, matFrame);
    leg.position.set(xOff, mountH / 2, baseZ);
    leg.castShadow = true;
    group.add(leg);

    // Foot plate
    const footGeo = new THREE.BoxGeometry(0.07, 0.006, 0.07);
    const foot = new THREE.Mesh(footGeo, matFrame);
    foot.position.set(xOff, 0.003, baseZ);
    group.add(foot);
  }

  // ── Pneumatic cylinder ──
  const cylLen = stroke + 0.06;
  const cylR = 0.025;
  const cylGeo = new THREE.CylinderGeometry(cylR, cylR, cylLen, 12);
  cylGeo.rotateX(Math.PI / 2); // align along Z (push direction)
  const cyl = new THREE.Mesh(cylGeo, matCylinder);
  cyl.position.set(0, mountH + plateH / 2, baseZ - sideSign * cylLen / 2);
  cyl.castShadow = true;
  group.add(cyl);

  // Cylinder caps
  for (const zOff of [-cylLen / 2, cylLen / 2]) {
    const capGeo = new THREE.CylinderGeometry(cylR * 1.3, cylR * 1.3, 0.01, 12);
    capGeo.rotateX(Math.PI / 2);
    const cap = new THREE.Mesh(capGeo, matFrame);
    cap.position.set(0, mountH + plateH / 2, baseZ - sideSign * cylLen / 2 + zOff);
    group.add(cap);
  }

  // ── Guide rods (2 parallel linear guides) ──
  for (const xOff of [-0.06, 0.06]) {
    const guideLen = stroke + 0.04;
    const guideGeo = new THREE.CylinderGeometry(0.006, 0.006, guideLen, 8);
    guideGeo.rotateX(Math.PI / 2);
    const guide = new THREE.Mesh(guideGeo, matRod);
    guide.position.set(xOff, mountH + plateH / 2, baseZ - sideSign * guideLen / 2);
    group.add(guide);

    // Guide bushings
    const bushGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.02, 8);
    bushGeo.rotateX(Math.PI / 2);
    const bush = new THREE.Mesh(bushGeo, matGuide);
    bush.position.set(xOff, mountH + plateH / 2, baseZ - sideSign * 0.02);
    group.add(bush);
  }

  // ── Push plate (orange) ──
  const plateExtension = extended ? stroke : 0;
  const plateZ = baseZ - sideSign * (0.02 + plateExtension);

  const plateGeo = new THREE.BoxGeometry(plateW, plateH, 0.008);
  const plate = new THREE.Mesh(plateGeo, matPlate);
  plate.position.set(0, mountH + plateH / 2, plateZ);
  plate.castShadow = true;
  group.add(plate);

  // Plate rubber face (contact surface)
  const rubberGeo = new THREE.BoxGeometry(plateW - 0.01, plateH - 0.01, 0.004);
  const matRubber = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const rubber = new THREE.Mesh(rubberGeo, matRubber);
  rubber.position.set(0, mountH + plateH / 2, plateZ - sideSign * 0.006);
  group.add(rubber);

  // ── Trigger sensor (small green photoelectric sensor) ──
  const sensorGeo = new THREE.BoxGeometry(0.025, 0.02, 0.015);
  const sensor = new THREE.Mesh(sensorGeo, matSensor);
  sensor.position.set(-plateW / 2 - 0.04, mountH + 0.02, baseZ * 0.3);
  group.add(sensor);

  // Sensor indicator LED
  const ledGeo = new THREE.SphereGeometry(0.004, 8, 8);
  const matLed = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });
  const led = new THREE.Mesh(ledGeo, matLed);
  led.position.set(-plateW / 2 - 0.04, mountH + 0.035, baseZ * 0.3);
  group.add(led);

  return group;
}
