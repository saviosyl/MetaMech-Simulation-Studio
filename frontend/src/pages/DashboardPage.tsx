import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  FolderOpen, 
  Calendar, 
  MoreHorizontal, 
  Copy, 
  Trash2,
  LogOut,
  User,
  Download,
  Upload,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';
import api from '../utils/api';

// ─── Local project storage (no backend required) ──────────────
const LOCAL_PROJECTS_KEY = 'metamech_projects';

interface LocalProject {
  id: number;
  name: string;
  data: any;
  created_at: string;
  updated_at: string;
}

function getLocalProjects(): LocalProject[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_PROJECTS_KEY) || '[]');
  } catch { return []; }
}

function saveLocalProjects(projects: LocalProject[]) {
  localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
}

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

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await api.get('/projects');
      setProjects(response.data.projects);
      setUseLocal(false);
    } catch {
      // Backend unavailable — use localStorage
      setUseLocal(true);
      setProjects(getLocalProjects());
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    setIsCreating(true);

    try {
      if (!useLocal) {
        const response = await api.post('/projects', { name: newProjectName.trim() });
        setProjects(prev => [response.data.project, ...prev]);
      } else {
        const newProj: LocalProject = {
          id: Date.now(),
          name: newProjectName.trim(),
          data: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updated = [newProj, ...getLocalProjects()];
        saveLocalProjects(updated);
        setProjects(updated);
      }
      setNewProjectName('');
      setShowCreateModal(false);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteProject = async (project: Project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"?`)) return;
    try {
      if (!useLocal) {
        await api.delete(`/projects/${project.id}`);
      } else {
        const updated = getLocalProjects().filter(p => p.id !== project.id);
        saveLocalProjects(updated);
      }
      setProjects(prev => prev.filter(p => p.id !== project.id));
      setShowMenu(null);
    } catch (error: any) {
      setError(error.response?.data?.error || 'Failed to delete project');
    }
  };

  const openProject = (project: Project) => {
    if (useLocal) {
      // Load local project into editor via localStorage
      localStorage.setItem('metamech_autosave', JSON.stringify(project.data || {}));
      localStorage.setItem('metamech_autosave_name', project.name);
      localStorage.setItem('metamech_active_project_id', String(project.id));
      navigate('/demo');
    } else {
      navigate(`/editor/${project.id}`);
    }
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const imported: LocalProject = {
          id: Date.now(),
          name: data.projectName || file.name.replace('.metamech.json', '').replace('.json', ''),
          data: data.scene || data,
          created_at: data.savedAt || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const updated = [imported, ...getLocalProjects()];
        saveLocalProjects(updated);
        setProjects(updated);
      } catch {
        setError('Invalid project file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const exportProject = (project: Project) => {
    const projectData = {
      version: '1.0',
      projectName: project.name,
      projectNumber: `MM-${project.id.toString(36).toUpperCase()}`,
      savedAt: new Date().toISOString(),
      scene: project.data,
    };
    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}.metamech.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowMenu(null);
  };

  const duplicateProject = (project: Project) => {
    const dup: LocalProject = {
      id: Date.now(),
      name: `${project.name} (Copy)`,
      data: project.data ? JSON.parse(JSON.stringify(project.data)) : {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const updated = [dup, ...getLocalProjects()];
    saveLocalProjects(updated);
    setProjects(updated);
    setShowMenu(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              <span className="text-teal-600">MetaMech</span> Studio
            </h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User size={16} />
                <span>{user?.displayName}</span>
                {user?.role === 'admin' && (
                  <span className="bg-teal-100 text-teal-700 text-xs px-2 py-0.5 rounded-full font-medium">Admin</span>
                )}
              </div>
              <button onClick={logout} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
                <LogOut size={16} /> Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Projects</h2>
            <p className="text-gray-600">
              {useLocal ? 'Projects saved locally on this device' : 'Create and manage your industrial simulations'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              <Upload size={18} /> Import
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,.metamech.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => navigate('/demo')}
              className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Quick Demo
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors shadow-md"
            >
              <Plus size={20} /> New Project
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button onClick={() => setError('')} className="float-right text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <FolderOpen size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-medium text-gray-900 mb-2">No projects yet</h3>
            <p className="text-gray-600 mb-6">Create your first simulation or try the quick demo.</p>
            <div className="flex items-center gap-3 justify-center">
              <button
                onClick={() => navigate('/demo')}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Open Demo
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                Create Project
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div key={project.id} className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow border border-gray-200 relative">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg text-gray-900 mb-1 line-clamp-2">{project.name}</h3>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar size={14} className="mr-1" />
                        {formatDate(project.updated_at)}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowMenu(showMenu === project.id ? null : project.id)}
                        className="p-1 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreHorizontal size={16} className="text-gray-400" />
                      </button>
                      {showMenu === project.id && (
                        <div className="absolute right-0 top-8 bg-white shadow-lg rounded-lg border border-gray-200 py-2 z-10 min-w-[160px]">
                          <button onClick={() => openProject(project)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                            <FolderOpen size={14} /> Open
                          </button>
                          <button onClick={() => duplicateProject(project)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                            <Copy size={14} /> Duplicate
                          </button>
                          <button onClick={() => exportProject(project)} className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2">
                            <Download size={14} /> Export
                          </button>
                          <button onClick={() => deleteProject(project)} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-600 flex items-center gap-2">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg h-32 mb-4 flex items-center justify-center border border-teal-100">
                    <div className="text-teal-400 text-center">
                      <FolderOpen size={24} className="mx-auto mb-2" />
                      <span className="text-xs">Simulation Project</span>
                    </div>
                  </div>
                  <button
                    onClick={() => openProject(project)}
                    className="w-full bg-teal-50 text-teal-700 py-2 px-4 rounded-lg font-medium hover:bg-teal-100 transition-colors border border-teal-200"
                  >
                    Open Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Project</h3>
            <div className="mb-4">
              <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">Project Name</label>
              <input
                id="projectName" type="text" value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createProject()}
                placeholder="Enter project name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowCreateModal(false); setNewProjectName(''); }}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors" disabled={isCreating}>
                Cancel
              </button>
              <button onClick={createProject}
                disabled={!newProjectName.trim() || isCreating}
                className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                {isCreating ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showMenu && <div className="fixed inset-0 z-0" onClick={() => setShowMenu(null)} />}
    </div>
  );
};

export default DashboardPage;
