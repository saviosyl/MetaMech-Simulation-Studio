/// <reference types="vite/client" />
import axios from 'axios';
import {
  AssetCategory,
  AssetMetadata,
  AssetStatus,
  LibraryAsset,
  ParametricParameterValues,
  ParametricTemplateId,
  SceneCategory,
} from '../types';

const configuredApiUrl = (import.meta.env.VITE_API_URL || '').trim();
// Dev fallback stays localhost, but production must never default to localhost.
const API_URL = configuredApiUrl || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — don't redirect on network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.startsWith('/simulation/access')
      || currentPath.startsWith('/forgot-password')
      || currentPath.startsWith('/reset-password');

    const next = encodeURIComponent(window.location.pathname + window.location.search);

    // Only redirect on actual 401 from a working backend
    // Don't redirect on network errors (ECONNREFUSED etc.)
    if (error.response?.status === 401 && !isAuthPage) {
      window.location.href = `/simulation/access?mode=signin&next=${next}`;
    }
    if (
      error.response?.status === 403
      && error.response?.data?.code === 'EMAIL_VERIFICATION_REQUIRED'
      && !isAuthPage
    ) {
      const email = encodeURIComponent(error.response?.data?.email || '');
      window.location.href = `/simulation/access?state=verify&email=${email}&next=${next}`;
    }
    if (error.response?.status === 402 && !isAuthPage) {
      window.location.href = `/simulation/access?state=membership&next=${next}`;
    }
    return Promise.reject(error);
  }
);

// Project CRUD
export async function getProject(id: string) {
  const res = await api.get(`/projects/${id}`);
  return res.data;
}

export async function updateProject(id: string, data: { name?: string; data?: any }) {
  const res = await api.put(`/projects/${id}`, data);
  return res.data;
}

export async function createProject(name: string, data: any = {}) {
  const res = await api.post('/projects', { name, data });
  return res.data;
}

export async function deleteProject(id: string) {
  const res = await api.delete(`/projects/${id}`);
  return res.data;
}

export async function listProjects() {
  const res = await api.get('/projects');
  return res.data;
}

// Admin asset library APIs
export interface ListAssetCategoriesOptions {
  includeArchived?: boolean;
}

export async function listAssetCategories(options: ListAssetCategoriesOptions = {}): Promise<AssetCategory[]> {
  const params = new URLSearchParams();
  if (options.includeArchived) params.set('includeArchived', 'true');
  const res = await api.get('/admin/asset-categories', { params });
  return (res.data?.categories || []) as AssetCategory[];
}

export async function createAssetCategory(payload: {
  name: string;
  description?: string;
  sceneCategory: SceneCategory;
}): Promise<AssetCategory> {
  const res = await api.post('/admin/asset-categories', payload);
  return res.data.category as AssetCategory;
}

export async function updateAssetCategory(
  id: number,
  payload: Partial<{ name: string; description: string; sceneCategory: SceneCategory; isArchived: boolean }>
): Promise<AssetCategory> {
  const res = await api.put(`/admin/asset-categories/${id}`, payload);
  return res.data.category as AssetCategory;
}

export async function deleteAssetCategory(id: number): Promise<void> {
  await api.delete(`/admin/asset-categories/${id}`);
}

export async function reorderAssetCategories(orderedIds: number[]): Promise<void> {
  await api.post('/admin/asset-categories/reorder', { orderedIds });
}

export interface ListAssetsOptions {
  q?: string;
  categoryId?: number;
  status?: AssetStatus;
  lifecycleState?: 'draft' | 'internal' | 'live' | 'archived' | 'deleted';
  tag?: string;
  includeDeleted?: boolean;
}

export async function listLibraryAssets(options: ListAssetsOptions = {}): Promise<LibraryAsset[]> {
  const params = new URLSearchParams();
  if (options.q) params.set('q', options.q);
  if (options.categoryId) params.set('categoryId', String(options.categoryId));
  if (options.status) params.set('status', options.status);
  if (options.lifecycleState) params.set('lifecycleState', options.lifecycleState);
  if (options.tag) params.set('tag', options.tag);
  if (options.includeDeleted) params.set('includeDeleted', 'true');
  const res = await api.get('/admin/assets', { params });
  return (res.data?.assets || []) as LibraryAsset[];
}

export interface UploadAssetPayload {
  file: File;
  categoryId: number;
  name?: string;
  description?: string;
  tags?: string[];
  metadata?: AssetMetadata;
  assetType?: 'static' | 'parametric';
  templateId?: ParametricTemplateId;
  parameterValues?: ParametricParameterValues;
}

export async function uploadLibraryAsset(payload: UploadAssetPayload): Promise<LibraryAsset> {
  const formData = new FormData();
  formData.append('model', payload.file);
  formData.append('categoryId', String(payload.categoryId));
  if (payload.name) formData.append('name', payload.name);
  if (payload.description) formData.append('description', payload.description);
  if (payload.tags && payload.tags.length > 0) formData.append('tags', payload.tags.join(','));
  if (payload.metadata) formData.append('metadata', JSON.stringify(payload.metadata));
  if (payload.assetType) formData.append('assetType', payload.assetType);
  if (payload.templateId) formData.append('templateId', payload.templateId);
  if (payload.parameterValues) formData.append('parameterValues', JSON.stringify(payload.parameterValues));

  const res = await api.post('/admin/assets/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.asset as LibraryAsset;
}

export async function updateLibraryAsset(
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    tags: string[];
    metadata: AssetMetadata;
    categoryId: number;
    sortOrder: number;
    assetType: 'static' | 'parametric';
    templateId: ParametricTemplateId;
    parameterValues: ParametricParameterValues;
  }>
): Promise<LibraryAsset> {
  const res = await api.put(`/admin/assets/${encodeURIComponent(id)}`, payload);
  return res.data.asset as LibraryAsset;
}

export async function reorderLibraryAssets(orderedIds: string[], categoryId?: number): Promise<void> {
  await api.post('/admin/assets/reorder', { orderedIds, categoryId });
}

export async function publishLibraryAsset(id: string): Promise<LibraryAsset> {
  const res = await api.post(`/admin/assets/${encodeURIComponent(id)}/publish`);
  return res.data.asset as LibraryAsset;
}

export async function setLibraryAssetRuntimeVisibility(id: string, visibleInRuntimeLibrary: boolean): Promise<LibraryAsset> {
  const res = await api.post(`/admin/assets/${encodeURIComponent(id)}/set-runtime-visibility`, {
    visibleInRuntimeLibrary,
  });
  return res.data.asset as LibraryAsset;
}

export async function archiveLibraryAsset(id: string): Promise<LibraryAsset> {
  const res = await api.post(`/admin/assets/${encodeURIComponent(id)}/archive`);
  return res.data.asset as LibraryAsset;
}

export async function restoreLibraryAsset(id: string): Promise<LibraryAsset> {
  const res = await api.post(`/admin/assets/${encodeURIComponent(id)}/restore`);
  return res.data.asset as LibraryAsset;
}

export async function duplicateLibraryAsset(id: string): Promise<LibraryAsset> {
  const res = await api.post(`/admin/assets/${encodeURIComponent(id)}/duplicate`);
  return res.data.asset as LibraryAsset;
}

export async function deleteLibraryAsset(id: string): Promise<void> {
  await api.delete(`/admin/assets/${encodeURIComponent(id)}`);
}

export async function uploadAssetThumbnail(id: string, file: File): Promise<LibraryAsset> {
  const formData = new FormData();
  formData.append('thumbnail', file);
  const res = await api.post(`/admin/assets/${encodeURIComponent(id)}/thumbnail`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.asset as LibraryAsset;
}

export async function listPublishedAssets(sceneCategory?: SceneCategory): Promise<LibraryAsset[]> {
  const params = new URLSearchParams();
  if (sceneCategory) params.set('sceneCategory', sceneCategory);
  const res = await api.get('/assets/published', { params });
  return (res.data?.assets || []) as LibraryAsset[];
}

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
}

export interface LegacyMirrorPayload {
  categories: LegacyMirrorCategoryPayload[];
  assets: LegacyMirrorAssetPayload[];
}

export interface LegacyMirrorResult {
  createdCategories: number;
  updatedCategories: number;
  createdAssets: number;
  updatedAssets: number;
}

export async function mirrorLegacyLibrary(payload: LegacyMirrorPayload): Promise<LegacyMirrorResult> {
  const res = await api.post('/admin/assets/mirror-legacy', payload);
  return (res.data?.result || {}) as LegacyMirrorResult;
}

export default api;
