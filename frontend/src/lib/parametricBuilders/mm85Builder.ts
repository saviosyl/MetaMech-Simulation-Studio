import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

export interface MM85SourceMappingEntry {
  id: string;
  sourceArchive: string;
  sourceAsset: string;
  extractedAsset: string;
  customerName: string;
}

export const MM85_SOURCE_NAME_MAP: MM85SourceMappingEntry[] = [
  {
    id: 'mm85-conveyor-section',
    sourceArchive: 'X85/Beam.vcm',
    sourceAsset: 'flexlink_xbcb_1a85.stl',
    extractedAsset: '/models/mm85/conveyor-beam-straight.stl',
    customerName: 'MM-85 Conveyor Section',
  },
  {
    id: 'mm85-drive-end',
    sourceArchive: 'X85/EndDrive.vcm',
    sourceAsset: 'xbeb_0a85cnrp.stl',
    extractedAsset: '/models/mm85/drive-end-unit.stl',
    customerName: 'MM-85 Drive End',
  },
  {
    id: 'mm85-idler-end',
    sourceArchive: 'X85/Idler.vcm',
    sourceAsset: 'xbej_a85.stl',
    extractedAsset: '/models/mm85/idler-end-unit.stl',
    customerName: 'MM-85 Idler End',
  },
  {
    id: 'mm85-guide-rail',
    sourceArchive: 'Guide Rails/FixedAluminium.vcm + Guide Rails/FixedPlastic.vcm',
    sourceAsset: 'flexlink_xlrb_48x30.stl + flexlink_xlrb_16x42_c_0.stl',
    extractedAsset: '/models/mm85/guide-rail-fixed-aluminium.stl + /models/mm85/guide-rail-fixed-plastic.stl',
    customerName: 'MM-85 Guide Rails',
  },
  {
    id: 'mm85-support-leg',
    sourceArchive: 'Support/SingleSupport.vcm',
    sourceAsset: 'xucs_44_-_5112469_01-1.stl',
    extractedAsset: '/models/mm85/support-leg-single.stl',
    customerName: 'MM-85 Support Leg',
  },
  {
    id: 'mm85-end-drive-support',
    sourceArchive: 'Support/EndDriveSupport.vcm',
    sourceAsset: 'flexlink_5116741.stl',
    extractedAsset: '/models/mm85/support-end-drive.stl',
    customerName: 'MM-85 End Drive Support',
  },
];

type Axis = 'x' | 'y' | 'z';

const SOURCE_FILES = {
  'mm85-conveyor-section': '/models/mm85/conveyor-beam-straight.stl',
  'mm85-drive-end': '/models/mm85/drive-end-unit.stl',
  'mm85-idler-end': '/models/mm85/idler-end-unit.stl',
  'mm85-guide-rail-fixed-aluminium': '/models/mm85/guide-rail-fixed-aluminium.stl',
  'mm85-guide-rail-fixed-plastic': '/models/mm85/guide-rail-fixed-plastic.stl',
  'mm85-support-leg': '/models/mm85/support-leg-single.stl',
  'mm85-end-drive-support': '/models/mm85/support-end-drive.stl',
} as const;

type SourceKey = keyof typeof SOURCE_FILES;
type MM85FlowKey =
  | 'mm85-conveyor-section'
  | 'mm85-drive-end'
  | 'mm85-idler-end'
  | 'mm85-guide-rail-fixed-aluminium'
  | 'mm85-guide-rail-fixed-plastic';

const SOURCE_AXES: Record<SourceKey, { lengthAxis: Axis; widthAxis?: Axis; heightAxis: Axis }> = {
  'mm85-conveyor-section': { lengthAxis: 'x', widthAxis: 'y', heightAxis: 'z' },
  'mm85-drive-end': { lengthAxis: 'x', widthAxis: 'y', heightAxis: 'z' },
  'mm85-idler-end': { lengthAxis: 'x', widthAxis: 'y', heightAxis: 'z' },
  'mm85-guide-rail-fixed-aluminium': { lengthAxis: 'z', widthAxis: 'x', heightAxis: 'y' },
  'mm85-guide-rail-fixed-plastic': { lengthAxis: 'z', widthAxis: 'x', heightAxis: 'y' },
  'mm85-support-leg': { lengthAxis: 'z', widthAxis: 'x', heightAxis: 'y' },
  'mm85-end-drive-support': { lengthAxis: 'z', widthAxis: 'x', heightAxis: 'y' },
};

// Nominal source heights (in source millimeters). These keep MM-85 at realistic
// world scale even if parser quirks produce unusual raw source dimensions.
const FLOW_NOMINAL_HEIGHT_MM: Record<MM85FlowKey, number> = {
  'mm85-conveyor-section': 74,
  'mm85-drive-end': 213.21,
  'mm85-idler-end': 151.856,
  'mm85-guide-rail-fixed-aluminium': 52.5,
  'mm85-guide-rail-fixed-plastic': 35.52,
};

const sourceTemplateCache = new Map<SourceKey, THREE.Group>();
const sourceBoundsCache = new Map<SourceKey, THREE.Box3>();
const sourceLoadPromises = new Map<SourceKey, Promise<void>>();
const sourceLoadFailures = new Set<SourceKey>();
let sourceReadyVersion = 0;

export function getMM85SourceReadyVersion(): number {
  return sourceReadyVersion;
}

function axisIndex(axis: Axis): number {
  return axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
}

function cloneWithMaterials(group: THREE.Group): THREE.Group {
  const clone = group.clone(true);
  clone.traverse((node) => {
    if ((node as THREE.Mesh).isMesh) {
      const mesh = node as THREE.Mesh;
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map((m) => m.clone());
      } else if (mesh.material) {
        mesh.material = (mesh.material as THREE.Material).clone();
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return clone;
}

function triggerSourceLoad(key: SourceKey): void {
  if (sourceTemplateCache.has(key) || sourceLoadPromises.has(key) || sourceLoadFailures.has(key)) return;
  const loadPromise = (async () => {
    // Lazy-load TDS parser so a loader/module issue cannot block the full app shell.
    const { TDSLoader } = await import('three/examples/jsm/loaders/TDSLoader.js');
    const loader = new TDSLoader();
    const loaded = await loader.loadAsync(SOURCE_FILES[key]);
    loaded.traverse((node) => {
      if ((node as THREE.Mesh).isMesh) {
        const mesh = node as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    sourceTemplateCache.set(key, loaded);
    sourceBoundsCache.set(key, new THREE.Box3().setFromObject(loaded));
    sourceReadyVersion += 1;
  })()
    .catch((error) => {
      sourceLoadFailures.add(key);
      // Keep this warn explicit to make source-asset load failures easy to diagnose.
      console.warn(`[MM85] Failed to load source model ${key}:`, error);
    })
    .finally(() => {
      sourceLoadPromises.delete(key);
    });
  sourceLoadPromises.set(key, loadPromise);
}

function getSourceClone(key: SourceKey): { group: THREE.Group; bounds: THREE.Box3 } | null {
  const template = sourceTemplateCache.get(key);
  const bounds = sourceBoundsCache.get(key);
  if (!template || !bounds) {
    triggerSourceLoad(key);
    return null;
  }
  return { group: cloneWithMaterials(template), bounds: bounds.clone() };
}

function createBounds(group: THREE.Group): THREE.Box3 {
  return new THREE.Box3().setFromObject(group);
}

function straightPorts(lengthM: number, elevationM: number): ConnectionPort[] {
  const halfL = Math.max(0.12, lengthM / 2);
  return [
    { id: 'input', type: 'input', localPosition: [-halfL, elevationM, 0] },
    { id: 'output', type: 'output', localPosition: [halfL, elevationM, 0] },
  ];
}

function hasFiniteBounds(bounds: THREE.Box3): boolean {
  return (
    Number.isFinite(bounds.min.x) &&
    Number.isFinite(bounds.min.y) &&
    Number.isFinite(bounds.min.z) &&
    Number.isFinite(bounds.max.x) &&
    Number.isFinite(bounds.max.y) &&
    Number.isFinite(bounds.max.z)
  );
}

function portsFromBoundsCenterline(bounds: THREE.Box3, infeedTopM: number, outfeedTopM: number): ConnectionPort[] {
  if (!hasFiniteBounds(bounds) || bounds.isEmpty()) return [];
  const spanX = Math.max(0.02, bounds.max.x - bounds.min.x);
  const inset = Math.min(0.02, spanX * 0.1);
  const zCenter = (bounds.min.z + bounds.max.z) / 2;
  return [
    { id: 'input', type: 'input', localPosition: [bounds.min.x + inset, infeedTopM, zCenter] },
    { id: 'output', type: 'output', localPosition: [bounds.max.x - inset, outfeedTopM, zCenter] },
  ];
}

function setScaleOnAxis(target: THREE.Vector3, axis: Axis, value: number): void {
  target.setComponent(axisIndex(axis), value);
}

function makeDeferredSourceGroup(): THREE.Group {
  // MM-85 visuals must come from extracted source meshes only.
  // While source assets are still loading, render no placeholder geometry.
  return new THREE.Group();
}

function fitFlowComponentFromSource(
  key: MM85FlowKey,
  source: { group: THREE.Group; bounds: THREE.Box3 },
  options: {
    targetLengthMm: number;
    targetTopStartYMm: number;
    targetTopEndYMm: number;
    targetWidthMm?: number;
    targetHeightMm?: number;
    mirrorZ?: boolean;
  }
): THREE.Group {
  const { group } = source;
  const sourceSize = new THREE.Vector3();
  source.bounds.getSize(sourceSize);
  const axes = SOURCE_AXES[key];

  const scaled = new THREE.Vector3(0.001, 0.001, 0.001);
  const lengthIdx = axisIndex(axes.lengthAxis);
  const rawLength = sourceSize.getComponent(lengthIdx);
  if (rawLength > 0.0001) {
    scaled.setComponent(lengthIdx, scaled.getComponent(lengthIdx) * (options.targetLengthMm / rawLength));
  }
  if (options.targetWidthMm && axes.widthAxis) {
    const widthIdx = axisIndex(axes.widthAxis);
    const rawWidth = sourceSize.getComponent(widthIdx);
    if (rawWidth > 0.0001) {
      const widthScale = 0.001 * (options.targetWidthMm / rawWidth);
      scaled.setComponent(widthIdx, widthScale);
    }
  }
  if (options.targetHeightMm) {
    const heightIdx = axisIndex(axes.heightAxis);
    const rawHeight = sourceSize.getComponent(heightIdx);
    if (rawHeight > 0.0001) {
      const heightScale = 0.001 * (options.targetHeightMm / rawHeight);
      scaled.setComponent(heightIdx, heightScale);
    }
  }
  group.scale.copy(scaled);
  if (options.mirrorZ) group.scale.z *= -1;

  let fittedBounds = new THREE.Box3().setFromObject(group);
  if (hasFiniteBounds(fittedBounds) && !fittedBounds.isEmpty()) {
    const size = new THREE.Vector3();
    fittedBounds.getSize(size);
    const maxDim = Math.max(size.x, size.y, size.z);
    // Guard against parser-induced runaway dimensions that break editor zoom.
    if (maxDim > 8) {
      const correction = 8 / maxDim;
      group.scale.multiplyScalar(correction);
      fittedBounds = new THREE.Box3().setFromObject(group);
    }
  }
  const center = new THREE.Vector3();
  fittedBounds.getCenter(center);
  const targetTopY = ((options.targetTopStartYMm + options.targetTopEndYMm) * 0.5) / 1000;
  const yShift = targetTopY - fittedBounds.max.y;
  group.position.set(-center.x, yShift, -center.z);

  return group;
}

function fitGroundedComponentFromSource(
  key: SourceKey,
  source: { group: THREE.Group; bounds: THREE.Box3 },
  options?: { targetHeightMm?: number }
): THREE.Group {
  const { group } = source;
  const sourceSize = new THREE.Vector3();
  source.bounds.getSize(sourceSize);
  const axes = SOURCE_AXES[key];

  const scaled = new THREE.Vector3(0.001, 0.001, 0.001);
  if (options?.targetHeightMm) {
    const hIdx = axisIndex(axes.heightAxis);
    const rawH = sourceSize.getComponent(hIdx);
    if (rawH > 0.0001) {
      scaled.setComponent(hIdx, scaled.getComponent(hIdx) * (options.targetHeightMm / rawH));
    }
  }
  group.scale.copy(scaled);

  const fittedBounds = new THREE.Box3().setFromObject(group);
  const center = new THREE.Vector3();
  fittedBounds.getCenter(center);
  group.position.set(-center.x, -fittedBounds.min.y, -center.z);

  return group;
}

export function buildMM85ConveyorSection(params: Record<string, any>): BuilderResult {
  const lengthMm = Math.max(350, Number(params.sectionLength ?? params.length ?? 1000));
  const lengthM = lengthMm / 1000;
  const chainWidthMm = Math.max(60, Number(params.chainWidth ?? 85));
  const infeedTopMm = Math.max(250, Number(params.infeedHeight ?? params.elevation ?? params.height ?? 850));
  const outfeedTopMm = Math.max(250, Number(params.outfeedHeight ?? infeedTopMm));

  const source = getSourceClone('mm85-conveyor-section');
  const group = source
    ? fitFlowComponentFromSource('mm85-conveyor-section', source, {
        targetLengthMm: lengthMm,
        targetTopStartYMm: infeedTopMm,
        targetTopEndYMm: outfeedTopMm,
        targetWidthMm: chainWidthMm,
        targetHeightMm: FLOW_NOMINAL_HEIGHT_MM['mm85-conveyor-section'],
      })
    : makeDeferredSourceGroup();
  const bounds = createBounds(group);
  const ports = portsFromBoundsCenterline(bounds, infeedTopMm / 1000, outfeedTopMm / 1000);
  const resolvedPorts = ports.length > 0 ? ports : straightPorts(lengthM, infeedTopMm / 1000);
  const pathLength = Math.abs(resolvedPorts[1].localPosition[0] - resolvedPorts[0].localPosition[0]);

  return {
    group,
    ports: resolvedPorts,
    bounds,
    pathLength: Math.max(0.05, pathLength),
  };
}

export function buildMM85DriveEnd(params: Record<string, any>): BuilderResult {
  const moduleLengthMm = Math.max(280, Number(params.moduleLength ?? 450));
  const moduleLengthM = moduleLengthMm / 1000;
  const chainWidthMm = Math.max(60, Number(params.chainWidth ?? 85));
  const infeedTopMm = Math.max(250, Number(params.infeedHeight ?? params.elevation ?? params.height ?? 850));
  const outfeedTopMm = Math.max(250, Number(params.outfeedHeight ?? infeedTopMm));
  const motorSide = String(params.motorSide ?? 'Right');
  const source = getSourceClone('mm85-drive-end');
  const group = source
    ? fitFlowComponentFromSource('mm85-drive-end', source, {
        targetLengthMm: moduleLengthMm,
        targetTopStartYMm: infeedTopMm,
        targetTopEndYMm: outfeedTopMm,
        targetWidthMm: chainWidthMm,
        targetHeightMm: FLOW_NOMINAL_HEIGHT_MM['mm85-drive-end'],
        mirrorZ: motorSide.toLowerCase() === 'left',
      })
    : makeDeferredSourceGroup();
  const bounds = createBounds(group);
  const ports = portsFromBoundsCenterline(bounds, infeedTopMm / 1000, outfeedTopMm / 1000);
  const resolvedPorts = ports.length > 0 ? ports : straightPorts(moduleLengthM, infeedTopMm / 1000);
  const pathLength = Math.abs(resolvedPorts[1].localPosition[0] - resolvedPorts[0].localPosition[0]);

  return {
    group,
    ports: resolvedPorts,
    bounds,
    pathLength: Math.max(0.05, pathLength),
  };
}

export function buildMM85IdlerEnd(params: Record<string, any>): BuilderResult {
  const moduleLengthMm = Math.max(260, Number(params.moduleLength ?? 420));
  const moduleLengthM = moduleLengthMm / 1000;
  const chainWidthMm = Math.max(60, Number(params.chainWidth ?? 85));
  const infeedTopMm = Math.max(250, Number(params.infeedHeight ?? params.elevation ?? params.height ?? 850));
  const outfeedTopMm = Math.max(250, Number(params.outfeedHeight ?? infeedTopMm));

  const source = getSourceClone('mm85-idler-end');
  const group = source
    ? fitFlowComponentFromSource('mm85-idler-end', source, {
        targetLengthMm: moduleLengthMm,
        targetTopStartYMm: infeedTopMm,
        targetTopEndYMm: outfeedTopMm,
        targetWidthMm: chainWidthMm,
        targetHeightMm: FLOW_NOMINAL_HEIGHT_MM['mm85-idler-end'],
      })
    : makeDeferredSourceGroup();
  const bounds = createBounds(group);
  const ports = portsFromBoundsCenterline(bounds, infeedTopMm / 1000, outfeedTopMm / 1000);
  const resolvedPorts = ports.length > 0 ? ports : straightPorts(moduleLengthM, infeedTopMm / 1000);
  const pathLength = Math.abs(resolvedPorts[1].localPosition[0] - resolvedPorts[0].localPosition[0]);

  return {
    group,
    ports: resolvedPorts,
    bounds,
    pathLength: Math.max(0.05, pathLength),
  };
}

export function buildMM85GuideRail(params: Record<string, any>): BuilderResult {
  const railLengthMm = Math.max(300, Number(params.railLength ?? 1000));
  const railLengthM = railLengthMm / 1000;
  const railSpacingMm = Math.max(80, Number(params.railSpacing ?? 130));
  const railHeightMm = Math.max(15, Number(params.railHeight ?? 35));
  const topMm = Math.max(200, Number(params.elevation ?? 900)) + railHeightMm;
  const railType = String(params.railType ?? 'Fixed Aluminium');
  const key: SourceKey = railType.toLowerCase().includes('plastic')
    ? 'mm85-guide-rail-fixed-plastic'
    : 'mm85-guide-rail-fixed-aluminium';
  const source = getSourceClone(key);
  const group = source
    ? fitFlowComponentFromSource(key, source, {
        targetLengthMm: railLengthMm,
        targetTopStartYMm: topMm,
        targetTopEndYMm: topMm,
        targetWidthMm: railSpacingMm,
        targetHeightMm: FLOW_NOMINAL_HEIGHT_MM[key],
      })
    : makeDeferredSourceGroup();

  return {
    group,
    ports: straightPorts(railLengthM, topMm / 1000),
    bounds: createBounds(group),
    pathLength: railLengthM,
  };
}

export function buildMM85SupportLeg(params: Record<string, any>): BuilderResult {
  const supportHeightMm = Math.max(350, Number(params.supportHeight ?? 850));
  const source = getSourceClone('mm85-support-leg');
  const group = source
    ? fitGroundedComponentFromSource('mm85-support-leg', source, { targetHeightMm: supportHeightMm })
    : makeDeferredSourceGroup();

  return {
    group,
    ports: [],
    bounds: createBounds(group),
    pathLength: 0,
  };
}

export function buildMM85EndDriveSupport(params: Record<string, any>): BuilderResult {
  const supportHeightMm = Math.max(350, Number(params.supportHeight ?? 850));
  const source = getSourceClone('mm85-end-drive-support');
  const group = source
    ? fitGroundedComponentFromSource('mm85-end-drive-support', source, { targetHeightMm: supportHeightMm })
    : makeDeferredSourceGroup();

  return {
    group,
    ports: [],
    bounds: createBounds(group),
    pathLength: 0,
  };
}
