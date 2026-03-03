import type { BuilderResult } from './beltConveyorBuilder';
import { buildBeltConveyor } from './beltConveyorBuilder';
import { buildBeltConveyorFromGLB, preloadBeltConveyorGLB } from './beltConveyorGLBBuilder';
import { buildRollerConveyor } from './rollerConveyorBuilder';
import { buildModularConveyorStraight, buildModularConveyorCurve } from './modularConveyorBuilder';
import { wallBuilder, doorBuilder, windowBuilder, palletRackBuilder, stairsBuilder } from './environmentBuilders';
import { buildTransferBridge, buildPopupTransfer, buildPusherTransfer, buildMergeDivert } from './transferBuilders';
import { buildSpiralConveyor } from './spiralConveyorBuilder';
import { buildVerticalLifter } from './verticalLifterBuilder';

export type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

export type BuilderFunction = (params: Record<string, any>) => BuilderResult;

// Start preloading the belt conveyor GLB immediately so it's ready on first use
preloadBeltConveyorGLB();

/**
 * Belt conveyor builder: uses the real uploaded GLB model,
 * falls back to procedural builder only while GLB is still loading.
 */
function beltConveyorBuilderWithGLB(params: Record<string, any>): BuilderResult {
  const glbResult = buildBeltConveyorFromGLB(params);
  if (glbResult) return glbResult;
  // GLB not loaded yet — procedural fallback for first frame only
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
  transferBridgeBuilder: buildTransferBridge,
  popupTransferBuilder: buildPopupTransfer,
  pusherTransferBuilder: buildPusherTransfer,
  mergeDivertBuilder: buildMergeDivert,
  spiralConveyorBuilder: buildSpiralConveyor,
  verticalLifterBuilder: buildVerticalLifter,
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
