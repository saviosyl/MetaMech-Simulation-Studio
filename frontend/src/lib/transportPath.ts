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
  private heightM: number;
  private angleRad: number;

  constructor(lengthMm: number, heightMm: number, angleDeg: number = 0) {
    this.heightM = heightMm / 1000;
    this.angleRad = (angleDeg * Math.PI) / 180;
    // Path length along the incline
    this.length = (lengthMm / 1000) / Math.cos(this.angleRad);
    this.halfLength = (lengthMm / 1000) / 2;
  }

  getLocalPosition(t: number): Vec3 {
    const x = -this.halfLength + t * (2 * this.halfLength);
    const elevationGain = Math.sin(this.angleRad) * (t * 2 * this.halfLength);
    const y = this.heightM + elevationGain;
    return [x, y, 0];
  }

  getLocalTangent(_t: number): Vec3 {
    // Tangent along the incline
    const cosA = Math.cos(this.angleRad);
    const sinA = Math.sin(this.angleRad);
    return [cosA, sinA, 0];
  }

  getLocalUp(_t: number): Vec3 {
    // Up perpendicular to incline surface
    const cosA = Math.cos(this.angleRad);
    const sinA = Math.sin(this.angleRad);
    return [-sinA, cosA, 0];
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
  private radiusM: number;
  private totalHeightM: number;
  private turns: number;
  private direction: 'up' | 'down';
  private startAngleRad: number;

  constructor(
    diameterMm: number, totalHeightMm: number, turns: number,
    direction: 'up' | 'down', infeedAngleDeg: number = 0,
  ) {
    this.radiusM = diameterMm / 2000;
    this.totalHeightM = totalHeightMm / 1000;
    this.turns = turns;
    this.direction = direction;
    this.startAngleRad = (infeedAngleDeg * Math.PI) / 180;

    // Helical path length
    const circumference = 2 * Math.PI * this.radiusM;
    const spiralLen = Math.sqrt((circumference * turns) ** 2 + this.totalHeightM ** 2);
    this.length = spiralLen;
  }

  getLocalPosition(t: number): Vec3 {
    const angle = this.startAngleRad + t * this.turns * 2 * Math.PI;
    const x = Math.cos(angle) * this.radiusM;
    const z = Math.sin(angle) * this.radiusM;
    const yBase = this.direction === 'up' ? 0 : this.totalHeightM;
    const yDelta = this.direction === 'up' ? t * this.totalHeightM : -t * this.totalHeightM;
    return [x, yBase + yDelta, z];
  }

  getLocalTangent(t: number): Vec3 {
    const angle = this.startAngleRad + t * this.turns * 2 * Math.PI;
    const dAdT = this.turns * 2 * Math.PI;
    const tx = -Math.sin(angle) * this.radiusM * dAdT;
    const tz = Math.cos(angle) * this.radiusM * dAdT;
    const ty = this.direction === 'up' ? this.totalHeightM : -this.totalHeightM;
    const mag = Math.sqrt(tx * tx + ty * ty + tz * tz);
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
      const height = params.height || 800;
      const angle = params.inclineAngle || params.angleDeg || params.angle || 0;
      return new StraightPath(length, height, angle);
    }

    case 'bend-conveyor': {
      const radius = params.radius || params.radiusMm || 1000;
      const angle = parseInt(params.bendAngle || params.bendAngleDeg || '90', 10);
      const height = params.height || params.heightMm || 800;
      const direction = params.bendDirection || 'right';
      return new CurvedPath(radius, angle, height, direction);
    }

    case 'spiral-conveyor': {
      const diameter = params.diameter || params.diameterMm || 1800;
      const totalHeight = params.totalHeight || params.totalHeightMm || 3000;
      const turns = params.turns || 3;
      const direction = params.direction || 'up';
      const infeedAngle = params.infeedAngle || params.infeedAngleDeg || 0;
      return new SpiralPath(diameter, totalHeight, turns, direction, infeedAngle);
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
