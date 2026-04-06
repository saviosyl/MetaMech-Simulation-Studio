import { AssetDef, getAssetManifest } from './assetManifest';
import { ModuleDefinition, moduleLibrary } from './moduleLibrary';
import type { SceneCategory } from '../types';

export interface LegacyMirrorCategoryPayload {
  key: string;
  name: string;
  sceneCategory: SceneCategory;
  sortOrder: number;
  description?: string;
}

export interface LegacyMirrorAssetPayload {
  moduleId: string;
  name: string;
  description: string;
  categoryKey: string;
  sortOrder: number;
  sceneCategory: SceneCategory;
  subcategory: string;
  assetId?: string;
  legacyAssetType?: 'static' | 'parametric';
  legacyBackfillClass?: 'direct-legacy-file-path-available' | 'needs-parametric-runtime-generated-handling' | 'no-model-source-currently-available';
  legacyModelUrl?: string;
  legacyThumbnailUrl?: string;
}

export interface LegacyMirrorPayload {
  categories: LegacyMirrorCategoryPayload[];
  assets: LegacyMirrorAssetPayload[];
}

const MIRROR_EXCLUDED_MODULE_IDS = new Set<string>([
  'spiral-vyeor-conveyor',
  'spiral-conveyor',
  'mm85-conveyor-section',
  'mm85-drive-end',
  'mm85-idler-end',
  'mm85-guide-rail',
  'mm85-support-leg',
  'mm85-end-drive-support',
]);

const SCENE_CATEGORY_LABELS: Record<SceneCategory, string> = {
  process: 'Process',
  modular: 'Modular',
  environment: 'Environment',
  actors: 'Actors',
  robots: 'Robots',
  pallets: 'Pallets',
  fmcg: 'FMCG',
  medical: 'Medical',
};

const SCENE_CATEGORY_ORDER: SceneCategory[] = [
  'process',
  'fmcg',
  'medical',
  'robots',
  'pallets',
  'environment',
  'actors',
  'modular',
];

function inferLegacySubcategory(moduleDef: ModuleDefinition): string {
  const n = moduleDef.id.toLowerCase();
  if (n.includes('conveyor') || n.includes('belt') || n.includes('roller') || n.includes('modular')) return 'Conveyors';
  if (n.includes('stopper') || n.includes('pusher-module')) return 'Accessories';
  if (n.includes('transfer') || n.includes('merge') || n.includes('divert') || n.includes('pusher') || n.includes('popup')) return 'Transfers';
  if (n.includes('spiral') || n.includes('lifter') || n.includes('vertical')) return 'Vertical Transport';
  if (n.includes('source') || n.includes('sink')) return 'Flow Control';
  if (n.includes('machine') || n.includes('palletizer') || n.includes('pick') || n.includes('robot')) return 'Machines';
  if (n.includes('buffer') || n.includes('router')) return 'Routing & Storage';
  if (n.includes('wall') || n.includes('door') || n.includes('window') || n.includes('stair')) return 'Building';
  if (n.includes('rack') || n.includes('pallet') || n.includes('box') || n.includes('rail') || n.includes('floor') || n.includes('warehouse')) return 'Warehouse';
  if (n.includes('operator') || n.includes('engineer') || n.includes('worker')) return 'People';
  if (n.includes('forklift') || n.includes('agv') || n.includes('truck')) return 'Vehicles';
  return 'Other';
}

function sceneCategorySortOrder(sceneCategory: SceneCategory): number {
  const idx = SCENE_CATEGORY_ORDER.indexOf(sceneCategory);
  return idx >= 0 ? idx : Number.MAX_SAFE_INTEGER;
}

function getAssetMap(): Map<string, AssetDef> {
  const map = new Map<string, AssetDef>();
  for (const asset of getAssetManifest()) {
    map.set(asset.id, asset);
  }
  return map;
}

const DIRECT_LEGACY_MODEL_URLS: Record<string, string> = {
  machine: '/models/machine.glb',
  'pick-and-place': '/models/industrial-robot.glb',
  palletizer: '/models/industrial-robot.glb',
  forklift: '/models/forklift.glb',
  agv: '/models/agv.glb',
  pallet: '/models/pallet.glb',
  'pallet-truck': '/models/pallet-truck.glb',
  'cardboard-box': '/models/cardboard-box.glb',
  'operator-1': '/models/operator-walking.glb',
  'operator-2': '/models/operator-2.glb',
  'operator-3': '/models/operator-3.glb',
};

export function buildLegacyLibraryMirrorPayload(): LegacyMirrorPayload {
  const visibleModules = moduleLibrary.filter((moduleDef) => !MIRROR_EXCLUDED_MODULE_IDS.has(moduleDef.id));
  const assetsById = getAssetMap();
  const categories = new Map<string, LegacyMirrorCategoryPayload>();
  const assets: LegacyMirrorAssetPayload[] = [];
  const categoryAssetCount = new Map<string, number>();

  for (const moduleDef of visibleModules) {
    const sceneCategory = moduleDef.category as SceneCategory;
    const subcategory = inferLegacySubcategory(moduleDef);
    const categoryLabel = SCENE_CATEGORY_LABELS[sceneCategory] || 'Process';
    const categoryName = `${categoryLabel} / ${subcategory}`;
    const categoryKey = `${sceneCategory}::${subcategory.toLowerCase()}`;

    if (!categories.has(categoryKey)) {
      const categorySceneOrder = sceneCategorySortOrder(sceneCategory);
      const categoryWithinSceneIndex = Array.from(categories.values()).filter((c) => c.sceneCategory === sceneCategory).length;
      categories.set(categoryKey, {
        key: categoryKey,
        name: categoryName,
        sceneCategory,
        sortOrder: categorySceneOrder * 100 + categoryWithinSceneIndex + 1,
        description: `Legacy mirror: ${categoryLabel} > ${subcategory}`,
      });
      categoryAssetCount.set(categoryKey, 0);
    }

    const nextSortOrder = (categoryAssetCount.get(categoryKey) || 0) + 1;
    categoryAssetCount.set(categoryKey, nextSortOrder);
    const mappedAsset = assetsById.get(moduleDef.assetId || moduleDef.id);
    const legacyAssetType = mappedAsset
      ? mappedAsset.assetType
      : (DIRECT_LEGACY_MODEL_URLS[moduleDef.id] ? 'static' : undefined);
    const directModelUrl = DIRECT_LEGACY_MODEL_URLS[moduleDef.id];
    const legacyModelUrl = directModelUrl || (mappedAsset && mappedAsset.assetType === 'static' ? mappedAsset.glbUrl : undefined);
    const legacyThumbnailUrl = mappedAsset && mappedAsset.assetType === 'static' ? mappedAsset.thumbnailUrl : undefined;
    const legacyBackfillClass = legacyModelUrl
      ? 'direct-legacy-file-path-available'
      : ((legacyAssetType === 'parametric' || !moduleDef.assetId)
        ? 'needs-parametric-runtime-generated-handling'
        : 'no-model-source-currently-available');
    assets.push({
      moduleId: moduleDef.id,
      name: moduleDef.name,
      description: moduleDef.description || 'Legacy library mirrored asset',
      categoryKey,
      sortOrder: nextSortOrder,
      sceneCategory,
      subcategory,
      assetId: moduleDef.assetId || moduleDef.id,
      legacyAssetType,
      legacyBackfillClass,
      legacyModelUrl,
      legacyThumbnailUrl,
    });
  }

  return {
    categories: Array.from(categories.values()).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    assets,
  };
}
