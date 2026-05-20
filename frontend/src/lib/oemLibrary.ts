import { Package } from 'lucide-react';
import { AssetDef, StaticAssetDef } from './assetManifest';
import { ModuleDefinition } from './moduleLibrary';

type PlacementCategory = 'process' | 'environment' | 'actors';

interface OemModelEntry {
  id: string;
  name: string;
  description?: string;
  placementCategory?: PlacementCategory;
  glbPath?: string;
  glbUrl?: string;
  thumbnailUrl?: string;
  defaultScale?: [number, number, number];
}

interface OemCompanyEntry {
  id: string;
  name: string;
  folder?: string;
  models: OemModelEntry[];
}

interface OemLibraryIndex {
  companies: OemCompanyEntry[];
}

export interface OemLibraryLoadResult {
  companies: OemCompanyEntry[];
  modules: ModuleDefinition[];
  assets: AssetDef[];
}

const OWNER = (import.meta.env.VITE_OEM_GITHUB_OWNER || 'saviosyl').trim();
const REPO = (import.meta.env.VITE_OEM_GITHUB_REPO || 'MetaMech-Simulation-Studio').trim();
const BRANCH = (import.meta.env.VITE_OEM_GITHUB_BRANCH || 'main').trim();
const LIBRARY_PATH = (import.meta.env.VITE_OEM_GITHUB_PATH || 'oem-library').replace(/^\/+|\/+$/g, '');
const INDEX_FILE = `${LIBRARY_PATH}/index.json`;
const INDEX_URL = `https://raw.githubusercontent.com/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/${encodeURIComponent(BRANCH)}/${INDEX_FILE}`;
export const OEM_LIBRARY_MANAGE_URL = `https://github.com/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/tree/${encodeURIComponent(BRANCH)}/${LIBRARY_PATH}`;

let loadPromise: Promise<OemLibraryLoadResult> | null = null;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function githubRawUrl(path: string): string {
  const encodedPath = path.split('/').map((segment) => encodeURIComponent(segment)).join('/');
  return `https://raw.githubusercontent.com/${encodeURIComponent(OWNER)}/${encodeURIComponent(REPO)}/${encodeURIComponent(BRANCH)}/${encodedPath}`;
}

function toPlacementCategory(value: unknown): PlacementCategory {
  if (value === 'process' || value === 'actors') return value;
  return 'environment';
}

function toAssetId(company: OemCompanyEntry, model: OemModelEntry): string {
  const companyId = slugify(company.id || company.name || 'oem');
  const modelId = slugify(model.id || model.name || 'model');
  return `oem-${companyId}-${modelId}`;
}

function resolveGlbUrl(company: OemCompanyEntry, model: OemModelEntry): string | null {
  if (typeof model.glbUrl === 'string' && model.glbUrl.trim()) return model.glbUrl.trim();
  if (typeof model.glbPath !== 'string' || !model.glbPath.trim()) return null;
  const folder = (company.folder || company.id || company.name || '').trim();
  const path = folder
    ? `${LIBRARY_PATH}/${folder.replace(/^\/+|\/+$/g, '')}/${model.glbPath.replace(/^\/+/, '')}`
    : `${LIBRARY_PATH}/${model.glbPath.replace(/^\/+/, '')}`;
  return githubRawUrl(path);
}

function normalizeLibrary(data: unknown): OemLibraryIndex {
  if (!data || typeof data !== 'object') return { companies: [] };
  const companiesRaw = (data as any).companies;
  if (!Array.isArray(companiesRaw)) return { companies: [] };

  const companies: OemCompanyEntry[] = [];
  for (const c of companiesRaw) {
    if (!c || typeof c !== 'object') continue;
    const modelsRaw = Array.isArray((c as any).models) ? (c as any).models : [];
    const models: OemModelEntry[] = [];
    for (const m of modelsRaw) {
      if (!m || typeof m !== 'object') continue;
      const name = typeof (m as any).name === 'string' ? (m as any).name.trim() : '';
      if (!name) continue;
      models.push({
        id: typeof (m as any).id === 'string' ? (m as any).id : slugify(name),
        name,
        description: typeof (m as any).description === 'string' ? (m as any).description : '',
        placementCategory: toPlacementCategory((m as any).placementCategory),
        glbPath: typeof (m as any).glbPath === 'string' ? (m as any).glbPath : undefined,
        glbUrl: typeof (m as any).glbUrl === 'string' ? (m as any).glbUrl : undefined,
        thumbnailUrl: typeof (m as any).thumbnailUrl === 'string' ? (m as any).thumbnailUrl : '',
        defaultScale: Array.isArray((m as any).defaultScale) && (m as any).defaultScale.length === 3
          ? [(m as any).defaultScale[0], (m as any).defaultScale[1], (m as any).defaultScale[2]]
          : undefined,
      });
    }
    if (models.length === 0) continue;
    const companyName = typeof (c as any).name === 'string' ? (c as any).name.trim() : '';
    if (!companyName) continue;
    companies.push({
      id: typeof (c as any).id === 'string' ? (c as any).id : slugify(companyName),
      name: companyName,
      folder: typeof (c as any).folder === 'string' ? (c as any).folder : undefined,
      models,
    });
  }

  return { companies };
}

function toRuntimeEntities(index: OemLibraryIndex): OemLibraryLoadResult {
  const modules: ModuleDefinition[] = [];
  const assets: AssetDef[] = [];

  for (const company of index.companies) {
    for (const model of company.models) {
      const glbUrl = resolveGlbUrl(company, model);
      if (!glbUrl) continue;
      const placementCategory = toPlacementCategory(model.placementCategory);
      const assetId = toAssetId(company, model);

      const asset: StaticAssetDef = {
        id: assetId,
        assetType: 'static',
        category: placementCategory,
        name: model.name,
        description: model.description || `${company.name} OEM model`,
        glbUrl,
        thumbnailUrl: model.thumbnailUrl || '',
        defaultScale: model.defaultScale,
      };
      assets.push(asset);

      modules.push({
        id: assetId,
        name: model.name,
        category: 'oem',
        icon: Package,
        description: model.description || `${company.name} OEM model`,
        assetId,
        placementCategory,
        oemCompany: company.name,
        parameters: {},
      });
    }
  }

  return { companies: index.companies, modules, assets };
}

export async function loadOemLibrary(): Promise<OemLibraryLoadResult> {
  if (!loadPromise) {
    loadPromise = (async () => {
      try {
        const res = await fetch(INDEX_URL);
        if (!res.ok) return { companies: [], modules: [], assets: [] };
        const data = await res.json();
        const normalized = normalizeLibrary(data);
        return toRuntimeEntities(normalized);
      } catch {
        return { companies: [], modules: [], assets: [] };
      }
    })();
  }
  return loadPromise;
}

