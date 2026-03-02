export interface ConnectionPortDef {
  id: string;
  type: 'input' | 'output';
  localPosition: [number, number, number];
}

export interface StaticAssetDef {
  id: string;
  assetType: 'static';
  category: string;
  name: string;
  description: string;
  glbUrl: string;
  thumbnailUrl: string;
  defaultScale?: [number, number, number];
  connectionPorts?: ConnectionPortDef[];
}

export interface ParametricPartUrls {
  [partName: string]: string;
}

export interface ParametricAssetDef {
  id: string;
  assetType: 'parametric';
  category: string;
  name: string;
  description: string;
  builder: string;
  parts: ParametricPartUrls;
  thumbnailUrl: string;
  defaults: Record<string, number | string | boolean>;
  limits: Record<string, [number, number]>;
  parameterDefs: Record<string, {
    type: 'number' | 'select' | 'boolean';
    label: string;
    unit?: string;
    options?: string[];
    step?: number;
  }>;
}

export type AssetDef = StaticAssetDef | ParametricAssetDef;

export const ASSET_BASE_URL = '/assets';

let _manifest: AssetDef[] | null = null;

function loadInlineManifest(): AssetDef[] {
  return [
    // === PARAMETRIC: Conveyors ===
    {
      id: 'belt-conveyor',
      assetType: 'parametric',
      category: 'process',
      name: 'Belt Conveyor',
      description: 'Belt conveyor with adjustable width, length, height, and angle',
      builder: 'beltConveyorBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, length: 3000, height: 800, inclineAngle: 0, beltSpeed: 20, sideGuides: true, guideHeight: 60, driveEnd: 'right', drivePosition: 'end', motorSide: 'right', beltType: 'flat', returnType: 'slider-bed', supportSpacing: 1500 },
      limits: { width: [300, 1200], length: [500, 12000], height: [300, 3000], inclineAngle: [0, 35], beltSpeed: [1, 100], guideHeight: [30, 150], supportSpacing: [500, 3000] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        length: { type: 'number', label: 'Length', unit: 'mm', step: 100 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        inclineAngle: { type: 'number', label: 'Incline Angle', unit: '°', step: 1 },
        beltSpeed: { type: 'number', label: 'Belt Speed', unit: 'm/min', step: 1 },
        drivePosition: { type: 'select', label: 'Drive Position', options: ['end', 'center'] },
        driveEnd: { type: 'select', label: 'Drive End', options: ['left', 'right'] },
        motorSide: { type: 'select', label: 'Motor Side', options: ['left', 'right'] },
        beltType: { type: 'select', label: 'Belt Type', options: ['flat', 'cleated', 'textured'] },
        returnType: { type: 'select', label: 'Return Type', options: ['slider-bed', 'roller-return'] },
        sideGuides: { type: 'boolean', label: 'Side Guides' },
        guideHeight: { type: 'number', label: 'Guide Height', unit: 'mm', step: 10 },
        supportSpacing: { type: 'number', label: 'Support Spacing', unit: 'mm', step: 100 },
      },
    },
    {
      id: 'roller-conveyor',
      assetType: 'parametric',
      category: 'process',
      name: 'Roller Conveyor',
      description: 'Roller conveyor with adjustable pitch and drive type',
      builder: 'rollerConveyorBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, length: 3000, height: 800, rollerPitch: 100, rollerDiameter: 50, rollerType: 'driven', driveType: 'chain-driven', sideRails: true },
      limits: { width: [300, 1200], length: [500, 12000], height: [300, 3000], rollerPitch: [50, 200], rollerDiameter: [30, 80] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        length: { type: 'number', label: 'Length', unit: 'mm', step: 100 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        rollerPitch: { type: 'number', label: 'Roller Pitch', unit: 'mm', step: 10 },
        rollerDiameter: { type: 'number', label: 'Roller Diameter', unit: 'mm', step: 5 },
        rollerType: { type: 'select', label: 'Roller Type', options: ['driven', 'gravity'] },
        driveType: { type: 'select', label: 'Drive Type', options: ['chain-driven', 'belt-driven', 'mdr'] },
        sideRails: { type: 'boolean', label: 'Side Rails' },
      },
    },

    // === PARAMETRIC: Modular Conveyors ===
    {
      id: 'modular-conveyor-straight',
      assetType: 'parametric',
      category: 'process',
      name: 'Modular Conveyor - Straight',
      description: 'Modular plastic belt conveyor - straight section',
      builder: 'modularConveyorStraightBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, length: 2000, height: 800, speed: 20, sideGuides: true, drivePosition: 'end', beltType: 'flat-top' },
      limits: { width: [100, 1200], length: [300, 10000], height: [300, 1500], speed: [1, 100] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        length: { type: 'number', label: 'Length', unit: 'mm', step: 100 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        speed: { type: 'number', label: 'Speed', unit: 'm/min', step: 1 },
        drivePosition: { type: 'select', label: 'Drive Position', options: ['end', 'center'] },
        beltType: { type: 'select', label: 'Belt Type', options: ['flush-grid', 'raised-rib', 'flat-top'] },
        sideGuides: { type: 'boolean', label: 'Side Guides' },
      },
    },
    {
      id: 'modular-conveyor-90-curve',
      assetType: 'parametric',
      category: 'process',
      name: 'Modular Conveyor - 90° Curve',
      description: 'Modular plastic belt conveyor - 90° curve section',
      builder: 'modularConveyorCurveBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, height: 800, curveAngle: 90, curveRadius: 1000, speed: 20, sideGuides: true, drivePosition: 'end', beltType: 'flat-top' },
      limits: { width: [100, 1200], height: [300, 1500], curveAngle: [15, 180], curveRadius: [300, 2000], speed: [1, 100] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        curveAngle: { type: 'number', label: 'Curve Angle', unit: '°', step: 5 },
        curveRadius: { type: 'number', label: 'Curve Radius', unit: 'mm', step: 50 },
        speed: { type: 'number', label: 'Speed', unit: 'm/min', step: 1 },
        drivePosition: { type: 'select', label: 'Drive Position', options: ['end', 'center'] },
        beltType: { type: 'select', label: 'Belt Type', options: ['flush-grid', 'raised-rib', 'flat-top'] },
        sideGuides: { type: 'boolean', label: 'Side Guides' },
      },
    },
    {
      id: 'modular-conveyor-45-curve',
      assetType: 'parametric',
      category: 'process',
      name: 'Modular Conveyor - 45° Curve',
      description: 'Modular plastic belt conveyor - 45° curve section',
      builder: 'modularConveyorCurveBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, height: 800, curveAngle: 45, curveRadius: 1000, speed: 20, sideGuides: true, drivePosition: 'end', beltType: 'flat-top' },
      limits: { width: [100, 1200], height: [300, 1500], curveAngle: [15, 180], curveRadius: [300, 2000], speed: [1, 100] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        curveAngle: { type: 'number', label: 'Curve Angle', unit: '°', step: 5 },
        curveRadius: { type: 'number', label: 'Curve Radius', unit: 'mm', step: 50 },
        speed: { type: 'number', label: 'Speed', unit: 'm/min', step: 1 },
        drivePosition: { type: 'select', label: 'Drive Position', options: ['end', 'center'] },
        beltType: { type: 'select', label: 'Belt Type', options: ['flush-grid', 'raised-rib', 'flat-top'] },
        sideGuides: { type: 'boolean', label: 'Side Guides' },
      },
    },

    // === STATIC: Robots & Vehicles ===
    {
      id: 'fanuc-robot',
      assetType: 'static',
      category: 'process',
      name: 'Fanuc Robot',
      description: 'Industrial robot arm',
      glbUrl: '/models/fanuc-robot.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
      connectionPorts: [
        { id: 'input', type: 'input', localPosition: [-1.5, 0, 0] },
        { id: 'output', type: 'output', localPosition: [1.5, 0, 0] },
      ],
    },
    {
      id: 'forklift-static',
      assetType: 'static',
      category: 'actors',
      name: 'Forklift',
      description: 'Industrial forklift vehicle',
      glbUrl: '/models/forklift.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
    },
    {
      id: 'machine-static',
      assetType: 'static',
      category: 'process',
      name: 'Machine (GLB)',
      description: 'Industrial machine from GLB model',
      glbUrl: '/models/machine.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
      connectionPorts: [
        { id: 'input', type: 'input', localPosition: [-1, 0.75, 0] },
        { id: 'output', type: 'output', localPosition: [1, 0.75, 0] },
      ],
    },

    // === PARAMETRIC: Environment ===
    {
      id: 'wall',
      assetType: 'parametric',
      category: 'environment',
      name: 'Wall',
      description: 'Structural wall element',
      builder: 'wallBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 5000, height: 3000, thickness: 200 },
      limits: { width: [500, 20000], height: [1000, 8000], thickness: [100, 500] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 100 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 100 },
        thickness: { type: 'number', label: 'Thickness', unit: 'mm', step: 10 },
      },
    },
    {
      id: 'door',
      assetType: 'parametric',
      category: 'environment',
      name: 'Door',
      description: 'Door with frame',
      builder: 'doorBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 1200, height: 2400, thickness: 100 },
      limits: { width: [600, 3000], height: [1800, 3000], thickness: [50, 200] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        thickness: { type: 'number', label: 'Thickness', unit: 'mm', step: 10 },
      },
    },
    {
      id: 'window',
      assetType: 'parametric',
      category: 'environment',
      name: 'Window',
      description: 'Window with frame and glass',
      builder: 'windowBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 1500, height: 1200, thickness: 100 },
      limits: { width: [400, 4000], height: [400, 3000], thickness: [50, 200] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        thickness: { type: 'number', label: 'Thickness', unit: 'mm', step: 10 },
      },
    },
    {
      id: 'stairs',
      assetType: 'parametric',
      category: 'environment',
      name: 'Stairs',
      description: 'Staircase with configurable steps',
      builder: 'stairsBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 1200, stepCount: 12, stepHeight: 180, stepDepth: 280 },
      limits: { width: [600, 3000], stepCount: [3, 30], stepHeight: [150, 220], stepDepth: [200, 350] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        stepCount: { type: 'number', label: 'Steps', step: 1 },
        stepHeight: { type: 'number', label: 'Step Height', unit: 'mm', step: 10 },
        stepDepth: { type: 'number', label: 'Step Depth', unit: 'mm', step: 10 },
      },
    },
    {
      id: 'pallet-rack',
      assetType: 'parametric',
      category: 'environment',
      name: 'Pallet Rack',
      description: 'Industrial pallet racking',
      builder: 'palletRackBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { bayWidth: 2700, depth: 1100, height: 5000, levels: 4 },
      limits: { bayWidth: [1500, 4000], depth: [800, 1500], height: [2000, 12000], levels: [2, 8] },
      parameterDefs: {
        bayWidth: { type: 'number', label: 'Bay Width', unit: 'mm', step: 100 },
        depth: { type: 'number', label: 'Depth', unit: 'mm', step: 50 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 100 },
        levels: { type: 'number', label: 'Levels', step: 1 },
      },
    },
    {
      id: 'safety-rail',
      assetType: 'parametric',
      category: 'environment',
      name: 'Safety Rail',
      description: 'Safety guardrail',
      builder: 'wallBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 3000, height: 1100, thickness: 60 },
      limits: { width: [500, 10000], height: [900, 1200], thickness: [40, 80] },
      parameterDefs: {
        width: { type: 'number', label: 'Length', unit: 'mm', step: 100 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        thickness: { type: 'number', label: 'Thickness', unit: 'mm', step: 10 },
      },
    },
    {
      id: 'warehouse-shell',
      assetType: 'parametric',
      category: 'environment',
      name: 'Warehouse Shell',
      description: 'Large warehouse enclosure',
      builder: 'wallBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 20000, height: 8000, thickness: 300 },
      limits: { width: [5000, 50000], height: [4000, 15000], thickness: [200, 500] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 500 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 500 },
        thickness: { type: 'number', label: 'Thickness', unit: 'mm', step: 50 },
      },
    },

    // === PARAMETRIC: Transfer Modules ===
    {
      id: 'transfer-bridge',
      assetType: 'parametric',
      category: 'process',
      name: 'Transfer Bridge',
      description: 'Gap bridge connecting two conveyors',
      builder: 'transferBridgeBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, length: 1000, height: 800 },
      limits: { width: [300, 1200], length: [200, 2000], height: [300, 1500] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        length: { type: 'number', label: 'Length', unit: 'mm', step: 50 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
      },
    },
    {
      id: 'popup-transfer',
      assetType: 'parametric',
      category: 'process',
      name: 'Pop-Up Transfer',
      description: 'Conveyor with pop-up chains/rollers for 90° transfer',
      builder: 'popupTransferBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, length: 1500, height: 800, popupHeight: 200, speed: 20, direction: 'left' },
      limits: { width: [300, 1200], length: [500, 3000], height: [300, 1500], popupHeight: [100, 500], speed: [1, 100] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        length: { type: 'number', label: 'Length', unit: 'mm', step: 100 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        popupHeight: { type: 'number', label: 'Popup Height', unit: 'mm', step: 10 },
        speed: { type: 'number', label: 'Speed', unit: 'm/min', step: 1 },
        direction: { type: 'select', label: 'Direction', options: ['left', 'right'] },
      },
    },
    {
      id: 'pusher-transfer',
      assetType: 'parametric',
      category: 'process',
      name: 'Pusher Transfer',
      description: 'Conveyor with side-mounted pusher arm',
      builder: 'pusherTransferBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, length: 2000, height: 800, pushAngle: 90, pushForce: 100, pushSide: 'left' },
      limits: { width: [300, 1200], length: [500, 4000], height: [300, 1500], pushAngle: [30, 180], pushForce: [10, 500] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        length: { type: 'number', label: 'Length', unit: 'mm', step: 100 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        pushAngle: { type: 'number', label: 'Push Angle', unit: '°', step: 5 },
        pushForce: { type: 'number', label: 'Push Force', unit: 'N', step: 0.1 },
        pushSide: { type: 'select', label: 'Push Side', options: ['left', 'right'] },
      },
    },
    {
      id: 'merge-divert',
      assetType: 'parametric',
      category: 'process',
      name: 'Merge/Divert Module',
      description: 'Y-junction for merging or splitting flow',
      builder: 'mergeDivertBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { width: 600, mainLength: 3000, branchLength: 2000, branchAngle: 30, height: 800, mode: 'divert' },
      limits: { width: [300, 1200], mainLength: [1000, 6000], branchLength: [500, 4000], branchAngle: [15, 90], height: [300, 1500] },
      parameterDefs: {
        width: { type: 'number', label: 'Width', unit: 'mm', step: 50 },
        mainLength: { type: 'number', label: 'Main Length', unit: 'mm', step: 100 },
        branchLength: { type: 'number', label: 'Branch Length', unit: 'mm', step: 100 },
        branchAngle: { type: 'number', label: 'Branch Angle', unit: '°', step: 5 },
        height: { type: 'number', label: 'Height', unit: 'mm', step: 50 },
        mode: { type: 'select', label: 'Mode', options: ['merge', 'divert'] },
      },
    },

    // === PARAMETRIC: Spiral Conveyor ===
    {
      id: 'spiral-conveyor',
      assetType: 'parametric',
      category: 'process',
      name: 'Spiral Conveyor',
      description: 'Helical conveyor for vertical transportation',
      builder: 'spiralConveyorBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { diameter: 2000, totalHeight: 5000, beltWidth: 500, direction: 'up', speed: 20 },
      limits: { diameter: [1000, 5000], totalHeight: [1000, 15000], beltWidth: [300, 1000], speed: [1, 100] },
      parameterDefs: {
        diameter: { type: 'number', label: 'Diameter', unit: 'mm', step: 100 },
        totalHeight: { type: 'number', label: 'Total Height', unit: 'mm', step: 100 },
        beltWidth: { type: 'number', label: 'Belt Width', unit: 'mm', step: 50 },
        direction: { type: 'select', label: 'Direction', options: ['up', 'down', 'CW', 'CCW'] },
        speed: { type: 'number', label: 'Speed', unit: 'm/min', step: 1 },
      },
    },

    // === PARAMETRIC: Vertical Lifter ===
    {
      id: 'vertical-lifter',
      assetType: 'parametric',
      category: 'process',
      name: 'Vertical Lifter',
      description: 'Elevator for vertical product movement',
      builder: 'verticalLifterBuilder',
      parts: {},
      thumbnailUrl: '',
      defaults: { platformWidth: 1000, platformDepth: 1000, liftHeight: 3000, speed: 20, loadDirection: 'front', capacity: 4 },
      limits: { platformWidth: [500, 2000], platformDepth: [500, 2000], liftHeight: [500, 10000], speed: [1, 100], capacity: [1, 20] },
      parameterDefs: {
        platformWidth: { type: 'number', label: 'Platform Width', unit: 'mm', step: 50 },
        platformDepth: { type: 'number', label: 'Platform Depth', unit: 'mm', step: 50 },
        liftHeight: { type: 'number', label: 'Lift Height', unit: 'mm', step: 100 },
        speed: { type: 'number', label: 'Speed', unit: 'm/min', step: 1 },
        loadDirection: { type: 'select', label: 'Load Direction', options: ['front', 'back', 'left', 'right'] },
        capacity: { type: 'number', label: 'Capacity', step: 1 },
      },
    },

    // === STATIC: Downloaded Models ===
    {
      id: 'pallet-static',
      assetType: 'static',
      category: 'environment',
      name: 'EUR Pallet',
      description: 'Standard euro pallet',
      glbUrl: '/models/pallet.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
    },
    {
      id: 'agv-static',
      assetType: 'static',
      category: 'actors',
      name: 'AGV',
      description: 'Automated guided vehicle',
      glbUrl: '/models/agv.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
    },
    {
      id: 'worker-static',
      assetType: 'static',
      category: 'actors',
      name: 'Factory Worker',
      description: 'Industrial worker / operator',
      glbUrl: '/models/worker.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
    },
    {
      id: 'pallet-truck-static',
      assetType: 'static',
      category: 'actors',
      name: 'Pallet Truck',
      description: 'Hand pallet truck / jack',
      glbUrl: '/models/pallet-truck.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
    },
    {
      id: 'cardboard-box-static',
      assetType: 'static',
      category: 'environment',
      name: 'Cardboard Box',
      description: 'Industrial cardboard box',
      glbUrl: '/models/cardboard-box.glb',
      thumbnailUrl: '',
      defaultScale: [1, 1, 1],
    },
  ];
}

export function getAssetManifest(): AssetDef[] {
  if (!_manifest) {
    _manifest = loadInlineManifest();
  }
  return _manifest;
}

export function getAssetById(id: string): AssetDef | undefined {
  return getAssetManifest().find(a => a.id === id);
}

export function getAssetsByCategory(category: string): AssetDef[] {
  return getAssetManifest().filter(a => a.category === category);
}
