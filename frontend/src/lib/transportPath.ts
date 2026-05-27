/**
 * Transport Path System — MetaMech Simulation Studio
 *
 * Defines path models for conveyor transport surfaces.
 * Products move along paths using parametric distance (0→1).
 *
 * Path types:
 * - Straight: linear path along conveyor length axis
 * - Curved: arc path for bend conveyors
 * - Spiral: helical path for spiral conveyors
 * - Inclined: straight path with elevation change
 *
 * All paths produce world-space positions when combined with node transforms.
 */

import { localToWorld } from './nodeTransform';
import { computeSpiralTransferGeometry } from './spiralTransfer';

type Vec3 = [number, number, number];

// ─── Path Interface ────────────────────────────────────────────

export interface TransportPath {
  /** Total path length in meters */
  length: number;

  /** Get local-space position at parametric distance t (0=infeed, 1=outfeed) */
  getLocalPosition(t: number): Vec3;

  /** Get local-space tangent direction at t (normalized) */
  getLocalTangent(t: number): Vec3;

  /** Get local-space up direction at t (for accessory mounting orientation) */
  getLocalUp(t: number): Vec3;

  /** Get world-space position at t, given the parent node's transform */
  getWorldPosition(t: number, nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3;

  /** Get world-space tangent at t */
  getWorldTangent(t: number, nodeRotation: Vec3): Vec3;

  /** Infeed world position */
  getInfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3;

  /** Outfeed world position */
  getOutfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3;
}

// ─── Straight Path ─────────────────────────────────────────────

export class StraightPath implements TransportPath {
  length: number;
  private halfLength: number;
  private infeedHeightM: number;
  private outfeedHeightM: number;
  private tangentLocal: Vec3;

  constructor(lengthMm: number, infeedHeightMm: number, outfeedHeightMm: number) {
    const lengthM = lengthMm / 1000;
    this.halfLength = lengthM / 2;
    this.infeedHeightM = infeedHeightMm / 1000;
    this.outfeedHeightM = outfeedHeightMm / 1000;
    const dy = this.outfeedHeightM - this.infeedHeightM;
    this.length = Math.sqrt(lengthM * lengthM + dy * dy);
    const tanX = lengthM;
    const mag = Math.sqrt(tanX * tanX + dy * dy) || 1;
    this.tangentLocal = [tanX / mag, dy / mag, 0];
  }

  getLocalPosition(t: number): Vec3 {
    const x = -this.halfLength + t * (2 * this.halfLength);
    const y = this.infeedHeightM + (this.outfeedHeightM - this.infeedHeightM) * t;
    return [x, y, 0];
  }

  getLocalTangent(_t: number): Vec3 {
    return this.tangentLocal;
  }

  getLocalUp(_t: number): Vec3 {
    return [0, 1, 0];
  }

  getWorldPosition(t: number, nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return localToWorld(this.getLocalPosition(t), nodePosition, nodeRotation, nodeScale);
  }

  getWorldTangent(t: number, nodeRotation: Vec3): Vec3 {
    const local = this.getLocalTangent(t);
    return localToWorld(local, [0, 0, 0], nodeRotation);
  }

  getInfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(0, nodePosition, nodeRotation, nodeScale);
  }

  getOutfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(1, nodePosition, nodeRotation, nodeScale);
  }
}

// ─── Segmented Incline Path (flat + incline + flat) ────────────

export class SegmentedInclinePath implements TransportPath {
  length: number;
  private x0: number;
  private x1: number;
  private x2: number;
  private x3: number;
  private inY: number;
  private outY: number;
  private infeedLen: number;
  private inclineLen: number;
  private outfeedLen: number;
  private inclineHoriz: number;
  private rise: number;

  constructor(
    infeedStraightLengthMm: number,
    inclinedLengthMm: number,
    outfeedStraightLengthMm: number,
    infeedHeightMm: number,
    outfeedHeightMm: number,
    overallLengthMm?: number,
  ) {
    const infeedRaw = Math.max(0.2, infeedStraightLengthMm / 1000);
    const inclineRaw = Math.max(0.2, inclinedLengthMm / 1000);
    const outfeedRaw = Math.max(0.2, outfeedStraightLengthMm / 1000);
    const sumRaw = infeedRaw + inclineRaw + outfeedRaw;
    const overall = overallLengthMm && Number.isFinite(overallLengthMm)
      ? Math.max(0.6, overallLengthMm / 1000)
      : sumRaw;
    const scale = overall / Math.max(0.001, sumRaw);

    this.infeedLen = infeedRaw * scale;
    this.inclineLen = inclineRaw * scale;
    this.outfeedLen = outfeedRaw * scale;
    this.inY = infeedHeightMm / 1000;
    this.outY = outfeedHeightMm / 1000;
    this.rise = this.outY - this.inY;

    if (Math.abs(this.rise) >= this.inclineLen) {
      this.inclineLen = Math.abs(this.rise) + 0.08;
    }
    this.inclineHoriz = Math.sqrt(Math.max(0.05 * 0.05, this.inclineLen * this.inclineLen - this.rise * this.rise));

    const totalHoriz = this.infeedLen + this.inclineHoriz + this.outfeedLen;
    this.x0 = -totalHoriz / 2;
    this.x1 = this.x0 + this.infeedLen;
    this.x2 = this.x1 + this.inclineHoriz;
    this.x3 = this.x2 + this.outfeedLen;

    this.length = this.infeedLen + this.inclineLen + this.outfeedLen;
  }

  getLocalPosition(t: number): Vec3 {
    const s = Math.max(0, Math.min(1, t)) * this.length;
    if (s <= this.infeedLen) {
      return [this.x0 + s, this.inY, 0];
    }
    if (s <= this.infeedLen + this.inclineLen) {
      const u = (s - this.infeedLen) / Math.max(1e-6, this.inclineLen);
      return [this.x1 + this.inclineHoriz * u, this.inY + this.rise * u, 0];
    }
    const u = (s - this.infeedLen - this.inclineLen) / Math.max(1e-6, this.outfeedLen);
    return [this.x2 + this.outfeedLen * u, this.outY, 0];
  }

  getLocalTangent(t: number): Vec3 {
    const s = Math.max(0, Math.min(1, t)) * this.length;
    if (s <= this.infeedLen) return [1, 0, 0];
    if (s <= this.infeedLen + this.inclineLen) {
      const mag = Math.sqrt(this.inclineHoriz * this.inclineHoriz + this.rise * this.rise) || 1;
      return [this.inclineHoriz / mag, this.rise / mag, 0];
    }
    return [1, 0, 0];
  }

  getLocalUp(_t: number): Vec3 {
    return [0, 1, 0];
  }

  getWorldPosition(t: number, nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return localToWorld(this.getLocalPosition(t), nodePosition, nodeRotation, nodeScale);
  }

  getWorldTangent(t: number, nodeRotation: Vec3): Vec3 {
    return localToWorld(this.getLocalTangent(t), [0, 0, 0], nodeRotation);
  }

  getInfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(0, nodePosition, nodeRotation, nodeScale);
  }

  getOutfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(1, nodePosition, nodeRotation, nodeScale);
  }
}

// ─── Curved Path (Bend Conveyor) ───────────────────────────────

export class CurvedPath implements TransportPath {
  length: number;
  private radiusM: number;
  private angleRad: number;
  private heightM: number;
  private direction: 'left' | 'right';

  constructor(radiusMm: number, angleDeg: number, heightMm: number, direction: 'left' | 'right') {
    this.radiusM = radiusMm / 1000;
    this.angleRad = (angleDeg * Math.PI) / 180;
    this.heightM = heightMm / 1000;
    this.direction = direction;
    this.length = this.radiusM * this.angleRad;
  }

  getLocalPosition(t: number): Vec3 {
    const angle = t * this.angleRad;
    const sign = this.direction === 'right' ? 1 : -1;
    const x = sign * Math.sin(angle) * this.radiusM;
    const z = Math.cos(angle) * this.radiusM;
    return [x, this.heightM, z];
  }

  getLocalTangent(t: number): Vec3 {
    const angle = t * this.angleRad;
    const sign = this.direction === 'right' ? 1 : -1;
    const tx = sign * Math.cos(angle);
    const tz = -Math.sin(angle);
    return [tx, 0, tz];
  }

  getLocalUp(_t: number): Vec3 {
    return [0, 1, 0];
  }

  getWorldPosition(t: number, nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return localToWorld(this.getLocalPosition(t), nodePosition, nodeRotation, nodeScale);
  }

  getWorldTangent(t: number, nodeRotation: Vec3): Vec3 {
    return localToWorld(this.getLocalTangent(t), [0, 0, 0], nodeRotation);
  }

  getInfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(0, nodePosition, nodeRotation, nodeScale);
  }

  getOutfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(1, nodePosition, nodeRotation, nodeScale);
  }
}

// ─── Spiral Path ───────────────────────────────────────────────

export class SpiralPath implements TransportPath {
  length: number;
  private midRadius: number;
  private totalAngle: number;
  private isDown: boolean;
  private tangentLength: number;
  private bottomY: number;
  private topY: number;
  private effectiveHeight: number;
  private inputPort: Vec3;
  private inputFlow: Vec3;
  private outputAnchor: Vec3;
  private outputFlow: Vec3;
  private infeedTangentLen: number;
  private helixLen: number;
  private outfeedTangentLen: number;

  constructor(
    beltWidthMm: number, turns: number,
    outfeedAngleDeg: number,
    infeedHeightMm: number, outfeedHeightMm: number,
    direction: 'up' | 'down',
  ) {
    this.tangentLength = 0.35;
    const spiral = computeSpiralTransferGeometry(
      {
        beltWidth: beltWidthMm,
        turns,
        outfeedAngle: outfeedAngleDeg,
        infeedHeight: infeedHeightMm,
        outfeedHeight: outfeedHeightMm,
        direction,
      },
      this.tangentLength,
    );
    this.isDown = spiral.isDown;
    this.midRadius = spiral.midRadius;
    this.totalAngle = spiral.totalAngle;
    this.bottomY = spiral.bottomY;
    this.topY = spiral.topY;
    this.effectiveHeight = spiral.effectiveHeight;
    this.inputPort = spiral.input.port;
    this.inputFlow = spiral.input.flow;
    this.outputAnchor = spiral.output.anchor;
    this.outputFlow = spiral.output.flow;

    this.infeedTangentLen = this.tangentLength;
    const arcLen = this.midRadius * this.totalAngle;
    this.helixLen = Math.sqrt(arcLen * arcLen + this.effectiveHeight * this.effectiveHeight);
    this.outfeedTangentLen = this.tangentLength;
    this.length = this.infeedTangentLen + this.helixLen + this.outfeedTangentLen;
  }

  getLocalPosition(t: number): Vec3 {
    const s = Math.max(0, Math.min(1, t)) * this.length;

    if (s <= this.infeedTangentLen) {
      return [
        this.inputPort[0] + this.inputFlow[0] * s,
        this.inputPort[1],
        this.inputPort[2] + this.inputFlow[2] * s,
      ];
    }

    if (s <= this.infeedTangentLen + this.helixLen) {
      const u = (s - this.infeedTangentLen) / this.helixLen;
      const angle = this.isDown ? (1 - u) * this.totalAngle : u * this.totalAngle;
      const x = Math.cos(angle) * this.midRadius;
      const z = Math.sin(angle) * this.midRadius;
      const y = this.isDown
        ? this.topY - u * this.effectiveHeight
        : this.bottomY + u * this.effectiveHeight;
      return [x, y, z];
    }

    const sOut = s - this.infeedTangentLen - this.helixLen;
    return [
      this.outputAnchor[0] + this.outputFlow[0] * sOut,
      this.outputAnchor[1],
      this.outputAnchor[2] + this.outputFlow[2] * sOut,
    ];
  }

  getLocalTangent(t: number): Vec3 {
    const s = Math.max(0, Math.min(1, t)) * this.length;
    if (s <= this.infeedTangentLen) {
      return this.inputFlow;
    }
    if (s > this.infeedTangentLen + this.helixLen) {
      return this.outputFlow;
    }

    const u = (s - this.infeedTangentLen) / this.helixLen;
    const angle = this.isDown ? (1 - u) * this.totalAngle : u * this.totalAngle;
    const dAdU = this.isDown ? -this.totalAngle : this.totalAngle;
    const tx = -Math.sin(angle) * this.midRadius * dAdU;
    const tz = Math.cos(angle) * this.midRadius * dAdU;
    const ty = this.isDown ? -this.effectiveHeight : this.effectiveHeight;
    const mag = Math.sqrt(tx * tx + ty * ty + tz * tz) || 1;
    return [tx / mag, ty / mag, tz / mag];
  }

  getLocalUp(_t: number): Vec3 {
    return [0, 1, 0];
  }

  getWorldPosition(t: number, nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return localToWorld(this.getLocalPosition(t), nodePosition, nodeRotation, nodeScale);
  }

  getWorldTangent(t: number, nodeRotation: Vec3): Vec3 {
    return localToWorld(this.getLocalTangent(t), [0, 0, 0], nodeRotation);
  }

  getInfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(0, nodePosition, nodeRotation, nodeScale);
  }

  getOutfeedWorld(nodePosition: Vec3, nodeRotation: Vec3, nodeScale?: Vec3): Vec3 {
    return this.getWorldPosition(1, nodePosition, nodeRotation, nodeScale);
  }
}

// ─── Path Factory ──────────────────────────────────────────────

/**
 * Create the appropriate transport path for a given node type + parameters.
 */
export function createTransportPath(type: string, params: Record<string, any>): TransportPath | null {
  switch (type) {
    case 'conveyor':
    case 'belt-conveyor':
    case 'roller-conveyor': {
      const length = params.length || 3000;
      const baseHeight = Number(params.height ?? 800);
      const angleDeg = params.inclineAngle ?? params.angleDeg ?? params.angle ?? 0;
      const angleRad = (angleDeg * Math.PI) / 180;
      const inferredOutfeed = baseHeight + Math.tan(angleRad) * (length / 1000) * 1000;
      const inRaw = Number(params.infeedHeight);
      const outRaw = Number(params.outfeedHeight);
      const hasIn = Number.isFinite(inRaw);
      const hasOut = Number.isFinite(outRaw);
      // Legacy conveyor presets initialize in/out at 850 mm.
      // If user changes "height" but leaves those untouched, keep ports/path coupled to height.
      const followBaseHeight =
        hasIn && hasOut && inRaw === 850 && outRaw === 850 && baseHeight !== 800;
      const infeedHeight = followBaseHeight ? baseHeight : (hasIn ? inRaw : baseHeight);
      const outfeedHeight = followBaseHeight ? inferredOutfeed : (hasOut ? outRaw : inferredOutfeed);
      return new StraightPath(length, infeedHeight, outfeedHeight);
    }

    case 'bend-conveyor': {
      const radius = params.radius || params.radiusMm || 1000;
      const angle = parseInt(params.bendAngle || params.bendAngleDeg || '90', 10);
      const height = Number(params.height || params.heightMm || 800);
      const inRaw = Number(params.infeedHeight);
      const outRaw = Number(params.outfeedHeight);
      const hasIn = Number.isFinite(inRaw);
      const hasOut = Number.isFinite(outRaw);
      const followBaseHeight =
        hasIn && hasOut && inRaw === 850 && outRaw === 850 && height !== 800;
      const pathHeight = followBaseHeight ? height : (hasIn ? inRaw : height);
      const direction = params.bendDirection || 'right';
      return new CurvedPath(radius, angle, pathHeight, direction);
    }

    case 'spiral-conveyor': {
      const beltWidth = params.beltWidth ?? 400;
      const turns = params.turns ?? 3;
      const outfeedAngle = params.outfeedAngle ?? 180;
      const infeedHeight = params.infeedHeight ?? 800;
      const outfeedHeight = params.outfeedHeight ?? 3800;
      const direction = params.direction ?? 'up';
      return new SpiralPath(beltWidth, turns, outfeedAngle, infeedHeight, outfeedHeight, direction);
    }

    case 'incline-conveyor': {
      return new SegmentedInclinePath(
        params.infeedStraightLength ?? 1200,
        params.inclinedLength ?? 2600,
        params.outfeedStraightLength ?? 1400,
        params.infeedHeightFromFloor ?? 800,
        params.outfeedHeightFromFloor ?? 1500,
        params.overallLength,
      );
    }

    default:
      return null;
  }
}

/**
 * Get path metadata for a node (length, travel time at given speed).
 */
export function getPathMetadata(type: string, params: Record<string, any>): { pathLength: number; travelTime: number } | null {
  const path = createTransportPath(type, params);
  if (!path) return null;

  const speedMpm = params.beltSpeed || params.speed || params.speedMpm || 20;
  const speedMps = speedMpm / 60;
  const travelTime = path.length / speedMps;

  return { pathLength: path.length, travelTime };
}
