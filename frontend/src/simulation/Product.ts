export interface Product {
  id: string;
  type: string;       // box, cylinder, bottle, pallet, tote
  color: string;
  size: [number, number, number]; // [length, width, height] in meters
  currentPosition: [number, number, number];
  targetPosition: [number, number, number];
  progress: number;   // 0-1 along current edge or conveyor
  currentNodeId: string;
  currentEdgeId: string | null;
  state: 'at-node' | 'moving' | 'processing' | 'queued' | 'completed';
  createdAt: number;
  completedAt: number | null;
  conveyorEntryTime: number | null; // when product entered current conveyor
}

export interface NodeStats {
  nodeId: string;
  throughput: number;
  utilization: number;
  queueLength: number;
  busyTime: number;
  totalTime: number;
  processing: boolean;
  currentProductId: string | null;
  queue: string[];
  processEndTime: number | null;
  lastSpawnTime: number;
  routerIndex: number;
  palletCount: number;
}
