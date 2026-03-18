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
  return fn(params);
}
