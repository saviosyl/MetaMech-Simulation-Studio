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

function normalizeVec3(input: Vec3): Vec3 {
  const len = Math.sqrt(input[0] * input[0] + input[1] * input[1] + input[2] * input[2]);
  if (!Number.isFinite(len) || len <= 0.000001) return [0, 0, 1];
  return [input[0] / len, input[1] / len, input[2] / len];
}

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
  parentScale?: Vec3,
): Vec3 {
  // Scale may include mirrored axes; include it so direction keeps parity with
  // the actual transformed asset when scale contains negative components.
  let dir: Vec3 = parentScale
    ? [localDir[0] * parentScale[0], localDir[1] * parentScale[1], localDir[2] * parentScale[2]]
    : [...localDir];

  const hasRotation = parentRotation[0] !== 0 || parentRotation[1] !== 0 || parentRotation[2] !== 0;
  if (hasRotation) {
    dir = rotateEulerXYZ(dir, parentRotation);
  }
  return normalizeVec3(dir);
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
 * Convenience: get the world direction of a connection port on a node.
 */
export function getPortWorldDirection(
  portLocalDir: Vec3,
  node: { rotation: Vec3; scale?: Vec3 },
): Vec3 {
  return localDirToWorld(portLocalDir, node.rotation, node.scale);
}

/**
 * Get all ports for a node in world coordinates.
 * Single function to get complete port data including world positions.
 */
export function getWorldPorts(
  node: { type: string; position: Vec3; rotation: Vec3; scale?: Vec3; parameters?: Record<string, any>; assetId?: string },
  getConnectionPortsFn: (type: string, params?: Record<string, any>, assetId?: string) => { id: string; type: 'input' | 'output'; localPosition: Vec3; direction?: Vec3 }[],
): {
  id: string;
  type: 'input' | 'output';
  localPosition: Vec3;
  worldPosition: Vec3;
  localDirection?: Vec3;
  worldDirection?: Vec3;
}[] {
  const localPorts = getConnectionPortsFn(node.type, node.parameters, node.assetId);
  return localPorts.map(port => ({
    id: port.id,
    type: port.type,
    localPosition: port.localPosition,
    worldPosition: localToWorld(port.localPosition, node.position, node.rotation, node.scale as Vec3),
    ...(port.direction
      ? {
          localDirection: port.direction,
          worldDirection: localDirToWorld(port.direction, node.rotation, node.scale as Vec3),
        }
      : {}),
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

/**
 * Full mate solver: compute position AND rotation for object B so that:
 *  - B's port position coincides with A's port position
 *  - B's port direction opposes A's port direction (face-to-face)
 *
 * Returns { position, rotation } for node B.
 */
export function solveMateTransform(
  /** The fixed port (object A) — already in world space */
  targetPortWorldPos: Vec3,
  targetPortWorldDir: Vec3,
  /** The moving object B's port info in local space */
  movingPortLocalPos: Vec3,
  movingPortLocalDir: Vec3,
  /** Current transform of moving object */
  movingScale?: Vec3,
): { position: Vec3; rotation: Vec3 } {
  // Step 1: Compute rotation.
  // We need movingPortLocalDir (rotated) to equal -targetPortWorldDir.
  // Work in XZ plane (Y rotation) since conveyors are floor-mounted.
  // Target direction for the moving port (opposing the target):
  const desiredDir: Vec3 = [-targetPortWorldDir[0], -targetPortWorldDir[1], -targetPortWorldDir[2]];

  // Compute Y rotation needed to align movingPortLocalDir to desiredDir
  const scaledMovingDir = localDirToWorld(movingPortLocalDir, [0, 0, 0], movingScale);
  const srcAngle = Math.atan2(scaledMovingDir[0], scaledMovingDir[2]);
  const dstAngle = Math.atan2(desiredDir[0], desiredDir[2]);
  const rotY = dstAngle - srcAngle;

  const newRotation: Vec3 = [0, rotY, 0];

  // Step 2: Compute position.
  // Apply the new rotation to the port's local position to get its world offset.
  let offset: Vec3 = movingScale
    ? [movingPortLocalPos[0] * movingScale[0], movingPortLocalPos[1] * movingScale[1], movingPortLocalPos[2] * movingScale[2]]
    : [...movingPortLocalPos];

  offset = rotateEulerXYZ(offset, newRotation);

  const newPosition: Vec3 = [
    targetPortWorldPos[0] - offset[0],
    targetPortWorldPos[1] - offset[1],
    targetPortWorldPos[2] - offset[2],
  ];

  return { position: newPosition, rotation: newRotation };
}
