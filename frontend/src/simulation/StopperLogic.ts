/**
 * Stopper Logic System — MetaMech Simulation Studio
 *
 * Industrial stopper with multiple operating modes:
 * - Normally open / normally closed
 * - Timed release
 * - Release on downstream ready
 * - Release on command
 * - Release one item
 * - Batch release
 * - Metering behavior
 *
 * States: idle → engaged → holding → waitingRelease → releasing → reset → idle
 */

export type StopperMode =
  | 'normally-open'       // default open, engage on command
  | 'normally-closed'     // default closed, release on trigger
  | 'timed-release'       // hold for N seconds, then release
  | 'downstream-ready'    // hold until downstream sensor says clear
  | 'on-command'          // hold/release on external trigger
  | 'release-one'         // release one item per trigger
  | 'batch-release'       // release N items per trigger
  | 'metering';           // release one every N seconds

export type StopperState =
  | 'idle'
  | 'engaged'
  | 'holding'
  | 'waiting-release'
  | 'releasing'
  | 'reset';

export interface StopperConfig {
  mode: StopperMode;
  /** For timed-release: hold duration in seconds */
  holdTimeSec: number;
  /** For batch-release: number of items per batch */
  batchSize: number;
  /** For metering: seconds between releases */
  meterIntervalSec: number;
  /** For downstream-ready: ID of the downstream sensor node */
  downstreamSensorId: string | null;
  /** Auto-reset after releasing? */
  autoReset: boolean;
  /** Reset delay in seconds */
  resetDelaySec: number;
}

export const DEFAULT_STOPPER_CONFIG: StopperConfig = {
  mode: 'normally-closed',
  holdTimeSec: 2,
  batchSize: 1,
  meterIntervalSec: 3,
  downstreamSensorId: null,
  autoReset: true,
  resetDelaySec: 0.5,
};

export interface StopperRunState {
  state: StopperState;
  /** Number of items currently held */
  itemsHeld: number;
  /** Number of items released in current batch */
  itemsReleasedInBatch: number;
  /** Time when hold started */
  holdStartTime: number | null;
  /** Time when release started */
  releaseStartTime: number | null;
  /** Time of last metered release */
  lastMeterTime: number;
  /** External trigger flag (set by rule engine) */
  triggerRelease: boolean;
  /** External trigger flag for engage (set by rule engine) */
  triggerEngage: boolean;
  /** Downstream sensor reports clear */
  downstreamClear: boolean;
  /** Total items released since start */
  totalReleased: number;
  /** Total items that passed through */
  totalPassed: number;
}

export function createStopperState(): StopperRunState {
  return {
    state: 'idle',
    itemsHeld: 0,
    itemsReleasedInBatch: 0,
    holdStartTime: null,
    releaseStartTime: null,
    lastMeterTime: -Infinity,
    triggerRelease: false,
    triggerEngage: false,
    downstreamClear: false,
    totalReleased: 0,
    totalPassed: 0,
  };
}

export interface StopperAction {
  type: 'engage' | 'release-one' | 'release-batch' | 'release-all' | 'hold' | 'reset';
}

/**
 * Evaluate stopper state machine for one tick.
 * Returns actions to take (engage blade, release items, etc.)
 */
export function evaluateStopper(
  config: StopperConfig,
  runState: StopperRunState,
  simTime: number,
): StopperAction[] {
  const actions: StopperAction[] = [];

  switch (config.mode) {
    case 'normally-open':
      // Open by default, close on external trigger
      if (runState.triggerEngage) {
        runState.state = 'engaged';
        runState.triggerEngage = false;
        actions.push({ type: 'engage' });
      }
      if (runState.state === 'engaged' && runState.triggerRelease) {
        runState.state = 'releasing';
        runState.releaseStartTime = simTime;
        runState.triggerRelease = false;
        actions.push({ type: 'release-all' });
      }
      if (runState.state === 'releasing' && config.autoReset) {
        if (simTime - (runState.releaseStartTime || 0) >= config.resetDelaySec) {
          runState.state = 'idle';
          actions.push({ type: 'reset' });
        }
      }
      break;

    case 'normally-closed':
      // Closed by default, release on trigger
      if (runState.state === 'idle') {
        runState.state = 'engaged';
        actions.push({ type: 'engage' });
      }
      if (runState.state === 'engaged' && runState.itemsHeld > 0) {
        runState.state = 'holding';
        runState.holdStartTime = simTime;
      }
      if (runState.state === 'holding' && runState.triggerRelease) {
        runState.state = 'releasing';
        runState.releaseStartTime = simTime;
        runState.triggerRelease = false;
        actions.push({ type: 'release-all' });
      }
      if (runState.state === 'releasing' && config.autoReset) {
        if (simTime - (runState.releaseStartTime || 0) >= config.resetDelaySec) {
          runState.state = 'engaged';
          runState.itemsHeld = 0;
          runState.itemsReleasedInBatch = 0;
          actions.push({ type: 'engage' });
        }
      }
      break;

    case 'timed-release':
      // Hold for N seconds then release
      if (runState.state === 'idle') {
        runState.state = 'engaged';
        actions.push({ type: 'engage' });
      }
      if (runState.state === 'engaged' && runState.itemsHeld > 0) {
        runState.state = 'holding';
        runState.holdStartTime = simTime;
      }
      if (runState.state === 'holding' && runState.holdStartTime !== null) {
        if (simTime - runState.holdStartTime >= config.holdTimeSec) {
          runState.state = 'releasing';
          runState.releaseStartTime = simTime;
          actions.push({ type: 'release-all' });
        }
      }
      if (runState.state === 'releasing' && config.autoReset) {
        if (simTime - (runState.releaseStartTime || 0) >= config.resetDelaySec) {
          runState.state = 'engaged';
          runState.itemsHeld = 0;
          actions.push({ type: 'engage' });
        }
      }
      break;

    case 'downstream-ready':
      if (runState.state === 'idle') {
        runState.state = 'engaged';
        actions.push({ type: 'engage' });
      }
      if (runState.state === 'engaged' && runState.itemsHeld > 0) {
        runState.state = 'waiting-release';
      }
      if (runState.state === 'waiting-release' && runState.downstreamClear) {
        runState.state = 'releasing';
        runState.releaseStartTime = simTime;
        runState.downstreamClear = false;
        actions.push({ type: 'release-one' });
      }
      if (runState.state === 'releasing' && config.autoReset) {
        if (simTime - (runState.releaseStartTime || 0) >= config.resetDelaySec) {
          runState.state = 'engaged';
          runState.itemsReleasedInBatch = 0;
          actions.push({ type: 'engage' });
        }
      }
      break;

    case 'on-command':
      if (runState.state === 'idle') {
        runState.state = 'engaged';
        actions.push({ type: 'engage' });
      }
      if (runState.triggerRelease) {
        runState.state = 'releasing';
        runState.releaseStartTime = simTime;
        runState.triggerRelease = false;
        actions.push({ type: 'release-all' });
      }
      if (runState.state === 'releasing' && config.autoReset) {
        if (simTime - (runState.releaseStartTime || 0) >= config.resetDelaySec) {
          runState.state = 'engaged';
          runState.itemsHeld = 0;
          actions.push({ type: 'engage' });
        }
      }
      break;

    case 'release-one':
      if (runState.state === 'idle') {
        runState.state = 'engaged';
        actions.push({ type: 'engage' });
      }
      if (runState.state === 'engaged' && runState.itemsHeld > 0 && runState.triggerRelease) {
        runState.state = 'releasing';
        runState.releaseStartTime = simTime;
        runState.triggerRelease = false;
        actions.push({ type: 'release-one' });
      }
      if (runState.state === 'releasing' && config.autoReset) {
        if (simTime - (runState.releaseStartTime || 0) >= config.resetDelaySec) {
          runState.state = 'engaged';
          runState.itemsReleasedInBatch = 0;
          actions.push({ type: 'engage' });
        }
      }
      break;

    case 'batch-release':
      if (runState.state === 'idle') {
        runState.state = 'engaged';
        actions.push({ type: 'engage' });
      }
      if (runState.state === 'engaged' && runState.itemsHeld >= config.batchSize) {
        runState.state = 'releasing';
        runState.releaseStartTime = simTime;
        actions.push({ type: 'release-batch' });
      }
      if (runState.state === 'releasing' && config.autoReset) {
        if (simTime - (runState.releaseStartTime || 0) >= config.resetDelaySec) {
          runState.state = 'engaged';
          runState.itemsReleasedInBatch = 0;
          actions.push({ type: 'engage' });
        }
      }
      break;

    case 'metering':
      if (runState.state === 'idle') {
        runState.state = 'engaged';
        actions.push({ type: 'engage' });
      }
      if (runState.state === 'engaged' && runState.itemsHeld > 0) {
        if (simTime - runState.lastMeterTime >= config.meterIntervalSec) {
          runState.lastMeterTime = simTime;
          actions.push({ type: 'release-one' });
        }
      }
      break;
  }

  return actions;
}

/**
 * Convert editor parameters to StopperConfig.
 */
export function editorParamsToStopperConfig(params: Record<string, any>): StopperConfig {
  return {
    mode: params.stopperMode || 'normally-closed',
    holdTimeSec: params.holdTime || 2,
    batchSize: params.batchSize || 1,
    meterIntervalSec: params.meterInterval || 3,
    downstreamSensorId: params.downstreamSensor || null,
    autoReset: params.autoReset ?? true,
    resetDelaySec: params.resetDelay || 0.5,
  };
}
