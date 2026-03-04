import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { AssetDef, getAssetManifest, getAssetById, ParametricAssetDef } from '../lib/assetManifest';
import { runBuilder } from '../lib/parametricBuilders';
import { getPortWorldPosition, getWorldPorts as computeWorldPorts } from '../lib/nodeTransform';

// Types
export interface ProcessNode {
  id: string;
  type: 'source' | 'sink' | 'conveyor' | 'buffer' | 'machine' | 'router' | 
        'transfer-bridge' | 'popup-transfer' | 'pusher-transfer' | 'merge-divert' |
        'spiral-conveyor' | 'vertical-lifter' | 'pick-and-place' | 'palletizer' |
        'belt-conveyor' | 'roller-conveyor' | 'fanuc-robot' | 'machine-static' |
        'stopper' | 'pusher' | 'bend-conveyor' | 'sensor' |
        'cartesian-robot' | 'cobot' | 'robot-5axis' | 'robot-6axis' |
        'eur-pallet' | 'standard-pallet' | 'custom-pallet' |
        'carton-erector' | 'case-packer' | 'checkweigher' | 'metal-detector' |
        'labeler' | 'sealing-station' | 'reject-station' | 'accumulation-table' |
        'stretch-wrapper' | 'packing-station' | 'pallet-conveyor' | 'forklift';
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
        'floor-marking' | 'pallet-rack' | 'warehouse-shell' | 'floor' | 'pallet' | 'cardboard-box';
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
      const portInset = 0.02; // 20mm from belt end
      return [
        { id: 'input', type: 'input', localPosition: [-pL / 2 + portInset, pH, 0] },
        { id: 'output', type: 'output', localPosition: [pL / 2 - portInset, pH, 0] },
      ];
    }
    case 'modular-conveyor-90-curve':
    case 'modular-conveyor-45-curve':
    case 'bend-conveyor': {
      const pH = ((params?.height || 800) / 1000);
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
        { id: 'output', type: 'output', localPosition: [outX, pH, outZ], direction: outfeedDir },
      ];
    }
    case 'buffer':
      return [
        { id: 'input', type: 'input', localPosition: [-1, 0.4, 0] },
        { id: 'output', type: 'output', localPosition: [1, 0.4, 0] },
      ];
    case 'machine':
      return [
        { id: 'input', type: 'input', localPosition: [-1, 0.75, 0] },
        { id: 'output', type: 'output', localPosition: [1, 0.75, 0] },
      ];
    case 'palletizer':
      return [
        { id: 'input', type: 'input', localPosition: [-1.5, 1.25, 0] },
        { id: 'output', type: 'output', localPosition: [1.5, 1.25, 0] },
      ];
    case 'pick-and-place':
      return [
        { id: 'input', type: 'input', localPosition: [-1.5, 0, 0] },
        { id: 'output', type: 'output', localPosition: [1.5, 0, 0] },
      ];
    case 'router':
      return [
        { id: 'input', type: 'input', localPosition: [-1, 0.25, 0] },
        { id: 'output1', type: 'output', localPosition: [1, 0.25, 0] },
        { id: 'output2', type: 'output', localPosition: [0, 0.25, 1] },
      ];
    case 'spiral-conveyor': {
      const sR = (params?.diameter || 1800) / 2000;
      const sH = (params?.totalHeight || 3000) / 1000;
      const startA = ((params?.infeedAngle || 0) * Math.PI) / 180;
      const endA = startA + (params?.turns || 3) * Math.PI * 2;
      const infY = params?.direction === 'down' ? sH : 0;
      const outY = params?.direction === 'down' ? 0 : sH;
      return [
        { id: 'input', type: 'input', localPosition: [Math.cos(startA) * sR, infY, Math.sin(startA) * sR] },
        { id: 'output', type: 'output', localPosition: [Math.cos(endA) * sR, outY, Math.sin(endA) * sR] },
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
      const liftH = (params?.liftHeight || 3000) / 1000;
      const loadDir = params?.loadDirection || 'front';
      const liftDir = params?.liftDirection || 'up';
      const groundY = 0.15;
      const topY = liftH;
      const dirMap: Record<string, [number, number]> = {
        front: [0, -platD / 2],
        back: [0, platD / 2],
        left: [-platW / 2, 0],
        right: [platW / 2, 0],
      };
      const [offX, offZ] = dirMap[loadDir] || [0, -platD / 2];
      if (liftDir === 'up') {
        return [
          { id: 'input', type: 'input', localPosition: [offX, groundY, offZ] as [number, number, number] },
          { id: 'output', type: 'output', localPosition: [-offX, topY, -offZ] as [number, number, number] },
        ];
      } else {
        // Down: infeed at top, outfeed at ground
        return [
          { id: 'input', type: 'input', localPosition: [offX, topY, offZ] as [number, number, number] },
          { id: 'output', type: 'output', localPosition: [-offX, groundY, -offZ] as [number, number, number] },
        ];
      }
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
      const rH = rBase + pedH;
      return [
        { id: 'pick', type: 'input', localPosition: [-rReach * 0.4, rH, 0] as [number, number, number] },
        { id: 'place', type: 'output', localPosition: [rReach * 0.4, rH, 0] as [number, number, number] },
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
      return [
        { id: 'input', type: 'input', localPosition: [-eqW / 2 - 0.15, eqH * 0.55, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [eqW / 2 + 0.15, eqH * 0.55, 0] as [number, number, number] },
      ];
    }
    case 'accumulation-table': {
      const tW = (params?.width || 2000) / 1000;
      const tH = (params?.height || 800) / 1000;
      return [
        { id: 'input', type: 'input', localPosition: [-tW / 2, tH + 0.03, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [tW / 2, tH + 0.03, 0] as [number, number, number] },
      ];
    }
    case 'pallet-conveyor': {
      const pcL = (params?.length || 3000) / 1000;
      const pcH = (params?.height || 500) / 1000;
      return [
        { id: 'input', type: 'input', localPosition: [-pcL / 2, pcH, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [pcL / 2, pcH, 0] as [number, number, number] },
      ];
    }
    case 'stretch-wrapper':
      return [
        { id: 'input', type: 'input', localPosition: [-0.8, 0.1, 0] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [0.8, 0.1, 0] as [number, number, number] },
      ];
    case 'packing-station':
      return [
        { id: 'input', type: 'input', localPosition: [-0.75, 0.9, 0.3] as [number, number, number] },
        { id: 'output', type: 'output', localPosition: [0.75, 0.9, 0.3] as [number, number, number] },
      ];
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

  // Scene objects
  processNodes: ProcessNode[];
  environmentAssets: EnvironmentAsset[];
  actors: Actor[];
  edges: ProcessEdge[];
  underlay: Underlay | null;
  customProducts: CustomProduct[];
  
  // Scene settings
  sceneSettings: SceneSettings;
  
  // Selection and tools
  selectedObjectId: string | null;
  selectedObjectType: 'process' | 'environment' | 'actor' | null;
  selectedIds: string[];
  transformMode: 'translate' | 'rotate' | 'scale';
  activeTool: 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'snap-move' | 'measure';
  
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
  
  // Shortcuts panel
  showShortcuts: boolean;
  
  // Focus request
  focusRequest: number; // increment to trigger
  
  // Simulation state
  isPlaying: boolean;
  isPaused: boolean;
  simulationSpeed: number;
  
  // UI state
  activeLibraryTab: 'process' | 'environment' | 'actors' | 'robots' | 'pallets' | 'fmcg' | 'medical';
  showPropertiesPanel: boolean;
  
  // Panel state
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  
  // Snap state
  isDragging: boolean;
  dragNodeId: string | null;
  snapTarget: { nodeId: string; portId: string; position: [number, number, number] } | null;
  
  // Actions
  addProcessNode: (type: ProcessNode['type'], position: [number, number, number]) => void;
  addEnvironmentAsset: (type: EnvironmentAsset['type'], position: [number, number, number]) => void;
  addActor: (type: Actor['type'], position: [number, number, number]) => void;
  
  updateObject: (id: string, type: 'process' | 'environment' | 'actor', updates: Record<string, any>) => void;
  removeObject: (id: string, type: 'process' | 'environment' | 'actor') => void;
  
  setSelectedObject: (id: string | null, type: 'process' | 'environment' | 'actor' | null) => void;
  toggleSelectId: (id: string, type: 'process' | 'environment' | 'actor') => void;
  selectAll: () => void;
  setTransformMode: (mode: 'translate' | 'rotate' | 'scale') => void;
  setActiveTool: (tool: 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'snap-move' | 'measure') => void;
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
  
  setSceneSettings: (settings: Partial<SceneSettings>) => void;
  setActiveLibraryTab: (tab: 'process' | 'environment' | 'actors' | 'robots' | 'pallets') => void;
  
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
  
  // Scene management
  clearScene: () => void;
  loadScene: (data: any) => void;
  getSceneData: () => any;
}

const defaultSceneSettings: SceneSettings = {
  environment: 'factory',
  lighting: {
    intensity: 1.0,
    shadows: true,
  },
  grid: {
    visible: true,
    size: 50,
    divisions: 50,
  },
  axes: {
    visible: true,
    size: 5,
  },
};

export const useEditorStore = create<EditorState>((set, get) => ({
  // Initial state
  assetManifest: getAssetManifest(),
  processNodes: [],
  environmentAssets: [],
  actors: [],
  edges: [],
  underlay: null,
  customProducts: [],
  
  sceneSettings: defaultSceneSettings,
  
  selectedObjectId: null,
  selectedObjectType: null,
  selectedIds: [],
  transformMode: 'translate',
  activeTool: 'select',
  
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
  
  showShortcuts: false,
  focusRequest: 0,
  hiddenIds: new Set(),
  
  isPlaying: false,
  isPaused: false,
  simulationSpeed: 1.0,
  
  activeLibraryTab: 'process',
  showPropertiesPanel: true,
  
  // Panel defaults
  leftPanelWidth: 320,
  rightPanelWidth: 320,
  leftPanelCollapsed: false,
  rightPanelCollapsed: false,
  
  // Snap defaults
  isDragging: false,
  dragNodeId: null,
  snapTarget: null,
  
  // Actions
  addProcessNode: (type, position) => {
    // Check if there's a matching asset in the manifest
    const manifest = get().assetManifest;
    const matchingAsset = manifest.find(a => a.id === type && a.category === 'process');
    const isParametric = matchingAsset?.assetType === 'parametric';
    const defaultParams = isParametric
      ? { ...getDefaultParameters(type), ...(matchingAsset as ParametricAssetDef).defaults }
      : getDefaultParameters(type);

    // Auto-generate unique sensor tag
    if (type === 'sensor' && !defaultParams.sensorTag) {
      const existingSensors = get().processNodes.filter(n => n.type === 'sensor');
      const usedTags = new Set(existingSensors.map(n => n.parameters.sensorTag || ''));
      let tagNum = existingSensors.length + 1;
      while (usedTags.has(`SE${String(tagNum).padStart(3, '0')}`)) tagNum++;
      defaultParams.sensorTag = `SE${String(tagNum).padStart(3, '0')}`;
    }

    const newNode: ProcessNode = {
      id: uuidv4(),
      type,
      position: [position[0], 0, position[2]], // Force Y=0 (on ground)
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parameters: defaultParams,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
      assetId: matchingAsset?.id,
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
    const matchingAsset = manifest.find(a => a.id === type && a.category === 'environment');
    const isParametric = matchingAsset?.assetType === 'parametric';
    const defaultParams = isParametric
      ? { ...getDefaultParameters(type), ...(matchingAsset as ParametricAssetDef).defaults }
      : getDefaultParameters(type);

    const newAsset: EnvironmentAsset = {
      id: uuidv4(),
      type,
      position: [position[0], 0, position[2]], // Force Y=0
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parameters: defaultParams,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
      assetId: matchingAsset?.id,
      assetDefType: matchingAsset?.assetType,
    };
    
    set(state => ({
      environmentAssets: [...state.environmentAssets, newAsset],
      selectedObjectId: newAsset.id,
      selectedObjectType: 'environment',
    }));
  },
  
  addActor: (type, position) => {
    const manifest = get().assetManifest;
    const matchingAsset = manifest.find(a => a.id === type && a.category === 'actors');
    const isParametric = matchingAsset?.assetType === 'parametric';
    const defaultParams = isParametric
      ? { ...getDefaultParameters(type), ...(matchingAsset as ParametricAssetDef).defaults }
      : getDefaultParameters(type);

    const newActor: Actor = {
      id: uuidv4(),
      type,
      position: [position[0], 0, position[2]],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
      parameters: defaultParams,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)}_${Date.now()}`,
      assetId: matchingAsset?.id,
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
      set({ activeCameraPreset: name, cameraTargetPosition: [...preset.position] as [number, number, number], cameraTargetLookAt: [...preset.target] as [number, number, number] });
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
  
  setSceneSettings: (settings) => {
    set(state => ({
      sceneSettings: { ...state.sceneSettings, ...settings },
    }));
  },
  
  setActiveLibraryTab: (tab) => {
    set({ activeLibraryTab: tab });
  },
  
  // Panel actions
  setLeftPanelWidth: (width) => set({ leftPanelWidth: Math.min(500, Math.max(240, width)) }),
  setRightPanelWidth: (width) => set({ rightPanelWidth: Math.min(500, Math.max(240, width)) }),
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
  
  clearScene: () => {
    set({
      processNodes: [],
      environmentAssets: [],
      actors: [],
      edges: [],
      underlay: null,
      selectedObjectId: null,
      selectedObjectType: null,
      isPlaying: false,
    });
  },
  
  loadScene: (data) => {
    set({
      processNodes: data.processNodes || [],
      environmentAssets: data.environmentAssets || [],
      actors: data.actors || [],
      edges: data.edges || [],
      underlay: data.underlay || null,
      sceneSettings: { ...defaultSceneSettings, ...(data.sceneSettings || {}) },
      customProducts: data.customProducts || [],
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
    'belt-conveyor': { width: 600, length: 3000, height: 800, angle: 0, beltSpeed: 20, sideGuides: true, driveEnd: 'right', supportSpacing: 1500 },
    'roller-conveyor': { width: 600, length: 3000, height: 800, rollerPitch: 100, driven: true, sideRails: true },
    'fanuc-robot': {},
    'machine-static': {},
    buffer: { capacity: 10 },
    machine: { processingTime: 2.0, capacity: 1 },
    router: { mode: 'round-robin' },
    'transfer-bridge': { width: 600, length: 1000, height: 800 },
    'popup-transfer': { width: 600, length: 1500, height: 800, popupHeight: 200, speed: 1, direction: 'left' },
    'pusher-transfer': { width: 600, length: 2000, height: 800, pushAngle: 90, pushForce: 1, pushSide: 'left' },
    'merge-divert': { width: 600, mainLength: 3000, branchLength: 2000, branchAngle: 30, height: 800, mode: 'divert' },
    'bend-conveyor': { bendAngle: '90', bendDirection: 'right', surfaceType: 'belt', width: 600, radius: 1000, height: 800, speed: 20, sideGuides: true, guideHeight: 60, showLegs: true, supportSpacing: 45, adjustableFeetEnabled: true },
    stopper: { enabled: true, engaged: true, width: 400, bladeHeight: 80, mountHeight: 800, mountPosition: 0.5, mountSide: 'center' },
    pusher: { enabled: true, side: 'right', stroke: 300, plateWidth: 250, plateHeight: 100, mountHeight: 800, extended: false, mountPosition: 0.5 },
    sensor: { sensorType: 'through-beam', triggered: false, mountHeight: 800, sensorHeight: 80, beltWidth: 600, showBeam: true, mountPosition: 0.5, mountSide: 'center' },
    'spiral-conveyor': { diameter: 2000, totalHeight: 5000, beltWidth: 500, direction: 'up', speed: 1 },
    'vertical-lifter': { platformWidth: 1000, platformDepth: 1000, liftHeight: 3000, speed: 1, loadDirection: 'front', capacity: 4 },
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
    operator: { walkSpeed: 1.5, color: '#4f46e5' },
    engineer: { walkSpeed: 1.2, color: '#059669' },
    forklift: { speed: 3.0, liftHeight: 4, capacity: 2000 },
    agv: { speed: 2.0, capacity: 500, batteryLevel: 100 },
    'pallet-truck': { speed: 1.5 },
  };
  
  return defaults[type] || {};
}
