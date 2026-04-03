import * as THREE from 'three';

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isFiniteVector3Like(value: { x: number; y: number; z: number } | null | undefined): boolean {
  if (!value) return false;
  return isFiniteNumber(value.x) && isFiniteNumber(value.y) && isFiniteNumber(value.z);
}

export function isFiniteVec3Tuple(value: [number, number, number] | null | undefined): boolean {
  if (!value) return false;
  return isFiniteNumber(value[0]) && isFiniteNumber(value[1]) && isFiniteNumber(value[2]);
}

export function sanitizeObject3DTransforms(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!isFiniteVector3Like(obj.position)) obj.position.set(0, 0, 0);
    if (!isFiniteVector3Like(obj.rotation)) obj.rotation.set(0, 0, 0);
    if (!isFiniteVector3Like(obj.scale) || obj.scale.x === 0 || obj.scale.y === 0 || obj.scale.z === 0) {
      obj.scale.set(1, 1, 1);
    }
  });
}

export function buildSafeGroup(
  label: string,
  builder: () => THREE.Group,
  fallbackFactory: () => THREE.Group
): THREE.Group {
  try {
    const group = builder();
    sanitizeObject3DTransforms(group);
    return group;
  } catch (error) {
    console.error(`[ModelSafety] ${label} build failed, using fallback`, error);
    const fallback = fallbackFactory();
    sanitizeObject3DTransforms(fallback);
    return fallback;
  }
}

