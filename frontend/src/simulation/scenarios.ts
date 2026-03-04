/**
 * Industrial Scenario Examples — MetaMech Simulation Studio
 *
 * Pre-built scenario configurations that demonstrate real-world use cases.
 * Each scenario returns the nodes, edges, and rules needed.
 */

import { v4 as uuidv4 } from 'uuid';
import { Rule, createColorSortRule, createDownstreamReadyRule } from './RuleEngine';

interface ScenarioNode {
  id: string;
  type: string;
  position: [number, number, number];
  rotation: [number, number, number];
  parameters: Record<string, any>;
  name: string;
}

interface ScenarioEdge {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
}

export interface Scenario {
  name: string;
  description: string;
  nodes: ScenarioNode[];
  edges: ScenarioEdge[];
  rules: Rule[];
}

// ─── Scenario 1: Color-Based Sorting Line ──────────────────────
export function createColorSortScenario(): Scenario {
  const sourceId = uuidv4();
  const conv1Id = uuidv4();
  const sensorId = uuidv4();
  const conv2Id = uuidv4();
  const pusherId = uuidv4();
  const sideConvId = uuidv4();
  const sinkMainId = uuidv4();
  const sinkSideId = uuidv4();

  return {
    name: 'Color Sorting Line',
    description: 'Sensor detects red products → pusher diverts to side conveyor. Other products continue forward.',
    nodes: [
      { id: sourceId, type: 'source', position: [-6, 0, 0], rotation: [0, 0, 0], parameters: { spawnRate: 20, productColor: 'random', productType: 'box', productLength: 200, productWidth: 150, productHeight: 100 }, name: 'Source' },
      { id: conv1Id, type: 'belt-conveyor', position: [-3, 0, 0], rotation: [0, 0, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 20 }, name: 'Infeed Conveyor' },
      { id: sensorId, type: 'sensor', position: [-0.5, 0, 0], rotation: [0, 0, 0], parameters: { sensorType: 'through-beam', mountHeight: 800, beltWidth: 600, detectColor: true, showBeam: true, mountPosition: 0.7 }, name: 'Color Sensor' },
      { id: conv2Id, type: 'belt-conveyor', position: [2, 0, 0], rotation: [0, 0, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 20 }, name: 'Sort Conveyor' },
      { id: pusherId, type: 'pusher', position: [1.5, 0, 0], rotation: [0, 0, 0], parameters: { side: 'right', stroke: 400, mountHeight: 800, pusherMode: 'sort', routeBy: 'color-match', routeValues: '#ef4444', cycleTime: 0.8, mountPosition: 0.4 }, name: 'Red Pusher' },
      { id: sideConvId, type: 'belt-conveyor', position: [1.5, 0, 2.5], rotation: [0, Math.PI / 2, 0], parameters: { length: 2000, width: 600, height: 800, beltSpeed: 15 }, name: 'Side Conveyor' },
      { id: sinkMainId, type: 'sink', position: [5, 0, 0], rotation: [0, 0, 0], parameters: {}, name: 'Main Output' },
      { id: sinkSideId, type: 'sink', position: [1.5, 0, 5], rotation: [0, 0, 0], parameters: {}, name: 'Red Output' },
    ],
    edges: [
      { id: uuidv4(), from: sourceId, to: conv1Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv1Id, to: conv2Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv2Id, to: sinkMainId, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: sideConvId, to: sinkSideId, fromPort: 'output', toPort: 'input' },
    ],
    rules: [
      createColorSortRule('rule-red-sort', sensorId, pusherId, '#ef4444'),
    ],
  };
}

// ─── Scenario 2: Metered Stopper Release ───────────────────────
export function createMeteredStopperScenario(): Scenario {
  const sourceId = uuidv4();
  const conv1Id = uuidv4();
  const stopperId = uuidv4();
  const conv2Id = uuidv4();
  const machineId = uuidv4();
  const conv3Id = uuidv4();
  const sinkId = uuidv4();

  return {
    name: 'Metered Stopper Line',
    description: 'Stopper meters one item at a time to prevent machine overload.',
    nodes: [
      { id: sourceId, type: 'source', position: [-7, 0, 0], rotation: [0, 0, 0], parameters: { spawnRate: 30, productType: 'box', productColor: 'blue' }, name: 'Source' },
      { id: conv1Id, type: 'belt-conveyor', position: [-4, 0, 0], rotation: [0, 0, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 20, accumulationMode: true, accumulationZones: 6 }, name: 'Accumulation Conveyor' },
      { id: stopperId, type: 'stopper', position: [-1.5, 0, 0], rotation: [0, 0, 0], parameters: { engaged: true, width: 600, mountHeight: 800, stopperMode: 'metering', meterInterval: 3 }, name: 'Metering Stopper' },
      { id: conv2Id, type: 'belt-conveyor', position: [0.5, 0, 0], rotation: [0, 0, 0], parameters: { length: 2000, width: 600, height: 800, beltSpeed: 20 }, name: 'Feed Conveyor' },
      { id: machineId, type: 'machine', position: [3, 0, 0], rotation: [0, 0, 0], parameters: { processingTime: 2.5, capacity: 1 }, name: 'Processing Machine' },
      { id: conv3Id, type: 'belt-conveyor', position: [5.5, 0, 0], rotation: [0, 0, 0], parameters: { length: 2000, width: 600, height: 800, beltSpeed: 20 }, name: 'Exit Conveyor' },
      { id: sinkId, type: 'sink', position: [8, 0, 0], rotation: [0, 0, 0], parameters: {}, name: 'Output' },
    ],
    edges: [
      { id: uuidv4(), from: sourceId, to: conv1Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv1Id, to: conv2Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv2Id, to: machineId, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: machineId, to: conv3Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv3Id, to: sinkId, fromPort: 'output', toPort: 'input' },
    ],
    rules: [],
  };
}

// ─── Scenario 3: Downstream Clear → Stopper Release ────────────
export function createDownstreamReadyScenario(): Scenario {
  const sourceId = uuidv4();
  const conv1Id = uuidv4();
  const stopperId = uuidv4();
  const conv2Id = uuidv4();
  const downSensorId = uuidv4();
  const sinkId = uuidv4();

  return {
    name: 'Downstream Ready Release',
    description: 'Stopper holds until downstream sensor reports zone clear, then releases one item.',
    nodes: [
      { id: sourceId, type: 'source', position: [-5, 0, 0], rotation: [0, 0, 0], parameters: { spawnRate: 20, productType: 'tote', productColor: 'green' }, name: 'Source' },
      { id: conv1Id, type: 'belt-conveyor', position: [-2.5, 0, 0], rotation: [0, 0, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 15, accumulationMode: true }, name: 'Queue Conveyor' },
      { id: stopperId, type: 'stopper', position: [-0.5, 0, 0], rotation: [0, 0, 0], parameters: { engaged: true, width: 600, mountHeight: 800, stopperMode: 'downstream-ready' }, name: 'Release Stopper' },
      { id: conv2Id, type: 'belt-conveyor', position: [2, 0, 0], rotation: [0, 0, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 20 }, name: 'Outfeed Conveyor' },
      { id: downSensorId, type: 'sensor', position: [3, 0, 0], rotation: [0, 0, 0], parameters: { sensorType: 'through-beam', mountHeight: 800, beltWidth: 600, detectZone: true, showBeam: true, mountPosition: 0.8 }, name: 'Downstream Sensor' },
      { id: sinkId, type: 'sink', position: [5, 0, 0], rotation: [0, 0, 0], parameters: {}, name: 'Output' },
    ],
    edges: [
      { id: uuidv4(), from: sourceId, to: conv1Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv1Id, to: conv2Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv2Id, to: sinkId, fromPort: 'output', toPort: 'input' },
    ],
    rules: [
      createDownstreamReadyRule('rule-downstream', downSensorId, stopperId),
    ],
  };
}

// ─── Scenario 4: Incline Conveyor Transport ────────────────────
export function createInclineScenario(): Scenario {
  const sourceId = uuidv4();
  const conv1Id = uuidv4();
  const inclineId = uuidv4();
  const conv2Id = uuidv4();
  const sinkId = uuidv4();

  return {
    name: 'Incline Conveyor Transport',
    description: 'Products travel up a 20° inclined conveyor with cleated belt.',
    nodes: [
      { id: sourceId, type: 'source', position: [-5, 0, 0], rotation: [0, 0, 0], parameters: { spawnRate: 15, productType: 'box', productColor: 'brown' }, name: 'Source' },
      { id: conv1Id, type: 'belt-conveyor', position: [-2.5, 0, 0], rotation: [0, 0, 0], parameters: { length: 2000, width: 600, height: 800, beltSpeed: 15 }, name: 'Feed Conveyor' },
      { id: inclineId, type: 'belt-conveyor', position: [0.5, 0, 0], rotation: [0, 0, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 12, angle: 20, conveyorType: 'cleated', cleatHeight: 25, cleatSpacing: 150, sidewallEnabled: true }, name: 'Incline Conveyor' },
      { id: conv2Id, type: 'belt-conveyor', position: [4, 0, 0], rotation: [0, 0, 0], parameters: { length: 2000, width: 600, height: 1800, beltSpeed: 15 }, name: 'Upper Conveyor' },
      { id: sinkId, type: 'sink', position: [6.5, 0, 0], rotation: [0, 0, 0], parameters: {}, name: 'Output' },
    ],
    edges: [
      { id: uuidv4(), from: sourceId, to: conv1Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv1Id, to: inclineId, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: inclineId, to: conv2Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv2Id, to: sinkId, fromPort: 'output', toPort: 'input' },
    ],
    rules: [],
  };
}

// ─── Scenario 5: Bend Conveyor Routing ─────────────────────────
export function createBendRoutingScenario(): Scenario {
  const sourceId = uuidv4();
  const conv1Id = uuidv4();
  const bendId = uuidv4();
  const conv2Id = uuidv4();
  const sinkId = uuidv4();

  return {
    name: 'Bend Conveyor Route',
    description: '90° bend conveyor routes products around a corner.',
    nodes: [
      { id: sourceId, type: 'source', position: [-4, 0, 2], rotation: [0, 0, 0], parameters: { spawnRate: 15, productType: 'box', productColor: 'yellow' }, name: 'Source' },
      { id: conv1Id, type: 'belt-conveyor', position: [-1.5, 0, 2], rotation: [0, 0, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 15 }, name: 'Infeed' },
      { id: bendId, type: 'bend-conveyor', position: [1, 0, 1], rotation: [0, 0, 0], parameters: { bendAngle: '90', bendDirection: 'right', surfaceType: 'belt', width: 600, radius: 1000, height: 800, speed: 15 }, name: '90° Bend' },
      { id: conv2Id, type: 'belt-conveyor', position: [2, 0, -1.5], rotation: [0, Math.PI / 2, 0], parameters: { length: 3000, width: 600, height: 800, beltSpeed: 15 }, name: 'Outfeed' },
      { id: sinkId, type: 'sink', position: [2, 0, -4], rotation: [0, 0, 0], parameters: {}, name: 'Output' },
    ],
    edges: [
      { id: uuidv4(), from: sourceId, to: conv1Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv1Id, to: bendId, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: bendId, to: conv2Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv2Id, to: sinkId, fromPort: 'output', toPort: 'input' },
    ],
    rules: [],
  };
}

// ─── Scenario 6: Spiral Vertical Transport ─────────────────────
export function createSpiralScenario(): Scenario {
  const sourceId = uuidv4();
  const conv1Id = uuidv4();
  const spiralId = uuidv4();
  const conv2Id = uuidv4();
  const sinkId = uuidv4();

  return {
    name: 'Spiral Vertical Transport',
    description: 'Products travel upward through a spiral conveyor for level change.',
    nodes: [
      { id: sourceId, type: 'source', position: [-4, 0, 0], rotation: [0, 0, 0], parameters: { spawnRate: 10, productType: 'tote', productColor: 'blue', productLength: 400, productWidth: 300, productHeight: 200 }, name: 'Source' },
      { id: conv1Id, type: 'belt-conveyor', position: [-1.5, 0, 0], rotation: [0, 0, 0], parameters: { length: 2000, width: 500, height: 800, beltSpeed: 10 }, name: 'Ground Infeed' },
      { id: spiralId, type: 'spiral-conveyor', position: [1.5, 0, 0], rotation: [0, 0, 0], parameters: { diameter: 2000, totalHeight: 4000, beltWidth: 500, direction: 'up', speed: 8, turns: 3 }, name: 'Spiral Up' },
      { id: conv2Id, type: 'belt-conveyor', position: [4.5, 0, 0], rotation: [0, 0, 0], parameters: { length: 2000, width: 500, height: 4800, beltSpeed: 10 }, name: 'Upper Outfeed' },
      { id: sinkId, type: 'sink', position: [7, 0, 0], rotation: [0, 0, 0], parameters: {}, name: 'Upper Output' },
    ],
    edges: [
      { id: uuidv4(), from: sourceId, to: conv1Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv1Id, to: spiralId, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: spiralId, to: conv2Id, fromPort: 'output', toPort: 'input' },
      { id: uuidv4(), from: conv2Id, to: sinkId, fromPort: 'output', toPort: 'input' },
    ],
    rules: [],
  };
}

// ─── All scenarios ─────────────────────────────────────────────
export function getAllScenarios(): { id: string; create: () => Scenario }[] {
  return [
    { id: 'color-sort', create: createColorSortScenario },
    { id: 'metered-stopper', create: createMeteredStopperScenario },
    { id: 'downstream-ready', create: createDownstreamReadyScenario },
    { id: 'incline-transport', create: createInclineScenario },
    { id: 'bend-routing', create: createBendRoutingScenario },
    { id: 'spiral-transport', create: createSpiralScenario },
  ];
}
