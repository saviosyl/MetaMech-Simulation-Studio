/**
 * Sensor Module — Photoelectric / Proximity sensor system
 *
 * Industrial sensor that mounts on conveyor frame. Includes:
 * - Emitter unit (one side)
 * - Receiver unit (opposite side) — for through-beam type
 * - Retro-reflector variant — single unit + reflector
 * - Diffuse variant — single compact unit
 * - Status LED indicator
 * - Mounting bracket
 *
 * Used to detect product presence for stopper/pusher/zone logic.
 */
import * as THREE from 'three';

import {
  matSensorBody as matBody,
  matSensorLens as matLens,
  matGalvanized as matBracket,
  matCable,
  matReflector,
  matLedOn,
  matLedOff,
  matBeam,
} from '../premiumMaterials';

export type SensorType = 'through-beam' | 'retro-reflective' | 'diffuse';

export interface SensorParams {
  sensorType: SensorType;
  triggered: boolean;     // visual state — LED + beam color
  mountHeightMm: number;  // conveyor belt height
  sensorHeightMm: number; // height above belt surface
  beltWidthMm: number;    // used for beam span (through-beam/retro)
  showBeam: boolean;      // show the detection beam
}

export const SENSOR_DEFAULTS: SensorParams = {
  sensorType: 'through-beam',
  triggered: false,
  mountHeightMm: 800,
  sensorHeightMm: 80,
  beltWidthMm: 600,
  showBeam: true,
};

/** Build a single sensor head (emitter or receiver) */
function buildSensorHead(isEmitter: boolean): THREE.Group {
  const head = new THREE.Group();

  // Housing (rectangular industrial sensor body)
  const bodyW = 0.025;
  const bodyH = 0.04;
  const bodyD = 0.06;
  const bodyGeo = new THREE.BoxGeometry(bodyD, bodyH, bodyW);
  const body = new THREE.Mesh(bodyGeo, matBody);
  body.castShadow = true;
  head.add(body);

  // Lens (front face — circular red/IR window)
  const lensGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.004, 12);
  lensGeo.rotateX(Math.PI / 2);
  const lens = new THREE.Mesh(lensGeo, matLens);
  lens.position.set(0, 0, isEmitter ? -bodyW / 2 - 0.002 : bodyW / 2 + 0.002);
  head.add(lens);

  // Cable exit (back of sensor)
  const cableGeo = new THREE.CylinderGeometry(0.003, 0.003, 0.04, 6);
  const cable = new THREE.Mesh(cableGeo, matCable);
  cable.position.set(-bodyD / 2 - 0.02, 0, 0);
  cable.rotation.z = Math.PI / 2;
  head.add(cable);

  return head;
}

/** Build an L-shaped mounting bracket */
function buildMountingBracket(heightM: number, sensorY: number): THREE.Group {
  const bracket = new THREE.Group();

  // Vertical arm (from frame to sensor height)
  const armH = sensorY;
  const armGeo = new THREE.BoxGeometry(0.005, armH, 0.02);
  const arm = new THREE.Mesh(armGeo, matBracket);
  arm.position.set(0, heightM + armH / 2, 0);
  arm.castShadow = true;
  bracket.add(arm);

  // Horizontal tab (sensor mount point)
  const tabGeo = new THREE.BoxGeometry(0.005, 0.02, 0.025);
  const tab = new THREE.Mesh(tabGeo, matBracket);
  tab.position.set(0, heightM + armH, 0);
  bracket.add(tab);

  // Frame clamp (attaches to conveyor side rail)
  const clampGeo = new THREE.BoxGeometry(0.03, 0.02, 0.02);
  const clamp = new THREE.Mesh(clampGeo, matBracket);
  clamp.position.set(0, heightM - 0.01, 0);
  bracket.add(clamp);

  return bracket;
}

export function buildSensor(params: SensorParams): THREE.Group {
  const group = new THREE.Group();
  group.name = 'sensor';

  const mountH = params.mountHeightMm / 1000;
  const sensorAboveBelt = params.sensorHeightMm / 1000;
  const beltW = params.beltWidthMm / 1000;
  const sensorY = mountH + sensorAboveBelt;
  const ledMat = params.triggered ? matLedOn : matLedOff;

  switch (params.sensorType) {
    case 'through-beam': {
      // Emitter on one side, receiver on the other
      const emitter = buildSensorHead(true);
      emitter.position.set(0, sensorY, -(beltW / 2 + 0.03));
      group.add(emitter);

      const receiver = buildSensorHead(false);
      receiver.position.set(0, sensorY, beltW / 2 + 0.03);
      group.add(receiver);

      // Mounting brackets
      const bracketL = buildMountingBracket(mountH, sensorAboveBelt);
      bracketL.position.z = -(beltW / 2 + 0.02);
      group.add(bracketL);

      const bracketR = buildMountingBracket(mountH, sensorAboveBelt);
      bracketR.position.z = beltW / 2 + 0.02;
      group.add(bracketR);

      // Beam visualization
      if (params.showBeam) {
        const beamLen = beltW + 0.04;
        const beamGeo = new THREE.CylinderGeometry(0.003, 0.003, beamLen, 8);
        beamGeo.rotateX(Math.PI / 2);
        const beam = new THREE.Mesh(beamGeo, matBeam);
        beam.position.set(0, sensorY, 0);
        group.add(beam);
      }
      break;
    }

    case 'retro-reflective': {
      // Single sensor head + reflector on opposite side
      const sensor = buildSensorHead(true);
      sensor.position.set(0, sensorY, -(beltW / 2 + 0.03));
      group.add(sensor);

      // Reflector (small square prismatic reflector)
      const reflGeo = new THREE.BoxGeometry(0.03, 0.03, 0.008);
      const refl = new THREE.Mesh(reflGeo, matReflector);
      refl.position.set(0, sensorY, beltW / 2 + 0.03);
      group.add(refl);

      // Bracket for sensor side
      const bracket = buildMountingBracket(mountH, sensorAboveBelt);
      bracket.position.z = -(beltW / 2 + 0.02);
      group.add(bracket);

      // Simple bracket for reflector
      const reflBracket = buildMountingBracket(mountH, sensorAboveBelt);
      reflBracket.position.z = beltW / 2 + 0.02;
      group.add(reflBracket);

      if (params.showBeam) {
        const beamLen = beltW + 0.04;
        const beamGeo = new THREE.CylinderGeometry(0.003, 0.003, beamLen, 8);
        beamGeo.rotateX(Math.PI / 2);
        const beam = new THREE.Mesh(beamGeo, matBeam);
        beam.position.set(0, sensorY, 0);
        group.add(beam);
      }
      break;
    }

    case 'diffuse': {
      // Single compact unit — looks down at belt from above
      const sensor = buildSensorHead(true);
      sensor.position.set(0, sensorY + 0.02, 0);
      sensor.rotation.x = -Math.PI / 2; // pointing down
      group.add(sensor);

      // Overhead bracket (mounts to side, extends arm over belt)
      const bracket = buildMountingBracket(mountH, sensorAboveBelt + 0.04);
      bracket.position.z = -(beltW / 2 + 0.02);
      group.add(bracket);

      // Horizontal arm extending over belt
      const armGeo = new THREE.BoxGeometry(0.005, 0.005, beltW / 2 + 0.02);
      const arm = new THREE.Mesh(armGeo, matBracket);
      arm.position.set(0, sensorY + 0.04, -(beltW / 4));
      group.add(arm);

      if (params.showBeam) {
        const beamH = sensorAboveBelt + 0.02;
        const beamGeo = new THREE.CylinderGeometry(0.004, 0.006, beamH, 8);
        const beam = new THREE.Mesh(beamGeo, matBeam);
        beam.position.set(0, mountH + beamH / 2, 0);
        group.add(beam);
      }
      break;
    }
  }

  // Status LED (on top of sensor body, visible from above)
  const ledGeo = new THREE.SphereGeometry(0.005, 8, 8);
  const led = new THREE.Mesh(ledGeo, ledMat);
  led.position.set(0, sensorY + 0.025, params.sensorType === 'diffuse' ? 0 : -(beltW / 2 + 0.03));
  group.add(led);

  return group;
}
