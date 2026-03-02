import { v4 as uuidv4 } from 'uuid';
import { Product, NodeStats } from './Product';
import { ProcessNode, ProcessEdge, getConnectionPorts } from '../store/editorStore';

const PRODUCT_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

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
        case 'conveyor': this.tickConveyor(node, stats, elapsed); break;
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

    // Move products along edges
    this.tickMovingProducts(elapsed);
  }

  private tickSource(node: ProcessNode, stats: NodeStats, _dt: number) {
    const interval = 1 / (node.parameters.spawnRate || 1);
    if (this.simTime - stats.lastSpawnTime >= interval) {
      const outEdges = this.getOutEdges(node.id);
      if (outEdges.length > 0) {
        const product = this.createProduct(node);
        this.sendProductAlongEdge(product, outEdges[0]);
        stats.lastSpawnTime = this.simTime;
        stats.throughput++;
      }
    }
  }

  private tickConveyor(node: ProcessNode, stats: NodeStats, dt: number) {
    // Conveyor just passes through - products move along the edge
    // Check if any product arrived at this node
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      const outEdges = this.getOutEdges(node.id);
      if (outEdges.length > 0) {
        this.sendProductAlongEdge(product, outEdges[0]);
        stats.throughput++;
      }
    }
    if (arrived.length > 0) {
      stats.busyTime += dt;
    }
  }

  private tickMachine(node: ProcessNode, stats: NodeStats, dt: number) {
    const processingTime = node.parameters.processingTime || 2;

    // If processing, check if done
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

    // If not processing, take from queue
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

    if (stats.processing) {
      stats.busyTime += dt;
    }

    // Accept arriving products into queue
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'queued';
      stats.queue.push(product.id);
    }
  }

  private tickBuffer(node: ProcessNode, stats: NodeStats) {
    const capacity = node.parameters.capacity || 10;

    // Accept arriving products into queue
    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      if (stats.queue.length < capacity) {
        product.state = 'queued';
        stats.queue.push(product.id);
      }
    }

    // Release FIFO to output
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
    // Remove completed products at sink
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
    const palletSize = 4; // products per pallet

    const arrived = this.products.filter(p => p.state === 'at-node' && p.currentNodeId === node.id);
    for (const product of arrived) {
      product.state = 'queued';
      stats.queue.push(product.id);
      stats.palletCount++;
    }

    if (stats.palletCount >= palletSize) {
      const outEdges = this.getOutEdges(node.id);
      if (outEdges.length > 0) {
        // Release all as a batch
        for (let i = 0; i < palletSize && stats.queue.length > 0; i++) {
          const pid = stats.queue.shift()!;
          const product = this.products.find(p => p.id === pid);
          if (product) {
            this.sendProductAlongEdge(product, outEdges[0]);
          }
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

      // Speed: use conveyor speed if from a conveyor, else default 2
      let speed = 2;
      if (fromNode.type === 'conveyor') speed = fromNode.parameters.speed || 1;

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
        product.progress += (speed * dt) / dist;
      }

      if (product.progress >= 1) {
        product.progress = 1;
        product.state = 'at-node';
        product.currentNodeId = edge.to;
        product.currentEdgeId = null;
        product.currentPosition = [...end];
      } else {
        product.currentPosition = [
          start[0] + dx * product.progress,
          start[1] + dy * product.progress + Math.sin(product.progress * Math.PI) * 0.1,
          start[2] + dz * product.progress,
        ];
      }
    }
  }

  private createProduct(node: ProcessNode): Product {
    const color = PRODUCT_COLORS[this.colorIndex % PRODUCT_COLORS.length];
    this.colorIndex++;
    return {
      id: uuidv4(),
      type: node.parameters.productType || 'default',
      color,
      currentPosition: [...node.position] as [number, number, number],
      targetPosition: [0, 0, 0],
      progress: 0,
      currentNodeId: node.id,
      currentEdgeId: null,
      state: 'at-node',
      createdAt: this.simTime,
      completedAt: null,
    };
  }

  private sendProductAlongEdge(product: Product, edge: ProcessEdge) {
    product.state = 'moving';
    product.currentEdgeId = edge.id;
    product.progress = 0;
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
      if (node.type === 'sink') {
        totalThroughput += stats.throughput;
      }
      if (node.type === 'machine' || node.type === 'pick-and-place') {
        machineUtils.push({ nodeId: node.id, name: node.name, utilization: stats.utilization });
      }
      if (node.type === 'buffer') {
        bufferLevels.push({
          nodeId: node.id,
          name: node.name,
          level: stats.queueLength,
          capacity: node.parameters.capacity || 10,
        });
      }
    }

    // Average cycle time from completed products
    const completed = this.products.filter(p => p.completedAt !== null);
    for (const p of completed) {
      totalCycleTime += (p.completedAt! - p.createdAt);
      completedCount++;
    }

    const bottleneck = machineUtils.length > 0
      ? machineUtils.reduce((a, b) => a.utilization > b.utilization ? a : b)
      : null;

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

// Singleton
export const simulationEngine = new SimulationEngine();
