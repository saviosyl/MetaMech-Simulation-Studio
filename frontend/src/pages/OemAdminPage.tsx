import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Bounds, ContactShadows, Environment, Grid, OrbitControls, TransformControls } from '@react-three/drei';
import { ArrowLeft, Building2, Download, Maximize2, Minimize2, Plus, Save, Trash2, Upload } from 'lucide-react';
import * as THREE from 'three';
import { useAuth } from '../contexts/AuthContext';
import { isOemAdminUser } from '../lib/adminAccess';
import {
  clearLocalOemLibraryDraft,
  fetchOemLibraryIndex,
  getLocalOemLibraryDraft,
  OEM_LIBRARY_MANAGE_URL,
  OemCompanyEntry,
  OemCurrency,
  OemConnectionPortInput,
  OemLibraryIndex,
  OemModelFormat,
  OemModelEntry,
  resolveOemModelGlbUrl,
  resolveOemModelRepoRelativePath,
  saveLocalOemLibraryDraft,
} from '../lib/oemLibrary';
import { inferModelFormat, loadModelObject } from '../lib/modelLoader';
import api from '../utils/api';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultModel(_companyId: string, modelName = 'New OEM Model'): OemModelEntry {
  const base = slugify(modelName) || `model-${Date.now()}`;
  return {
    id: base,
    name: modelName,
    description: '',
    placementCategory: 'environment',
    defaultRotationDeg: [0, 0, 0],
    modelFormat: 'glb',
    glbPath: '',
    glbUrl: '',
    thumbnailUrl: '',
    defaultScale: [1, 1, 1],
    priceUsd: 0,
    priceCurrency: 'EUR',
    connectionPorts: [],
  };
}

interface PendingUpload {
  companyId: string;
  modelId: string;
  contentBase64: string;
  sizeBytes: number;
}

interface SyncHistoryEntry {
  timestampIso: string;
  uploadedCount: number;
  deletedCount: number;
  backend: string;
}

function modelKey(companyId: string, modelId: string): string {
  return `${companyId}::${modelId}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

const OEM_SYNC_HISTORY_KEY = 'metamech_oem_sync_history_v1';

function loadSyncHistory(): SyncHistoryEntry[] {
  try {
    const raw = localStorage.getItem(OEM_SYNC_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry) => entry && typeof entry === 'object')
      .map((entry) => ({
        timestampIso: String((entry as any).timestampIso || ''),
        uploadedCount: Math.max(0, Number((entry as any).uploadedCount || 0)),
        deletedCount: Math.max(0, Number((entry as any).deletedCount || 0)),
        backend: String((entry as any).backend || 'remote'),
      }))
      .filter((entry) => entry.timestampIso);
  } catch {
    return [];
  }
}

function saveSyncHistory(entries: SyncHistoryEntry[]): void {
  localStorage.setItem(OEM_SYNC_HISTORY_KEY, JSON.stringify(entries));
}

function formatSyncTimestamp(timestampIso: string): string {
  const date = new Date(timestampIso);
  if (Number.isNaN(date.getTime())) return timestampIso;
  return date.toLocaleString();
}

const PORT_COLOR: Record<'input' | 'output', string> = {
  input: '#3b82f6',
  output: '#10b981',
};

const InteractiveModelPreview: React.FC<{
  modelUrl: string;
  modelFormat?: OemModelFormat;
  defaultScale?: [number, number, number];
  placementRotationDeg?: [number, number, number];
  ports: OemConnectionPortInput[];
  selectedPortIndex: number;
  transformPortsEnabled: boolean;
  addPortByClick: boolean;
  portTypeForClick: 'input' | 'output';
  onSelectPort: (index: number) => void;
  onPortTransform: (index: number, localPos: [number, number, number]) => void;
  onPlacementRotationChange: (rotationDeg: [number, number, number]) => void;
  onSurfacePick: (localPos: [number, number, number], type: 'input' | 'output') => void;
}> = ({
  modelUrl,
  modelFormat,
  defaultScale,
  placementRotationDeg,
  ports,
  selectedPortIndex,
  transformPortsEnabled,
  addPortByClick,
  portTypeForClick,
  onSelectPort,
  onPortTransform,
  onPlacementRotationChange,
  onSurfacePick,
}) => {
  const [loadedModel, setLoadedModel] = useState<THREE.Object3D | null>(null);
  const modelRootRef = useRef<THREE.Group>(null);
  const portTransformAnchorRef = useRef<THREE.Group>(null);
  const placementRootRef = useRef<THREE.Group>(null);

  useEffect(() => {
    let mounted = true;
    setLoadedModel(null);
    (async () => {
      try {
        const model = await loadModelObject(modelUrl, modelFormat);
        if (!mounted) return;
        setLoadedModel(model);
      } catch (error) {
        console.warn('Model preview failed', error);
      }
    })();
    return () => { mounted = false; };
  }, [modelUrl, modelFormat]);

  const modelClone = useMemo(() => {
    if (!loadedModel) return null;
    const instance = loadedModel.clone(true);
    if (defaultScale) instance.scale.set(...defaultScale);
    instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const currentMaterial = mesh.material as THREE.Material | THREE.Material[] | undefined;
        const boostMaterial = (material: THREE.Material): THREE.Material => {
          if (material instanceof THREE.MeshStandardMaterial) {
            if (material.color && material.color.getHex() === 0x000000) {
              material.color.set('#aab6c4');
            }
            const tuned = material.clone();
            tuned.color = tuned.color.clone().multiplyScalar(0.8);
            tuned.metalness = Math.min(1, Math.max(0, tuned.metalness ?? 0.16));
            tuned.roughness = Math.min(1, Math.max(0.45, tuned.roughness ?? 0.68));
            tuned.envMapIntensity = Math.min(0.45, Math.max(0.12, tuned.envMapIntensity ?? 0.24));
            tuned.side = THREE.DoubleSide;
            return tuned;
          }
          const fallback = new THREE.MeshStandardMaterial({
            color: (material as any)?.color || '#8793a0',
            metalness: 0.12,
            roughness: 0.76,
            envMapIntensity: 0.2,
            side: THREE.DoubleSide,
          });
          return fallback;
        };
        if (Array.isArray(currentMaterial)) {
          mesh.material = currentMaterial.map((material) => boostMaterial(material));
        } else if (currentMaterial) {
          mesh.material = boostMaterial(currentMaterial);
        } else {
          mesh.material = new THREE.MeshStandardMaterial({ color: '#8793a0', metalness: 0.12, roughness: 0.76, envMapIntensity: 0.2 });
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return instance;
  }, [loadedModel, defaultScale]);

  const previewScale = useMemo(() => {
    if (!modelClone) return 1;
    const box = new THREE.Box3().setFromObject(modelClone);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxDim) || maxDim <= 0) return 1;
    const targetSize = 2.4;
    const scale = targetSize / maxDim;
    return Math.min(12, Math.max(0.015, scale));
  }, [modelClone]);

  const previewGroundLift = useMemo(() => {
    if (!modelClone) return 0;
    const box = new THREE.Box3().setFromObject(modelClone);
    if (!Number.isFinite(box.min.y)) return 0;
    return box.min.y < 0 ? -box.min.y : 0;
  }, [modelClone]);

  if (!modelClone) return null;

  const placementRotationRad: [number, number, number] = [
    ((placementRotationDeg?.[0] || 0) * Math.PI) / 180,
    ((placementRotationDeg?.[1] || 0) * Math.PI) / 180,
    ((placementRotationDeg?.[2] || 0) * Math.PI) / 180,
  ];

  const selectedPort = selectedPortIndex >= 0 ? ports[selectedPortIndex] : null;

  const updatePlacementRotationFromObject = () => {
    if (!placementRootRef.current) return;
    const euler = placementRootRef.current.rotation;
    onPlacementRotationChange([
      Number((THREE.MathUtils.radToDeg(euler.x)).toFixed(2)),
      Number((THREE.MathUtils.radToDeg(euler.y)).toFixed(2)),
      Number((THREE.MathUtils.radToDeg(euler.z)).toFixed(2)),
    ]);
  };

  const updateSelectedPortFromAnchor = () => {
    if (!selectedPort || !portTransformAnchorRef.current) return;
    const p = portTransformAnchorRef.current.position;
    onPortTransform(selectedPortIndex, [
      Number(p.x.toFixed(4)),
      Number(p.y.toFixed(4)),
      Number(p.z.toFixed(4)),
    ]);
  };

  return (
    <group scale={[previewScale, previewScale, previewScale]}>
      <group ref={placementRootRef} rotation={placementRotationRad}>
        <group
          position={[0, previewGroundLift, 0]}
          ref={modelRootRef}
          onPointerDown={(event) => {
            if (!addPortByClick || !modelRootRef.current) return;
            event.stopPropagation();
            const local = modelRootRef.current.worldToLocal(event.point.clone());
            onSurfacePick([local.x, local.y, local.z], portTypeForClick);
          }}
        >
          <primitive object={modelClone} />
          {ports.map((port, idx) => (
            <group
              key={`port-${port.id}`}
              position={port.localPosition}
              onPointerDown={(event) => {
                event.stopPropagation();
                onSelectPort(idx);
              }}
            >
              <mesh>
                <sphereGeometry args={[selectedPortIndex === idx ? 0.1 : 0.08, 14, 10]} />
                <meshStandardMaterial color={PORT_COLOR[port.type]} emissive={PORT_COLOR[port.type]} emissiveIntensity={selectedPortIndex === idx ? 0.7 : 0.45} />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.11, 0.14, 20]} />
                <meshBasicMaterial color={PORT_COLOR[port.type]} transparent opacity={0.7} side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}
          {selectedPort && (
            <group
              ref={portTransformAnchorRef}
              position={selectedPort.localPosition}
            />
          )}
        </group>
        <TransformControls
          object={placementRootRef.current || undefined}
          mode="rotate"
          size={0.85}
          onObjectChange={updatePlacementRotationFromObject}
        />
        {transformPortsEnabled && selectedPort && (
          <TransformControls
            object={portTransformAnchorRef.current || undefined}
            mode="translate"
            size={0.6}
            translationSnap={0.01}
            onObjectChange={updateSelectedPortFromAnchor}
          />
        )}
      </group>
    </group>
  );
};

const OemAdminPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [remoteLibrary, setRemoteLibrary] = useState<OemLibraryIndex>({ companies: [] });
  const [library, setLibrary] = useState<OemLibraryIndex>({ companies: [] });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [clickPortMode, setClickPortMode] = useState(false);
  const [clickPortType, setClickPortType] = useState<'input' | 'output'>('input');
  const [selectedPortIndex, setSelectedPortIndex] = useState<number>(-1);
  const [transformPortsEnabled, setTransformPortsEnabled] = useState(true);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([]);
  const [localPreviewUrls, setLocalPreviewUrls] = useState<Record<string, string>>({});
  const [syncingGithub, setSyncingGithub] = useState(false);
  const [previewFullscreen, setPreviewFullscreen] = useState(false);
  const [syncHistory, setSyncHistory] = useState<SyncHistoryEntry[]>(() => loadSyncHistory());
  const previewUrlsRef = useRef<Record<string, string>>({});

  const isAdmin = isOemAdminUser(user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await fetchOemLibraryIndex();
      const draft = getLocalOemLibraryDraft();
      if (cancelled) return;
      const initial = draft || remote;
      setRemoteLibrary(remote);
      setLibrary(initial);
      const firstCompany = initial.companies[0];
      setSelectedCompanyId(firstCompany?.id || '');
      setSelectedModelId(firstCompany?.models?.[0]?.id || '');
      setLoadingLibrary(false);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    previewUrlsRef.current = localPreviewUrls;
  }, [localPreviewUrls]);

  useEffect(() => {
    return () => {
      Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const selectedCompany = useMemo(
    () => library.companies.find((company) => company.id === selectedCompanyId) || null,
    [library, selectedCompanyId],
  );

  const selectedModel = useMemo(
    () => selectedCompany?.models.find((model) => model.id === selectedModelId) || null,
    [selectedCompany, selectedModelId],
  );

  useEffect(() => {
    setSelectedPortIndex(-1);
  }, [selectedCompanyId, selectedModelId]);

  const previewUrl = useMemo(() => {
    if (!selectedCompany || !selectedModel) return null;
    const localKey = modelKey(selectedCompany.id, selectedModel.id);
    const localPreview = localPreviewUrls[localKey];
    if (localPreview) return localPreview;
    return resolveOemModelGlbUrl(selectedCompany, selectedModel);
  }, [selectedCompany, selectedModel, localPreviewUrls]);


  const updateCompany = (companyId: string, updater: (company: OemCompanyEntry) => OemCompanyEntry) => {
    setLibrary((prev) => ({
      companies: prev.companies.map((company) => (company.id === companyId ? updater(company) : company)),
    }));
  };

  const updateSelectedModel = (updater: (model: OemModelEntry) => OemModelEntry) => {
    if (!selectedCompany || !selectedModel) return;
    updateCompany(selectedCompany.id, (company) => ({
      ...company,
      models: company.models.map((model) => (model.id === selectedModel.id ? updater(model) : model)),
    }));
  };

  const addCompany = () => {
    const name = `OEM Company ${library.companies.length + 1}`;
    const id = slugify(name) || `oem-${Date.now()}`;
    const company: OemCompanyEntry = {
      id,
      name,
      folder: id,
      models: [defaultModel(id)],
    };
    setLibrary((prev) => ({ companies: [...prev.companies, company] }));
    setSelectedCompanyId(company.id);
    setSelectedModelId(company.models[0].id);
    setNotice('');
  };

  const removeCompany = (companyId: string) => {
    const companyToDelete = library.companies.find((company) => company.id === companyId) || null;
    if (companyToDelete) {
      const deletePaths = companyToDelete.models
        .map((model) => resolveOemModelRepoRelativePath(companyToDelete, model))
        .filter((path): path is string => !!path);
      if (deletePaths.length > 0) {
        setPendingDeletes((prev) => Array.from(new Set([...prev, ...deletePaths])));
      }
      setPendingUploads((prev) => prev.filter((entry) => entry.companyId !== companyId));
      setLocalPreviewUrls((prev) => {
        const next = { ...prev };
        for (const model of companyToDelete.models) {
          const key = modelKey(companyToDelete.id, model.id);
          if (next[key]) URL.revokeObjectURL(next[key]);
          delete next[key];
        }
        return next;
      });
    }
    setLibrary((prev) => {
      const nextCompanies = prev.companies.filter((company) => company.id !== companyId);
      if (companyId === selectedCompanyId) {
        setSelectedCompanyId(nextCompanies[0]?.id || '');
        setSelectedModelId(nextCompanies[0]?.models?.[0]?.id || '');
      }
      return { companies: nextCompanies };
    });
    setNotice('');
  };

  const addModel = () => {
    if (!selectedCompany) return;
    const model = defaultModel(selectedCompany.id, `OEM Model ${selectedCompany.models.length + 1}`);
    updateCompany(selectedCompany.id, (company) => ({ ...company, models: [...company.models, model] }));
    setSelectedModelId(model.id);
    setNotice('');
  };

  const removeModel = (modelId: string) => {
    if (!selectedCompany) return;
    const removed = selectedCompany.models.find((model) => model.id === modelId) || null;
    if (removed) {
      const path = resolveOemModelRepoRelativePath(selectedCompany, removed);
      if (path) {
        setPendingDeletes((prev) => Array.from(new Set([...prev, path])));
      }
      setPendingUploads((prev) => prev.filter((entry) => !(entry.companyId === selectedCompany.id && entry.modelId === modelId)));
      const key = modelKey(selectedCompany.id, modelId);
      setLocalPreviewUrls((prev) => {
        const next = { ...prev };
        if (next[key]) URL.revokeObjectURL(next[key]);
        delete next[key];
        return next;
      });
    }
    updateCompany(selectedCompany.id, (company) => {
      const models = company.models.filter((model) => model.id !== modelId);
      if (modelId === selectedModelId) setSelectedModelId(models[0]?.id || '');
      return { ...company, models };
    });
    setNotice('');
  };

  const addPort = () => {
    const nextIndex = (selectedModel?.connectionPorts?.length || 0);
    updateSelectedModel((model) => ({
      ...model,
      connectionPorts: [
        ...(model.connectionPorts || []),
        { id: `input-${(model.connectionPorts?.length || 0) + 1}`, type: 'input', localPosition: [0, 0, 0] },
      ],
    }));
    setSelectedPortIndex(nextIndex);
    setNotice('');
  };

  const addPortFromSurfacePick = (localPos: [number, number, number], type: 'input' | 'output') => {
    const nextPortIndex = (selectedModel?.connectionPorts?.length || 0);
    updateSelectedModel((model) => {
      const nextIndex = (model.connectionPorts?.length || 0) + 1;
      const nextPort: OemConnectionPortInput = {
        id: `${type === 'input' ? 'in' : 'out'}-${nextIndex}`,
        type,
        localPosition: [
          Number(localPos[0].toFixed(4)),
          Number(localPos[1].toFixed(4)),
          Number(localPos[2].toFixed(4)),
        ],
      };
      return {
        ...model,
        connectionPorts: [...(model.connectionPorts || []), nextPort],
      };
    });
    setSelectedPortIndex(nextPortIndex);
    setNotice(`Added ${type} node snapped on model surface.`);
  };

  const updatePort = (index: number, updater: (port: OemConnectionPortInput) => OemConnectionPortInput) => {
    updateSelectedModel((model) => ({
      ...model,
      connectionPorts: (model.connectionPorts || []).map((port, idx) => (idx === index ? updater(port) : port)),
    }));
    setNotice('');
  };

  const removePort = (index: number) => {
    updateSelectedModel((model) => ({
      ...model,
      connectionPorts: (model.connectionPorts || []).filter((_, idx) => idx !== index),
    }));
    setSelectedPortIndex((prev) => {
      if (prev === index) return -1;
      if (prev > index) return prev - 1;
      return prev;
    });
    setNotice('');
  };

  const setPlacementRotationDeg = (rotationDeg: [number, number, number]) => {
    updateSelectedModel((model) => ({ ...model, defaultRotationDeg: rotationDeg }));
    setNotice('');
  };

  const updatePortFromTransform = (index: number, localPos: [number, number, number]) => {
    updatePort(index, (p) => ({ ...p, localPosition: localPos }));
  };

  const saveDraft = () => {
    saveLocalOemLibraryDraft(library);
    setNotice('Draft saved locally. OEM tab uses this draft immediately after refresh.');
  };

  const resetToRemote = () => {
    clearLocalOemLibraryDraft();
    Object.values(localPreviewUrls).forEach((url) => URL.revokeObjectURL(url));
    setLocalPreviewUrls({});
    setPendingUploads([]);
    setPendingDeletes([]);
    setLibrary(remoteLibrary);
    setSelectedCompanyId(remoteLibrary.companies[0]?.id || '');
    setSelectedModelId(remoteLibrary.companies[0]?.models?.[0]?.id || '');
    setNotice('Local draft cleared. Reverted to remote source.');
  };

  const downloadIndexJson = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'oem-library-backup.oemlib';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importIndexJson = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || '{}'));
        if (!Array.isArray(parsed?.companies)) throw new Error('Invalid format');
        setLibrary(parsed as OemLibraryIndex);
        setSelectedCompanyId(parsed.companies[0]?.id || '');
        setSelectedModelId(parsed.companies[0]?.models?.[0]?.id || '');
        setNotice('Imported OEM library backup.');
      } catch {
        setNotice('Failed to import library backup file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const importModelFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedCompany || !selectedModel) return;
    const format = inferModelFormat(file.name);
    const reader = new FileReader();
    reader.onload = async () => {
      const buffer = reader.result;
      if (!(buffer instanceof ArrayBuffer)) {
        setNotice('Failed to read model file.');
        return;
      }

      const bytes = new Uint8Array(buffer);
      const contentBase64 = bytesToBase64(bytes);
      const objectUrl = URL.createObjectURL(file);
      const key = modelKey(selectedCompany.id, selectedModel.id);

      let inferredScale: [number, number, number] | undefined;
      const hasCustomScale = Array.isArray(selectedModel.defaultScale)
        && selectedModel.defaultScale.some((value) => Math.abs(value - 1) > 0.0001);
      if ((format === 'glb' || format === 'gltf') && !hasCustomScale) {
        try {
          const probe = await loadModelObject(objectUrl, format);
          const probeBox = new THREE.Box3().setFromObject(probe);
          const probeSize = probeBox.getSize(new THREE.Vector3());
          const maxDim = Math.max(probeSize.x, probeSize.y, probeSize.z);
          if (Number.isFinite(maxDim) && maxDim > 5) {
            inferredScale = [0.001, 0.001, 0.001];
          }
        } catch {
          // Keep default scale if probing fails.
        }
      }

      updateSelectedModel((model) => ({
        ...model,
        modelFormat: format as OemModelFormat,
        glbPath: file.name,
        glbUrl: '',
        defaultScale: inferredScale || model.defaultScale,
      }));

      setPendingUploads((prev) => {
        const next = prev.filter((entry) => !(entry.companyId === selectedCompany.id && entry.modelId === selectedModel.id));
        next.push({
          companyId: selectedCompany.id,
          modelId: selectedModel.id,
          contentBase64,
          sizeBytes: bytes.length,
        });
        return next;
      });
      setLocalPreviewUrls((prev) => {
        const next = { ...prev };
        if (next[key]) URL.revokeObjectURL(next[key]);
        next[key] = objectUrl;
        return next;
      });
      setNotice(`${file.name} imported (${format.toUpperCase()})${inferredScale ? ' with mm scaling applied' : ''}. It will be uploaded on next sync.`);
    };
    reader.readAsArrayBuffer(file);
    event.target.value = '';
  };

  const syncToGithub = async () => {
    try {
      setSyncingGithub(true);
      const payload = {
        index: library,
        uploads: pendingUploads,
        deletions: pendingDeletes,
      };
      const syncEndpoints = [
        '/admin/oem-library/sync',
        '/api/admin/oem-library/sync',
        '/oem-library/sync',
        '/api/oem-library/sync',
      ];
      if (window.location.hostname.endsWith('metamechsolutions.com')) {
        syncEndpoints.push('https://api.metamechsolutions.com/admin/oem-library/sync');
        syncEndpoints.push('https://api.metamechsolutions.com/api/admin/oem-library/sync');
        syncEndpoints.push('https://api.metamechsolutions.com/oem-library/sync');
        syncEndpoints.push('https://api.metamechsolutions.com/api/oem-library/sync');
      }
      let res: any = null;
      let lastError: any = null;
      for (const endpoint of Array.from(new Set(syncEndpoints))) {
        try {
          res = await api.post(endpoint, payload);
          break;
        } catch (endpointError: any) {
          lastError = endpointError;
          const status = Number(endpointError?.response?.status || 0);
          const isEndpointMissing = status === 404 || status === 405 || status === 501 || status === 0;
          if (!isEndpointMissing) throw endpointError;
        }
      }
      if (!res) {
        const status = Number(lastError?.response?.status || 0);
        const message = String(lastError?.response?.data?.error || lastError?.message || 'Route not found');
        const routeMissing = status === 404 || status === 405 || /route not found/i.test(message);
        if (routeMissing) {
          saveLocalOemLibraryDraft(library);
          setNotice('Remote sync endpoint is not deployed yet. Draft saved locally. Cloudflare OEM sync will work once API deploy is updated.');
          return;
        }
        throw lastError || new Error('Route not found');
      }
      const uploadedCount = Number(res?.data?.uploadedCount || 0);
      const deletedCount = Number(res?.data?.deletedCount || 0);
      const indexUpdated = !!res?.data?.indexUpdated;
      const backend = String(res?.data?.backend || 'remote');
      const historyEntry: SyncHistoryEntry = {
        timestampIso: new Date().toISOString(),
        uploadedCount,
        deletedCount,
        backend,
      };
      setSyncHistory((prev) => {
        const next = [historyEntry, ...prev].slice(0, 12);
        saveSyncHistory(next);
        return next;
      });
      setPendingUploads([]);
      setPendingDeletes([]);
      // A successful server sync means remote is source-of-truth.
      // Clear old local draft so stale URLs/paths do not override main app rendering.
      clearLocalOemLibraryDraft();
      const refreshedRemote = await fetchOemLibraryIndex();
      setRemoteLibrary(refreshedRemote);
      setLibrary(refreshedRemote);
      const selectedCompanyAfterSync = refreshedRemote.companies.find((company) => company.id === selectedCompanyId);
      if (!selectedCompanyAfterSync) {
        setSelectedCompanyId(refreshedRemote.companies[0]?.id || '');
        setSelectedModelId(refreshedRemote.companies[0]?.models?.[0]?.id || '');
      } else if (!selectedCompanyAfterSync.models.find((model) => model.id === selectedModelId)) {
        setSelectedModelId(selectedCompanyAfterSync.models[0]?.id || '');
      }
      setNotice(`Library synced (${backend}): index ${indexUpdated ? 'updated' : 'unchanged'}, uploads ${uploadedCount}, deletions ${deletedCount}.`);
    } catch (error: any) {
      const message = error?.response?.data?.error || error?.message || 'Library sync failed';
      setNotice(`Library sync failed: ${message}`);
    } finally {
      setSyncingGithub(false);
    }
  };

  const renderPreviewCanvas = () => (
    <Canvas
      shadows
      camera={{ position: [3.4, 2.4, 3.6], fov: 45 }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 0.96;
      }}
    >
      <color attach="background" args={['#f3f6fb']} />
      <fog attach="fog" args={['#f3f6fb', 12, 36]} />
      <ambientLight intensity={0.48} />
      <hemisphereLight args={['#ffffff', '#dbe4f0', 0.58]} />
      <directionalLight position={[5, 8, 5]} intensity={1.15} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
      <directionalLight position={[-4, 4, -3]} intensity={0.55} />
      <pointLight position={[0, 3.5, 0]} intensity={0.25} />
      <Environment preset="studio" />
      <Grid args={[10, 10]} cellSize={0.5} cellThickness={0.4} sectionSize={2} sectionThickness={0.9} fadeDistance={28} fadeStrength={1} />
      {selectedModel && previewUrl && (
        <Bounds fit observe margin={1.2}>
          <InteractiveModelPreview
            modelUrl={previewUrl}
            modelFormat={selectedModel.modelFormat}
            defaultScale={selectedModel.defaultScale}
            placementRotationDeg={selectedModel.defaultRotationDeg}
            ports={selectedModel.connectionPorts || []}
            selectedPortIndex={selectedPortIndex}
            transformPortsEnabled={transformPortsEnabled}
            addPortByClick={clickPortMode}
            portTypeForClick={clickPortType}
            onSelectPort={setSelectedPortIndex}
            onPortTransform={updatePortFromTransform}
            onPlacementRotationChange={setPlacementRotationDeg}
            onSurfacePick={addPortFromSurfacePick}
          />
        </Bounds>
      )}
      <ContactShadows position={[0, -0.001, 0]} opacity={0.45} blur={2.8} far={8} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </Canvas>
  );

  if (loading || loadingLibrary) {
    return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>Loading OEM admin…</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, border: '1px solid var(--mm-border)', borderRadius: 12, padding: 20, background: 'var(--mm-bg-panel)' }}>
          <h2 style={{ marginTop: 0 }}>Admin access required</h2>
          <p style={{ color: 'var(--mm-text-tertiary)' }}>
            This OEM management page is restricted to administrators.
          </p>
          <button onClick={() => navigate('/dashboard')} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-surface)', cursor: 'pointer' }}>
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="oem-admin-page" style={{ minHeight: '100vh', background: 'var(--mm-bg-app)', color: 'var(--mm-text-primary)' }}>
      <style>
        {`
          .oem-admin-page {
            --mm-bg-app: #f5f7fb;
            --mm-bg-panel: #ffffff;
            --mm-bg-surface: #ffffff;
            --mm-bg-input: #ffffff;
            --mm-border: #d7dee9;
            --mm-border-subtle: #e5eaf2;
            --mm-text-primary: #0f172a;
            --mm-text-secondary: #1f2937;
            --mm-text-tertiary: #334155;
            --mm-accent-primary: #2563eb;
            --mm-accent-primary-muted: #dbeafe;
          }
          .oem-admin-page input,
          .oem-admin-page select,
          .oem-admin-page textarea {
            background: #ffffff;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 8px 10px;
            font-size: 12px;
          }
          .oem-admin-page input::placeholder,
          .oem-admin-page textarea::placeholder {
            color: #64748b;
          }
        `}
      </style>
      <header style={{ padding: '12px 20px', borderBottom: '1px solid var(--mm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/dashboard" style={{ color: 'var(--mm-text-secondary)', textDecoration: 'none', display: 'inline-flex' }}>
            <ArrowLeft size={16} />
          </Link>
          <strong>OEM 3D Model Admin</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={OEM_LIBRARY_MANAGE_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', padding: '8px 10px', border: '1px solid var(--mm-border)', borderRadius: 8, color: 'var(--mm-text-primary)' }}>
            Open Library Source
          </a>
          <button
            onClick={syncToGithub}
            disabled={syncingGithub}
            style={{ padding: '8px 10px', border: '1px solid #bfdbfe', borderRadius: 8, background: '#dbeafe', color: '#0f172a', cursor: syncingGithub ? 'not-allowed' : 'pointer', opacity: syncingGithub ? 0.7 : 1 }}
          >
            {syncingGithub ? 'Syncing…' : 'Sync Library'}
          </button>
          <button onClick={saveDraft} style={{ padding: '8px 10px', border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-accent-primary-muted)', color: '#0f172a', cursor: 'pointer' }}>
            <Save size={14} style={{ marginRight: 6 }} />Save Draft
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr) 460px', gap: 12, padding: 12, alignItems: 'start' }}>
        <aside style={{ border: '1px solid var(--mm-border)', borderRadius: 10, background: 'var(--mm-bg-panel)', padding: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 13 }}>OEM Companies</strong>
            <button onClick={addCompany} style={{ border: '1px solid var(--mm-border)', background: 'var(--mm-bg-surface)', borderRadius: 8, padding: 6, cursor: 'pointer' }}><Plus size={14} /></button>
          </div>
          {library.companies.map((company) => (
            <div key={company.id} style={{ marginBottom: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: selectedCompanyId === company.id ? 'var(--mm-accent-primary-muted)' : 'transparent' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button onClick={() => { setSelectedCompanyId(company.id); setSelectedModelId(company.models[0]?.id || ''); }} style={{ flex: 1, textAlign: 'left', background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer' }}>
                  <Building2 size={13} style={{ marginRight: 6, verticalAlign: -2 }} />
                  {company.name}
                </button>
                <button onClick={() => removeCompany(company.id)} style={{ border: 'none', background: 'transparent', color: 'var(--mm-text-tertiary)', cursor: 'pointer' }}><Trash2 size={13} /></button>
              </div>
            </div>
          ))}
        </aside>

        <section style={{ border: '1px solid var(--mm-border)', borderRadius: 10, background: 'var(--mm-bg-panel)', padding: 12, maxHeight: 'calc(100vh - 92px)', overflowY: 'auto' }}>
          {!selectedCompany ? (
            <div style={{ color: 'var(--mm-text-tertiary)' }}>Create a company to begin.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <input value={selectedCompany.name} onChange={(e) => updateCompany(selectedCompany.id, (company) => ({ ...company, name: e.target.value }))} placeholder="Company name" />
                <input value={selectedCompany.folder || ''} onChange={(e) => updateCompany(selectedCompany.id, (company) => ({ ...company, folder: e.target.value }))} placeholder="Library folder name" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>Models</strong>
                <button onClick={addModel} style={{ border: '1px solid var(--mm-border)', background: 'var(--mm-bg-surface)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                  <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Add model
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 10 }}>
                <div style={{ maxHeight: 620, overflow: 'auto', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 6 }}>
                  {selectedCompany.models.map((model) => (
                    <div key={model.id} style={{ padding: 8, borderRadius: 6, marginBottom: 6, background: selectedModelId === model.id ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)' }}>
                      <button onClick={() => setSelectedModelId(model.id)} style={{ width: '100%', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{model.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>{model.id}</div>
                      </button>
                      <button onClick={() => removeModel(model.id)} style={{ marginTop: 6, border: 'none', background: 'transparent', color: 'var(--mm-text-tertiary)', cursor: 'pointer' }}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>

                {selectedModel ? (
                  <div style={{ display: 'grid', gap: 8 }}>
                    <input
                      value={selectedModel.id}
                      onChange={(e) => {
                        const nextId = slugify(e.target.value) || selectedModel.id;
                        const prevId = selectedModel.id;
                        if (nextId === prevId) return;
                        setPendingUploads((prev) => prev.map((entry) => (
                          entry.companyId === selectedCompany.id && entry.modelId === prevId
                            ? { ...entry, modelId: nextId }
                            : entry
                        )));
                        setLocalPreviewUrls((prev) => {
                          const next = { ...prev };
                          const oldKey = modelKey(selectedCompany.id, prevId);
                          const newKey = modelKey(selectedCompany.id, nextId);
                          if (next[oldKey]) {
                            next[newKey] = next[oldKey];
                            delete next[oldKey];
                          }
                          return next;
                        });
                        updateSelectedModel((model) => ({ ...model, id: nextId }));
                        setSelectedModelId(nextId);
                      }}
                      placeholder="Model ID"
                    />
                    <input value={selectedModel.name} onChange={(e) => updateSelectedModel((model) => ({ ...model, name: e.target.value }))} placeholder="Model Name" />
                    <textarea value={selectedModel.description || ''} onChange={(e) => updateSelectedModel((model) => ({ ...model, description: e.target.value }))} placeholder="Description" rows={2} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px', gap: 8 }}>
                      <select value={selectedModel.placementCategory || 'environment'} onChange={(e) => updateSelectedModel((model) => ({ ...model, placementCategory: e.target.value as any }))}>
                        <option value="environment">Environment placement</option>
                        <option value="process">Process placement</option>
                        <option value="actors">Actors placement</option>
                      </select>
                      <input type="number" min={0} step={0.01} value={selectedModel.priceUsd ?? 0} onChange={(e) => updateSelectedModel((model) => ({ ...model, priceUsd: Number(e.target.value) }))} placeholder="Unit Price" />
                      <select
                        value={(selectedModel.priceCurrency || 'EUR') as OemCurrency}
                        onChange={(e) => updateSelectedModel((model) => ({ ...model, priceCurrency: e.target.value as OemCurrency }))}
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                        <option value="INR">INR</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <select value={selectedModel.modelFormat || 'glb'} onChange={(e) => updateSelectedModel((model) => ({ ...model, modelFormat: e.target.value as OemModelFormat }))}>
                        <option value="glb">GLB</option>
                        <option value="gltf">GLTF</option>
                        <option value="obj">OBJ</option>
                        <option value="step">STEP / STP / IGES</option>
                      </select>
                      <label style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '8px 10px', cursor: 'pointer', fontSize: 12 }}>
                        Import 3D model file
                        <input
                          type="file"
                          accept=".glb,.gltf,.obj,.step,.stp,.iges,.igs"
                          onChange={importModelFile}
                          style={{ display: 'none' }}
                        />
                      </label>
                    </div>
                    <input value={selectedModel.glbPath || ''} onChange={(e) => updateSelectedModel((model) => ({ ...model, glbPath: e.target.value }))} placeholder="model path in company folder (e.g. robot.obj / machine.step)" />
                    <input value={selectedModel.glbUrl || ''} onChange={(e) => updateSelectedModel((model) => ({ ...model, glbUrl: e.target.value }))} placeholder="model URL or imported data URL" />
                    <input value={selectedModel.thumbnailUrl || ''} onChange={(e) => updateSelectedModel((model) => ({ ...model, thumbnailUrl: e.target.value }))} placeholder="thumbnailUrl (optional)" />

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {(selectedModel.defaultScale || [1, 1, 1]).map((value, idx) => (
                        <input
                          key={idx}
                          type="number"
                          step={0.1}
                          value={value}
                          onChange={(e) => {
                            const next: [number, number, number] = [...(selectedModel.defaultScale || [1, 1, 1])] as [number, number, number];
                            next[idx] = Number(e.target.value);
                            updateSelectedModel((model) => ({ ...model, defaultScale: next }));
                          }}
                          placeholder={['Scale X', 'Scale Y', 'Scale Z'][idx]}
                        />
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                      {(selectedModel.defaultRotationDeg || [0, 0, 0]).map((value, idx) => (
                        <input
                          key={`rot-${idx}`}
                          type="number"
                          step={1}
                          value={value}
                          onChange={(e) => {
                            const next: [number, number, number] = [...(selectedModel.defaultRotationDeg || [0, 0, 0])] as [number, number, number];
                            next[idx] = Number(e.target.value);
                            updateSelectedModel((model) => ({ ...model, defaultRotationDeg: next }));
                          }}
                          placeholder={['Rotate X°', 'Rotate Y°', 'Rotate Z°'][idx]}
                        />
                      ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}>
                      <span style={{ color: 'var(--mm-text-tertiary)' }}>
                        Placement rotation is saved and used when dropping this OEM part in Main Simulation.
                      </span>
                      <button
                        onClick={() => updateSelectedModel((model) => ({ ...model, defaultRotationDeg: [0, 0, 0] }))}
                        style={{ border: '1px solid var(--mm-border)', borderRadius: 6, background: 'var(--mm-bg-surface)', cursor: 'pointer', padding: '2px 8px' }}
                      >
                        Reset Rotation
                      </button>
                    </div>

                    <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: 12 }}>Model Nodes / Ports (admin only)</strong>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={clickPortType} onChange={(e) => setClickPortType(e.target.value as 'input' | 'output')} style={{ fontSize: 12 }}>
                            <option value="input">Input node</option>
                            <option value="output">Output node</option>
                          </select>
                          <button
                            onClick={() => setClickPortMode((prev) => !prev)}
                            style={{
                              border: '1px solid var(--mm-border)',
                              borderRadius: 6,
                              background: clickPortMode ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                              color: 'var(--mm-text-primary)',
                              cursor: 'pointer',
                              padding: '2px 8px',
                            }}
                          >
                            {clickPortMode ? 'Click-to-add: ON' : 'Click-to-add: OFF'}
                          </button>
                          <button
                            onClick={() => setTransformPortsEnabled((prev) => !prev)}
                            style={{ border: '1px solid var(--mm-border)', borderRadius: 6, background: transformPortsEnabled ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)', cursor: 'pointer', padding: '2px 8px' }}
                          >
                            {transformPortsEnabled ? 'Port Gizmo: ON' : 'Port Gizmo: OFF'}
                          </button>
                          <button onClick={addPort} style={{ border: '1px solid var(--mm-border)', borderRadius: 6, background: 'var(--mm-bg-surface)', cursor: 'pointer', padding: '2px 8px' }}>+ Manual Port</button>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginBottom: 6 }}>
                        Tip: click a node marker in 3D preview to select it, then drag with gizmo for precise placement.
                      </div>
                      {(selectedModel.connectionPorts || []).map((port, idx) => (
                        <div
                          key={`${port.id}-${idx}`}
                          onClick={() => setSelectedPortIndex(idx)}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 90px repeat(3,80px) 34px',
                            gap: 6,
                            marginBottom: 6,
                            border: selectedPortIndex === idx ? '1px solid var(--mm-accent-primary)' : '1px solid transparent',
                            borderRadius: 6,
                            padding: 4,
                            cursor: 'pointer',
                          }}
                        >
                          <input value={port.id} onChange={(e) => updatePort(idx, (p) => ({ ...p, id: e.target.value }))} placeholder="Port ID" />
                          <select value={port.type} onChange={(e) => updatePort(idx, (p) => ({ ...p, type: e.target.value as 'input' | 'output' }))}>
                            <option value="input">Input</option>
                            <option value="output">Output</option>
                          </select>
                          {port.localPosition.map((value, axis) => (
                            <input
                              key={axis}
                              type="number"
                              step={0.1}
                              value={value}
                              onChange={(e) => updatePort(idx, (p) => {
                                const local: [number, number, number] = [...p.localPosition];
                                local[axis] = Number(e.target.value);
                                return { ...p, localPosition: local };
                              })}
                              placeholder={['X', 'Y', 'Z'][axis]}
                            />
                          ))}
                          <button onClick={() => removePort(idx)} style={{ border: 'none', background: 'transparent', color: 'var(--mm-text-tertiary)', cursor: 'pointer' }}><Trash2 size={12} /></button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ color: 'var(--mm-text-tertiary)' }}>Select or create a model.</div>
                )}
              </div>
            </>
          )}
        </section>

        <aside style={{ border: '1px solid var(--mm-border)', borderRadius: 10, background: 'var(--mm-bg-panel)', padding: 10, position: 'sticky', top: 10, maxHeight: 'calc(100vh - 92px)', overflow: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 13 }}>Premium 3D Preview</strong>
            <button
              onClick={() => setPreviewFullscreen(true)}
              style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Maximize2 size={13} />
              Fullscreen
            </button>
          </div>
          <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, overflow: 'hidden', height: 420 }}>
            {previewUrl ? renderPreviewCanvas() : (
              <div style={{ padding: 10, color: 'var(--mm-text-tertiary)', fontSize: 12 }}>
                Add <code>model path/URL</code> or import a local <code>.OBJ/.STEP/.GLB</code> file.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={downloadIndexJson} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '6px 10px', cursor: 'pointer' }}>
              <Download size={13} style={{ marginRight: 4, verticalAlign: -2 }} />Export Library
            </button>
            <label style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '6px 10px', cursor: 'pointer' }}>
              <Upload size={13} style={{ marginRight: 4, verticalAlign: -2 }} />Import Library
              <input type="file" accept=".json,.oemlib" onChange={importIndexJson} style={{ display: 'none' }} />
            </label>
            <button onClick={resetToRemote} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '6px 10px', cursor: 'pointer' }}>
              Reset from Remote
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 10, lineHeight: 1.5 }}>
            Millimeter workflow active for imported CAD assets. Import OBJ/STEP/GLB, place nodes by clicking geometry, then sync updates to Cloudflare storage.
          </p>
          <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 6 }}>
            Pending changes: uploads <strong>{pendingUploads.length}</strong>, deletions <strong>{pendingDeletes.length}</strong>
          </div>
          <div style={{ marginTop: 10, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mm-text-primary)', marginBottom: 6 }}>Sync History</div>
            {syncHistory.length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>No successful server sync yet.</div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {syncHistory.map((entry, idx) => (
                  <div key={`${entry.timestampIso}-${idx}`} style={{ fontSize: 10, color: 'var(--mm-text-secondary)', border: '1px solid var(--mm-border-subtle)', borderRadius: 6, padding: '5px 6px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--mm-text-primary)' }}>{formatSyncTimestamp(entry.timestampIso)}</div>
                    <div>Backend: <strong>{entry.backend}</strong></div>
                    <div>Uploads: <strong>{entry.uploadedCount}</strong> • Deletions: <strong>{entry.deletedCount}</strong></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {notice && <div style={{ fontSize: 11, color: '#0f172a', marginTop: 8, fontWeight: 600 }}>{notice}</div>}
        </aside>
      </div>

      {previewFullscreen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(248, 250, 252, 0.96)',
            zIndex: 80,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #d7dee9' }}>
            <strong>Fullscreen OEM 3D Preview</strong>
            <button onClick={() => setPreviewFullscreen(false)} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', padding: '6px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Minimize2 size={14} />
              Exit Fullscreen
            </button>
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {previewUrl ? renderPreviewCanvas() : (
              <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--mm-text-tertiary)' }}>
                No model selected for preview.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OemAdminPage;

