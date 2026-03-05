/**
 * Robot Inverse Kinematics — Simplified 6-axis IK solver
 * 
 * Given a target TCP position (world space) and the robot base position,
 * compute joint angles J1–J6.
 * 
 * Convention (Three.js, Y-up):
 *   J1: Base yaw (rotation around Y axis)
 *   J2: Shoulder pitch (rotation around Z axis, forward/back)
 *   J3: Elbow pitch (rotation around Z axis, extend/retract)
 *   J4: Wrist roll (rotation around X axis)
 *   J5: Wrist pitch (rotation around Z axis)
 *   J6: Tool roll (rotation around X axis)
 */

export interface RobotDimensions {
  baseHeight: number;     // height from floor to J2 axis (meters)
  upperArmLen: number;    // J2 to J3 distance (meters)
  forearmLen: number;     // J3 to wrist center (meters)
  wristLen: number;       // wrist center to TCP (meters)
}

export interface JointAngles {
  j1: number;  // base yaw (rad)
  j2: number;  // shoulder pitch (rad)
  j3: number;  // elbow pitch (rad)
  j4: number;  // wrist roll (rad)
  j5: number;  // wrist pitch (rad)
  j6: number;  // tool roll (rad)
}

/**
 * Solve IK: given target TCP world position, compute joint angles.
 * 
 * @param target  - TCP target [x, y, z] in world space
 * @param base    - Robot base [x, y, z] in world space
 * @param dims    - Robot link dimensions
 * @param toolDown - Whether tool should point straight down (default true for pick/place)
 */
export function solveIK(
  target: [number, number, number],
  base: [number, number, number],
  dims: RobotDimensions,
  toolDown: boolean = true,
): JointAngles {
  // Relative target from robot base
  const dx = target[0] - base[0];
  const dy = target[1] - base[1];
  const dz = target[2] - base[2];

  // ─── J1: Base yaw ───
  // Rotate base to face the target horizontally
  const j1 = Math.atan2(dx, dz);

  // ─── Position solving for J2, J3 ───
  // Work in the arm plane (r = horizontal distance, h = height above shoulder)
  const r = Math.sqrt(dx * dx + dz * dz);  // horizontal distance from base
  
  // Wrist center position (offset back from TCP by wrist length, pointing down)
  const wristR = r;
  const wristH = dy - dims.baseHeight + (toolDown ? dims.wristLen : 0);
  
  const L1 = dims.upperArmLen;
  const L2 = dims.forearmLen;
  
  // Distance from shoulder to wrist center
  const D = Math.sqrt(wristR * wristR + wristH * wristH);
  
  // Clamp to reachable range
  const maxReach = L1 + L2 - 0.01;
  const minReach = Math.abs(L1 - L2) + 0.01;
  const Dc = Math.min(maxReach, Math.max(minReach, D));
  
  // ─── J3: Elbow angle (law of cosines) ───
  let cosJ3 = (L1 * L1 + L2 * L2 - Dc * Dc) / (2 * L1 * L2);
  cosJ3 = Math.min(1, Math.max(-1, cosJ3));
  const j3raw = Math.PI - Math.acos(cosJ3); // elbow angle (0 = straight, PI = fully bent)
  
  // ─── J2: Shoulder angle ───
  const alpha = Math.atan2(wristH, Math.max(0.01, wristR)); // angle to wrist center
  let cosGamma = (L1 * L1 + Dc * Dc - L2 * L2) / (2 * L1 * Math.max(0.01, Dc));
  cosGamma = Math.min(1, Math.max(-1, cosGamma));
  const gamma = Math.acos(cosGamma);
  const j2raw = alpha + gamma; // shoulder lifts to reach target
  
  // Convert to joint rotation conventions
  // J2: 0 = arm horizontal forward, positive = arm up
  const j2 = j2raw;
  // J3: negative = elbow bends down (typical)
  const j3 = -j3raw;
  
  // ─── Wrist joints (simplified for pick/place) ───
  // For pick/place with tool pointing down:
  const j4 = 0; // no wrist roll needed
  // J5 compensates shoulder + elbow so tool stays vertical
  const j5 = toolDown ? -(j2 + j3) - Math.PI / 2 : 0;
  const j6 = 0; // no tool rotation
  
  return { j1, j2, j3, j4, j5, j6 };
}

/**
 * Get default robot dimensions from reach parameter.
 */
export function getDimensions(reachMm: number, baseHeightMm: number): RobotDimensions {
  const reach = reachMm / 1000;
  const baseH = baseHeightMm / 1000;
  return {
    baseHeight: baseH,
    upperArmLen: reach * 0.42,   // typical: ~42% of reach
    forearmLen: reach * 0.38,    // typical: ~38% of reach
    wristLen: reach * 0.12,     // typical: ~12% of reach
  };
}

/**
 * S-curve easing for industrial robot motion profiles.
 * Provides smooth acceleration and deceleration.
 */
export function sCurveEase(t: number): number {
  // 5th order polynomial for smooth jerk profile
  return t * t * t * (t * (6 * t - 15) + 10);
}

/**
 * Trapezoidal velocity profile (accel → cruise → decel).
 */
export function trapezoidalEase(t: number, accelFrac: number = 0.25): number {
  if (t < accelFrac) {
    // Acceleration phase
    const s = t / accelFrac;
    return 0.5 * s * s * accelFrac / (1 - accelFrac);
  } else if (t > 1 - accelFrac) {
    // Deceleration phase
    const s = (1 - t) / accelFrac;
    return 1 - 0.5 * s * s * accelFrac / (1 - accelFrac);
  } else {
    // Cruise phase
    const accelDist = 0.5 * accelFrac;
    return accelDist + (t - accelFrac) / (1 - 2 * accelFrac) * (1 - 2 * accelDist);
  }
}
