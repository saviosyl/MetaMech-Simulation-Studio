/**
 * 3Dconnexion SpaceMouse Integration
 * 
 * Supports three navigation modes matching industry standard:
 * 
 * **Object Mode** (default): Rotate/pan around the scene center (orbit target).
 *   - Push/pull: zoom in/out
 *   - Tilt/twist: orbit around target
 *   - Slide left/right/up/down: pan the view
 *   - Feels like you're moving the world around the camera
 * 
 * **Camera Mode**: Move the camera itself through space.
 *   - Push/pull: dolly forward/back
 *   - Tilt: pitch camera up/down
 *   - Twist: yaw camera left/right
 *   - Slide: strafe left/right, crane up/down
 *   - Orbit target follows camera
 * 
 * **Fly Mode**: Fly through the scene like a drone.
 *   - Push/pull: fly forward/back at current heading
 *   - Tilt: pitch
 *   - Twist: yaw (turn)
 *   - Slide left/right: strafe
 *   - No orbit target constraint
 *   - Smooth momentum with damping
 * 
 * Uses the Web Gamepad API. SpaceMouse devices expose 6 axes:
 *   axes[0] = X translation, axes[1] = Y translation, axes[2] = Z translation
 *   axes[3] = X rotation (pitch), axes[4] = Y rotation (yaw), axes[5] = Z rotation (roll)
 */

export type SpaceMouseMode = 'object' | 'camera' | 'fly';

export interface SpaceMouseState {
  connected: boolean;
  translate: [number, number, number];
  rotate: [number, number, number];
  buttons: boolean[];
}

export interface SpaceMouseConfig {
  mode: SpaceMouseMode;
  deadZone: number;
  translateSpeed: number;
  rotateSpeed: number;
  zoomSpeed: number;
  invertPan: boolean;
  invertZoom: boolean;
  /** Fly mode damping (0-1, lower = more momentum) */
  flyDamping: number;
  /** Dominant axis lock — only process the strongest axis */
  dominantAxis: boolean;
  /** Input smoothing (0-1, higher = smoother) */
  smoothing: number;
}

const DEFAULT_CONFIG: SpaceMouseConfig = {
  mode: 'object',
  deadZone: 0.08,
  translateSpeed: 1.0,
  rotateSpeed: 1.0,
  zoomSpeed: 1.5,
  invertPan: false,
  invertZoom: false,
  flyDamping: 0.92,
  dominantAxis: true,
  smoothing: 0.35,
};

/** Known 3Dconnexion identifiers */
const SPACEMOUSE_IDS = [
  '3dconnexion', 'spacemouse', 'spacenavigator', 'spacepilot',
  'spaceexplorer', 'spaceball', '046d', '256f',
];

function isSpaceMouseGamepad(gp: Gamepad): boolean {
  const id = gp.id.toLowerCase();
  // Check known IDs or 6+ axes (characteristic of 3D mice)
  return SPACEMOUSE_IDS.some(s => id.includes(s)) || gp.axes.length >= 6;
}

function applyDeadZone(value: number, dz: number): number {
  if (Math.abs(value) < dz) return 0;
  const sign = value > 0 ? 1 : -1;
  return sign * ((Math.abs(value) - dz) / (1 - dz));
}

function applyDominantAxis(values: [number, number, number]): [number, number, number] {
  let maxIdx = 0;
  let maxVal = 0;
  for (let i = 0; i < values.length; i++) {
    if (Math.abs(values[i]) > maxVal) {
      maxVal = Math.abs(values[i]);
      maxIdx = i;
    }
  }
  return values.map((v, i) => (i === maxIdx ? v : 0)) as [number, number, number];
}

export class SpaceMouseController {
  config: SpaceMouseConfig;
  private gamepadIndex: number | null = null;
  private _onConnect: ((connected: boolean) => void) | null = null;

  // Fly mode velocity (momentum)
  flyVelocity: [number, number, number] = [0, 0, 0];
  flyAngular: [number, number] = [0, 0]; // pitch, yaw
  private filteredTrans: [number, number, number] = [0, 0, 0];
  private filteredRot: [number, number, number] = [0, 0, 0];

  constructor(config?: Partial<SpaceMouseConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this._setupListeners();
  }

  private _setupListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e) => {
      const gp = (e as GamepadEvent).gamepad;
      if (isSpaceMouseGamepad(gp)) {
        this.gamepadIndex = gp.index;
        console.log('[SpaceMouse] Connected:', gp.id, '| Axes:', gp.axes.length);
        this._onConnect?.(true);
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      const gp = (e as GamepadEvent).gamepad;
      if (gp.index === this.gamepadIndex) {
        this.gamepadIndex = null;
        console.log('[SpaceMouse] Disconnected');
        this._onConnect?.(false);
      }
    });
  }

  onConnectionChange(cb: (connected: boolean) => void) { this._onConnect = cb; }

  setMode(mode: SpaceMouseMode) { this.config.mode = mode; }

  setConfig(cfg: Partial<SpaceMouseConfig>) {
    this.config = { ...this.config, ...cfg };
  }

  isConnected(): boolean { return this.gamepadIndex !== null; }

  /** Read raw state from the gamepad. Call every frame. */
  poll(): SpaceMouseState {
    if (this.gamepadIndex === null) {
      this.filteredTrans = [0, 0, 0];
      this.filteredRot = [0, 0, 0];
      return { connected: false, translate: [0, 0, 0], rotate: [0, 0, 0], buttons: [] };
    }

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];
    if (!gp) {
      this.filteredTrans = [0, 0, 0];
      this.filteredRot = [0, 0, 0];
      return { connected: false, translate: [0, 0, 0], rotate: [0, 0, 0], buttons: [] };
    }

    const dz = this.config.deadZone;
    const ax = (i: number) => gp.axes[i] !== undefined ? gp.axes[i] : 0;

    let trans: [number, number, number] = [
      applyDeadZone(ax(0), dz),
      applyDeadZone(ax(1), dz),
      applyDeadZone(ax(2), dz),
    ];
    let rot: [number, number, number] = [
      applyDeadZone(ax(3), dz),
      applyDeadZone(ax(4), dz),
      applyDeadZone(ax(5), dz),
    ];

    // Dominant axis: only keep strongest
    if (this.config.dominantAxis) {
      // Apply per-channel (translation vs rotation) to reduce wobble while
      // still allowing one translational and one rotational intent together.
      trans = applyDominantAxis(trans);
      rot = applyDominantAxis(rot);
    }

    // Apply inversion
    if (this.config.invertPan) { trans[0] *= -1; trans[1] *= -1; }
    if (this.config.invertZoom) { trans[2] *= -1; }

    const smooth = Math.max(0, Math.min(0.95, this.config.smoothing));
    const a = 1 - smooth;
    for (let i = 0; i < 3; i++) {
      this.filteredTrans[i] = this.filteredTrans[i] * smooth + trans[i] * a;
      this.filteredRot[i] = this.filteredRot[i] * smooth + rot[i] * a;
    }

    return {
      connected: true,
      translate: [...this.filteredTrans] as [number, number, number],
      rotate: [...this.filteredRot] as [number, number, number],
      buttons: Array.from(gp.buttons).map(b => b.pressed),
    };
  }

  /** Update fly mode velocity with damping */
  updateFlyMomentum(input: SpaceMouseState, dt: number) {
    const d = this.config.flyDamping;
    const ts = this.config.translateSpeed * 10;
    const rs = this.config.rotateSpeed * 2;

    this.flyVelocity[0] = this.flyVelocity[0] * d + input.translate[0] * ts * dt;
    this.flyVelocity[1] = this.flyVelocity[1] * d + input.translate[1] * ts * dt;
    this.flyVelocity[2] = this.flyVelocity[2] * d + input.translate[2] * ts * dt;
    this.flyAngular[0] = this.flyAngular[0] * d + input.rotate[0] * rs * dt; // pitch
    this.flyAngular[1] = this.flyAngular[1] * d + input.rotate[1] * rs * dt; // yaw
  }

  dispose() {
    this.gamepadIndex = null;
    this._onConnect = null;
  }
}

/** Singleton */
export const spaceMouse = new SpaceMouseController();
