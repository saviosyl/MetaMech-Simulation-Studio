import type { BuilderResult } from './beltConveyorBuilder';
import { buildBeltConveyor } from './beltConveyorBuilder';
import { buildBeltConveyorFromGLB } from './beltConveyorGLBBuilder';
import { buildRollerConveyor } from './rollerConveyorBuilder';
import { buildModularConveyorStraight, buildModularConveyorCurve } from './modularConveyorBuilder';
import { wallBuilder, doorBuilder, windowBuilder, palletRackBuilder, stairsBuilder, fenceBuilder, fenceGateBuilder, bollardBuilder, operatorStationBuilder, electricalCabinetBuilder, towerLightBuilder, hmiStandBuilder, machineEnclosureBuilder, floorZoneBuilder, palletStackBuilder } from './environmentBuilders';
import { buildTransferBridge, buildPopupTransfer, buildPusherTransfer, buildMergeDivert } from './transferBuilders';
import { buildSpiralConveyor } from './spiralConveyorBuilder';
import { buildVerticalLifter } from './verticalLifterBuilder';
import { buildFrameAssembly } from './frameAssemblyBuilder';
import {
  buildMM85ConveyorSection,
  buildMM85DriveEnd,
  buildMM85IdlerEnd,
  buildMM85GuideRail,
  buildMM85SupportLeg,
  buildMM85EndDriveSupport,
  getMM85SourceReadyVersion,
} from './mm85Builder';

export type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

export type BuilderFunction = (params: Record<string, any>) => BuilderResult;

// Belt conveyor GLB is now loaded directly via useGLTF in BeltConveyorGLB.tsx
// preloadBeltConveyorGLB(); // disabled — old builder no longer used for belt-conveyor

/**
 * Belt conveyor builder: uses the real uploaded GLB model,
 * falls back to procedural builder only while GLB is still loading.
 */
function beltConveyorBuilderWithGLB(params: Record<string, any>): BuilderResult {
  const glbResult = buildBeltConveyorFromGLB(params);
  if (glbResult) {
    console.log('[BeltConveyor] Using GLB model ✓');
    return glbResult;
  }
  console.log('[BeltConveyor] GLB not ready, using procedural fallback');
  return buildBeltConveyor(params);
}

/**
 * Admin parametric template builder (basic belt v1).
 * Maps template params to the existing belt builder input.
 */
function adminBasicBeltTemplateBuilder(params: Record<string, any>): BuilderResult {
  const lengthMm = Number(params.lengthMm);
  const widthMm = Number(params.widthMm);
  const topHeightMm = Number(params.topHeightMm);
  return buildBeltConveyor({
    ...params,
    length: Number.isFinite(lengthMm) ? lengthMm : 3000,
    width: Number.isFinite(widthMm) ? widthMm : 600,
    height: Number.isFinite(topHeightMm) ? topHeightMm : 850,
    sideGuides: true,
  });
}

const registry: Record<string, BuilderFunction> = {
  beltConveyorBuilder: beltConveyorBuilderWithGLB,
  rollerConveyorBuilder: buildRollerConveyor,
  modularConveyorStraightBuilder: buildModularConveyorStraight,
  modularConveyorCurveBuilder: buildModularConveyorCurve,
  wallBuilder,
  doorBuilder,
  windowBuilder,
  palletRackBuilder,
  stairsBuilder,
  fenceBuilder,
  fenceGateBuilder,
  bollardBuilder,
  operatorStationBuilder,
  electricalCabinetBuilder,
  towerLightBuilder,
  hmiStandBuilder,
  machineEnclosureBuilder,
  floorZoneBuilder,
  palletStackBuilder,
  transferBridgeBuilder: buildTransferBridge,
  popupTransferBuilder: buildPopupTransfer,
  pusherTransferBuilder: buildPusherTransfer,
  mergeDivertBuilder: buildMergeDivert,
  spiralConveyorBuilder: buildSpiralConveyor,
  verticalLifterBuilder: buildVerticalLifter,
  frameAssemblyBuilder: buildFrameAssembly,
  mm85ConveyorSectionBuilder: buildMM85ConveyorSection,
  mm85DriveEndBuilder: buildMM85DriveEnd,
  mm85IdlerEndBuilder: buildMM85IdlerEnd,
  mm85GuideRailBuilder: buildMM85GuideRail,
  mm85SupportLegBuilder: buildMM85SupportLeg,
  mm85EndDriveSupportBuilder: buildMM85EndDriveSupport,
  adminBasicBeltTemplateBuilder,
};

export function getBuilder(name: string): BuilderFunction | undefined {
  return registry[name];
}

export function runBuilder(name: string, params: Record<string, any>): BuilderResult | null {
  const fn = registry[name];
  if (!fn) {
    console.warn(`No builder registered for: ${name}`);
    return null;
  }
  try {
    const result = fn(params);
    return result;
  } catch (error) {
    console.error(`[ParametricBuilder] ${name} failed during runBuilder`, error);
    return null;
  }
}

export function validateBuilderResult(result: BuilderResult | null): boolean {
  if (!result) return false;
  if (!result.group) return false;
  const b = result.bounds;
  if (!b) return false;
  const min = b.min;
  const max = b.max;
  if (!Number.isFinite(min.x) || !Number.isFinite(min.y) || !Number.isFinite(min.z)) return false;
  if (!Number.isFinite(max.x) || !Number.isFinite(max.y) || !Number.isFinite(max.z)) return false;
  const sx = max.x - min.x;
  const sy = max.y - min.y;
  const sz = max.z - min.z;
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sz)) return false;
  if (sx <= 0 || sy <= 0 || sz <= 0) return false;
  return true;
}

export function getBuilderRenderVersion(name: string): number {
  if (name.startsWith('mm85')) {
    return getMM85SourceReadyVersion();
  }
  return 0;
}
