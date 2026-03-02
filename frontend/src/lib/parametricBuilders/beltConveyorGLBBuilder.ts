import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

const PARTS_BASE = '/models/parts/belt/';

const partNames = [
  'head-section', 'tail-section', 'mid-section',
  'support-leg', 'belt-surface', 'side-guide', 'motor-unit',
] as const;

type PartCache = Record<string, THREE.Group>;

let partsCache: PartCache | null = null;
let loadingPromise: Promise<PartCache> | null = null;

function loadAllParts(): Promise<PartCache> {
  if (partsCache) return Promise.resolve(partsCache);
  if (loadingPromise) return loadingPromise;

  const loader = new GLTFLoader();
  loadingPromise = Promise.all(
    partNames.map(
      (name) =>
        new Promise<[string, THREE.Group]>((resolve, reject) => {
          loader.load(
            `${PARTS_BASE}${name}.glb`,
            (gltf) => resolve([name, gltf.scene as THREE.Group]),
            undefined,
            reject
          );
        })
    )
  ).then((entries) => {
    partsCache = Object.fromEntries(entries);
    return partsCache;
  });

  return loadingPromise;
}

function clonePart(parts: PartCache, name: string): THREE.Group {
  const src = parts[name];
  if (!src) throw new Error(`Part not found: ${name}`);
  const clone = src.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return clone;
}

/**
 * Build a belt conveyor using pre-generated GLB parts.
 * Returns null if parts aren't loaded yet (caller should fall back to procedural).
 */
export function buildBeltConveyorGLB(params: Record<string, any>): BuilderResult | null {
  if (!partsCache) {
    // Trigger loading for next time
    loadAllParts();
    return null;
  }

  const w = (params.width ?? 600) / 1000;
  const l = (params.length ?? 3000) / 1000;
  const h = (params.height ?? 800) / 1000;
  const sideGuides = params.sideGuides ?? true;
  const driveEnd = params.driveEnd ?? 'right';
  const supportSpacing = (params.supportSpacing ?? 1500) / 1000;

  const group = new THREE.Group();
  const halfL = l / 2;

  // Scale factor for width (parts are built at 1m width)
  const wScale = w;

  // --- Head section ---
  const head = clonePart(partsCache, 'head-section');
  head.scale.set(1, 1, wScale);
  const headX = driveEnd === 'right' ? halfL : -halfL;
  head.position.set(headX, h, 0);
  if (driveEnd === 'left') head.rotation.y = Math.PI;
  group.add(head);

  // --- Tail section ---
  const tail = clonePart(partsCache, 'tail-section');
  tail.scale.set(1, 1, wScale);
  const tailX = driveEnd === 'right' ? -halfL : halfL;
  tail.position.set(tailX, h, 0);
  if (driveEnd === 'left') tail.rotation.y = Math.PI;
  group.add(tail);

  // --- Mid sections ---
  const midLen = 0.5;
  const usableLen = l - 0.3; // head/tail take ~0.15 each
  const numMids = Math.max(1, Math.round(usableLen / midLen));
  const actualMidLen = usableLen / numMids;

  for (let i = 0; i < numMids; i++) {
    const mid = clonePart(partsCache, 'mid-section');
    mid.scale.set(actualMidLen / midLen, 1, wScale);
    const x = -halfL + 0.15 + actualMidLen * (i + 0.5);
    mid.position.set(x, h, 0);
    group.add(mid);
  }

  // --- Belt surface ---
  const belt = clonePart(partsCache, 'belt-surface');
  belt.scale.set(l - 0.04, 1, wScale);
  belt.position.set(0, h + 0.06, 0);
  group.add(belt);

  // --- Support legs ---
  const numLegs = Math.max(2, Math.ceil(l / supportSpacing) + 1);
  const legSpacing = l / (numLegs - 1);
  const legScale = (h - 0.08) / 0.7; // parts built at 0.7m height

  for (let i = 0; i < numLegs; i++) {
    const leg = clonePart(partsCache, 'support-leg');
    leg.scale.set(1, legScale, wScale);
    leg.position.set(-halfL + i * legSpacing, h - 0.08, 0);
    group.add(leg);
  }

  // --- Side guides ---
  if (sideGuides) {
    for (const side of [-1, 1]) {
      const guide = clonePart(partsCache, 'side-guide');
      guide.scale.set(l - 0.08, 1, 1);
      guide.position.set(0, h + 0.06, side * (w / 2 - 0.005));
      group.add(guide);
    }
  }

  const bounds = new THREE.Box3().setFromObject(group);
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, h, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, h, 0] },
  ];

  return { group, ports, bounds, pathLength: l };
}

/** Preload parts - call early so they're ready when needed */
export function preloadBeltConveyorParts(): void {
  loadAllParts();
}

/** Check if parts are loaded */
export function areBeltPartsLoaded(): boolean {
  return partsCache !== null;
}
