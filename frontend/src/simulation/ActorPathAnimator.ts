/**
 * ActorPathAnimator — Moves actors along assigned paths during simulation
 * 
 * Each actor with a pathId gets animated along the path's waypoints.
 * Supports: walk speed, loop, orientation along path, idle/walking states.
 */

import { ActorPath } from '../store/editorStore';

export interface ActorAnimState {
  actorId: string;
  pathId: string;
  /** Current segment index (0 = from point[0] to point[1]) */
  segmentIndex: number;
  /** Progress along current segment [0..1] */
  segmentT: number;
  /** Current world position */
  position: [number, number, number];
  /** Current Y rotation (facing direction) */
  rotationY: number;
  /** Animation state */
  state: 'idle' | 'walking';
  /** Total distance traveled */
  distanceTraveled: number;
}

/** Compute total path length */
function pathLength(points: [number, number, number][], loop: boolean): number {
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += segmentLength(points[i], points[i + 1]);
  }
  if (loop && points.length > 2) {
    len += segmentLength(points[points.length - 1], points[0]);
  }
  return len;
}

function segmentLength(a: [number, number, number], b: [number, number, number]): number {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const dy = b[1] - a[1];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function lerp3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

export class ActorPathAnimator {
  private states: Map<string, ActorAnimState> = new Map();

  /** Initialize or reset animation state for an actor */
  initActor(actorId: string, pathId: string, startPosition: [number, number, number]): void {
    this.states.set(actorId, {
      actorId,
      pathId,
      segmentIndex: 0,
      segmentT: 0,
      position: [...startPosition],
      rotationY: 0,
      state: 'idle',
      distanceTraveled: 0,
    });
  }

  /** Remove actor from animation */
  removeActor(actorId: string): void {
    this.states.delete(actorId);
  }

  /** Get current animation state for an actor */
  getState(actorId: string): ActorAnimState | undefined {
    return this.states.get(actorId);
  }

  /** Get all active states */
  getAllStates(): ActorAnimState[] {
    return Array.from(this.states.values());
  }

  /** Update all actors for one frame. Returns updated positions. */
  update(
    dt: number,
    paths: ActorPath[],
    actors: { id: string; parameters: Record<string, any> }[],
  ): Map<string, { position: [number, number, number]; rotationY: number; state: 'idle' | 'walking' }> {
    const results = new Map<string, { position: [number, number, number]; rotationY: number; state: 'idle' | 'walking' }>();

    for (const actor of actors) {
      const pathId = actor.parameters?.pathId;
      if (!pathId) continue;

      const path = paths.find(p => p.id === pathId);
      if (!path || path.points.length < 2) continue;

      let state = this.states.get(actor.id);
      if (!state || state.pathId !== pathId) {
        // Initialize
        this.initActor(actor.id, pathId, path.points[0]);
        state = this.states.get(actor.id)!;
      }

      // Speed: walkSpeed in m/min for operators, speed in m/min for vehicles
      const speedMPerMin = actor.parameters?.walkSpeed || actor.parameters?.speed || 90;
      const speedMPerSec = speedMPerMin / 60;
      const moveDistance = speedMPerSec * dt;

      // Get total segments (including loop-back)
      const totalSegments = path.loop ? path.points.length : path.points.length - 1;
      if (totalSegments <= 0) continue;

      // Current segment endpoints
      const fromIdx = state.segmentIndex % path.points.length;
      const toIdx = path.loop
        ? (state.segmentIndex + 1) % path.points.length
        : Math.min(state.segmentIndex + 1, path.points.length - 1);

      const from = path.points[fromIdx];
      const to = path.points[toIdx];
      const segLen = segmentLength(from, to);

      if (segLen < 0.001) {
        // Zero-length segment, skip to next
        state.segmentIndex = (state.segmentIndex + 1) % totalSegments;
        state.segmentT = 0;
        continue;
      }

      // Advance along segment
      const tAdvance = moveDistance / segLen;
      state.segmentT += tAdvance;
      state.distanceTraveled += moveDistance;
      state.state = 'walking';

      // Check if we passed the end of this segment
      while (state.segmentT >= 1.0) {
        state.segmentT -= 1.0;
        state.segmentIndex++;

        if (state.segmentIndex >= totalSegments) {
          if (path.loop || actor.parameters?.loopPath) {
            state.segmentIndex = 0;
          } else {
            // Reached end, stop
            state.segmentIndex = totalSegments - 1;
            state.segmentT = 1.0;
            state.state = 'idle';
            break;
          }
        }
      }

      // Compute position
      const curFromIdx = state.segmentIndex % path.points.length;
      const curToIdx = path.loop
        ? (state.segmentIndex + 1) % path.points.length
        : Math.min(state.segmentIndex + 1, path.points.length - 1);

      state.position = lerp3(path.points[curFromIdx], path.points[curToIdx], state.segmentT);

      // Compute facing direction
      const dir = path.points[curToIdx];
      const src = path.points[curFromIdx];
      state.rotationY = Math.atan2(dir[0] - src[0], dir[2] - src[2]);

      results.set(actor.id, {
        position: state.position,
        rotationY: state.rotationY,
        state: state.state,
      });
    }

    return results;
  }

  /** Reset all animation states */
  reset(): void {
    this.states.clear();
  }
}

// Global singleton
export const actorPathAnimator = new ActorPathAnimator();
