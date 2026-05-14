import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

const GLB_URL = '/models/belt_conveyor_.glb';

// Cached conveyor model (camera stripped) + measured bounding box
let cachedModel: THREE.Group | null = null;
let cachedBBox: THREE.Box3 | null = null;
let loadingPromise: Promise<void> | null = null;

function loadModel(): Promise<void> {
  if (cachedModel) return Promise.resolve();
  if (loadingPromise) return loadingPromise;

  const loader = new GLTFLoader();
  loadingPromise = new Promise<void>((resolve, reject) => {
    loader.load(
      GLB_URL,
      (gltf) => {
        const scene = gltf.scene;

        // The GLB has 2 root nodes: node 0 = camera ("current"), node 1 = conveyor assembly.
        // We need ONLY the conveyor assembly, not the camera.
        let conveyorNode: THREE.Object3D | null = null;

        for (const child of scene.children) {
          // Skip cameras and lights — find the mesh group
          if (child instanceof THREE.Camera || child.type === 'PerspectiveCamera' || child.type === 'OrthographicCamera') {
            continue;
          }
          // The conveyor assembly is the child that has mesh children
          let hasMeshes = false;
          child.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) hasMeshes = true;
          });
          if (hasMeshes) {
            conveyorNode = child;
            break;
          }
        }

        if (!conveyorNode) {
          // Fallback: use entire scene
          console.warn('[BeltConveyorGLB] Could not isolate conveyor node, using full scene');
          conveyorNode = scene;
        }

        // Create a clean group with just the conveyor
        cachedModel = new THREE.Group();
        // Clone the conveyor node into our clean group
        const clone = conveyorNode.clone(true);
        // Reset any transform on the root conveyor node itself
        clone.position.set(0, 0, 0);
        clone.rotation.set(0, 0, 0);
        clone.scale.set(1, 1, 1);
        cachedModel.add(clone);

        // Enable shadows
        cachedModel.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            (child as THREE.Mesh).castShadow = true;
            (child as THREE.Mesh).receiveShadow = true;
          }
        });

        // Measure bounding box of clean conveyor only
        cachedBBox = new THREE.Box3().setFromObject(cachedModel);
        const size = new THREE.Vector3();
        cachedBBox.getSize(size);
        console.log('[BeltConveyorGLB] Loaded conveyor model.');
        console.log('  BBox min:', cachedBBox.min.toArray().map(v => v.toFixed(4)));
        console.log('  BBox max:', cachedBBox.max.toArray().map(v => v.toFixed(4)));
        console.log('  Size:', size.toArray().map(v => v.toFixed(4)));

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
 * Clone the cached conveyor model with fresh material instances.
 */
function cloneModel(): THREE.Group {
  if (!cachedModel) throw new Error('Model not loaded');
  const clone = cachedModel.clone(true);
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
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
 * 
 * Model native coordinate system (from GLB inspection):
 *   X: 0 → 0.57  (width,  ~570mm)
 *   Y: -2.1 → 0  (length, ~2100mm, extends in -Y direction)
 *   Z: 0 → 0.945 (height, ~945mm)
 * 
 * MetaMech world convention:
 *   X = length (conveyor runs along X)
 *   Y = height (up)
 *   Z = width  (side to side)
 * 
 * So we need to remap: model-X→world-Z, model-Y→world-X, model-Z→world-Y
 */
export function buildBeltConveyorFromGLB(params: Record<string, any>): BuilderResult | null {
  if (!cachedModel || !cachedBBox) {
    loadModel();
    return null;
  }

  // --- User parameters (mm → meters) ---
  const targetW = (params.width ?? 600) / 1000;
  const targetL = (params.length ?? 3000) / 1000;
  const targetH = (params.height ?? 800) / 1000;
  const inclineAngle = (params.inclineAngle ?? 0) * Math.PI / 180;
  const driveEnd = params.driveEnd ?? 'right';

  // --- Original model dimensions ---
  const origSize = new THREE.Vector3();
  cachedBBox.getSize(origSize);
  const origCenter = new THREE.Vector3();
  cachedBBox.getCenter(origCenter);

  // Native axes: X=width(0.57), Y=length(2.1), Z=height(0.945)
  const origW = origSize.x;  // ~0.57
  const origL = origSize.y;  // ~2.1
  const origH = origSize.z;  // ~0.945

  // --- Clone and prepare ---
  const model = cloneModel();
  const group = new THREE.Group();

  // Step 1: Scale to match target dimensions (in model's own axes)
  const scaleX = targetW / origW;  // width
  const scaleY = targetL / origL;  // length
  const scaleZ = targetH / origH;  // height
  model.scale.set(scaleX, scaleY, scaleZ);

  // Step 2: Center the model at origin (in its own axes)
  // After scaling, the center and min shift proportionally
  const scaledCenter = origCenter.clone().multiply(new THREE.Vector3(scaleX, scaleY, scaleZ));
  const scaledMin = cachedBBox.min.clone().multiply(new THREE.Vector3(scaleX, scaleY, scaleZ));

  model.position.set(
    -scaledCenter.x,  // center width
    -scaledCenter.y,  // center length
    -scaledMin.z      // bottom at Z=0
  );

  // Step 3: Rotate from model axes to MetaMech world axes
  // Model: X=width, Y=length(-), Z=height
  // World: X=length, Y=height, Z=width
  //
  // We need:
  //   model-Y (length) → world-X (length)  → rotate +90° around Z
  //   model-Z (height) → world-Y (height)  → rotate -90° around X
  //   model-X (width)  → world-Z (width)   → happens from the above
  //
  // Using a wrapper group for the rotation
  const orientGroup = new THREE.Group();
  orientGroup.add(model);

  // Apply rotation: first around X to tilt height up, then around Z to align length
  orientGroup.rotation.order = 'ZXY';
  orientGroup.rotation.set(
    -Math.PI / 2,  // X: tip model-Z(height) to become world-Y(up)
    0,
    -Math.PI / 2,  // Z: rotate model-Y(length) to become world-X
  );

  // Step 4: Drive end — mirror along length axis if needed
  if (driveEnd === 'left') {
    orientGroup.scale.x *= -1;
  }

  // Step 5: Incline angle
  if (inclineAngle > 0) {
    const sign = driveEnd === 'right' ? -1 : 1;
    orientGroup.rotation.z += sign * inclineAngle;
  }

  group.add(orientGroup);

  // --- Compute final bounds ---
  const bounds = new THREE.Box3().setFromObject(group);

  // --- Connection ports at belt-top height, each end ---
  const halfL = targetL / 2;
  const portY = targetH;

  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: [-halfL, portY, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, portY, 0] },
  ];

  return { group, ports, bounds, pathLength: targetL };
}

/** Preload the GLB model */
export function preloadBeltConveyorGLB(): void {
  loadModel();
}

/** Check if the GLB model is loaded and ready */
export function isBeltConveyorGLBReady(): boolean {
  return cachedModel !== null;
}
