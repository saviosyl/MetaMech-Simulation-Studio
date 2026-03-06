/**
 * Import Presets — MetaMech Simulation Studio
 *
 * Different asset types need different import pipelines.
 * Presets control mesh optimization, hierarchy preservation, collision generation.
 */

export type ImportPresetId = 'robot' | 'machine' | 'product' | 'floorplan' | 'environment';

export interface ImportPreset {
  id: ImportPresetId;
  name: string;
  description: string;
  icon: string; // emoji
  /** Preserve joint/bone hierarchy (for robots with articulated arms) */
  preserveHierarchy: boolean;
  /** Preserve pivots/origins (important for correct rotation) */
  preservePivots: boolean;
  /** Optimize mesh (merge geometries, simplify) */
  optimizeMesh: boolean;
  /** Generate collision bounds */
  generateCollision: boolean;
  /** Target poly count (0 = no reduction) */
  targetPolyCount: number;
  /** Scale factor applied on import */
  defaultScale: number;
  /** Place on ground (y=0) after import */
  placeOnGround: boolean;
  /** Auto-detect connection ports */
  detectPorts: boolean;
  /** For floorplan: enable point-to-point scale calibration */
  enableScaleCalibration: boolean;
  /** Accepted file types */
  acceptedFormats: string[];
}

export const IMPORT_PRESETS: ImportPreset[] = [
  {
    id: 'robot',
    name: 'Robot',
    description: 'Preserve joint hierarchy, pivots, and skeleton for articulated robots',
    icon: '🤖',
    preserveHierarchy: true,
    preservePivots: true,
    optimizeMesh: false,
    generateCollision: false,
    targetPolyCount: 0,
    defaultScale: 1,
    placeOnGround: true,
    detectPorts: false,
    enableScaleCalibration: false,
    acceptedFormats: ['.glb', '.gltf', '.fbx', '.step', '.stp'],
  },
  {
    id: 'machine',
    name: 'Machine / Layout',
    description: 'Optimize mesh, generate collision bounds, set mount points',
    icon: '🏭',
    preserveHierarchy: false,
    preservePivots: true,
    optimizeMesh: true,
    generateCollision: true,
    targetPolyCount: 50000,
    defaultScale: 1,
    placeOnGround: true,
    detectPorts: true,
    enableScaleCalibration: false,
    acceptedFormats: ['.glb', '.gltf', '.fbx', '.step', '.stp', '.obj'],
  },
  {
    id: 'product',
    name: 'Product',
    description: 'Lightweight mesh with simple collision box and configurable dimensions',
    icon: '📦',
    preserveHierarchy: false,
    preservePivots: false,
    optimizeMesh: true,
    generateCollision: true,
    targetPolyCount: 5000,
    defaultScale: 1,
    placeOnGround: false,
    detectPorts: false,
    enableScaleCalibration: false,
    acceptedFormats: ['.glb', '.gltf', '.fbx', '.obj', '.stl'],
  },
  {
    id: 'floorplan',
    name: 'Floorplan',
    description: 'Image or DWG underlay with point-to-point scale calibration',
    icon: '📐',
    preserveHierarchy: false,
    preservePivots: false,
    optimizeMesh: false,
    generateCollision: false,
    targetPolyCount: 0,
    defaultScale: 1,
    placeOnGround: true,
    detectPorts: false,
    enableScaleCalibration: true,
    acceptedFormats: ['.png', '.jpg', '.jpeg', '.svg', '.dxf', '.dwg', '.pdf'],
  },
  {
    id: 'environment',
    name: 'Environment',
    description: 'Decorative/static objects — fences, walls, pallets, racks',
    icon: '🏗️',
    preserveHierarchy: false,
    preservePivots: false,
    optimizeMesh: true,
    generateCollision: false,
    targetPolyCount: 20000,
    defaultScale: 1,
    placeOnGround: true,
    detectPorts: false,
    enableScaleCalibration: false,
    acceptedFormats: ['.glb', '.gltf', '.fbx', '.obj'],
  },
];

export function getPresetById(id: ImportPresetId): ImportPreset | undefined {
  return IMPORT_PRESETS.find(p => p.id === id);
}

/**
 * Auto-detect the best preset based on file extension and name.
 */
export function autoDetectPreset(filename: string): ImportPresetId {
  const lower = filename.toLowerCase();
  
  // Floorplan detection
  if (/\.(png|jpg|jpeg|svg|dxf|dwg|pdf)$/.test(lower)) return 'floorplan';
  
  // Robot detection (common naming)
  if (/robot|arm|cobot|ur\d|manipulator|articulated/i.test(lower)) return 'robot';
  
  // Product detection
  if (/product|box|carton|bottle|pallet|tote|part/i.test(lower)) return 'product';
  
  // Default to machine
  return 'machine';
}
