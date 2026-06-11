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
  /** Optimization goal for auto-layout heuristics */
  optimizeFor: 'balanced' | 'throughput' | 'compact' | 'cost';
  /** Include accumulation/buffer zone */
  includeBufferZone: boolean;
  /** Run auto-route and auto-space post processing */
  autoRouteAndSpace: boolean;
}

export interface LayoutKpis {
  estimatedThroughputTpm: number;
  estimatedCycleTimeSec: number;
  estimatedFootprintM2: number;
  estimatedConveyorLengthM: number;
  capexBand: 'Low' | 'Medium' | 'High';
}

export interface LayoutOutput {
  nodes: any[];
  edges: any[];
  /** Warnings about the generated layout */
  warnings: string[];
  /** Summary of what was generated */
  description: string;
  /** Estimated layout KPIs (first-pass heuristic) */
  kpis: LayoutKpis;
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

function snapToGrid(v: number, grid = 0.1): number {
  return Math.round(v / grid) * grid;
}

function normalizedYaw(node: any): number {
  const y = Number(node?.rotation?.[1] || 0);
  const twoPi = Math.PI * 2;
  let out = y % twoPi;
  if (out < 0) out += twoPi;
  return out;
}

function getNodeFootprint(node: any, fallbackBeltWidthMm: number): { len: number; wid: number } {
  const t = String(node?.type || '');
  const p = node?.parameters || {};
  if (t.includes('conveyor')) {
    const len = Math.max(0.7, Number(p.length || 2000) / 1000);
    const wid = Math.max(0.35, Number(p.width || fallbackBeltWidthMm || 600) / 1000);
    return { len, wid };
  }
  if (t === 'source' || t === 'sink') return { len: 0.55, wid: 0.55 };
  if (t === 'sensor' || t === 'stopper') return { len: 0.45, wid: Math.max(0.35, Number(p.width || fallbackBeltWidthMm || 600) / 1000) };
  if (t === 'checkweigher' || t === 'labeler') return { len: 1.2, wid: 0.9 };
  if (t === 'robot-6axis') return { len: 2.2, wid: 2.2 };
  if (t.includes('pallet')) return { len: 1.4, wid: 1.2 };
  return { len: 0.9, wid: 0.8 };
}

function getAxisAlignedHalfExtents(node: any, fallbackBeltWidthMm: number): { halfX: number; halfZ: number } {
  const { len, wid } = getNodeFootprint(node, fallbackBeltWidthMm);
  const yaw = normalizedYaw(node);
  const c = Math.abs(Math.cos(yaw));
  const s = Math.abs(Math.sin(yaw));
  const worldX = c * len + s * wid;
  const worldZ = c * wid + s * len;
  return { halfX: worldX / 2, halfZ: worldZ / 2 };
}

function isMovableForSpacing(node: any): boolean {
  const t = String(node?.type || '');
  if (t === 'source') return false;
  if (t === 'sensor' || t === 'stopper') return false;
  return true;
}

function autoRouteAndSpaceLayout(nodes: any[], edges: any[], input: LayoutInput, warnings: string[]): void {
  if (!input.autoRouteAndSpace || nodes.length < 2) return;

  const byId = new Map<string, any>(nodes.map((n) => [n.id, n]));
  let routeAdjustments = 0;
  let spacingAdjustments = 0;

  // 1) Route tidy pass: reduce diagonal jumps on connected conveyors/machines.
  for (const e of edges) {
    const from = byId.get(e.from);
    const to = byId.get(e.to);
    if (!from || !to || !isMovableForSpacing(to)) continue;
    const dx = Number(to.position?.[0] || 0) - Number(from.position?.[0] || 0);
    const dz = Number(to.position?.[2] || 0) - Number(from.position?.[2] || 0);
    if (Math.abs(dx) < 0.6 || Math.abs(dz) < 0.6) continue;

    const yaw = normalizedYaw(from);
    const alongX = Math.abs(Math.cos(yaw)) >= Math.abs(Math.sin(yaw));
    if (alongX) {
      to.position[2] = from.position[2];
      routeAdjustments++;
    } else {
      to.position[0] = from.position[0];
      routeAdjustments++;
    }
  }

  // 2) Collision/clearance pass: push overlapping modules apart.
  const clearance = input.optimizeFor === 'compact' ? 0.2 : 0.35;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (!isMovableForSpacing(node)) continue;
    node.position[0] = snapToGrid(Number(node.position?.[0] || 0), 0.05);
    node.position[2] = snapToGrid(Number(node.position?.[2] || 0), 0.05);

    for (let guard = 0; guard < 80; guard++) {
      let moved = false;
      for (let j = 0; j < i; j++) {
        const other = nodes[j];
        const a = getAxisAlignedHalfExtents(node, input.beltWidthMm);
        const b = getAxisAlignedHalfExtents(other, input.beltWidthMm);
        const dx = Number(node.position?.[0] || 0) - Number(other.position?.[0] || 0);
        const dz = Number(node.position?.[2] || 0) - Number(other.position?.[2] || 0);
        const overlapX = a.halfX + b.halfX + clearance - Math.abs(dx);
        const overlapZ = a.halfZ + b.halfZ + clearance - Math.abs(dz);
        if (overlapX <= 0 || overlapZ <= 0) continue;

        if (overlapX < overlapZ) {
          const dir = dx >= 0 ? 1 : -1;
          node.position[0] = Number(node.position?.[0] || 0) + dir * (overlapX + 0.05);
        } else {
          const dir = dz >= 0 ? 1 : -1;
          node.position[2] = Number(node.position?.[2] || 0) + dir * (overlapZ + 0.05);
        }
        spacingAdjustments++;
        moved = true;
      }
      if (!moved) break;
    }
    node.position[0] = snapToGrid(Number(node.position?.[0] || 0), 0.1);
    node.position[2] = snapToGrid(Number(node.position?.[2] || 0), 0.1);
  }

  if (routeAdjustments > 0) {
    warnings.push(`Auto-route tidy applied (${routeAdjustments} connection alignment adjustments).`);
  }
  if (spacingAdjustments > 0) {
    warnings.push(`Auto-spacing applied (${spacingAdjustments} overlap/clearance adjustments).`);
  }
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
  const baseSpeed = input.beltSpeedMpm || 20;
  const totalM = input.totalLengthMm / 1000;
  
  // Calculate belt speed needed for target TPM
  const productSpacing = (input.productSizeMm[0] / 1000) * 1.5; // 1.5x product length spacing
  const requiredSpeed = (input.targetTPM / 60) * productSpacing; // m/s
  const requiredSpeedMpm = requiredSpeed * 60;
  let speed = baseSpeed;
  if (input.optimizeFor === 'throughput') {
    speed = Math.max(baseSpeed, Math.ceil(requiredSpeedMpm * 1.15));
  } else if (input.optimizeFor === 'cost') {
    speed = Math.max(8, Math.min(baseSpeed, Math.ceil(Math.max(requiredSpeedMpm * 1.03, baseSpeed * 0.8))));
  } else if (input.optimizeFor === 'compact') {
    speed = Math.max(baseSpeed, Math.ceil(requiredSpeedMpm * 1.05));
  }
  if (requiredSpeedMpm > speed * 1.12) {
    warnings.push(`Belt speed ${speed} m/min may be too slow for ${input.targetTPM} TPM. Recommended: ${Math.ceil(requiredSpeedMpm)} m/min.`);
  }
  if (input.optimizeFor === 'compact' && totalM > 20) {
    warnings.push('Compact mode selected on a long line. Review maintenance access clearances after generation.');
  }

  const lengthFactor = input.optimizeFor === 'compact'
    ? 0.78
    : input.optimizeFor === 'throughput'
      ? 1.1
      : 1.0;
  const scaledLen = (mm: number, minMm = 1200) => Math.max(minMm, Math.round(mm * lengthFactor));

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
  const infeedLen = scaledLen(Math.min(3000, input.totalLengthMm * 0.2), 1000);
  const infeed = n('belt-conveyor', [cursorX + infeedLen / 2000, 0, cursorZ], {
    length: infeedLen, width: convWidth, height: convHeight, beltSpeed: speed,
  }, 'Infeed Conveyor');
  nodes.push(infeed);
  edges.push(edge(source.id, infeed.id));
  cursorX += infeedLen / 1000 + 0.5;
  let lastNodeId = infeed.id;

  // ── Buffer / accumulation zone (optional) ──
  if (input.includeBufferZone) {
    const bufferLen = scaledLen(1800, 1400);
    const bufferConv = n('belt-conveyor', [cursorX + bufferLen / 2000, 0, cursorZ], {
      length: bufferLen,
      width: convWidth,
      height: convHeight,
      beltSpeed: Math.max(10, speed * 0.92),
    }, 'Accumulation Buffer');
    nodes.push(bufferConv);
    edges.push(edge(lastNodeId, bufferConv.id));
    cursorX += bufferLen / 1000 + 0.4;
    lastNodeId = bufferConv.id;
  }

  // ── Sensor + Stopper section ──
  if (input.includeSensorLogic) {
    const sensorTag = 'SE001';
    const sensor = n('sensor', [cursorX, 0, cursorZ], {
      sensorTag,
      sensorType: 'through-beam',
      mountHeight: convHeight,
      beltWidth: convWidth,
      showBeam: true,
      mountPosition: 0.3,
      parentConveyorId: lastNodeId,
    }, 'Sensor');
    nodes.push(sensor);

    const stopper = n('stopper', [cursorX + 0.3, 0, cursorZ], {
      stopperMode: 'sensor-triggered',
      triggerSensorTag: sensorTag,
      engaged: true,
      width: convWidth,
      mountHeight: convHeight,
      mountPosition: 0.7,
      parentConveyorId: lastNodeId,
    }, 'Stopper');
    nodes.push(stopper);
  }

  // ── Inspection section ──
  if (input.includeInspection) {
    const mainConvLen = scaledLen(Math.min(3000, input.totalLengthMm * 0.25), 1500);
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
      length: scaledLen(2000, 1300), width: convWidth, height: convHeight, beltSpeed: speed,
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
      length: scaledLen(2000, 1300), width: convWidth, height: convHeight, beltSpeed: speed,
    }, 'Pre-Bend');
    nodes.push(bendConv);
    edges.push(edge(lastNodeId, bendConv.id));
    cursorX += 2.5;
    lastNodeId = bendConv.id;

    // Bend 90°
    cursorZ += 2;
    const afterBend = n('belt-conveyor', [cursorX, 0, cursorZ + 1], {
      length: scaledLen(2000, 1300), width: convWidth, height: convHeight, beltSpeed: speed,
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
        length: scaledLen(2000, 1300), width: convWidth, height: convHeight, beltSpeed: speed,
      }, 'Return Conveyor');
      afterBend2.rotation = [0, Math.PI, 0];
      nodes.push(afterBend2);
      edges.push(edge(lastNodeId, afterBend2.id));
      cursorX -= 2.5;
      lastNodeId = afterBend2.id;
    }
  }

  // ── Outfeed conveyor ──
  const outfeedLen = scaledLen(Math.min(3000, input.totalLengthMm * 0.15), 900);
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

  // ── Auto-route + auto-space pass ──
  autoRouteAndSpaceLayout(nodes, edges, input, warnings);

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

  const conveyorNodes = nodes.filter((nd) => String(nd.type).includes('conveyor'));
  const estConveyorLengthM = conveyorNodes.reduce((sum, nd) => sum + (Number(nd.parameters?.length || 0) / 1000), 0);
  const extentX = nodes.map((nd) => Number(nd.position?.[0] || 0));
  const extentZ = nodes.map((nd) => Number(nd.position?.[2] || 0));
  const widthX = Math.max(3, (Math.max(...extentX, 0) - Math.min(...extentX, 0)) + 3.2);
  const depthZ = Math.max(2.5, (Math.max(...extentZ, 0) - Math.min(...extentZ, 0)) + 2.2);
  const footprint = widthX * depthZ;
  const throughputBySpeed = Math.max(1, Math.floor((speed / Math.max(productSpacing, 0.2))));
  const estimatedThroughputTpm = Math.min(input.targetTPM, throughputBySpeed);
  const estimatedCycleTimeSec = Number((60 / Math.max(estimatedThroughputTpm, 1)).toFixed(2));
  const capexScore =
    nodes.length
    + (input.includeRobotPalletizing ? 4 : 0)
    + (input.includeInspection ? 2 : 0)
    + (input.includeBufferZone ? 1 : 0);
  const capexBand: LayoutKpis['capexBand'] = capexScore >= 16 ? 'High' : capexScore >= 10 ? 'Medium' : 'Low';

  const description = [
    `Generated ${input.lineType} layout with ${nodes.length} nodes.`,
    `Line length: ${totalM.toFixed(1)}m, Target: ${input.targetTPM} TPM.`,
    `Optimization: ${input.optimizeFor}.`,
    input.includeSensorLogic ? 'Includes sensor-stopper logic.' : '',
    input.includeInspection ? 'Includes checkweigher + labeler.' : '',
    input.includeRobotPalletizing ? 'Includes robot palletizing cell.' : '',
    input.includeBufferZone ? 'Includes accumulation buffer zone.' : '',
  ].filter(Boolean).join(' ');

  return {
    nodes,
    edges,
    warnings,
    description,
    kpis: {
      estimatedThroughputTpm,
      estimatedCycleTimeSec,
      estimatedFootprintM2: Number(footprint.toFixed(1)),
      estimatedConveyorLengthM: Number(estConveyorLengthM.toFixed(1)),
      capexBand,
    },
  };
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
  optimizeFor: 'balanced',
  includeBufferZone: true,
  autoRouteAndSpace: true,
};
