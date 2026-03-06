/**
 * ModeManager — MetaMech Simulation Studio
 *
 * Central arbitration: only ONE interaction module owns mouse/keyboard at a time.
 * Modules: Viewport (camera/selection), Modeling (gizmos/alignment), Connectivity (mate/snap/mount).
 *
 * Usage:
 *   ModeManager.activate('modeling');  // modeling now owns input
 *   ModeManager.getActive();           // 'modeling'
 *   ModeManager.isActive('viewport');  // false
 */

export type InteractionMode = 'viewport' | 'modeling' | 'connectivity';

export interface ModeChangeEvent {
  previous: InteractionMode;
  current: InteractionMode;
  /** Why the change happened */
  reason?: string;
}

type ModeChangeListener = (event: ModeChangeEvent) => void;

class ModeManagerSingleton {
  private _active: InteractionMode = 'viewport';
  private _locked: boolean = false;
  private _listeners: Set<ModeChangeListener> = new Set();

  /** Current active mode */
  getActive(): InteractionMode {
    return this._active;
  }

  /** Is a specific mode currently active? */
  isActive(mode: InteractionMode): boolean {
    return this._active === mode;
  }

  /** 
   * Activate a mode. Returns false if locked by another mode.
   * When gizmo drag starts → lock modeling. When drag ends → unlock.
   */
  activate(mode: InteractionMode, reason?: string): boolean {
    if (this._locked && mode !== this._active) {
      return false; // Another mode has a lock (e.g., mid-drag)
    }
    if (mode === this._active) return true;
    const prev = this._active;
    this._active = mode;
    const event: ModeChangeEvent = { previous: prev, current: mode, reason };
    this._listeners.forEach(fn => fn(event));
    return true;
  }

  /** Lock the current mode (prevents switches until unlocked) */
  lock(): void {
    this._locked = true;
  }

  /** Unlock — allows mode switches again */
  unlock(): void {
    this._locked = false;
  }

  isLocked(): boolean {
    return this._locked;
  }

  /** Subscribe to mode changes */
  onChange(listener: ModeChangeListener): () => void {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  }

  /** Map editor tool names to interaction modes */
  toolToMode(tool: string): InteractionMode {
    switch (tool) {
      case 'select':
        return 'viewport';
      case 'move':
      case 'rotate':
      case 'scale':
      case 'measure':
        return 'modeling';
      case 'mate':
      case 'snap-move':
        return 'connectivity';
      default:
        return 'viewport';
    }
  }
}

/** Singleton instance */
export const ModeManager = new ModeManagerSingleton();

export default ModeManager;
