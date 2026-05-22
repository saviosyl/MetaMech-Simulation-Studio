import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AssetDef, getAssetManifest, getAssetById, ParametricAssetDef } from '../lib/assetManifest';
import { runBuilder } from '../lib/parametricBuilders';
import { getPortWorldPosition, getWorldPorts as computeWorldPorts } from '../lib/nodeTransform';
import { computeSpiralTransferGeometry } from '../lib/spiralTransfer';
import { FrameAssemblyExportContract } from '../lib/frameDesigner/model';
import { toFrameAssemblyParameters } from '../lib/frameDesigner/sceneInterop';
import { VideoQualityPreset } from '../lib/videoExportPresets';
import { getModuleDefinition } from '../lib/moduleLibrary';

// Types
export interface ProcessNode {
  id: string;
  type: 'source' | 'sink' | 'conveyor' | 'buffer' | 'machine' | 'router' | 
        'transfer-bridge' | 'popup-transfer' | 'pusher-transfer' | 'merge-divert' |
        'spiral-conveyor' | 'vertical-lifter' | 'pick-and-place' | 'palletizer' |
        'belt-conveyor' | 'roller-conveyor' | 'industrial-robot' | 'machine-static' |
        'stopper' | 'pusher' | 'bend-conveyor' | 'sensor' |
        'modular-conveyor-straight' | 'modular-conveyor-90-curve' | 'modular-conveyor-45-curve' | 'incline-conveyor' |
        'cartesian-robot' | 'cobot' | 'robot-5axis' | 'robot-6axis' |
        'eur-pallet' | 'standard-pallet' | 'custom-pallet' |
        'carton-erector' | 'case-packer' | 'checkweigher' | 'metal-detector' |
        'labeler' | 'sealing-station' | 'reject-station' | 'accumulation-table' |
        'stretch-wrapper' | 'packing-station' | 'pallet-conveyor' | 'forklift' |
        'stainless-conveyor' | 'laminar-flow-hood' | 'clean-bench' | 'pass-through-hatch' |
        'cleanroom-cart' | 'guard-partition' | 'light-curtain' | 'inspection-station' | 'machine-enclosure' |
        'wall' | 'window' | 'safety-rail' | 'fence' | 'fence-gate' | 'door' | 'pallet-rack' |
        'bollard' | 'operator-station' | 'electrical-cabinet' | 'tower-light' | 'pallet-stack' |
        'floor-zone' | 'hmi-stand' | 'pallet-truck' | 'cardboard-box';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  name: string;
  assetId?: string;       // references AssetDef.id if using new asset system
  assetDefType?: 'static' | 'parametric'; // asset type from manifest
}

// New unified scene object type (used alongside existing types)
export interface SceneObject {
  id: string;
  assetId: string;
  assetType: 'static' | 'parametric';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  name: string;
  category: 'process' | 'environment' | 'actors';
}

export interface EnvironmentAsset {
  id: string;
  type: 'wall' | 'door' | 'window' | 'stairs' | 'safety-rail' | 
        'floor-marking' | 'pallet-rack' | 'warehouse-shell' | 'floor' | 'pallet' | 'cardboard-box' | 'frame-assembly';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  name: string;
  assetId?: string;
  assetDefType?: 'static' | 'parametric';
}

export interface Actor {
  id: string;
  type: 'operator' | 'engineer' | 'forklift' | 'agv' | 'pallet-truck';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  name: string;
  assetId?: string;
  assetDefType?: 'static' | 'parametric';
}

export interface ProcessEdge {
  id: string;
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
  parameters: Record<string, any>;
}

/** Custom imported 3D model */
export interface CustomModel {
  id: string;
  name: string;
  /** Data URL or blob URL of the GLB file */
  glbUrl: string;
  /** Original filename */
  sourceFile: string;
  /** File size in bytes */
  fileSize: number;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  parameters: Record<string, any>;
  /** Optional category tag */
  category?: string;
}

/** Path for actor movement */
export interface ActorPath {
  id: string;
  name: string;
  /** Ordered list of waypoints in world space */
  points: [number, number, number][];
  /** Whether the path loops back to start */
  loop: boolean;
  /** Whether to show direction arrows */
  showArrows: boolean;
  /** Color for visualization */
  color: string;
}

/** Camera keyframe for camera path tool */
export interface CameraKeyframe {
  position: [number, number, number];
  target: [number, number, number];
  /** Duration in seconds to travel FROM this keyframe to the next */
  duration: number;
  /** Optional pause at this keyframe before moving (seconds) */
  pause?: number;
  /** Easing: 'linear' | 'ease-in-out' */
  easing?: 'linear' | 'ease-in-out';
}

/** Camera path for automated recording */
export interface CameraPath {
  id: string;
  name: string;
  keyframes: CameraKeyframe[];
  loop: boolean;
}

/** Clipboard entry for copy/paste */
interface ClipboardEntry {
  type: 'process' | 'environment' | 'actor' | 'custom-model';
  data: any;
}

export interface ConnectionPort {
  id: string;
  type: 'input' | 'output';
  localPosition: [number, number, number];
  /** Outward-facing direction of this port in local space (unit vector).
   *  Input ports face "into" the node, output ports face "out of" the node.
   *  Used for mate alignment — the mating port's direction should oppose this. */
  direction: [number, number, number];
}

export interface Underlay {
  id: string;
  url: string;
  opacity: number;
  visible: boolean;
  locked: boolean;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface SceneSettings {
  environment: 'factory' | 'studio-white' | 'dark-showroom' | 'transparent';
  lighting: {
    intensity: number;
    shadows: boolean;
  };
  grid: {
    visible: boolean;
    size: number;
    divisions: number;
    cellColor: string;
    sectionColor: string;
  };
  axes: {
    visible: boolean;
    size: number;
  };
}

export interface CustomProduct {
  id: string;
  name: string;
  model?: string;
  color: string;
  dimensions: [number, number, number];
}

/** Add default direction vectors to ports that don't have them.
 *  Convention: input ports face -X (toward infeed), output ports face +X (toward outfeed).
 *  For ports with non-standard positions, direction points outward from node center. */
function ensureDirections(ports: Partial<ConnectionPort>[]): ConnectionPort[] {
  return ports.map(p => {
    if (p.direction) return p as ConnectionPort;
    const pos = p.localPosition || [0, 0, 0];
    // Default: input faces -X, output faces +X
    let dir: [number, number, number];
    if (p.type === 'input') {
      dir = [-1, 0, 0];
    } else {
      dir = [1, 0, 0];
    }
    // Override for ports that are clearly off the X axis (e.g. router reject port)
    const lenXZ = Math.sqrt(pos[0] * pos[0] + pos[2] * pos[2]);
    if (lenXZ > 0.1) {
      // Direction points outward from center in XZ plane
      dir = [pos[0] / lenXZ, 0, pos[2] / lenXZ];
    }
    return { ...p, direction: dir } as ConnectionPort;
  });
}

// Connection port definitions per object type
export function getConnectionPorts(type: string, params?: Record<string, any>, assetId?: string): ConnectionPort[] {
  return ensureDirections(_getConnectionPortsRaw(type, params, assetId));
}

function _getConnectionPortsRaw(type: string, params?: Record<string, any>, assetId?: string): Partial<ConnectionPort>[] {
  // Spiral ports must always come from the shared spiral transfer geometry so
  // markers, snapping, and visible model endpoints stay in the same frame.
  // Do this before asset-builder lookup (spiral builder ports use a different schema).
  if (type === 'spiral-conveyor') {
    const spiral = computeSpiralTransferGeometry(params ?? {}, 0.35);
    return [
      { id: 'input', type: 'input', localPosition: spiral.input.port, direction: spiral.input.direction },
      { id: 'output', type: 'output', localPosition: spiral.output.port, direction: spiral.output.direction },
    ];
  }

  // Check asset manifest first
  if (assetId) {
    const assetDef = getAssetById(assetId);
    if (assetDef) {
      if (assetDef.assetType === 'static' && assetDef.connectionPorts) {
        return assetDef.connectionPorts;
      }
      if (assetDef.assetType === 'parametric') {
        const mergedParams = { ...assetDef.defaults, ...params };
        const result = runBuilder(assetDef.builder, mergedParams);
        if (result && result.ports.length > 0) {
          return result.ports;
        }
      }
    }
  }

  const length = params?.length || 5;
  switch (type) {
    case 'source':
      return [{ id: 'output', type: 'output', localPosition: [0.02, 0.05, 0] }];  // 20mm from center
    case 'sink':
      return [{ id: 'input', type: 'input', localPosition: [-0.02, 0.05, 0] }];  // 20mm from center
    case 'conveyor':
      return [
        { id: 'input', type: 'input', localPosition: [-length / 2, 0.1, 0] },
        { id: 'output', type: 'output', localPosition: [length / 2, 0.1, 0] },
      ];
    case 'belt-conveyor':
    case 'roller-conveyor':
    case 'modular-conveyor-straight': {
      const pL = ((params?.length || 3000) / 1000);
      const pH = ((params?.height || 800) / 1000);
      const portInset = 0.02;
      const pInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : pH;
      const pOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : pH;
      return [
        { id: 'input', type: 'input', localPosition: [-pL / 2 + portInset, pInH, 0] },
        { id: 'output', type: 'output', localPosition: [pL / 2 - portInset, pOutH, 0] },
      ];
    }
    case 'incline-conveyor': {
      const infeedLenMm = Number(params?.infeedStraightLength ?? 1200);
      const inclineLenMm = Number(params?.inclinedLength ?? 2600);
      const outfeedLenMm = Number(params?.outfeedStraightLength ?? 1400);
      const overallLenMm = Number(params?.overallLength ?? (infeedLenMm + inclineLenMm + outfeedLenMm));
      const segSum = Math.max(1, infeedLenMm + inclineLenMm + outfeedLenMm);
      const segScale = overallLenMm / segSum;
      const infeedLen = (infeedLenMm * segScale) / 1000;
      let inclineLen = (inclineLenMm * segScale) / 1000;
      const outfeedLen = (outfeedLenMm * segScale) / 1000;
      const inY = Number(params?.infeedHeightFromFloor ?? params?.infeedHeight ?? 800) / 1000;
      const outY = Number(params?.outfeedHeightFromFloor ?? params?.outfeedHeight ?? 1500) / 1000;
      const rise = outY - inY;
      if (Math.abs(rise) >= inclineLen) inclineLen = Math.abs(rise) + 0.08;
      const inclineHoriz = Math.sqrt(Math.max(0.05 * 0.05, inclineLen * inclineLen - rise * rise));
      const totalHoriz = infeedLen + inclineHoriz + outfeedLen;
      const x0 = -totalHoriz / 2;
      const x3 = totalHoriz / 2;
      return [
        { id: 'input', type: 'input', localPosition: [x0 + 0.01, inY, 0] },
        { id: 'output', type: 'output', localPosition: [x3 - 0.01, outY, 0] },
      ];
    }
    case 'modular-conveyor-90-curve':
    case 'modular-conveyor-45-curve':
    case 'bend-conveyor': {
      const bendDefH = ((params?.height || 800) / 1000);
      const pH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : bendDefH;
      const pOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : bendDefH;
      const cAngle = (params?.bendAngle || params?.curveAngle || 90) * Math.PI / 180;
      const cRadius = (params?.radius || params?.curveRadius || 1000) / 1000;
      const dir = params?.bendDirection || 'right';
      const sinA = Math.sin(cAngle);
      const cosA = Math.cos(cAngle);
      const sign = dir === 'right' ? 1 : -1;

      // Arc center is at local origin. Infeed at angle=0, outfeed at bendAngle.
      // Positions on the arc:
      const inX = 0;
      const inZ = cRadius;
      const outX = sign * sinA * cRadius;
      const outZ = cosA * cRadius;

      // TANGENT directions (critical for correct mate alignment):
      // At infeed (angle=0): tangent along the arc = perpendicular to radius
      //   For right bend: tangent points in -X direction (into the bend)
      //   Input port faces TOWARD the infeed, so direction = +X (away from bend = toward incoming straight)
      // At outfeed (angle=bendAngle): tangent is rotated by bendAngle from infeed tangent
      const infeedDir: [number, number, number] = [-sign, 0, 0]; // input faces back along incoming straight
      const outfeedDir: [number, number, number] = [
        sign * cosA,  // rotated tangent X
        0,
        -sinA,        // rotated tangent Z
      ];

      return [
        { id: 'input', type: 'input', localPosition: [inX, pH, inZ], direction: infeedDir },
        { id: 'output', type: 'output', localPosition: [outX, pOutH, outZ], direction: outfeedDir },
      ];
    }
    case 'buffer': {
      const bufInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : 0.4;
      const bufOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : 0.4;
      return [
        { id: 'input', type: 'input', localPosition: [-1, bufInH, 0] },
        { id: 'output', type: 'output', localPosition: [1, bufOutH, 0] },
      ];
    }
    case 'machine': {
      const machInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : 0.75;
      const machOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : machInH;
      return [
        { id: 'input', type: 'input', localPosition: [-1, machInH, 0] },
        { id: 'output', type: 'output', localPosition: [1, machOutH, 0] },
      ];
    }
    case 'palletizer': {
      const palInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : 1.25;
      const palOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : 1.25;
      return [
        { id: 'input', type: 'input', localPosition: [-1.5, palInH, 0] },
        { id: 'output', type: 'output', localPosition: [1.5, palOutH, 0] },
      ];
    }
    case 'pick-and-place':
      return [
        { id: 'input', type: 'input', localPosition: [-1.5, 0, 0] },
        { id: 'output', type: 'output', localPosition: [1.5, 0, 0] },
      ];
    case 'router': {
      const rtrInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : 0.25;
      const rtrOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : 0.25;
      return [
        { id: 'input', type: 'input', localPosition: [-1, rtrInH, 0] },
        { id: 'output1', type: 'output', localPosition: [1, rtrOutH, 0] },
        { id: 'output2', type: 'output', localPosition: [0, rtrOutH, 1] },
      ];
    }
    case 'stopper': {
      const sW = (params?.width || 400) / 1000;
      const sMH = (params?.mountHeight || params?.height || 800) / 1000;
      return [
        { id: 'input', type: 'input', localPosition: [-sW / 2, sMH, 0] },
        { id: 'output', type: 'output', localPosition: [sW / 2, sMH, 0] },
      ];
    }
    case 'pusher': {
      const pMH = (params?.mountHeight || params?.height || 800) / 1000;
      return [
        { id: 'input', type: 'input', localPosition: [-0.2, pMH, 0] },
        { id: 'output', type: 'output', localPosition: [0.2, pMH, 0] },
        { id: 'reject', type: 'output', localPosition: [0, pMH, params?.side === 'left' ? -0.5 : 0.5] },
      ];
    }
    case 'vertical-lifter': {
      const platW = (params?.platformWidth || 1000) / 1000;
      const platD = (params?.platformDepth || 1000) / 1000;
      const infH  = (params?.infeedHeight  ?? 0) / 1000;
      const outH  = (params?.outfeedHeight ?? 3000) / 1000;
      const liftDir = params?.liftDirection || 'up';
      const loadDir = params?.loadDirection || 'front';
      const halfW = platW / 2;
      const halfD = platD / 2;
      const baseH = 0.05;
      const rollerTop = 0.06;
      const portInset = 0.02;

      const dirPortMap: Record<string, { dx: number; dz: number }> = {
        front: { dx: 0, dz: -(halfD - portInset) },
        back:  { dx: 0, dz:  (halfD - portInset) },
        left:  { dx: -(halfW - portInset), dz: 0 },
        right: { dx:  (halfW - portInset), dz: 0 },
      };
      const pIn = dirPortMap[loadDir] || dirPortMap.front;
      const unloadDir = loadDir === 'front' ? 'back' : loadDir === 'back' ? 'front' : loadDir === 'left' ? 'right' : 'left';
      const pOut = dirPortMap[unloadDir] || dirPortMap.back;

      // When direction is 'down': infeed at top (outfeedHeight), outfeed at bottom (infeedHeight)
      const inputY = liftDir === 'down' ? outH : infH;
      const outputY = liftDir === 'down' ? infH : outH;

      return [
        { id: 'input', type: 'input', localPosition: [pIn.dx, inputY + rollerTop + baseH, pIn.dz] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [pOut.dx, outputY + rollerTop + baseH, pOut.dz] as [number, number, number] },
      ];
    }
    case 'sensor': {
      return [];
    }
    case 'cartesian-robot':
    case 'cobot':
    case 'robot-5axis':
    case 'robot-6axis': {
      // Robots have a pick port and a place port
      const rReach = (params?.reach || params?.reachX || 1400) / 1000;
      const rBase = (params?.baseHeight || 500) / 1000;
      const pedH = params?.pedestalEnabled ? (params?.pedestalHeight || 0) / 1000 : 0;
      const defaultH = rBase + pedH;
      const pickH = params?.pickHeight != null ? (params.pickHeight / 1000) : defaultH;
      const placeH = params?.placeHeight != null ? (params.placeHeight / 1000) : pickH;
      const span = rReach * 0.4;
      return [
        { id: 'pick', type: 'input', localPosition: [0, pickH, -span] as [number, number, number] },
        { id: 'place', type: 'output', localPosition: [0, placeH, span] as [number, number, number] },
      ];
    }
    case 'eur-pallet':
    case 'standard-pallet':
    case 'custom-pallet': {
      const pL = (params?.length || 1200) / 1000;
      const pH = (params?.height || 150) / 1000;
      return [
        { id: 'input', type: 'input', localPosition: [-pL / 2, pH, 0] as [number, number, number] },
      ];
    }
    // FMCG equipment — inline machines with input/output
    case 'carton-erector':
    case 'case-packer':
    case 'checkweigher':
    case 'metal-detector':
    case 'labeler':
    case 'sealing-station':
    case 'reject-station': {
      const eqW = (params?.width || 800) / 1000;
      const eqH = (params?.height || 900) / 1000;
      // Auto-match conveyor belt top height if infeedHeight is set (from mate auto-height)
      const infeedH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : (eqH * 0.55);
      const outfeedH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : infeedH;
      return [
        { id: 'input', type: 'input', localPosition: [-eqW / 2 - 0.005, infeedH, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [eqW / 2 + 0.005, outfeedH, 0] as [number, number, number] },
      ];
    }
    case 'accumulation-table': {
      const tW = (params?.width || 2000) / 1000;
      const tH = (params?.height || 800) / 1000;
      const atInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : (tH + 0.03);
      const atOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : (tH + 0.03);
      return [
        { id: 'input', type: 'input', localPosition: [-tW / 2, atInH, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [tW / 2, atOutH, 0] as [number, number, number] },
      ];
    }
    case 'pallet-conveyor': {
      const pcL = (params?.length || 3000) / 1000;
      const pcH = (params?.height || 500) / 1000;
      const pcInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : pcH;
      const pcOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : pcH;
      return [
        { id: 'input', type: 'input', localPosition: [-pcL / 2, pcInH, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [pcL / 2, pcOutH, 0] as [number, number, number] },
      ];
    }
    case 'stretch-wrapper': {
      const swInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : 0.1;
      const swOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : 0.1;
      return [
        { id: 'input', type: 'input', localPosition: [-0.8, swInH, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [0.8, swOutH, 0] as [number, number, number] },
      ];
    }
    case 'packing-station': {
      const psInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : 0.9;
      const psOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : 0.9;
      return [
        { id: 'input', type: 'input', localPosition: [-0.75, psInH, 0.3] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [0.75, psOutH, 0.3] as [number, number, number] },
      ];
    }
    case 'transfer-bridge':
    case 'popup-transfer':
    case 'pusher-transfer':
    case 'stainless-conveyor': {
      const txL = (params?.length || 1500) / 1000;
      const txH = (params?.height || 850) / 1000;
      const txInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : txH;
      const txOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : txH;
      return [
        { id: 'input', type: 'input', localPosition: [-txL / 2, txInH, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [txL / 2, txOutH, 0] as [number, number, number] },
      ];
    }
    case 'merge-divert': {
      const mdL = (params?.length || 2000) / 1000;
      const mdH = (params?.height || 850) / 1000;
      const mdInH = params?.infeedHeight != null ? (params.infeedHeight / 1000) : mdH;
      const mdOutH = params?.outfeedHeight != null ? (params.outfeedHeight / 1000) : mdH;
      return [
        { id: 'input', type: 'input', localPosition: [-mdL / 2, mdInH, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [mdL / 2, mdOutH, 0] as [number, number, number] },
        { id: 'divert', type: 'output', localPosition: [0, mdOutH, mdL / 3] as [number, number, number] },
      ];
    }
    case 'forklift':
      return []; // No connection ports — layout/decoration only
    default:
      return [
        { id: 'input', type: 'input', localPosition: [-1, 0.5, 0] },
        { id: 'output', type: 'output', localPosition: [1, 0.5, 0] },
      ];
  }
}

/**
 * Get all ports for a node with both local and world positions.
 * This is the canonical way to get port positions that account for rotation.
 * Local positions are from getConnectionPorts(); world positions apply the node's TRS transform.
 * 
 * Architecture note:
 * - Ports are ALWAYS defined in local space (relative to parent object center)
 * - World positions are computed on-the-fly from node.position + node.rotation
 * - Changing parameters triggers React re-render → ports auto-recompute
 * - Serialization stores only (position, rotation, parameters) — ports derive from params
 */
export function getWorldConnectionPorts(node: ProcessNode | EnvironmentAsset | Actor): { id: string; type: 'input' | 'output'; localPosition: [number, number, number]; worldPosition: [number, number, number] }[] {
  return computeWorldPorts(
    { ...node, type: (node as ProcessNode).type },
    (type, params, assetId) => getConnectionPorts(type, params, assetId),
  );
}

/** Re-export for external use */
export { getPortWorldPosition };

interface EditorState {
  // Asset manifest
  assetManifest: AssetDef[];
  setAssetManifest: (manifest: AssetDef[]) => void;

  // Scene objects
  processNodes: ProcessNode[];
  environmentAssets: EnvironmentAsset[];
  actors: Actor[];
  edges: ProcessEdge[];
  underlay: Underlay | null;
  customProducts: CustomProduct[];
  customModels: CustomModel[];
  paths: ActorPath[];
  
  // Scene settings
  sceneSettings: SceneSettings;
  
  // Selection and tools
  selectedObjectId: string | null;
  selectedObjectType: 'process' | 'environment' | 'actor' | null;
  selectedIds: string[];
  transformMode: 'translate' | 'rotate' | 'scale';
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'snap-move' | 'measure' | 'path-draw';
  
  // Path drawing
  drawingPathId: string | null;
  setDrawingPathId: (id: string | null) => void;

  // Mate mode
  mateMode: {
    active: boolean;
    selectedPort: { nodeId: string; portId: string; type: 'input' | 'output'; worldPosition: [number, number, number] } | null;
  };
  
  // Grid snap
  gridSnap: boolean;
  gridSnapSize: number;
  
  // Measurement tool
  measureActive: boolean;
  measurePoints: [number, number, number][];
  
  // Camera presets
  cameraPresets: { name: string; position: [number, number, number]; target: [number, number, number] }[];
  activeCameraPreset: string | null;
  cameraTargetPosition: [number, number, number] | null;
  cameraTargetLookAt: [number, number, number] | null;
  cameraTargetUp: [number, number, number] | null;
  
  // Shortcuts panel
  showShortcuts: boolean;
  
  // Focus request
  focusRequest: number; // increment to trigger
  
  // Simulation state
  isPlaying: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  
  // UI state
  activeLibraryTab: 'process' | 'environment' | 'actors' | 'robots' | 'pallets' | 'fmcg' | 'medical' | 'oem';
  showPropertiesPanel: boolean;
  
  // Panel state
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  
  // Theme
  themeMode: 'dark' | 'light';
  setThemeMode: (mode: 'dark' | 'light') => void;
  toggleTheme: () => void;
  
  // Presentation mode
  presentationMode: boolean;
  setPresentationMode: (active: boolean) => void;

  // Export capture quality
  isExportRendering: boolean;
  captureQualityPreset: VideoQualityPreset;
  setIsExportRendering: (active: boolean) => void;
  setCaptureQualityPreset: (preset: VideoQualityPreset) => void;
  
  // Snap state
  isDragging: boolean;
  dragNodeId: string | null;
  snapTarget: { nodeId: string; portId: string; position: [number, number, number] } | null;
  
  // Actions
  addProcessNode: (type: ProcessNode['type'], position: [number, number, number]) => void;
  addEnvironmentAsset: (type: EnvironmentAsset['type'], position: [number, number, number]) => void;
  insertFrameAssembly: (payload: FrameAssemblyExportContract, position?: [number, number, number]) => string;
  addActor: (type: Actor['type'], position: [number, number, number]) => void;
  
  updateObject: (id: string, type: 'process' | 'environment' | 'actor', updates: Record<string, any>) => void;
  removeObject: (id: string, type: 'process' | 'environment' | 'actor') => void;
  
  setSelectedObject: (id: string | null, type: 'process' | 'environment' | 'actor' | null) => void;
  toggleSelectId: (id: string, type: 'process' | 'environment' | 'actor') => void;
  selectAll: () => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setActiveTool: (tool: 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'snap-move' | 'measure' | 'path-draw') => void;
  setMateSelectedPort: (port: { nodeId: string; portId: string; type: 'input' | 'output'; worldPosition: [number, number, number] } | null) => void;
  setGridSnap: (snap: boolean) => void;
  setGridSnapSize: (size: number) => void;
  setMeasureActive: (active: boolean) => void;
  addMeasurePoint: (point: [number, number, number]) => void;
  clearMeasurePoints: () => void;
  setCameraPreset: (name: string) => void;
  setShowShortcuts: (show: boolean) => void;
  requestFocus: () => void;
  // Object visibility
  hiddenIds: Set<string>;
  toggleVisibility: (id: string) => void;
  overlaysHidden: boolean;
  setOverlaysHidden: (hidden: boolean) => void;
  pathsVisible: boolean;
  setPathsVisible: (visible: boolean) => void;
  
  setSceneSettings: (settings: Partial<SceneSettings>) => void;
  setActiveLibraryTab: (tab: 'process' | 'environment' | 'actors' | 'robots' | 'pallets' | 'fmcg' | 'medical' | 'oem') => void;
  
  // Panel actions
  setLeftPanelWidth: (width: number) => void;
  setRightPanelWidth: (width: number) => void;
  setLeftPanelCollapsed: (collapsed: boolean) => void;
  setRightPanelCollapsed: (collapsed: boolean) => void;
  
  // Edge/connection actions
  addEdge: (from: string, fromPort: string, to: string, toPort: string) => void;
  removeEdge: (id: string) => void;
  
  // Snap actions
  setIsDragging: (dragging: boolean) => void;
  setDragNodeId: (id: string | null) => void;
  setSnapTarget: (target: { nodeId: string; portId: string; position: [number, number, number] } | null) => void;
  
  // Simulation controls
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSimulationSpeed: (speed: number) => void;
  
  // Custom model import
  addCustomModel: (model: Omit<CustomModel, 'id'>) => void;
  removeCustomModel: (id: string) => void;
  updateCustomModel: (id: string, updates: Partial<CustomModel>) => void;

  // Path management
  addPath: (path?: Partial<ActorPath>) => string;
  updatePath: (id: string, updates: Partial<ActorPath>) => void;
  removePath: (id: string) => void;
  addPathPoint: (pathId: string, point: [number, number, number]) => void;
  removePathPoint: (pathId: string, index: number) => void;

  // Clipboard (copy/paste)
  clipboard: ClipboardEntry | null;
  copySelected: () => void;
  pasteClipboard: () => void;

  // Camera view mode
  cameraMode: 'perspective' | 'orthographic';
  setCameraMode: (mode: 'perspective' | 'orthographic') => void;
  setCameraView: (view: 'top' | 'front' | 'right' | 'left' | 'back' | 'bottom' | 'perspective') => void;

  // Camera paths (cinematic)
  cameraPaths: CameraPath[];
  activeCameraPathId: string | null;
  isCameraPathPlaying: boolean;
  addCameraPath: () => string;
  removeCameraPath: (id: string) => void;
  updateCameraPath: (id: string, updates: Partial<CameraPath>) => void;
  addCameraKeyframe: (pathId: string, kf: CameraKeyframe) => void;
  removeCameraKeyframe: (pathId: string, index: number) => void;
  updateCameraKeyframe: (pathId: string, index: number, updates: Partial<CameraKeyframe>) => void;
  setActiveCameraPathId: (id: string | null) => void;
  setIsCameraPathPlaying: (playing: boolean) => void;

  // Scene management
  clearScene: () => void;
  loadScene: (data: any) => void;
  getSceneData: () => any;
}

const GRID_COLOR_PREFS_KEY = 'metamech-grid-color-prefs-v1';
const DEFAULT_GRID_CELL_COLOR = '#6f6f6f';
const DEFAULT_GRID_SECTION_COLOR = '#9d4b4b';

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const raw = value.trim();
  if (/^#([0-9a-fA-F]{6})$/.test(raw)) return raw.toLowerCase();
  if (/^#([0-9a-fA-F]{3})$/.test(raw)) {
    const [, short] = /^#([0-9a-fA-F]{3})$/.exec(raw) || [];
    if (!short) return fallback;
    return `#${short[0]}${short[0]}${short[1]}${short[1]}${short[2]}${short[2]}`.toLowerCase();
  }
  return fallback;
}

function loadGridColorPreferences(): { cellColor: string; sectionColor: string } {
  if (typeof localStorage === 'undefined') {
    return { cellColor: DEFAULT_GRID_CELL_COLOR, sectionColor: DEFAULT_GRID_SECTION_COLOR };
  }
  try {
    const raw = localStorage.getItem(GRID_COLOR_PREFS_KEY);
    if (!raw) return { cellColor: DEFAULT_GRID_CELL_COLOR, sectionColor: DEFAULT_GRID_SECTION_COLOR };
    const parsed = JSON.parse(raw);
    return {
      cellColor: normalizeHexColor(parsed?.cellColor, DEFAULT_GRID_CELL_COLOR),
      sectionColor: normalizeHexColor(parsed?.sectionColor, DEFAULT_GRID_SECTION_COLOR),
    };
  } catch {
    return { cellColor: DEFAULT_GRID_CELL_COLOR, sectionColor: DEFAULT_GRID_SECTION_COLOR };
  }
}

function saveGridColorPreferences(grid: SceneSettings['grid']): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      GRID_COLOR_PREFS_KEY,
      JSON.stringify({
        cellColor: normalizeHexColor(grid.cellColor, DEFAULT_GRID_CELL_COLOR),
        sectionColor: normalizeHexColor(grid.sectionColor, DEFAULT_GRID_SECTION_COLOR),
      }),
    );
  } catch {
    // ignore storage write errors
  }
}

const storedGridColors = loadGridColorPreferences();

const defaultSceneSettings: SceneSettings = {
  environment: 'factory',
  lighting: {
    intensity: 1.0,
    shadows: true,
  },
  grid: {
    visible: true,
    size: 50,
    divisions: 200,
    cellColor: storedGridColors.cellColor,
    sectionColor: storedGridColors.sectionColor,
  },
  axes: {
    visible: true,
    size: 5,
  },
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  assetManifest: getAssetManifest(),
  setAssetManifest: (manifest) => set({ assetManifest: manifest }),
  processNodes: [],
  environmentAssets: [],
  actors: [],
  edges: [],
  underlay: null,
  customProducts: [],
  customModels: [],
  paths: [],
  clipboard: null,
  cameraMode: 'perspective' as const,
  cameraPaths: [],
  activeCameraPathId: null,
  isCameraPathPlaying: false,
  
  sceneSettings: defaultSceneSettings,
  
  selectedObjectId: null,
  selectedObjectType: null,
  selectedIds: [],
  transformMode: 'translate',
  activeTool: 'select',
  drawingPathId: null,
  setDrawingPathId: (id) => set({ drawingPathId: id, activeTool: id ? 'path-draw' : 'select' }),

  mateMode: {
    active: false,
    selectedPort: null,
  },
  
  gridSnap: false,
  gridSnapSize: 0.5,
  
  measureActive: false,
  measurePoints: [],
  
  cameraPresets: [
    { name: 'Top', position: [0, 30, 0.01], target: [0, 0, 0] },
    { name: 'Front', position: [0, 5, 20], target: [0, 2, 0] },
    { name: 'Right', position: [20, 5, 0], target: [0, 2, 0] },
    { name: 'Perspective', position: [15, 15, 15], target: [0, 0, 0] },
  ],
  activeCameraPreset: null,
  cameraTargetPosition: null,
  cameraTargetLookAt: null,
  cameraTargetUp: null,
  
  showShortcuts: false,
  focusRequest: 0,
  hiddenIds: new Set(),
  overlaysHidden: false,
  pathsVisible: true,
  
  isPlaying: false,
  isPaused: false,
  simulationSpeed: 1.0,
  
  activeLibraryTab: 'process',
  showPropertiesPanel: true,
  
  // Panel defaults
  leftPanelWidth: 280,
  rightPanelWidth: 280,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  
  // Theme defaults (restored from localStorage; first launch defaults to light)
  themeMode: (() => {
    if (typeof localStorage === 'undefined') return 'light';
    const next = localStorage.getItem('metamech-theme') as 'dark' | 'light' | null;
    const legacy = localStorage.getItem('metamech_theme') as 'dark' | 'light' | null;
    const resolved = next || legacy || 'light';
    localStorage.setItem('metamech-theme', resolved);
    if (legacy && !next) localStorage.removeItem('metamech_theme');
    return resolved;
  })(),
  setThemeMode: (mode) => {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('metamech-theme', mode);
    set({ themeMode: mode });
  },
  toggleTheme: () => {
    const current = get().themeMode;
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('metamech-theme', next);
    set({ themeMode: next });
  },
  
  // Presentation mode
  presentationMode: false,
  setPresentationMode: (active) => set({ presentationMode: active }),

  // Export capture quality defaults
  isExportRendering: false,
  captureQualityPreset: 'presentation',
  setIsExportRendering: (active) => set({ isExportRendering: active }),
  setCaptureQualityPreset: (preset) => set({ captureQualityPreset: preset }),
  
  // Snap defaults
  isDragging: false,
  dragNodeId: null,
  snapTarget: null,
  
  // Actions
  addProcessNode: (type, position) => {
    // Check if there's a matching asset in the manifest
    const manifest = get().assetManifest;
    const moduleDef = getModuleDefinition(type);
    const preferredAssetId = moduleDef?.assetId || type;
    const matchingAsset = manifest.find(a => a.id === preferredAssetId);
    const isParametric = matchingAsset?.assetType === 'parametric';
    const defaultParams = isParametric
      ? { ...getDefaultParameters(type), ...(matchingAsset as ParametricAssetDef).defaults }
      : getDefaultParameters(type);
    const defaultRotation = (matchingAsset?.assetType === 'static' && Array.isArray((matchingAsset as any).defaultRotation))
      ? [((matchingAsset as any).defaultRotation[0] || 0), ((matchingAsset as any).defaultRotation[1] || 0), ((matchingAsset as any).defaultRotation[2] || 0)] as [number, number, number]
      : [0, 0, 0];

    // Auto-generate unique sensor tag
    if (type === 'sensor' && !defaultParams.sensorTag) {
      const existingSensors = get().processNodes.filter(n => n.type === 'sensor');
      const usedTags = new Set(existingSensors.map(n => n.parameters.sensorTag || ''));
      let tagNum = existingSensors.length + 1;
      while (usedTags.has(`SE${String(tagNum).padStart(3, '0')}`)) tagNum++;
      defaultParams.sensorTag = `SE${String(tagNum).padStart(3, '0')}`;
    }

    // Auto-generate unique stopper tag
    if (type === 'stopper' && !defaultParams.stopperTag) {
      const existing = get().processNodes.filter(n => n.type === 'stopper');
      const usedTags = new Set(existing.map(n => n.parameters.stopperTag || ''));
      let tagNum = existing.length + 1;
      while (usedTags.has(`ST${String(tagNum).padStart(3, '0')}`)) tagNum++;
      defaultParams.stopperTag = `ST${String(tagNum).padStart(3, '0')}`;
    }

    const newNode: ProcessNode = {
      id: uuidv4(),
      type,
      position: [position[0], 0, position[2]], // Force Y=0 (on ground)
      rotation: defaultRotation,
      scale: [1, 1, 1],
      parameters: defaultParams,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
      assetId: matchingAsset?.id || preferredAssetId,
      assetDefType: matchingAsset?.assetType,
    };
    
    set(state => ({
      processNodes: [...state.processNodes, newNode],
      selectedObjectId: newNode.id,
      selectedObjectType: 'process',
    }));
  },
  
  addEnvironmentAsset: (type, position) => {
    const manifest = get().assetManifest;
    const moduleDef = getModuleDefinition(type);
    const preferredAssetId = moduleDef?.assetId || type;
    const matchingAsset = manifest.find(a => a.id === preferredAssetId);
    const isParametric = matchingAsset?.assetType === 'parametric';
    const defaultParams = isParametric
      ? { ...getDefaultParameters(type), ...(matchingAsset as ParametricAssetDef).defaults }
      : getDefaultParameters(type);
    const defaultRotation = (matchingAsset?.assetType === 'static' && Array.isArray((matchingAsset as any).defaultRotation))
      ? [((matchingAsset as any).defaultRotation[0] || 0), ((matchingAsset as any).defaultRotation[1] || 0), ((matchingAsset as any).defaultRotation[2] || 0)] as [number, number, number]
      : [0, 0, 0];

    const newAsset: EnvironmentAsset = {
      id: uuidv4(),
      type,
      position: [position[0], 0, position[2]], // Force Y=0
      rotation: defaultRotation,
      scale: [1, 1, 1],
      parameters: defaultParams,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
      assetId: matchingAsset?.id || preferredAssetId,
      assetDefType: matchingAsset?.assetType,
    };
    
    set(state => ({
      environmentAssets: [...state.environmentAssets, newAsset],
      selectedObjectId: newAsset.id,
      selectedObjectType: 'environment',
    }));
  },

  insertFrameAssembly: (payload, position = [0, 0, 0]) => {
    const manifest = get().assetManifest;
    const matchingAsset = manifest.find(a => a.id === 'frame-assembly' && a.category === 'environment');
    const defaultParams = getDefaultParameters('frame-assembly');
    const params = {
      ...defaultParams,
      ...toFrameAssemblyParameters(payload),
    };
    const id = uuidv4();

    const newAsset: EnvironmentAsset = {
      id,
      type: 'frame-assembly',
      position: [position[0], 0, position[2]],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parameters: params,
      name: payload.assembly.name || 'Frame Assembly',
      assetId: matchingAsset?.id || 'frame-assembly',
      assetDefType: matchingAsset?.assetType,
    };

    set(state => ({
      environmentAssets: [...state.environmentAssets, newAsset],
      selectedObjectId: newAsset.id,
      selectedObjectType: 'environment',
    }));

    return id;
  },
  
  addActor: (type, position) => {
    const manifest = get().assetManifest;
    const moduleDef = getModuleDefinition(type);
    const preferredAssetId = moduleDef?.assetId || type;
    const matchingAsset = manifest.find(a => a.id === preferredAssetId);
    const isParametric = matchingAsset?.assetType === 'parametric';
    const defaultParams = isParametric
      ? { ...getDefaultParameters(type), ...(matchingAsset as ParametricAssetDef).defaults }
      : getDefaultParameters(type);
    const defaultRotation = (matchingAsset?.assetType === 'static' && Array.isArray((matchingAsset as any).defaultRotation))
      ? [((matchingAsset as any).defaultRotation[0] || 0), ((matchingAsset as any).defaultRotation[1] || 0), ((matchingAsset as any).defaultRotation[2] || 0)] as [number, number, number]
      : [0, 0, 0];

    const newActor: Actor = {
      id: uuidv4(),
      type,
      position: [position[0], 0, position[2]],
      rotation: defaultRotation,
      scale: [1, 1, 1],
      parameters: defaultParams,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
      assetId: matchingAsset?.id || preferredAssetId,
      assetDefType: matchingAsset?.assetType,
    };
    
    set(state => ({
      actors: [...state.actors, newActor],
      selectedObjectId: newActor.id,
      selectedObjectType: 'actor',
    }));
  },
  
  updateObject: (id, type, updates) => {
    set(state => {
      if (type === 'process') {
        return {
          processNodes: state.processNodes.map(node =>
            node.id === id ? { ...node, ...updates } : node
          ),
        };
      } else if (type === 'environment') {
        return {
          environmentAssets: state.environmentAssets.map(asset =>
            asset.id === id ? { ...asset, ...updates } : asset
          ),
        };
      } else if (type === 'actor') {
        return {
          actors: state.actors.map(actor =>
            actor.id === id ? { ...actor, ...updates } : actor
          ),
        };
      }
      return state;
    });
  },
  
  removeObject: (id, type) => {
    set(state => {
      const base: Partial<EditorState> = {
        selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
        selectedObjectType: state.selectedObjectId === id ? null : state.selectedObjectType,
        edges: state.edges.filter(e => e.from !== id && e.to !== id),
      };
      
      if (type === 'process') {
        base.processNodes = state.processNodes.filter(node => node.id !== id);
      } else if (type === 'environment') {
        base.environmentAssets = state.environmentAssets.filter(asset => asset.id !== id);
        // Also check custom models
        base.customModels = state.customModels.filter(m => m.id !== id);
      } else if (type === 'actor') {
        base.actors = state.actors.filter(actor => actor.id !== id);
      }
      
      return base;
    });
  },
  
  setSelectedObject: (id, type) => {
    set({ selectedObjectId: id, selectedObjectType: type, selectedIds: id ? [id] : [] });
  },
  
  toggleSelectId: (id, type) => {
    set(state => {
      const ids = [...state.selectedIds];
      const idx = ids.indexOf(id);
      if (idx >= 0) {
        ids.splice(idx, 1);
      } else {
        ids.push(id);
      }
      return { selectedIds: ids, selectedObjectId: ids.length > 0 ? ids[ids.length - 1] : null, selectedObjectType: ids.length > 0 ? type : null };
    });
  },
  
  selectAll: () => {
    const state = get();
    const allIds = [
      ...state.processNodes.map(n => n.id),
      ...state.environmentAssets.map(a => a.id),
      ...state.actors.map(a => a.id),
    ];
    set({ selectedIds: allIds });
  },
  
  setTransformMode: (mode) => {
    set({ transformMode: mode });
  },
  
  setActiveTool: (tool) => {
    const updates: Partial<EditorState> = { activeTool: tool } as any;
    if (tool === 'move' || tool === 'snap-move') (updates as any).transformMode = 'translate';
    else if (tool === 'rotate') (updates as any).transformMode = 'rotate';
    else if (tool === 'scale') (updates as any).transformMode = 'scale';
    
    if (tool === 'mate') {
      (updates as any).mateMode = { active: true, selectedPort: null };
    } else {
      (updates as any).mateMode = { active: false, selectedPort: null };
    }
    
    if (tool === 'measure') {
      (updates as any).measureActive = true;
      (updates as any).measurePoints = [];
    } else {
      (updates as any).measureActive = false;
    }
    
    set(updates as any);
  },
  
  setMateSelectedPort: (port) => {
    set(state => ({
      mateMode: { ...state.mateMode, selectedPort: port },
    }));
  },
  
  setGridSnap: (snap) => set({ gridSnap: snap }),
  setGridSnapSize: (size) => set({ gridSnapSize: size }),
  setMeasureActive: (active) => set({ measureActive: active, measurePoints: [] }),
  addMeasurePoint: (point) => {
    set(state => {
      const pts = [...state.measurePoints, point];
      if (pts.length > 2) return { measurePoints: [point] };
      return { measurePoints: pts };
    });
  },
  clearMeasurePoints: () => set({ measurePoints: [] }),
  setCameraPreset: (name) => {
    const preset = get().cameraPresets.find(p => p.name === name);
    if (preset) {
      set({
        activeCameraPreset: name,
        cameraTargetPosition: [...preset.position] as [number, number, number],
        cameraTargetLookAt: [...preset.target] as [number, number, number],
        cameraTargetUp: [0, 1, 0],
        cameraMode: 'perspective',
      });
    }
  },
  setShowShortcuts: (show) => set({ showShortcuts: show }),
  requestFocus: () => set(state => ({ focusRequest: state.focusRequest + 1 })),
  toggleVisibility: (id) => {
    set(state => {
      const newHidden = new Set(state.hiddenIds);
      if (newHidden.has(id)) newHidden.delete(id);
      else newHidden.add(id);
      return { hiddenIds: newHidden };
    });
  },
  setOverlaysHidden: (hidden) => set({ overlaysHidden: hidden }),
  setPathsVisible: (visible) => set({ pathsVisible: visible }),
  
  setSceneSettings: (settings) => {
    set((state) => {
      const nextSceneSettings: SceneSettings = {
        ...state.sceneSettings,
        ...settings,
        lighting: {
          ...state.sceneSettings.lighting,
          ...(settings.lighting || {}),
        },
        grid: {
          ...state.sceneSettings.grid,
          ...(settings.grid || {}),
        },
        axes: {
          ...state.sceneSettings.axes,
          ...(settings.axes || {}),
        },
      };
      saveGridColorPreferences(nextSceneSettings.grid);
      return { sceneSettings: nextSceneSettings };
    });
  },
  
  setActiveLibraryTab: (tab) => {
    set({ activeLibraryTab: tab });
  },
  
  // Panel actions
  setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.min(420, Math.max(200, width)) }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.min(420, Math.max(200, width)) }),
  setLeftPanelCollapsed: (collapsed) => set({ leftPanelCollapsed: collapsed }),
  setRightPanelCollapsed: (collapsed) => set({ rightPanelCollapsed: collapsed }),
  
  // Edge actions
  addEdge: (from, fromPort, to, toPort) => {
    const edge: ProcessEdge = {
      id: uuidv4(),
      from,
      to,
      fromPort,
      toPort,
      parameters: {},
    };
    set(state => ({ edges: [...state.edges, edge] }));
  },
  
  removeEdge: (id) => {
    set(state => ({ edges: state.edges.filter(e => e.id !== id) }));
  },
  
  // Snap actions
  setIsDragging: (dragging) => set({ isDragging: dragging }),
  setDragNodeId: (id) => set({ dragNodeId: id }),
  setSnapTarget: (target) => set({ snapTarget: target }),
  
  play: () => {
    set({ isPlaying: true, isPaused: false });
  },
  
  pause: () => {
    // Pause freezes simulation in place — products remain visible
    set({ isPlaying: false, isPaused: true });
  },
  
  reset: () => {
    // Reset stops and clears everything
    set({ isPlaying: false, isPaused: false });
  },
  
  setSimulationSpeed: (speed) => {
    set({ simulationSpeed: speed });
  },
  
  // ─── Custom Model Import ─────────────────────────
  addCustomModel: (model) => {
    const newModel: CustomModel = { ...model, id: uuidv4() };
    set(state => ({
      customModels: [...state.customModels, newModel],
      selectedObjectId: newModel.id,
      selectedObjectType: 'environment' as const,
    }));
  },
  removeCustomModel: (id) => {
    set(state => ({
      customModels: state.customModels.filter(m => m.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
      selectedObjectType: state.selectedObjectId === id ? null : state.selectedObjectType,
    }));
  },
  updateCustomModel: (id, updates) => {
    set(state => ({
      customModels: state.customModels.map(m => m.id === id ? { ...m, ...updates } : m),
    }));
  },

  // ─── Path Management ────────────────────────────
  addPath: (partial) => {
    const id = uuidv4();
    const path: ActorPath = {
      id,
      name: partial?.name || `Path_${Date.now()}`,
      points: partial?.points || [],
      loop: partial?.loop ?? false,
      showArrows: partial?.showArrows ?? true,
      color: partial?.color || '#06b6d4',
    };
    set(state => ({ paths: [...state.paths, path] }));
    return id;
  },
  updatePath: (id, updates) => {
    set(state => ({ paths: state.paths.map(p => p.id === id ? { ...p, ...updates } : p) }));
  },
  removePath: (id) => {
    set(state => ({ paths: state.paths.filter(p => p.id !== id) }));
  },
  addPathPoint: (pathId, point) => {
    set(state => ({
      paths: state.paths.map(p => p.id === pathId ? { ...p, points: [...p.points, point] } : p),
    }));
  },
  removePathPoint: (pathId, index) => {
    set(state => ({
      paths: state.paths.map(p => p.id === pathId ? { ...p, points: p.points.filter((_, i) => i !== index) } : p),
    }));
  },

  // ─── Camera Paths (Cinematic) ─────────────────────
  addCameraPath: () => {
    const id = uuidv4();
    const cp: CameraPath = { id, name: `Camera_Path_${Date.now()}`, keyframes: [], loop: false };
    set(state => ({ cameraPaths: [...state.cameraPaths, cp] }));
    return id;
  },
  removeCameraPath: (id) => {
    set(state => ({
      cameraPaths: state.cameraPaths.filter(p => p.id !== id),
      activeCameraPathId: state.activeCameraPathId === id ? null : state.activeCameraPathId,
    }));
  },
  updateCameraPath: (id, updates) => {
    set(state => ({ cameraPaths: state.cameraPaths.map(p => p.id === id ? { ...p, ...updates } : p) }));
  },
  addCameraKeyframe: (pathId, kf) => {
    set(state => ({
      cameraPaths: state.cameraPaths.map(p =>
        p.id === pathId ? { ...p, keyframes: [...p.keyframes, kf] } : p
      ),
    }));
  },
  removeCameraKeyframe: (pathId, index) => {
    set(state => ({
      cameraPaths: state.cameraPaths.map(p =>
        p.id === pathId ? { ...p, keyframes: p.keyframes.filter((_, i) => i !== index) } : p
      ),
    }));
  },
  updateCameraKeyframe: (pathId, index, updates) => {
    set(state => ({
      cameraPaths: state.cameraPaths.map(p =>
        p.id === pathId ? { ...p, keyframes: p.keyframes.map((kf, i) => i === index ? { ...kf, ...updates } : kf) } : p
      ),
    }));
  },
  setActiveCameraPathId: (id) => set({ activeCameraPathId: id }),
  setIsCameraPathPlaying: (playing) => set({ isCameraPathPlaying: playing }),

  // ─── Clipboard (Copy/Paste) ─────────────────────
  copySelected: () => {
    const state = get();
    if (!state.selectedObjectId || !state.selectedObjectType) return;
    let data: any = null;
    let type = state.selectedObjectType;

    // Find the selected object
    if (type === 'process') data = state.processNodes.find(n => n.id === state.selectedObjectId);
    else if (type === 'environment') data = state.environmentAssets.find(a => a.id === state.selectedObjectId);
    else if (type === 'actor') data = state.actors.find(a => a.id === state.selectedObjectId);

    // Also check custom models
    if (!data) {
      const cm = state.customModels.find(m => m.id === state.selectedObjectId);
      if (cm) { data = cm; type = 'environment' as any; }
    }

    if (data) {
      set({ clipboard: { type: type as any, data: JSON.parse(JSON.stringify(data)) } });
    }
  },
  pasteClipboard: () => {
    const state = get();
    if (!state.clipboard) return;
    const { type, data } = state.clipboard;
    const clone = JSON.parse(JSON.stringify(data));
    clone.id = uuidv4();
    clone.name = (clone.name || 'Object') + ' (copy)';
    // Offset position slightly so it's visible
    clone.position = [
      (clone.position?.[0] || 0) + 0.5,
      clone.position?.[1] || 0,
      (clone.position?.[2] || 0) + 0.5,
    ];

    if (type === 'process') {
      set(s => ({ processNodes: [...s.processNodes, clone], selectedObjectId: clone.id, selectedObjectType: 'process' }));
    } else if (type === 'environment') {
      // Check if it's a custom model
      if (clone.glbUrl) {
        set(s => ({ customModels: [...s.customModels, clone], selectedObjectId: clone.id, selectedObjectType: 'environment' }));
      } else {
        set(s => ({ environmentAssets: [...s.environmentAssets, clone], selectedObjectId: clone.id, selectedObjectType: 'environment' }));
      }
    } else if (type === 'actor') {
      set(s => ({ actors: [...s.actors, clone], selectedObjectId: clone.id, selectedObjectType: 'actor' }));
    }
  },

  // ─── Camera View ────────────────────────────────
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setCameraView: (view) => {
    const dist = 30;
    const viewMap: Record<string, { pos: [number, number, number]; target: [number, number, number]; up: [number, number, number]; mode: 'perspective' | 'orthographic' }> = {
      top:         { pos: [0, dist, 0], target: [0, 0, 0], up: [0, 0, -1], mode: 'orthographic' },
      front:       { pos: [0, 0, dist], target: [0, 0, 0], up: [0, 1, 0], mode: 'orthographic' },
      right:       { pos: [dist, 0, 0], target: [0, 0, 0], up: [0, 1, 0], mode: 'orthographic' },
      left:        { pos: [-dist, 0, 0], target: [0, 0, 0], up: [0, 1, 0], mode: 'orthographic' },
      back:        { pos: [0, 0, -dist], target: [0, 0, 0], up: [0, 1, 0], mode: 'orthographic' },
      bottom:      { pos: [0, -dist, 0], target: [0, 0, 0], up: [0, 0, 1], mode: 'orthographic' },
      perspective: { pos: [15, 12, 15], target: [0, 0, 0], up: [0, 1, 0], mode: 'perspective' },
    };
    const v = viewMap[view] || viewMap.perspective;
    set({
      cameraTargetPosition: v.pos,
      cameraTargetLookAt: v.target,
      cameraTargetUp: v.up,
      cameraMode: v.mode,
    });
  },

  clearScene: () => {
    set({
      processNodes: [],
      environmentAssets: [],
      actors: [],
      edges: [],
      underlay: null,
      customModels: [],
      paths: [],
      selectedObjectId: null,
      selectedObjectType: null,
      isPlaying: false,
    });
  },
  
  loadScene: (data) => {
    // Migrate old spiral-conveyor params to new format
    const nodes = data.processNodes || [];
    for (const n of nodes) {
      if (n.type === 'spiral-conveyor' && n.parameters) {
        const p = n.parameters;
        if ((p.diameter || p.totalHeight || p.infeedAngle !== undefined) && !p.outfeedAngle) {
          p.infeedHeight = p.infeedHeight || 800;
          p.outfeedHeight = p.outfeedHeight || ((p.totalHeight || 3000) + (p.infeedHeight || 800));
          p.outfeedAngle = p.outfeedAngle || 180;
          delete p.diameter;
          delete p.totalHeight;
          delete p.risePerTurn;
          delete p.infeedAngle;
        }
      }
    }
    set({
      processNodes: nodes,
      environmentAssets: data.environmentAssets || [],
      actors: data.actors || [],
      edges: data.edges || [],
      underlay: data.underlay || null,
      sceneSettings: {
        ...defaultSceneSettings,
        ...(data.sceneSettings || {}),
        lighting: {
          ...defaultSceneSettings.lighting,
          ...(data.sceneSettings?.lighting || {}),
        },
        grid: {
          ...defaultSceneSettings.grid,
          ...(data.sceneSettings?.grid || {}),
          // Always apply remembered user preference on login/session restore.
          ...loadGridColorPreferences(),
        },
        axes: {
          ...defaultSceneSettings.axes,
          ...(data.sceneSettings?.axes || {}),
        },
      },
      customProducts: data.customProducts || [],
      customModels: data.customModels || [],
      paths: data.paths || [],
      cameraPaths: data.cameraPaths || [],
      pathsVisible: data.pathsVisible ?? true,
      activeCameraPathId: null,
      isCameraPathPlaying: false,
      selectedObjectId: null,
      selectedObjectType: null,
      isPlaying: false,
    });
  },
  
  getSceneData: () => {
    const state = get();
    return {
      processNodes: state.processNodes,
      environmentAssets: state.environmentAssets,
      actors: state.actors,
      edges: state.edges,
      underlay: state.underlay,
      sceneSettings: state.sceneSettings,
      customProducts: state.customProducts,
      customModels: state.customModels,
      paths: state.paths,
      pathsVisible: state.pathsVisible,
      cameraPaths: state.cameraPaths,
    };
  },
}));

// Helper function to get default parameters for different object types
function getDefaultParameters(type: string): Record<string, any> {
  const defaults: Record<string, Record<string, any>> = {
    // Process nodes
    source: { spawnRate: 1.0, productType: 'default' },
    sink: { capacity: 100 },
    conveyor: { length: 5000, width: 1000, speed: 20 },
    'belt-conveyor': { width: 600, length: 3000, height: 800, angle: 0, beltSpeed: 20, sideGuides: true, driveEnd: 'right', supportSpacing: 1500, showLegs: true, adjustableFeetEnabled: true },
    'incline-conveyor': {
      conveyorWidth: 650,
      overallLength: 5200,
      infeedStraightLength: 1200,
      inclinedLength: 2600,
      outfeedStraightLength: 1400,
      infeedHeightFromFloor: 800,
      outfeedHeightFromFloor: 1500,
      inclineAngle: 16,
      sideGuideHeight: 90,
      sideGuidesEnabled: true,
      chainType: 'Friction Top Chain',
      cleatPitch: 240,
      supportMode: 'Standard',
      supportSpacing: 1500,
      driveSide: 'Right',
      motorPosition: 'Outfeed',
      frameFinish: 'Powder-Coated Steel',
    },
    'roller-conveyor': { width: 600, length: 3000, height: 800, rollerPitch: 100, driven: true, sideRails: true, showLegs: true, adjustableFeetEnabled: true },
    'industrial-robot': {},
    'machine-static': {},
    buffer: { capacity: 10 },
    machine: { processingTime: 2.0, capacity: 1 },
    router: { mode: 'round-robin' },
    'transfer-bridge': { width: 600, length: 1000, height: 800 },
    'popup-transfer': { width: 600, length: 1500, height: 800, popupHeight: 200, speed: 1, direction: 'left' },
    'pusher-transfer': { width: 600, length: 2000, height: 800, pushAngle: 90, pushForce: 1, pushSide: 'left' },
    'merge-divert': { width: 600, mainLength: 3000, branchLength: 2000, branchAngle: 30, height: 800, mode: 'divert' },
    'bend-conveyor': { bendAngle: '90', bendDirection: 'right', surfaceType: 'belt', width: 600, radius: 1000, height: 800, speed: 20, sideGuides: true, guideHeight: 60, showLegs: true, supportSpacing: 45, adjustableFeetEnabled: true },
    stopper: { enabled: true, engaged: true, width: 400, bladeHeight: 80, mountHeight: 800, mountPosition: 0.5, mountSide: 'center', heightOffset: 0, flip: false, stopperMode: 'sensor-triggered', triggerSensorTag: '', stopCondition: 'any-product', releaseCondition: 'timed', holdTime: 3, releaseCount: 1, releaseDelay: 0, stopCount: 0 },
    pusher: { enabled: true, side: 'right', stroke: 300, plateWidth: 250, plateHeight: 100, mountHeight: 800, extended: false, mountPosition: 0.5, heightOffset: 0, flip: false },
    sensor: { sensorType: 'through-beam', triggered: false, mountHeight: 800, sensorHeight: 80, beltWidth: 600, showBeam: true, mountPosition: 0.5, mountSide: 'center', heightOffset: 0, flip: false },
    'spiral-conveyor': { beltWidth: 400, turns: 3, infeedHeight: 800, outfeedHeight: 3800, outfeedAngle: 180, direction: 'up', speed: 1, sideGuides: true, guideHeight: 80, showLegs: true, centerStructure: 'column' },
    'vertical-lifter': { platformWidth: 1000, platformDepth: 1000, infeedHeight: 0, outfeedHeight: 3000, liftDirection: 'up', speed: 20, loadDirection: 'front', fenceEnabled: true, capacity: 4 },
    'pick-and-place': { reach: 3, speed: 1.0 },
    palletizer: { palletSize: [1.2, 0.8], stackHeight: 1.5 },
    
    // Environment
    wall: { width: 5, height: 3, thickness: 0.2 },
    door: { width: 2, height: 2.5, thickness: 0.1 },
    window: { width: 2, height: 1.5, thickness: 0.1 },
    stairs: { width: 2, steps: 10, stepHeight: 0.2 },
    'safety-rail': { length: 5, height: 1.2 },
    'floor-marking': { length: 5, width: 0.2, color: 'yellow' },
    'pallet-rack': { width: 3, height: 4, depth: 1.2, levels: 4 },
    'warehouse-shell': { width: 20, height: 8, depth: 15 },
    'frame-assembly': { templateId: 'table-frame', profileFamilyId: 'profile-40x40', widthMm: 1600, heightMm: 1200, depthMm: 800 },
    floor: { width: 50, depth: 50, color: '#f0f0f0' },
    pallet: {},
    'cardboard-box': {},
    
    // Robots
    'cartesian-robot': { reachX: 2000, reachY: 1500, reachZ: 1000, baseHeight: 2500, cycleTime: 4, speedFactor: 1, toolType: 'vacuum', pedestalEnabled: false, pedestalHeight: 500, pickHeight: 800, placeHeight: 800 },
    cobot: { reach: 850, payload: 10, baseHeight: 200, cycleTime: 3, speedFactor: 1, toolType: 'gripper', pedestalEnabled: true, pedestalHeight: 800, pickHeight: 800, placeHeight: 800 },
    'robot-5axis': { reach: 1400, payload: 25, baseHeight: 400, cycleTime: 3, speedFactor: 1, toolType: 'gripper', pedestalEnabled: false, pedestalHeight: 0, pickHeight: 800, placeHeight: 800 },
    'robot-6axis': { reach: 2000, payload: 60, baseHeight: 500, cycleTime: 4, speedFactor: 1, toolType: 'gripper', pedestalEnabled: true, pedestalHeight: 600, pickHeight: 800, placeHeight: 800 },

    // Pallets
    'eur-pallet': { length: 1200, width: 800, height: 144, deckStyle: 'standard', maxLayers: 5, rows: 4, columns: 3, productSpacing: 10, layerPattern: 'aligned' },
    'standard-pallet': { length: 1000, width: 1200, height: 150, deckStyle: 'standard', maxLayers: 5, rows: 3, columns: 4, productSpacing: 10, layerPattern: 'aligned' },
    'custom-pallet': { length: 1000, width: 1000, height: 150, deckStyle: 'standard', maxLayers: 5, rows: 3, columns: 3, productSpacing: 10, layerPattern: 'aligned', maxPalletHeight: 1800 },

    // Actors
    operator: { walkSpeed: 1.5, color: '#4f46e5', pathId: '', animationState: 'idle', loopPath: true },
    engineer: { walkSpeed: 1.2, color: '#059669', pathId: '', animationState: 'idle', loopPath: true },
    forklift: { speed: 180, liftHeight: 4, capacity: 2000, pathId: '', loopPath: true, forkHeight: 0 },
    agv: { speed: 150, capacity: 500, batteryLevel: 100, pathId: '', loopPath: true },
    'pallet-truck': { speed: 120, pathId: '', loopPath: true },
  };
  
  return defaults[type] || {};
}
