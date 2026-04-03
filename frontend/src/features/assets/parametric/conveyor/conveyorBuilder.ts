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
import { buildSafeGroup, isFiniteNumber, isFiniteVec3Tuple } from '../../../../lib/modelSafety';

function safePlaceholderConveyor(params: ConveyorParams): BuiltConveyor {
  const root = new THREE.Group();
  root.name = 'conveyor-fallback-safe';

  const l = Math.max(0.5, params.lengthMm / 1000);
  const w = Math.max(0.2, params.widthMm / 1000);
  const h = Math.max(0.3, params.heightMm / 1000);

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(l, 0.08, w),
    new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.45, roughness: 0.55 }),
  );
  frame.position.set(0, h - 0.04, 0);
  frame.castShadow = true;
  frame.receiveShadow = true;
  root.add(frame);

  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(Math.max(0.2, l - 0.04), 0.01, Math.max(0.16, w - 0.02)),
    new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.05, roughness: 0.85 }),
  );
  belt.position.set(0, h + 0.005, 0);
  belt.receiveShadow = true;
  root.add(belt);

  const portInset = Math.min(0.03, Math.max(0.01, l * 0.05));
  const snapPoints: SnapPoint[] = [
    {
      id: 'input',
      type: 'input',
      localPosition: [-l / 2 + portInset, h, 0],
      direction: [-1, 0, 0],
    },
    {
      id: 'output',
      type: 'output',
      localPosition: [l / 2 - portInset, h, 0],
      direction: [1, 0, 0],
    },
  ];

  const simulationMeta: ConveyorSimulationMetadata = {
    pathLengthMm: l * 1000,
    speedMpm: params.speedMpm,
    entryPort: {
      position: [-l / 2 + portInset, h, 0],
      direction: params.direction === 'forward' ? [-1, 0, 0] : [1, 0, 0],
    },
    exitPort: {
      position: [l / 2 - portInset, h, 0],
      direction: params.direction === 'forward' ? [1, 0, 0] : [-1, 0, 0],
    },
    transportMode: params.conveyorType,
  };

  const bbox = new THREE.Box3().setFromObject(root);
  return {
    root,
    snapPoints,
    simulationMeta,
    bounds: {
      min: [bbox.min.x, bbox.min.y, bbox.min.z],
      max: [bbox.max.x, bbox.max.y, bbox.max.z],
    },
  };
}

function finiteRootTransforms(root: THREE.Object3D): boolean {
  let ok = true;
  root.traverse((obj) => {
    if (
      !isFiniteNumber(obj.position.x) || !isFiniteNumber(obj.position.y) || !isFiniteNumber(obj.position.z)
      || !isFiniteNumber(obj.rotation.x) || !isFiniteNumber(obj.rotation.y) || !isFiniteNumber(obj.rotation.z)
      || !isFiniteNumber(obj.scale.x) || !isFiniteNumber(obj.scale.y) || !isFiniteNumber(obj.scale.z)
    ) {
      ok = false;
    }
  });
  return ok;
}

function validateBuiltConveyor(candidate: BuiltConveyor): boolean {
  if (!finiteRootTransforms(candidate.root)) return false;
  const hasFiniteBounds =
    isFiniteVec3Tuple(candidate.bounds.min)
    && isFiniteVec3Tuple(candidate.bounds.max);
  if (!hasFiniteBounds) return false;
  const sizeX = candidate.bounds.max[0] - candidate.bounds.min[0];
  const sizeY = candidate.bounds.max[1] - candidate.bounds.min[1];
  const sizeZ = candidate.bounds.max[2] - candidate.bounds.min[2];
  if (!Number.isFinite(sizeX) || !Number.isFinite(sizeY) || !Number.isFinite(sizeZ)) return false;
  if (sizeX <= 0 || sizeY <= 0 || sizeZ <= 0) return false;
  if (sizeX > 200 || sizeY > 60 || sizeZ > 80) return false;
  return true;
}

/** Build a complete parametric conveyor from parameters */
export function buildConveyor(rawParams: Partial<ConveyorParams>): BuiltConveyor {
  const params = normalizeConveyorParams(rawParams);

  try {
    const root = new THREE.Group();
    root.name = `conveyor-${params.conveyorType}-${params.driveType}`;

    // 1. Build body (frame + surface + drive) with hard safety wrapper.
    const body = buildSafeGroup(
      'conveyor-body',
      () => buildConveyorBody(params),
      () => {
        const fallback = new THREE.Group();
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(Math.max(0.5, params.lengthMm / 1000), 0.12, Math.max(0.2, params.widthMm / 1000)),
          new THREE.MeshStandardMaterial({ color: 0x666666, wireframe: true }),
        );
        box.position.set(0, Math.max(0.3, params.heightMm / 1000), 0);
        fallback.add(box);
        return fallback;
      },
    );
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
    const built: BuiltConveyor = {
      root,
      snapPoints,
      simulationMeta,
      bounds: {
        min: [bbox.min.x, bbox.min.y, bbox.min.z],
        max: [bbox.max.x, bbox.max.y, bbox.max.z],
      },
    };

    if (!validateBuiltConveyor(built)) {
      throw new Error('Invalid conveyor geometry bounds generated');
    }

    return built;
  } catch (error) {
    console.error('[ConveyorBuilder] Failed to build conveyor safely, using fallback:', error);
    return safePlaceholderConveyor(params);
  }
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
