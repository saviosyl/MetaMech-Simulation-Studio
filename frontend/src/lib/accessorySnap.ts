/**
 * Accessory Snap System — MetaMech Simulation Studio
 *
 * When an accessory (sensor, stopper, pusher) is being moved,
 * this system finds the nearest conveyor and snaps the accessory
 * to a position along that conveyor's transport path.
 *
 * Usage: call findNearestConveyorSnap() with the accessory's current
 * world position and all conveyor nodes. Returns the snap position
 * and the conveyor path t value.
 */

import { createTransportPath } from './transportPath';

type Vec3 = [number, number, number];

const ACCESSORY_TYPES = ['sensor', 'stopper', 'pusher'];
const CONVEYOR_TYPES = ['conveyor', 'belt-conveyor', 'roller-conveyor', 'bend-conveyor', 'spiral-conveyor'];
const SNAP_RANGE = 1.5; // meters — max distance to snap

export interface AccessorySnapResult {
  /** The conveyor node ID to snap to */
  conveyorNodeId: string;
  /** Position along the conveyor path (0=infeed, 1=outfeed) */
  pathT: number;
  /** World position to place the accessory */
  snapPosition: Vec3;
  /** World Y-rotation to align with path tangent */
  snapRotationY: number;
  /** Distance from original position to snap point */
  distance: number;
}

export function isAccessoryType(type: string): boolean {
  return ACCESSORY_TYPES.includes(type);
}

export function isConveyorType(type: string): boolean {
  return CONVEYOR_TYPES.includes(type);
}

/**
 * Find the nearest conveyor snap point for an accessory at the given world position.
 * Searches all conveyors, samples their paths, and returns the closest point.
 */
export function findNearestConveyorSnap(
  accessoryWorldPos: Vec3,
  conveyorNodes: { id: string; type: string; position: Vec3; rotation: Vec3; scale?: Vec3; parameters: Record<string, any> }[],
): AccessorySnapResult | null {
  let best: AccessorySnapResult | null = null;
  let bestDist = SNAP_RANGE;

  for (const conv of conveyorNodes) {
    if (!isConveyorType(conv.type)) continue;

    const path = createTransportPath(conv.type, conv.parameters);
    if (!path) continue;

    // Sample the path at regular intervals to find closest point
    const samples = 40;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const worldPos = path.getWorldPosition(t, conv.position, conv.rotation, conv.scale as Vec3);

      const dx = worldPos[0] - accessoryWorldPos[0];
      const dz = worldPos[2] - accessoryWorldPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz); // XZ distance only (ignore Y)

      if (dist < bestDist) {
        bestDist = dist;

        // Get tangent for rotation alignment
        const tangent = path.getWorldTangent(t, conv.rotation);
        const rotY = Math.atan2(tangent[0], tangent[2]);

        best = {
          conveyorNodeId: conv.id,
          pathT: t,
          snapPosition: [worldPos[0], conv.position[1], worldPos[2]],
          snapRotationY: rotY,
          distance: dist,
        };
      }
    }

    // Refine with binary search around the best t for this conveyor
    if (best && best.conveyorNodeId === conv.id) {
      let lo = Math.max(0, best.pathT - 1 / samples);
      let hi = Math.min(1, best.pathT + 1 / samples);
      for (let iter = 0; iter < 8; iter++) {
        const mid1 = lo + (hi - lo) / 3;
        const mid2 = hi - (hi - lo) / 3;
        const p1 = path.getWorldPosition(mid1, conv.position, conv.rotation, conv.scale as Vec3);
        const p2 = path.getWorldPosition(mid2, conv.position, conv.rotation, conv.scale as Vec3);
        const d1 = Math.sqrt((p1[0] - accessoryWorldPos[0]) ** 2 + (p1[2] - accessoryWorldPos[2]) ** 2);
        const d2 = Math.sqrt((p2[0] - accessoryWorldPos[0]) ** 2 + (p2[2] - accessoryWorldPos[2]) ** 2);
        if (d1 < d2) hi = mid2; else lo = mid1;
      }
      const finalT = (lo + hi) / 2;
      const finalPos = path.getWorldPosition(finalT, conv.position, conv.rotation, conv.scale as Vec3);
      const finalTangent = path.getWorldTangent(finalT, conv.rotation);
      const finalDist = Math.sqrt((finalPos[0] - accessoryWorldPos[0]) ** 2 + (finalPos[2] - accessoryWorldPos[2]) ** 2);

      if (finalDist < best.distance) {
        best.pathT = finalT;
        best.snapPosition = [finalPos[0], conv.position[1], finalPos[2]];
        best.snapRotationY = Math.atan2(finalTangent[0], finalTangent[2]);
        best.distance = finalDist;
      }
    }
  }

  return best;
}

/**
 * Apply the snap result to update the accessory node's position and rotation.
 * Also updates the mountPosition parameter for persistent storage.
 */
export function applyAccessorySnap(
  snap: AccessorySnapResult,
): { position: Vec3; rotation: [number, number, number]; parameters: Record<string, any> } {
  return {
    position: snap.snapPosition,
    rotation: [0, snap.snapRotationY, 0],
    parameters: {
      mountPosition: snap.pathT,
      _snappedToConveyor: snap.conveyorNodeId,
    },
  };
}
