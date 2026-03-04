/**
 * Bend / Curved Conveyor Type Definitions — MetaMech Simulation Studio
 *
 * Supports 30°, 45°, 60°, 90°, 180° bends with configurable radius and width.
 * Infeed is always at local −X, outfeed rotates around Y axis by bendAngle.
 */
import * as THREE from 'three';

export type BendAngle = 30 | 45 | 60 | 90 | 180;
export type BendDirection = 'left' | 'right';
export type BendSurfaceType = 'belt' | 'roller' | 'modular';

export interface BendConveyorParams {
  bendAngleDeg: BendAngle;
  bendDirection: BendDirection;
  surfaceType: BendSurfaceType;
  widthMm: number;
  radiusMm: number;       // center-line radius of the bend
  heightMm: number;       // conveyor belt height from floor
  speedMpm: number;
  sideGuidesEnabled: boolean;
  sideGuideHeightMm: number;
  showSupports: boolean;
  supportSpacingDeg: number; // degrees between support stations
  adjustableFeetEnabled: boolean;
  footAdjustmentMm: number;
  motorSide: 'inner' | 'outer';
}

export interface BendSimulationMeta {
  pathLengthMm: number;
  speedMpm: number;
  entryPort: { position: [number, number, number]; direction: [number, number, number] };
  exitPort: { position: [number, number, number]; direction: [number, number, number] };
  surfaceType: BendSurfaceType;
}

export interface BendSnapPoint {
  id: string;
  type: 'input' | 'output';
  localPosition: [number, number, number];
  direction: [number, number, number];
}

export interface BuiltBendConveyor {
  root: THREE.Group;
  snapPoints: BendSnapPoint[];
  simulationMeta: BendSimulationMeta;
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export const BEND_DEFAULTS: BendConveyorParams = {
  bendAngleDeg: 90,
  bendDirection: 'right',
  surfaceType: 'belt',
  widthMm: 600,
  radiusMm: 1000,
  heightMm: 800,
  speedMpm: 20,
  sideGuidesEnabled: true,
  sideGuideHeightMm: 60,
  showSupports: true,
  supportSpacingDeg: 45,
  adjustableFeetEnabled: true,
  footAdjustmentMm: 25,
  motorSide: 'outer',
};

export const BEND_LIMITS: Record<string, { min: number; max: number; step?: number }> = {
  widthMm: { min: 200, max: 1200, step: 50 },
  radiusMm: { min: 400, max: 4000, step: 50 },
  heightMm: { min: 300, max: 3000, step: 50 },
  speedMpm: { min: 1, max: 120, step: 1 },
  sideGuideHeightMm: { min: 20, max: 200, step: 10 },
  supportSpacingDeg: { min: 15, max: 90, step: 15 },
  footAdjustmentMm: { min: 0, max: 100, step: 5 },
};
