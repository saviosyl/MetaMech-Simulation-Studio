/**
 * Connectivity Interaction Module — MetaMech Simulation Studio
 *
 * Owns: true mate transform, move & snap mode, conveyor connections,
 *       accessory mounting logic (mid-run mounting).
 *
 * Active when ModeManager.isActive('connectivity').
 */

import { ModeManager } from '../ModeManager';

export interface MateCandidate {
  nodeId: string;
  portId: string;
  portType: 'input' | 'output';
  worldPosition: [number, number, number];
  direction: [number, number, number];
}

export interface MateResult {
  /** New position for the dragged node after mating */
  position: [number, number, number];
  /** New rotation for the dragged node after mating */
  rotation: [number, number, number];
  /** The edge to create */
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

export interface AccessoryMountPoint {
  parentConveyorId: string;
  /** Normalized distance along conveyor path [0..1] */
  s: number;
  side: 'left' | 'right' | 'center';
  heightOffset: number;
  flip: boolean;
}

/**
 * True mate: compute the position/rotation that aligns two ports.
 * The moving node's port should touch and oppose the target port's direction.
 */
export function computeMateTransform(
  movingPortLocal: [number, number, number],
  movingPortDir: [number, number, number],
  targetPortWorld: [number, number, number],
  targetPortDir: [number, number, number]
): { position: [number, number, number]; rotationY: number } {
  // Target direction should be opposed to moving direction after rotation
  // Compute Y rotation to align movingPortDir opposite to targetPortDir
  const targetAngle = Math.atan2(targetPortDir[0], targetPortDir[2]);
  const movingAngle = Math.atan2(movingPortDir[0], movingPortDir[2]);
  // We want moving direction after rotation to equal -targetDir
  // rotatedMovingDir = -targetDir
  const rotationY = targetAngle + Math.PI - movingAngle;
  
  // Now compute position: target port world pos = moving node pos + rotated local port pos
  const cosR = Math.cos(rotationY);
  const sinR = Math.sin(rotationY);
  const rotatedLocalX = movingPortLocal[0] * cosR + movingPortLocal[2] * sinR;
  const rotatedLocalZ = -movingPortLocal[0] * sinR + movingPortLocal[2] * cosR;
  
  const position: [number, number, number] = [
    targetPortWorld[0] - rotatedLocalX,
    targetPortWorld[1] - movingPortLocal[1],
    targetPortWorld[2] - rotatedLocalZ,
  ];
  
  return { position, rotationY };
}

/**
 * Find the closest mating candidate within a snap distance.
 */
export function findMateCandidate(
  dragPort: MateCandidate,
  candidates: MateCandidate[],
  maxDistance: number = 0.5
): MateCandidate | null {
  let best: MateCandidate | null = null;
  let bestDist = maxDistance;
  
  for (const c of candidates) {
    // Port types must be compatible (input↔output)
    if (c.portType === dragPort.portType) continue;
    
    const dx = c.worldPosition[0] - dragPort.worldPosition[0];
    const dy = c.worldPosition[1] - dragPort.worldPosition[1];
    const dz = c.worldPosition[2] - dragPort.worldPosition[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  
  return best;
}

/**
 * Compute world position for an accessory mounted on a conveyor body.
 * s: normalized position along conveyor length [0..1]
 * side: left/right/center
 */
export function computeConveyorBodyMount(
  conveyorPosition: [number, number, number],
  conveyorRotation: [number, number, number],
  conveyorLength: number, // in meters
  conveyorWidth: number,  // in meters
  conveyorHeight: number, // in meters
  mount: { s: number; side: 'left' | 'right' | 'center'; heightOffset: number }
): { position: [number, number, number]; rotation: [number, number, number] } {
  // Local position along conveyor
  const localX = (mount.s - 0.5) * conveyorLength; // -length/2 to +length/2
  const localY = conveyorHeight + mount.heightOffset;
  
  let localZ = 0;
  const sideOffset = conveyorWidth / 2 + 0.02; // slight offset outside belt
  switch (mount.side) {
    case 'left':  localZ = -sideOffset; break;
    case 'right': localZ = sideOffset; break;
    case 'center': localZ = 0; break;
  }
  
  // Apply conveyor rotation (Y-axis only for simplicity)
  const cosR = Math.cos(conveyorRotation[1]);
  const sinR = Math.sin(conveyorRotation[1]);
  
  const worldX = conveyorPosition[0] + localX * cosR + localZ * sinR;
  const worldZ = conveyorPosition[2] - localX * sinR + localZ * cosR;
  
  return {
    position: [worldX, localY, worldZ],
    rotation: [0, conveyorRotation[1], 0],
  };
}

/**
 * Lock connectivity mode during snap operations.
 */
export function onSnapDragStart(): void {
  ModeManager.activate('connectivity', 'snap-drag-start');
  ModeManager.lock();
}

export function onSnapDragEnd(): void {
  ModeManager.unlock();
}

/**
 * Check if connectivity module should handle this event.
 */
export function shouldHandle(): boolean {
  return ModeManager.isActive('connectivity');
}

export const ConnectivityModule = {
  computeMateTransform,
  findMateCandidate,
  computeConveyorBodyMount,
  onSnapDragStart,
  onSnapDragEnd,
  shouldHandle,
};

export default ConnectivityModule;
