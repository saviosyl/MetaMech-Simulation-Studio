/**
 * Trigger-Action Rule Engine — MetaMech Simulation Studio
 *
 * Generic rule system for industrial logic:
 *
 * Triggers:
 * - sensor event (detection, color, type, zone)
 * - timer (periodic or one-shot)
 * - queue threshold (queue > N)
 * - downstream ready (downstream sensor zone clear)
 * - pusher complete (cycle finished)
 * - stopper released
 * - item property match
 *
 * Actions:
 * - engage stopper
 * - release stopper
 * - fire pusher
 * - route item
 * - stop conveyor
 * - start conveyor
 * - change speed
 * - count item
 */

import { SensorEvent, SensorEventType } from './SensorLogic';

// ─── Trigger Definitions ───────────────────────────────────────

export type TriggerType =
  | 'sensor-event'
  | 'timer'
  | 'queue-threshold'
  | 'downstream-ready'
  | 'pusher-complete'
  | 'stopper-released'
  | 'item-property';

export interface TriggerDef {
  type: TriggerType;
  /** Source node ID (sensor, stopper, pusher, conveyor) */
  sourceNodeId: string;
  /** For sensor-event: which event type */
  sensorEventType?: SensorEventType;
  /** For sensor-event with property match: value to match */
  matchValue?: string;
  /** For timer: interval in seconds */
  timerIntervalSec?: number;
  /** For queue-threshold: threshold count */
  queueThreshold?: number;
  /** For queue-threshold: comparison ('above' | 'below') */
  queueComparison?: 'above' | 'below';
}

// ─── Action Definitions ────────────────────────────────────────

export type ActionType =
  | 'engage-stopper'
  | 'release-stopper'
  | 'fire-pusher'
  | 'route-item'
  | 'stop-conveyor'
  | 'start-conveyor'
  | 'change-speed'
  | 'count-item';

export interface ActionDef {
  type: ActionType;
  /** Target node ID */
  targetNodeId: string;
  /** For change-speed: new speed value */
  speedValue?: number;
  /** For route-item: target output node */
  routeTargetNodeId?: string;
  /** Delay before executing action (seconds) */
  delaySec?: number;
}

// ─── Rule Definition ───────────────────────────────────────────

export interface Rule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: TriggerDef;
  actions: ActionDef[];
  /** One-shot rule: disable after first fire */
  oneShot: boolean;
  /** Cooldown between fires (seconds) */
  cooldownSec: number;
}

// ─── Rule Engine State ─────────────────────────────────────────

export interface RuleEngineState {
  rules: Rule[];
  /** Last fire time per rule ID */
  lastFireTime: Map<string, number>;
  /** Timer state per rule ID */
  timerLastTick: Map<string, number>;
  /** Pending delayed actions */
  pendingActions: { action: ActionDef; executeAt: number; ruleId: string }[];
  /** Event log for debugging */
  eventLog: { time: number; ruleId: string; ruleName: string; trigger: string; actions: string[] }[];
}

export function createRuleEngineState(): RuleEngineState {
  return {
    rules: [],
    lastFireTime: new Map(),
    timerLastTick: new Map(),
    pendingActions: [],
    eventLog: [],
  };
}

// ─── Rule Evaluation ───────────────────────────────────────────

export interface RuleContext {
  simTime: number;
  /** Recent sensor events from this tick */
  sensorEvents: SensorEvent[];
  /** Queue lengths per node ID */
  queueLengths: Map<string, number>;
  /** Set of stopper IDs that released this tick */
  stopperReleased: Set<string>;
  /** Set of pusher IDs that completed a cycle this tick */
  pusherComplete: Set<string>;
  /** Set of downstream sensor IDs reporting zone clear */
  downstreamClear: Set<string>;
}

export interface ActionCommand {
  ruleId: string;
  action: ActionDef;
}

/**
 * Evaluate all rules against current context, return actions to execute.
 */
export function evaluateRules(
  state: RuleEngineState,
  context: RuleContext,
): ActionCommand[] {
  const commands: ActionCommand[] = [];

  // Check pending delayed actions
  const readyActions = state.pendingActions.filter(p => context.simTime >= p.executeAt);
  for (const pa of readyActions) {
    commands.push({ ruleId: pa.ruleId, action: pa.action });
  }
  state.pendingActions = state.pendingActions.filter(p => context.simTime < p.executeAt);

  // Evaluate each rule
  for (const rule of state.rules) {
    if (!rule.enabled) continue;

    // Cooldown check
    const lastFire = state.lastFireTime.get(rule.id) || -Infinity;
    if (context.simTime - lastFire < rule.cooldownSec) continue;

    // Check trigger
    const triggered = checkTrigger(rule.trigger, context, state, rule.id);
    if (!triggered) continue;

    // Fire rule
    state.lastFireTime.set(rule.id, context.simTime);

    // Log
    state.eventLog.push({
      time: context.simTime,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger.type,
      actions: rule.actions.map(a => a.type),
    });
    if (state.eventLog.length > 500) {
      state.eventLog = state.eventLog.slice(-500);
    }

    // Schedule actions
    for (const action of rule.actions) {
      if (action.delaySec && action.delaySec > 0) {
        state.pendingActions.push({
          action,
          executeAt: context.simTime + action.delaySec,
          ruleId: rule.id,
        });
      } else {
        commands.push({ ruleId: rule.id, action });
      }
    }

    // Disable one-shot rules
    if (rule.oneShot) {
      rule.enabled = false;
    }
  }

  return commands;
}

function checkTrigger(
  trigger: TriggerDef,
  context: RuleContext,
  state: RuleEngineState,
  ruleId: string,
): boolean {
  switch (trigger.type) {
    case 'sensor-event': {
      return context.sensorEvents.some(e => {
        if (e.sensorNodeId !== trigger.sourceNodeId) return false;
        if (trigger.sensorEventType && e.type !== trigger.sensorEventType) return false;
        if (trigger.matchValue) {
          // Match against detected color/type
          if (e.detectedColor && e.detectedColor.toLowerCase().includes(trigger.matchValue.toLowerCase())) return true;
          if (e.detectedType && e.detectedType.toLowerCase().includes(trigger.matchValue.toLowerCase())) return true;
          return false;
        }
        return true;
      });
    }

    case 'timer': {
      const interval = trigger.timerIntervalSec || 1;
      const lastTick = state.timerLastTick.get(ruleId) || -Infinity;
      if (context.simTime - lastTick >= interval) {
        state.timerLastTick.set(ruleId, context.simTime);
        return true;
      }
      return false;
    }

    case 'queue-threshold': {
      const qLen = context.queueLengths.get(trigger.sourceNodeId) || 0;
      const threshold = trigger.queueThreshold || 5;
      if (trigger.queueComparison === 'below') return qLen < threshold;
      return qLen > threshold;
    }

    case 'downstream-ready':
      return context.downstreamClear.has(trigger.sourceNodeId);

    case 'pusher-complete':
      return context.pusherComplete.has(trigger.sourceNodeId);

    case 'stopper-released':
      return context.stopperReleased.has(trigger.sourceNodeId);

    case 'item-property':
      // Handled by sensor events with matchValue
      return false;

    default:
      return false;
  }
}

// ─── Helper: Create common rules ───────────────────────────────

/**
 * Create a rule: sensor detects color → pusher diverts.
 */
export function createColorSortRule(
  id: string,
  sensorNodeId: string,
  pusherNodeId: string,
  color: string,
): Rule {
  return {
    id,
    name: `Sort ${color} → pusher`,
    enabled: true,
    trigger: {
      type: 'sensor-event',
      sourceNodeId: sensorNodeId,
      sensorEventType: 'itemColorDetected',
      matchValue: color,
    },
    actions: [{ type: 'fire-pusher', targetNodeId: pusherNodeId }],
    oneShot: false,
    cooldownSec: 0.5,
  };
}

/**
 * Create a rule: downstream sensor clear → release stopper.
 */
export function createDownstreamReadyRule(
  id: string,
  downstreamSensorId: string,
  stopperNodeId: string,
): Rule {
  return {
    id,
    name: 'Downstream clear → release stopper',
    enabled: true,
    trigger: {
      type: 'sensor-event',
      sourceNodeId: downstreamSensorId,
      sensorEventType: 'zoneClear',
    },
    actions: [{ type: 'release-stopper', targetNodeId: stopperNodeId }],
    oneShot: false,
    cooldownSec: 0.2,
  };
}

/**
 * Create a rule: timer-based stopper release (metering).
 */
export function createTimedReleaseRule(
  id: string,
  stopperNodeId: string,
  intervalSec: number,
): Rule {
  return {
    id,
    name: `Release stopper every ${intervalSec}s`,
    enabled: true,
    trigger: {
      type: 'timer',
      sourceNodeId: stopperNodeId,
      timerIntervalSec: intervalSec,
    },
    actions: [{ type: 'release-stopper', targetNodeId: stopperNodeId }],
    oneShot: false,
    cooldownSec: 0,
  };
}

/**
 * Create a rule: pusher complete → release stopper.
 */
export function createPusherCompleteRule(
  id: string,
  pusherNodeId: string,
  stopperNodeId: string,
): Rule {
  return {
    id,
    name: 'Pusher done → release stopper',
    enabled: true,
    trigger: {
      type: 'pusher-complete',
      sourceNodeId: pusherNodeId,
    },
    actions: [{ type: 'release-stopper', targetNodeId: stopperNodeId }],
    oneShot: false,
    cooldownSec: 0.3,
  };
}
