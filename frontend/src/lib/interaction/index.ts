/**
 * Interaction System — MetaMech Simulation Studio
 *
 * Three modules + one arbitrator:
 *   - ModeManager: only ONE module owns mouse/keyboard at a time
 *   - ViewportModule: camera, raycasting, selection, overlays
 *   - ModelingModule: gizmos, alignment, tidy/pack, placement rules
 *   - ConnectivityModule: mate, snap, conveyor connections, accessory mounting
 */

export { ModeManager, type InteractionMode, type ModeChangeEvent } from '../ModeManager';
export { ViewportModule, raycastToGround, raycastScene, setCamera, shouldEnableOrbit } from './ViewportModule';
export { ModelingModule, applyGridSnap, onGizmoDragStart, onGizmoDragEnd, alignObjects, distributeObjects } from './ModelingModule';
export { ConnectivityModule, computeMateTransform, findMateCandidate, computeConveyorBodyMount, onSnapDragStart, onSnapDragEnd } from './ConnectivityModule';
