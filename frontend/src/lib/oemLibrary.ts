import { Package } from 'lucide-react';
import { AssetDef, ConnectionPortDef, StaticAssetDef } from './assetManifest';
import { ModuleDefinition } from './moduleLibrary';

export type PlacementCategory = 'process' | 'environment' | 'actors';

export interface OemConnectionPortInput {
  id: string;
  type: 'input' | 'output';
  localPosition: [number, number, number];
}

export interface OemModelEntry {
  id: string;
  name: string;
  description?: string;
  placementCategory?: PlacementCategory;
  glbPath?: string;
  glbUrl?: string;
  thumbnailUrl?: string;
  defaultScale?: [number, number, number];
  priceUsd?: number;
  connectionPorts?: OemConnectionPortInput[];
}

export interface OemCompanyEntry {
  id: string;
  name: string;
  folder?: string;
  models: OemModelEntry[];
}

export interface OemLibraryIndex {
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
const LOCAL_DRAFT_KEY = 'metamech_oem_library_draft_v1';

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

export function resolveOemModelGlbUrl(company: OemCompanyEntry, model: OemModelEntry): string | null {
  if (typeof model.glbUrl === 'string' && model.glbUrl.trim()) return model.glbUrl.trim();
  if (typeof model.glbPath !== 'string' || !model.glbPath.trim()) return null;
  const folder = (company.folder || company.id || company.name || '').trim();
  const path = folder
    ? `${LIBRARY_PATH}/${folder.replace(/^\/+|\/+$/g, '')}/${model.glbPath.replace(/^\/+/, '')}`
    : `${LIBRARY_PATH}/${model.glbPath.replace(/^\/+/, '')}`;
  return githubRawUrl(path);
}

function normalizePorts(value: unknown): OemConnectionPortInput[] {
  if (!Array.isArray(value)) return [];
  const ports: OemConnectionPortInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const type = (item as any).type === 'output' ? 'output' : 'input';
    const local = Array.isArray((item as any).localPosition) && (item as any).localPosition.length === 3
      ? [(item as any).localPosition[0], (item as any).localPosition[1], (item as any).localPosition[2]]
      : [0, 0, 0];
    const px = Number(local[0]);
    const py = Number(local[1]);
    const pz = Number(local[2]);
    ports.push({
      id: typeof (item as any).id === 'string' && (item as any).id.trim() ? (item as any).id.trim() : `${type}-${ports.length + 1}`,
      type,
      localPosition: [
        Number.isFinite(px) ? px : 0,
        Number.isFinite(py) ? py : 0,
        Number.isFinite(pz) ? pz : 0,
      ],
    });
  }
  return ports;
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
        priceUsd: typeof (m as any).priceUsd === 'number' && Number.isFinite((m as any).priceUsd)
          ? Math.max(0, (m as any).priceUsd)
          : undefined,
        connectionPorts: normalizePorts((m as any).connectionPorts),
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

function mergeLibraries(base: OemLibraryIndex, override: OemLibraryIndex | null): OemLibraryIndex {
  if (!override || !Array.isArray(override.companies) || override.companies.length === 0) return base;
  const byId = new Map<string, OemCompanyEntry>();
  for (const company of base.companies) byId.set(company.id, company);
  for (const company of override.companies) byId.set(company.id, company);
  return { companies: Array.from(byId.values()) };
}

function toConnectionPortsForAsset(ports: OemConnectionPortInput[] | undefined): ConnectionPortDef[] | undefined {
  if (!Array.isArray(ports) || ports.length === 0) return undefined;
  return ports.map((port) => ({
    id: port.id,
    type: port.type,
    localPosition: [port.localPosition[0], port.localPosition[1], port.localPosition[2]],
  }));
}

function toRuntimeEntities(index: OemLibraryIndex): OemLibraryLoadResult {
  const modules: ModuleDefinition[] = [];
  const assets: AssetDef[] = [];

  for (const company of index.companies) {
    for (const model of company.models) {
      const glbUrl = resolveOemModelGlbUrl(company, model);
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
        connectionPorts: toConnectionPortsForAsset(model.connectionPorts),
      };
      assets.push(asset);

      const priceLabel = typeof model.priceUsd === 'number' ? ` • $${model.priceUsd.toFixed(2)}` : '';
      modules.push({
        id: assetId,
        name: model.name,
        category: 'oem',
        icon: Package,
        description: `${model.description || `${company.name} OEM model`}${priceLabel}`,
        assetId,
        placementCategory,
        oemCompany: company.name,
        priceUsd: model.priceUsd,
        parameters: {},
      });
    }
  }

  return { companies: index.companies, modules, assets };
}

export function getLocalOemLibraryDraft(): OemLibraryIndex | null {
  try {
    const raw = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (!raw) return null;
    return normalizeLibrary(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveLocalOemLibraryDraft(index: OemLibraryIndex): void {
  localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify(index, null, 2));
  invalidateOemLibraryCache();
}

export function clearLocalOemLibraryDraft(): void {
  localStorage.removeItem(LOCAL_DRAFT_KEY);
  invalidateOemLibraryCache();
}

export function invalidateOemLibraryCache(): void {
  loadPromise = null;
}

export async function fetchGithubOemLibraryIndex(): Promise<OemLibraryIndex> {
  try {
    const res = await fetch(INDEX_URL);
    if (!res.ok) return { companies: [] };
    const data = await res.json();
    return normalizeLibrary(data);
  } catch {
    return { companies: [] };
  }
}

export async function loadOemLibrary(): Promise<OemLibraryLoadResult> {
  if (!loadPromise) {
    loadPromise = (async () => {
      const githubLibrary = await fetchGithubOemLibraryIndex();
      const localDraft = getLocalOemLibraryDraft();
      const merged = mergeLibraries(githubLibrary, localDraft);
      return toRuntimeEntities(merged);
    })();
  }
  return loadPromise;
}

