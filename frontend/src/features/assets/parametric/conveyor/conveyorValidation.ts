/**
 * Conveyor Parameter Validation & Normalization
 */
import { ConveyorParams, CONVEYOR_DEFAULTS, CONVEYOR_LIMITS } from './conveyorTypes';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function normalizeConveyorParams(partial: Partial<ConveyorParams>): ConveyorParams {
  const p = { ...CONVEYOR_DEFAULTS, ...partial };

  // Clamp numeric values to limits
  for (const [key, limits] of Object.entries(CONVEYOR_LIMITS)) {
    const k = key as keyof ConveyorParams;
    if (typeof p[k] === 'number') {
      (p as any)[k] = clamp(p[k] as number, limits.min, limits.max);
    }
  }

  // Support spacing can't exceed length
  p.supportSpacingMm = Math.min(p.supportSpacingMm, p.lengthMm);

  return p;
}

export function validateConveyorParams(params: ConveyorParams): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const [key, limits] of Object.entries(CONVEYOR_LIMITS)) {
    const val = (params as any)[key];
    if (typeof val === 'number') {
      if (val < limits.min) errors.push(`${key} (${val}) is below minimum (${limits.min})`);
      if (val > limits.max) errors.push(`${key} (${val}) exceeds maximum (${limits.max})`);
    }
  }

  if (params.supportSpacingMm > params.lengthMm) {
    warnings.push('Support spacing exceeds conveyor length');
  }

  if (params.angleDeg > 20 && params.conveyorType === 'roller') {
    warnings.push('Roller conveyors above 20° may cause product slipping');
  }

  if (params.conveyorType === 'cleated' && params.angleDeg === 0) {
    warnings.push('Cleated conveyors are typically used on inclines — consider setting an angle');
  }

  if (params.conveyorType === 'cleated' && params.angleDeg > 30 && !params.sidewallEnabled) {
    warnings.push('Steep inclines (>30°) benefit from sidewalls to prevent spillage');
  }

  return { valid: errors.length === 0, errors, warnings };
}
