/**
 * Accessory Snap System — MetaMech Simulation Studio
 *
 * When an accessory (sensor, stopper, pusher) is being moved,
 * this system finds the nearest conveyor and snaps the accessory
 * to a position along that conveyor's transport path.
 *
 * Supports:
 * - Continuous path-based attachment (any point along conveyor)
 * - Side-aware mounting (left/right/center)
 * - Auto-orientation to match conveyor tangent direction
 * - Persistent mount data for save/load
 */

import { createTransportPath, TransportPath } from './transportPath';
import { localToWorld } from './nodeTransform';

type Vec3 = [number, number, number];

const ACCESSORY_TYPES = ['sensor', 'stopper', 'pusher'];
const CONVEYOR_TYPES = ['conveyor', 'belt-conveyor', 'roller-conveyor', 'bend-conveyor', 'spiral-conveyor'];
const SNAP_RANGE = 2.0; // meters — max distance to snap

export type MountSide = 'left' | 'right' | 'center' | 'top';

/** What each accessory type supports */
const ACCESSORY_MOUNT_CONFIG: Record<string, { sides: MountSide[]; defaultSide: MountSide; lateralOffset: number }> = {
  sensor:  { sides: ['center'],                      defaultSide: 'center', lateralOffset: 0 },  // sensor straddles conveyor (heads on both sides)
  stopper: { sides: ['center'],                      defaultSide: 'center', lateralOffset: 0 },
  pusher:  { sides: ['left', 'right'],               defaultSide: 'right',  lateralOffset: 0.35 },
};

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
  /** Which side the accessory mounts on */
  mountSide: MountSide;
  /** Conveyor width in meters (for lateral offset calc) */
  conveyorWidthM: number;
  /** Path tangent at mount point (world space) */
  tangent: Vec3;
  /** Normal (side) direction at mount point (world space) */
  normal: Vec3;
}

export interface MountData {
  /** Parent conveyor node ID */
  parentConveyorId: string;
  /** Parametric distance along conveyor (0–1) */
  mountPosition: number;
  /** Mount side */
  mountSide: MountSide;
  /** Lateral offset from center in meters */
  lateralOffset: number;
}

export function isAccessoryType(type: string): boolean {
  return ACCESSORY_TYPES.includes(type);
}

export function isConveyorType(type: string): boolean {
  return CONVEYOR_TYPES.includes(type);
}

/**
 * Determine the best mount side based on where the accessory is relative to the conveyor path.
 */
function determineMountSide(
  accessoryPos: Vec3,
  pathPos: Vec3,
  tangent: Vec3,
  accessoryType: string,
): MountSide {
  const config = ACCESSORY_MOUNT_CONFIG[accessoryType];
  if (!config || config.sides.length === 1) return config?.defaultSide || 'center';

  // Normal = cross(tangent, up) => right side
  const normalX = -tangent[2]; // perpendicular in XZ plane
  const normalZ = tangent[0];

  // Vector from path center to accessory
  const dx = accessoryPos[0] - pathPos[0];
  const dz = accessoryPos[2] - pathPos[2];

  // Dot product with normal to determine side
  const dot = dx * normalX + dz * normalZ;

  return dot >= 0 ? 'right' : 'left';
}

/**
 * Compute the actual mount world position with lateral offset for the mount side.
 */
function computeMountPosition(
  pathPos: Vec3,
  tangent: Vec3,
  conveyorWidthM: number,
  mountSide: MountSide,
  lateralOffset: number,
  conveyorY: number,
): Vec3 {
  // Normal (perpendicular in XZ plane): right = cross(tangent, up)
  const normalX = -tangent[2];
  const normalZ = tangent[0];

  let offsetX = 0, offsetZ = 0;
  if (mountSide === 'left') {
    offsetX = -normalX * (conveyorWidthM / 2 + lateralOffset);
    offsetZ = -normalZ * (conveyorWidthM / 2 + lateralOffset);
  } else if (mountSide === 'right') {
    offsetX = normalX * (conveyorWidthM / 2 + lateralOffset);
    offsetZ = normalZ * (conveyorWidthM / 2 + lateralOffset);
  }
  // center and top: no lateral offset

  return [
    pathPos[0] + offsetX,
    conveyorY,
    pathPos[2] + offsetZ,
  ];
}

/**
 * Compute the rotation for the accessory based on mount side and tangent.
 */
function computeMountRotation(tangent: Vec3, mountSide: MountSide, accessoryType: string): number {
  // baseRotY: aligns model's local -Z with conveyor tangent direction
  const baseRotY = Math.atan2(tangent[0], tangent[2]);

  if (accessoryType === 'sensor') {
    // Sensor beam runs along Z axis in local space.
    // We want the beam to cross the conveyor (perpendicular to flow).
    // So rotate the sensor's X axis to align with conveyor tangent,
    // which puts Z axis perpendicular = across the belt.
    // atan2(tx, tz) aligns -Z with tangent; add π/2 to rotate 90° so Z crosses.
    return baseRotY + Math.PI / 2;
  }

  // Pushers face inward (perpendicular to conveyor)
  if (accessoryType === 'pusher') {
    return mountSide === 'left' ? baseRotY - Math.PI / 2 : baseRotY + Math.PI / 2;
  }

  // Stoppers face across conveyor (perpendicular)
  if (accessoryType === 'stopper') {
    return baseRotY + Math.PI / 2;
  }

  return baseRotY;
}

/**
 * Find the nearest conveyor snap point for an accessory at the given world position.
 * Searches all conveyors, samples their paths, and returns the closest point.
 */
export function findNearestConveyorSnap(
  accessoryWorldPos: Vec3,
  conveyorNodes: { id: string; type: string; position: Vec3; rotation: Vec3; scale?: Vec3; parameters: Record<string, any> }[],
  accessoryType?: string,
): AccessorySnapResult | null {
  let best: AccessorySnapResult | null = null;
  let bestDist = SNAP_RANGE;

  for (const conv of conveyorNodes) {
    if (!isConveyorType(conv.type)) continue;

    const path = createTransportPath(conv.type, conv.parameters);
    if (!path) continue;

    const convWidthM = (conv.parameters.width || conv.parameters.widthMm || 600) / 1000;

    // Sample the path at regular intervals to find closest point
    const samples = 50;
    let bestTForConv = -1;
    let bestDistForConv = SNAP_RANGE;

    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const worldPos = path.getWorldPosition(t, conv.position, conv.rotation, conv.scale as Vec3);

      const dx = worldPos[0] - accessoryWorldPos[0];
      const dz = worldPos[2] - accessoryWorldPos[2];
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < bestDistForConv) {
        bestDistForConv = dist;
        bestTForConv = t;
      }
    }

    // Refine with ternary search
    if (bestTForConv >= 0 && bestDistForConv < SNAP_RANGE) {
      let lo = Math.max(0, bestTForConv - 1 / samples);
      let hi = Math.min(1, bestTForConv + 1 / samples);
      for (let iter = 0; iter < 10; iter++) {
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
      const tangent = path.getWorldTangent(finalT, conv.rotation);
      const finalDist = Math.sqrt((finalPos[0] - accessoryWorldPos[0]) ** 2 + (finalPos[2] - accessoryWorldPos[2]) ** 2);

      if (finalDist < bestDist) {
        bestDist = finalDist;

        const normalX = -tangent[2];
        const normalZ = tangent[0];
        const mountSide = accessoryType
          ? determineMountSide(accessoryWorldPos, finalPos, tangent, accessoryType)
          : 'center';

        const mountConfig = ACCESSORY_MOUNT_CONFIG[accessoryType || 'sensor'];
        const lateralOff = mountConfig?.lateralOffset || 0;

        const mountPos = computeMountPosition(
          finalPos, tangent, convWidthM, mountSide, lateralOff, conv.position[1]
        );

        const rotY = computeMountRotation(tangent, mountSide, accessoryType || 'sensor');

        best = {
          conveyorNodeId: conv.id,
          pathT: finalT,
          snapPosition: mountPos,
          snapRotationY: rotY,
          distance: finalDist,
          mountSide,
          conveyorWidthM: convWidthM,
          tangent: [tangent[0], tangent[1], tangent[2]],
          normal: [normalX, 0, normalZ],
        };
      }
    }
  }

  return best;
}

/**
 * Apply the snap result to update the accessory node's position, rotation, and parameters.
 * Stores full mount data for save/load persistence.
 */
export function applyAccessorySnap(
  snap: AccessorySnapResult,
): { position: Vec3; rotation: [number, number, number]; parameters: MountData & Record<string, any> } {
  return {
    position: snap.snapPosition,
    rotation: [0, snap.snapRotationY, 0],
    parameters: {
      parentConveyorId: snap.conveyorNodeId,
      mountPosition: snap.pathT,
      mountSide: snap.mountSide,
      lateralOffset: snap.mountSide === 'center' ? 0 : (snap.conveyorWidthM / 2 + 0.05),
      beltWidthMm: snap.conveyorWidthM * 1000, // pass conveyor width to sensor for correct beam span
      _snappedToConveyor: snap.conveyorNodeId, // backwards compat
    },
  };
}

/**
 * Re-mount an accessory to its parent conveyor (e.g., when conveyor moves).
 * Uses stored mount data to recompute world position.
 */
export function remountAccessory(
  mountData: MountData,
  conveyorNode: { type: string; position: Vec3; rotation: Vec3; scale?: Vec3; parameters: Record<string, any> },
  accessoryType: string,
): { position: Vec3; rotation: [number, number, number] } | null {
  const path = createTransportPath(conveyorNode.type, conveyorNode.parameters);
  if (!path) return null;

  const convWidthM = (conveyorNode.parameters.width || conveyorNode.parameters.widthMm || 600) / 1000;
  const pathPos = path.getWorldPosition(mountData.mountPosition, conveyorNode.position, conveyorNode.rotation, conveyorNode.scale as Vec3);
  const tangent = path.getWorldTangent(mountData.mountPosition, conveyorNode.rotation);

  const mountConfig = ACCESSORY_MOUNT_CONFIG[accessoryType];
  const lateralOff = mountConfig?.lateralOffset || 0;

  const mountPos = computeMountPosition(
    pathPos, tangent, convWidthM, mountData.mountSide, lateralOff, conveyorNode.position[1]
  );

  const rotY = computeMountRotation(tangent, mountData.mountSide, accessoryType);

  return {
    position: mountPos,
    rotation: [0, rotY, 0],
  };
}
