import { getModuleDefinition } from '../moduleLibrary';
import { isAccessoryType } from '../accessorySnap';

const NON_PROCESS_FALLBACK_TYPES = new Set([
  // Environment / architecture / safety
  'wall', 'door', 'window', 'stairs', 'pallet-rack', 'safety-rail', 'warehouse-shell',
  'fence', 'fence-gate', 'bollard', 'operator-station', 'electrical-cabinet',
  'tower-light', 'hmi-stand', 'machine-enclosure', 'floor-zone', 'pallet-stack',
  'floor-marking', 'floor', 'stretch-wrapper', 'guard-partition', 'light-curtain',
  // Pallets and decorative objects
  'pallet', 'cardboard-box', 'eur-pallet', 'standard-pallet', 'custom-pallet',
  // Actors / vehicles
  'operator', 'operator-1', 'operator-2', 'operator-3', 'engineer',
  'forklift', 'agv', 'pallet-truck',
  // Static assets
  'forklift-static', 'agv-static', 'worker-static', 'pallet-truck-static',
  'pallet-static', 'cardboard-box-static',
]);

const NON_FLOW_MODULAR_TYPES = new Set([
  'mm85-support-leg',
  'mm85-end-drive-support',
]);
const FLOW_PROCESS_OVERRIDES = new Set([
]);

/**
 * True only for real process-flow equipment that should be checked for edge connectivity.
 */
export function shouldValidateFlowConnectivity(nodeType: string): boolean {
  if (FLOW_PROCESS_OVERRIDES.has(nodeType)) return true;
  if (isAccessoryType(nodeType)) return false;
  if (NON_FLOW_MODULAR_TYPES.has(nodeType)) return false;

  const moduleDef = getModuleDefinition(nodeType);
  if (moduleDef) return moduleDef.category === 'process' || moduleDef.category === 'modular';

  return !NON_PROCESS_FALLBACK_TYPES.has(nodeType);
}

