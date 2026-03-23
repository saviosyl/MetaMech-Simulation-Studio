/**
 * SimulationEngine — Real-time industrial conveyor simulation
 *
 * Products spawn at sources, travel along conveyors at belt speed,
 * transfer between connected conveyors, and arrive at sinks.
 *
 * Products are always centered on the conveyor width and ride on top of the belt.
 */
import { v4 as uuidv4 } from 'uuid';
import { Product, NodeStats, FlowState, FlowEvent } from './Product';
import { ProcessNode, ProcessEdge, getConnectionPorts } from '../store/editorStore';
import { getPortWorldPosition } from '../lib/nodeTransform';
import { createTransportPath } from '../lib/transportPath';
import { createRobotState, tickRobot, RobotState, RobotConfig } from './RobotMotionController';
import { createPalletState, getNextSlotPosition, fillSlot, paramsToPalletDef, PalletState } from './PalletizingController';
import { SensorState, createSensorState, evaluateSensor, editorParamsToSensorConfig, SensorEvent } from './SensorLogic';
import { StopperRunState, createStopperState, evaluateStopper, editorParamsToStopperConfig } from './StopperLogic';
import { PusherRunState, createPusherState, evaluatePusher, editorParamsToPusherConfig } from './PusherLogic';
import { RuleEngineState, createRuleEngineState, evaluateRules, RuleContext, ActionCommand, Rule } from './RuleEngine';

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
  white: '#f5f5f5',
};
const RANDOM_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const CONVEYOR_TYPES = [
  'conveyor',
  'belt-conveyor',
  'roller-conveyor',
  'bend-conveyor',
  'modular-conveyor-straight',
  'modular-conveyor-90-curve',
  'modular-conveyor-45-curve',
  'spiral-conveyor',
  'incline-conveyor',
  'mm85-conveyor-section',
  'mm85-drive-end',
  'mm85-idler-end',
  'mm85-guide-rail',
];
const MAX_FLOW_EVENTS = 200; // cap event log size

export class SimulationEngine {
  products: Product[] = [];
  nodeStats: Map<string, NodeStats> = new Map();
  robotStates: Map<string, RobotState> = new Map();
  palletStates: Map<string, PalletState> = new Map();
  sensorStates: Map<string, SensorState> = new Map();
  stopperStates: Map<string, StopperRunState> = new Map();
  pusherStates: Map<string, PusherRunState> = new Map();
  ruleEngineState: RuleEngineState = createRuleEngineState();
  rules: Rule[] = [];
  private pendingSensorEvents: SensorEvent[] = [];
  /** Sensor signal registry — updated each tick. Key = sensorTag, Value = signal state */
  sensorSignals: Map<string, { active: boolean; productId: string | null; productColor: string | null; productType: string | null; activeSince: number }> = new Map();
  
  // Stopper state (by stopper node id) — avoids node parameter reference issues
  private stopperState: Map<string, {
    latched: boolean;
    lastReleaseTime: number;
    cooldownSec: number;
    // For two-sensor release: allow exactly one release while secondary zone is clear,
    // then require secondary to become occupied again before next release.
    secondaryCycleArmed: boolean;
  }> = new Map();
  // Sensor dwell state (by sensor node id)
  private sensorDwellFired: Map<string, boolean> = new Map();
  simTime: number = 0;
  nodes: ProcessNode[] = [];
  edges: ProcessEdge[] = [];
  private colorIndex = 0;

  init(nodes: ProcessNode[], edges: ProcessEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.products = [];
    this.simTime = 0;
    this.colorIndex = 0;
    this.nodeStats.clear();

    for (const node of nodes) {
      this.nodeStats.set(node.id, {
        nodeId: node.id,
        throughput: 0,
        utilization: 0,
        queueLength: 0,
        busyTime: 0,
        totalTime: 0,
        processing: false,
        currentProductId: null,
        queue: [],
        processEndTime: null,
        processStartTime: undefined as number | undefined,
        lastSpawnTime: -Infinity,
        routerIndex: 0,
        palletCount: 0,
        flowState: 'idle',
        blockedTime: 0,
        starvedTime: 0,
        stoppedTime: 0,
        lastFlowStateChange: 0,
        peakQueueLength: 0,
        totalItemsBlocked: 0,
        events: [],
      });

      // Init robot states
      const ROBOT_TYPES = ['cartesian-robot', 'cobot', 'robot-5axis', 'robot-6axis'];
      if (ROBOT_TYPES.includes(node.type)) {
        const pedH = node.parameters.pedestalEnabled ? (node.parameters.pedestalHeight || 0) / 1000 : 0;
        const bH = (node.parameters.baseHeight || 500) / 1000;
        const homeY = pedH + bH + 0.5;
        const config: RobotConfig = {
          cycleTime: node.parameters.cycleTime || 4,
          speedFactor: node.parameters.speedFactor || 1,
          approachHeight: 0.3,
          pickHeight: bH + pedH,
          placeHeight: bH + pedH,
          homePosition: [node.position[0], node.position[1] + homeY, node.position[2]],
        };
        const rState = createRobotState(config);
        const anchors = this.resolveRobotAnchors(node);
        rState.pickPosition = anchors.pickPosition;
        rState.placePosition = anchors.placePosition;

        this.robotStates.set(node.id, rState);
      }

      // Init pallet states
      const PALLET_TYPES = ['eur-pallet', 'standard-pallet', 'custom-pallet'];
      if (PALLET_TYPES.includes(node.type)) {
        const def = paramsToPalletDef(node.parameters);
        this.palletStates.set(node.id, createPalletState(def));
      }

      // Init sensor states
      if (node.type === 'sensor') {
        this.sensorStates.set(node.id, createSensorState());
      }

      // Init stopper states
      if (node.type === 'stopper') {
        this.stopperStates.set(node.id, createStopperState());
      }

      // Init pusher states
      if (node.type === 'pusher') {
        this.pusherStates.set(node.id, createPusherState());
      }
    }

    // Reset rule engine
    this.ruleEngineState = createRuleEngineState();
    this.pendingSensorEvents = [];
  }

  reset() {
    this.products = [];
    this.simTime = 0;
    this.robotStates.clear();
    this.palletStates.clear();
    this.sensorStates.clear();
    this.sensorSignals.clear();
    this.stopperState.clear();
    this.sensorDwellFired.clear();
    this.stopperStates.clear();
    this.pusherStates.clear();
    this.ruleEngineState = createRuleEngineState();
    this.pendingSensorEvents = [];
    this.nodeStats.forEach(s => {
      s.throughput = 0;
      s.utilization = 0;
      s.queueLength = 0;
      s.busyTime = 0;
      s.totalTime = 0;
      s.processing = false;
      s.currentProductId = null;
      s.queue = [];
      s.processEndTime = null;
      s.lastSpawnTime = -Infinity;
      s.routerIndex = 0;
      s.palletCount = 0;
      s.flowState = 'idle';
      s.blockedTime = 0;
      s.starvedTime = 0;
      s.stoppedTime = 0;
      s.lastFlowStateChange = 0;
      s.peakQueueLength = 0;
      s.totalItemsBlocked = 0;
      s.events = [];
    });
  }

  tick(dt: number, speed: number) {
    const elapsed = dt * speed;
    this.simTime += elapsed;

    // ── PASS 1: Tick ALL sensors first so signals are fresh for conveyors/stoppers ──
    for (const node of this.nodes) {
      if (node.type === 'sensor') {
        const stats = this.nodeStats.get(node.id)!;
        stats.totalTime = this.simTime;
        try { this.tickSensor(node, stats, elapsed); } catch (e) {
          console.warn(`SimEngine sensor tick error on ${node.id}:`, e);
        }
      }
    }

    // ── PASS 2: Tick everything else (conveyors, stoppers, sources, etc.) ──
    for (const node of this.nodes) {
      if (node.type === 'sensor') continue; // already ticked in pass 1
      const stats = this.nodeStats.get(node.id)!;
      stats.totalTime = this.simTime;
      try {

      switch (node.type) {
        case 'source': this.tickSource(node, stats, elapsed); break;
        case 'conveyor':
        case 'belt-conveyor':
        case 'roller-conveyor':
        case 'bend-conveyor':
        case 'modular-conveyor-straight':
        case 'modular-conveyor-90-curve':
        case 'modular-conveyor-45-curve':
        case 'spiral-conveyor':
        case 'incline-conveyor':
        case 'mm85-conveyor-section':
        case 'mm85-drive-end':
        case 'mm85-idler-end':
        case 'mm85-guide-rail':
          if (node.parameters.accumulationMode) {
            this.tickAccumulationConveyor(node, stats, elapsed);
          } else {
            this.tickConveyor(node, stats, elapsed);
          }
          break;
        case 'machine':
        case 'carton-erector':
        case 'case-packer':
        case 'checkweigher':
        case 'metal-detector':
        case 'labeler':
        case 'sealing-station':
        case 'reject-station': this.tickMachine(node, stats, elapsed); break;
        case 'buffer': this.tickBuffer(node, stats); break;
        case 'sink': this.tickSink(node, stats); break;
        case 'router': this.tickRouter(node, stats); break;
        case 'pick-and-place': this.tickMachine(node, stats, elapsed); break;
        case 'cartesian-robot':
        case 'cobot':
        case 'robot-5axis':
        case 'robot-6axis': this.tickRobotNode(node, stats, elapsed); break;
        case 'eur-pallet':
        case 'standard-pallet':
        case 'custom-pallet': /* pallets are passive — tracked via palletStates */ break;
        case 'palletizer': this.tickPalletizer(node, stats, elapsed); break;
        case 'stopper': this.tickStopper(node, stats, elapsed); break;
        case 'pusher': this.tickPusher(node, stats, elapsed); break;
        case 'vertical-lifter': this.tickLift(node, stats, elapsed); break;
        default: {
          // Unknown node type: pass products through to output
          const defArrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
          const defOut = this.getOutEdges(node.id);
          for (const p of defArrived) {
            if (defOut.length > 0) {
              this.sendProductAlongEdge(p, defOut[0]);
            } else {
              p.state = 'completed';
              p.completedAt = this.simTime;
            }
          }
          break;
        }
      }
      } catch (e) {
        console.warn(`SimEngine tick error on node ${node.id} (${node.type}):`, e);
      }

      if (stats.totalTime > 0) {
        stats.utilization = stats.busyTime / stats.totalTime;
      }
      stats.queueLength = stats.queue.length;
    }

    this.tickMovingProducts(elapsed);

    // ─── Rule Engine: evaluate trigger→action rules ────────────
    this.tickRuleEngine(elapsed);

    // Cleanup completed products that left the system
    this.products = this.products.filter(p => p.state !== 'completed' || (this.simTime - (p.completedAt || 0)) < 2);
  }

  // ─── Rule Engine tick ────────────────────────────────────────
  private tickRuleEngine(_dt: number) {
    if (this.rules.length === 0) return;

    // Build queue lengths map
    const queueLengths = new Map<string, number>();
    for (const [id, stats] of this.nodeStats) {
      queueLengths.set(id, stats.queue.length);
    }

    // Track stopper releases and pusher completions
    const stopperReleased = new Set<string>();
    const pusherComplete = new Set<string>();
    const downstreamClear = new Set<string>();

    // Check sensors that are clear (zone clear = downstream ready)
    for (const node of this.nodes) {
      if (node.type === 'sensor') {
        const stats = this.nodeStats.get(node.id);
        if (stats && !stats.processing) {
          downstreamClear.add(node.id);
        }
      }
    }

    const context: RuleContext = {
      simTime: this.simTime,
      sensorEvents: this.pendingSensorEvents,
      queueLengths,
      stopperReleased,
      pusherComplete,
      downstreamClear,
    };

    const commands = evaluateRules(this.ruleEngineState, context);

    // Execute action commands
    for (const cmd of commands) {
      this.executeRuleAction(cmd);
    }

    // Clear pending sensor events after rule evaluation
    this.pendingSensorEvents = [];
  }

  private executeRuleAction(cmd: ActionCommand) {
    const act = cmd.action;
    const node = this.nodes.find(n => n.id === act.targetNodeId);
    if (!node) return;

    switch (act.type) {
      case 'engage-stopper':
        node.parameters.engaged = true;
        break;
      case 'release-stopper':
        node.parameters.engaged = false;
        break;
      case 'fire-pusher': {
        const pState = this.pusherStates.get(act.targetNodeId);
        if (pState && pState.state === 'idle') {
          pState.state = 'extending';
          pState.cycleStartTime = this.simTime;
        }
        break;
      }
      case 'stop-conveyor':
        node.parameters.enabled = false;
        break;
      case 'start-conveyor':
        node.parameters.enabled = true;
        break;
      case 'change-speed':
        if (act.speedValue) node.parameters.beltSpeed = act.speedValue;
        break;
      case 'count-item': {
        const stats = this.nodeStats.get(act.targetNodeId);
        if (stats) stats.throughput++;
        break;
      }
      case 'route-item':
        // Route handled by pusher logic
        break;
    }
  }

  /** Load rules for rule engine (called externally, e.g. from scenario loader) */
  loadRules(rules: Rule[]) {
    this.rules = rules;
    this.ruleEngineState = createRuleEngineState();
  }

  // ─── Source: spawn products ──────────────────────────────────
  private tickSource(node: ProcessNode, stats: NodeStats, _dt: number) {
    const ppm = node.parameters.spawnRate || node.parameters.ppm || 30;
    const interval = 60 / ppm;
    const maxItems = node.parameters.maxItems || 0;
    const runMode = node.parameters.runMode || 'continuous';
    const blockedByTag = node.parameters.blockedBySensorTag || '';
    const dwellBlock = node.parameters.dwellBlockThreshold || 3;
    const resumeDelay = node.parameters.resumeDelay || 0.5;

    if (maxItems > 0 && stats.throughput >= maxItems) return;

    // Signal-controlled mode: check if source should be blocked
    let allowFeed = true;
    if (runMode === 'signal-controlled' && blockedByTag) {
      const signal = this.sensorSignals.get(blockedByTag);
      if (signal?.active && signal.activeSince > 0) {
        const dwellSec = this.simTime - signal.activeSince;
        if (dwellSec >= dwellBlock) {
          allowFeed = false;
          // Store blocked state for UI
          (node.parameters as any)._sourceState = 'BLOCKED';
        }
      }
    }

    // Check if source was recently unblocked — apply resume delay
    if (!allowFeed) {
      (stats as any)._blockedSince = (stats as any)._blockedSince || this.simTime;
      return;
    } else if ((stats as any)._blockedSince) {
      // Was blocked, now clear — check resume delay
      const clearTime = (stats as any)._blockedSince;
      if (this.simTime - clearTime < resumeDelay) {
        (node.parameters as any)._sourceState = 'RESUMING';
        return;
      }
      (stats as any)._blockedSince = null;
    }

    (node.parameters as any)._sourceState = 'RUNNING';

    if (this.simTime - stats.lastSpawnTime >= interval) {
      const outEdges = this.getOutEdges(node.id);
      if (outEdges.length > 0) {
        const product = this.createProduct(node);
        this.products.push(product);
        this.sendProductAlongEdge(product, outEdges[0]);
        stats.lastSpawnTime = this.simTime;
        stats.throughput++;
      }
    }
  }

  // ─── Conveyor: products ride the belt via transport path ──────
  private tickConveyor(node: ProcessNode, stats: NodeStats, dt: number) {
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    const path = createTransportPath(node.type, node.parameters);
    const speedMps = (node.parameters.beltSpeed || node.parameters.speed || 20) / 60;
    const pathLen = path ? path.length : ((node.parameters.length || 3000) / 1000);
    const MIN_GAP_M = 0.001; // ~1mm gap — products touch each other when accumulated

    // Accept new arrivals at path start
    for (const product of arrived) {
      product.state = 'queued';
      product.pathPosition = 0;
      product.conveyorEntryTime = this.simTime;
      if (!stats.queue.includes(product.id)) {
        stats.queue.push(product.id);
      }
    }

    // Build array of products on this conveyor, sorted frontmost first
    const queuedProducts: Product[] = [];
    for (const pid of stats.queue) {
      const p = this.products.find(pr => pr.id === pid);
      if (p) queuedProducts.push(p);
    }
    queuedProducts.sort((a, b) => b.pathPosition - a.pathPosition);

    // Check if downstream exit is blocked
    const outEdges = this.getTransferOutEdges(node);
    let exitBlocked = outEdges.length === 0;
    if (!exitBlocked && outEdges.length > 0) {
      const nextNodeId = outEdges[0].to;
      const nextNode = this.nodes.find(n => n.id === nextNodeId);
      if (nextNode) {
        // Stopper engaged = exit blocked
        if (nextNode.type === 'stopper') {
          const engaged = nextNode.parameters.engaged ?? true;
          const enabled = nextNode.parameters.enabled ?? true;
          if (enabled && engaged) exitBlocked = true;
        }
        // Next conveyor backpressure: if its first product is near input, block
        const nextStats = this.nodeStats.get(nextNodeId);
        if (nextStats && nextStats.queue.length > 0) {
          const nextProds = nextStats.queue.map(id => this.products.find(p => p.id === id)).filter(Boolean) as Product[];
          const nearestToInput = nextProds.reduce((min, p) => p.pathPosition < min ? p.pathPosition : min, 1);
          if (nearestToInput < 0.05) exitBlocked = true;
        }
      }
    }

    // Find mounted stoppers on this conveyor that are currently ENGAGED (blocking)
    const mountedStoppers = this.nodes.filter(n => {
      if (n.type !== 'stopper') return false;
      if (n.parameters?.parentConveyorId !== node.id) return false;
      if (!(n.parameters?.enabled ?? true)) return false;
      
      const mode = n.parameters.stopperMode || 'always-stop';
      const triggerTag = n.parameters.triggerSensorTag || '';
      
      if (mode === 'sensor-triggered' && triggerTag) {
        // Get/init stopper state from engine map (NOT node params)
        let ss = this.stopperState.get(n.id);
        if (!ss) {
          ss = {
            latched: false,
            lastReleaseTime: 0,
            cooldownSec: n.parameters.releaseDelay || 3,
            secondaryCycleArmed: true,
          };
          this.stopperState.set(n.id, ss);
        }

        // Keep two-sensor release cycle armed whenever the secondary zone becomes occupied.
        const secTag = n.parameters.secondarySensorTag || '';
        const relCond = n.parameters.releaseCondition || '';
        if (secTag && relCond === 'sensor-clear') {
          const secActive = this.sensorSignals.get(secTag)?.active ?? false;
          if (secActive) ss.secondaryCycleArmed = true;
        }
        
        // Cooldown: barrier stays OPEN for cooldownSec after release
        const sinceLast = this.simTime - ss.lastReleaseTime;
        if (ss.lastReleaseTime > 0 && sinceLast < ss.cooldownSec) {
          ss.latched = false;
          // Log once when cooldown starts
          if (sinceLast < 0.1) console.log(`[COOLDOWN] ${n.parameters?.stopperTag} OPEN for ${ss.cooldownSec}s (released at t=${ss.lastReleaseTime.toFixed(1)})`);
          return false; // barrier OPEN during cooldown
        }
        
        // Latch: sensor triggers → stopper latches closed
        const signal = this.sensorSignals.get(triggerTag);
        const sensorActive = signal?.active ?? false;
        
        if (sensorActive && !ss.latched) {
          ss.latched = true;
          console.log(`[LATCH] ${n.parameters?.stopperTag} at t=${this.simTime.toFixed(1)} lastRelease=${ss.lastReleaseTime.toFixed(1)} sinceLast=${sinceLast.toFixed(1)} cool=${ss.cooldownSec}`);
        }
        
        return ss.latched;
      }
      
      return n.parameters?.engaged ?? true;
    });
    const stopperPositions = mountedStoppers.map(s => s.parameters.mountPosition ?? 0.5).sort((a, b) => b - a);

    const toRelease: string[] = [];
    // prevFrontEdge: the rear boundary of the product ahead (in normalized path coords)
    // For the frontmost product, this is either 1.0 (exit blocked) or Infinity (free exit)
    let prevFrontEdge = exitBlocked ? 1.0 : Infinity;

    for (const product of queuedProducts) {
      const advanceT = (speedMps * dt) / pathLen;
      let targetPos = product.pathPosition + advanceT;

      // Product extents in normalized path coordinates
      const halfLenT = (product.productLength / 2) / pathLen;
      const gapT = MIN_GAP_M / pathLen;

      // Clamp: can't advance past the rear edge of the product ahead minus gap
      if (prevFrontEdge < Infinity) {
        const maxAllowed = prevFrontEdge - gapT - halfLenT;
        if (targetPos > maxAllowed) {
          targetPos = maxAllowed;
        }
      }

      // Clamp: can't advance past an engaged stopper mounted on this conveyor
      for (const stopT of stopperPositions) {
        if (product.pathPosition < stopT && targetPos >= stopT - halfLenT) {
          targetPos = stopT - halfLenT;
          // Mark product as stopped by the mounted stopper
          if (!product.stoppedBy) {
            const stopper = mountedStoppers.find(s => (s.parameters.mountPosition ?? 0.5) === stopT);
            if (stopper) {
              product.stoppedBy = stopper.id;
              product.blockedSince = this.simTime;
            }
          }
          break;
        }
      }

      targetPos = Math.max(0, Math.min(1, targetPos));
      product.pathPosition = targetPos;

      // This product's rear edge is the boundary for the next (trailing) product
      prevFrontEdge = targetPos - halfLenT;

      // Convert 1D path position to 3D world position
      const t = product.pathPosition;
      if (path) {
        product.currentPosition = path.getWorldPosition(t, node.position, node.rotation, node.scale);
        const tangent = path.getWorldTangent(t, node.rotation);
        const tdx = tangent[0];
        const tdy = tangent[1];
        const tdz = tangent[2];
        const tmag = Math.sqrt(tdx * tdx + tdy * tdy + tdz * tdz) || 1;
        const tn: [number, number, number] = [tdx / tmag, tdy / tmag, tdz / tmag];
        product.currentTangent = tn;
        product.currentRotationY = Math.atan2(tn[0], tn[2]);
      } else {
        const ports = getConnectionPorts(node.type, node.parameters);
        const inputPort = ports.find(p => p.type === 'input');
        const outputPort = ports.find(p => p.type === 'output');
        if (inputPort && outputPort) {
          const inWorld = getPortWorldPosition(inputPort.localPosition, node);
          const outWorld = getPortWorldPosition(outputPort.localPosition, node);
          product.currentPosition = [
            inWorld[0] + (outWorld[0] - inWorld[0]) * t,
            inWorld[1] + (outWorld[1] - inWorld[1]) * t,
            inWorld[2] + (outWorld[2] - inWorld[2]) * t,
          ];
          const dx = outWorld[0] - inWorld[0];
          const dy = outWorld[1] - inWorld[1];
          const dz = outWorld[2] - inWorld[2];
          const mag = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
          product.currentTangent = [dx / mag, dy / mag, dz / mag];
          product.currentRotationY = Math.atan2(dx, dz);
        }
      }

      // Release when reaching end of conveyor (and exit is not blocked)
      if (product.pathPosition >= 1.0 - 0.001 && !exitBlocked) {
        toRelease.push(product.id);
      }
    }

    for (const pid of toRelease) {
      stats.queue = stats.queue.filter(id => id !== pid);
      const product = this.products.find(p => p.id === pid);
      if (product) {
        product.pathPosition = 0;
        if (outEdges.length > 0) {
          this.sendProductAlongEdge(product, outEdges[0]);
        } else {
          product.state = 'at-node';
        }
        stats.throughput++;
      }
    }

    if (stats.queue.length > 0) stats.busyTime += dt;

    // Flow state evaluation
    this.evaluateConveyorFlowState(node, stats, dt);
  }
  // ─── Machine: process with cycle time ────────────────────────
  private tickMachine(node: ProcessNode, stats: NodeStats, dt: number) {
    const processingTime = node.parameters.processingTime || node.parameters.cycleTime || 2;

    // Compute infeed/outfeed world positions for internal transport
    const ports = getConnectionPorts(node.type, node.parameters);
    const inPort = ports.find(p => p.type === 'input');
    const outPort = ports.find(p => p.type === 'output');
    const infeedPos = inPort ? getPortWorldPosition(inPort.localPosition, node) : [node.position[0], node.position[1] + 0.85, node.position[2]] as [number,number,number];
    const outfeedPos = outPort ? getPortWorldPosition(outPort.localPosition, node) : [node.position[0], node.position[1] + 0.85, node.position[2]] as [number,number,number];

    // ─ Release finished product ─
    if (stats.processing && stats.processEndTime !== null && this.simTime >= stats.processEndTime) {
      const product = this.products.find(p => p.id === stats.currentProductId);
      if (product) {
        // Snap to outfeed position before handing off
        product.currentPosition = [...outfeedPos];
        const outEdges = this.getOutEdges(node.id);
        if (outEdges.length > 0) {
          this.sendProductAlongEdge(product, outEdges[0]);
        } else {
          product.state = 'completed';
          product.completedAt = this.simTime;
        }
      }
      stats.processing = false;
      stats.currentProductId = null;
      stats.processEndTime = null;
      stats.processStartTime = undefined;
      stats.throughput++;
    }

    // ─ Start processing next queued product ─
    if (!stats.processing && stats.queue.length > 0) {
      const pid = stats.queue.shift()!;
      const product = this.products.find(p => p.id === pid);
      if (product) {
        product.state = 'processing';
        product.currentPosition = [...infeedPos]; // Start at infeed, not floor
        stats.processing = true;
        stats.currentProductId = pid;
        stats.processStartTime = this.simTime;
        stats.processEndTime = this.simTime + processingTime;
      }
    }

    // ─ Animate product along internal transport path (infeed → outfeed) ─
    if (stats.processing && stats.currentProductId && stats.processStartTime !== undefined) {
      const product = this.products.find(p => p.id === stats.currentProductId);
      if (product) {
        const elapsed = this.simTime - stats.processStartTime;
        const t = Math.min(1, elapsed / processingTime);
        // Smooth easing
        const s = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        product.currentPosition = [
          infeedPos[0] + (outfeedPos[0] - infeedPos[0]) * s,
          infeedPos[1] + (outfeedPos[1] - infeedPos[1]) * s,
          infeedPos[2] + (outfeedPos[2] - infeedPos[2]) * s,
        ];
      }
    }

    if (stats.processing) stats.busyTime += dt;

    // ─ Accept arriving products ─
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'queued';
      product.currentPosition = [...infeedPos]; // Park at infeed while queued
      stats.queue.push(product.id);
    }

    // ─ Flow state ─
    if (stats.processing) {
      this.setFlowState(stats, 'running', dt);
    } else if (stats.queue.length === 0) {
      const inEdges = this.edges.filter(e => e.to === node.id);
      if (inEdges.length > 0 && this.simTime > 2) {
        this.setFlowState(stats, 'starved', dt);
        stats.starvedTime += dt;
      } else {
        this.setFlowState(stats, 'idle', dt);
      }
    }
  }

  // ─── Buffer ──────────────────────────────────────────────────
  private tickBuffer(node: ProcessNode, stats: NodeStats) {
    const capacity = node.parameters.capacity || 10;

    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      if (stats.queue.length < capacity) {
        product.state = 'queued';
        stats.queue.push(product.id);
      }
    }

    if (stats.queue.length > 0) {
      const outEdges = this.getOutEdges(node.id);
      if (outEdges.length > 0) {
        const pid = stats.queue.shift()!;
        const product = this.products.find(p => p.id === pid);
        if (product) {
          this.sendProductAlongEdge(product, outEdges[0]);
          stats.throughput++;
        }
      }
    }
  }

  // ─── Sink ────────────────────────────────────────────────────
  private tickSink(node: ProcessNode, stats: NodeStats) {
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'completed';
      product.completedAt = this.simTime;
      stats.throughput++;
    }
    this.products = this.products.filter(p => !(p.state === 'completed' && p.currentNodeId === node.id));
  }

  // ─── Router ──────────────────────────────────────────────────
  private tickRouter(node: ProcessNode, stats: NodeStats) {
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    const outEdges = this.getOutEdges(node.id);
    if (outEdges.length === 0) return;

    for (const product of arrived) {
      const edge = outEdges[stats.routerIndex % outEdges.length];
      this.sendProductAlongEdge(product, edge);
      stats.routerIndex++;
      stats.throughput++;
    }
  }

  // ─── Palletizer ──────────────────────────────────────────────
  private tickPalletizer(node: ProcessNode, stats: NodeStats, dt: number) {
    const palletSize = node.parameters.palletSize || 4;

    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'queued';
      stats.queue.push(product.id);
      stats.palletCount++;
    }

    if (stats.palletCount >= palletSize) {
      const outEdges = this.getOutEdges(node.id);
      if (outEdges.length > 0) {
        for (let i = 0; i < palletSize && stats.queue.length > 0; i++) {
          const pid = stats.queue.shift()!;
          const product = this.products.find(p => p.id === pid);
          if (product) this.sendProductAlongEdge(product, outEdges[0]);
        }
        stats.palletCount = Math.max(0, stats.palletCount - palletSize);
        stats.throughput++;
      }
    }

    if (stats.queue.length > 0) stats.busyTime += dt;
  }

  // ─── Edge travel (between nodes) ────────────────────────────
  private tickMovingProducts(dt: number) {
    for (const product of this.products) {
      if (product.state !== 'moving' || !product.currentEdgeId) continue;

      const edge = this.edges.find(e => e.id === product.currentEdgeId);
      if (!edge) continue;

      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      // Use belt speed from source conveyor, or default
      let speedMps = 2;
      if (CONVEYOR_TYPES.includes(fromNode.type)) {
        speedMps = (fromNode.parameters.beltSpeed || fromNode.parameters.speed || 20) / 60;
      }

      const fromPorts = getConnectionPorts(fromNode.type, fromNode.parameters);
      const toPorts = getConnectionPorts(toNode.type, toNode.parameters);
      // Only accept type-correct endpoints so stale/mismatched port ids don't break transfer.
      const fp = fromPorts.find(p => p.id === edge.fromPort && p.type === 'output')
        || fromPorts.find(p => p.type === 'output');
      const tp = toPorts.find(p => p.id === edge.toPort && p.type === 'input')
        || toPorts.find(p => p.type === 'input');
      if (!fp || !tp) continue;

      const start = getPortWorldPosition(fp.localPosition, fromNode);
      const end = getPortWorldPosition(tp.localPosition, toNode);

      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const dz = end[2] - start[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.01) {
        product.progress = 1;
      } else {
        product.progress += (speedMps * dt) / dist;
      }

      // Compute rotation from edge direction
      if (dist > 0.01) {
        product.currentTangent = [dx / dist, dy / dist, dz / dist];
        product.currentRotationY = Math.atan2(dx, dz);
      }

      if (product.progress >= 1) {
        product.progress = 1;
        product.state = 'at-node';
        product.currentNodeId = edge.to;
        product.currentEdgeId = null;
        product.currentPosition = [...end];
        product.conveyorEntryTime = null;
        const destNode = this.nodes.find(nn => nn.id === edge.to);
        if (destNode && ['cartesian-robot','cobot','robot-5axis','robot-6axis'].includes(destNode.type)) {
          console.log(`[ROBOT-ARRIVE] Product ${product.id.slice(0,8)} arrived at ${destNode.name} pos=[${end.map(v=>v.toFixed(2))}]`);
        }
      } else {
        // Interpolate along the edge path between start and end world positions
        product.currentPosition = [
          start[0] + dx * product.progress,
          start[1] + dy * product.progress,
          start[2] + dz * product.progress,
        ];
      }
    }
  }

  // ─── Vertical Lifter: products ride platform up/down ──────────
  private tickLift(node: ProcessNode, stats: NodeStats, dt: number) {
    const liftHeightM = (node.parameters.liftHeight || 3000) / 1000;
    const speedMps = (node.parameters.speed || 1);  // m/s
    const travelTime = liftHeightM / speedMps;
    const capacity = node.parameters.capacity || 1;

    // Accept arriving products
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      if (stats.queue.length < capacity) {
        product.state = 'queued';
        product.conveyorEntryTime = this.simTime;
        stats.queue.push(product.id);
      }
    }

    // Animate products on the lift platform
    const ports = getConnectionPorts(node.type, node.parameters);
    const inputPort = ports.find(p => p.type === 'input');
    const outputPort = ports.find(p => p.type === 'output');
    const infeedY = inputPort ? inputPort.localPosition[1] : 0.15;
    const outfeedY = outputPort ? outputPort.localPosition[1] : liftHeightM;

    const toRelease: string[] = [];
    for (const pid of stats.queue) {
      const product = this.products.find(p => p.id === pid);
      if (!product || !product.conveyorEntryTime) continue;

      const elapsed = this.simTime - product.conveyorEntryTime;
      const t = Math.min(1, elapsed / travelTime);

      // Product rides the platform from infeed Y to outfeed Y
      const currentY = infeedY + (outfeedY - infeedY) * t;
      product.currentPosition = [
        node.position[0],
        node.position[1] + currentY,
        node.position[2],
      ];

      if (t >= 1) toRelease.push(pid);
    }

    for (const pid of toRelease) {
      stats.queue = stats.queue.filter(id => id !== pid);
      const product = this.products.find(p => p.id === pid);
      if (product) {
        const outEdges = this.getOutEdges(node.id);
        if (outEdges.length > 0) {
          this.sendProductAlongEdge(product, outEdges[0]);
        } else {
          product.state = 'at-node';
        }
        stats.throughput++;
      }
    }

    if (stats.queue.length > 0) {
      stats.busyTime += dt;
      this.setFlowState(stats, 'running', dt);
    } else {
      this.setFlowState(stats, 'idle', dt);
    }
  }

  // ─── Robot: pick-and-place cycle ───────────────────────────────
  private tickRobotNode(node: ProcessNode, stats: NodeStats, dt: number) {
    const rState = this.robotStates.get(node.id);
    if (!rState) return;

    const pedH = node.parameters.pedestalEnabled ? (node.parameters.pedestalHeight || 0) / 1000 : 0;
    const bH = (node.parameters.baseHeight || 500) / 1000;
    const homeY = pedH + bH + 0.5;

    const config: RobotConfig = {
      cycleTime: node.parameters.cycleTime || 4,
      speedFactor: node.parameters.speedFactor || 1,
      approachHeight: 0.3,
      pickHeight: (node.parameters.pickHeight || 800) / 1000,
      placeHeight: (node.parameters.placeHeight || 800) / 1000,
      homePosition: [node.position[0], node.position[1] + homeY, node.position[2]],
    };

    // Resolve flow-aware pick/place anchors from actual connected edges and robot ports.
    const anchors = this.resolveRobotAnchors(node);
    rState.pickPosition = anchors.pickPosition;
    rState.placePosition = anchors.placePosition;

    // Find available product at pick source — accept arriving products into queue
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      if (!stats.queue.includes(product.id)) {
        product.state = 'queued';
        product.currentPosition = [...rState.pickPosition];
        stats.queue.push(product.id);
      }
    }

    // Only offer a product to the state machine when idle (ready for next cycle)
    let availableProductId: string | null = null;
    if (stats.queue.length > 0 && rState.phase === 'idle') {
      availableProductId = stats.queue[0];
    }
    // Also pass the in-flight target so pick phase can confirm it
    const targetId = (rState as any)._targetProductId as string | undefined;
    if (targetId && !availableProductId) {
      availableProductId = targetId;
    }

    // Tick the motion controller
    const placedId = tickRobot(rState, config, this.simTime, availableProductId);

    // If robot just gripped a product (entering retract-pick), take ownership
    if (rState.heldProductId && rState.phase === 'retract-pick' && rState.phaseProgress < 0.15) {
      const held = this.products.find(p => p.id === rState.heldProductId && p.state !== 'processing');
      if (held) {
        held.state = 'processing';
        held.currentNodeId = node.id;    // Now owned by robot
        held.currentEdgeId = null;
        held.stoppedBy = null;
        held.conveyorEntryTime = null;
        held.pathPosition = 0;
        // Remove from ALL queues
        stats.queue = stats.queue.filter(id => id !== rState.heldProductId);
        for (const [, ns] of this.nodeStats) {
          ns.queue = ns.queue.filter(id => id !== rState.heldProductId);
        }
      }
    }

    // Move held product to TCP position — only AFTER pick phase (physically gripping)
    // During approach-pick and pick, product stays at conveyor/queue position
    const GRIP_PHASES: string[] = ['retract-pick', 'move-to-place', 'approach-place', 'place', 'retract-place', 'return'];
    if (rState.heldProductId && GRIP_PHASES.includes(rState.phase)) {
      const held = this.products.find(p => p.id === rState.heldProductId);
      if (held) {
        const heldHalfHeight = (held.size?.[2] || 0.2) * 0.5;
        held.currentPosition = [
          rState.toolCenterPoint[0],
          rState.toolCenterPoint[1] - heldHalfHeight,
          rState.toolCenterPoint[2],
        ];
      }
    }

    // If robot just placed a product
    if (placedId) {
      const placed = this.products.find(p => p.id === placedId);
      if (placed) {
        // Check if place target is a pallet
        const outEdges = this.getOutEdges(node.id);
        let placedOnPallet = false;
        for (const edge of outEdges) {
          const palletState = this.palletStates.get(edge.to);
          const palletNode = this.nodes.find(n => n.id === edge.to);
          if (palletState && palletNode && !palletState.complete) {
            const slot = getNextSlotPosition(palletState, [
              (placed.size[0] * 1000), (placed.size[1] * 1000), (placed.size[2] * 1000),
            ]);
            if (slot) {
              placed.currentPosition = [
                palletNode.position[0] + slot.x,
                palletNode.position[1] + slot.y,
                palletNode.position[2] + slot.z,
              ];
              placed.currentRotationY = slot.rotationY;
              placed.currentTangent = [Math.sin(slot.rotationY), 0, Math.cos(slot.rotationY)];
              placed.state = 'completed';
              fillSlot(palletState, placedId);
              placedOnPallet = true;
            }
            break;
          }
        }
        if (!placedOnPallet) {
          // Place exactly at resolved outfeed target.
          placed.currentPosition = [...rState.placePosition];
          placed.currentTangent = [Math.sin(placed.currentRotationY), 0, Math.cos(placed.currentRotationY)];
          placed.currentEdgeId = null;
          if (anchors.preferredOutEdge) {
            // Transfer directly onto connected downstream node at its true input node.
            placed.state = 'at-node';
            placed.currentNodeId = anchors.preferredOutEdge.to;
            placed.pathPosition = 0;
            placed.conveyorEntryTime = null;
          } else {
            // No output edge — keep at placed location as completed.
            placed.state = 'completed';
            placed.currentNodeId = node.id;
          }
        }
        stats.throughput++;
      }
    }

    if (rState.phase !== 'idle') stats.busyTime += dt;
  }

  /** Resolve robot pick/place anchors from actual edge-connected robot ports. */
  private resolveRobotAnchors(node: ProcessNode): {
    pickPosition: [number, number, number];
    placePosition: [number, number, number];
    preferredOutEdge: ProcessEdge | null;
  } {
    const ports = getConnectionPorts(node.type, node.parameters);
    const inEdges = this.edges.filter(e => e.to === node.id);
    const outEdges = this.edges.filter(e => e.from === node.id);

    let pickPort = ports.find(p => p.id === 'pick') || ports.find(p => p.type === 'input');
    if (inEdges.length > 0) {
      const inEdge = inEdges.find(e => ports.some(p => p.id === e.toPort)) || inEdges[0];
      const edgePort = ports.find(p => p.id === inEdge.toPort);
      if (edgePort) pickPort = edgePort;
    }

    let placePort = ports.find(p => p.id === 'place') || ports.find(p => p.type === 'output');
    if (outEdges.length > 0) {
      const outEdge = outEdges.find(e => ports.some(p => p.id === e.fromPort)) || outEdges[0];
      const edgePort = ports.find(p => p.id === outEdge.fromPort);
      if (edgePort) placePort = edgePort;
    }

    const reach = (node.parameters.reach || node.parameters.reachX || 1400) / 1000;
    const pickFallback: [number, number, number] = [
      node.position[0] - reach * 0.4,
      node.position[1] + (node.parameters.pickHeight || 800) / 1000,
      node.position[2],
    ];
    const placeFallback: [number, number, number] = [
      node.position[0] + reach * 0.4,
      node.position[1] + (node.parameters.placeHeight || 800) / 1000,
      node.position[2],
    ];

    const pickPortWorld = pickPort ? getPortWorldPosition(pickPort.localPosition, node) : pickFallback;
    const placePortWorld = placePort ? getPortWorldPosition(placePort.localPosition, node) : placeFallback;

    // Use true connected node endpoints as source of truth where possible.
    // This removes generic side-offset behavior and forces node-to-node transfer.
    let pickPosition: [number, number, number] = pickPortWorld;
    if (inEdges.length > 0) {
      const edge = inEdges[0];
      const fromNode = this.nodes.find(n => n.id === edge.from);
      if (fromNode) {
        const fromPorts = getConnectionPorts(fromNode.type, fromNode.parameters);
        const fromPort = fromPorts.find(p => p.id === edge.fromPort) || fromPorts.find(p => p.type === 'output');
        if (fromPort) {
          pickPosition = getPortWorldPosition(fromPort.localPosition, fromNode);
        }
      }
    }

    let placePosition: [number, number, number] = placePortWorld;
    let preferredOutEdge: ProcessEdge | null = null;
    if (outEdges.length > 0) {
      preferredOutEdge = outEdges[0];
      const edge = preferredOutEdge;
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (toNode) {
        const toPorts = getConnectionPorts(toNode.type, toNode.parameters);
        const toPort = toPorts.find(p => p.id === edge.toPort) || toPorts.find(p => p.type === 'input');
        if (toPort) {
          placePosition = getPortWorldPosition(toPort.localPosition, toNode);
        }
      }
    }

    return { pickPosition, placePosition, preferredOutEdge };
  }

  // ─── Stopper: physically blocks products — reads sensor signals for triggers ───
  private tickStopper(node: ProcessNode, stats: NodeStats, dt: number) {
    const mode = node.parameters.stopperMode || 'always-stop';
    const enabled = node.parameters.enabled ?? true;
    const triggerTag = node.parameters.triggerSensorTag || node.parameters.sensorTag || '';
    const holdTime = node.parameters.holdTime || 3;
    const releaseCount = node.parameters.releaseCount || 1;
    const releaseDelay = node.parameters.releaseDelay || 0;
    const releaseCondition = node.parameters.releaseCondition || 'timed';
    const isMounted = !!node.parameters.parentConveyorId;
    const secondaryTag = node.parameters.secondarySensorTag || '';

    if (!enabled) {
      this.releaseAllStopped(node, stats);
      this.setFlowState(stats, 'idle', dt);
      return;
    }

    // ── Accept arriving products (edge-connected stoppers) ──
    if (!isMounted) {
      const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
      for (const product of arrived) {
        product.state = 'stopped';
        product.stoppedBy = node.id;
        product.blockedSince = this.simTime;
        this.addFlowEvent(stats, 'stopped', `Product ${product.id.slice(0, 8)} stopped`);
      }
    }
    // Note: mounted stoppers block products via the conveyor tick (path barrier)
    // Products on the conveyor get stoppedBy set in tickConveyor

    // Read trigger sensor signal
    const sensorSignal = triggerTag ? this.sensorSignals.get(triggerTag) : null;
    const sensorActive = sensorSignal?.active ?? false;
    const sensorActiveDuration = sensorActive ? (this.simTime - (sensorSignal?.activeSince || this.simTime)) : 0;

    // Collect all products stopped by this stopper
    const stopped = this.products.filter(p => p.stoppedBy === node.id);

    // Two-sensor mode re-arm: when secondary zone is occupied, arm exactly one next release.
    if (secondaryTag && releaseCondition === 'sensor-clear') {
      let ss = this.stopperState.get(node.id);
      if (!ss) {
        ss = {
          latched: false,
          lastReleaseTime: 0,
          cooldownSec: node.parameters.releaseDelay || 3,
          secondaryCycleArmed: true,
        };
        this.stopperState.set(node.id, ss);
      }
      const secActive = this.sensorSignals.get(secondaryTag)?.active ?? false;
      if (secActive) ss.secondaryCycleArmed = true;
    }

    // ── Determine if stopper should be ENGAGED (blocking) or RELEASED ──
    let shouldRelease = false;

    switch (mode) {
      case 'always-stop': {
        // Stop every product. Release based on releaseCondition.
        shouldRelease = this.checkReleaseCondition(releaseCondition, stopped, holdTime, releaseDelay, sensorActive, sensorActiveDuration, node);
        break;
      }
      case 'sensor-triggered': {
        // Stopper engages when trigger sensor goes TRUE.
        // Release based on releaseCondition.
        if (!triggerTag) {
          // No sensor linked — act as always-stop
          shouldRelease = this.checkReleaseCondition(releaseCondition, stopped, holdTime, releaseDelay, false, 0, node);
        } else {
          // Stopper is engaged while sensor is active (product detected)
          // Release when releaseCondition is met
          shouldRelease = this.checkReleaseCondition(releaseCondition, stopped, holdTime, releaseDelay, sensorActive, sensorActiveDuration, node);
        }
        break;
      }
      case 'timed-release': {
        // Stop all, release after holdTime seconds
        shouldRelease = this.checkReleaseCondition('timed', stopped, holdTime, releaseDelay, sensorActive, sensorActiveDuration, node);
        break;
      }
      case 'timed-batch': {
        // Stop all, release N at a time after holdTime
        if (stopped.length > 0) {
          const earliest = stopped.reduce((min, p) => Math.min(min, p.blockedSince || Infinity), Infinity);
          if (earliest < Infinity && (this.simTime - earliest) >= holdTime + releaseDelay) {
            const toRelease = stopped.slice(0, releaseCount);
            for (const p of toRelease) this.releaseProduct(p, node, stats);
          }
        }
        break;
      }
      case 'downstream-clear': {
        // Release when downstream has space
        const outEdges = this.getOutEdges(node.id);
        let clear = true;
        if (outEdges.length > 0) {
          const nextStats = this.nodeStats.get(outEdges[0].to);
          if (nextStats && nextStats.queue.length > 0) clear = false;
        }
        // Also check parent conveyor's output
        if (isMounted && node.parameters.parentConveyorId) {
          const convOutEdges = this.getOutEdges(node.parameters.parentConveyorId);
          if (convOutEdges.length > 0) {
            const downStats = this.nodeStats.get(convOutEdges[0].to);
            if (downStats && downStats.queue.length > 0) clear = false;
          }
        }
        if (clear && stopped.length > 0) {
          const toRelease = stopped.slice(0, releaseCount);
          for (const p of toRelease) this.releaseProduct(p, node, stats);
        }
        break;
      }
    }

    // Execute release
    if (shouldRelease && stopped.length > 0 && mode !== 'timed-batch') {
      const toRelease = stopped.slice(0, releaseCount);
      for (const p of toRelease) this.releaseProduct(p, node, stats);
    }

    const remainingStopped = this.products.filter(p => p.stoppedBy === node.id).length;
    if (remainingStopped > 0) {
      this.setFlowState(stats, 'stopped', dt);
      stats.stoppedTime += dt;
    } else {
      this.setFlowState(stats, 'idle', dt);
    }
  }


  /** Check if release condition is met for a stopper */
  private checkReleaseCondition(
    condition: string, stopped: Product[], holdTime: number, releaseDelay: number,
    sensorActive: boolean, sensorActiveDuration: number, node: ProcessNode,
  ): boolean {
    if (stopped.length === 0) return false;
    const earliest = stopped.reduce((min, p) => Math.min(min, p.blockedSince || Infinity), Infinity);
    const heldDuration = earliest < Infinity ? (this.simTime - earliest) : 0;

    switch (condition) {
      case 'timed':
        return heldDuration >= (holdTime + releaseDelay);
      case 'count':
        return stopped.length >= (node.parameters.stopCount || 1) && heldDuration >= releaseDelay;
      case 'downstream-clear': {
        const parentConvId = node.parameters.parentConveyorId;
        if (parentConvId) {
          const convOutEdges = this.getOutEdges(parentConvId);
          if (convOutEdges.length > 0) {
            const downStats = this.nodeStats.get(convOutEdges[0].to);
            if (downStats && downStats.queue.length > 0) return false;
          }
        }
        return heldDuration >= releaseDelay;
      }
      case 'sensor-clear':
        // One-sensor fallback: release when trigger sensor goes clear.
        // Two-sensor mode: release when trigger queue exists AND secondary zone is clear.
        {
          const secTag = node.parameters?.secondarySensorTag || '';
          if (!secTag) {
            return !sensorActive && heldDuration >= releaseDelay;
          }
          const secActive = this.sensorSignals.get(secTag)?.active ?? false;
          const queueExists = node.parameters?.triggerSensorTag ? sensorActive : true;
          const ss = this.stopperState.get(node.id);
          const cycleArmed = ss?.secondaryCycleArmed ?? true;
          return queueExists && !secActive && cycleArmed && heldDuration >= releaseDelay;
        }
      case 'sensor-dwell': {
        // Release when secondary sensor dwell threshold is met
        const secTag = node.parameters?.secondarySensorTag || '';
        if (secTag) {
          const secSignal = this.sensorSignals.get(secTag);
          if (secSignal?.active && secSignal.activeSince > 0) {
            const secNode = this.nodes.find(n => n.type === 'sensor' && n.parameters?.sensorTag === secTag);
            const secDwellThreshold = secNode?.parameters?.dwellTimeThreshold || 3;
            const secDwellSec = this.simTime - secSignal.activeSince;
            // sensor-dwell check runs each tick — only log when threshold met
            if (secDwellSec >= secDwellThreshold) console.log(`[STOPPER] sensor-dwell MET: ${secTag} dwell=${secDwellSec.toFixed(1)}s`);
            if (secDwellSec >= secDwellThreshold) return true;
          }
        }
        return false;
      }
      default:
        return heldDuration >= holdTime;
    }
  }

  private releaseProduct(product: Product, node: ProcessNode, stats: NodeStats) {
    const isMounted = !!node.parameters?.parentConveyorId;
    product.stoppedBy = null;
    product.blockedSince = null;
    // Update stopper state in engine map — clear latch + start cooldown
    const ss = this.stopperState.get(node.id);
    if (ss) {
      ss.latched = false;
      ss.lastReleaseTime = this.simTime;
      if ((node.parameters?.releaseCondition || '') === 'sensor-clear' && node.parameters?.secondarySensorTag) {
        ss.secondaryCycleArmed = false;
      }
    }
    this.addFlowEvent(stats, 'released', `Product ${product.id.slice(0, 8)} released`);

    if (isMounted) {
      // Mounted stopper: product stays on the conveyor, just unflagged
      // The conveyor tick will continue advancing it
      // Product state stays 'queued' — it's still on the conveyor
    } else {
      // Edge-connected stopper: route to next node
      product.state = 'at-node';
      const outEdges = this.getOutEdges(node.id);
      if (outEdges.length > 0) this.sendProductAlongEdge(product, outEdges[0]);
    }
  }

  private releaseAllStopped(node: ProcessNode, stats: NodeStats) {
    const stopped = this.products.filter(p => p.stoppedBy === node.id);
    for (const p of stopped) this.releaseProduct(p, node, stats);
  }

  // ─── Pusher: diverts/rejects products to alternate path ──────
  private tickPusher(node: ProcessNode, stats: NodeStats, dt: number) {
    const enabled = node.parameters.enabled ?? true;
    if (!enabled) { this.setFlowState(stats, 'idle', dt); return; }

    const pusherMode = node.parameters.pusherMode || 'reject-all';
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    const outEdges = this.getOutEdges(node.id);
    // Primary = first edge, divert = second edge
    const primaryEdge = outEdges[0];
    const divertEdge = outEdges.length > 1 ? outEdges[1] : null;

    for (const product of arrived) {
      let shouldDivert = false;

      switch (pusherMode) {
        case 'reject-all':
          shouldDivert = true;
          break;
        case 'divert-by-color': {
          const targetColor = node.parameters.targetColor || 'red';
          const colorLookup: Record<string, string> = { red: '#ef4444', blue: '#3b82f6', green: '#10b981', yellow: '#eab308', white: '#f5f5f5' };
          const resolvedColor = targetColor.startsWith('#') ? targetColor : (colorLookup[targetColor] || targetColor);
          shouldDivert = product.color === resolvedColor;
          break;
        }
        case 'divert-by-type': {
          const targetType = node.parameters.targetProductType || 'box';
          shouldDivert = product.type === targetType;
          break;
        }
        case 'divert-alternating': {
          shouldDivert = stats.throughput % 2 === 0;
          break;
        }
        default:
          shouldDivert = true;
      }

      if (shouldDivert && divertEdge) {
        this.sendProductAlongEdge(product, divertEdge);
      } else if (primaryEdge) {
        this.sendProductAlongEdge(product, primaryEdge);
      } else {
        product.state = 'completed';
      }
      stats.throughput++;
    }

    if (arrived.length > 0) stats.busyTime += dt;
    this.setFlowState(stats, arrived.length > 0 ? 'running' : 'idle', dt);
  }

  // ─── Accumulation Conveyor: zone-based buffering on belt ─────
  private tickAccumulationConveyor(node: ProcessNode, stats: NodeStats, dt: number) {
    // Accumulation mode: products queue up on the conveyor surface with spacing
    // instead of jamming at the output. Products stop in zones, then release in order.
    const lengthM = (node.parameters.length || 3000) / 1000;
    const speedMps = (node.parameters.beltSpeed || node.parameters.speed || 20) / 60;
    const zoneCount = node.parameters.accumulationZones || Math.max(2, Math.floor(lengthM / 0.5));
    const zoneLength = lengthM / zoneCount;

    // Accept arriving products
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'queued';
      product.conveyorEntryTime = this.simTime;
      stats.queue.push(product.id);
    }

    const ports = getConnectionPorts(node.type, node.parameters);
    const inputPort = ports.find(p => p.type === 'input');
    const outputPort = ports.find(p => p.type === 'output');

    // Check if output is blocked
    const outEdges = this.getOutEdges(node.id);
    let outputBlocked = false;
    if (outEdges.length > 0) {
      for (const edge of outEdges) {
        const ds = this.nodeStats.get(edge.to);
        const dn = this.nodes.find(n => n.id === edge.to);
        if (ds && dn) {
          if (dn.type === 'stopper' && (dn.parameters.engaged ?? true)) outputBlocked = true;
          if (ds.flowState === 'blocked' || ds.flowState === 'stopped') outputBlocked = true;
          if (dn.type === 'machine' && ds.processing) outputBlocked = true;
          if (dn.type === 'buffer' && ds.queue.length >= (dn.parameters.capacity || 10)) outputBlocked = true;
        }
      }
    } else {
      outputBlocked = true; // dead end
    }

    // Zone logic: each product occupies a zone, products accumulate from output end
    const toRelease: string[] = [];
    for (let qi = 0; qi < stats.queue.length; qi++) {
      const pid = stats.queue[qi];
      const product = this.products.find(p => p.id === pid);
      if (!product || !product.conveyorEntryTime) continue;

      const timeOnBelt = this.simTime - product.conveyorEntryTime;
      const travelTime = lengthM / speedMps;
      const naturalT = Math.min(1, timeOnBelt / travelTime);

      // Target zone position: front-most product goes to last zone (output end)
      // Products behind it stack up in preceding zones
      const reverseIndex = stats.queue.length - 1 - qi; // 0 = closest to output
      let targetT: number;

      if (outputBlocked) {
        // Accumulate: stack from output end backwards
        const zoneIndex = Math.min(reverseIndex, zoneCount - 1);
        targetT = 1.0 - (zoneIndex * zoneLength + zoneLength / 2) / lengthM;
        targetT = Math.max(0.05, targetT);
      } else {
        // Release: all products move toward output
        targetT = 1.0;
      }

      // Clamp to target (can't go past target, smooth approach)
      const t = Math.min(naturalT, targetT);

      // Position using transport path
      const accPath = createTransportPath(node.type, node.parameters);
      if (accPath) {
        product.currentPosition = accPath.getWorldPosition(t, node.position, node.rotation, node.scale);
      } else if (inputPort && outputPort) {
        const inWorld = getPortWorldPosition(inputPort.localPosition, node);
        const outWorld = getPortWorldPosition(outputPort.localPosition, node);
        product.currentPosition = [
          inWorld[0] + (outWorld[0] - inWorld[0]) * t,
          inWorld[1] + (outWorld[1] - inWorld[1]) * t,
          inWorld[2] + (outWorld[2] - inWorld[2]) * t,
        ];
      }

      if (t >= 0.99 && !outputBlocked) toRelease.push(pid);
    }

    for (const pid of toRelease) {
      stats.queue = stats.queue.filter(id => id !== pid);
      const product = this.products.find(p => p.id === pid);
      if (product) {
        const oe = this.getOutEdges(node.id);
        if (oe.length > 0) {
          this.sendProductAlongEdge(product, oe[0]);
        }
        stats.throughput++;
      }
    }

    if (stats.queue.length > 0) stats.busyTime += dt;
    this.evaluateConveyorFlowState(node, stats, dt);
  }

  // ─── Sensor: DETECTION ONLY — publishes signals, never stops products ───
  private tickSensor(node: ProcessNode, stats: NodeStats, dt: number) {
    const sensorTag = node.parameters?.sensorTag || '';
    const config = editorParamsToSensorConfig(node.parameters);
    const detectionRange = config.detectionRangeMm / 1000;
    const parentConveyorId = node.parameters?.parentConveyorId;
    const mountPosition = node.parameters?.mountPosition ?? 0.5;

    // Compute sensor world position from conveyor mount if mounted
    let sensorPos = node.position;
    if (parentConveyorId) {
      const convNode = this.nodes.find(n => n.id === parentConveyorId);
      if (convNode) {
        const path = createTransportPath(convNode.type, convNode.parameters);
        if (path) {
          const pt = path.getLocalPosition(mountPosition);
          // Transform to world coords (conveyor local → world)
          sensorPos = [
            convNode.position[0] + pt[0],
            convNode.position[1] + pt[1],
            convNode.position[2] + pt[2],
          ];
        }
      }
    }

    // For mounted sensors: use path position comparison (more reliable than world distance)
    const nearbyProducts = this.products.filter(p => {
      if (p.state === 'completed') return false;

      // Mounted sensor: compare pathPosition on parent conveyor
      if (parentConveyorId && p.currentNodeId === parentConveyorId && p.pathPosition !== undefined) {
        const convNode = this.nodes.find(n => n.id === parentConveyorId);
        if (convNode) {
          const pathLen = createTransportPath(convNode.type, convNode.parameters)?.length
            || ((convNode.parameters.length || 3000) / 1000);
          const halfProductT = ((p.productLength || 0.3) / 2) / pathLen;
          const sensorT = mountPosition;
          // Product front edge is pathPosition + halfProductT, rear is pathPosition - halfProductT
          // Sensor detects if product overlaps the sensor's path position
          const detectionT = Math.max(0.05, (detectionRange / 2) / pathLen); // detection zone in path coords
          return Math.abs(p.pathPosition - sensorT) < (halfProductT + detectionT);
        }
      }

      // Fallback: world-space proximity
      const effectiveRange = parentConveyorId ? Math.max(detectionRange, 0.6) : detectionRange;
      const dx = p.currentPosition[0] - sensorPos[0];
      const dz = p.currentPosition[2] - sensorPos[2];
      return Math.sqrt(dx * dx + dz * dz) < effectiveRange;
    });

    // Evaluate sensor logic
    let sState = this.sensorStates.get(node.id);
    if (sState) {
      try {
        const events = evaluateSensor(node.id, sensorPos, config, sState, nearbyProducts, this.simTime);
        for (const evt of events) {
          this.pendingSensorEvents.push(evt);
          this.addFlowEvent(stats, 'sensor-trigger', `${evt.type}: ${evt.productId?.slice(0, 8) || 'zone'}`);
        }
      } catch (e) {
        console.warn('Sensor evaluation error:', node.id, e);
      }
    }

    const nearbyProduct = nearbyProducts[0] || null;
    const wasActive = stats.processing;

    // Publish sensor signal to the signal registry (by tag)
    if (sensorTag) {
      const prevSignal = this.sensorSignals.get(sensorTag);
      const isActive = nearbyProduct !== null;
      if (isActive) {
        this.sensorSignals.set(sensorTag, {
          active: true,
          productId: nearbyProduct.id,
          productColor: (nearbyProduct as any).color || null,
          productType: (nearbyProduct as any).productType || null,
          activeSince: (prevSignal?.active && prevSignal.activeSince > 0) ? prevSignal.activeSince : this.simTime,
        });
      } else {
        this.sensorSignals.set(sensorTag, {
          active: false, productId: null, productColor: null, productType: null,
          activeSince: 0,
        });
      }
    }

    // Update stats (sensor is detection-only — no physical effect on products)
    if (nearbyProduct) {
      stats.processing = true;
      stats.currentProductId = nearbyProduct.id;
      if (!wasActive) this.addFlowEvent(stats, 'sensor-trigger', `Detected ${nearbyProduct.id.slice(0, 8)}`);
      this.setFlowState(stats, 'running', dt);
      stats.busyTime += dt;
    } else {
      stats.processing = false;
      stats.currentProductId = null;
      if (wasActive) this.addFlowEvent(stats, 'sensor-clear', 'Zone clear');
      this.setFlowState(stats, 'idle', dt);
    }

    // ── Dwell event logic (fires ONCE per cycle) ──
    const dwellThreshold = node.parameters?.dwellTimeThreshold || 0;
    const onDwellEvent = node.parameters?.onDwellEvent || 'none';
    if (dwellThreshold > 0 && onDwellEvent !== 'none' && sensorTag) {
      const signal = this.sensorSignals.get(sensorTag);
      if (signal?.active && signal.activeSince > 0) {
        const dwellSec = this.simTime - signal.activeSince;
        const alreadyFired = this.sensorDwellFired.get(node.id) ?? false;
        
        if (dwellSec >= dwellThreshold && !alreadyFired) {
          // Fire dwell event ONCE
          this.sensorDwellFired.set(node.id, true);
          console.log(`[DWELL-FIRE] ${sensorTag} dwell=${dwellSec.toFixed(1)}s → EVENT: ${onDwellEvent}`);
          
          if (onDwellEvent === 'release-stopper' || onDwellEvent === 'stop-source-and-release') {
            for (const n of this.nodes) {
              if (n.type === 'stopper' && (n.parameters?.secondarySensorTag === sensorTag || n.parameters?.triggerSensorTag === sensorTag)) {
                // Release ALL stopped products
                const stopped = this.products.filter(p => p.stoppedBy === n.id);
                const nStats = this.nodeStats.get(n.id);
                if (nStats) {
                  for (const p of stopped) this.releaseProduct(p, n, nStats);
                }
                // Clear the latch and set cooldown via engine state
                const sss = this.stopperState.get(n.id);
                if (sss) { sss.latched = false; sss.lastReleaseTime = this.simTime; }
                console.log(`[DWELL-FIRE] Released ${stopped.length} from ${n.parameters?.stopperTag}, latch=false, cooldown started`);
              }
            }
          }
        }
      } else {
        // Sensor went FALSE — reset dwell fired flag for next cycle
        if (this.sensorDwellFired.get(node.id)) {
          console.log(`[DWELL-RESET] ${sensorTag} sensor cleared, ready for next cycle`);
          this.sensorDwellFired.set(node.id, false);
        }
      }
    }
  }

  // ─── Flow state management ───────────────────────────────────
  private setFlowState(stats: NodeStats, newState: FlowState, _dt: number) {
    if (stats.flowState !== newState) {
      stats.lastFlowStateChange = this.simTime;
      stats.flowState = newState;
    }
  }

  private addFlowEvent(stats: NodeStats, type: FlowEvent['type'], detail?: string) {
    stats.events.push({ time: this.simTime, type, nodeId: stats.nodeId, detail });
    if (stats.events.length > MAX_FLOW_EVENTS) {
      stats.events = stats.events.slice(-MAX_FLOW_EVENTS);
    }
  }

  /** Evaluate flow state for conveyors: blocked if output is full, starved if input is empty */
  private evaluateConveyorFlowState(node: ProcessNode, stats: NodeStats, dt: number) {
    const outEdges = this.getOutEdges(node.id);
    const inEdges = this.edges.filter(e => e.to === node.id);

    // Track peak queue
    if (stats.queue.length > stats.peakQueueLength) {
      stats.peakQueueLength = stats.queue.length;
    }

    // Check if output is blocked (downstream full/stopped)
    let outputBlocked = false;
    if (outEdges.length > 0) {
      for (const edge of outEdges) {
        const downstreamStats = this.nodeStats.get(edge.to);
        const downstreamNode = this.nodes.find(n => n.id === edge.to);
        if (downstreamStats && downstreamNode) {
          // Blocked if downstream is a machine that is processing, or a buffer at capacity
          if (downstreamNode.type === 'machine' && downstreamStats.processing) {
            outputBlocked = true;
          }
          if (downstreamNode.type === 'buffer') {
            const cap = downstreamNode.parameters.capacity || 10;
            if (downstreamStats.queue.length >= cap) outputBlocked = true;
          }
          if (downstreamNode.type === 'stopper' && (downstreamNode.parameters.engaged ?? true)) {
            outputBlocked = true;
          }
          if (downstreamStats.flowState === 'blocked' || downstreamStats.flowState === 'stopped') {
            outputBlocked = true;
          }
        }
      }
    } else {
      // No output — dead end → blocked if there are products
      if (stats.queue.length > 0) outputBlocked = true;
    }

    // Starved = has input edges but queue is empty and has been for a while
    const isStarved = inEdges.length > 0 && stats.queue.length === 0 && this.simTime > 2;

    const prevState = stats.flowState;

    if (outputBlocked && stats.queue.length > 0) {
      this.setFlowState(stats, 'blocked', dt);
      stats.blockedTime += dt;
      if (prevState !== 'blocked') {
        stats.totalItemsBlocked += stats.queue.length;
        this.addFlowEvent(stats, 'blocked', `Queue: ${stats.queue.length}, downstream full`);
      }
    } else if (isStarved) {
      this.setFlowState(stats, 'starved', dt);
      stats.starvedTime += dt;
      if (prevState !== 'starved') {
        this.addFlowEvent(stats, 'starved', 'No incoming products');
      }
    } else if (stats.queue.length > 0) {
      if (prevState === 'blocked') this.addFlowEvent(stats, 'unblocked', 'Flow resumed');
      if (prevState === 'starved') this.addFlowEvent(stats, 'fed', 'Product received');
      this.setFlowState(stats, 'running', dt);
    } else {
      this.setFlowState(stats, 'idle', dt);
    }
  }

  // ─── Helpers ─────────────────────────────────────────────────
  private createProduct(node: ProcessNode): Product {
    const productColor = node.parameters.productColor || 'brown';
    let color: string;
    if (productColor === 'random') {
      color = RANDOM_COLORS[this.colorIndex % RANDOM_COLORS.length];
      this.colorIndex++;
    } else {
      color = COLOR_MAP[productColor] || COLOR_MAP.brown;
    }

    const pL = (node.parameters.productLength || 300) / 1000;
    const pW = (node.parameters.productWidth || 200) / 1000;
    const pH = (node.parameters.productHeight || 150) / 1000;

    return {
      id: uuidv4(),
      type: node.parameters.productType || 'box',
      color,
      size: [pL, pW, pH],
      currentPosition: [...node.position] as [number, number, number],
      currentRotationY: 0,
      currentTangent: [0, 0, 1],
      targetPosition: [0, 0, 0],
      progress: 0,
      currentNodeId: node.id,
      currentEdgeId: null,
      state: 'at-node',
      createdAt: this.simTime,
      completedAt: null,
      conveyorEntryTime: null,
      blockedSince: null,
      stoppedBy: null,
      pathPosition: 0,
      productLength: pL,
      textureUrl: node.parameters.productTextureUrl || undefined,
      label: node.parameters.productLabel || undefined,
      labelColor: node.parameters.labelColor || '#ffffff',
      labelFontSize: node.parameters.labelFontSize || 64,
    };
  }

  private sendProductAlongEdge(product: Product, edge: ProcessEdge) {
    product.state = 'moving';
    product.currentEdgeId = edge.id;
    product.progress = 0;
    product.conveyorEntryTime = null;
  }

  private getOutEdges(nodeId: string): ProcessEdge[] {
    return this.edges.filter(e => e.from === nodeId);
  }

  /**
   * Returns transfer-capable out edges for a node.
   * Edges authored against stale port ids are kept as fallback, but edges that
   * explicitly reference an input port are deprioritized when better options exist.
   */
  private getTransferOutEdges(node: ProcessNode): ProcessEdge[] {
    const outEdges = this.getOutEdges(node.id);
    if (outEdges.length <= 1) return outEdges;

    const ports = getConnectionPorts(node.type, node.parameters);
    const portTypeById = new Map(ports.map(p => [p.id, p.type] as const));
    const preferred = outEdges.filter(edge => {
      if (!edge.fromPort) return true;
      return portTypeById.get(edge.fromPort) !== 'input';
    });
    return preferred.length > 0 ? preferred : outEdges;
  }

  getProducts(): Product[] {
    return this.products;
  }

  getRobotStates(): Map<string, RobotState> {
    return this.robotStates;
  }

  getPalletStates(): Map<string, PalletState> {
    return this.palletStates;
  }

  getSensorSignals(): Map<string, { active: boolean; productId: string | null }> {
    return this.sensorSignals;
  }

  getNodeStats(): Map<string, NodeStats> {
    return this.nodeStats;
  }

  getStats() {
    let totalThroughput = 0;
    let totalCycleTime = 0;
    let completedCount = 0;
    const machineUtils: { nodeId: string; name: string; utilization: number }[] = [];
    const bufferLevels: { nodeId: string; name: string; level: number; capacity: number }[] = [];

    for (const node of this.nodes) {
      const stats = this.nodeStats.get(node.id)!;
      if (node.type === 'sink') totalThroughput += stats.throughput;
      if (node.type === 'machine' || node.type === 'pick-and-place') {
        machineUtils.push({ nodeId: node.id, name: node.name, utilization: stats.utilization });
      }
      if (node.type === 'buffer') {
        bufferLevels.push({
          nodeId: node.id, name: node.name,
          level: stats.queueLength, capacity: node.parameters.capacity || 10,
        });
      }
    }

    const completed = this.products.filter(p => p.completedAt !== null);
    for (const p of completed) {
      totalCycleTime += (p.completedAt! - p.createdAt);
      completedCount++;
    }

    const bottleneck = machineUtils.length > 0
      ? machineUtils.reduce((a, b) => a.utilization > b.utilization ? a : b) : null;

    // Flow state summary
    const flowStates: { nodeId: string; name: string; state: FlowState; blockedPct: number; starvedPct: number }[] = [];
    for (const node of this.nodes) {
      const stats = this.nodeStats.get(node.id)!;
      if (CONVEYOR_TYPES.includes(node.type) || node.type === 'machine' || node.type === 'buffer') {
        flowStates.push({
          nodeId: node.id,
          name: node.name,
          state: stats.flowState,
          blockedPct: stats.totalTime > 0 ? (stats.blockedTime / stats.totalTime) * 100 : 0,
          starvedPct: stats.totalTime > 0 ? (stats.starvedTime / stats.totalTime) * 100 : 0,
        });
      }
    }

    // OEE calculation (simplified)
    // Availability = time NOT blocked/stopped / total time
    // Performance = actual throughput / theoretical max throughput
    // Quality = 100% (no rejection tracking yet)
    let totalAvailability = 0;
    let machineCount = 0;
    for (const node of this.nodes) {
      const stats = this.nodeStats.get(node.id)!;
      if (node.type === 'machine' || node.type === 'pick-and-place') {
        const avail = stats.totalTime > 0 ? 1 - (stats.blockedTime + stats.stoppedTime) / stats.totalTime : 1;
        totalAvailability += avail;
        machineCount++;
      }
    }
    const avgAvailability = machineCount > 0 ? totalAvailability / machineCount : 1;
    const avgUtilization = machineUtils.length > 0 ? machineUtils.reduce((s, m) => s + m.utilization, 0) / machineUtils.length : 0;
    const oee = avgAvailability * avgUtilization * 1; // quality = 1 for now

    // Sensor/Stopper/Pusher counts
    const sensorCount = this.nodes.filter(n => n.type === 'sensor').length;
    const stopperCount = this.nodes.filter(n => n.type === 'stopper').length;
    const pusherCount = this.nodes.filter(n => n.type === 'pusher').length;
    const activeRules = this.rules.length;

    return {
      totalThroughput,
      throughputPerMin: this.simTime > 0 ? (totalThroughput / this.simTime) * 60 : 0,
      avgCycleTime: completedCount > 0 ? totalCycleTime / completedCount : 0,
      machineUtils,
      bufferLevels,
      bottleneck,
      simTime: this.simTime,
      productCount: this.products.length,
      completedCount,
      flowStates,
      oee: oee * 100,
      avgAvailability: avgAvailability * 100,
      avgUtilization: avgUtilization * 100,
      sensorCount,
      stopperCount,
      pusherCount,
      activeRules,
    };
  }
}

export const simulationEngine = new SimulationEngine();
