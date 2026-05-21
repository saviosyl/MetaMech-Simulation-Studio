import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import { getProject, updateProject } from '../utils/api';
import { pushHistory, undo, redo } from '../store/historyMiddleware';
import TopBar from '../components/editor/TopBar';
import LeftPanel from '../components/editor/LeftPanel';
import RightPanel from '../components/editor/RightPanel';
import Viewport from '../components/editor/Viewport';
import ContextMenu from '../components/editor/ContextMenu';
import BottomPanel from '../components/editor/BottomPanel';
import ShortcutsPanel from '../components/editor/ShortcutsPanel';
import SimulationBomPanel from '../components/editor/SimulationBomPanel';
import { takePendingFrameAssemblyExport } from '../lib/frameDesigner/sceneInterop';
import HelpSupportModal from '../components/editor/HelpSupportModal';
import OnboardingTour from '../components/editor/OnboardingTour';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const EditorPage: React.FC = () => {
  const ONBOARDING_KEY = 'metamech_onboarding_v1_completed';
  const { id } = useParams<{ id: string }>();

  const [projectName, setProjectName] = useState('Untitled Project');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string | null; objectType: 'process' | 'environment' | 'actor' | null } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [bomOpen, setBomOpen] = useState(false);
  const lastChangeRef = useRef(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    loadScene,
    setSelectedObject,
    setTransformMode,
    selectedObjectId,
    selectedObjectType,
    removeObject,
    getSceneData,
    processNodes,
    environmentAssets,
    actors,
    edges,
    gridSnap,
    setGridSnap,
    measureActive,
    setMeasureActive,
    setShowShortcuts,
    showShortcuts,
    selectAll,
    requestFocus,
    presentationMode,
    setPresentationMode,
  } = useEditorStore();

  const importPendingFrameAssembly = useCallback(() => {
    const pending = takePendingFrameAssemblyExport();
    if (!pending) return;
    useEditorStore.getState().insertFrameAssembly(pending, [0, 0, 0]);
  }, []);

  // Track changes for undo history
  useEffect(() => {
    pushHistory(useEditorStore.getState());
  }, [processNodes, environmentAssets, actors, edges]);

  // Load project (or start with empty scene in demo mode)
  useEffect(() => {
    if (id) {
      loadProjectData(id);
    } else {
      // Demo mode: try to restore from localStorage
      const saved = localStorage.getItem('metamech_autosave');
      const savedName = localStorage.getItem('metamech_autosave_name');
      if (saved) {
        try {
          const data = JSON.parse(saved);
          // Migrate old spiral-conveyor params to new format
          const scene = data.scene || data;
          const nodes = scene.processNodes || scene.nodes || [];
          for (const n of nodes) {
            if (n.type === 'spiral-conveyor' && n.parameters) {
              const p = n.parameters;
              // Migrate old params: diameter/totalHeight/infeedAngle → new params
              if (p.diameter && !p.infeedHeight) {
                p.infeedHeight = 800;
                p.outfeedHeight = (p.totalHeight || 3000) + 800;
                p.outfeedAngle = p.outfeedAngle || 180;
                delete p.diameter;
                delete p.totalHeight;
                delete p.risePerTurn;
                delete p.infeedAngle;
              }
            }
          }
          loadScene(scene);
          importPendingFrameAssembly();
          if (savedName) setProjectName(savedName);
        } catch {
          localStorage.removeItem('metamech_autosave');
          localStorage.removeItem('metamech_autosave_name');
          loadScene({});
          importPendingFrameAssembly();
        }
      } else {
        loadScene({});
        importPendingFrameAssembly();
      }
    }
  }, [id]);

  // First-launch guided tour (runs once per browser profile)
  useEffect(() => {
    try {
      const completed = localStorage.getItem(ONBOARDING_KEY) === '1';
      if (completed) return;
      const t = setTimeout(() => setTourOpen(true), 700);
      return () => clearTimeout(t);
    } catch {
      // ignore storage errors
    }
  }, []);

  const completeTour = useCallback(() => {
    try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch { /* ignore */ }
    setTourOpen(false);
  }, []);

  // Auto-save every 60 seconds (only when backend is available)
  useEffect(() => {
    lastChangeRef.current = Date.now();
  }, [processNodes, environmentAssets, actors, edges]);

  useEffect(() => {
    if (!id) return;
    autoSaveTimerRef.current = setInterval(() => {
      if (Date.now() - lastChangeRef.current < 60000 && lastChangeRef.current > 0) {
        handleSave();
      }
    }, 60000);
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current); };
  }, [id]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo(useEditorStore.setState, useEditorStore.getState);
        } else {
          undo(useEditorStore.setState, useEditorStore.getState);
        }
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'a') {
        event.preventDefault();
        selectAll();
        return;
      }

      // Copy/Paste
      if ((event.metaKey || event.ctrlKey) && event.key === 'c') {
        event.preventDefault();
        useEditorStore.getState().copySelected();
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === 'v') {
        event.preventDefault();
        useEditorStore.getState().pasteClipboard();
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'w': setTransformMode('translate'); break;
        case 'e': setTransformMode('rotate'); break;
        case 'r': setTransformMode('scale'); break;
        case 'g': setGridSnap(!gridSnap); break;
        case 'm': setMeasureActive(!measureActive); break;
        case 'f': requestFocus(); break;
        case '?': setShowShortcuts(!showShortcuts); break;
        // Numpad camera views
        case '7': useEditorStore.getState().setCameraView('top'); break;
        case '1': useEditorStore.getState().setCameraView('front'); break;
        case '3': useEditorStore.getState().setCameraView('right'); break;
        case '5': useEditorStore.getState().setCameraView(
          useEditorStore.getState().cameraMode === 'orthographic' ? 'perspective' : 'top'
        ); break;
        case 'escape':
          if (presentationMode) { setPresentationMode(false); break; }
          setSelectedObject(null, null); setContextMenu(null); setShowShortcuts(false); break;
        case 'delete':
        case 'backspace':
          if (selectedObjectId && selectedObjectType) {
            removeObject(selectedObjectId, selectedObjectType);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedObjectId, selectedObjectType]);

  const loadProjectData = async (projectId: string) => {
    try {
      const project = await getProject(projectId);
      setProjectName(project.name || 'Untitled Project');
      loadScene(project.data || {});
      importPendingFrameAssembly();
    } catch (error) {
      console.error('Failed to load project:', error);
      loadScene({});
      importPendingFrameAssembly();
    }
  };

  const handleSave = useCallback(async () => {
    setSaveStatus('saving');
    try {
      if (id) {
        // Backend save (when connected to API)
        await updateProject(id, { name: projectName, data: getSceneData() });
      } else {
        // Local save — overwrite existing project in localStorage
        const sceneData = getSceneData();
        const projectData = {
          version: '1.0',
          projectName,
          savedAt: new Date().toISOString(),
          scene: sceneData,
        };
        const dataStr = JSON.stringify(projectData, null, 2);

        // Save to autosave slot
        localStorage.setItem('metamech_autosave', dataStr);
        localStorage.setItem('metamech_autosave_name', projectName);

        // Update the project in local projects list (overwrite, don't create new)
        const activeId = localStorage.getItem('metamech_active_project_id');
        if (activeId) {
          try {
            const projects = JSON.parse(localStorage.getItem('metamech_projects') || '[]');
            const idx = projects.findIndex((p: any) => String(p.id) === activeId);
            if (idx >= 0) {
              projects[idx].data = sceneData;
              projects[idx].name = projectName;
              projects[idx].updated_at = new Date().toISOString();
              localStorage.setItem('metamech_projects', JSON.stringify(projects));
            }
          } catch { /* ignore parse errors */ }
        }
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [id, projectName, getSceneData]);

  const handleContextMenu = useCallback((event: React.MouseEvent) => {
    event.preventDefault();
    const state = useEditorStore.getState();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      objectId: state.selectedObjectId,
      objectType: state.selectedObjectType,
    });
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: 'var(--mm-bg-app)' }}>
      {!presentationMode && (
        <TopBar
          projectName={projectName}
          setProjectName={setProjectName}
          saveStatus={saveStatus}
          onSave={handleSave}
          onOpenHelpSupport={() => setHelpOpen(true)}
          bomOpen={bomOpen}
          onToggleBom={() => setBomOpen((prev) => !prev)}
        />
      )}
      <div className="flex-1 flex overflow-hidden min-h-0" style={{ borderTop: presentationMode ? 'none' : '1px solid var(--mm-border-subtle)' }}>
        {!presentationMode && (
          <div className="flex-shrink-0">
            <LeftPanel />
          </div>
        )}
        <div 
          className="flex-1 relative min-w-0 overflow-hidden"
          style={{ borderLeft: presentationMode ? 'none' : '1px solid var(--mm-border-subtle)', borderRight: presentationMode ? 'none' : '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-viewport)' }}
          onContextMenu={handleContextMenu}
        >
          <Viewport />
          {!presentationMode && <BottomPanel />}
        </div>
        {!presentationMode && (
          <div className="flex-shrink-0">
            <RightPanel />
          </div>
        )}
      </div>

      {/* Presentation mode overlay — minimal controls */}
      {presentationMode && (
        <div style={{
          position: 'absolute', bottom: 20, right: 20, display: 'flex', gap: 8, zIndex: 50,
        }}>
          <button
            onClick={() => {
              const canvas = document.querySelector('canvas');
              if (canvas) {
                const link = document.createElement('a');
                link.download = `metamech-screenshot-${Date.now()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
              }
            }}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8,
              background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}
          >
            📷 Screenshot
          </button>
          <button
            onClick={() => setPresentationMode(false)}
            style={{
              padding: '8px 16px', fontSize: 12, fontWeight: 600, borderRadius: 8,
              background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
              cursor: 'pointer', backdropFilter: 'blur(8px)',
            }}
          >
            ✕ Exit
          </button>
        </div>
      )}

      {!presentationMode && <ShortcutsPanel />}
      {!presentationMode && (
        <SimulationBomPanel open={bomOpen} onClose={() => setBomOpen(false)} />
      )}
      {!presentationMode && (
        <>
          <HelpSupportModal
            open={helpOpen}
            onClose={() => setHelpOpen(false)}
            onStartTour={() => {
              setHelpOpen(false);
              setTourOpen(true);
            }}
          />
          <OnboardingTour
            open={tourOpen}
            onClose={completeTour}
            onComplete={completeTour}
          />
        </>
      )}

      {contextMenu && !presentationMode && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          objectId={contextMenu.objectId}
          objectType={contextMenu.objectType}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

export default EditorPage;
