import React, { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEditorStore } from '../store/editorStore';
import TopBar from '../components/editor/TopBar';
import LeftPanel from '../components/editor/LeftPanel';
import RightPanel from '../components/editor/RightPanel';
import Viewport from '../components/editor/Viewport';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const {
    loadScene,
    setSelectedObject,
    setTransformMode,
  } = useEditorStore();

  useEffect(() => {
    if (!id) {
      navigate('/dashboard');
      return;
    }

    // Load project data
    loadProjectData(id);
    
    // Keyboard shortcuts
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return; // Don't handle shortcuts when typing
      }

      switch (event.key.toLowerCase()) {
        case 'w':
          setTransformMode('translate');
          break;
        case 'e':
          setTransformMode('rotate');
          break;
        case 'r':
          setTransformMode('scale');
          break;
        case 'escape':
          setSelectedObject(null, null);
          break;
        case 'delete':
        case 'backspace':
          // Handle delete selected object
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [id]);

  const loadProjectData = async (projectId: string) => {
    try {
      // In a real implementation, this would fetch from the API
      // For now, we'll load an empty scene
      loadScene({});
    } catch (error) {
      console.error('Failed to load project:', error);
      navigate('/dashboard');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Top Bar */}
      <TopBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Module Library */}
        <LeftPanel />

        {/* Center - 3D Viewport */}
        <div className="flex-1 relative bg-gray-900">
          <Viewport />
        </div>

        {/* Right Panel - Properties Inspector */}
        <RightPanel />
      </div>
    </div>
  );
};

export default EditorPage;