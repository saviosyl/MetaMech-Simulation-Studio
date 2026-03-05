export interface Product {
  id: string;
  type: string;       // box, cylinder, bottle, pallet, tote
  color: string;
  size: [number, number, number]; // [length, width, height] in meters
  currentPosition: [number, number, number];
  currentRotationY: number;       // Y-axis rotation in radians (follows path tangent)
  targetPosition: [number, number, number];
  progress: number;   // 0-1 along current edge or conveyor
  currentNodeId: string;
  currentEdgeId: string | null;
  state: 'at-node' | 'moving' | 'processing' | 'queued' | 'completed' | 'blocked' | 'stopped';
  createdAt: number;
  completedAt: number | null;
  conveyorEntryTime: number | null; // when product entered current conveyor
  blockedSince: number | null;      // when product became blocked
  stoppedBy: string | null;         // stopper node ID that stopped this product

  // ─── 1D path occupancy fields ──────────────────
  pathPosition: number;          // 0-1 position along conveyor path (front of product)
  productLength: number;         // meters — physical length along path direction
}

/** Flow state for a node — describes current operational condition */
export type FlowState = 'running' | 'blocked' | 'starved' | 'stopped' | 'idle' | 'faulted';

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
  processStartTime?: number;
  lastSpawnTime: number;
  routerIndex: number;
  palletCount: number;

  // Flow state tracking (Task 18)
  flowState: FlowState;
  blockedTime: number;          // cumulative time in blocked state
  starvedTime: number;          // cumulative time in starved state
  stoppedTime: number;          // cumulative time stopped by stopper
  lastFlowStateChange: number;  // sim time of last flow state transition
  peakQueueLength: number;      // highest queue length observed
  totalItemsBlocked: number;    // count of items that experienced blocking
  events: FlowEvent[];          // recent flow events for reporting
}

export interface FlowEvent {
  time: number;
  type: 'blocked' | 'unblocked' | 'starved' | 'fed' | 'stopped' | 'released' | 'sensor-trigger' | 'sensor-clear';
  nodeId: string;
  detail?: string;
}
