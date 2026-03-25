import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Shield, Trash2, Upload, User } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, OrbitControls, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAuth } from '../contexts/AuthContext';
import {
  listLibraryAssets,
  publishLibraryAsset,
  updateLibraryAsset,
  uploadAssetThumbnail,
  uploadLibraryAsset,
} from '../utils/api';
import { AssetDefinitionNode, AssetMetadata, AssetMovingPart, LibraryAsset } from '../types';
import { simulationUrls } from '../content/simulationMarketingContent';
import { refreshRuntimePublishedAssets } from '../lib/runtimePublishedAssets';

type ModelHierarchyItem = {
  id: string;
  name: string;
  path: string;
  depth: number;
  isMesh: boolean;
  childCount: number;
};

type ObjectTreeNode = {
  id: string;
  name: string;
  path: string;
  isMesh: boolean;
  children: ObjectTreeNode[];
};

function errorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || fallback;
}

function safeAssetMetadata(asset: LibraryAsset | null): AssetMetadata {
  if (!asset) return {};
  return (asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}) as AssetMetadata;
}

function mmToM(value: number): number {
  return value / 1000;
}

function mToMm(value: number): number {
  return value * 1000;
}

function applyMotionPreview(
  targetRoot: THREE.Object3D,
  part: AssetMovingPart | null,
  previewT: number
): void {
  if (!part) return;
  const v = part.min + (part.max - part.min) * previewT;
  const candidate = targetRoot.getObjectByName(part.objectName) || targetRoot;
  if (part.motionType === 'translate') {
    const delta = mmToM(v - part.default);
    if (part.axis === 'x') candidate.position.x += delta;
    if (part.axis === 'y') candidate.position.y += delta;
    if (part.axis === 'z') candidate.position.z += delta;
  } else {
    const delta = ((v - part.default) * Math.PI) / 180;
    if (part.axis === 'x') candidate.rotation.x += delta;
    if (part.axis === 'y') candidate.rotation.y += delta;
    if (part.axis === 'z') candidate.rotation.z += delta;
  }
}

function buildObjectTree(items: ModelHierarchyItem[]): ObjectTreeNode[] {
  const roots: ObjectTreeNode[] = [];
  const byPath = new Map<string, ObjectTreeNode>();
  for (const item of items) {
    const node: ObjectTreeNode = {
      id: item.id,
      name: item.name,
      path: item.path,
      isMesh: item.isMesh,
      children: [],
    };
    byPath.set(item.path, node);
    const splitIdx = item.path.lastIndexOf('/');
    if (splitIdx <= 0) {
      roots.push(node);
      continue;
    }
    const parentPath = item.path.slice(0, splitIdx);
    const parent = byPath.get(parentPath);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  return roots;
}

const ModelPreview: React.FC<{
  modelUrl: string | null;
  nodes: AssetDefinitionNode[];
  selectedNodeIndex: number;
  onSelectNode: (index: number) => void;
  onPlaceNodeAtMm: (positionMm: [number, number, number]) => void;
  onMoveNodeToMm: (index: number, positionMm: [number, number, number]) => void;
  setHierarchyItems: (items: ModelHierarchyItem[]) => void;
  highlightedObjectNames: string[];
  setHighlightedObjectNames: (names: string[]) => void;
  movingParts: AssetMovingPart[];
  previewPartIndex: number;
  previewT: number;
}> = ({
  modelUrl,
  nodes,
  selectedNodeIndex,
  onSelectNode,
  onPlaceNodeAtMm,
  onMoveNodeToMm,
  setHierarchyItems,
  highlightedObjectNames,
  setHighlightedObjectNames,
  movingParts,
  previewPartIndex,
  previewT,
}) => {
  const [loadedRoot, setLoadedRoot] = useState<THREE.Object3D | null>(null);
  const [loadError, setLoadError] = useState<string>('');
  const previewGroupRef = useRef<THREE.Group | null>(null);
  const modelBoundsRef = useRef<THREE.Box3 | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!modelUrl) {
      setLoadedRoot(null);
      setHierarchyItems([]);
      setLoadError('');
      return () => {
        cancelled = true;
      };
    }

    const loader = new GLTFLoader();
    (async () => {
      try {
        // Use explicit credentialed fetch so admin-only model endpoints include auth cookies.
        const response = await fetch(modelUrl, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`fetch for ${modelUrl} responded with ${response.status}`);
        }
        const modelBytes = await response.arrayBuffer();
        loader.parse(
          modelBytes,
          modelUrl,
          (gltf) => {
            if (cancelled) return;
            setLoadedRoot(gltf.scene);
            const hierarchy: ModelHierarchyItem[] = [];
            function walk(node: THREE.Object3D, parentPath: string, depth: number): void {
              const rawName = (node.name || '').trim();
              const fallbackName = node.type ? `(unnamed ${node.type})` : '(unnamed)';
              const displayName = rawName || fallbackName;
              const path = parentPath ? `${parentPath}/${displayName}` : displayName;
              hierarchy.push({
                id: `${path}#${hierarchy.length}`,
                name: displayName,
                path,
                depth,
                isMesh: !!(node as THREE.Mesh).isMesh,
                childCount: node.children.length,
              });
              for (const child of node.children) {
                walk(child, path, depth + 1);
              }
            }
            walk(gltf.scene, '', 0);
            setHierarchyItems(hierarchy);
            setLoadError('');
          },
          (err) => {
            if (!cancelled) {
              setLoadedRoot(null);
              setHierarchyItems([]);
              setLoadError(err?.message || 'Model could not be loaded');
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          const e = err as { message?: string };
          setLoadedRoot(null);
          setHierarchyItems([]);
          setLoadError(e?.message || 'Model could not be loaded');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modelUrl, setHierarchyItems]);

  const previewRoot = useMemo(() => {
    if (!loadedRoot) return null;
    const clone = loadedRoot.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.set(-center.x, -box.min.y, -center.z);
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const s = 2.4 / maxDim;
      clone.scale.setScalar(s);
      clone.position.multiplyScalar(s);
    }
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
        const matList = Array.isArray(material) ? material : (material ? [material] : []);
        const shouldHighlight = highlightedObjectNames.includes(mesh.name);
        for (const mat of matList) {
          if (!mat) continue;
          mat.emissive = new THREE.Color(shouldHighlight ? '#1dd5ff' : '#000000');
          mat.emissiveIntensity = shouldHighlight ? 0.45 : 0;
          mat.needsUpdate = true;
        }
      }
    });
    const part = movingParts[previewPartIndex] || null;
    applyMotionPreview(clone, part, previewT);
    modelBoundsRef.current = new THREE.Box3().setFromObject(clone);
    return clone;
  }, [loadedRoot, movingParts, previewPartIndex, previewT, highlightedObjectNames]);

  function getPlaneIntersection(event: THREE.Event): THREE.Vector3 | null {
    const e = event as THREE.Event & { point?: THREE.Vector3 };
    if (e.point && Number.isFinite(e.point.x) && Number.isFinite(e.point.y) && Number.isFinite(e.point.z)) {
      return e.point.clone();
    }
    return null;
  }

  function snapPosition(positionM: THREE.Vector3): [number, number, number] {
    const snapStepM = 0.05;
    let sx = Math.round(positionM.x / snapStepM) * snapStepM;
    let sy = Math.max(0, Math.round(positionM.y / snapStepM) * snapStepM);
    let sz = Math.round(positionM.z / snapStepM) * snapStepM;
    const bounds = modelBoundsRef.current;
    const selected = nodes[selectedNodeIndex];
    const type = String(selected?.type || '').toLowerCase();
    if (bounds && (type.includes('infeed') || type.includes('outfeed'))) {
      const spanX = bounds.max.x - bounds.min.x;
      const spanZ = bounds.max.z - bounds.min.z;
      const primaryAxis = spanX >= spanZ ? 'x' : 'z';
      const preferMin = type.includes('infeed');
      if (primaryAxis === 'x') {
        sx = preferMin ? bounds.min.x : bounds.max.x;
        sy = THREE.MathUtils.clamp(sy, bounds.min.y, bounds.max.y);
        sz = THREE.MathUtils.clamp(sz, bounds.min.z, bounds.max.z);
      } else {
        sz = preferMin ? bounds.min.z : bounds.max.z;
        sy = THREE.MathUtils.clamp(sy, bounds.min.y, bounds.max.y);
        sx = THREE.MathUtils.clamp(sx, bounds.min.x, bounds.max.x);
      }
    }
    return [mToMm(sx), mToMm(sy), mToMm(sz)];
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Canvas shadows camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
      <ambientLight intensity={0.65} />
      <directionalLight castShadow position={[3, 5, 2]} intensity={1.1} />
      <Grid args={[10, 10]} cellColor="#6b7280" sectionColor="#334155" fadeDistance={18} fadeStrength={1.2} />
      {previewRoot ? (
        <group
          ref={previewGroupRef}
          onPointerDown={(event) => {
            const hoveredName = (event.object as THREE.Object3D | undefined)?.name;
            if (hoveredName) setHighlightedObjectNames([hoveredName]);
          }}
          onClick={(event) => {
            const point = getPlaneIntersection(event);
            if (!point) return;
            onPlaceNodeAtMm(snapPosition(point));
          }}
          onPointerMissed={() => {
            setHighlightedObjectNames([]);
          }}
        >
          <primitive object={previewRoot} />
        </group>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.8, 0.8]} />
          <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.55} />
        </mesh>
      )}
      {nodes.map((node, index) => {
        const p = node.position || [0, 0, 0];
        const selected = selectedNodeIndex === index;
        const nodePosition: [number, number, number] = [mmToM(Number(p[0]) || 0), mmToM(Number(p[1]) || 0), mmToM(Number(p[2]) || 0)];
        if (selected) {
          return (
            <TransformControls
              key={`${node.id || 'node'}-${index}`}
              mode="translate"
              size={0.7}
              onObjectChange={(event) => {
                const target = event.target as { object?: THREE.Object3D };
                if (!target.object) return;
                onMoveNodeToMm(index, snapPosition(target.object.position.clone()));
              }}
            >
              <mesh
                position={nodePosition}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(index);
                }}
              >
                <sphereGeometry args={[0.07, 14, 12]} />
                <meshStandardMaterial color="#f59e0b" />
              </mesh>
            </TransformControls>
          );
        }
        return (
          <mesh
            key={`${node.id || 'node'}-${index}`}
            position={nodePosition}
            onClick={(event) => {
              event.stopPropagation();
              onSelectNode(index);
            }}
          >
            <sphereGeometry args={[0.05, 14, 12]} />
            <meshStandardMaterial color={String(node.type || '').toLowerCase().includes('in') ? '#34d399' : '#22d3ee'} />
          </mesh>
        );
      })}
      <Environment preset="city" />
      <OrbitControls makeDefault />
      </Canvas>
      {loadError && (
        <div style={{ position: 'absolute', left: 12, right: 12, top: 12, border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 35%, transparent)', borderRadius: 8, background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', fontSize: 12, padding: '8px 10px' }}>
          GLB preview failed: {loadError}
        </div>
      )}
      {!modelUrl && (
        <div style={{ position: 'absolute', left: 12, right: 12, top: 12, border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', color: 'var(--mm-text-secondary)', fontSize: 12, padding: '8px 10px' }}>
          Upload a GLB to preview and author nodes/moving parts.
        </div>
      )}
    </div>
  );
};

const AdminAssetEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId?: string }>();
  const { user, logout } = useAuth();
  const modelFileRef = useRef<HTMLInputElement | null>(null);
  const thumbFileRef = useRef<HTMLInputElement | null>(null);

  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [asset, setAsset] = useState<LibraryAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [nodes, setNodes] = useState<AssetDefinitionNode[]>([]);
  const [movableParts, setMovableParts] = useState<AssetMovingPart[]>([]);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(-1);
  const [previewPartIndex, setPreviewPartIndex] = useState<number>(-1);
  const [previewT, setPreviewT] = useState<number>(0.5);
  const [hierarchyItems, setHierarchyItems] = useState<ModelHierarchyItem[]>([]);
  const [objectFilter, setObjectFilter] = useState('');
  const [selectedObjectPath, setSelectedObjectPath] = useState('');
  const [highlightedObjectNames, setHighlightedObjectNames] = useState<string[]>([]);

  const metadata = useMemo<AssetMetadata>(() => {
    return {
      ...safeAssetMetadata(asset),
      nodes,
      movableParts,
    };
  }, [asset, nodes, movableParts]);

  const validation = useMemo(() => {
    const problems: string[] = [];
    if (!asset) problems.push('No asset selected');
    if (!asset?.modelUrl) problems.push('Model file missing');
    if (!selectedCategoryId) problems.push('Category not selected');
    const ids = new Set<string>();
    for (const node of nodes) {
      const id = String(node.id || '').trim();
      if (!id) problems.push('Node without id');
      if (id && ids.has(id)) problems.push(`Duplicate node id: ${id}`);
      if (id) ids.add(id);
    }
    return problems;
  }, [asset, selectedCategoryId, nodes]);

  function hydrateFromAsset(next: LibraryAsset | null): void {
    setAsset(next);
    setName(next?.name || '');
    setDescription(next?.description || '');
    setTagsText((next?.tags || []).join(', '));
    const m = safeAssetMetadata(next);
    setNodes(Array.isArray(m.nodes) ? (m.nodes as AssetDefinitionNode[]) : []);
    setMovableParts(Array.isArray(m.movableParts) ? (m.movableParts as AssetMovingPart[]) : []);
    setSelectedNodeIndex(-1);
    setPreviewPartIndex(-1);
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const assetRows = await listLibraryAssets({ includeDeleted: false });
      setAssets(assetRows);
      const firstCategory = assetRows[0]?.categoryId ?? null;
      setSelectedCategoryId((prev) => prev ?? firstCategory);
      const found = assetRows.find((row) => row.id === assetId) || assetRows[0] || null;
      hydrateFromAsset(found);
    } catch (e) {
      setError(errorMessage(e, 'Failed to load editor data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  function selectAsset(next: LibraryAsset): void {
    hydrateFromAsset(next);
    setSelectedCategoryId(next.categoryId);
    navigate(`/admin/assets/editor/${encodeURIComponent(next.id)}`);
  }

  function addNode(): void {
    const id = `NODE_${nodes.length + 1}`;
    const next: AssetDefinitionNode = {
      id,
      label: id,
      type: 'infeed',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      direction: [1, 0, 0],
    };
    setNodes((prev) => [...prev, next]);
    setSelectedNodeIndex(nodes.length);
  }

  function deleteNode(index: number): void {
    if (index < 0) return;
    setNodes((prev) => prev.filter((_, i) => i !== index));
    setSelectedNodeIndex(-1);
  }

  function updateNode(index: number, updates: Partial<AssetDefinitionNode>): void {
    setNodes((prev) => prev.map((node, i) => (i === index ? { ...node, ...updates } : node)));
  }

  function placeSelectedNodeAt(positionMm: [number, number, number]): void {
    if (selectedNodeIndex < 0 || !nodes[selectedNodeIndex]) {
      const id = `NODE_${nodes.length + 1}`;
      const kind = nodes.length === 0 ? 'infeed' : (nodes.length === 1 ? 'outfeed' : 'center');
      const next: AssetDefinitionNode = {
        id,
        label: id,
        type: kind,
        position: positionMm,
        rotation: [0, 0, 0],
        direction: [1, 0, 0],
      };
      setNodes((prev) => [...prev, next]);
      setSelectedNodeIndex(nodes.length);
      return;
    }
    updateNode(selectedNodeIndex, { position: positionMm });
  }

  const filteredHierarchyItems = useMemo(() => {
    const q = objectFilter.trim().toLowerCase();
    if (!q) return hierarchyItems;
    return hierarchyItems.filter((item) => item.path.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
  }, [objectFilter, hierarchyItems]);

  function addMovingPart(): void {
    setMovableParts((prev) => [
      ...prev,
      {
        objectName: `Part_${prev.length + 1}`,
        motionType: 'translate',
        axis: 'x',
        min: 0,
        max: 100,
        default: 0,
        speed: 10,
      },
    ]);
  }

  async function saveAsset() {
    if (!asset) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateLibraryAsset(asset.id, {
        name: name.trim() || asset.name,
        description: description.trim(),
        tags: tagsText.split(',').map((v) => v.trim()).filter(Boolean),
        categoryId: selectedCategoryId || asset.categoryId,
        metadata,
      });
      setAssets((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      hydrateFromAsset(updated);
      setMessage('Metadata saved');
      await refreshRuntimePublishedAssets().catch(() => undefined);
    } catch (e) {
      setError(errorMessage(e, 'Failed to save metadata'));
    } finally {
      setSaving(false);
    }
  }

  async function publishAsset() {
    if (!asset) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await publishLibraryAsset(asset.id);
      setAssets((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      hydrateFromAsset(updated);
      setMessage('Asset published');
      await refreshRuntimePublishedAssets().catch(() => undefined);
    } catch (e) {
      setError(errorMessage(e, 'Failed to publish asset'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadModel(file: File) {
    if (!selectedCategoryId) {
      setError('Select a category before uploading');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const created = await uploadLibraryAsset({
        file,
        categoryId: selectedCategoryId,
        name: file.name.replace(/\.glb$/i, ''),
      });
      setAssets((prev) => [created, ...prev]);
      selectAsset(created);
      setMessage('Model uploaded as draft');
    } catch (e) {
      setError(errorMessage(e, 'Failed to upload model'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadThumbnail(file: File) {
    if (!asset) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await uploadAssetThumbnail(asset.id, file);
      setAssets((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      hydrateFromAsset(updated);
      setMessage('Thumbnail uploaded');
    } catch (e) {
      setError(errorMessage(e, 'Failed to upload thumbnail'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--mm-bg-app)', color: 'var(--mm-text-primary)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ background: 'var(--mm-bg-panel)', borderBottom: '1px solid var(--mm-border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={simulationUrls.productHome} style={{ textDecoration: 'none', color: 'inherit' }}>
            <img src="/simulation-studio-logo.png" alt="Simulation Studio" style={{ width: 198, height: 40, borderRadius: 8, objectFit: 'cover', objectPosition: 'center 45%' }} />
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--mm-accent-primary)', border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)', background: 'var(--mm-accent-primary-muted)', padding: '5px 8px', borderRadius: 8 }}>
            <Shield size={13} />
            Admin Asset Editor
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/admin/assets" style={{ color: 'var(--mm-text-primary)', fontSize: 12, textDecoration: 'none', border: '1px solid var(--mm-border)', borderRadius: 8, padding: '7px 10px', background: 'var(--mm-bg-surface)' }}>
            <ArrowLeft size={13} style={{ marginRight: 6 }} />
            Back to Library
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mm-text-secondary)' }}>
            <User size={13} />
            <span>{user?.displayName}</span>
          </div>
          <button type="button" onClick={logout} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '7px 10px', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', fontSize: 12 }}>
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: 14, display: 'grid', gridTemplateColumns: '300px 1fr 360px', gap: 12, minHeight: 0 }}>
        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Assets</div>
              <button type="button" onClick={() => modelFileRef.current?.click()} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <Upload size={12} />
                Upload GLB
              </button>
              <input
                ref={modelFileRef}
                type="file"
                accept=".glb,model/gltf-binary"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadModel(file);
                  e.target.value = '';
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
              Upload target category: {selectedCategoryId ?? 'none'}
            </div>
          </div>
          {loading && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--mm-text-tertiary)' }}>Loading assets…</div>}
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 6, marginTop: 8 }}>
            {assets.map((row) => {
              const selected = asset?.id === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => selectAsset(row)}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${selected ? 'color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)' : 'var(--mm-border-subtle)'}`,
                    borderRadius: 8,
                    padding: 8,
                    background: selected ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{row.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', marginTop: 2 }}>
                    {row.status} • v{row.version}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, overflow: 'hidden', display: 'grid', gridTemplateRows: '1fr auto', minHeight: 0 }}>
          <div style={{ minHeight: 0 }}>
            <ModelPreview
              modelUrl={asset?.modelUrl || null}
              nodes={nodes}
              selectedNodeIndex={selectedNodeIndex}
              onSelectNode={setSelectedNodeIndex}
              onPlaceNodeAtMm={placeSelectedNodeAt}
              onMoveNodeToMm={(index, positionMm) => updateNode(index, { position: positionMm })}
              setHierarchyItems={setHierarchyItems}
              highlightedObjectNames={highlightedObjectNames}
              setHighlightedObjectNames={setHighlightedObjectNames}
              movingParts={movableParts}
              previewPartIndex={previewPartIndex}
              previewT={previewT}
            />
          </div>
          <div style={{ borderTop: '1px solid var(--mm-border-subtle)', padding: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={saveAsset} disabled={!asset || saving} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={13} />
              Save Metadata
            </button>
            <button type="button" onClick={publishAsset} disabled={!asset || saving || validation.length > 0} style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-success) 45%, transparent)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-accent-success-muted)', color: 'var(--mm-accent-success)', fontSize: 12, fontWeight: 700 }}>
              Publish
            </button>
            <button type="button" onClick={() => thumbFileRef.current?.click()} disabled={!asset || saving} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} />
              Thumbnail
            </button>
            <input
              ref={thumbFileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadThumbnail(file);
                e.target.value = '';
              }}
            />
            {message && <span style={{ fontSize: 12, color: 'var(--mm-accent-success)' }}>{message}</span>}
            {error && <span style={{ fontSize: 12, color: 'var(--mm-accent-danger)' }}>{error}</span>}
          </div>
        </section>

        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', overscrollBehavior: 'contain', scrollbarGutter: 'stable', paddingRight: 8 }}>
            {!asset && <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>Select an asset to edit authoring metadata.</div>}
            {asset && (
              <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Asset Info</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
                <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Tags (comma separated)</label>
                <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Nodes</div>
                  <button type="button" onClick={addNode} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} />
                    Add Node
                  </button>
                </div>
                <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)' }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>Visual Placement</div>
                  <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 4 }}>
                    Click in viewport to place selected node. Drag selected node to reposition. Placement snaps to 50mm increments for guided alignment.
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                  {nodes.map((node, index) => (
                    <button key={`${node.id || 'node'}-${index}`} type="button" onClick={() => setSelectedNodeIndex(index)} style={{ textAlign: 'left', border: `1px solid ${selectedNodeIndex === index ? 'color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)' : 'var(--mm-border-subtle)'}`, borderRadius: 8, padding: 8, background: selectedNodeIndex === index ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{node.id || `Node ${index + 1}`}</div>
                      <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)' }}>type: {node.type || 'unknown'}</div>
                    </button>
                  ))}
                </div>
                {selectedNodeIndex >= 0 && nodes[selectedNodeIndex] && (
                  <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Node ID</label>
                    <input value={String(nodes[selectedNodeIndex].id || '')} onChange={(e) => updateNode(selectedNodeIndex, { id: e.target.value })} />
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Node Type</label>
                    <select value={String(nodes[selectedNodeIndex].type || 'infeed')} onChange={(e) => updateNode(selectedNodeIndex, { type: e.target.value })}>
                      <option value="infeed">infeed</option>
                      <option value="outfeed">outfeed</option>
                      <option value="center">center</option>
                      <option value="top_attach">top_attach</option>
                      <option value="bottom_attach">bottom_attach</option>
                      <option value="pick">pick</option>
                      <option value="place">place</option>
                    </select>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Position [x,y,z] mm</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                      {[0, 1, 2].map((axis) => (
                        <input
                          key={axis}
                          type="number"
                          value={Number(nodes[selectedNodeIndex].position?.[axis] || 0)}
                          onChange={(e) => {
                            const current = nodes[selectedNodeIndex];
                            const next = [...(current.position || [0, 0, 0])] as [number, number, number];
                            next[axis] = Number(e.target.value) || 0;
                            updateNode(selectedNodeIndex, { position: next });
                          }}
                        />
                      ))}
                    </div>
                    <button type="button" onClick={() => deleteNode(selectedNodeIndex)} style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 45%, transparent)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <Trash2 size={12} />
                      Remove Node
                    </button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Moving Parts</div>
                  <button type="button" onClick={addMovingPart} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} />
                    Add Part
                  </button>
                </div>
                <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>Model Object Hierarchy (mesh/object names)</div>
                  <input
                    value={objectFilter}
                    onChange={(e) => setObjectFilter(e.target.value)}
                    placeholder="Filter object names"
                    style={{ fontSize: 12 }}
                  />
                  <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, background: 'var(--mm-bg-panel)' }}>
                    {filteredHierarchyItems.length === 0 ? (
                      <div style={{ padding: 8, fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                        {hierarchyItems.length === 0 ? 'No scene hierarchy found in current GLB.' : 'No objects match this filter.'}
                      </div>
                    ) : (
                      filteredHierarchyItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            const nameToSelect = item.name.startsWith('(unnamed') ? '' : item.name;
                            setSelectedObjectName(nameToSelect);
                            if (nameToSelect) setHighlightedObjectNames([nameToSelect]);
                          }}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '6px 8px',
                            border: 'none',
                            borderBottom: '1px solid var(--mm-border-subtle)',
                            paddingLeft: `${8 + (item.depth * 12)}px`,
                            background: selectedObjectPath === item.path ? 'var(--mm-accent-primary-muted)' : 'transparent',
                            color: selectedObjectPath === item.path ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
                            fontSize: 11,
                          }}
                        >
                          <span style={{ fontWeight: item.isMesh ? 600 : 500 }}>
                            {item.name}
                          </span>
                          <span style={{ marginLeft: 6, color: 'var(--mm-text-disabled)', fontSize: 10 }}>
                            {item.childCount > 0 ? `(${item.childCount})` : item.isMesh ? 'mesh' : 'group'}
                          </span>
                          <div style={{ marginTop: 2, color: 'var(--mm-text-disabled)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.path}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedObjectPath) return;
                        setMovableParts((prev) => [
                          ...prev,
                          {
                            objectName: selectedObjectPath,
                            motionType: 'translate',
                            axis: 'x',
                            min: 0,
                            max: 100,
                            default: 0,
                            speed: 10,
                          },
                        ]);
                      }}
                      disabled={!selectedObjectPath}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11 }}
                    >
                      Add Selected Object as Moving Part
                    </button>
                    <button
                      type="button"
                      onClick={() => setHighlightedObjectNames([])}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11 }}
                    >
                      Clear Highlight
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {movableParts.map((part, index) => (
                    <div key={`${part.objectName}-${index}`} style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                      <input value={part.objectName} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, objectName: e.target.value } : p)))} placeholder="Object name" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                        <select value={part.motionType} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, motionType: e.target.value as 'translate' | 'rotate' } : p)))}>
                          <option value="translate">translate</option>
                          <option value="rotate">rotate</option>
                        </select>
                        <select value={part.axis} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, axis: e.target.value as 'x' | 'y' | 'z' } : p)))}>
                          <option value="x">x</option>
                          <option value="y">y</option>
                          <option value="z">z</option>
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 }}>
                        <input type="number" value={part.min} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, min: Number(e.target.value) || 0 } : p)))} placeholder="min" />
                        <input type="number" value={part.max} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, max: Number(e.target.value) || 0 } : p)))} placeholder="max" />
                        <input type="number" value={part.default} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, default: Number(e.target.value) || 0 } : p)))} placeholder="default" />
                        <input type="number" value={part.speed} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, speed: Number(e.target.value) || 0 } : p)))} placeholder="speed" />
                      </div>
                      <button type="button" onClick={() => setMovableParts((prev) => prev.filter((_, i) => i !== index))} style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 45%, transparent)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <Trash2 size={12} />
                        Remove Part
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8, display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Motion Preview</div>
                <select value={previewPartIndex} onChange={(e) => setPreviewPartIndex(Number(e.target.value))}>
                  <option value={-1}>none</option>
                  {movableParts.map((part, index) => (
                    <option key={`${part.objectName}-${index}`} value={index}>
                      {part.objectName}
                    </option>
                  ))}
                </select>
                <input type="range" min={0} max={1} step={0.01} value={previewT} onChange={(e) => setPreviewT(Number(e.target.value))} />
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 6 }}>Validation</div>
                {validation.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--mm-accent-success)' }}>Ready to publish</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--mm-accent-danger)' }}>
                    {validation.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminAssetEditorPage;
