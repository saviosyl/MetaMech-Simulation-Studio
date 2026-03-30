import React, { Suspense } from 'react';
import * as THREE from 'three';
import { StaticAssetDef } from '../../lib/assetManifest';
import { useDracoGLTF } from '../../lib/gltfLoaders';
import { useEditorStore } from '../../store/editorStore';

interface StaticModelProps {
  assetDef: StaticAssetDef;
  isSelected: boolean;
  onClick: () => void;
}

const GLBModel: React.FC<{
  url: string;
  defaultScale?: [number, number, number];
  defaultPositionOffset?: [number, number, number];
}> = ({ url, defaultScale, defaultPositionOffset }) => {
  const { scene } = useDracoGLTF(url);
  const cloned = React.useMemo(() => {
    const c = scene.clone(true);
    if (defaultScale) c.scale.set(...defaultScale);
    if (defaultPositionOffset) c.position.set(...defaultPositionOffset);
    return c;
  }, [scene, defaultScale, defaultPositionOffset]);

  return <primitive object={cloned} />;
};

const FallbackBox: React.FC = () => (
  <mesh castShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
  </mesh>
);

function asVec3Mm(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length < 3) return null;
  const x = Number(value[0]);
  const y = Number(value[1]);
  const z = Number(value[2]);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
  return [x, y, z];
}

function nodeBindingKeyFromPositionMm(posMm: [number, number, number]): string {
  return `${(posMm[0] / 1000).toFixed(6)}|${(posMm[1] / 1000).toFixed(6)}|${(posMm[2] / 1000).toFixed(6)}`;
}

function applyLiftV1MovingPartToModel(
  root: THREE.Object3D,
  metadata: StaticAssetDef['metadata'],
  runtimeParams: Record<string, unknown> | undefined
): void {
  if (!metadata || !runtimeParams) return;
  const behaviorTemplate = String((runtimeParams.behaviorTemplate ?? metadata.behaviorTemplate) || '');
  if (behaviorTemplate !== 'lift-conveyor') return;

  const rawBehavior = (runtimeParams.behaviorConfig && typeof runtimeParams.behaviorConfig === 'object')
    ? (runtimeParams.behaviorConfig as Record<string, unknown>)
    : (metadata.behaviorConfig && typeof metadata.behaviorConfig === 'object'
      ? metadata.behaviorConfig as Record<string, unknown>
      : {});

  const movingPartId = String(rawBehavior.movingPartId || '').trim();
  const liftAxis = String(rawBehavior.liftAxis || '').toLowerCase();
  if (!movingPartId || liftAxis !== 'z') return;

  const toFinite = (value: unknown, fallback: number): number => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  };

  const minMm = toFinite(rawBehavior.liftMinMm, 0);
  const maxMm = toFinite(rawBehavior.liftMaxMm, Math.max(1, minMm + 1));
  const defaultMm = toFinite(rawBehavior.liftDefaultMm, minMm);
  const requestedTarget = Number(runtimeParams.liftTargetMm ?? runtimeParams.targetHeightMm);
  const targetMm = Number.isFinite(requestedTarget) ? requestedTarget : defaultMm;
  const clampedTargetMm = Math.min(maxMm, Math.max(minMm, targetMm));
  const liftOffsetM = (clampedTargetMm - minMm) / 1000;
  if (Math.abs(liftOffsetM) <= 0.000001) return;

  const parts = Array.isArray(runtimeParams.movableParts)
    ? runtimeParams.movableParts as Array<Record<string, unknown>>
    : (Array.isArray(metadata.movableParts)
      ? metadata.movableParts as Array<Record<string, unknown>>
      : []);
  const movingPart = parts.find((part) => String(part.id || '') === movingPartId) || null;
  if (!movingPart) return;

  const objectPath = String(movingPart.objectName || '').trim();
  if (!objectPath) return;

  const segments = objectPath.split('/').map((p) => p.trim()).filter(Boolean);
  let cursor: THREE.Object3D | null = root;
  let idx = 0;
  if (segments[0] && segments[0] === (root.name || '(unnamed Scene)')) idx = 1;
  for (; idx < segments.length; idx += 1) {
    const seg = segments[idx];
    if (!cursor) break;
    cursor = cursor.children.find((child) => (child.name || '').trim() === seg) || null;
  }
  if (!cursor) return;

  cursor.position.z += liftOffsetM;
}

const StaticModel: React.FC<StaticModelProps> = ({ assetDef, isSelected, onClick }) => {
  const processNodes = useEditorStore((s) => s.processNodes);
  const selectedObjectId = useEditorStore((s) => s.selectedObjectId);
  const selectedObjectType = useEditorStore((s) => s.selectedObjectType);
  const runtimeNodeParams = React.useMemo(() => {
    if (selectedObjectType !== 'process' || !selectedObjectId) return null;
    const selectedNode = processNodes.find((n) => n.id === selectedObjectId);
    if (!selectedNode || selectedNode.assetId !== assetDef.id) return null;
    return selectedNode.parameters as Record<string, unknown>;
  }, [processNodes, selectedObjectId, selectedObjectType, assetDef.id]);

  return (
    <group
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <Suspense fallback={<FallbackBox />}>
        <GLBModelWithLift
          url={assetDef.glbUrl}
          defaultScale={assetDef.defaultScale}
          defaultPositionOffset={assetDef.defaultPositionOffset}
          metadata={assetDef.metadata}
          runtimeParams={runtimeNodeParams || undefined}
        />
      </Suspense>
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

const GLBModelWithLift: React.FC<{
  url: string;
  defaultScale?: [number, number, number];
  defaultPositionOffset?: [number, number, number];
  metadata?: StaticAssetDef['metadata'];
  runtimeParams?: Record<string, unknown>;
}> = ({ url, defaultScale, defaultPositionOffset, metadata, runtimeParams }) => {
  const { scene } = useDracoGLTF(url);
  const cloned = React.useMemo(() => {
    const c = scene.clone(true);
    if (defaultScale) c.scale.set(...defaultScale);
    if (defaultPositionOffset) c.position.set(...defaultPositionOffset);
    applyLiftV1MovingPartToModel(c, metadata, runtimeParams);
    return c;
  }, [scene, defaultScale, defaultPositionOffset, metadata, runtimeParams]);
  return <primitive object={cloned} />;
};

export default StaticModel;
