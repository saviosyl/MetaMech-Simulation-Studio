/**
 * Conveyor Type Definitions — MetaMech Simulation Studio
 */

export type ConveyorType = 'belt' | 'roller' | 'modular' | 'cleated';
export type DriveType = 'end' | 'center';

export interface ConveyorParams {
  conveyorType: ConveyorType;
  driveType: DriveType;
  widthMm: number;
  lengthMm: number;
  heightMm: number;
  angleDeg: number;
  sideGuidesEnabled: boolean;
  sideGuideHeightMm: number;
  adjustableFeetEnabled: boolean;
  footAdjustmentMm: number;
  supportSpacingMm: number;
  speedMpm: number;
  direction: 'forward' | 'reverse';
  motorSide: 'left' | 'right';
  showSupports: boolean;
  supportType: 'floor' | 'overhang' | 'cantilever' | 'ceiling-hanger';
  /** Ceiling height in mm for ceiling-hanger supports */
  ceilingHeightMm: number;
  /** Hanger rod style: single or twin */
  hangerStyle: 'single-rod' | 'twin-rod';
  /** Whether to show crossbar between hanger rods */
  hangerCrossbar: boolean;
  beltColor: string;
  // Cleated belt specific
  cleatHeightMm: number;
  cleatSpacingMm: number;
  cleatStyle: 'straight' | 'chevron' | 'angled';
  sidewallEnabled: boolean;
  sidewallHeightMm: number;
}

export interface ConveyorSimulationMetadata {
  pathLengthMm: number;
  speedMpm: number;
  entryPort: { position: [number, number, number]; direction: [number, number, number] };
  exitPort: { position: [number, number, number]; direction: [number, number, number] };
  transportMode: ConveyorType;
}

export interface SnapPoint {
  id: string;
  type: 'input' | 'output' | 'anchor';
  localPosition: [number, number, number];
  direction: [number, number, number];
}

export interface BuiltConveyor {
  root: THREE.Group;
  snapPoints: SnapPoint[];
  simulationMeta: ConveyorSimulationMetadata;
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export const CONVEYOR_DEFAULTS: ConveyorParams = {
  conveyorType: 'belt',
  driveType: 'end',
  widthMm: 600,
  lengthMm: 3000,
  heightMm: 800,
  angleDeg: 0,
  sideGuidesEnabled: false,
  sideGuideHeightMm: 60,
  adjustableFeetEnabled: true,
  footAdjustmentMm: 25,
  supportSpacingMm: 1500,
  speedMpm: 20,
  direction: 'forward',
  motorSide: 'right',
  showSupports: true,
  supportType: 'floor',
  ceilingHeightMm: 3000,
  hangerStyle: 'twin-rod',
  hangerCrossbar: true,
  beltColor: '#1e1e1e',
  cleatHeightMm: 25,
  cleatSpacingMm: 150,
  cleatStyle: 'straight',
  sidewallEnabled: false,
  sidewallHeightMm: 80,
};

export const CONVEYOR_LIMITS: Record<string, { min: number; max: number; step?: number }> = {
  widthMm: { min: 200, max: 1500, step: 50 },
  lengthMm: { min: 500, max: 15000, step: 100 },
  heightMm: { min: 300, max: 3000, step: 50 },
  angleDeg: { min: 0, max: 35, step: 1 },
  sideGuideHeightMm: { min: 20, max: 200, step: 10 },
  footAdjustmentMm: { min: 0, max: 100, step: 5 },
  supportSpacingMm: { min: 500, max: 4000, step: 100 },
  speedMpm: { min: 1, max: 120, step: 1 },
  cleatHeightMm: { min: 10, max: 80, step: 5 },
  cleatSpacingMm: { min: 50, max: 500, step: 25 },
  sidewallHeightMm: { min: 30, max: 200, step: 10 },
};

import * as THREE from 'three';
