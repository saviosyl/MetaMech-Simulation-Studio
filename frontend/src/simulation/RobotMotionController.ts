/**
 * Robot Motion Controller — MetaMech Simulation Studio
 * 
 * State machine for pick-and-place with IK-driven joint solving.
 * Uses approach→pick→retract→move→approach→place→retract→return cycle.
 */
import { solveIK, getDimensions, sCurveEase, JointAngles, RobotDimensions } from './RobotIK';

export type RobotPhase =
  | 'idle'
  | 'approach-pick'
  | 'pick'
  | 'retract-pick'
  | 'move-to-place'
  | 'approach-place'
  | 'place'
  | 'retract-place'
  | 'return';

export interface RobotState {
  phase: RobotPhase;
  phaseProgress: number;
  phaseStartTime: number;
  cycleCount: number;
  heldProductId: string | null;
  pickPosition: [number, number, number];
  placePosition: [number, number, number];
  toolCenterPoint: [number, number, number];
  // IK-solved joint angles (radians)
  j1: number; j2: number; j3: number;
  j4: number; j5: number; j6: number;
  gripperOpen: boolean;
  dims: RobotDimensions;
}

export interface RobotConfig {
  cycleTime: number;
  speedFactor: number;
  approachHeight: number;
  pickHeight: number;
  placeHeight: number;
  homePosition: [number, number, number];
}

// Phase durations as fractions of total cycle
const PHASE_FRAC: Record<RobotPhase, number> = {
  'idle': 0,
  'approach-pick': 0.14,
  'pick': 0.06,
  'retract-pick': 0.10,
  'move-to-place': 0.24,
  'approach-place': 0.12,
  'place': 0.06,
  'retract-place': 0.10,
  'return': 0.18,
};

const PHASE_ORDER: RobotPhase[] = [
  'idle', 'approach-pick', 'pick', 'retract-pick',
  'move-to-place', 'approach-place', 'place', 'retract-place', 'return',
];

export function createRobotState(config: RobotConfig, reachMm?: number, baseHeightMm?: number): RobotState {
  const dims = getDimensions(reachMm || 2000, baseHeightMm || 500);
  return {
    phase: 'idle',
    phaseProgress: 0,
    phaseStartTime: 0,
    cycleCount: 0,
    heldProductId: null,
    pickPosition: [...config.homePosition],
    placePosition: [...config.homePosition],
    toolCenterPoint: [...config.homePosition],
    j1: 0, j2: 0.4, j3: -0.8, j4: 0, j5: 0, j6: 0,
    gripperOpen: true,
    dims,
  };
}

function lerp3(a: [number,number,number], b: [number,number,number], t: number): [number,number,number] {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t];
}

/**
 * Tick the robot state machine.
 * Returns product ID when placed (handoff signal).
 */
export function tickRobot(
  state: RobotState,
  config: RobotConfig,
  simTime: number,
  availableProductId: string | null,
): string | null {
  const totalCycle = config.cycleTime / config.speedFactor;
  let placedId: string | null = null;
  const base = config.homePosition;

  // ─── IDLE ───
  if (state.phase === 'idle') {
    state.toolCenterPoint = [...base];
    state.gripperOpen = true;
    // Solve IK for home position
    const ik = solveIK(base, base, state.dims);
    applyIK(state, ik);

    if (availableProductId) {
      state.phase = 'approach-pick';
      state.phaseStartTime = simTime;
      state.phaseProgress = 0;
      state.heldProductId = null;
      (state as any)._targetProductId = availableProductId;
    }
    return null;
  }

  // ─── Phase timing with S-curve easing ───
  const dur = PHASE_FRAC[state.phase] * totalCycle;
  const elapsed = simTime - state.phaseStartTime;
  const rawT = dur > 0 ? Math.min(1, elapsed / dur) : 1;
  state.phaseProgress = rawT;
  const t = sCurveEase(rawT); // smooth industrial motion profile

  // ─── Compute waypoints ───
  const pick = state.pickPosition;
  const place = state.placePosition;
  const aH = config.approachHeight;
  const pickApproach: [number,number,number] = [pick[0], pick[1] + aH, pick[2]];
  const placeApproach: [number,number,number] = [place[0], place[1] + aH, place[2]];

  // ─── TCP interpolation per phase ───
  let tcp: [number,number,number];
  switch (state.phase) {
    case 'approach-pick':
      tcp = lerp3(base, pickApproach, t);
      state.gripperOpen = true;
      break;
    case 'pick':
      tcp = lerp3(pickApproach, pick, t);
      state.gripperOpen = t < 0.65; // gripper closes at 65%
      break;
    case 'retract-pick':
      tcp = lerp3(pick, pickApproach, t);
      state.gripperOpen = false;
      break;
    case 'move-to-place':
      tcp = lerp3(pickApproach, placeApproach, t);
      state.gripperOpen = false;
      break;
    case 'approach-place':
      tcp = lerp3(placeApproach, place, t);
      state.gripperOpen = false;
      break;
    case 'place':
      tcp = [...place];
      state.gripperOpen = t > 0.5; // gripper opens at 50%
      break;
    case 'retract-place':
      tcp = lerp3(place, placeApproach, t);
      state.gripperOpen = true;
      break;
    case 'return':
      tcp = lerp3(placeApproach, base, t);
      state.gripperOpen = true;
      break;
    default:
      tcp = [...base];
  }

  state.toolCenterPoint = tcp;

  // ─── Solve IK for current TCP ───
  const ik = solveIK(tcp, base, state.dims);
  applyIK(state, ik);

  // ─── Phase transitions ───
  if (rawT >= 1) {
    if (state.phase === 'pick') {
      state.heldProductId = (state as any)._targetProductId || availableProductId;
      (state as any)._targetProductId = null;
    } else if (state.phase === 'place') {
      placedId = state.heldProductId;
      state.heldProductId = null;
    } else if (state.phase === 'return') {
      state.cycleCount++;
      state.phase = 'idle';
      state.phaseProgress = 0;
      return placedId;
    }

    const idx = PHASE_ORDER.indexOf(state.phase);
    if (idx >= 0 && idx + 1 < PHASE_ORDER.length) {
      state.phase = PHASE_ORDER[idx + 1];
      state.phaseStartTime = simTime;
      state.phaseProgress = 0;
    }
  }

  return placedId;
}

function applyIK(state: RobotState, ik: JointAngles) {
  state.j1 = ik.j1;
  state.j2 = ik.j2;
  state.j3 = ik.j3;
  state.j4 = ik.j4;
  state.j5 = ik.j5;
  state.j6 = ik.j6;
}

/** Compat export */
export function getRobotPoseHint(state: RobotState, config: RobotConfig) {
  return {
    j1Angle: state.j1,
    j2Angle: state.j2,
    j3Angle: state.j3,
    gripOpen: state.gripperOpen,
  };
}
