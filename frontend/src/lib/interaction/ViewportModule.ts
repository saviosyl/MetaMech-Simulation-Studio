/**
 * Viewport Interaction Module — MetaMech Simulation Studio
 *
 * Owns: camera orbit/pan/zoom, raycasting, hover, selection,
 *       correct drop placement, overlay toggles, panel resize.
 *
 * Active when ModeManager.isActive('viewport').
 */

import * as THREE from 'three';
import { ModeManager } from '../ModeManager';

// Module-level camera ref for drop raycast (accessible outside Canvas)
let _threeCamera: THREE.Camera | null = null;
let _canvasSize: { width: number; height: number } = { width: 1, height: 1 };
let _canvasRect: DOMRect | null = null;

export function setCamera(camera: THREE.Camera, size: { width: number; height: number }) {
  _threeCamera = camera;
  _canvasSize = size;
}

export function setCanvasRect(rect: DOMRect) {
  _canvasRect = rect;
}

export function getCamera(): THREE.Camera | null {
  return _threeCamera;
}

/**
 * Raycast from screen coordinates to ground plane (y=0).
 * Used for accurate drop placement.
 */
export function raycastToGround(clientX: number, clientY: number, canvasRect?: DOMRect): [number, number, number] | null {
  if (!_threeCamera) return null;
  const rect = canvasRect || _canvasRect;
  if (!rect) return null;
  
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), _threeCamera);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const intersection = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(groundPlane, intersection);
  if (!hit) return null;
  return [intersection.x, 0, intersection.z];
}

/**
 * Raycast from screen coords to any scene objects.
 * Returns the first hit and its object hierarchy.
 */
export function raycastScene(
  clientX: number, 
  clientY: number, 
  sceneObjects: THREE.Object3D[],
  canvasRect?: DOMRect
): { point: THREE.Vector3; object: THREE.Object3D } | null {
  if (!_threeCamera) return null;
  const rect = canvasRect || _canvasRect;
  if (!rect) return null;
  
  const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
  const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), _threeCamera);
  
  const hits = raycaster.intersectObjects(sceneObjects, true);
  if (hits.length === 0) return null;
  return { point: hits[0].point, object: hits[0].object };
}

/**
 * Should OrbitControls be enabled right now?
 * Only when viewport mode is active OR no other mode has a lock.
 */
export function shouldEnableOrbit(): boolean {
  return ModeManager.isActive('viewport') || !ModeManager.isLocked();
}

export const ViewportModule = {
  setCamera,
  setCanvasRect,
  getCamera,
  raycastToGround,
  raycastScene,
  shouldEnableOrbit,
};

export default ViewportModule;
