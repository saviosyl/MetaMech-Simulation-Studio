/**
 * AI Layout Builder — MetaMech Simulation Studio
 *
 * Generates a draft conveyor layout from high-level requirements.
 * Input: conveyor lengths, product size/weight, throughput target, summary.
 * Output: scene with nodes, edges, accessories, ready to simulate and edit.
 */
import { v4 as uuidv4 } from 'uuid';

export interface LayoutInput {
  /** Brief description of what the line should do */
  summary: string;
  /** Total line length in mm */
  totalLengthMm: number;
  /** Product dimensions [L, W, H] in mm */
  productSizeMm: [number, number, number];
  /** Product weight in kg */
  productWeightKg: number;
  /** Target throughput (products per minute) */
  targetTPM: number;
  /** Line type */
  lineType: 'straight' | 'l-shape' | 'u-shape';
  /** Include sensor-stopper logic */
  includeSensorLogic: boolean;
  /** Include robot palletizing */
  includeRobotPalletizing: boolean;
  /** Include inspection (checkweigher/labeler) */
  includeInspection: boolean;
  /** Belt width in mm */
  beltWidthMm: number;
  /** Belt speed in m/min */
  beltSpeedMpm: number;
}

export interface LayoutOutput {
  nodes: any[];
  edges: any[];
  /** Warnings about the generated layout */
  warnings: string[];
  /** Summary of what was generated */
  description: string;
}

function n(type: string, pos: [number, number, number], params: any, name: string, rot?: [number, number, number]) {
  return {
    id: uuidv4(),
    type,
    position: pos,
    rotation: rot || [0, 0, 0],
    scale: [1, 1, 1] as [number, number, number],
    parameters: params,
    name,
    locked: false,
  };
}

function edge(from: string, to: string) {
  return { id: uuidv4(), from, to, fromPort: 'output', toPort: 'input' };
}

/**
 * Generate a draft layout from requirements.
 * This is a rule-based generator (no LLM needed).
 */
export function generateLayout(input: LayoutInput): LayoutOutput {
  const nodes: any[] = [];
  const edges: any[] = [];
  const warnings: string[] = [];

  const convHeight = 800;
  const convWidth = input.beltWidthMm || 600;
  const speed = input.beltSpeedMpm || 20;
  const totalM = input.totalLengthMm / 1000;
  
  // Calculate belt speed needed for target TPM
  const productSpacing = (input.productSizeMm[0] / 1000) * 1.5; // 1.5x product length spacing
  const requiredSpeed = (input.targetTPM / 60) * productSpacing; // m/s
  const requiredSpeedMpm = requiredSpeed * 60;
  if (requiredSpeedMpm > speed * 1.2) {
    warnings.push(`Belt speed ${speed} m/min may be too slow for ${input.targetTPM} TPM. Recommended: ${Math.ceil(requiredSpeedMpm)} m/min.`);
  }

  let cursorX = 0; // current X position in meters
  let cursorZ = 0;

  // ── Source ──
  const source = n('source', [cursorX, 0, cursorZ], {
    spawnRate: input.targetTPM,
    productType: 'box',
    productColor: 'blue',
    productLength: input.productSizeMm[0],
    productWidth: input.productSizeMm[1],
    productHeight: input.productSizeMm[2],
  }, 'Source');
  nodes.push(source);
  cursorX += 1.5;

  // ── Infeed conveyor ──
  const infeedLen = Math.min(3000, input.totalLengthMm * 0.2);
  const infeed = n('belt-conveyor', [cursorX + infeedLen / 2000, 0, cursorZ], {
    length: infeedLen, width: convWidth, height: convHeight, beltSpeed: speed,
  }, 'Infeed Conveyor');
  nodes.push(infeed);
  edges.push(edge(source.id, infeed.id));
  cursorX += infeedLen / 1000 + 0.5;
  let lastNodeId = infeed.id;

  // ── Sensor + Stopper section ──
  if (input.includeSensorLogic) {
    const triggerSensorTag = 'SE001';
    const downstreamSensorTag = 'SE002';
    const sensor = n('sensor', [cursorX, 0, cursorZ], {
      sensorTag: triggerSensorTag,
      sensorType: 'through-beam',
      mountHeight: convHeight,
      beltWidth: convWidth,
      showBeam: true,
      mountPosition: 0.3,
      parentConveyorId: lastNodeId,
      detectPresence: true,
      detectZone: true,
      detectionRange: 300,
    }, 'Sensor');
    nodes.push(sensor);
    const downstreamSensor = n('sensor', [cursorX + 0.45, 0, cursorZ], {
      sensorTag: downstreamSensorTag,
      sensorType: 'through-beam',
      mountHeight: convHeight,
      beltWidth: convWidth,
      showBeam: true,
      mountPosition: 0.85,
      parentConveyorId: lastNodeId,
      detectPresence: true,
      detectZone: true,
      detectionRange: 300,
    }, 'Downstream Sensor');
    nodes.push(downstreamSensor);

    const stopper = n('stopper', [cursorX + 0.3, 0, cursorZ], {
      stopperMode: 'release-one-downstream-clear',
      triggerSensorTag,
      downstreamSensorTag,
      engaged: true,
      width: convWidth,
      mountHeight: convHeight,
      mountPosition: 0.7,
      parentConveyorId: lastNodeId,
      releaseCount: 1,
      releaseDelay: 0.3,
      resetDelaySec: 0.3,
    }, 'Stopper');
    nodes.push(stopper);
  }

  // ── Inspection section ──
  if (input.includeInspection) {
    const mainConvLen = Math.min(3000, input.totalLengthMm * 0.25);
    const mainConv = n('belt-conveyor', [cursorX + mainConvLen / 2000, 0, cursorZ], {
      length: mainConvLen, width: convWidth, height: convHeight, beltSpeed: speed,
    }, 'Inspection Conveyor');
    nodes.push(mainConv);
    edges.push(edge(lastNodeId, mainConv.id));
    cursorX += mainConvLen / 1000 + 0.5;
    lastNodeId = mainConv.id;

    const checkweigher = n('checkweigher', [cursorX, 0, cursorZ], {
      processingTime: 1.5, capacity: 1,
    }, 'Checkweigher');
    nodes.push(checkweigher);
    edges.push(edge(lastNodeId, checkweigher.id));
    cursorX += 1.5;
    lastNodeId = checkweigher.id;

    const labelConv = n('belt-conveyor', [cursorX + 1, 0, cursorZ], {
      length: 2000, width: convWidth, height: convHeight, beltSpeed: speed,
    }, 'Label Conveyor');
    nodes.push(labelConv);
    edges.push(edge(lastNodeId, labelConv.id));
    cursorX += 2.5;
    lastNodeId = labelConv.id;

    const labeler = n('labeler', [cursorX, 0, cursorZ], {
      processingTime: 1, capacity: 1,
    }, 'Labeler');
    nodes.push(labeler);
    edges.push(edge(lastNodeId, labeler.id));
    cursorX += 1.5;
    lastNodeId = labeler.id;
  }

  // ── L-shape or U-shape bend ──
  if (input.lineType === 'l-shape' || input.lineType === 'u-shape') {
    const bendConv = n('belt-conveyor', [cursorX + 1, 0, cursorZ], {
      length: 2000, width: convWidth, height: convHeight, beltSpeed: speed,
    }, 'Pre-Bend');
    nodes.push(bendConv);
    edges.push(edge(lastNodeId, bendConv.id));
    cursorX += 2.5;
    lastNodeId = bendConv.id;

    // Bend 90°
    cursorZ += 2;
    const afterBend = n('belt-conveyor', [cursorX, 0, cursorZ + 1], {
      length: 2000, width: convWidth, height: convHeight, beltSpeed: speed,
    }, 'After Bend');
    afterBend.rotation = [0, Math.PI / 2, 0];
    nodes.push(afterBend);
    edges.push(edge(lastNodeId, afterBend.id));
    cursorZ += 2.5;
    lastNodeId = afterBend.id;

    if (input.lineType === 'u-shape') {
      // Second bend back
      cursorX -= 3;
      const afterBend2 = n('belt-conveyor', [cursorX, 0, cursorZ], {
        length: 2000, width: convWidth, height: convHeight, beltSpeed: speed,
      }, 'Return Conveyor');
      afterBend2.rotation = [0, Math.PI, 0];
      nodes.push(afterBend2);
      edges.push(edge(lastNodeId, afterBend2.id));
      cursorX -= 2.5;
      lastNodeId = afterBend2.id;
    }
  }

  // ── Outfeed conveyor ──
  const outfeedLen = Math.min(3000, input.totalLengthMm * 0.15);
  const rot = input.lineType === 'u-shape' ? [0, Math.PI, 0] as [number, number, number] : [0, 0, 0] as [number, number, number];
  const outfeed = n('belt-conveyor', [cursorX + (input.lineType === 'u-shape' ? -outfeedLen / 2000 : outfeedLen / 2000), 0, cursorZ], {
    length: outfeedLen, width: convWidth, height: convHeight, beltSpeed: speed,
  }, 'Outfeed Conveyor');
  outfeed.rotation = rot;
  nodes.push(outfeed);
  edges.push(edge(lastNodeId, outfeed.id));
  cursorX += input.lineType === 'u-shape' ? -(outfeedLen / 1000 + 0.5) : (outfeedLen / 1000 + 0.5);
  lastNodeId = outfeed.id;

  // ── Robot Palletizing ──
  if (input.includeRobotPalletizing) {
    const robot = n('robot-6axis', [cursorX + (input.lineType === 'u-shape' ? -1.5 : 1.5), 0, cursorZ], {
      reach: 2000, baseHeight: 500, cycleTime: 4, speedFactor: 1,
      pedestalEnabled: true, pedestalHeight: 600,
      pickHeight: convHeight, placeHeight: 200,
    }, 'Palletizer Robot');
    nodes.push(robot);
    edges.push(edge(lastNodeId, robot.id));
    lastNodeId = robot.id;

    const pallet = n('eur-pallet', [cursorX + (input.lineType === 'u-shape' ? -3.5 : 3.5), 0, cursorZ], {
      palletType: 'EUR', layerPattern: 'column', maxLayers: 4,
    }, 'Pallet');
    nodes.push(pallet);
    edges.push(edge(lastNodeId, pallet.id));
    lastNodeId = pallet.id;
  }

  // ── Sink ──
  const sinkX = input.lineType === 'u-shape' ? cursorX - 1.5 : cursorX + 1.5;
  const sink = n('sink', [sinkX, 0, cursorZ], {}, 'Output');
  nodes.push(sink);
  edges.push(edge(lastNodeId, sink.id));

  // ── Validation warnings ──
  if (input.productWeightKg > 50) {
    warnings.push('Heavy products (>50kg) — consider reinforced conveyor frames and slower belt speed.');
  }
  if (input.targetTPM > 60) {
    warnings.push('High throughput target — consider accumulation zones and parallel lines.');
  }
  if (nodes.length > 20) {
    warnings.push('Complex layout — review connection alignment before simulating.');
  }

  const description = [
    `Generated ${input.lineType} layout with ${nodes.length} nodes.`,
    `Line length: ${totalM.toFixed(1)}m, Target: ${input.targetTPM} TPM.`,
    input.includeSensorLogic ? 'Includes sensor-stopper logic.' : '',
    input.includeInspection ? 'Includes checkweigher + labeler.' : '',
    input.includeRobotPalletizing ? 'Includes robot palletizing cell.' : '',
  ].filter(Boolean).join(' ');

  return { nodes, edges, warnings, description };
}

/** Default input for quick demo */
export const DEFAULT_LAYOUT_INPUT: LayoutInput = {
  summary: 'Standard FMCG end-of-line with inspection and palletizing',
  totalLengthMm: 15000,
  productSizeMm: [300, 200, 150],
  productWeightKg: 5,
  targetTPM: 20,
  lineType: 'straight',
  includeSensorLogic: true,
  includeRobotPalletizing: true,
  includeInspection: true,
  beltWidthMm: 600,
  beltSpeedMpm: 20,
};
