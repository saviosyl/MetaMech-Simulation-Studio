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

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
  white: '#f5f5f5',
};
const RANDOM_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

const CONVEYOR_TYPES = ['conveyor', 'belt-conveyor', 'roller-conveyor', 'bend-conveyor'];
const MAX_FLOW_EVENTS = 200; // cap event log size

export class SimulationEngine {
  products: Product[] = [];
  nodeStats: Map<string, NodeStats> = new Map();
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
    }
  }

  reset() {
    this.products = [];
    this.simTime = 0;
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
          if (node.parameters.accumulationMode) {
            this.tickAccumulationConveyor(node, stats, elapsed);
          } else {
            this.tickConveyor(node, stats, elapsed);
          }
          break;
        case 'machine': this.tickMachine(node, stats, elapsed); break;
        case 'buffer': this.tickBuffer(node, stats); break;
        case 'sink': this.tickSink(node, stats); break;
        case 'router': this.tickRouter(node, stats); break;
        case 'pick-and-place': this.tickMachine(node, stats, elapsed); break;
        case 'palletizer': this.tickPalletizer(node, stats, elapsed); break;
        case 'stopper': this.tickStopper(node, stats, elapsed); break;
        case 'sensor': this.tickSensor(node, stats, elapsed); break;
        case 'vertical-lifter': this.tickLift(node, stats, elapsed); break;
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
    // Accept arriving products — stagger entry times so they don't overlap
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    const path = createTransportPath(node.type, node.parameters);
    const speedMps = (node.parameters.beltSpeed || node.parameters.speed || 20) / 60;
    const pathLen = path ? path.length : ((node.parameters.length || 3000) / 1000);
    const travelTime = pathLen / speedMps;

    // Minimum spacing: product length + gap (in time units along path)
    const productSpacingM = 0.35; // ~350mm minimum gap between products
    const spacingTime = productSpacingM / speedMps;

    for (const product of arrived) {
      // Stagger: if there are products already on this belt, ensure min spacing
      let entryTime = this.simTime;
      if (stats.queue.length > 0) {
        const lastPid = stats.queue[stats.queue.length - 1];
        const lastProduct = this.products.find(p => p.id === lastPid);
        if (lastProduct && lastProduct.conveyorEntryTime !== null) {
          const earliestEntry = lastProduct.conveyorEntryTime + spacingTime;
          if (entryTime < earliestEntry) {
            entryTime = earliestEntry;
          }
        }
      }
      product.state = 'queued';
      product.conveyorEntryTime = entryTime;
      stats.queue.push(product.id);
    }

    const toRelease: string[] = [];
    for (const pid of stats.queue) {
      const product = this.products.find(p => p.id === pid);
      if (!product || !product.conveyorEntryTime) continue;

      const timeOnBelt = this.simTime - product.conveyorEntryTime;
      if (timeOnBelt < 0) continue; // not yet entered (stagger delay)

      const t = Math.min(1, timeOnBelt / travelTime);

      // Use transport path for accurate positioning (handles inclines, curves, spirals)
      if (path) {
        product.currentPosition = path.getWorldPosition(t, node.position, node.rotation, node.scale);

        // Compute rotation from path tangent — key for bend/spiral conveyors
        const tangent = path.getWorldTangent(t, node.rotation);
        product.currentRotationY = Math.atan2(tangent[0], tangent[2]);
      } else {
        // Fallback for unknown conveyor types: use port interpolation
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
          // Compute rotation from port-to-port direction
          const dx = outWorld[0] - inWorld[0];
          const dz = outWorld[2] - inWorld[2];
          product.currentRotationY = Math.atan2(dx, dz);
        }
      }

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

  // ─── Stopper: blocks product flow ─────────────────────────────
  private tickStopper(node: ProcessNode, stats: NodeStats, dt: number) {
    const engaged = node.parameters.engaged ?? true;
    const enabled = node.parameters.enabled ?? true;

    if (!enabled || !engaged) {
      // Release any stopped products
      const stopped = this.products.filter(p => p.stoppedBy === node.id);
      for (const product of stopped) {
        product.state = 'queued';
        product.stoppedBy = null;
        this.addFlowEvent(stats, 'released', `Product ${product.id.slice(0, 8)} released`);
      }
      this.setFlowState(stats, 'idle', dt);
      return;
    }

    // Stop arriving products
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'stopped';
      product.stoppedBy = node.id;
      product.blockedSince = this.simTime;
      this.addFlowEvent(stats, 'stopped', `Product ${product.id.slice(0, 8)} stopped`);
    }

    const stoppedCount = this.products.filter(p => p.stoppedBy === node.id).length;
    if (stoppedCount > 0) {
      this.setFlowState(stats, 'stopped', dt);
      stats.stoppedTime += dt;
    } else {
      this.setFlowState(stats, 'idle', dt);
    }
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

    const wasTrigger = stats.flowState === 'running';
    if (nearbyProduct) {
      if (!wasTrigger) {
        this.addFlowEvent(stats, 'sensor-trigger', `Detected product ${nearbyProduct.id.slice(0, 8)}`);
      }
      this.setFlowState(stats, 'running', dt);
      stats.busyTime += dt;
    } else {
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
