/**
 * Node Transform Utilities — MetaMech Simulation Studio
 *
 * Converts local port/node positions to world positions by applying
 * the parent object's position, rotation (Euler XYZ), and scale.
 *
 * This is the single source of truth for local→world conversion.
 * All systems (SnapSystem, ConnectionLines, SimulationEngine, etc.)
 * must use these functions instead of naive position addition.
 */

type Vec3 = [number, number, number];

/**
 * Apply Euler rotation (XYZ order) to a local position vector.
 * Three.js default Euler order is XYZ.
 */
function rotateEulerXYZ(local: Vec3, rotation: Vec3): Vec3 {
  const [rx, ry, rz] = rotation;

  let [x, y, z] = local;

  // Rotate around X axis
  if (rx !== 0) {
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;
  }

  // Rotate around Y axis
  if (ry !== 0) {
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    x = x1;
    z = z1;
  }

  // Rotate around Z axis
  if (rz !== 0) {
    const cosZ = Math.cos(rz);
    const sinZ = Math.sin(rz);
    const x1 = x * cosZ - y * sinZ;
    const y1 = x * sinZ + y * cosZ;
    x = x1;
    y = y1;
  }

  return [x, y, z];
}

/**
 * Transform a local position to world position.
 * Applies: scale → rotation → translation (standard TRS order).
 */
export function localToWorld(
  localPos: Vec3,
  parentPosition: Vec3,
  parentRotation: Vec3,
  parentScale?: Vec3,
): Vec3 {
  // 1. Apply scale
  let pos: Vec3 = parentScale
    ? [localPos[0] * parentScale[0], localPos[1] * parentScale[1], localPos[2] * parentScale[2]]
    : [...localPos];

  // 2. Apply rotation
  const hasRotation = parentRotation[0] !== 0 || parentRotation[1] !== 0 || parentRotation[2] !== 0;
  if (hasRotation) {
    pos = rotateEulerXYZ(pos, parentRotation);
  }

  // 3. Apply translation
  return [
    parentPosition[0] + pos[0],
    parentPosition[1] + pos[1],
    parentPosition[2] + pos[2],
  ];
}

/**
 * Transform a local direction vector to world direction (rotation only, no translation).
 */
export function localDirToWorld(
  localDir: Vec3,
  parentRotation: Vec3,
): Vec3 {
  const hasRotation = parentRotation[0] !== 0 || parentRotation[1] !== 0 || parentRotation[2] !== 0;
  if (!hasRotation) return [...localDir];
  return rotateEulerXYZ(localDir, parentRotation);
}

/**
 * Convenience: get the world position of a connection port on a node.
 */
export function getPortWorldPosition(
  portLocalPos: Vec3,
  node: { position: Vec3; rotation: Vec3; scale?: Vec3 },
): Vec3 {
  return localToWorld(portLocalPos, node.position, node.rotation, node.scale);
}

/**
 * Get all ports for a node in world coordinates.
 * Single function to get complete port data including world positions.
 */
export function getWorldPorts(
  node: { type: string; position: Vec3; rotation: Vec3; scale?: Vec3; parameters?: Record<string, any>; assetId?: string },
  getConnectionPortsFn: (type: string, params?: Record<string, any>, assetId?: string) => { id: string; type: 'input' | 'output'; localPosition: Vec3 }[],
): { id: string; type: 'input' | 'output'; localPosition: Vec3; worldPosition: Vec3 }[] {
  const localPorts = getConnectionPortsFn(node.type, node.parameters, node.assetId);
  return localPorts.map(port => ({
    ...port,
    worldPosition: localToWorld(port.localPosition, node.position, node.rotation, node.scale as Vec3),
  }));
}

/**
 * Calculate the position to place a node so that its port aligns with a target world position.
 * Inverse of localToWorld for the port offset.
 */
export function alignNodeToPort(
  portLocalPos: Vec3,
  targetWorldPos: Vec3,
  nodeRotation: Vec3,
  nodeScale?: Vec3,
): Vec3 {
  // Get the rotated+scaled offset of the port
  let offset: Vec3 = nodeScale
    ? [portLocalPos[0] * nodeScale[0], portLocalPos[1] * nodeScale[1], portLocalPos[2] * nodeScale[2]]
    : [...portLocalPos];

  const hasRotation = nodeRotation[0] !== 0 || nodeRotation[1] !== 0 || nodeRotation[2] !== 0;
  if (hasRotation) {
    offset = rotateEulerXYZ(offset, nodeRotation);
  }

  return [
    targetWorldPos[0] - offset[0],
    targetWorldPos[1] - offset[1],
    targetWorldPos[2] - offset[2],
  ];
}
