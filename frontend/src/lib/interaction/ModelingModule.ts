/**
 * Modeling Interaction Module — MetaMech Simulation Studio
 *
 * Owns: move/rotate gizmos, alignment tools, tidy/pack tools,
 *       placement rules (grid/snap options).
 *
 * Active when ModeManager.isActive('modeling').
 */

import { ModeManager } from '../ModeManager';

export interface GridSnapConfig {
  enabled: boolean;
  size: number; // meters
}

export interface AlignAction {
  type: 'align-x' | 'align-z' | 'distribute-x' | 'distribute-z' | 'tidy-grid' | 'pack-tight';
  objectIds: string[];
}

/**
 * Snap a position to grid if grid snap is active.
 */
export function applyGridSnap(
  position: [number, number, number],
  gridSnap: GridSnapConfig
): [number, number, number] {
  if (!gridSnap.enabled) return position;
  const s = gridSnap.size;
  return [
    Math.round(position[0] / s) * s,
    position[1], // Y stays as-is (ground plane)
    Math.round(position[2] / s) * s,
  ];
}

/**
 * Lock gizmo drag — tells ModeManager that modeling owns input exclusively.
 */
export function onGizmoDragStart(): void {
  ModeManager.activate('modeling', 'gizmo-drag-start');
  ModeManager.lock();
}

/**
 * Release gizmo drag — unlocks mode switching.
 */
export function onGizmoDragEnd(): void {
  ModeManager.unlock();
}

/**
 * Align selected objects along an axis.
 */
export function alignObjects(
  objects: { id: string; position: [number, number, number] }[],
  axis: 'x' | 'z',
  reference: 'first' | 'center' | 'last' = 'first'
): Map<string, [number, number, number]> {
  const results = new Map<string, [number, number, number]>();
  if (objects.length < 2) return results;
  
  const idx = axis === 'x' ? 0 : 2;
  let refValue: number;
  
  switch (reference) {
    case 'first':
      refValue = objects[0].position[idx];
      break;
    case 'last':
      refValue = objects[objects.length - 1].position[idx];
      break;
    case 'center': {
      const sum = objects.reduce((s, o) => s + o.position[idx], 0);
      refValue = sum / objects.length;
      break;
    }
  }
  
  for (const obj of objects) {
    const newPos: [number, number, number] = [...obj.position];
    newPos[idx] = refValue;
    results.set(obj.id, newPos);
  }
  
  return results;
}

/**
 * Distribute objects evenly along an axis.
 */
export function distributeObjects(
  objects: { id: string; position: [number, number, number] }[],
  axis: 'x' | 'z'
): Map<string, [number, number, number]> {
  const results = new Map<string, [number, number, number]>();
  if (objects.length < 3) return results;
  
  const idx = axis === 'x' ? 0 : 2;
  const sorted = [...objects].sort((a, b) => a.position[idx] - b.position[idx]);
  
  const first = sorted[0].position[idx];
  const last = sorted[sorted.length - 1].position[idx];
  const step = (last - first) / (sorted.length - 1);
  
  for (let i = 0; i < sorted.length; i++) {
    const newPos: [number, number, number] = [...sorted[i].position];
    newPos[idx] = first + step * i;
    results.set(sorted[i].id, newPos);
  }
  
  return results;
}

/**
 * Check if modeling module should handle this event.
 */
export function shouldHandle(): boolean {
  return ModeManager.isActive('modeling');
}

export const ModelingModule = {
  applyGridSnap,
  onGizmoDragStart,
  onGizmoDragEnd,
  alignObjects,
  distributeObjects,
  shouldHandle,
};

export default ModelingModule;
