/**
 * Spiral Conveyor Builder — Main assembly entry point
 */
import * as THREE from 'three';
import {
  SpiralConveyorParams, BuiltSpiral, SpiralSnapPoint,
  SpiralSimulationMeta, SPIRAL_DEFAULTS, SPIRAL_LIMITS,
} from './spiralTypes';
import {
  buildSpiralBelt, buildSpiralGuides, buildCenterStructure,
  buildSpiralBrackets, buildBaseStructure, buildTransitions,
  INFEED_LENGTH_M, OUTFEED_LENGTH_M,
} from './spiralGeometry';

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function normalizeSpiralParams(partial: Partial<SpiralConveyorParams>): SpiralConveyorParams {
  const p = { ...SPIRAL_DEFAULTS, ...partial };
  for (const [key, lim] of Object.entries(SPIRAL_LIMITS)) {
    const k = key as keyof SpiralConveyorParams;
    if (typeof p[k] === 'number') {
      (p as any)[k] = clamp(p[k] as number, lim.min, lim.max);
    }
  }
  // Sync height ↔ turns × risePerTurn
  p.totalHeightMm = p.turns * p.risePerTurnMm;
  return p;
}

/** Build a complete spiral conveyor */
export function buildSpiralConveyor(rawParams: Partial<SpiralConveyorParams>): BuiltSpiral {
  const params = normalizeSpiralParams(rawParams);

  const root = new THREE.Group();
  root.name = `spiral-conveyor-${params.direction}`;

  // 1. Base
  root.add(buildBaseStructure(params));

  // 2. Center support
  root.add(buildCenterStructure(params));

  // 3. Spiral belt surface
  root.add(buildSpiralBelt(params));

  // 4. Support brackets
  root.add(buildSpiralBrackets(params));

  // 5. Side guides
  const guides = buildSpiralGuides(params);
  if (guides) root.add(guides);

  // 6. Infeed/outfeed transitions
  root.add(buildTransitions(params));

  // 7. Snap points
  const snapPoints = computeSpiralSnaps(params);

  // 8. Simulation metadata
  const simulationMeta = computeSpiralSimMeta(params);

  // 9. Bounds
  const bbox = new THREE.Box3().setFromObject(root);
  const bounds = {
    min: [bbox.min.x, bbox.min.y, bbox.min.z] as [number, number, number],
    max: [bbox.max.x, bbox.max.y, bbox.max.z] as [number, number, number],
  };

  return { root, snapPoints, simulationMeta, bounds };
}

function computeSpiralSnaps(params: SpiralConveyorParams): SpiralSnapPoint[] {
  const radius = params.diameterMm / 2000;
  const totalHeight = params.totalHeightMm / 1000;
  const startAngle = (params.infeedAngleDeg * Math.PI) / 180;
  const endAngle = startAngle + params.turns * Math.PI * 2;

  const infeedY = params.direction === 'up' ? 0 : totalHeight;
  const outfeedY = params.direction === 'up' ? totalHeight : 0;

  // Infeed port — at end of straight transition, tangent to spiral
  const infeedDirX = -Math.sin(startAngle);
  const infeedDirZ = Math.cos(startAngle);
  const infeedX = Math.cos(startAngle) * radius + infeedDirX * 0.4;
  const infeedZ = Math.sin(startAngle) * radius + infeedDirZ * 0.4;

  // Outfeed port
  const outfeedDirX = -Math.sin(endAngle);
  const outfeedDirZ = Math.cos(endAngle);
  const outfeedX = Math.cos(endAngle) * radius + outfeedDirX * 0.4;
  const outfeedZ = Math.sin(endAngle) * radius + outfeedDirZ * 0.4;

  return [
    {
      id: 'input',
      type: 'input',
      localPosition: [infeedX, infeedY, infeedZ],
      direction: [infeedDirX, 0, infeedDirZ],
    },
    {
      id: 'output',
      type: 'output',
      localPosition: [outfeedX, outfeedY, outfeedZ],
      direction: [outfeedDirX, 0, outfeedDirZ],
    },
  ];
}

function computeSpiralSimMeta(params: SpiralConveyorParams): SpiralSimulationMeta {
  const radius = params.diameterMm / 2000;
  const totalHeight = params.totalHeightMm / 1000;
  const circumference = Math.PI * 2 * radius;
  const spiralPathLen = Math.sqrt(
    (circumference * params.turns) ** 2 + totalHeight ** 2
  );
  // Add transition lengths
  const totalPath = spiralPathLen + INFEED_LENGTH_M + OUTFEED_LENGTH_M;
  const speedMs = params.speedMpm / 60; // m/s
  const travelTime = totalPath / speedMs;

  const snaps = computeSpiralSnaps(params);

  return {
    pathLengthMm: totalPath * 1000,
    speedMpm: params.speedMpm,
    entryPort: {
      position: snaps[0].localPosition,
      direction: snaps[0].direction,
    },
    exitPort: {
      position: snaps[1].localPosition,
      direction: snaps[1].direction,
    },
    travelTimeSec: travelTime,
    elevationChangeMm: params.totalHeightMm,
  };
}

/** Convert editor store params to SpiralConveyorParams */
export function editorParamsToSpiralParams(p: Record<string, any>): Partial<SpiralConveyorParams> {
  return {
    direction: p.direction || p.spiralDirection || 'up',
    beltWidthMm: p.beltWidth || p.beltWidthMm || p.width,
    diameterMm: p.diameter || p.diameterMm,
    totalHeightMm: p.totalHeight || p.totalHeightMm,
    turns: p.turns,
    risePerTurnMm: p.risePerTurn || p.risePerTurnMm,
    infeedAngleDeg: p.infeedAngle || p.infeedAngleDeg || 0,
    outfeedAngleDeg: p.outfeedAngle || p.outfeedAngleDeg || 180,
    speedMpm: p.speed || p.speedMpm || p.beltSpeed || 20,
    sideGuidesEnabled: p.sideGuides ?? p.sideGuidesEnabled ?? true,
    guideHeightMm: p.guideHeight || p.guideHeightMm || 100,
    supportStyle: p.supportStyle || 'standard',
    baseType: p.baseType || 'reinforced',
    centerStructure: p.centerStructure || 'column',
  };
}

// Re-export constants for geometry access
export { INFEED_LENGTH_M, OUTFEED_LENGTH_M } from './spiralGeometry';
