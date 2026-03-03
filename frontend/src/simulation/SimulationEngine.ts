/**
 * SimulationEngine — Real-time industrial simulation
 * 
 * Units:
 *   - Dimensions: mm in parameters, meters internally
 *   - Speed: m/min in parameters → m/s internally
 *   - PPM: products per minute
 */
import { v4 as uuidv4 } from 'uuid';
import { Product, NodeStats } from './Product';
import { ProcessNode, ProcessEdge, getConnectionPorts } from '../store/editorStore';

const COLOR_MAP: Record<string, string> = {
  brown: '#8B4513',
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#10b981',
  yellow: '#eab308',
  white: '#f5f5f5',
};
const RANDOM_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

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
          this.tickConveyor(node, stats, elapsed); break;
        case 'machine': this.tickMachine(node, stats, elapsed); break;
        case 'buffer': this.tickBuffer(node, stats); break;
        case 'sink': this.tickSink(node, stats); break;
        case 'router': this.tickRouter(node, stats); break;
        case 'pick-and-place': this.tickMachine(node, stats, elapsed); break;
        case 'palletizer': this.tickPalletizer(node, stats, elapsed); break;
      }

      if (stats.totalTime > 0) {
        stats.utilization = stats.busyTime / stats.totalTime;
      }
      stats.queueLength = stats.queue.length;
    }

    this.tickMovingProducts(elapsed);
  }

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

  private tickConveyor(node: ProcessNode, stats: NodeStats, dt: number) {
    // Accept arriving products
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'queued';
      product.conveyorEntryTime = this.simTime;
      stats.queue.push(product.id);
    }

    // Conveyor parameters
    const lengthM = (node.parameters.length || 3000) / 1000;
    const speedMps = (node.parameters.beltSpeed || node.parameters.speed || 20) / 60; // m/min → m/s
    const travelTime = lengthM / speedMps;

    // Get port positions for animation
    const ports = getConnectionPorts(node.type, node.parameters);
    const inputPort = ports.find(p => p.type === 'input');
    const outputPort = ports.find(p => p.type === 'output');

    // Release products that have traveled the full length
    const toRelease: string[] = [];
    for (const pid of stats.queue) {
      const product = this.products.find(p => p.id === pid);
      if (!product || !product.conveyorEntryTime) continue;

      const timeOnBelt = this.simTime - product.conveyorEntryTime;
      const t = Math.min(1, timeOnBelt / travelTime);

      // Animate position: interpolate between input and output ports
      if (inputPort && outputPort) {
        product.currentPosition = [
          node.position[0] + inputPort.localPosition[0] + (outputPort.localPosition[0] - inputPort.localPosition[0]) * t,
          node.position[1] + inputPort.localPosition[1],
          node.position[2] + inputPort.localPosition[2] + (outputPort.localPosition[2] - inputPort.localPosition[2]) * t,
        ];
      }

      if (t >= 1) {
        toRelease.push(pid);
      }
    }

    // Release completed products
    for (const pid of toRelease) {
      stats.queue = stats.queue.filter(id => id !== pid);
      const product = this.products.find(p => p.id === pid);
      if (product) {
        const outEdges = this.getOutEdges(node.id);
        if (outEdges.length > 0) {
          this.sendProductAlongEdge(product, outEdges[0]);
        } else {
          // End of line — product stays at output
          product.state = 'at-node';
        }
        stats.throughput++;
      }
    }

    if (stats.queue.length > 0) stats.busyTime += dt;
  }

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
  }

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

  private tickSink(node: ProcessNode, stats: NodeStats) {
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'completed';
      product.completedAt = this.simTime;
      stats.throughput++;
    }
    this.products = this.products.filter(p => !(p.state === 'completed' && p.currentNodeId === node.id));
  }

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

  private tickPalletizer(node: ProcessNode, stats: NodeStats, dt: number) {
    const palletSize = 4;

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

  private tickMovingProducts(dt: number) {
    for (const product of this.products) {
      if (product.state !== 'moving' || !product.currentEdgeId) continue;

      const edge = this.edges.find(e => e.id === product.currentEdgeId);
      if (!edge) continue;

      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) continue;

      // Use belt speed if from a conveyor type
      let speedMps = 2; // default m/s for edge travel
      const convTypes = ['conveyor', 'belt-conveyor', 'roller-conveyor'];
      if (convTypes.includes(fromNode.type)) {
        speedMps = (fromNode.parameters.beltSpeed || fromNode.parameters.speed || 20) / 60;
      }

      const fromPorts = getConnectionPorts(fromNode.type, fromNode.parameters);
      const toPorts = getConnectionPorts(toNode.type, toNode.parameters);
      const fp = fromPorts.find(p => p.id === edge.fromPort);
      const tp = toPorts.find(p => p.id === edge.toPort);
      if (!fp || !tp) continue;

      const start: [number, number, number] = [
        fromNode.position[0] + fp.localPosition[0],
        fromNode.position[1] + fp.localPosition[1],
        fromNode.position[2] + fp.localPosition[2],
      ];
      const end: [number, number, number] = [
        toNode.position[0] + tp.localPosition[0],
        toNode.position[1] + tp.localPosition[1],
        toNode.position[2] + tp.localPosition[2],
      ];

      const dx = end[0] - start[0];
      const dy = end[1] - start[1];
      const dz = end[2] - start[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 0.01) {
        product.progress = 1;
      } else {
        product.progress += (speedMps * dt) / dist;
      }

      if (product.progress >= 1) {
        product.progress = 1;
        product.state = 'at-node';
        product.currentNodeId = edge.to;
        product.currentEdgeId = null;
        product.currentPosition = [...end];
        product.conveyorEntryTime = null;
      } else {
        product.currentPosition = [
          start[0] + dx * product.progress,
          start[1] + dy * product.progress,
          start[2] + dz * product.progress,
        ];
      }
    }
  }

  private createProduct(node: ProcessNode): Product {
    const productColor = node.parameters.productColor || 'brown';
    let color: string;
    if (productColor === 'random') {
      color = RANDOM_COLORS[this.colorIndex % RANDOM_COLORS.length];
      this.colorIndex++;
    } else {
      color = COLOR_MAP[productColor] || COLOR_MAP.brown;
    }

    // Product size from source parameters (mm → meters)
    const pL = (node.parameters.productLength || 300) / 1000;
    const pW = (node.parameters.productWidth || 200) / 1000;
    const pH = (node.parameters.productHeight || 150) / 1000;

    return {
      id: uuidv4(),
      type: node.parameters.productType || 'box',
      color,
      size: [pL, pW, pH],
      currentPosition: [...node.position] as [number, number, number],
      targetPosition: [0, 0, 0],
      progress: 0,
      currentNodeId: node.id,
      currentEdgeId: null,
      state: 'at-node',
      createdAt: this.simTime,
      completedAt: null,
      conveyorEntryTime: null,
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

    return {
      totalThroughput,
      throughputPerMin: this.simTime > 0 ? (totalThroughput / this.simTime) * 60 : 0,
      avgCycleTime: completedCount > 0 ? totalCycleTime / completedCount : 0,
      machineUtils,
      bufferLevels,
      bottleneck,
      simTime: this.simTime,
      productCount: this.products.length,
    };
  }
}

export const simulationEngine = new SimulationEngine();
