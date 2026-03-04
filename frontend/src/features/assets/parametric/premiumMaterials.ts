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
