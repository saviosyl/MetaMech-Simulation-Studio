import type { BuilderResult } from './beltConveyorBuilder';
import { buildBeltConveyor } from './beltConveyorBuilder';
import { buildBeltConveyorGLB, preloadBeltConveyorParts } from './beltConveyorGLBBuilder';
import { buildRollerConveyor } from './rollerConveyorBuilder';
import { wallBuilder, doorBuilder, windowBuilder, palletRackBuilder, stairsBuilder } from './environmentBuilders';
import { buildTransferBridge, buildPopupTransfer, buildPusherTransfer, buildMergeDivert } from './transferBuilders';
import { buildSpiralConveyor } from './spiralConveyorBuilder';
import { buildVerticalLifter } from './verticalLifterBuilder';

export type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

export type BuilderFunction = (params: Record<string, any>) => BuilderResult;

// Preload GLB conveyor parts
preloadBeltConveyorParts();

/** Belt conveyor with GLB parts, falling back to procedural */
function beltConveyorWithGLBFallback(params: Record<string, any>): BuilderResult {
  const glbResult = buildBeltConveyorGLB(params);
  if (glbResult) return glbResult;
  // GLB parts not loaded yet — use procedural builder
  return buildBeltConveyor(params);
}

const registry: Record<string, BuilderFunction> = {
  beltConveyorBuilder: beltConveyorWithGLBFallback,
  rollerConveyorBuilder: buildRollerConveyor,
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
