/**
 * Pusher Logic System — MetaMech Simulation Studio
 *
 * Industrial pusher/diverter with routing capabilities:
 * - Mount anywhere on conveyor
 * - Left/right side selection
 * - Configurable stroke and cycle time
 * - Target output conveyor/lane
 * - Reject/divert mode
 * - Property-based routing (color, type, metadata)
 */

export type PusherMode = 'reject' | 'divert' | 'sort';

export type RouteConditionType =
  | 'always'
  | 'color-match'
  | 'type-match'
  | 'size-match'
  | 'tag-match'
  | 'sensor-trigger';

export interface RouteCondition {
  type: RouteConditionType;
  /** Value(s) to match — e.g. color name, product type, etc. */
  matchValues: string[];
  /** Invert match (push everything EXCEPT matching items) */
  invert: boolean;
}

export interface PusherConfig {
  mode: PusherMode;
  /** Push side */
  side: 'left' | 'right';
  /** Stroke length in mm */
  strokeMm: number;
  /** Time for full extend+retract cycle in seconds */
  cycleTimeSec: number;
  /** Target node ID for diverted items (if connected) */
  targetNodeId: string | null;
  /** Routing condition */
  routeCondition: RouteCondition;
  /** Auto-retract after push */
  autoRetract: boolean;
}

export const DEFAULT_PUSHER_CONFIG: PusherConfig = {
  mode: 'reject',
  side: 'right',
  strokeMm: 300,
  cycleTimeSec: 1.0,
  targetNodeId: null,
  routeCondition: {
    type: 'always',
    matchValues: [],
    invert: false,
  },
  autoRetract: true,
};

export type PusherState = 'idle' | 'extending' | 'extended' | 'retracting' | 'ready';

export interface PusherRunState {
  state: PusherState;
  /** Progress of current stroke (0=retracted, 1=extended) */
  strokeProgress: number;
  /** Time cycle started */
  cycleStartTime: number | null;
  /** Product being pushed */
  currentProductId: string | null;
  /** External trigger (from rule engine) */
  triggerPush: boolean;
  /** Product to evaluate for routing */
  productToEvaluate: { id: string; color: string; type: string; size: [number, number, number]; tags?: string[] } | null;
  /** Total pushes since start */
  totalPushes: number;
  /** Busy flag (can't accept new trigger during cycle) */
  busy: boolean;
}

export function createPusherState(): PusherRunState {
  return {
    state: 'idle',
    strokeProgress: 0,
    cycleStartTime: null,
    currentProductId: null,
    triggerPush: false,
    productToEvaluate: null,
    totalPushes: 0,
    busy: false,
  };
}

/**
 * Check if a product matches the pusher's routing condition.
 */
export function evaluateRouteCondition(
  condition: RouteCondition,
  product: { color: string; type: string; size: [number, number, number]; tags?: string[] },
): boolean {
  let matches = false;

  switch (condition.type) {
    case 'always':
      matches = true;
      break;

    case 'color-match':
      matches = condition.matchValues.some(v =>
        product.color.toLowerCase().includes(v.toLowerCase()) ||
        v.toLowerCase().includes(product.color.toLowerCase())
      );
      break;

    case 'type-match':
      matches = condition.matchValues.some(v =>
        product.type.toLowerCase() === v.toLowerCase()
      );
      break;

    case 'size-match': {
      const vol = product.size[0] * product.size[1] * product.size[2];
      const sizeClass = vol < 0.005 ? 'small' : vol < 0.05 ? 'medium' : vol < 0.2 ? 'large' : 'oversized';
      matches = condition.matchValues.includes(sizeClass);
      break;
    }

    case 'tag-match':
      matches = condition.matchValues.some(v =>
        (product.tags || []).includes(v)
      );
      break;

    case 'sensor-trigger':
      // Handled externally via triggerPush flag
      matches = false;
      break;
  }

  return condition.invert ? !matches : matches;
}

export type PusherAction = 'extend' | 'retract' | 'divert-product' | 'cycle-complete';

/**
 * Evaluate pusher state machine for one tick.
 */
export function evaluatePusher(
  config: PusherConfig,
  runState: PusherRunState,
  simTime: number,
  dt: number,
): PusherAction[] {
  const actions: PusherAction[] = [];
  const halfCycle = config.cycleTimeSec / 2;

  switch (runState.state) {
    case 'idle':
    case 'ready': {
      // Check if we should push
      let shouldPush = false;

      if (runState.triggerPush) {
        shouldPush = true;
        runState.triggerPush = false;
      } else if (runState.productToEvaluate && config.routeCondition.type !== 'sensor-trigger') {
        shouldPush = evaluateRouteCondition(config.routeCondition, runState.productToEvaluate);
        runState.productToEvaluate = null;
      }

      if (shouldPush && !runState.busy) {
        runState.state = 'extending';
        runState.cycleStartTime = simTime;
        runState.busy = true;
        actions.push('extend');
      }
      break;
    }

    case 'extending': {
      const elapsed = simTime - (runState.cycleStartTime || simTime);
      runState.strokeProgress = Math.min(1, elapsed / halfCycle);

      if (runState.strokeProgress >= 1) {
        runState.state = 'extended';
        runState.strokeProgress = 1;
        actions.push('divert-product');
        runState.totalPushes++;
      }
      break;
    }

    case 'extended': {
      if (config.autoRetract) {
        runState.state = 'retracting';
      }
      break;
    }

    case 'retracting': {
      const elapsed = simTime - (runState.cycleStartTime || simTime) - halfCycle;
      runState.strokeProgress = Math.max(0, 1 - elapsed / halfCycle);

      if (runState.strokeProgress <= 0) {
        runState.state = 'ready';
        runState.strokeProgress = 0;
        runState.busy = false;
        runState.currentProductId = null;
        actions.push('cycle-complete');
      }
      break;
    }
  }

  return actions;
}

/**
 * Convert editor parameters to PusherConfig.
 */
export function editorParamsToPusherConfig(params: Record<string, any>): PusherConfig {
  const condType = params.routeBy || 'always';
  const matchStr = params.routeValues || '';
  const matchValues = matchStr ? matchStr.split(',').map((s: string) => s.trim()).filter(Boolean) : [];

  return {
    mode: params.pusherMode || 'reject',
    side: params.side || 'right',
    strokeMm: params.stroke || 300,
    cycleTimeSec: params.cycleTime || 1.0,
    targetNodeId: params.targetNode || null,
    routeCondition: {
      type: condType as RouteConditionType,
      matchValues,
      invert: params.invertMatch ?? false,
    },
    autoRetract: params.autoRetract ?? true,
  };
}
