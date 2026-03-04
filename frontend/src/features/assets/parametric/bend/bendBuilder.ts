/**
 * Bend Conveyor Builder — Main entry point for curved conveyor assembly
 *
 * Assembles: body + supports + guides + snap points + simulation metadata
 */
import * as THREE from 'three';
import {
  BendConveyorParams, BuiltBendConveyor, BendSnapPoint,
  BendSimulationMeta, BEND_DEFAULTS, BEND_LIMITS,
} from './bendTypes';
import { buildBendConveyorBody, buildCurvedGuides, buildCurvedSupports } from './bendGeometry';

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function normalizeBendParams(partial: Partial<BendConveyorParams>): BendConveyorParams {
  const p = { ...BEND_DEFAULTS, ...partial };

  for (const [key, lim] of Object.entries(BEND_LIMITS)) {
    const k = key as keyof BendConveyorParams;
    if (typeof p[k] === 'number') {
      (p as any)[k] = clamp(p[k] as number, lim.min, lim.max);
    }
  }

  // Snap bend angle to nearest valid value
  const validAngles = [30, 45, 60, 90, 180] as const;
  const closest = validAngles.reduce((prev, curr) =>
    Math.abs(curr - p.bendAngleDeg) < Math.abs(prev - p.bendAngleDeg) ? curr : prev
  );
  p.bendAngleDeg = closest;

  // Ensure radius > width/2 (otherwise inner edge would be negative)
  p.radiusMm = Math.max(p.radiusMm, p.widthMm / 2 + 100);

  return p;
}

/** Arc XZ helper matching the geometry module */
function arcXZ(angleDeg: number, radius: number, dir: 'left' | 'right'): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  if (dir === 'right') {
    return [Math.sin(a) * radius, Math.cos(a) * radius];
  } else {
    return [-Math.sin(a) * radius, Math.cos(a) * radius];
  }
}

function arcTangent(angleDeg: number, dir: 'left' | 'right'): [number, number] {
  const a = (angleDeg * Math.PI) / 180;
  if (dir === 'right') {
    return [Math.cos(a), -Math.sin(a)];
  } else {
    return [-Math.cos(a), -Math.sin(a)];
  }
}

/** Build a complete bend conveyor */
export function buildBendConveyor(rawParams: Partial<BendConveyorParams>): BuiltBendConveyor {
  const params = normalizeBendParams(rawParams);
  const radiusM = params.radiusMm / 1000;

  const root = new THREE.Group();
  root.name = `bend-conveyor-${params.bendAngleDeg}-${params.bendDirection}`;

  // 1. Body (frame + surface + drive)
  root.add(buildBendConveyorBody(params));

  // 2. Supports
  const supports = buildCurvedSupports(params);
  if (supports) root.add(supports);

  // 3. Side guides
  const guides = buildCurvedGuides(params);
  if (guides) root.add(guides);

  // 4. Snap points
  const snapPoints = computeBendSnaps(params, radiusM);

  // 5. Simulation metadata
  const simulationMeta = computeBendSimMeta(params, radiusM);

  // 6. Bounds
  const bbox = new THREE.Box3().setFromObject(root);
  const bounds = {
    min: [bbox.min.x, bbox.min.y, bbox.min.z] as [number, number, number],
    max: [bbox.max.x, bbox.max.y, bbox.max.z] as [number, number, number],
  };

  return { root, snapPoints, simulationMeta, bounds };
}

function computeBendSnaps(params: BendConveyorParams, radiusM: number): BendSnapPoint[] {
  const heightM = params.heightMm / 1000;
  const portInset = 0.02;

  // Infeed at angle 0
  const [ix, iz] = arcXZ(0, radiusM, params.bendDirection);
  const [itx, itz] = arcTangent(0, params.bendDirection);

  // Outfeed at bend angle
  const [ox, oz] = arcXZ(params.bendAngleDeg, radiusM, params.bendDirection);
  const [otx, otz] = arcTangent(params.bendAngleDeg, params.bendDirection);

  return [
    {
      id: 'input',
      type: 'input',
      localPosition: [ix - itx * portInset, heightM, iz - itz * portInset],
      direction: [-itx, 0, -itz], // incoming direction (opposite of tangent)
    },
    {
      id: 'output',
      type: 'output',
      localPosition: [ox + otx * portInset, heightM, oz + otz * portInset],
      direction: [otx, 0, otz],
    },
  ];
}

function computeBendSimMeta(params: BendConveyorParams, radiusM: number): BendSimulationMeta {
  const angleRad = (params.bendAngleDeg * Math.PI) / 180;
  const pathLength = radiusM * angleRad * 1000; // mm

  const snaps = computeBendSnaps(params, radiusM);

  return {
    pathLengthMm: pathLength,
    speedMpm: params.speedMpm,
    entryPort: {
      position: snaps[0].localPosition,
      direction: snaps[0].direction,
    },
    exitPort: {
      position: snaps[1].localPosition,
      direction: snaps[1].direction,
    },
    surfaceType: params.surfaceType,
  };
}

/** Convert editor store params to BendConveyorParams */
export function editorParamsToBendParams(p: Record<string, any>): Partial<BendConveyorParams> {
  return {
    bendAngleDeg: parseInt(p.bendAngle || p.bendAngleDeg || '90', 10) as any,
    bendDirection: p.bendDirection || 'right',
    surfaceType: p.surfaceType || p.conveyorType || 'belt',
    widthMm: p.width || p.widthMm || 600,
    radiusMm: p.radius || p.radiusMm || 1000,
    heightMm: p.height || p.heightMm || 800,
    speedMpm: p.speed || p.speedMpm || p.beltSpeed || 20,
    sideGuidesEnabled: p.sideGuides ?? p.sideGuidesEnabled ?? true,
    sideGuideHeightMm: p.guideHeight || p.sideGuideHeightMm || 60,
    showSupports: p.showLegs ?? p.showSupports ?? true,
    supportSpacingDeg: p.supportSpacing || p.supportSpacingDeg || 45,
    adjustableFeetEnabled: p.adjustableFeetEnabled ?? true,
    footAdjustmentMm: p.footAdjustmentMm ?? 25,
    motorSide: p.motorSide || 'outer',
    beltColor: p.beltColor || undefined,
  };
}
