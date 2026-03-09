/**
 * 3Dconnexion SpaceMouse / 3D Mouse Integration
 * 
 * Uses the Web Gamepad API to detect 3Dconnexion devices.
 * SpaceMouse devices expose as HID gamepads with 6 axes:
 *   axes[0] = X translation (pan left/right)
 *   axes[1] = Y translation (pan up/down)
 *   axes[2] = Z translation (zoom in/out)
 *   axes[3] = X rotation (tilt)
 *   axes[4] = Y rotation (spin/orbit)
 *   axes[5] = Z rotation (roll)
 *
 * Sensitivity and dead zones are configurable.
 */

export interface SpaceMouseState {
  connected: boolean;
  /** Translation axes: [panX, panY, zoom] normalized -1..1 */
  translate: [number, number, number];
  /** Rotation axes: [tiltX, orbitY, rollZ] normalized -1..1 */
  rotate: [number, number, number];
  /** Any button pressed */
  buttons: boolean[];
}

export interface SpaceMouseConfig {
  /** Dead zone threshold (0-1), axes below this are zeroed. Default 0.05 */
  deadZone: number;
  /** Translation sensitivity multiplier. Default 1.0 */
  translateSensitivity: number;
  /** Rotation sensitivity multiplier. Default 1.0 */
  rotateSensitivity: number;
  /** Invert Y axis */
  invertY: boolean;
  /** Invert zoom */
  invertZoom: boolean;
}

const DEFAULT_CONFIG: SpaceMouseConfig = {
  deadZone: 0.05,
  translateSensitivity: 1.0,
  rotateSensitivity: 1.0,
  invertY: false,
  invertZoom: false,
};

/** Known 3Dconnexion vendor/product strings */
const SPACEMOUSE_IDS = [
  '3dconnexion', 'spacemouse', 'spacenavigator', 'spacepilot',
  'spaceexplorer', 'spaceball', '046d', // Logitech (owns 3Dconnexion)
  '256f', // 3Dconnexion USB vendor ID
];

function isSpaceMouseGamepad(gp: Gamepad): boolean {
  const id = gp.id.toLowerCase();
  return SPACEMOUSE_IDS.some(s => id.includes(s)) || gp.axes.length >= 6;
}

function applyDeadZone(value: number, deadZone: number): number {
  if (Math.abs(value) < deadZone) return 0;
  // Remap so the dead zone edge maps to 0
  const sign = value > 0 ? 1 : -1;
  return sign * ((Math.abs(value) - deadZone) / (1 - deadZone));
}

export class SpaceMouseController {
  private config: SpaceMouseConfig;
  private gamepadIndex: number | null = null;
  private onConnectCb: ((connected: boolean) => void) | null = null;

  constructor(config?: Partial<SpaceMouseConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    window.addEventListener('gamepadconnected', (e) => {
      const gp = (e as GamepadEvent).gamepad;
      if (isSpaceMouseGamepad(gp)) {
        this.gamepadIndex = gp.index;
        console.log('[SpaceMouse] Connected:', gp.id);
        this.onConnectCb?.(true);
      }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
      const gp = (e as GamepadEvent).gamepad;
      if (gp.index === this.gamepadIndex) {
        this.gamepadIndex = null;
        console.log('[SpaceMouse] Disconnected');
        this.onConnectCb?.(false);
      }
    });
  }

  onConnectionChange(cb: (connected: boolean) => void) {
    this.onConnectCb = cb;
  }

  setConfig(config: Partial<SpaceMouseConfig>) {
    this.config = { ...this.config, ...config };
  }

  /** Read current state. Call this in your animation loop (useFrame). */
  getState(): SpaceMouseState {
    if (this.gamepadIndex === null) {
      return {
        connected: false,
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
        buttons: [],
      };
    }

    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepadIndex];
    if (!gp) {
      return {
        connected: false,
        translate: [0, 0, 0],
        rotate: [0, 0, 0],
        buttons: [],
      };
    }

    const dz = this.config.deadZone;
    const ts = this.config.translateSensitivity;
    const rs = this.config.rotateSensitivity;
    const iy = this.config.invertY ? -1 : 1;
    const iz = this.config.invertZoom ? -1 : 1;

    const ax = (i: number) => gp.axes[i] !== undefined ? gp.axes[i] : 0;

    return {
      connected: true,
      translate: [
        applyDeadZone(ax(0), dz) * ts,
        applyDeadZone(ax(1), dz) * ts * iy,
        applyDeadZone(ax(2), dz) * ts * iz,
      ],
      rotate: [
        applyDeadZone(ax(3), dz) * rs,
        applyDeadZone(ax(4), dz) * rs,
        applyDeadZone(ax(5), dz) * rs,
      ],
      buttons: Array.from(gp.buttons).map(b => b.pressed),
    };
  }

  isConnected(): boolean {
    return this.gamepadIndex !== null;
  }

  dispose() {
    this.gamepadIndex = null;
    this.onConnectCb = null;
  }
}

/** Singleton instance */
export const spaceMouse = new SpaceMouseController();
