/**
 * Conveyor Builder — Main entry point for parametric conveyor assembly
 *
 * Assembles: body + supports + side guides + snap points + simulation metadata
 */
import * as THREE from 'three';
import { ConveyorParams, BuiltConveyor, SnapPoint, ConveyorSimulationMetadata } from './conveyorTypes';
import { normalizeConveyorParams } from './conveyorValidation';
import { buildConveyorBody } from './conveyorGeometry';
import { buildSupportAssembly } from './conveyorSupports';
import { buildSideGuides } from './conveyorSideGuides';

/** Build a complete parametric conveyor from parameters */
export function buildConveyor(rawParams: Partial<ConveyorParams>): BuiltConveyor {
  const params = normalizeConveyorParams(rawParams);

  const root = new THREE.Group();
  root.name = `conveyor-${params.conveyorType}-${params.driveType}`;

  // 1. Build body (frame + surface + drive)
  const body = buildConveyorBody(params);
  root.add(body);

  // 2. Build supports/legs
  const supports = buildSupportAssembly(params);
  if (supports) root.add(supports);

  // 3. Build side guides
  const guides = buildSideGuides(params);
  if (guides) root.add(guides);

  // 4. Compute snap points
  const snapPoints = computeSnapPoints(params);

  // 5. Compute simulation metadata
  const simulationMeta = computeSimulationMeta(params);

  // 6. Compute bounds
  const bbox = new THREE.Box3().setFromObject(root);
  const bounds = {
    min: [bbox.min.x, bbox.min.y, bbox.min.z] as [number, number, number],
    max: [bbox.max.x, bbox.max.y, bbox.max.z] as [number, number, number],
  };

  return { root, snapPoints, simulationMeta, bounds };
}

function computeSnapPoints(params: ConveyorParams): SnapPoint[] {
  const halfL = params.lengthMm / 2000;
  const h = params.heightMm / 1000;
  const portInset = 0.02; // 20mm from belt end

  return [
    {
      id: 'input',
      type: 'input',
      localPosition: [-halfL + portInset, h, 0],
      direction: [-1, 0, 0],
    },
    {
      id: 'output',
      type: 'output',
      localPosition: [halfL - portInset, h, 0],
      direction: [1, 0, 0],
    },
    {
      id: 'left-anchor',
      type: 'anchor',
      localPosition: [0, h, params.widthMm / 2000],
      direction: [0, 0, 1],
    },
    {
      id: 'right-anchor',
      type: 'anchor',
      localPosition: [0, h, -params.widthMm / 2000],
      direction: [0, 0, -1],
    },
  ];
}

function computeSimulationMeta(params: ConveyorParams): ConveyorSimulationMetadata {
  const halfL = params.lengthMm / 2000;
  const h = params.heightMm / 1000;
  const portInset = 0.02;

  // Path length accounts for incline
  const angleRad = (params.angleDeg * Math.PI) / 180;
  const pathLength = params.lengthMm / Math.cos(angleRad);

  return {
    pathLengthMm: pathLength,
    speedMpm: params.speedMpm,
    entryPort: {
      position: [-halfL + portInset, h, 0],
      direction: params.direction === 'forward' ? [-1, 0, 0] : [1, 0, 0],
    },
    exitPort: {
      position: [halfL - portInset, h, 0],
      direction: params.direction === 'forward' ? [1, 0, 0] : [-1, 0, 0],
    },
    transportMode: params.conveyorType,
  };
}

/** Convert editor store parameters to ConveyorParams */
export function editorParamsToConveyorParams(editorParams: Record<string, any>): Partial<ConveyorParams> {
  return {
    conveyorType: editorParams.conveyorType || 'belt',
    driveType: editorParams.driveType || editorParams.drivePosition || 'end',
    widthMm: editorParams.width || editorParams.widthMm,
    lengthMm: editorParams.length || editorParams.lengthMm,
    heightMm: editorParams.height || editorParams.heightMm,
    angleDeg: editorParams.inclineAngle || editorParams.angleDeg || 0,
    sideGuidesEnabled: editorParams.sideGuides ?? editorParams.sideGuidesEnabled ?? false,
    sideGuideHeightMm: editorParams.guideHeight || editorParams.sideGuideHeightMm || 60,
    adjustableFeetEnabled: editorParams.adjustableFeetEnabled ?? true,
    footAdjustmentMm: editorParams.footAdjustmentMm ?? 25,
    supportSpacingMm: editorParams.supportSpacing || editorParams.supportSpacingMm,
    speedMpm: editorParams.beltSpeed || editorParams.speedMpm || 20,
    direction: editorParams.direction || 'forward',
    motorSide: editorParams.motorSide || 'right',
    showSupports: editorParams.showLegs ?? editorParams.showSupports ?? true,
    supportType: editorParams.supportType || 'floor',
    ceilingHeightMm: editorParams.ceilingHeight || 3000,
    hangerStyle: editorParams.hangerStyle || 'twin-rod',
    hangerCrossbar: editorParams.hangerCrossbar ?? true,
    beltColor: editorParams.beltColor || '#1e1e1e',
    frameColor: editorParams.frameColor || '#c0c0c0',
    cleatHeightMm: editorParams.cleatHeight || editorParams.cleatHeightMm || 25,
    cleatSpacingMm: editorParams.cleatSpacing || editorParams.cleatSpacingMm || 150,
    cleatStyle: editorParams.cleatStyle || 'straight',
    sidewallEnabled: editorParams.sidewallEnabled ?? false,
    sidewallHeightMm: editorParams.sidewallHeight || editorParams.sidewallHeightMm || 80,
  };
}
