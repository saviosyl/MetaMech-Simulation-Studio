import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderOpen, Calendar, MoreHorizontal, Copy, Trash2, LogOut, User, Download, Upload, Factory, Boxes, Stethoscope, Bot, Layout } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';
import api from '../utils/api';
import { simulationUrls } from '../content/simulationMarketingContent';

const LOCAL_PROJECTS_KEY = 'metamech_projects';
interface LocalProject { id: number; name: string; data: any; created_at: string; updated_at: string; }

function getLocalProjects(): LocalProject[] {
  try { return JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) || '[]'); } catch { return []; }
}
function saveLocalProjects(projects: LocalProject[]) {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
}

const TEMPLATES = [
  { name: 'Conveyor Line', icon: Layout, desc: 'Straight conveyor layout with source and sink' },
  { name: 'FMCG End-of-Line', icon: Factory, desc: 'Carton erector → packing → palletizing' },
  { name: 'Medical Cleanroom', icon: Stethoscope, desc: 'Stainless conveyors with cleanroom assets' },
  { name: 'Palletizing Cell', icon: Boxes, desc: 'Robot palletizer with pallet handling' },
  { name: 'Robot Transfer', icon: Bot, desc: 'Robot pick-and-place between conveyors' },
];

const DashboardPage: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMenu, setShowMenu] = useState<number | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [useLocal, setUseLocal] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { fetchProjects(); }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects); setUseLocal(false);
    } catch {
      setUseLocal(true); setProjects(getLocalProjects());
    } finally { setLoading(false); }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      if (!useLocal) {
        const response = await api.post('/projects', { name: newProjectName.trim() });
        setProjects(prev => [response.data.project, ...prev]);
      } else {
        const newProj: LocalProject = { id: Date.now(), name: newProjectName.trim(), data: {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        const updated = [newProj, ...getLocalProjects()];
        saveLocalProjects(updated); setProjects(updated);
      }
      setNewProjectName(''); setShowCreateModal(false);
    } catch (error: any) { setError(error.response?.data?.error || 'Failed to create project'); }
    finally { setIsCreating(false); }
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Delete "${project.name}"?`)) return;
    try {
      if (!useLocal) { await api.delete(`/projects/${project.id}`); }
      else { saveLocalProjects(getLocalProjects().filter(p => p.id !== project.id)); }
      setProjects(prev => prev.filter(p => p.id !== project.id)); setShowMenu(null);
    } catch (error: any) { setError(error.response?.data?.error || 'Failed to delete'); }
  };

  const openProject = (project: Project) => {
    if (useLocal) {
      localStorage.setItem('metamech_autosave', JSON.stringify(project.data || {}));
      localStorage.setItem('metamech_autosave_name', project.name);
      localStorage.setItem('metamech_active_project_id', String(project.id));
      navigate('/demo');
    } else { navigate(`/editor/${project.id}`); }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const imported: LocalProject = { id: Date.now(), name: data.projectName || file.name.replace(/\.json$/, ''), data: data.scene || data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        const updated = [imported, ...getLocalProjects()];
        saveLocalProjects(updated); setProjects(updated);
      } catch { setError('Invalid project file'); }
    };
    reader.readAsText(file); event.target.value = '';
  };

  const exportProject = (project: Project) => {
    const blob = new Blob([JSON.stringify({ version: '1.0', projectName: project.name, savedAt: new Date().toISOString(), scene: project.data }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.metamech.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); setShowMenu(null);
  };

  const duplicateProject = (project: Project) => {
    const dup: LocalProject = { id: Date.now(), name: `${project.name} (Copy)`, data: project.data ? JSON.parse(JSON.stringify(project.data)) : {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    const updated = [dup, ...getLocalProjects()]; saveLocalProjects(updated); setProjects(updated); setShowMenu(null);
  };

  const fmtDate = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const S: Record<string, React.CSSProperties> = {
    page: { minHeight: '100vh', background: 'var(--mm-bg-app)', fontFamily: "'Inter', sans-serif", color: 'var(--mm-text-primary)' },
    header: { background: 'var(--mm-bg-panel)', borderBottom: '1px solid var(--mm-border)', padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    brandLogo: { width: 204, height: 40, objectFit: 'cover' as const, objectPosition: 'center 45%' as const, borderRadius: 10 },
    section: { padding: '28px 32px' },
    sectionTitle: { fontSize: 18, fontWeight: 700, color: 'var(--mm-text-primary)', marginBottom: 4, fontFamily: "'Orbitron', monospace" },
    sectionSub: { fontSize: 13, color: 'var(--mm-text-tertiary)', marginBottom: 20 },
    btnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 18px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg, #0891b2, #06b6d4)', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' },
    btnGhost: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13, fontWeight: 500, color: 'var(--mm-text-secondary)', background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border)', borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s' },
    card: { background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 10, overflow: 'visible', position: 'relative', transition: 'box-shadow 0.15s, border-color 0.15s', cursor: 'pointer' },
    cardBody: { padding: '16px 18px', position: 'relative' },
    cardTitle: { fontSize: 14, fontWeight: 600, color: 'var(--mm-text-primary)', marginBottom: 4 },
    cardDate: { fontSize: 11, color: 'var(--mm-text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 },
    cardThumb: { height: 100, background: 'var(--mm-bg-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--mm-border-subtle)', borderTopLeftRadius: 10, borderTopRightRadius: 10 },
    templateCard: { background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', alignItems: 'flex-start', gap: 12 },
    modal: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24 },
    modalCard: { background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: '28px 24px', width: '100%', maxWidth: 400 },
    dropdown: { position: 'absolute' as const, right: 0, top: 30, background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 8, boxShadow: 'var(--mm-shadow-lg)', zIndex: 220, minWidth: 160, padding: '4px 0' },
    dropItem: { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 14px', fontSize: 13, color: 'var(--mm-text-secondary)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' as const },
  };

  if (loading) {
    return (
      <div style={{ ...S.page, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid var(--mm-border)', borderTopColor: 'var(--mm-accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--mm-text-tertiary)', fontSize: 13 }}>Loading projects…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      {/* Header */}
      <header style={S.header}>
        <a href={simulationUrls.productHome} style={{ display: 'inline-flex', textDecoration: 'none' }} title="Simulation home">
          <img src="/simulation-studio-logo.png" alt="Simulation Studio" style={S.brandLogo} />
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--mm-text-secondary)' }}>
            <User size={14} />
            <span>{user?.displayName}</span>
          </div>
          <button onClick={logout} style={{ ...S.btnGhost, padding: '6px 12px', fontSize: 12 }}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </header>

      {/* Actions Row */}
      <div style={S.section}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h2 style={S.sectionTitle}>Projects</h2>
            <p style={{ ...S.sectionSub, marginBottom: 0 }}>
              {useLocal ? 'Saved locally on this device' : 'Your simulation projects'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} style={S.btnGhost}>
              <Upload size={14} /> Import
            </button>
            <input ref={fileInputRef} type="file" accept=".json,.metamech.json" onChange={handleImportFile} style={{ display: 'none' }} />
            <button onClick={() => navigate('/demo')} style={S.btnGhost}>Quick Demo</button>
            <button onClick={() => navigate('/frame-designer-demo')} style={S.btnGhost}>Frame Designer</button>
            <button onClick={() => setShowCreateModal(true)} style={S.btnPrimary}>
              <Plus size={14} /> New Project
            </button>
          </div>
        </div>

        {error && (
          <div style={{ background: 'var(--mm-accent-danger-muted)', border: '1px solid rgba(248,113,113,0.3)', color: 'var(--mm-accent-danger)', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', color: 'var(--mm-accent-danger)', cursor: 'pointer', fontSize: 16 }}>×</button>
          </div>
        )}

        {/* Quick Start Templates */}
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--mm-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Quick Start Templates</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              return (
                <div key={t.name} style={S.templateCard}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--mm-accent-primary)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--mm-accent-primary-muted)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--mm-border-subtle)'; (e.currentTarget as HTMLDivElement).style.background = 'var(--mm-bg-surface)'; }}
                  onClick={() => navigate('/demo')}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--mm-accent-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} style={{ color: 'var(--mm-accent-primary)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--mm-text-primary)', marginBottom: 2 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', lineHeight: 1.4 }}>{t.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Project Cards */}
        {projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <FolderOpen size={24} style={{ color: 'var(--mm-text-tertiary)' }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>No projects yet</h3>
            <p style={{ fontSize: 13, color: 'var(--mm-text-tertiary)', marginBottom: 20 }}>Create a project or try a template above</p>
            <button onClick={() => setShowCreateModal(true)} style={S.btnPrimary}>
              <Plus size={14} /> Create Project
            </button>
          </div>
        ) : (
          <>
            <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--mm-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Recent Projects</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
              {projects.map(project => (
                <div key={project.id} style={S.card}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--mm-shadow-md)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--mm-border-strong)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--mm-border)'; }}
                  onClick={() => openProject(project)}
                >
                  <div style={S.cardThumb}>
                    <FolderOpen size={20} style={{ color: 'var(--mm-text-disabled)' }} />
                  </div>
                  <div style={S.cardBody}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={S.cardTitle}>{project.name}</div>
                        <div style={S.cardDate}>
                          <Calendar size={11} /> {fmtDate(project.updated_at)}
                        </div>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(showMenu === project.id ? null : project.id); }}
                          style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)', padding: 0, borderRadius: 6, cursor: 'pointer', color: 'var(--mm-text-tertiary)' }}>
                          <MoreHorizontal size={14} />
                        </button>
                        {showMenu === project.id && (
                          <div style={S.dropdown} onClick={e => e.stopPropagation()}>
                            <button style={S.dropItem} onClick={() => duplicateProject(project)}><Copy size={13} /> Duplicate</button>
                            <button style={S.dropItem} onClick={() => exportProject(project)}><Download size={13} /> Export</button>
                            <button style={{ ...S.dropItem, color: 'var(--mm-accent-danger)' }} onClick={() => deleteProject(project)}><Trash2 size={13} /> Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={S.modal} onClick={() => { setShowCreateModal(false); setNewProjectName(''); }}>
          <div style={S.modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 18 }}>New Project</h3>
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--mm-text-secondary)', marginBottom: 6, display: 'block' }}>Project Name</label>
              <input type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createProject()}
                placeholder="My Conveyor Layout" autoFocus
                style={{ width: '100%', padding: '10px 14px', fontSize: 14, background: 'var(--mm-bg-input)', border: '1px solid var(--mm-border)', borderRadius: 8, color: 'var(--mm-text-primary)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setShowCreateModal(false); setNewProjectName(''); }} style={{ ...S.btnGhost, flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button onClick={createProject} disabled={!newProjectName.trim() || isCreating} style={{ ...S.btnPrimary, flex: 1, justifyContent: 'center', opacity: (!newProjectName.trim() || isCreating) ? 0.5 : 1 }}>
                {isCreating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMenu && <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setShowMenu(null)} />}
    </div>
  );
};

export default DashboardPage;
