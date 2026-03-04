/**
 * Spiral Conveyor Type Definitions — MetaMech Simulation Studio
 * Inspired by AmbaFlex SpiralVeyor industrial systems
 */
import * as THREE from 'three';

export type SpiralDirection = 'up' | 'down';
export type SupportStyle = 'standard' | 'heavy-duty';
export type BaseType = 'compact' | 'reinforced';
export type CenterStructure = 'column' | 'framed-core';

export interface SpiralConveyorParams {
  direction: SpiralDirection;
  beltWidthMm: number;
  diameterMm: number;
  totalHeightMm: number;
  turns: number;
  risePerTurnMm: number;
  infeedAngleDeg: number;
  outfeedAngleDeg: number;
  speedMpm: number;
  sideGuidesEnabled: boolean;
  guideHeightMm: number;
  supportStyle: SupportStyle;
  baseType: BaseType;
  centerStructure: CenterStructure;
  beltColor?: string;
}

export interface SpiralSnapPoint {
  id: string;
  type: 'input' | 'output';
  localPosition: [number, number, number];
  direction: [number, number, number];
}

export interface SpiralSimulationMeta {
  pathLengthMm: number;
  speedMpm: number;
  entryPort: { position: [number, number, number]; direction: [number, number, number] };
  exitPort: { position: [number, number, number]; direction: [number, number, number] };
  travelTimeSec: number;
  elevationChangeMm: number;
}

export interface BuiltSpiral {
  root: THREE.Group;
  snapPoints: SpiralSnapPoint[];
  simulationMeta: SpiralSimulationMeta;
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export const SPIRAL_DEFAULTS: SpiralConveyorParams = {
  direction: 'up',
  beltWidthMm: 400,
  diameterMm: 1800,
  totalHeightMm: 3000,
  turns: 3,
  risePerTurnMm: 1000,
  infeedAngleDeg: 0,
  outfeedAngleDeg: 180,
  speedMpm: 20,
  sideGuidesEnabled: true,
  guideHeightMm: 100,
  supportStyle: 'standard',
  baseType: 'reinforced',
  centerStructure: 'column',
};

export const SPIRAL_LIMITS: Record<string, { min: number; max: number; step?: number }> = {
  beltWidthMm: { min: 150, max: 800, step: 50 },
  diameterMm: { min: 800, max: 4000, step: 100 },
  totalHeightMm: { min: 500, max: 12000, step: 100 },
  turns: { min: 0.5, max: 10, step: 0.5 },
  risePerTurnMm: { min: 200, max: 3000, step: 50 },
  infeedAngleDeg: { min: 0, max: 360, step: 15 },
  outfeedAngleDeg: { min: 0, max: 360, step: 15 },
  speedMpm: { min: 1, max: 60, step: 1 },
  guideHeightMm: { min: 40, max: 250, step: 10 },
};
