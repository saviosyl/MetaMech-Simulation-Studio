import { Box } from 'lucide-react';
import { listPublishedAssets } from '../utils/api';
import { AssetMetadata, LibraryAsset, SceneCategory } from '../types';
import { AssetDef, ConnectionPortDef, getAssetManifest, setRuntimeExternalAssets } from './assetManifest';
import { ModuleDefinition, setRuntimeExternalModules } from './moduleLibrary';
import { useEditorStore } from '../store/editorStore';

function toSceneCategory(input: string | null | undefined): SceneCategory {
  const raw = String(input || '').trim().toLowerCase();
  const valid: SceneCategory[] = ['process', 'modular', 'environment', 'actors', 'robots', 'pallets', 'fmcg', 'medical'];
  return (valid.includes(raw as SceneCategory) ? raw : 'process') as SceneCategory;
}

function nodeTypeToPortType(value: string | null | undefined): 'input' | 'output' | null {
  const raw = String(value || '').trim().toLowerCase();
  if (raw.includes('infeed') || raw === 'input' || raw === 'in') return 'input';
  if (raw.includes('outfeed') || raw === 'output' || raw === 'out') return 'output';
  return null;
}

function extractPorts(metadata: AssetMetadata): ConnectionPortDef[] {
  const nodes = Array.isArray(metadata?.nodes) ? metadata.nodes : [];
  const ports: ConnectionPortDef[] = [];
  for (const node of nodes) {
    const portType = nodeTypeToPortType(node?.type);
    if (!portType) continue;
    const p = node?.position;
    if (!Array.isArray(p) || p.length < 3) continue;
    const x = Number(p[0]);
    const y = Number(p[1]);
    const z = Number(p[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    // metadata positions are in mm in authoring UI; runtime expects meters
    ports.push({
      id: String(node.id || `${portType}-${ports.length + 1}`),
      type: portType,
      localPosition: [x / 1000, y / 1000, z / 1000],
    });
  }
  return ports;
}

function inferDefaultScale(metadata: AssetMetadata): [number, number, number] | undefined {
  const declared = metadata?.defaultScale as unknown;
  if (Array.isArray(declared) && declared.length >= 3) {
    const sx = Number(declared[0]);
    const sy = Number(declared[1]);
    const sz = Number(declared[2]);
    if (Number.isFinite(sx) && Number.isFinite(sy) && Number.isFinite(sz) && sx > 0 && sy > 0 && sz > 0) {
      return [sx, sy, sz];
    }
  }
  return undefined;
}

function toStaticAssetDef(asset: LibraryAsset): AssetDef {
  const ports = extractPorts(asset.metadata || {});
  const scale = inferDefaultScale(asset.metadata || {});
  return {
    id: asset.id,
    assetType: 'static',
    category: toSceneCategory(asset.sceneCategory),
    name: asset.name,
    description: asset.description || 'Published library asset',
    glbUrl: asset.modelUrl,
    thumbnailUrl: asset.thumbnailUrl || '',
    defaultScale: scale,
    ...(ports.length > 0 ? { connectionPorts: ports } : {}),
  };
}

function toModuleDef(asset: LibraryAsset): ModuleDefinition {
  return {
    id: asset.id,
    name: asset.name,
    category: toSceneCategory(asset.sceneCategory),
    icon: Box,
    description: asset.description || 'Published library asset',
    assetId: asset.id,
    parameters: {},
  };
}

export async function refreshRuntimePublishedAssets(): Promise<void> {
  const assets = await listPublishedAssets();
  const published = assets.filter((asset) => asset.status === 'published');
  const externalDefs = published.map(toStaticAssetDef);
  const externalModules = published.map(toModuleDef);
  setRuntimeExternalAssets(externalDefs);
  setRuntimeExternalModules(externalModules);
  useEditorStore.setState({ assetManifest: getAssetManifest() });
}

