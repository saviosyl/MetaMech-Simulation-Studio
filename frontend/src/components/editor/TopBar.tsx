import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, 
  Pause, 
  Square, 
  Save, 
  Download,
  Upload,
  ArrowLeft,
  Gauge,
  Undo2,
  Redo2,
  Check,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useAuth } from '../../contexts/AuthContext';
import { canUndo, canRedo, undo, redo } from '../../store/historyMiddleware';
import { SaveStatus } from '../../pages/EditorPage';

interface TopBarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  saveStatus: SaveStatus;
  onSave: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ projectName, setProjectName, saveStatus, onSave }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isPlaying,
    simulationSpeed,
    play,
    pause,
    reset,
    setSimulationSpeed,
    getSceneData,
    loadScene,
  } = useEditorStore();

  const speedOptions = [
    { value: 0.25, label: '0.25x' },
    { value: 0.5, label: '0.5x' },
    { value: 1, label: '1x' },
    { value: 2, label: '2x' },
    { value: 4, label: '4x' },
  ];

  const handleExport = () => {
    const sceneData = getSceneData();
    const dataStr = JSON.stringify(sceneData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}.metamech-sim.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        loadScene(data);
      } catch (err) {
        console.error('Failed to import file:', err);
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  const handleUndo = () => undo(useEditorStore.setState, useEditorStore.getState);
  const handleRedo = () => redo(useEditorStore.setState, useEditorStore.getState);

  const saveIcon = () => {
    switch (saveStatus) {
      case 'saving': return <Loader2 size={16} className="animate-spin" />;
      case 'saved': return <Check size={16} />;
      case 'error': return <AlertCircle size={16} />;
      default: return <Save size={16} />;
    }
  };

  const saveLabel = () => {
    switch (saveStatus) {
      case 'saving': return 'Saving...';
      case 'saved': return 'Saved';
      case 'error': return 'Error';
      default: return 'Save';
    }
  };

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline">Dashboard</span>
        </button>
        
        <div className="h-6 w-px bg-gray-300" />
        
        {/* Project Name */}
        {isEditing ? (
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="text-lg font-semibold text-gray-900 bg-transparent border-b border-teal-500 outline-none"
            autoFocus
          />
        ) : (
          <h1
            onClick={() => setIsEditing(true)}
            className="text-lg font-semibold text-gray-900 cursor-pointer hover:text-teal-600"
          >
            {projectName}
          </h1>
        )}

        <div className="h-6 w-px bg-gray-300" />

        {/* Undo/Redo */}
        <button onClick={handleUndo} className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30" title="Undo (Ctrl+Z)">
          <Undo2 size={18} />
        </button>
        <button onClick={handleRedo} className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={18} />
        </button>
      </div>

      {/* Center Section - Simulation Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={isPlaying ? pause : play}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            isPlaying 
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' 
              : 'bg-teal-100 text-teal-700 hover:bg-teal-200'
          }`}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          <span className="hidden sm:inline">
            {isPlaying ? 'Pause' : 'Play'}
          </span>
        </button>
        
        <button
          onClick={reset}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Square size={16} />
          <span className="hidden sm:inline">Reset</span>
        </button>

        {/* Speed Control */}
        <div className="flex items-center gap-2 ml-4">
          <Gauge size={16} className="text-gray-600" />
          <select
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            {speedOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            saveStatus === 'saved' ? 'bg-green-600 text-white' :
            saveStatus === 'error' ? 'bg-red-600 text-white' :
            'bg-teal-600 text-white hover:bg-teal-700'
          }`}
        >
          {saveIcon()}
          <span className="hidden sm:inline">{saveLabel()}</span>
        </button>

        <button
          onClick={handleImport}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="Import .metamech-sim.json"
        >
          <Upload size={16} />
          <span className="hidden sm:inline">Import</span>
        </button>
        
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Download size={16} />
          <span className="hidden sm:inline">Export</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.metamech-sim.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="h-6 w-px bg-gray-300 mx-2" />

        {/* User Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <div className="w-8 h-8 bg-teal-600 text-white rounded-full flex items-center justify-center font-medium">
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="hidden md:inline">{user?.displayName}</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
