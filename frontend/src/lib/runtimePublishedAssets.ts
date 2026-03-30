import { Box } from 'lucide-react';
import { listPublishedAssets } from '../utils/api';
import { AssetMetadata, LibraryAsset, SceneCategory } from '../types';
import { AssetDef, ConnectionPortDef, getAssetManifest, setRuntimeExternalAssets } from './assetManifest';
import { ModuleDefinition, setRuntimeExternalModules } from './moduleLibrary';
import { useEditorStore } from '../store/editorStore';

type SourceUnit = 'mm' | 'cm' | 'm' | 'unknown';

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
  const candidatePorts: Array<{
    id: string;
    type: 'input' | 'output';
    localPosition: [number, number, number];
    direction?: [number, number, number];
  }> = [];
  for (const node of nodes) {
    const portType = nodeTypeToPortType(node?.type);
    if (!portType) continue;
    const p = node?.position;
    if (!Array.isArray(p) || p.length < 3) continue;
    const x = Number(p[0]);
    const y = Number(p[1]);
    const z = Number(p[2]);
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) continue;
    const d = node?.direction;
    let direction: [number, number, number] | undefined;
    if (Array.isArray(d) && d.length >= 3) {
      const dx = Number(d[0]);
      const dy = Number(d[1]);
      const dz = Number(d[2]);
      if (Number.isFinite(dx) && Number.isFinite(dy) && Number.isFinite(dz)) {
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len > 0.000001) {
          direction = [dx / len, dy / len, dz / len];
        }
      }
    }
    // metadata positions are in mm in authoring UI; runtime expects meters
    candidatePorts.push({
      id: String(node.id || `${portType}-${candidatePorts.length + 1}`),
      type: portType,
      localPosition: [x / 1000, y / 1000, z / 1000],
      ...(direction ? { direction } : {}),
    });
  }

  const firstInput = candidatePorts.find((p) => p.type === 'input');
  const firstOutput = candidatePorts.find((p) => p.type === 'output');
  const behaviorTemplate = String(metadata?.behaviorTemplate || '').trim();
  const isConveyorLikeTemplate = behaviorTemplate === 'straight-conveyor' || behaviorTemplate === 'lift-conveyor';

  let derivedFlowDir: [number, number, number] | null = null;
  if (firstInput && firstOutput) {
    const dx = firstOutput.localPosition[0] - firstInput.localPosition[0];
    const dy = firstOutput.localPosition[1] - firstInput.localPosition[1];
    const dz = firstOutput.localPosition[2] - firstInput.localPosition[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (len > 0.000001) {
      derivedFlowDir = [dx / len, dy / len, dz / len];
    }
  }

  for (const candidate of candidatePorts) {
    // Admin-authored conveyor-like assets should mate inline by default.
    // Derive input/output facing from infeed->outfeed vector for consistency
    // with built-in conveyor port conventions.
    const inlineDirection = (
      isConveyorLikeTemplate && derivedFlowDir
        ? (
          candidate.type === 'input'
            ? ([-derivedFlowDir[0], -derivedFlowDir[1], -derivedFlowDir[2]] as [number, number, number])
            : derivedFlowDir
        )
        : null
    );
    ports.push({
      id: candidate.id,
      type: candidate.type,
      localPosition: candidate.localPosition,
      ...((inlineDirection || candidate.direction) ? { direction: (inlineDirection || candidate.direction) as [number, number, number] } : {}),
    });
  }
  return ports;
}

function sourceUnitFactorToMeters(sourceUnit: SourceUnit): number {
  if (sourceUnit === 'mm') return 0.001;
  if (sourceUnit === 'cm') return 0.01;
  if (sourceUnit === 'm') return 1;
  return 1;
}

function inferDefaultScale(metadata: AssetMetadata): [number, number, number] | undefined {
  const sourceUnitRaw = metadata?.sourceUnit as unknown;
  const sourceUnit: SourceUnit = sourceUnitRaw === 'mm' || sourceUnitRaw === 'cm' || sourceUnitRaw === 'm' || sourceUnitRaw === 'unknown'
    ? sourceUnitRaw
    : 'unknown';
  const sourceUnitScale = sourceUnitFactorToMeters(sourceUnit);
  const scaleCorrectionRaw = metadata?.scaleCorrection as unknown;
  const parsedCorrection = Number(scaleCorrectionRaw);
  const hasScaleCorrection = Number.isFinite(parsedCorrection) && parsedCorrection > 0;
  // Authoring metadata native bounds are generated from raw GLB units.
  // If source unit is unknown, keep raw units by using a neutral unit factor.
  const effectiveUnitScale = sourceUnit === 'unknown' ? 1 : sourceUnitScale;
  if (hasScaleCorrection || sourceUnit !== 'unknown') {
    const correction = hasScaleCorrection ? parsedCorrection : 1;
    const worldScale = effectiveUnitScale * correction;
    if (worldScale > 0) return [worldScale, worldScale, worldScale];
  }
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

function inferGroundAlignmentOffset(metadata: AssetMetadata, worldScale: number): [number, number, number] | undefined {
  const bounds = metadata?.nativeBounds as unknown;
  if (!bounds || typeof bounds !== 'object') return undefined;
  const min = (bounds as { min?: unknown }).min;
  const max = (bounds as { max?: unknown }).max;
  if (!Array.isArray(min) || min.length < 3 || !Array.isArray(max) || max.length < 3) return undefined;
  const minX = Number(min[0]);
  const minY = Number(min[1]);
  const minZ = Number(min[2]);
  const maxX = Number(max[0]);
  const maxZ = Number(max[2]);
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(minZ) || !Number.isFinite(maxX) || !Number.isFinite(maxZ)) {
    return undefined;
  }
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  // Match editor preview normalization: center X/Z and lift base to y=0.
  return [-centerX * worldScale, -minY * worldScale, -centerZ * worldScale];
}

function inferPivotOffset(metadata: AssetMetadata): [number, number, number] | undefined {
  const pivotOffset = metadata?.pivotOffset as unknown;
  if (!Array.isArray(pivotOffset) || pivotOffset.length < 3) return undefined;
  const x = Number(pivotOffset[0]);
  const y = Number(pivotOffset[1]);
  const z = Number(pivotOffset[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return undefined;
  // metadata stores pivot offset in mm; runtime scene coordinates are meters
  return [x / 1000, y / 1000, z / 1000];
}

function inferDefaultPositionOffset(
  metadata: AssetMetadata,
  defaultScale: [number, number, number] | undefined
): [number, number, number] | undefined {
  const worldScale = defaultScale && Number.isFinite(defaultScale[0]) && defaultScale[0] > 0
    ? defaultScale[0]
    : 1;
  const groundAlignment = inferGroundAlignmentOffset(metadata, worldScale);
  const pivotOffset = inferPivotOffset(metadata);
  if (!groundAlignment && !pivotOffset) return undefined;
  return [
    (groundAlignment?.[0] || 0) + (pivotOffset?.[0] || 0),
    (groundAlignment?.[1] || 0) + (pivotOffset?.[1] || 0),
    (groundAlignment?.[2] || 0) + (pivotOffset?.[2] || 0),
  ];
}

function inferDefaultRotation(metadata: AssetMetadata): [number, number, number] | undefined {
  const raw = metadata?.assetRootRotationDeg as unknown;
  if (!Array.isArray(raw) || raw.length < 3) return undefined;
  const xDeg = Number(raw[0]);
  const yDeg = Number(raw[1]);
  const zDeg = Number(raw[2]);
  if (!Number.isFinite(xDeg) || !Number.isFinite(yDeg) || !Number.isFinite(zDeg)) return undefined;
  return [
    (xDeg * Math.PI) / 180,
    (yDeg * Math.PI) / 180,
    (zDeg * Math.PI) / 180,
  ];
}

function toStaticAssetDef(asset: LibraryAsset): AssetDef {
  const metadata = asset.metadata || {};
  const ports = extractPorts(metadata);
  const scale = inferDefaultScale(metadata);
  const defaultPositionOffset = inferDefaultPositionOffset(metadata, scale);
  const defaultRotation = inferDefaultRotation(metadata);
  return {
    id: asset.id,
    assetType: 'static',
    category: toSceneCategory(asset.sceneCategory),
    name: asset.name,
    description: asset.description || 'Published library asset',
    glbUrl: asset.modelUrl,
    thumbnailUrl: asset.thumbnailUrl || '',
    metadata,
    defaultScale: scale,
    defaultPositionOffset,
    defaultRotation,
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

