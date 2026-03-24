import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Shield, Trash2, Upload, User } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
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

const ModelPreview: React.FC<{
  modelUrl: string | null;
  nodes: AssetDefinitionNode[];
  movingParts: AssetMovingPart[];
  previewPartIndex: number;
  previewT: number;
}> = ({ modelUrl, nodes, movingParts, previewPartIndex, previewT }) => {
  const [loadedRoot, setLoadedRoot] = useState<THREE.Object3D | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!modelUrl) {
      setLoadedRoot(null);
      return () => {
        cancelled = true;
      };
    }

    const loader = new GLTFLoader();
    loader.setCrossOrigin('use-credentials');
    loader.load(
      modelUrl,
      (gltf) => {
        if (cancelled) return;
        setLoadedRoot(gltf.scene);
      },
      undefined,
      () => {
        if (!cancelled) setLoadedRoot(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [modelUrl]);

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
      }
    });
    const part = movingParts[previewPartIndex] || null;
    applyMotionPreview(clone, part, previewT);
    return clone;
  }, [loadedRoot, movingParts, previewPartIndex, previewT]);

  return (
    <Canvas shadows camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
      <ambientLight intensity={0.65} />
      <directionalLight castShadow position={[3, 5, 2]} intensity={1.1} />
      <Grid args={[10, 10]} cellColor="#6b7280" sectionColor="#334155" fadeDistance={18} fadeStrength={1.2} />
      {previewRoot ? (
        <primitive object={previewRoot} />
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.8, 0.8]} />
          <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.55} />
        </mesh>
      )}
      {nodes.map((node, index) => {
        const p = node.position || [0, 0, 0];
        return (
          <mesh
            key={`${node.id || 'node'}-${index}`}
            position={[mmToM(Number(p[0]) || 0), mmToM(Number(p[1]) || 0), mmToM(Number(p[2]) || 0)]}
          >
            <sphereGeometry args={[0.05, 12, 10]} />
            <meshStandardMaterial color={String(node.type || '').toLowerCase().includes('in') ? '#34d399' : '#22d3ee'} />
          </mesh>
        );
      })}
      <Environment preset="city" />
      <OrbitControls makeDefault />
    </Canvas>
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

        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 10, overflowY: 'auto' }}>
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
        </section>
      </main>
    </div>
  );
};

export default AdminAssetEditorPage;
