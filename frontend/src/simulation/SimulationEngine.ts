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

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
  white: '#f5f5f5',
};
const RANDOM_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const CONVEYOR_TYPES = ['conveyor', 'belt-conveyor', 'roller-conveyor', 'bend-conveyor', 'modular-conveyor-straight', 'modular-conveyor-90-curve', 'modular-conveyor-45-curve', 'spiral-conveyor', 'incline-conveyor'];
const MAX_FLOW_EVENTS = 200; // cap event log size

export class SimulationEngine {
  products: Product[] = [];
  nodeStats: Map<string, NodeStats> = new Map();
  robotStates: Map<string, RobotState> = new Map();
  palletStates: Map<string, PalletState> = new Map();
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
        const reach = (node.parameters.reach || node.parameters.reachX || 1400) / 1000;
        const pickH = (node.parameters.pickHeight || 800) / 1000;
        const placeH = (node.parameters.placeHeight || 800) / 1000;

        // Find pick source: input edge → source node position, or default to left side of robot
        const inEdges = edges.filter(e => e.to === node.id);
        const outEdges = edges.filter(e => e.from === node.id);
        if (inEdges.length > 0) {
          const srcNode = nodes.find(n => n.id === inEdges[0].from);
          if (srcNode) {
            rState.pickPosition = [srcNode.position[0], pickH, srcNode.position[2]];
          }
        }
        if (!rState.pickPosition) {
          // Default: pick from left side at reach distance
          rState.pickPosition = [node.position[0] - reach * 0.4, pickH, node.position[2]];
        }

        // Find place target: output edge → target node position, or default to right side
        if (outEdges.length > 0) {
          const tgtNode = nodes.find(n => n.id === outEdges[0].to);
          if (tgtNode) {
            rState.placePosition = [tgtNode.position[0], placeH, tgtNode.position[2]];
          }
        }
        if (!rState.placePosition) {
          // Default: place to right side at reach distance
          rState.placePosition = [node.position[0] + reach * 0.4, placeH, node.position[2]];
        }

        this.robotStates.set(node.id, rState);
      }

      // Init pallet states
      const PALLET_TYPES = ['eur-pallet', 'standard-pallet', 'custom-pallet'];
      if (PALLET_TYPES.includes(node.type)) {
        const def = paramsToPalletDef(node.parameters);
        this.palletStates.set(node.id, createPalletState(def));
      }
    }
  }

  reset() {
    this.products = [];
    this.simTime = 0;
    this.robotStates.clear();
    this.palletStates.clear();
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

    for (const node of this.nodes) {
      const stats = this.nodeStats.get(node.id)!;
      stats.totalTime = this.simTime;

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
        case 'sensor': this.tickSensor(node, stats, elapsed); break;
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

      if (stats.totalTime > 0) {
        stats.utilization = stats.busyTime / stats.totalTime;
      }
      stats.queueLength = stats.queue.length;
    }

    this.tickMovingProducts(elapsed);

    // Cleanup completed products that left the system
    this.products = this.products.filter(p => p.state !== 'completed' || (this.simTime - (p.completedAt || 0)) < 2);
  }

  // ─── Source: spawn products ──────────────────────────────────
  private tickSource(node: ProcessNode, stats: NodeStats, _dt: number) {
    const ppm = node.parameters.spawnRate || node.parameters.ppm || 30;
    const interval = 60 / ppm;
    const maxItems = node.parameters.maxItems || 0;

    if (maxItems > 0 && stats.throughput >= maxItems) return;

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
    const MIN_GAP_M = 0.03; // 30mm minimum gap between products

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
    const outEdges = this.getOutEdges(node.id);
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

      targetPos = Math.max(0, Math.min(1, targetPos));
      product.pathPosition = targetPos;

      // This product's rear edge is the boundary for the next (trailing) product
      prevFrontEdge = targetPos - halfLenT;

      // Convert 1D path position to 3D world position
      const t = product.pathPosition;
      if (path) {
        product.currentPosition = path.getWorldPosition(t, node.position, node.rotation, node.scale);
        const tangent = path.getWorldTangent(t, node.rotation);
        product.currentRotationY = Math.atan2(tangent[0], tangent[2]);
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
          const dz = outWorld[2] - inWorld[2];
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
    const processingTime = node.parameters.processingTime || 2;

    if (stats.processing && stats.processEndTime !== null && this.simTime >= stats.processEndTime) {
      const product = this.products.find(p => p.id === stats.currentProductId);
      if (product) {
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
      stats.throughput++;
    }

    if (!stats.processing && stats.queue.length > 0) {
      const pid = stats.queue.shift()!;
      const product = this.products.find(p => p.id === pid);
      if (product) {
        product.state = 'processing';
        product.currentPosition = [...node.position];
        stats.processing = true;
        stats.currentProductId = pid;
        stats.processEndTime = this.simTime + processingTime;
      }
    }

    if (stats.processing) stats.busyTime += dt;

    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'queued';
      stats.queue.push(product.id);
    }

    // Flow state: blocked if queue is building up, starved if empty and waiting
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
      const fp = fromPorts.find(p => p.id === edge.fromPort);
      const tp = toPorts.find(p => p.id === edge.toPort);
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
        product.currentRotationY = Math.atan2(dx, dz);
      }

      if (product.progress >= 1) {
        product.progress = 1;
        product.state = 'at-node';
        product.currentNodeId = edge.to;
        product.currentEdgeId = null;
        product.currentPosition = [...end];
        product.conveyorEntryTime = null;
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

    // Find available product at pick source — accept arriving products into queue
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      if (!stats.queue.includes(product.id)) {
        product.state = 'queued';
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
        held.currentPosition = [...rState.toolCenterPoint];
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
              placed.state = 'completed';
              fillSlot(palletState, placedId);
              placedOnPallet = true;
            }
            break;
          }
        }
        if (!placedOnPallet) {
          // Send to next node — could be a conveyor, buffer, or other target
          if (outEdges.length > 0) {
            placed.pathPosition = 0;  // Start at beginning of destination
            placed.conveyorEntryTime = null;
            this.sendProductAlongEdge(placed, outEdges[0]);
          } else {
            // No output edge — place at robot's place position
            placed.state = 'completed';
            placed.currentPosition = [...rState.toolCenterPoint];
          }
        }
        stats.throughput++;
      }
    }

    if (rState.phase !== 'idle') stats.busyTime += dt;
  }

  // ─── Stopper: blocks product flow ─────────────────────────────
  private tickStopper(node: ProcessNode, stats: NodeStats, dt: number) {
    const mode = node.parameters.stopperMode || 'timed-auto';
    const enabled = node.parameters.enabled ?? true;
    const holdTime = node.parameters.holdTime || 3;
    const releaseCount = node.parameters.releaseCount || 1;
    const openDuration = node.parameters.openDuration || 2;

    if (!enabled) {
      this.releaseAllStopped(node, stats);
      this.setFlowState(stats, 'idle', dt);
      return;
    }

    // Accept arriving products
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'stopped';
      product.stoppedBy = node.id;
      product.blockedSince = this.simTime;
      this.addFlowEvent(stats, 'stopped', `Product ${product.id.slice(0, 8)} stopped`);
    }

    const stopped = this.products.filter(p => p.stoppedBy === node.id);

    switch (mode) {
      case 'timed-auto': {
        // Mode A: Stop → hold X seconds → release all → repeat
        for (const p of stopped) {
          if (p.blockedSince && (this.simTime - p.blockedSince) >= holdTime) {
            this.releaseProduct(p, node, stats);
          }
        }
        break;
      }
      case 'timed-release-n':
      case 'timed-batch': {
        // Mode B: Stop → hold X seconds → release N products → stop again
        if (stats.processEndTime === null && stopped.length > 0) {
          // Start hold timer from first product arrival
          const earliest = stopped.reduce((min, p) => Math.min(min, p.blockedSince || Infinity), Infinity);
          if (earliest < Infinity) stats.processEndTime = earliest + holdTime;
        }
        if (stats.processEndTime !== null && this.simTime >= stats.processEndTime) {
          const toRelease = stopped.slice(0, releaseCount);
          for (const p of toRelease) this.releaseProduct(p, node, stats);
          stats.processEndTime = null; // Reset timer for next batch
        }
        break;
      }
      case 'sensor-triggered':
      case 'sensor-release': {
        // Mode C: Accumulate → sensor tag goes TRUE → release all
        const sensorTag = node.parameters.sensorTag || '';
        if (sensorTag) {
          // Find the sensor node by tag
          const sensorNode = this.nodes.find(n =>
            n.type === 'sensor' && n.parameters.sensorTag === sensorTag
          );
          if (sensorNode) {
            const sensorStats = this.nodeStats.get(sensorNode.id);
            // Sensor is "triggered" if a product is within its detection zone
            const triggered = sensorStats && sensorStats.processing;
            if (triggered) {
              this.releaseAllStopped(node, stats);
            }
          }
        }
        break;
      }
      case 'external-trigger': {
        // Mode D: Stay closed until engaged=false (toggled by user/rule)
        const engaged = node.parameters.engaged ?? true;
        if (!engaged) {
          this.releaseAllStopped(node, stats);
          node.parameters.engaged = true; // Re-engage after release
        }
        break;
      }
      case 'pulse-open': {
        // Mode E: Open for X seconds, then close again
        if (stats.processEndTime === null && stopped.length > 0) {
          const earliest = stopped.reduce((min, p) => Math.min(min, p.blockedSince || Infinity), Infinity);
          if (earliest < Infinity) stats.processEndTime = earliest + holdTime;
        }
        if (stats.processEndTime !== null && this.simTime >= stats.processEndTime) {
          // Open window: release products for openDuration seconds
          const windowEnd = stats.processEndTime + openDuration;
          if (this.simTime < windowEnd) {
            // Window is open — release as they arrive
            for (const p of stopped) this.releaseProduct(p, node, stats);
          } else {
            // Window closed — reset timer
            stats.processEndTime = null;
          }
        }
        break;
      }
      case 'downstream-clear': {
        // Mode F: Release only when downstream conveyor/node has space
        const outEdges = this.getOutEdges(node.id);
        let downstreamClear = true;
        if (outEdges.length > 0) {
          const nextNodeId = outEdges[0].to;
          const nextStats = this.nodeStats.get(nextNodeId);
          if (nextStats && nextStats.queue.length > 0) {
            downstreamClear = false;
          }
        }
        if (downstreamClear && stopped.length > 0) {
          this.releaseProduct(stopped[0], node, stats);
        }
        break;
      }
      default: {
        // Fallback: timed auto
        for (const p of stopped) {
          if (p.blockedSince && (this.simTime - p.blockedSince) >= holdTime) {
            this.releaseProduct(p, node, stats);
          }
        }
      }
    }

    const remainingStopped = this.products.filter(p => p.stoppedBy === node.id).length;
    if (remainingStopped > 0) {
      this.setFlowState(stats, 'stopped', dt);
      stats.stoppedTime += dt;
    } else {
      this.setFlowState(stats, 'idle', dt);
    }
  }


  private releaseProduct(product: Product, node: ProcessNode, stats: NodeStats) {
    product.state = 'at-node';
    product.stoppedBy = null;
    product.blockedSince = null;
    this.addFlowEvent(stats, 'released', `Product ${product.id.slice(0, 8)} released`);
    // Send to next node
    const outEdges = this.getOutEdges(node.id);
    if (outEdges.length > 0) this.sendProductAlongEdge(product, outEdges[0]);
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

  // ─── Sensor: detects product presence ────────────────────────
  private tickSensor(node: ProcessNode, stats: NodeStats, dt: number) {
    // Check if any product is near the sensor position
    const sensorPos = node.position;
    const detectionRange = 0.3; // 300mm detection zone
    const nearbyProduct = this.products.find(p => {
      if (p.state === 'completed') return false;
      const dx = p.currentPosition[0] - sensorPos[0];
      const dz = p.currentPosition[2] - sensorPos[2];
      return Math.sqrt(dx * dx + dz * dz) < detectionRange;
    });

    const wasTrigger = stats.processing;
    if (nearbyProduct) {
      stats.processing = true;
      stats.currentProductId = nearbyProduct.id;
      if (!wasTrigger) {
        this.addFlowEvent(stats, 'sensor-trigger', `Detected product ${nearbyProduct.id.slice(0, 8)}`);
      }
      this.setFlowState(stats, 'running', dt);
      stats.busyTime += dt;
    } else {
      stats.processing = false;
      stats.currentProductId = null;
      if (wasTrigger) {
        this.addFlowEvent(stats, 'sensor-clear', 'Detection zone clear');
      }
      this.setFlowState(stats, 'idle', dt);
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

  getProducts(): Product[] {
    return this.products;
  }

  getRobotStates(): Map<string, RobotState> {
    return this.robotStates;
  }

  getPalletStates(): Map<string, PalletState> {
    return this.palletStates;
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

    return {
      totalThroughput,
      throughputPerMin: this.simTime > 0 ? (totalThroughput / this.simTime) * 60 : 0,
      avgCycleTime: completedCount > 0 ? totalCycleTime / completedCount : 0,
      machineUtils,
      bufferLevels,
      bottleneck,
      simTime: this.simTime,
      productCount: this.products.length,
      flowStates,
    };
  }
}

export const simulationEngine = new SimulationEngine();
