import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { Grid, OrbitControls } from '@react-three/drei';
import { ArrowLeft, Building2, Download, Plus, Save, Trash2, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isOemAdminUser } from '../lib/adminAccess';
import {
  clearLocalOemLibraryDraft,
  fetchGithubOemLibraryIndex,
  getLocalOemLibraryDraft,
  OEM_LIBRARY_MANAGE_URL,
  OemCompanyEntry,
  OemConnectionPortInput,
  OemLibraryIndex,
  OemModelEntry,
  resolveOemModelGlbUrl,
  saveLocalOemLibraryDraft,
} from '../lib/oemLibrary';
import GLBModel from '../components/3d/GLBModel';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function defaultModel(companyId: string, modelName = 'New OEM Model'): OemModelEntry {
  const base = slugify(modelName) || `model-${Date.now()}`;
  return {
    id: base,
    name: modelName,
    description: '',
    placementCategory: 'environment',
    glbPath: '',
    glbUrl: '',
    thumbnailUrl: '',
    defaultScale: [1, 1, 1],
    priceUsd: 0,
    connectionPorts: [],
  };
}

const OemAdminPage: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [githubLibrary, setGithubLibrary] = useState<OemLibraryIndex>({ companies: [] });
  const [library, setLibrary] = useState<OemLibraryIndex>({ companies: [] });
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [notice, setNotice] = useState<string>('');
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  const isAdmin = isOemAdminUser(user);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const github = await fetchGithubOemLibraryIndex();
      const draft = getLocalOemLibraryDraft();
      if (cancelled) return;
      const initial = draft || github;
      setGithubLibrary(github);
      setLibrary(initial);
      const firstCompany = initial.companies[0];
      setSelectedCompanyId(firstCompany?.id || '');
      setSelectedModelId(firstCompany?.models?.[0]?.id || '');
      setLoadingLibrary(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const selectedCompany = useMemo(
    () => library.companies.find((company) => company.id === selectedCompanyId) || null,
    [library, selectedCompanyId],
  );

  const selectedModel = useMemo(
    () => selectedCompany?.models.find((model) => model.id === selectedModelId) || null,
    [selectedCompany, selectedModelId],
  );

  const previewUrl = useMemo(() => {
    if (!selectedCompany || !selectedModel) return null;
    return resolveOemModelGlbUrl(selectedCompany, selectedModel);
  }, [selectedCompany, selectedModel]);

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
    updateCompany(selectedCompany.id, (company) => {
      const models = company.models.filter((model) => model.id !== modelId);
      if (modelId === selectedModelId) setSelectedModelId(models[0]?.id || '');
      return { ...company, models };
    });
    setNotice('');
  };

  const addPort = () => {
    updateSelectedModel((model) => ({
      ...model,
      connectionPorts: [
        ...(model.connectionPorts || []),
        { id: `input-${(model.connectionPorts?.length || 0) + 1}`, type: 'input', localPosition: [0, 0, 0] },
      ],
    }));
    setNotice('');
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
    setNotice('');
  };

  const saveDraft = () => {
    saveLocalOemLibraryDraft(library);
    setNotice('Draft saved locally. OEM tab uses this draft immediately after refresh.');
  };

  const resetToGithub = () => {
    clearLocalOemLibraryDraft();
    setLibrary(githubLibrary);
    setSelectedCompanyId(githubLibrary.companies[0]?.id || '');
    setSelectedModelId(githubLibrary.companies[0]?.models?.[0]?.id || '');
    setNotice('Local draft cleared. Reverted to GitHub source.');
  };

  const downloadIndexJson = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'oem-index.json';
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
        setNotice('Imported OEM index JSON.');
      } catch {
        setNotice('Failed to import JSON file.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

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
    <div style={{ minHeight: '100vh', background: 'var(--mm-bg-app)', color: 'var(--mm-text-primary)' }}>
      <header style={{ padding: '12px 20px', borderBottom: '1px solid var(--mm-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link to="/dashboard" style={{ color: 'var(--mm-text-secondary)', textDecoration: 'none', display: 'inline-flex' }}>
            <ArrowLeft size={16} />
          </Link>
          <strong>OEM 3D Model Admin</strong>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href={OEM_LIBRARY_MANAGE_URL} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', padding: '8px 10px', border: '1px solid var(--mm-border)', borderRadius: 8, color: 'var(--mm-text-primary)' }}>
            Open GitHub Folder
          </a>
          <button onClick={saveDraft} style={{ padding: '8px 10px', border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-accent-primary-muted)', color: 'var(--mm-accent-primary)', cursor: 'pointer' }}>
            <Save size={14} style={{ marginRight: 6 }} />Save Draft
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr 420px', gap: 12, padding: 12 }}>
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

        <section style={{ border: '1px solid var(--mm-border)', borderRadius: 10, background: 'var(--mm-bg-panel)', padding: 12 }}>
          {!selectedCompany ? (
            <div style={{ color: 'var(--mm-text-tertiary)' }}>Create a company to begin.</div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                <input value={selectedCompany.name} onChange={(e) => updateCompany(selectedCompany.id, (company) => ({ ...company, name: e.target.value }))} placeholder="Company name" />
                <input value={selectedCompany.folder || ''} onChange={(e) => updateCompany(selectedCompany.id, (company) => ({ ...company, folder: e.target.value }))} placeholder="GitHub folder name" />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <strong style={{ fontSize: 13 }}>Models</strong>
                <button onClick={addModel} style={{ border: '1px solid var(--mm-border)', background: 'var(--mm-bg-surface)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                  <Plus size={14} style={{ marginRight: 4, verticalAlign: -2 }} />Add model
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 10 }}>
                <div style={{ maxHeight: 460, overflow: 'auto', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 6 }}>
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
                    <input value={selectedModel.id} onChange={(e) => updateSelectedModel((model) => ({ ...model, id: slugify(e.target.value) || model.id }))} placeholder="Model ID" />
                    <input value={selectedModel.name} onChange={(e) => updateSelectedModel((model) => ({ ...model, name: e.target.value }))} placeholder="Model Name" />
                    <textarea value={selectedModel.description || ''} onChange={(e) => updateSelectedModel((model) => ({ ...model, description: e.target.value }))} placeholder="Description" rows={2} />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <select value={selectedModel.placementCategory || 'environment'} onChange={(e) => updateSelectedModel((model) => ({ ...model, placementCategory: e.target.value as any }))}>
                        <option value="environment">Environment placement</option>
                        <option value="process">Process placement</option>
                        <option value="actors">Actors placement</option>
                      </select>
                      <input type="number" min={0} step={0.01} value={selectedModel.priceUsd ?? 0} onChange={(e) => updateSelectedModel((model) => ({ ...model, priceUsd: Number(e.target.value) }))} placeholder="Price USD" />
                    </div>
                    <input value={selectedModel.glbPath || ''} onChange={(e) => updateSelectedModel((model) => ({ ...model, glbPath: e.target.value }))} placeholder="glbPath (inside company folder)" />
                    <input value={selectedModel.glbUrl || ''} onChange={(e) => updateSelectedModel((model) => ({ ...model, glbUrl: e.target.value }))} placeholder="glbUrl (optional absolute URL)" />
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

                    <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <strong style={{ fontSize: 12 }}>Model Nodes / Ports (admin only)</strong>
                        <button onClick={addPort} style={{ border: '1px solid var(--mm-border)', borderRadius: 6, background: 'var(--mm-bg-surface)', cursor: 'pointer', padding: '2px 8px' }}>+ Port</button>
                      </div>
                      {(selectedModel.connectionPorts || []).map((port, idx) => (
                        <div key={`${port.id}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 90px repeat(3,80px) 34px', gap: 6, marginBottom: 6 }}>
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

        <aside style={{ border: '1px solid var(--mm-border)', borderRadius: 10, background: 'var(--mm-bg-panel)', padding: 10 }}>
          <strong style={{ fontSize: 13 }}>3D Model Preview Editor</strong>
          <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, overflow: 'hidden', height: 280 }}>
            {previewUrl ? (
              <Canvas shadows camera={{ position: [3, 2.2, 3], fov: 50 }}>
                <ambientLight intensity={0.8} />
                <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
                <Grid args={[8, 8]} cellSize={0.4} cellThickness={0.5} sectionSize={1.6} sectionThickness={1} fadeDistance={20} fadeStrength={1} />
                <React.Suspense fallback={null}>
                  <GLBModel url={previewUrl} targetSize={2} isSelected={false} />
                </React.Suspense>
                <OrbitControls />
              </Canvas>
            ) : (
              <div style={{ padding: 10, color: 'var(--mm-text-tertiary)', fontSize: 12 }}>
                Add <code>glbPath</code> or <code>glbUrl</code> to preview.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button onClick={downloadIndexJson} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '6px 10px', cursor: 'pointer' }}>
              <Download size={13} style={{ marginRight: 4, verticalAlign: -2 }} />Export JSON
            </button>
            <label style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '6px 10px', cursor: 'pointer' }}>
              <Upload size={13} style={{ marginRight: 4, verticalAlign: -2 }} />Import JSON
              <input type="file" accept=".json" onChange={importIndexJson} style={{ display: 'none' }} />
            </label>
            <button onClick={resetToGithub} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', padding: '6px 10px', cursor: 'pointer' }}>
              Reset to GitHub
            </button>
          </div>

          <p style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 10, lineHeight: 1.5 }}>
            Admin workflow: save draft here, export JSON, then commit updated <code>oem-library/index.json</code> and model files to GitHub.
          </p>
          {notice && <div style={{ fontSize: 11, color: 'var(--mm-accent-primary)', marginTop: 8 }}>{notice}</div>}
        </aside>
      </div>
    </div>
  );
};

export default OemAdminPage;

