export interface Product {
  id: string;
  type: string;
  color: string;
  currentPosition: [number, number, number];
  targetPosition: [number, number, number];
  progress: number; // 0-1 along current edge
  currentNodeId: string;
  currentEdgeId: string | null;
  state: 'at-node' | 'moving' | 'processing' | 'queued' | 'completed';
  createdAt: number; // simulation time
  completedAt: number | null;
}

export interface NodeStats {
  nodeId: string;
  throughput: number; // products processed
  utilization: number; // 0-1
  queueLength: number;
  busyTime: number;
  totalTime: number;
  processing: boolean;
  currentProductId: string | null;
  queue: string[]; // product ids
  processEndTime: number | null;
  lastSpawnTime: number;
  routerIndex: number; // for round-robin
  palletCount: number; // for palletizer
}
