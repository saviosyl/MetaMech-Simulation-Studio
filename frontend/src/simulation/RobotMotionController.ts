/**
 * Robot Motion Controller — MetaMech Simulation Studio
 * 
 * Robust pick-and-place state machine.
 * Drives TCP position and joint hints for 3D animation.
 */

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
  phaseProgress: number;      // 0→1 within current phase
  phaseStartTime: number;
  cycleCount: number;
  heldProductId: string | null;
  pickPosition: [number, number, number];
  placePosition: [number, number, number];
  toolCenterPoint: [number, number, number];
  // Joint angles for 3D model (radians)
  j1: number; // base rotation
  j2: number; // shoulder
  j3: number; // elbow
  j4: number; // wrist pitch
  j5: number; // wrist yaw
  j6: number; // wrist roll
  gripperOpen: boolean;
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
  'approach-pick': 0.15,
  'pick': 0.06,
  'retract-pick': 0.10,
  'move-to-place': 0.22,
  'approach-place': 0.12,
  'place': 0.06,
  'retract-place': 0.10,
  'return': 0.19,
};

const PHASE_ORDER: RobotPhase[] = [
  'idle', 'approach-pick', 'pick', 'retract-pick',
  'move-to-place', 'approach-place', 'place', 'retract-place', 'return',
];

export function createRobotState(config: RobotConfig): RobotState {
  return {
    phase: 'idle',
    phaseProgress: 0,
    phaseStartTime: 0,
    cycleCount: 0,
    heldProductId: null,
    pickPosition: [...config.homePosition],
    placePosition: [...config.homePosition],
    toolCenterPoint: [...config.homePosition],
    j1: 0, j2: 0.2, j3: -0.3, j4: 0, j5: 0, j6: 0,
    gripperOpen: true,
  };
}

/** Smooth ease in-out */
function ease(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp3(a: [number,number,number], b: [number,number,number], t: number): [number,number,number] {
  const s = ease(t);
  return [a[0]+(b[0]-a[0])*s, a[1]+(b[1]-a[1])*s, a[2]+(b[2]-a[2])*s];
}

/**
 * Tick the robot. Returns product ID when placed (handoff to next node).
 */
export function tickRobot(
  state: RobotState,
  config: RobotConfig,
  simTime: number,
  availableProductId: string | null,
): string | null {
  const totalCycle = config.cycleTime / config.speedFactor;
  let placedId: string | null = null;

  // ─── IDLE: wait for product ───
  if (state.phase === 'idle') {
    state.toolCenterPoint = [...config.homePosition];
    state.gripperOpen = true;
    updateJoints(state, config, 'home');

    if (availableProductId) {
      // Start cycle
      state.phase = 'approach-pick';
      state.phaseStartTime = simTime;
      state.phaseProgress = 0;
      state.heldProductId = null;
      (state as any)._targetProductId = availableProductId;
      console.log(`[ROBOT-CYCLE] Starting pick cycle for ${availableProductId.slice(0,8)}`);
    }
    return null;
  }

  // ─── Phase timing ───
  const dur = PHASE_FRAC[state.phase] * totalCycle;
  const elapsed = simTime - state.phaseStartTime;
  state.phaseProgress = dur > 0 ? Math.min(1, elapsed / dur) : 1;

  // ─── Compute TCP + joints for current phase ───
  const pick = state.pickPosition;
  const place = state.placePosition;
  const home = config.homePosition;
  const aH = config.approachHeight;
  const t = state.phaseProgress;

  const pickAbove: [number,number,number] = [pick[0], pick[1] + aH, pick[2]];
  const placeAbove: [number,number,number] = [place[0], place[1] + aH, place[2]];

  switch (state.phase) {
    case 'approach-pick':
      state.toolCenterPoint = lerp3(home, pickAbove, t);
      state.gripperOpen = true;
      updateJoints(state, config, 'approach-pick');
      break;
    case 'pick':
      state.toolCenterPoint = lerp3(pickAbove, pick, t);
      state.gripperOpen = t < 0.7; // close gripper at 70%
      updateJoints(state, config, 'pick');
      break;
    case 'retract-pick':
      state.toolCenterPoint = lerp3(pick, pickAbove, t);
      state.gripperOpen = false;
      updateJoints(state, config, 'retract-pick');
      break;
    case 'move-to-place':
      state.toolCenterPoint = lerp3(pickAbove, placeAbove, t);
      state.gripperOpen = false;
      updateJoints(state, config, 'move-to-place');
      break;
    case 'approach-place':
      state.toolCenterPoint = lerp3(placeAbove, place, t);
      state.gripperOpen = false;
      updateJoints(state, config, 'approach-place');
      break;
    case 'place':
      state.toolCenterPoint = [...place];
      state.gripperOpen = t > 0.5; // open at 50%
      updateJoints(state, config, 'place');
      break;
    case 'retract-place':
      state.toolCenterPoint = lerp3(place, placeAbove, t);
      state.gripperOpen = true;
      updateJoints(state, config, 'retract-place');
      break;
    case 'return':
      state.toolCenterPoint = lerp3(placeAbove, home, t);
      state.gripperOpen = true;
      updateJoints(state, config, 'return');
      break;
  }

  // ─── Phase transition ───
  if (state.phaseProgress >= 1) {
    // Actions at phase completion
    if (state.phase === 'pick') {
      state.heldProductId = (state as any)._targetProductId || availableProductId;
      (state as any)._targetProductId = null;
      console.log(`[ROBOT-GRIP] Gripped product ${state.heldProductId?.slice(0,8)}`);
    } else if (state.phase === 'place') {
      placedId = state.heldProductId;
      state.heldProductId = null;
      console.log(`[ROBOT-RELEASE] Released product ${placedId?.slice(0,8)}`);
    } else if (state.phase === 'return') {
      state.cycleCount++;
      state.phase = 'idle';
      state.phaseProgress = 0;
      console.log(`[ROBOT-CYCLE] Cycle ${state.cycleCount} complete`);
      return placedId;
    }

    // Advance to next phase
    const idx = PHASE_ORDER.indexOf(state.phase);
    if (idx >= 0 && idx + 1 < PHASE_ORDER.length) {
      state.phase = PHASE_ORDER[idx + 1];
      state.phaseStartTime = simTime;
      state.phaseProgress = 0;
    }
  }

  return placedId;
}

/**
 * Compute approximate joint angles from TCP position (simplified IK).
 * This gives the 3D model believable joint motion.
 */
function updateJoints(state: RobotState, config: RobotConfig, hint: string) {
  const tcp = state.toolCenterPoint;
  const base = config.homePosition;
  
  // Relative position from robot base
  const dx = tcp[0] - base[0];
  const dy = tcp[1] - base[1];
  const dz = tcp[2] - base[2];
  
  // J1: base rotation — atan2 toward target
  state.j1 = Math.atan2(dx, dz);
  
  // Horizontal distance from base
  const hDist = Math.sqrt(dx * dx + dz * dz);
  
  // J2: shoulder — lifts arm based on height + reach
  state.j2 = Math.atan2(Math.max(0, dy + 0.3), Math.max(0.1, hDist)) * 0.8 + 0.15;
  
  // J3: elbow — bends more when reaching far or low
  const reach = Math.sqrt(hDist * hDist + dy * dy);
  state.j3 = -(0.3 + reach * 0.4);
  
  // J4: wrist pitch — keeps tool pointing down
  state.j4 = -(state.j2 + state.j3) * 0.3;
  
  // J5: slight wrist adjustment during pick/place
  state.j5 = hint.includes('pick') ? -0.1 : hint.includes('place') ? 0.1 : 0;
  
  // J6: gripper rotation
  state.j6 = state.gripperOpen ? 0 : 0.2;
}

/**
 * Get robot joint state for 3D model rendering.
 */
export function getRobotPoseHint(state: RobotState, config: RobotConfig): {
  j1Angle: number;
  j2Angle: number;
  j3Angle: number;
  gripOpen: boolean;
} {
  return {
    j1Angle: state.j1,
    j2Angle: state.j2,
    j3Angle: state.j3,
    gripOpen: state.gripperOpen,
  };
}
