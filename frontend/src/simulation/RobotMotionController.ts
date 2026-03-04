/**
 * Robot Motion Controller — MetaMech Simulation Studio
 *
 * Manages the pick-and-place cycle for all robot types:
 *   1. IDLE → wait for product at pick source
 *   2. APPROACH_PICK → move toward pick point
 *   3. PICK → grab product
 *   4. RETRACT → lift up from pick
 *   5. MOVE_TO_PLACE → travel to place target
 *   6. APPROACH_PLACE → lower to place point
 *   7. PLACE → release product
 *   8. RETRACT_PLACE → lift up from place
 *   9. RETURN → return to home, then IDLE
 *
 * The controller outputs a normalized phase (0-1) for each motion stage,
 * which the 3D model can use to drive joint animations.
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
  phaseProgress: number;    // 0-1 within current phase
  phaseStartTime: number;
  cycleCount: number;
  heldProductId: string | null;
  pickPosition: [number, number, number] | null;
  placePosition: [number, number, number] | null;
  toolCenterPoint: [number, number, number]; // current TCP world position
}

export interface RobotConfig {
  cycleTime: number;         // total cycle time in seconds
  speedFactor: number;
  approachHeight: number;    // meters above pick/place for approach
  pickHeight: number;        // pick surface height
  placeHeight: number;       // place surface height
  homePosition: [number, number, number];
}

// Phase timing as fraction of total cycle time
const PHASE_FRACTIONS: Record<RobotPhase, number> = {
  'idle': 0,
  'approach-pick': 0.12,
  'pick': 0.05,
  'retract-pick': 0.08,
  'move-to-place': 0.25,
  'approach-place': 0.12,
  'place': 0.05,
  'retract-place': 0.08,
  'return': 0.25,
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
    pickPosition: null,
    placePosition: null,
    toolCenterPoint: [...config.homePosition],
  };
}

/**
 * Tick the robot state machine.
 * Returns the product ID if a product was just placed (for handoff).
 */
export function tickRobot(
  state: RobotState,
  config: RobotConfig,
  simTime: number,
  availableProductId: string | null, // product waiting at pick
): string | null {
  const totalCycle = config.cycleTime / config.speedFactor;
  let placedProductId: string | null = null;

  if (state.phase === 'idle') {
    if (availableProductId && state.pickPosition) {
      // Start a new pick cycle
      state.phase = 'approach-pick';
      state.phaseStartTime = simTime;
      state.heldProductId = null;
    }
    return null;
  }

  // Calculate phase duration
  const phaseDuration = PHASE_FRACTIONS[state.phase] * totalCycle;
  const elapsed = simTime - state.phaseStartTime;
  state.phaseProgress = phaseDuration > 0 ? Math.min(1, elapsed / phaseDuration) : 1;

  // Compute TCP position based on phase
  updateTCP(state, config);

  // Phase transition
  if (state.phaseProgress >= 1) {
    const currentIdx = PHASE_ORDER.indexOf(state.phase);

    // Special actions at phase completion
    if (state.phase === 'pick') {
      state.heldProductId = availableProductId;
    } else if (state.phase === 'place') {
      placedProductId = state.heldProductId;
      state.heldProductId = null;
    } else if (state.phase === 'return') {
      state.cycleCount++;
      state.phase = 'idle';
      state.phaseProgress = 0;
      return placedProductId;
    }

    // Advance to next phase
    const nextIdx = currentIdx + 1;
    if (nextIdx < PHASE_ORDER.length) {
      state.phase = PHASE_ORDER[nextIdx];
      state.phaseStartTime = simTime;
      state.phaseProgress = 0;
    }
  }

  return placedProductId;
}

/** Smooth easing for natural robot motion */
function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  const s = easeInOut(t);
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s];
}

/** Update tool center point position based on current phase */
function updateTCP(state: RobotState, config: RobotConfig) {
  const pick = state.pickPosition || config.homePosition;
  const place = state.placePosition || config.homePosition;
  const home = config.homePosition;
  const t = state.phaseProgress;
  const aH = config.approachHeight;

  const pickAbove: [number, number, number] = [pick[0], pick[1] + aH, pick[2]];
  const placeAbove: [number, number, number] = [place[0], place[1] + aH, place[2]];

  switch (state.phase) {
    case 'idle':
      state.toolCenterPoint = [...home];
      break;
    case 'approach-pick':
      state.toolCenterPoint = lerp3(home, pickAbove, t);
      break;
    case 'pick':
      state.toolCenterPoint = lerp3(pickAbove, pick, t);
      break;
    case 'retract-pick':
      state.toolCenterPoint = lerp3(pick, pickAbove, t);
      break;
    case 'move-to-place':
      state.toolCenterPoint = lerp3(pickAbove, placeAbove, t);
      break;
    case 'approach-place':
      state.toolCenterPoint = lerp3(placeAbove, place, t);
      break;
    case 'place':
      state.toolCenterPoint = [...place];
      break;
    case 'retract-place':
      state.toolCenterPoint = lerp3(place, placeAbove, t);
      break;
    case 'return':
      state.toolCenterPoint = lerp3(placeAbove, home, t);
      break;
  }
}

/**
 * Get the robot's current arm "pose hint" for 3D animation.
 * Returns normalized values that the 3D model can use for joint angles.
 */
export function getRobotPoseHint(state: RobotState, config: RobotConfig): {
  j1Angle: number;  // base rotation
  j2Angle: number;  // shoulder
  j3Angle: number;  // elbow
  gripOpen: boolean; // gripper open/closed
} {
  const tcp = state.toolCenterPoint;
  const home = config.homePosition;

  // J1: base rotation toward TCP
  const j1Angle = Math.atan2(tcp[0] - home[0], tcp[2] - home[2]);

  // J2: shoulder based on height + distance
  const dist = Math.sqrt((tcp[0] - home[0]) ** 2 + (tcp[2] - home[2]) ** 2);
  const j2Angle = Math.atan2(tcp[1] - home[1], dist) * 0.5;

  // J3: elbow based on reach extension
  const maxReach = 2; // approximate
  const reachFraction = Math.min(1, dist / maxReach);
  const j3Angle = -(1 - reachFraction) * 0.8;

  // Gripper: open during approach-pick and place, closed while holding
  const gripOpen = state.heldProductId === null;

  return { j1Angle, j2Angle, j3Angle, gripOpen };
}
