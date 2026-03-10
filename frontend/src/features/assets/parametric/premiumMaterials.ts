/**
 * Premium Shared Materials — MetaMech Simulation Studio
 *
 * Centralized material library for consistent premium look across all
 * parametric assets. Uses PBR-accurate metalness/roughness values.
 */
import * as THREE from 'three';

// ─── Metal Finishes ────────────────────────────────────────────

/** Brushed stainless steel — frame rails, structural members */
export const matStainlessSteel = new THREE.MeshStandardMaterial({
  color: 0xc8c8c8,
  metalness: 0.85,
  roughness: 0.25,
  envMapIntensity: 1.2,
});

/** Anodized aluminum — extrusion profiles, support posts */
export const matAluminum = new THREE.MeshStandardMaterial({
  color: 0xd0d0d0,
  metalness: 0.75,
  roughness: 0.30,
  envMapIntensity: 1.0,
});

/** Dark steel — gearboxes, motor housings, heavy brackets */
export const matDarkSteel = new THREE.MeshStandardMaterial({
  color: 0x3a3a3a,
  metalness: 0.80,
  roughness: 0.20,
  envMapIntensity: 0.8,
});

/** Galvanized steel — cross braces, foot plates */
export const matGalvanized = new THREE.MeshStandardMaterial({
  color: 0xa8a8a8,
  metalness: 0.65,
  roughness: 0.35,
  envMapIntensity: 0.9,
});

/** Chrome-plated — rollers, shafts, precision parts */
export const matChrome = new THREE.MeshStandardMaterial({
  color: 0xe0e0e0,
  metalness: 0.95,
  roughness: 0.08,
  envMapIntensity: 1.5,
});

/** Cast iron — heavy machinery bases, motor mounts */
export const matCastIron = new THREE.MeshStandardMaterial({
  color: 0x4a4a4a,
  metalness: 0.70,
  roughness: 0.45,
});

// ─── Painted Finishes ──────────────────────────────────────────

/** Industrial blue — motors, drive units */
export const matIndustrialBlue = new THREE.MeshStandardMaterial({
  color: 0x2b5e94,
  metalness: 0.30,
  roughness: 0.50,
});

/** Safety yellow — guards, rails, warning markings */
export const matSafetyYellow = new THREE.MeshStandardMaterial({
  color: 0xe8b710,
  metalness: 0.20,
  roughness: 0.55,
});

/** Safety red — stop buttons, emergency, blades */
export const matSafetyRed = new THREE.MeshStandardMaterial({
  color: 0xc43030,
  metalness: 0.25,
  roughness: 0.50,
});

/** Pusher orange — diverter plates, highlighted actuators */
export const matPusherOrange = new THREE.MeshStandardMaterial({
  color: 0xd97020,
  metalness: 0.30,
  roughness: 0.50,
});

// ─── Rubber / Plastic ──────────────────────────────────────────

/** Conveyor belt — black rubber, slightly shiny */
export const matBelt = new THREE.MeshStandardMaterial({
  color: 0x1e1e1e,
  metalness: 0.05,
  roughness: 0.75,
});

/** Create belt material with custom color (or return default if no color/default) */
export function getBeltMaterial(color?: string): THREE.MeshStandardMaterial {
  if (!color || color === '#1e1e1e') return matBelt;
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.05,
    roughness: 0.75,
  });
}

/** Modular belt — blue/teal plastic chain */
export const matModularBelt = new THREE.MeshStandardMaterial({
  color: 0x3b8ba0,
  metalness: 0.15,
  roughness: 0.55,
});

/** Cleated belt — dark rubber with texture */
export const matCleatRubber = new THREE.MeshStandardMaterial({
  color: 0x181818,
  metalness: 0.05,
  roughness: 0.85,
});

/** Rubber bumper / contact surface */
export const matRubber = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  metalness: 0.02,
  roughness: 0.92,
});

/** Sidewall material — corrugated rubber */
export const matSidewall = new THREE.MeshStandardMaterial({
  color: 0x202020,
  metalness: 0.05,
  roughness: 0.88,
});

/** Foot pad — anti-vibration rubber */
export const matFootPad = new THREE.MeshStandardMaterial({
  color: 0x2a2a2a,
  metalness: 0.10,
  roughness: 0.80,
});

// ─── Side Guides / Guards ──────────────────────────────────────

/** Guide rail — polished aluminum or UHMW */
export const matGuideRail = new THREE.MeshStandardMaterial({
  color: 0xd8d8d8,
  metalness: 0.60,
  roughness: 0.35,
});

// ─── Sensor / Electronics ──────────────────────────────────────

/** Sensor body — dark ABS plastic */
export const matSensorBody = new THREE.MeshStandardMaterial({
  color: 0x2d2d2d,
  metalness: 0.20,
  roughness: 0.60,
});

/** Sensor lens — translucent red */
export const matSensorLens = new THREE.MeshStandardMaterial({
  color: 0x881111,
  metalness: 0.15,
  roughness: 0.20,
  transparent: true,
  opacity: 0.80,
});

/** LED on — green indicator */
export const matLedOn = new THREE.MeshStandardMaterial({
  color: 0x00ff44,
  emissive: 0x00ff44,
  emissiveIntensity: 0.9,
});

/** LED off — dim green */
export const matLedOff = new THREE.MeshStandardMaterial({
  color: 0x003300,
  emissive: 0x001100,
  emissiveIntensity: 0.15,
});

/** Detection beam — translucent red */
export const matBeam = new THREE.MeshStandardMaterial({
  color: 0xff2222,
  transparent: true,
  opacity: 0.12,
  emissive: 0xff0000,
  emissiveIntensity: 0.25,
});

/** Reflector tape — high-reflectance */
export const matReflector = new THREE.MeshStandardMaterial({
  color: 0xf0f0f0,
  metalness: 0.90,
  roughness: 0.05,
  envMapIntensity: 2.0,
});

// ─── SEW-Style Geared Motor Builder ────────────────────────────

/** SEW Eurodrive-style geared motor — reusable across all conveyor types.
 *  Builds at origin, motor body along X axis, output shaft pointing +X.
 *  Scale factor allows smaller/larger variants (default 1.0).
 */
export function buildSEWMotor(scale = 1.0): THREE.Group {
  const g = new THREE.Group();
  g.name = 'sew-geared-motor';
  const s = scale;

  // ── Motor body (cylindrical, SEW blue) ──
  const motorBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.14 * s, 16),
    matIndustrialBlue,
  );
  motorBody.rotation.set(0, 0, Math.PI / 2);
  motorBody.castShadow = true;
  g.add(motorBody);

  // Motor cooling fins (ribs along body — 6 raised rings)
  for (let i = 0; i < 6; i++) {
    const finX = -0.055 * s + i * 0.018 * s;
    const fin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.053 * s, 0.053 * s, 0.004 * s, 16),
      matIndustrialBlue,
    );
    fin.rotation.set(0, 0, Math.PI / 2);
    fin.position.set(finX, 0, 0);
    g.add(fin);
  }

  // ── Fan cover (rear end, black plastic) ──
  const fanCover = new THREE.Mesh(
    new THREE.CylinderGeometry(0.054 * s, 0.054 * s, 0.025 * s, 16),
    matFootPad, // dark plastic
  );
  fanCover.rotation.set(0, 0, Math.PI / 2);
  fanCover.position.set(-0.082 * s, 0, 0);
  fanCover.castShadow = true;
  g.add(fanCover);

  // Fan cover grille (3 horizontal slots)
  for (let i = -1; i <= 1; i++) {
    const slot = new THREE.Mesh(
      new THREE.BoxGeometry(0.002 * s, 0.025 * s, 0.06 * s),
      matDarkSteel,
    );
    slot.position.set(-0.095 * s, i * 0.018 * s, 0);
    g.add(slot);
  }

  // ── Terminal box (top of motor, junction box) ──
  const termBox = new THREE.Mesh(
    new THREE.BoxGeometry(0.05 * s, 0.025 * s, 0.04 * s),
    matIndustrialBlue,
  );
  termBox.position.set(-0.01 * s, 0.055 * s, 0);
  termBox.castShadow = true;
  g.add(termBox);

  // Terminal box lid line
  const lidLine = new THREE.Mesh(
    new THREE.BoxGeometry(0.048 * s, 0.001 * s, 0.038 * s),
    matDarkSteel,
  );
  lidLine.position.set(-0.01 * s, 0.068 * s, 0);
  g.add(lidLine);

  // Cable gland on terminal box
  const gland = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006 * s, 0.006 * s, 0.015 * s, 6),
    matDarkSteel,
  );
  gland.position.set(-0.01 * s, 0.068 * s, 0.022 * s);
  gland.rotation.set(Math.PI / 2, 0, 0);
  g.add(gland);

  // ── Gearbox (right-angle, cast aluminum look) ──
  const gearbox = new THREE.Mesh(
    new THREE.BoxGeometry(0.065 * s, 0.09 * s, 0.09 * s),
    matAluminum,
  );
  gearbox.position.set(0.1 * s, -0.005 * s, 0);
  gearbox.castShadow = true;
  g.add(gearbox);

  // Gearbox chamfered edge (visual detail — small angled strip)
  const chamfer = new THREE.Mesh(
    new THREE.BoxGeometry(0.063 * s, 0.01 * s, 0.088 * s),
    matGalvanized,
  );
  chamfer.position.set(0.1 * s, -0.055 * s, 0);
  g.add(chamfer);

  // Gearbox mounting flange (where it bolts to frame)
  const flange = new THREE.Mesh(
    new THREE.BoxGeometry(0.008 * s, 0.1 * s, 0.1 * s),
    matAluminum,
  );
  flange.position.set(0.065 * s, -0.005 * s, 0);
  g.add(flange);

  // Mounting bolt pattern on flange (4 bolts)
  for (const [dy, dz] of [[-0.035, -0.035], [-0.035, 0.035], [0.035, -0.035], [0.035, 0.035]]) {
    const bolt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.004 * s, 0.004 * s, 0.006 * s, 6),
      matDarkSteel,
    );
    bolt.rotation.set(0, 0, Math.PI / 2);
    bolt.position.set(0.06 * s, dy * s, dz * s);
    g.add(bolt);
  }

  // ── Output shaft (hollow shaft / keyed) ──
  const outputShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014 * s, 0.014 * s, 0.03 * s, 12),
    matChrome,
  );
  outputShaft.rotation.set(0, 0, Math.PI / 2);
  outputShaft.position.set(0.145 * s, -0.005 * s, 0);
  outputShaft.castShadow = true;
  g.add(outputShaft);

  // Shaft keyway (dark slot)
  const keyway = new THREE.Mesh(
    new THREE.BoxGeometry(0.028 * s, 0.005 * s, 0.005 * s),
    matDarkSteel,
  );
  keyway.position.set(0.145 * s, 0.007 * s, 0);
  g.add(keyway);

  // ── Nameplate (small rectangle on motor side) ──
  const nameplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.035 * s, 0.02 * s, 0.001 * s),
    matGalvanized,
  );
  nameplate.position.set(0, 0, 0.051 * s);
  g.add(nameplate);

  return g;
}

// ─── Cable / Wiring ────────────────────────────────────────────
export const matCable = new THREE.MeshStandardMaterial({
  color: 0x1a1a1a,
  metalness: 0.05,
  roughness: 0.90,
});

// ─── Environment ───────────────────────────────────────────────

/** Concrete floor */
export const matConcrete = new THREE.MeshStandardMaterial({
  color: 0xb0b0a8,
  metalness: 0.0,
  roughness: 0.90,
});

/** Warehouse wall — light gray */
export const matWall = new THREE.MeshStandardMaterial({
  color: 0xe0e0e0,
  metalness: 0.0,
  roughness: 0.85,
});

/** Glass — transparent for windows */
export const matGlass = new THREE.MeshStandardMaterial({
  color: 0x88bbdd,
  metalness: 0.1,
  roughness: 0.05,
  transparent: true,
  opacity: 0.3,
});
