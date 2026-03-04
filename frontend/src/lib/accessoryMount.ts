/**
 * Accessory Mounting System — MetaMech Simulation Studio
 *
 * Allows sensors, stoppers, pushers, and other accessories to mount
 * anywhere along a conveyor's transport path.
 *
 * Mount specification:
 * - positionAlongPath: 0.0 (infeed) to 1.0 (outfeed)
 * - lateralOffset: meters from center (+ = right, - = left)
 * - verticalOffset: meters above belt surface
 * - side: 'left' | 'right' | 'center' | 'both'
 *
 * The mount produces world-space position and orientation that follows
 * the conveyor's path tangent (so accessories rotate/incline with the path).
 */

import { createTransportPath, TransportPath } from './transportPath';
import { localToWorld } from './nodeTransform';

type Vec3 = [number, number, number];

export interface MountSpec {
  /** 0.0 = infeed, 1.0 = outfeed, 0.5 = middle */
  positionAlongPath: number;
  /** Lateral offset from center in meters (+ = right side, - = left side) */
  lateralOffsetM: number;
  /** Vertical offset above belt surface in meters */
  verticalOffsetM: number;
  /** Which side the accessory is on */
  side: 'left' | 'right' | 'center' | 'both';
}

export interface MountResult {
  /** World position for the accessory */
  worldPosition: Vec3;
  /** World rotation (Euler XYZ) so accessory aligns with path tangent */
  worldRotation: Vec3;
  /** The path tangent direction at mount point (world space) */
  tangentWorld: Vec3;
  /** The path up direction at mount point (world space) */
  upWorld: Vec3;
}

export const DEFAULT_MOUNT: MountSpec = {
  positionAlongPath: 0.5,
  lateralOffsetM: 0,
  verticalOffsetM: 0,
  side: 'center',
};

/**
 * Compute the world-space mount position and orientation for an accessory
 * attached to a conveyor at a given path position.
 */
export function computeMount(
  conveyorType: string,
  conveyorParams: Record<string, any>,
  conveyorPosition: Vec3,
  conveyorRotation: Vec3,
  conveyorScale: Vec3 | undefined,
  mount: MountSpec,
): MountResult | null {
  const path = createTransportPath(conveyorType, conveyorParams);
  if (!path) return null;

  return computeMountOnPath(path, conveyorPosition, conveyorRotation, conveyorScale, mount);
}

/**
 * Lower-level: compute mount from an existing TransportPath.
 */
export function computeMountOnPath(
  path: TransportPath,
  nodePosition: Vec3,
  nodeRotation: Vec3,
  nodeScale: Vec3 | undefined,
  mount: MountSpec,
): MountResult {
  const t = Math.max(0, Math.min(1, mount.positionAlongPath));

  // Get local-space path data at mount point
  const localPos = path.getLocalPosition(t);
  const localTangent = path.getLocalTangent(t);
  const localUp = path.getLocalUp(t);

  // Compute local cross vector (right direction = tangent × up)
  const cross: Vec3 = [
    localTangent[1] * localUp[2] - localTangent[2] * localUp[1],
    localTangent[2] * localUp[0] - localTangent[0] * localUp[2],
    localTangent[0] * localUp[1] - localTangent[1] * localUp[0],
  ];

  // Apply lateral offset along cross direction
  const lateralDir = mount.lateralOffsetM;
  const mountLocal: Vec3 = [
    localPos[0] + cross[0] * lateralDir,
    localPos[1] + mount.verticalOffsetM + localUp[1] * 0,
    localPos[2] + cross[2] * lateralDir,
  ];

  // Transform to world space
  const worldPosition = localToWorld(mountLocal, nodePosition, nodeRotation, nodeScale);

  // Transform tangent and up to world space (rotation only)
  const tangentWorld = localToWorld(localTangent, [0, 0, 0], nodeRotation);
  const upWorld = localToWorld(localUp, [0, 0, 0], nodeRotation);

  // Compute world rotation from tangent direction
  // Y-rotation = angle of tangent projected onto XZ plane
  const yaw = Math.atan2(tangentWorld[0], tangentWorld[2]);
  // X-rotation = pitch (incline angle)
  const pitch = Math.asin(Math.max(-1, Math.min(1, tangentWorld[1])));

  const worldRotation: Vec3 = [pitch, yaw, 0];

  return {
    worldPosition,
    worldRotation,
    tangentWorld,
    upWorld,
  };
}

/**
 * Convert editor parameters to a MountSpec.
 * Used when accessories have mount position properties in the properties panel.
 */
export function editorParamsToMount(params: Record<string, any>): MountSpec {
  return {
    positionAlongPath: params.mountPosition ?? params.positionAlongPath ?? 0.5,
    lateralOffsetM: (params.lateralOffset ?? params.lateralOffsetMm ?? 0) / (params.lateralOffset !== undefined ? 1 : 1000),
    verticalOffsetM: (params.verticalOffset ?? params.verticalOffsetMm ?? 0) / (params.verticalOffset !== undefined ? 1 : 1000),
    side: params.mountSide ?? params.side ?? 'center',
  };
}

/**
 * Get mount parameters suitable for the Properties panel.
 * Returns parameter definitions for the module library.
 */
export function getMountParameterDefs() {
  return {
    mountPosition: { type: 'number' as const, label: 'Position Along Path', default: 0.5, min: 0, max: 1, step: 0.05 },
    mountSide: { type: 'select' as const, label: 'Mount Side', default: 'center', options: ['left', 'right', 'center'] },
    lateralOffset: { type: 'number' as const, label: 'Lateral Offset (m)', default: 0, min: -1, max: 1, step: 0.05 },
    verticalOffset: { type: 'number' as const, label: 'Vertical Offset (m)', default: 0, min: -0.5, max: 0.5, step: 0.01 },
  };
}
