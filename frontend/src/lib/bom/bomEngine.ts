/**
 * BOM Engine — calculates quantities based on parametric dimensions.
 *
 * Reference model: item belt conveyor, base config = 2000mm L × 400mm W × 900mm H
 * When dimensions change, parts scale according to their rules.
 */

import { partsCatalog, PartDef } from './partsCatalog';

export interface BOMLine {
  /** Line item number */
  item: number;
  /** Part number */
  partNumber: string;
  /** Part name */
  name: string;
  /** Description */
  description: string;
  /** Category */
  category: PartDef['category'];
  /** Calculated quantity */
  quantity: number;
  /** Unit */
  unit: string;
  /** Weight per unit (kg) */
  unitWeight: number;
  /** Total weight for this line (kg) */
  totalWeight: number;
  /** Price per unit (0 if not set) */
  unitPrice: number;
  /** Total price for this line */
  totalPrice: number;
}

export interface BOMResult {
  /** All line items */
  lines: BOMLine[];
  /** Summary */
  totalParts: number;
  totalWeight: number;
  totalPrice: number;
  /** Configuration used */
  config: {
    length: number;
    width: number;
    height: number;
    beltSpeed: number;
    driveEnd: string;
    sideGuides: boolean;
  };
  /** Generated timestamp */
  generatedAt: string;
}

/** Base model dimensions (mm) */
const BASE_LENGTH = 2000;
// const BASE_HEIGHT = 900;

/**
 * Calculate the number of support stations for a given length.
 * Base model (2000mm) has ~3 support stations.
 * Roughly 1 station per 750mm of conveyor length.
 */
function calcSupportStations(lengthMm: number): number {
  return Math.max(2, Math.ceil(lengthMm / 750));
}

/**
 * Calculate the number of frame connections for a given length.
 * Base model (2000mm) uses 32 connection sets.
 * Scales roughly linearly with length.
 */
function calcConnections(lengthMm: number): number {
  const ratio = lengthMm / BASE_LENGTH;
  return Math.max(8, Math.round(32 * ratio));
}

/**
 * Calculate belt length needed (conveyor length × 2 for loop + drum wrap).
 * Returns value in meters.
 */
function calcBeltLength(lengthMm: number): number {
  // Belt loops around: top run + bottom return + 2× drum circumference
  const drumCirc = Math.PI * 0.06; // ~60mm drum radius
  const totalMm = (lengthMm * 2) + (drumCirc * 1000 * 2);
  return Math.ceil(totalMm / 100) / 10; // round up to 0.1m
}

/**
 * Generate a full BOM for the given conveyor parameters.
 */
export function generateBOM(params: Record<string, any>): BOMResult {
  const lengthMm = params.length ?? 3000;
  const widthMm = params.width ?? 600;
  const heightMm = params.height ?? 800;
  const beltSpeed = params.beltSpeed ?? 20;
  const driveEnd = params.driveEnd ?? 'right';
  const sideGuides = params.sideGuides ?? true;

  const supportStations = calcSupportStations(lengthMm);
  const connections = calcConnections(lengthMm);
  const beltLengthM = calcBeltLength(lengthMm);

  // Length ratio for general scaling
  const lengthRatio = lengthMm / BASE_LENGTH;
  // Width ratio reserved for future per-width scaling
  // const widthRatio = widthMm / 400;

  const lines: BOMLine[] = [];
  let itemNum = 1;

  for (const part of partsCatalog) {
    let qty = part.baseQty;

    switch (part.scaling) {
      case 'fixed':
        // Quantity doesn't change with dimensions
        qty = part.baseQty;
        break;

      case 'per-length':
        // Scales linearly with length
        qty = Math.max(1, Math.round(part.baseQty * lengthRatio));
        break;

      case 'per-support':
        // Scales with number of support stations
        // Base has ~3 stations, each station uses baseQty/3 of these parts
        {
          const perStation = part.baseQty / 3;
          qty = Math.max(part.baseQty >= 8 ? 4 : 2, Math.round(perStation * supportStations));
        }
        break;

      case 'per-connection':
        // Scales with frame connections (proportional to length)
        {
          const ratio = connections / 32;
          qty = Math.max(4, Math.round(part.baseQty * ratio));
        }
        break;

      case 'belt-length':
        // Belt length scales with conveyor length
        qty = beltLengthM;
        break;

      case 'per-width-pair':
        // One pair per width side (mostly fixed at 2)
        qty = part.baseQty;
        break;
    }

    // Round up for non-meter units
    if (part.unit !== 'm') {
      qty = Math.ceil(qty);
    }

    const unitWeight = part.weightKg ?? 0;
    const totalWeight = +(qty * unitWeight).toFixed(3);

    lines.push({
      item: itemNum++,
      partNumber: part.partNumber,
      name: part.name,
      description: part.description,
      category: part.category,
      quantity: qty,
      unit: part.unit,
      unitWeight,
      totalWeight,
      unitPrice: 0,
      totalPrice: 0,
    });
  }

  const totalParts = lines.reduce((sum, l) => sum + (l.unit === 'pcs' || l.unit === 'set' ? l.quantity : 0), 0);
  const totalWeight = +lines.reduce((sum, l) => sum + l.totalWeight, 0).toFixed(2);
  const totalPrice = +lines.reduce((sum, l) => sum + l.totalPrice, 0).toFixed(2);

  return {
    lines,
    totalParts,
    totalWeight,
    totalPrice,
    config: {
      length: lengthMm,
      width: widthMm,
      height: heightMm,
      beltSpeed,
      driveEnd,
      sideGuides,
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get a human-readable summary string.
 */
export function bomSummary(bom: BOMResult): string {
  return [
    `Belt Conveyor ${bom.config.length}×${bom.config.width}×${bom.config.height}mm`,
    `${bom.lines.length} line items | ${bom.totalParts} total parts | ${bom.totalWeight} kg`,
  ].join('\n');
}
