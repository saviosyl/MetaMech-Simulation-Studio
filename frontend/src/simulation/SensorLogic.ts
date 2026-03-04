/**
 * Sensor Logic System — MetaMech Simulation Studio
 *
 * Industrial sensor simulation with detection capabilities:
 * - Presence detection
 * - Color detection
 * - Type detection
 * - Size class detection
 * - Metadata/tag detection
 * - Zone occupied/clear
 *
 * Sensors emit events that can be consumed by the rule engine
 * (stoppers, pushers, routing logic).
 */

import { Product } from './Product';

// ─── Sensor Capabilities ───────────────────────────────────────

export type SensorCapability =
  | 'presence'
  | 'color'
  | 'type'
  | 'size'
  | 'metadata'
  | 'zone';

export type SizeClass = 'small' | 'medium' | 'large' | 'oversized';

// ─── Sensor Configuration ──────────────────────────────────────

export interface SensorConfig {
  /** What the sensor can detect */
  capabilities: SensorCapability[];

  /** Detection range in meters (radius from sensor position) */
  detectionRangeMm: number;

  /** Filter: only trigger for specific colors (empty = any) */
  colorFilter: string[];

  /** Filter: only trigger for specific product types (empty = any) */
  typeFilter: string[];

  /** Filter: only trigger for specific size classes (empty = any) */
  sizeFilter: SizeClass[];

  /** Filter: only trigger for products with specific metadata tags */
  tagFilter: string[];

  /** Cooldown between triggers in seconds */
  cooldownSec: number;

  /** Debounce: minimum detection time before trigger (prevents false triggers) */
  debounceSec: number;
}

export const DEFAULT_SENSOR_CONFIG: SensorConfig = {
  capabilities: ['presence'],
  detectionRangeMm: 300,
  colorFilter: [],
  typeFilter: [],
  sizeFilter: [],
  tagFilter: [],
  cooldownSec: 0,
  debounceSec: 0,
};

// ─── Sensor Output Events ──────────────────────────────────────

export type SensorEventType =
  | 'itemDetected'
  | 'itemCleared'
  | 'itemColorDetected'
  | 'itemTypeDetected'
  | 'itemSizeDetected'
  | 'zoneOccupied'
  | 'zoneClear'
  | 'countIncrement';

export interface SensorEvent {
  type: SensorEventType;
  sensorNodeId: string;
  simTime: number;
  productId?: string;
  detectedColor?: string;
  detectedType?: string;
  detectedSize?: SizeClass;
  detectedTags?: string[];
  zoneProductCount?: number;
}

// ─── Sensor State ──────────────────────────────────────────────

export interface SensorState {
  /** Currently detecting a product */
  triggered: boolean;
  /** Products currently in detection zone */
  productsInZone: string[];
  /** Last trigger time */
  lastTriggerTime: number;
  /** Continuous detection start time (for debounce) */
  detectionStartTime: number | null;
  /** Count of items that passed through */
  itemCount: number;
  /** Last detected values */
  lastColor: string | null;
  lastType: string | null;
  lastSize: SizeClass | null;
  /** Pending events for this tick */
  pendingEvents: SensorEvent[];
}

export function createSensorState(): SensorState {
  return {
    triggered: false,
    productsInZone: [],
    lastTriggerTime: -Infinity,
    detectionStartTime: null,
    itemCount: 0,
    lastColor: null,
    lastType: null,
    lastSize: null,
    pendingEvents: [],
  };
}

// ─── Sensor Evaluation ─────────────────────────────────────────

/**
 * Classify product size based on dimensions.
 */
function classifySize(size: [number, number, number]): SizeClass {
  const volume = size[0] * size[1] * size[2];
  if (volume < 0.005) return 'small';       // < 5 liters
  if (volume < 0.05) return 'medium';       // < 50 liters
  if (volume < 0.2) return 'large';         // < 200 liters
  return 'oversized';
}

/**
 * Check if a product passes the sensor's filters.
 */
function matchesFilter(product: Product, config: SensorConfig): boolean {
  // Color filter
  if (config.colorFilter.length > 0) {
    if (!config.colorFilter.includes(product.color)) return false;
  }

  // Type filter
  if (config.typeFilter.length > 0) {
    if (!config.typeFilter.includes(product.type)) return false;
  }

  // Size filter
  if (config.sizeFilter.length > 0) {
    const sizeClass = classifySize(product.size);
    if (!config.sizeFilter.includes(sizeClass)) return false;
  }

  // Tag filter (products would need a tags field - future)
  // if (config.tagFilter.length > 0) { ... }

  return true;
}

/**
 * Evaluate sensor against nearby products. Returns events for this tick.
 */
export function evaluateSensor(
  sensorNodeId: string,
  sensorWorldPos: [number, number, number],
  config: SensorConfig,
  state: SensorState,
  products: Product[],
  simTime: number,
): SensorEvent[] {
  const events: SensorEvent[] = [];
  const rangeMtrs = config.detectionRangeMm / 1000;

  // Find products in detection zone
  const inZone: Product[] = [];
  for (const product of products) {
    if (product.state === 'completed') continue;
    const dx = product.currentPosition[0] - sensorWorldPos[0];
    const dz = product.currentPosition[2] - sensorWorldPos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist <= rangeMtrs) {
      inZone.push(product);
    }
  }

  // Filter products by sensor config
  const matchingProducts = inZone.filter(p => matchesFilter(p, config));
  const matchingIds = matchingProducts.map(p => p.id);

  // Check for new arrivals (entered zone)
  const previousIds = state.productsInZone;
  const newArrivals = matchingIds.filter(id => !previousIds.includes(id));
  const departures = previousIds.filter(id => !matchingIds.includes(id));

  // Cooldown check
  const cooldownPassed = (simTime - state.lastTriggerTime) >= config.cooldownSec;

  // Handle new detections
  for (const arrival of newArrivals) {
    const product = matchingProducts.find(p => p.id === arrival);
    if (!product || !cooldownPassed) continue;

    // Debounce: start detection timer
    if (config.debounceSec > 0 && state.detectionStartTime === null) {
      state.detectionStartTime = simTime;
      continue; // Wait for debounce
    }
    if (config.debounceSec > 0 && state.detectionStartTime !== null) {
      if ((simTime - state.detectionStartTime) < config.debounceSec) continue;
    }

    // Item detected
    events.push({
      type: 'itemDetected',
      sensorNodeId,
      simTime,
      productId: product.id,
    });

    state.itemCount++;
    events.push({
      type: 'countIncrement',
      sensorNodeId,
      simTime,
      productId: product.id,
    });

    // Color detection
    if (config.capabilities.includes('color')) {
      state.lastColor = product.color;
      events.push({
        type: 'itemColorDetected',
        sensorNodeId,
        simTime,
        productId: product.id,
        detectedColor: product.color,
      });
    }

    // Type detection
    if (config.capabilities.includes('type')) {
      state.lastType = product.type;
      events.push({
        type: 'itemTypeDetected',
        sensorNodeId,
        simTime,
        productId: product.id,
        detectedType: product.type,
      });
    }

    // Size detection
    if (config.capabilities.includes('size')) {
      const sizeClass = classifySize(product.size);
      state.lastSize = sizeClass;
      events.push({
        type: 'itemSizeDetected',
        sensorNodeId,
        simTime,
        productId: product.id,
        detectedSize: sizeClass,
      });
    }

    state.lastTriggerTime = simTime;
  }

  // Handle departures
  for (const _departure of departures) {
    events.push({
      type: 'itemCleared',
      sensorNodeId,
      simTime,
    });
  }

  // Zone events
  if (config.capabilities.includes('zone')) {
    const wasOccupied = previousIds.length > 0;
    const isOccupied = matchingIds.length > 0;

    if (!wasOccupied && isOccupied) {
      events.push({
        type: 'zoneOccupied',
        sensorNodeId,
        simTime,
        zoneProductCount: matchingIds.length,
      });
    }
    if (wasOccupied && !isOccupied) {
      events.push({
        type: 'zoneClear',
        sensorNodeId,
        simTime,
      });
    }
  }

  // Update state
  state.productsInZone = matchingIds;
  state.triggered = matchingIds.length > 0;
  if (matchingIds.length === 0) {
    state.detectionStartTime = null;
  }
  state.pendingEvents = events;

  return events;
}

/**
 * Convert editor parameters to SensorConfig.
 */
export function editorParamsToSensorConfig(params: Record<string, any>): SensorConfig {
  const capabilities: SensorCapability[] = ['presence'];
  if (params.detectColor) capabilities.push('color');
  if (params.detectType) capabilities.push('type');
  if (params.detectSize) capabilities.push('size');
  if (params.detectZone !== false) capabilities.push('zone');

  return {
    capabilities,
    detectionRangeMm: params.detectionRange || params.detectionRangeMm || 300,
    colorFilter: params.colorFilter ? params.colorFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    typeFilter: params.typeFilter ? params.typeFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    sizeFilter: params.sizeFilter ? params.sizeFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    tagFilter: params.tagFilter ? params.tagFilter.split(',').map((s: string) => s.trim()).filter(Boolean) : [],
    cooldownSec: params.cooldown || 0,
    debounceSec: params.debounce || 0,
  };
}
