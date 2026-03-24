import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArchiveRestore,
  ArrowUpDown,
  Copy,
  FolderPlus,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  Upload,
  User,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  archiveLibraryAsset,
  createAssetCategory,
  deleteAssetCategory,
  deleteLibraryAsset,
  duplicateLibraryAsset,
  listAssetCategories,
  listLibraryAssets,
  publishLibraryAsset,
  reorderAssetCategories,
  reorderLibraryAssets,
  setLibraryAssetRuntimeVisibility,
  restoreLibraryAsset,
  uploadLibraryAsset,
  updateAssetCategory,
} from '../utils/api';
import { AssetCategory, AssetStatus, LibraryAsset, SceneCategory } from '../types';
import { simulationUrls } from '../content/simulationMarketingContent';
import { refreshRuntimePublishedAssets } from '../lib/runtimePublishedAssets';

const SCENE_CATEGORIES: SceneCategory[] = [
  'process',
  'modular',
  'environment',
  'actors',
  'robots',
  'pallets',
  'fmcg',
  'medical',
];

const statusBadge: Record<AssetStatus, React.CSSProperties> = {
  draft: {
    background: 'var(--mm-accent-warning-muted)',
    color: 'var(--mm-accent-warning)',
    border: '1px solid color-mix(in oklab, var(--mm-accent-warning) 35%, transparent)',
  },
  published: {
    background: 'var(--mm-accent-success-muted)',
    color: 'var(--mm-accent-success)',
    border: '1px solid color-mix(in oklab, var(--mm-accent-success) 35%, transparent)',
  },
  archived: {
    background: 'color-mix(in oklab, var(--mm-text-tertiary) 10%, transparent)',
    color: 'var(--mm-text-secondary)',
    border: '1px solid var(--mm-border)',
  },
};

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function errorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || fallback;
}

const AdminAssetLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const uploadRef = useRef<HTMLInputElement | null>(null);

  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryScene, setNewCategoryScene] = useState<SceneCategory>('process');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || null,
    [assets, selectedAssetId]
  );

  const selectedCategory = useMemo(
    () => categories.find((c) => c.id === selectedCategoryId) || null,
    [categories, selectedCategoryId]
  );

  async function loadCategories() {
    setLoadingCategories(true);
    try {
      const rows = await listAssetCategories({ includeArchived: true });
      setCategories(rows);
      if (!selectedCategoryId && rows.length > 0) {
        setSelectedCategoryId(rows[0].id);
      }
    } catch (e) {
      setError(errorMessage(e, 'Failed to load categories'));
    } finally {
      setLoadingCategories(false);
    }
  }

  async function loadAssets() {
    setLoadingAssets(true);
    try {
      const rows = await listLibraryAssets({
        q: search || undefined,
        categoryId: selectedCategoryId || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setAssets(rows);
      if (rows.length > 0 && (!selectedAssetId || !rows.some((r) => r.id === selectedAssetId))) {
        setSelectedAssetId(rows[0].id);
      }
      if (rows.length === 0) setSelectedAssetId(null);
    } catch (e) {
      setError(errorMessage(e, 'Failed to load assets'));
    } finally {
      setLoadingAssets(false);
    }
  }

  useEffect(() => {
    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, selectedCategoryId]);

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) return;
    setBusy(true);
    setError('');
    try {
      const created = await createAssetCategory({
        name: newCategoryName.trim(),
        sceneCategory: newCategoryScene,
        description: newCategoryDescription.trim(),
      });
      setCategories((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      setSelectedCategoryId(created.id);
      setNewCategoryName('');
      setNewCategoryDescription('');
      setMessage('Category created');
    } catch (e) {
      setError(errorMessage(e, 'Failed to create category'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRenameCategory(category: AssetCategory) {
    const name = window.prompt('Rename category', category.name);
    if (!name || name.trim() === category.name) return;
    setBusy(true);
    setError('');
    try {
      const updated = await updateAssetCategory(category.id, { name: name.trim() });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setMessage('Category updated');
    } catch (e) {
      setError(errorMessage(e, 'Failed to rename category'));
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleArchiveCategory(category: AssetCategory) {
    setBusy(true);
    setError('');
    try {
      const updated = await updateAssetCategory(category.id, { isArchived: !category.isArchived });
      setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      setMessage(updated.isArchived ? 'Category archived' : 'Category restored');
    } catch (e) {
      setError(errorMessage(e, 'Failed to update category'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteCategory(category: AssetCategory) {
    if (!window.confirm(`Delete category "${category.name}"?`)) return;
    setBusy(true);
    setError('');
    try {
      await deleteAssetCategory(category.id);
      setCategories((prev) => prev.filter((c) => c.id !== category.id));
      if (selectedCategoryId === category.id) {
        setSelectedCategoryId(null);
      }
      setMessage('Category deleted');
    } catch (e) {
      setError(errorMessage(e, 'Failed to delete category'));
    } finally {
      setBusy(false);
    }
  }

  async function handleUpload(file: File) {
    if (!selectedCategoryId) {
      setError('Select a category before uploading');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await uploadLibraryAsset({
        file,
        categoryId: selectedCategoryId,
        name: file.name.replace(/\.glb$/i, ''),
      });
      await loadAssets();
      await refreshRuntimePublishedAssets().catch(() => undefined);
      setMessage('Asset uploaded as draft');
    } catch (e) {
      setError(errorMessage(e, 'Failed to upload asset'));
    } finally {
      setBusy(false);
    }
  }

  async function runAssetAction(action: 'publish' | 'archive' | 'restore' | 'duplicate' | 'delete', assetId: string) {
    setBusy(true);
    setError('');
    try {
      if (action === 'publish') await publishLibraryAsset(assetId);
      if (action === 'archive') await archiveLibraryAsset(assetId);
      if (action === 'restore') await restoreLibraryAsset(assetId);
      if (action === 'duplicate') await duplicateLibraryAsset(assetId);
      if (action === 'delete') await deleteLibraryAsset(assetId);
      await loadAssets();
      await refreshRuntimePublishedAssets().catch(() => undefined);
      setMessage(`Asset ${action} complete`);
    } catch (e) {
      setError(errorMessage(e, `Failed to ${action} asset`));
    } finally {
      setBusy(false);
    }
  }

  async function moveCategory(category: AssetCategory, direction: -1 | 1) {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((c) => c.id === category.id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;
    const next = [...sorted];
    const tmp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = tmp;
    setBusy(true);
    setError('');
    try {
      await reorderAssetCategories(next.map((c) => c.id));
      setCategories((prev) =>
        prev.map((c) => {
          const order = next.findIndex((n) => n.id === c.id);
          return order >= 0 ? { ...c, sortOrder: order + 1 } : c;
        })
      );
      setMessage('Category order updated');
    } catch (e) {
      setError(errorMessage(e, 'Failed to reorder category'));
    } finally {
      setBusy(false);
    }
  }

  async function moveAsset(asset: LibraryAsset, direction: -1 | 1) {
    const sorted = [...assets].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((a) => a.id === asset.id);
    const targetIdx = idx + direction;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;
    const next = [...sorted];
    const tmp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = tmp;
    setBusy(true);
    setError('');
    try {
      await reorderLibraryAssets(
        next.map((a) => a.id),
        selectedCategoryId || undefined
      );
      setAssets((prev) =>
        prev.map((a) => {
          const order = next.findIndex((n) => n.id === a.id);
          return order >= 0 ? { ...a, sortOrder: order + 1 } : a;
        })
      );
      setMessage('Asset order updated');
    } catch (e) {
      setError(errorMessage(e, 'Failed to reorder asset'));
    } finally {
      setBusy(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'var(--mm-bg-app)',
    color: 'var(--mm-text-primary)',
    display: 'flex',
    flexDirection: 'column',
  };

  return (
    <div style={pageStyle}>
      <header
        style={{
          background: 'var(--mm-bg-panel)',
          borderBottom: '1px solid var(--mm-border)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={simulationUrls.productHome} style={{ textDecoration: 'none', color: 'inherit' }}>
            <img src="/simulation-studio-logo.png" alt="Simulation Studio" style={{ width: 198, height: 40, borderRadius: 8, objectFit: 'cover', objectPosition: 'center 45%' }} />
          </Link>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 11,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              fontWeight: 700,
              color: 'var(--mm-accent-primary)',
              border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)',
              background: 'var(--mm-accent-primary-muted)',
              padding: '5px 8px',
              borderRadius: 8,
            }}
          >
            <Shield size={13} />
            Admin Asset Library
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/admin/assets/editor" style={{ color: 'var(--mm-text-primary)', fontSize: 12, textDecoration: 'none', border: '1px solid var(--mm-border)', borderRadius: 8, padding: '7px 10px', background: 'var(--mm-bg-surface)' }}>
            Open Asset Editor
          </Link>
          <Link to="/dashboard" style={{ color: 'var(--mm-text-primary)', fontSize: 12, textDecoration: 'none', border: '1px solid var(--mm-border)', borderRadius: 8, padding: '7px 10px', background: 'var(--mm-bg-surface)' }}>
            Back to Dashboard
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mm-text-secondary)' }}>
            <User size={13} />
            <span>{user?.displayName}</span>
          </div>
          <button
            type="button"
            onClick={logout}
            style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '7px 10px', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', fontSize: 12 }}
          >
            Sign Out
          </button>
        </div>
      </header>

      <main style={{ flex: 1, padding: 16, display: 'grid', gridTemplateColumns: '320px 1fr 360px', gap: 12, minHeight: 0 }}>
        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 8 }}>
            Categories / Modules
          </div>
          <div style={{ display: 'grid', gap: 6, marginBottom: 10 }}>
            <input
              type="text"
              value={newCategoryName}
              placeholder="New category name"
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <select value={newCategoryScene} onChange={(e) => setNewCategoryScene(e.target.value as SceneCategory)}>
              {SCENE_CATEGORIES.map((scene) => (
                <option key={scene} value={scene}>
                  {scene}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newCategoryDescription}
              placeholder="Description (optional)"
              onChange={(e) => setNewCategoryDescription(e.target.value)}
            />
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={busy || !newCategoryName.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                borderRadius: 8,
                padding: '8px 10px',
                border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 30%, transparent)',
                background: 'var(--mm-accent-primary-muted)',
                color: 'var(--mm-accent-primary)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <FolderPlus size={14} />
              Create Category
            </button>
          </div>
          <div style={{ borderTop: '1px solid var(--mm-border-subtle)', marginBottom: 10 }} />
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gap: 6 }}>
            {loadingCategories && <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>Loading categories…</div>}
            {!loadingCategories && categories.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>No categories yet.</div>
            )}
            {categories.map((category) => {
              const selected = selectedCategoryId === category.id;
              return (
                <div
                  key={category.id}
                  style={{
                    border: `1px solid ${selected ? 'color-mix(in oklab, var(--mm-accent-primary) 35%, transparent)' : 'var(--mm-border-subtle)'}`,
                    background: selected ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                    borderRadius: 8,
                    padding: 8,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: 600,
                      color: selected ? 'var(--mm-accent-primary)' : 'var(--mm-text-primary)',
                    }}
                  >
                    {category.name}
                  </button>
                  <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 2 }}>
                    scene: {category.sceneCategory}
                    {category.isArchived ? ' • archived' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => moveCategory(category, -1)}
                      title="Move up"
                      disabled={busy}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 6, padding: 6, background: 'var(--mm-bg-panel)' }}
                    >
                      <ArrowUpDown size={12} />
                    </button>
                    <button type="button" onClick={() => handleRenameCategory(category)} title="Rename" style={{ border: '1px solid var(--mm-border)', borderRadius: 6, padding: 6, background: 'var(--mm-bg-panel)' }}>
                      <Pencil size={12} />
                    </button>
                    <button type="button" onClick={() => handleToggleArchiveCategory(category)} title={category.isArchived ? 'Restore' : 'Archive'} style={{ border: '1px solid var(--mm-border)', borderRadius: 6, padding: 6, background: 'var(--mm-bg-panel)' }}>
                      <ArchiveRestore size={12} />
                    </button>
                    <button type="button" onClick={() => handleDeleteCategory(category)} title="Delete category" style={{ border: '1px solid var(--mm-border)', borderRadius: 6, padding: 6, background: 'var(--mm-bg-panel)' }}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: 9, color: 'var(--mm-text-tertiary)' }} />
              <input
                type="text"
                value={search}
                placeholder="Search assets"
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', paddingLeft: 30 }}
              />
            </div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssetStatus | 'all')} style={{ width: 140 }}>
              <option value="all">all status</option>
              <option value="draft">draft</option>
              <option value="published">published</option>
              <option value="archived">archived</option>
            </select>
            <button
              type="button"
              onClick={() => uploadRef.current?.click()}
              disabled={!selectedCategory || busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 8,
                padding: '8px 10px',
                border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 30%, transparent)',
                background: 'var(--mm-accent-primary-muted)',
                color: 'var(--mm-accent-primary)',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <Upload size={14} />
              Upload GLB
            </button>
            <input
              ref={uploadRef}
              type="file"
              accept=".glb,model/gltf-binary"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                handleUpload(file);
                e.target.value = '';
              }}
            />
          </div>

          {message && (
            <div style={{ marginBottom: 8, border: '1px solid color-mix(in oklab, var(--mm-accent-success) 30%, transparent)', background: 'var(--mm-accent-success-muted)', color: 'var(--mm-accent-success)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
              {message}
            </div>
          )}
          {error && (
            <div style={{ marginBottom: 8, border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 35%, transparent)', background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', borderRadius: 8, padding: '8px 10px', fontSize: 12 }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 10, fontSize: 12, color: 'var(--mm-text-tertiary)' }}>
            <span style={{ border: '1px solid var(--mm-border)', borderRadius: 999, padding: '4px 8px' }}>
              Category: {selectedCategory?.name || 'All'}
            </span>
            <span style={{ border: '1px solid var(--mm-border)', borderRadius: 999, padding: '4px 8px' }}>
              Assets: {assets.length}
            </span>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 10, alignContent: 'start' }}>
            {loadingAssets && <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>Loading assets…</div>}
            {!loadingAssets && assets.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>No assets match the current filter.</div>
            )}
            {assets.map((asset) => {
              const selected = selectedAssetId === asset.id;
              return (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSelectedAssetId(asset.id)}
                  style={{
                    textAlign: 'left',
                    border: `1px solid ${selected ? 'color-mix(in oklab, var(--mm-accent-primary) 35%, transparent)' : 'var(--mm-border-subtle)'}`,
                    borderRadius: 10,
                    background: selected ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                    padding: 10,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mm-text-primary)', lineHeight: 1.3, wordBreak: 'break-word' }}>{asset.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 2 }}>{asset.categoryName || 'Uncategorized'}</div>
                    </div>
                    <span style={{ ...statusBadge[asset.status], fontSize: 10, fontWeight: 700, borderRadius: 999, padding: '2px 6px', textTransform: 'uppercase' }}>{asset.status}</span>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--mm-text-secondary)', minHeight: 32 }}>
                    {asset.description || 'No description'}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--mm-text-tertiary)' }}>
                    <span>v{asset.version}</span>
                    <span>{formatDate(asset.updatedAt)}</span>
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        moveAsset(asset, -1);
                      }}
                      title="Reorder asset"
                      disabled={busy}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 6, padding: 4, background: 'var(--mm-bg-panel)' }}
                    >
                      <ArrowUpDown size={12} />
                    </button>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 8 }}>
            Asset Details
          </div>
          {!selectedAsset && (
            <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>Select an asset to view details and actions.</div>
          )}
          {selectedAsset && (
            <>
              <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 10, padding: 10, background: 'var(--mm-bg-surface)' }}>
                <div style={{ fontSize: 14, fontWeight: 700 }}>{selectedAsset.name}</div>
                <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 4 }}>
                  {selectedAsset.categoryName} • {selectedAsset.sceneCategory}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 4 }}>
                  Status: <strong style={{ color: 'var(--mm-text-secondary)' }}>{selectedAsset.status}</strong> • Version: {selectedAsset.version}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 4 }}>
                  Runtime visibility:{' '}
                  <strong style={{ color: selectedAsset.visibleInRuntimeLibrary ? 'var(--mm-accent-success)' : 'var(--mm-text-secondary)' }}>
                    {selectedAsset.visibleInRuntimeLibrary ? 'live (/demo visible)' : 'internal-only'}
                  </strong>
                </div>
                <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 4 }}>
                  Updated: {formatDate(selectedAsset.updatedAt)}
                </div>
              </div>

              <div style={{ marginTop: 10, fontSize: 12, color: 'var(--mm-text-secondary)', whiteSpace: 'pre-wrap', border: '1px solid var(--mm-border-subtle)', borderRadius: 10, padding: 10, background: 'var(--mm-bg-surface)', minHeight: 78 }}>
                {selectedAsset.description || 'No description'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8, marginTop: 10 }}>
                <button
                  type="button"
                  onClick={() => navigate(`/admin/assets/editor/${encodeURIComponent(selectedAsset.id)}`)}
                  style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-bg-surface)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                >
                  <Pencil size={13} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => runAssetAction('duplicate', selectedAsset.id)}
                  disabled={busy}
                  style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-bg-surface)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                >
                  <Copy size={13} />
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={() => runAssetAction(selectedAsset.status === 'archived' ? 'restore' : 'archive', selectedAsset.id)}
                  disabled={busy}
                  style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-bg-surface)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                >
                  <ArchiveRestore size={13} />
                  {selectedAsset.status === 'archived' ? 'Restore' : 'Archive'}
                </button>
                <button
                  type="button"
                  onClick={() => runAssetAction('publish', selectedAsset.id)}
                  disabled={busy}
                  style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-success) 45%, transparent)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-accent-success-muted)', color: 'var(--mm-accent-success)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                >
                  <Plus size={13} />
                  Publish
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (selectedAsset.status !== 'published') return;
                    setBusy(true);
                    setError('');
                    try {
                      await setLibraryAssetRuntimeVisibility(
                        selectedAsset.id,
                        !selectedAsset.visibleInRuntimeLibrary
                      );
                      await loadAssets();
                      await refreshRuntimePublishedAssets().catch(() => undefined);
                      setMessage(
                        !selectedAsset.visibleInRuntimeLibrary
                          ? 'Asset is now visible in runtime/demo library'
                          : 'Asset is now internal-only and hidden from runtime/demo'
                      );
                    } catch (e) {
                      setError(errorMessage(e, 'Failed to update runtime visibility'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                  disabled={busy || selectedAsset.status !== 'published'}
                  style={{
                    gridColumn: '1 / span 2',
                    border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 30%, transparent)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    background: 'var(--mm-accent-primary-muted)',
                    color: 'var(--mm-accent-primary)',
                    fontSize: 12,
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    justifyContent: 'center',
                  }}
                >
                  {selectedAsset.visibleInRuntimeLibrary ? 'Hide from Demo Runtime' : 'Show in Demo Runtime'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!window.confirm('Delete this asset?')) return;
                    runAssetAction('delete', selectedAsset.id);
                  }}
                  disabled={busy}
                  style={{ gridColumn: '1 / span 2', border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 45%, transparent)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}
                >
                  <Trash2 size={13} />
                  Delete Asset
                </button>
              </div>

              <div style={{ marginTop: 12, borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginBottom: 6 }}>
                  Quick workflow
                </div>
                <div style={{ display: 'grid', gap: 6, fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ArrowUpDown size={12} />
                    Upload GLB and auto-save as draft
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Pencil size={12} />
                    Open editor to define nodes + moving parts
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} />
                    Publish to make asset available in simulation
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
};

export default AdminAssetLibraryPage;
