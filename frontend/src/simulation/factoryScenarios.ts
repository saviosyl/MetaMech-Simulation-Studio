/**
 * Factory Scenario Pack — Realistic industrial demo layouts
 * Dense, compact, factory-feel with environment assets
 */
import { v4 as uuidv4 } from 'uuid';
import type { Scenario } from './scenarios';

// Helper: create a node with defaults
function n(type: string, pos: [number, number, number], params: Record<string, any> = {}, name?: string, rot?: [number, number, number]): any {
  return { id: uuidv4(), type, position: pos, rotation: rot || [0, 0, 0], parameters: params, name: name || type };
}

function edge(from: string, to: string): any {
  return { id: uuidv4(), from, to, fromPort: 'output', toPort: 'input' };
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 1: FMCG End-of-Line with Pallet Area
// ═══════════════════════════════════════════════════════════════
export function createFMCGEndOfLine(): Scenario {
  // Main line: Source → Conveyor → Case Packer → Conveyor → Palletizer → Pallet Conv → Stretch Wrapper area
  const source = n('source', [-8, 0, 0], { spawnRate: 20, productType: 'box', productColor: 'brown', productLength: 300, productWidth: 200, productHeight: 150 }, 'Product Source');
  const conv1 = n('belt-conveyor', [-5.5, 0, 0], { length: 3000, width: 500, height: 800, beltSpeed: 18 }, 'Infeed Conv');
  const packer = n('case-packer', [-3, 0, 0], { cycleTime: 4, capacity: 1 }, 'Case Packer');
  const conv2 = n('belt-conveyor', [-0.8, 0, 0], { length: 3000, width: 500, height: 800, beltSpeed: 18 }, 'Outfeed Conv');
  const palletizer = n('palletizer', [1.8, 0, 0], { cycleTime: 8, capacity: 1 }, 'Palletizer');
  const conv3 = n('belt-conveyor', [4.2, 0, 0], { length: 2500, width: 600, height: 300, beltSpeed: 10 }, 'Pallet Conv');
  const sink = n('sink', [6.5, 0, 0], {}, 'Exit');

  // Environment: fenced machine zone
  const fence1 = n('fence', [-3, 0, -2], { width: 8000, height: 2000 }, 'Rear Fence');
  const fence2 = n('fence', [-6.5, 0, -0.5], { width: 1200, height: 2000 }, 'Left Fence', [0, Math.PI/2, 0]);
  const fence3 = n('fence', [2, 0, -0.5], { width: 1200, height: 2000 }, 'Machine Fence', [0, Math.PI/2, 0]);
  const fenceGate = n('fence-gate', [0.5, 0, -2], { width: 1200, height: 2000 }, 'Access Gate');

  // Pallet area
  const palletStack1 = n('pallet-stack', [5, 0, -1.5], { stackCount: 6 }, 'Empty Pallets');
  const palletStack2 = n('pallet-stack', [6.5, 0, -1.5], { stackCount: 3 }, 'Loaded Pallets');
  const stretchWrap = n('stretch-wrapper', [7.5, 0, 0], {}, 'Stretch Wrapper');

  // Support equipment
  const elecCab = n('electrical-cabinet', [-7, 0, -1.8], {}, 'Main Panel');
  const towerLight1 = n('tower-light', [-3, 0, 1.2], {}, 'Packer Light');
  const towerLight2 = n('tower-light', [1.8, 0, 1.2], {}, 'Palletizer Light');
  const hmi1 = n('hmi-stand', [-3, 0, 1.5], {}, 'Packer HMI');
  const opStation = n('operator-station', [-1, 0, 2], { width: 1500, depth: 800 }, 'Pack Station', [0, Math.PI, 0]);

  // Floor zones
  const zone1 = n('floor-zone', [-3, 0, 0], { width: 4000, depth: 3000, zoneColor: 'blue' }, 'Packing Zone');
  const zone2 = n('floor-zone', [5.5, 0, -0.5], { width: 4000, depth: 3000, zoneColor: 'yellow' }, 'Pallet Zone');

  // Forklift and pallet truck
  const forklift = n('forklift', [8, 0, -2], {}, 'Forklift', [0, -Math.PI/2, 0]);
  const palletTruck = n('pallet-truck', [3.5, 0, 2], {}, 'Pallet Truck', [0, Math.PI/4, 0]);

  // Bollards around pallet area
  const bollard1 = n('bollard', [3.5, 0, -2.2], {}, 'Bollard');
  const bollard2 = n('bollard', [7.8, 0, -2.2], {}, 'Bollard');
  const bollard3 = n('bollard', [3.5, 0, 1.2], {}, 'Bollard');

  return {
    name: 'FMCG End-of-Line',
    description: 'Complete FMCG packaging line with case packer, palletizer, stretch wrapper, fenced zone, and pallet staging area.',
    nodes: [
      source, conv1, packer, conv2, palletizer, conv3, sink,
      fence1, fence2, fence3, fenceGate,
      palletStack1, palletStack2, stretchWrap,
      elecCab, towerLight1, towerLight2, hmi1, opStation,
      zone1, zone2,
      forklift, palletTruck,
      bollard1, bollard2, bollard3,
    ],
    edges: [
      edge(source.id, conv1.id),
      edge(conv1.id, packer.id),
      edge(packer.id, conv2.id),
      edge(conv2.id, palletizer.id),
      edge(palletizer.id, conv3.id),
      edge(conv3.id, sink.id),
    ],
    rules: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 2: Robot Cell with Fenced Zone
// ═══════════════════════════════════════════════════════════════
export function createRobotCellFactory(): Scenario {
  const source = n('source', [-5, 0, 0], { spawnRate: 15, productType: 'box', productColor: 'blue', productLength: 250, productWidth: 200, productHeight: 100 }, 'Part Source');
  const infeed = n('belt-conveyor', [-3, 0, 0], { length: 2500, width: 500, height: 800, beltSpeed: 15 }, 'Infeed Conv');
  const robot = n('robot-6axis', [-0.5, 0, 0], { reachMm: 1500, cycleTime: 6 }, '6-Axis Robot');
  const outfeed = n('belt-conveyor', [2, 0, 0], { length: 2500, width: 500, height: 800, beltSpeed: 15 }, 'Outfeed Conv');
  const sink = n('sink', [4.5, 0, 0], {}, 'Exit');

  // Robot cell fencing (U-shape around robot)
  const fenceBack = n('fence', [-0.5, 0, -2.2], { width: 5000, height: 2000 }, 'Rear Fence');
  const fenceLeft = n('fence', [-2.8, 0, -1], { width: 2200, height: 2000 }, 'Left Fence', [0, Math.PI/2, 0]);
  const fenceRight = n('fence', [1.8, 0, -1], { width: 2200, height: 2000 }, 'Right Fence', [0, Math.PI/2, 0]);
  const gate = n('fence-gate', [-0.5, 0, 0.2], { width: 1000, height: 2000 }, 'Service Gate', [0, Math.PI/2, 0]);

  // Floor zone for robot cell
  const robotZone = n('floor-zone', [-0.5, 0, -1], { width: 4500, depth: 2500, zoneColor: 'red' }, 'Robot Zone');

  // Operator area
  const opStation = n('operator-station', [-4, 0, 1.5], { width: 1200, depth: 700 }, 'Inspection Station', [0, Math.PI, 0]);
  const hmi = n('hmi-stand', [-0.5, 0, 1.5], {}, 'Robot HMI');
  const towerLight = n('tower-light', [1.8, 0, -2], {}, 'Cell Status');
  const elecCab = n('electrical-cabinet', [3, 0, -2], {}, 'Robot Controller');

  // Pallet position
  const palletStack = n('pallet-stack', [4.5, 0, -1.5], { stackCount: 4 }, 'Output Pallets');
  const palletTruck = n('pallet-truck', [5.5, 0, -1], {}, 'Pallet Truck', [0, Math.PI, 0]);

  // Bollards
  const b1 = n('bollard', [-3.2, 0, 1.2], {}, 'Bollard');
  const b2 = n('bollard', [2.2, 0, 1.2], {}, 'Bollard');

  // Wall background
  const wall1 = n('wall', [-0.5, 0, -3.5], { width: 10000, height: 3500 }, 'Back Wall');

  return {
    name: 'Robot Cell Factory',
    description: 'Fenced 6-axis robot cell with infeed/outfeed conveyors, operator station, HMI, and pallet staging.',
    nodes: [
      source, infeed, robot, outfeed, sink,
      fenceBack, fenceLeft, fenceRight, gate,
      robotZone,
      opStation, hmi, towerLight, elecCab,
      palletStack, palletTruck,
      b1, b2,
      wall1,
    ],
    edges: [
      edge(source.id, infeed.id),
      edge(infeed.id, robot.id),
      edge(robot.id, outfeed.id),
      edge(outfeed.id, sink.id),
    ],
    rules: [],
  };
}

// ═══════════════════════════════════════════════════════════════
// SCENARIO 3: General Factory Conveyor Demo
// ═══════════════════════════════════════════════════════════════
export function createGeneralFactoryDemo(): Scenario {
  // L-shaped conveyor line with machine in the middle
  const source = n('source', [-6, 0, 0], { spawnRate: 25, productType: 'box', productColor: 'random', productLength: 200, productWidth: 150, productHeight: 120 }, 'Source');
  const conv1 = n('belt-conveyor', [-4, 0, 0], { length: 3000, width: 500, height: 800, beltSpeed: 20 }, 'Conv 1');
  const machine1 = n('checkweigher', [-1.5, 0, 0], { cycleTime: 2, capacity: 1 }, 'Checkweigher');
  const conv2 = n('belt-conveyor', [0.5, 0, 0], { length: 2000, width: 500, height: 800, beltSpeed: 20 }, 'Conv 2');
  const labeler = n('labeler', [2.5, 0, 0], { cycleTime: 1.5, capacity: 1 }, 'Labeler');
  const conv3 = n('belt-conveyor', [4, 0, 0], { length: 2000, width: 500, height: 800, beltSpeed: 20 }, 'Conv 3');
  const sink = n('sink', [6, 0, 0], {}, 'Sink');

  // Walls and windows (factory backdrop)
  const wall1 = n('wall', [0, 0, -3], { width: 14000, height: 4000 }, 'Factory Wall');
  const window1 = n('window', [-3, 0, -2.9], { width: 2000, height: 1800 }, 'Window 1');
  const window2 = n('window', [0, 0, -2.9], { width: 2000, height: 1800 }, 'Window 2');
  const window3 = n('window', [3, 0, -2.9], { width: 2000, height: 1800 }, 'Window 3');

  // Fencing around machine area
  const fence1 = n('fence', [-1.5, 0, 1.5], { width: 3000, height: 1800 }, 'Guard Fence');
  const fence2 = n('fence', [2.5, 0, 1.5], { width: 3000, height: 1800 }, 'Guard Fence 2');

  // Support equipment
  const elecCab1 = n('electrical-cabinet', [-5.5, 0, -2.5], {}, 'Panel 1');
  const elecCab2 = n('electrical-cabinet', [5, 0, -2.5], {}, 'Panel 2');
  const hmi1 = n('hmi-stand', [-1.5, 0, 1.8], {}, 'Weigher HMI');
  const hmi2 = n('hmi-stand', [2.5, 0, 1.8], {}, 'Labeler HMI');
  const tl1 = n('tower-light', [-1.5, 0, -1], {}, 'Weigher Light');
  const tl2 = n('tower-light', [2.5, 0, -1], {}, 'Labeler Light');

  // Floor zones
  const zone1 = n('floor-zone', [-1.5, 0, 0], { width: 3000, depth: 2500, zoneColor: 'green' }, 'Weighing Zone');
  const zone2 = n('floor-zone', [2.5, 0, 0], { width: 3000, depth: 2500, zoneColor: 'blue' }, 'Labeling Zone');
  const zone3 = n('floor-zone', [0, 0, 3], { width: 6000, depth: 2000, zoneColor: 'yellow' }, 'Walkway');

  // Operator station
  const opStation = n('operator-station', [5.5, 0, 1.5], { width: 1200, depth: 600 }, 'QC Station', [0, Math.PI, 0]);

  // Forklift & pallet area
  const forklift = n('forklift', [-6, 0, 2.5], {}, 'Forklift', [0, Math.PI/2, 0]);
  const palletRack = n('pallet-rack', [6, 0, -2.5], { levels: 3, bays: 2 }, 'Pallet Rack');
  const palletStack = n('pallet-stack', [6, 0, 1], { stackCount: 4 }, 'Empty Pallets');

  // Bollards along walkway
  const b1 = n('bollard', [-4, 0, 2], {}, 'Bollard');
  const b2 = n('bollard', [-2, 0, 2], {}, 'Bollard');
  const b3 = n('bollard', [0, 0, 2], {}, 'Bollard');
  const b4 = n('bollard', [2, 0, 2], {}, 'Bollard');
  const b5 = n('bollard', [4, 0, 2], {}, 'Bollard');

  return {
    name: 'Factory Conveyor Line',
    description: 'General factory conveyor with checkweigher, labeler, wall/windows backdrop, fencing, floor zones, and pallet rack.',
    nodes: [
      source, conv1, machine1, conv2, labeler, conv3, sink,
      wall1, window1, window2, window3,
      fence1, fence2,
      elecCab1, elecCab2, hmi1, hmi2, tl1, tl2,
      zone1, zone2, zone3,
      opStation,
      forklift, palletRack, palletStack,
      b1, b2, b3, b4, b5,
    ],
    edges: [
      edge(source.id, conv1.id),
      edge(conv1.id, machine1.id),
      edge(machine1.id, conv2.id),
      edge(conv2.id, labeler.id),
      edge(labeler.id, conv3.id),
      edge(conv3.id, sink.id),
    ],
    rules: [],
  };
}
