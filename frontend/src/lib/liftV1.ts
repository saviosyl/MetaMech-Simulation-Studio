import { AssetMetadata, AssetMovingPart } from '../types';

type LiftV1RuntimeLimit = {
  min: number;
  max: number;
  default: number;
  step: number;
};

export type LiftV1RuntimeParameterLimits = {
  targetHeightMm: LiftV1RuntimeLimit;
  liftSpeedMmPerSec: LiftV1RuntimeLimit;
  conveyorSpeedMpm: LiftV1RuntimeLimit;
};

export type LiftV1NormalizeValidateResult = {
  metadata: AssetMetadata;
  errors: string[];
  isValid: boolean;
};

type NormalizeValidateOptions = {
  strictValidation?: boolean;
};

function toFinite(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeControlMode(value: unknown): 'auto' | 'manual' {
  return String(value || '').trim().toLowerCase() === 'manual' ? 'manual' : 'auto';
}

function normalizeRuntimeLimit(
  input: unknown,
  fallback: LiftV1RuntimeLimit
): LiftV1RuntimeLimit {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  const min = toFinite(raw.min, fallback.min);
  const max = toFinite(raw.max, fallback.max);
  const normalizedMax = max > min ? max : (min + Math.max(1, fallback.step));
  const def = toFinite(raw.default, fallback.default);
  const step = Math.max(0.000001, toFinite(raw.step, fallback.step));
  return {
    min,
    max: normalizedMax,
    default: Math.min(normalizedMax, Math.max(min, def)),
    step,
  };
}

function normalizeRuntimeLimits(
  input: unknown,
  lowerLimitMm: number,
  upperLimitMm: number,
  homeMm: number,
  liftSpeedMmPerSec: number,
  conveyorSpeedMpm: number
): LiftV1RuntimeParameterLimits {
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {};
  return {
    targetHeightMm: normalizeRuntimeLimit(raw.targetHeightMm, {
      min: lowerLimitMm,
      max: upperLimitMm,
      default: homeMm,
      step: 10,
    }),
    liftSpeedMmPerSec: normalizeRuntimeLimit(raw.liftSpeedMmPerSec, {
      min: 1,
      max: 2000,
      default: Math.max(1, liftSpeedMmPerSec),
      step: 10,
    }),
    conveyorSpeedMpm: normalizeRuntimeLimit(raw.conveyorSpeedMpm, {
      min: 0,
      max: 120,
      default: Math.max(0, conveyorSpeedMpm),
      step: 1,
    }),
  };
}

export function normalizeAndValidateLiftV1Metadata(
  metadataInput: AssetMetadata | null | undefined,
  options: NormalizeValidateOptions = {}
): LiftV1NormalizeValidateResult {
  const strictValidation = options.strictValidation !== false;
  const metadata = (metadataInput && typeof metadataInput === 'object' ? metadataInput : {}) as AssetMetadata;
  if (String(metadata.behaviorTemplate || '') !== 'lift-conveyor') {
    return {
      metadata,
      errors: [],
      isValid: true,
    };
  }

  const rawBehavior = (
    metadata.behaviorConfig && typeof metadata.behaviorConfig === 'object' && !Array.isArray(metadata.behaviorConfig)
      ? metadata.behaviorConfig as Record<string, unknown>
      : {}
  );

  const movingPartId = String(rawBehavior.movingPartId || '').trim();
  const lowerInfeedNodeId = String(rawBehavior.lowerInfeedNodeId || '').trim();
  const upperOutfeedNodeId = String(rawBehavior.upperOutfeedNodeId || '').trim();
  const rawAxis = String(rawBehavior.liftAxis || 'z').trim().toLowerCase();

  const lowerLimitMm = toFinite(rawBehavior.lowerLimitMm, toFinite(rawBehavior.liftMinMm, 0));
  const upperLimitMm = toFinite(rawBehavior.upperLimitMm, toFinite(rawBehavior.liftMaxMm, 2500));
  const normalizedUpperLimitMm = upperLimitMm > lowerLimitMm ? upperLimitMm : (lowerLimitMm + 1);
  const rawHomeMm = toFinite(
    rawBehavior.homeMm,
    toFinite(rawBehavior.homeTargetMm, toFinite(rawBehavior.liftDefaultMm, lowerLimitMm))
  );
  const clampedHomeMm = Math.min(normalizedUpperLimitMm, Math.max(lowerLimitMm, rawHomeMm));
  const liftSpeedMmPerSec = Math.max(0, toFinite(rawBehavior.liftSpeedMmPerSec, 350));
  const conveyorSpeedMpm = Math.max(0, toFinite(rawBehavior.conveyorSpeedMpm, 12));
  const controlMode = normalizeControlMode(rawBehavior.controlMode);

  const normalizedBehaviorConfig: Record<string, unknown> = {
    ...rawBehavior,
    movingPartId,
    liftAxis: 'z',
    lowerLimitMm,
    upperLimitMm: normalizedUpperLimitMm,
    homeMm: clampedHomeMm,
    liftSpeedMmPerSec,
    conveyorSpeedMpm,
    controlMode,
    lowerInfeedNodeId,
    upperOutfeedNodeId,
    // Backward-compatible aliases (kept for existing runtime readers).
    liftMinMm: lowerLimitMm,
    liftMaxMm: normalizedUpperLimitMm,
    liftDefaultMm: clampedHomeMm,
    homeTargetMm: clampedHomeMm,
  };

  const runtimeParameterLimits = normalizeRuntimeLimits(
    metadata.runtimeParameterLimits,
    lowerLimitMm,
    normalizedUpperLimitMm,
    clampedHomeMm,
    liftSpeedMmPerSec,
    conveyorSpeedMpm
  );

  const normalizedMetadata: AssetMetadata = {
    ...metadata,
    behaviorConfig: normalizedBehaviorConfig,
    runtimeParameterLimits,
  };

  if (!strictValidation) {
    return {
      metadata: normalizedMetadata,
      errors: [],
      isValid: true,
    };
  }

  const errors: string[] = [];
  if (!movingPartId) errors.push('Lift V1 requires movingPartId');
  if (!lowerInfeedNodeId) errors.push('Lift V1 requires lowerInfeedNodeId');
  if (!upperOutfeedNodeId) errors.push('Lift V1 requires upperOutfeedNodeId');
  if (rawAxis !== 'z') errors.push('Lift V1 axis must be z');
  if (!(normalizedUpperLimitMm > lowerLimitMm)) errors.push('Lift V1 requires upperLimitMm > lowerLimitMm');
  if (rawHomeMm < lowerLimitMm || rawHomeMm > normalizedUpperLimitMm) {
    errors.push('Lift V1 requires home/default within lower/upper limits');
  }
  if (!(liftSpeedMmPerSec > 0)) errors.push('Lift V1 requires liftSpeedMmPerSec > 0');

  const nodeIds = new Set(
    Array.isArray(metadata.nodes)
      ? metadata.nodes.map((node) => String(node.id || '').trim()).filter(Boolean)
      : []
  );
  if (lowerInfeedNodeId && !nodeIds.has(lowerInfeedNodeId)) {
    errors.push('Lift V1 lowerInfeedNodeId must reference an existing node');
  }
  if (upperOutfeedNodeId && !nodeIds.has(upperOutfeedNodeId)) {
    errors.push('Lift V1 upperOutfeedNodeId must reference an existing node');
  }

  const movingParts = Array.isArray(metadata.movableParts) ? metadata.movableParts as AssetMovingPart[] : [];
  if (movingPartId && !movingParts.some((part) => String(part.id || '').trim() === movingPartId)) {
    errors.push('Lift V1 movingPartId must reference an existing moving part');
  }

  return {
    metadata: normalizedMetadata,
    errors,
    isValid: errors.length === 0,
  };
}
