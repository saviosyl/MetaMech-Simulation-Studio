import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEditorStore } from '../store/editorStore';
import TopBar from '../components/editor/TopBar';
import LeftPanel from '../components/editor/LeftPanel';
import RightPanel from '../components/editor/RightPanel';
import Viewport from '../components/editor/Viewport';

const EditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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

    loadProjectData(id);
    
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
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
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [id]);

  const loadProjectData = async (_projectId: string) => {
    try {
      loadScene({});
    } catch (error) {
      console.error('Failed to load project:', error);
      navigate('/dashboard');
    }
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <div className="flex-1 relative bg-gray-900 min-w-0">
          <Viewport />
        </div>
        <RightPanel />
      </div>
    </div>
  );
};

export default EditorPage;
