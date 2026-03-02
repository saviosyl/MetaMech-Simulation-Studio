import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import { getProject, updateProject } from '../utils/api';
import { pushHistory, undo, redo } from '../store/historyMiddleware';
import TopBar from '../components/editor/TopBar';
import LeftPanel from '../components/editor/LeftPanel';
import RightPanel from '../components/editor/RightPanel';
import Viewport from '../components/editor/Viewport';
import ContextMenu from '../components/editor/ContextMenu';
import StatsPanel from '../components/editor/StatsPanel';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projectName, setProjectName] = useState('Untitled Project');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; objectId: string | null; objectType: 'process' | 'environment' | 'actor' | null } | null>(null);
  const lastChangeRef = useRef(0);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

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
  } = useEditorStore();

  // Track changes for undo history
  useEffect(() => {
    pushHistory(useEditorStore.getState());
  }, [processNodes, environmentAssets, actors, edges]);

  // Load project
  useEffect(() => {
    if (!id) {
      navigate('/dashboard');
      return;
    }
    loadProjectData(id);
  }, [id]);

  // Auto-save every 60 seconds
  useEffect(() => {
    lastChangeRef.current = Date.now();
  }, [processNodes, environmentAssets, actors, edges]);

  useEffect(() => {
    autoSaveTimerRef.current = setInterval(() => {
      if (id && Date.now() - lastChangeRef.current < 60000 && lastChangeRef.current > 0) {
        handleSave();
      }
    }, 60000);
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current); };
  }, [id]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;

      // Undo/Redo
      if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          redo(useEditorStore.setState, useEditorStore.getState);
        } else {
          undo(useEditorStore.setState, useEditorStore.getState);
        }
        return;
      }

      // Save
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'w': setTransformMode('translate'); break;
        case 'e': setTransformMode('rotate'); break;
        case 'r': setTransformMode('scale'); break;
        case 'escape': setSelectedObject(null, null); setContextMenu(null); break;
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
    } catch (error) {
      console.error('Failed to load project:', error);
      // Fallback: load empty scene
      loadScene({});
    }
  };

  const handleSave = useCallback(async () => {
    if (!id) return;
    setSaveStatus('saving');
    try {
      await updateProject(id, { name: projectName, data: getSceneData() });
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
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <TopBar
        projectName={projectName}
        setProjectName={setProjectName}
        saveStatus={saveStatus}
        onSave={handleSave}
      />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <div className="flex-1 relative bg-gray-900 min-w-0" onContextMenu={handleContextMenu}>
          <Viewport />
          <StatsPanel />
        </div>
        <RightPanel />
      </div>

      {/* Context Menu */}
      {contextMenu && (
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
