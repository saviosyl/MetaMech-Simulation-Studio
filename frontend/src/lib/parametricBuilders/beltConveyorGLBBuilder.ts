import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

const GLB_URL = '/models/belt_conveyor_.glb';

// Cached original scene + measured bounding box
let cachedScene: THREE.Group | null = null;
let cachedBBox: THREE.Box3 | null = null;
let loadingPromise: Promise<void> | null = null;

function loadModel(): Promise<void> {
  if (cachedScene) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const loader = new GLTFLoader();
  loadingPromise = new Promise<void>((resolve, reject) => {
    loader.load(
      GLB_URL,
      (gltf) => {
        cachedScene = gltf.scene as THREE.Group;
        // Enable shadows on all meshes
        cachedScene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).castShadow = true;
            (child as THREE.Mesh).receiveShadow = true;
          }
        });
        // Measure original bounding box
        cachedBBox = new THREE.Box3().setFromObject(cachedScene);
        console.log('[BeltConveyorGLB] Loaded. Original bbox:', cachedBBox.min.toArray(), cachedBBox.max.toArray());
        resolve();
      },
      undefined,
      (err) => {
        console.error('[BeltConveyorGLB] Failed to load:', err);
        loadingPromise = null;
        reject(err);
      }
    );
  });

  return loadingPromise;
}

/**
 * Clone the cached GLB scene with fresh material instances
 * so each conveyor instance can be independently colored/highlighted.
 */
function cloneScene(): THREE.Group {
  if (!cachedScene) throw new Error('Model not loaded');
  const clone = cachedScene.clone(true);
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      // Clone materials so instances don't share state
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return clone;
}

/**
 * Build a belt conveyor using the uploaded GLB model.
 * Parametrically scales width, length, height to match user parameters.
 * Returns null if the model hasn't loaded yet (caller falls back to procedural).
 */
export function buildBeltConveyorFromGLB(params: Record<string, any>): BuilderResult | null {
  if (!cachedScene || !cachedBBox) {
    // Kick off loading for next render cycle
    loadModel();
    return null;
  }

  // --- User parameters (mm → meters) ---
  const targetW = (params.width ?? 600) / 1000;    // width in meters
  const targetL = (params.length ?? 3000) / 1000;   // length in meters
  const targetH = (params.height ?? 800) / 1000;    // height in meters
  const inclineAngle = (params.inclineAngle ?? 0) * Math.PI / 180;
  const driveEnd = params.driveEnd ?? 'right';
  // sideGuides param is preserved in the GLB model as-is (the real model has guides built in)

  // --- Original model dimensions from cached bbox ---
  const origMin = cachedBBox.min;
  const origSize = new THREE.Vector3();
  cachedBBox.getSize(origSize);
  const origCenter = new THREE.Vector3();
  cachedBBox.getCenter(origCenter);

  // The model axes (from inspection):
  //   X → width  (~0.44m native)
  //   Y → length (~2.1m native, negative direction)
  //   Z → height (~0.94m native)
  const origW = origSize.x;
  const origL = origSize.y; // absolute length along Y
  const origH = origSize.z;

  // --- Build the output group ---
  const group = new THREE.Group();

  // Clone the GLB scene
  const model = cloneScene();

  // Compute scale factors
  const scaleX = targetW / origW;
  const scaleY = targetL / origL;
  const scaleZ = targetH / origH;

  // Apply non-uniform scale
  model.scale.set(scaleX, scaleY, scaleZ);

  // After scaling, recalculate the bbox to center the model
  // We need to shift so the conveyor is centered at origin (X=0, Z=0)
  // and sits on the ground plane (bottom Z = 0)
  const scaledCenter = origCenter.clone().multiply(new THREE.Vector3(scaleX, scaleY, scaleZ));
  const scaledMin = origMin.clone().multiply(new THREE.Vector3(scaleX, scaleY, scaleZ));

  // Center on X (width axis), center on Y (length axis), ground on Z (height axis)
  model.position.set(
    -scaledCenter.x,       // center width
    -scaledCenter.y,       // center length
    -scaledMin.z           // place bottom at Z=0
  );

  // Now we need to rotate the model so that:
  //   - Length runs along X (Three.js convention for conveyors in MetaMech)
  //   - Width runs along Z
  //   - Height runs along Y
  // The GLB model has: X=width, Y=length, Z=height
  // We need: X=length, Y=height, Z=width
  // Rotation: rotate -90° around Z (swap X↔Y), then -90° around X (swap Y↔Z)
  // Actually let's use a wrapper group for cleaner transforms
  const orientGroup = new THREE.Group();
  orientGroup.add(model);

  // Rotate so: model-Y (length) → world-X, model-Z (height) → world-Y, model-X (width) → world-Z
  // This is a -90° rotation around world-Z, then -90° around world-X
  // Simpler: use rotation order and set euler
  orientGroup.rotation.set(
    -Math.PI / 2,  // X rotation: tip model-Z (height) up to world-Y
    0,             // Y rotation
    Math.PI / 2,   // Z rotation: swing model-Y (length) to world-X
  );

  // Handle drive end (mirror if needed)
  if (driveEnd === 'left') {
    orientGroup.scale.x *= -1;
  }

  // Handle incline angle
  if (inclineAngle > 0) {
    orientGroup.rotation.z += driveEnd === 'right' ? -inclineAngle : inclineAngle;
  }

  group.add(orientGroup);

  // --- Compute final bounds ---
  const bounds = new THREE.Box3().setFromObject(group);

  // --- Connection ports ---
  const halfL = targetL / 2;
  // Estimate belt top height (roughly at targetH level)
  const portY = targetH;

  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, portY, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, portY, 0] },
  ];

  return { group, ports, bounds, pathLength: targetL };
}

/** Preload the GLB model — call early so it's ready when the user drops a belt conveyor */
export function preloadBeltConveyorGLB(): void {
  loadModel();
}

/** Check if the GLB model is loaded and ready */
export function isBeltConveyorGLBReady(): boolean {
  return cachedScene !== null;
}
