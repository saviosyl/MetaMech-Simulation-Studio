import type { BuilderResult } from './beltConveyorBuilder';
import { buildBeltConveyor } from './beltConveyorBuilder';
import { buildRollerConveyor } from './rollerConveyorBuilder';
import { wallBuilder, doorBuilder, windowBuilder, palletRackBuilder, stairsBuilder } from './environmentBuilders';

export type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

export type BuilderFunction = (params: Record<string, any>) => BuilderResult;

const registry: Record<string, BuilderFunction> = {
  beltConveyorBuilder: buildBeltConveyor,
  rollerConveyorBuilder: buildRollerConveyor,
  wallBuilder,
  doorBuilder,
  windowBuilder,
  palletRackBuilder,
  stairsBuilder,
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
