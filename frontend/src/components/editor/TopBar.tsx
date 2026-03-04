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
  Grid3X3,
  Ruler,
  HelpCircle,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useAuth } from '../../contexts/AuthContext';
import { undo, redo } from '../../store/historyMiddleware';
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
    isPaused,
    simulationSpeed,
    play,
    pause,
    reset,
    setSimulationSpeed,
    getSceneData,
    loadScene,
    gridSnap,
    setGridSnap,
    measureActive,
    setMeasureActive,
    cameraPresets,
    setCameraPreset,
    setShowShortcuts,
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
    <div className="bg-slate-800/90 backdrop-blur-sm border-b border-slate-700/50 px-6 py-3 flex items-center justify-between shadow-lg">
      {/* Left Section */}
      <div className="flex items-center gap-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-slate-300 hover:text-cyan-400 font-medium transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="hidden sm:inline font-['Orbitron']">MetaMech</span>
        </button>
        
        <div className="h-6 w-px bg-slate-600" />
        
        {/* Project Name */}
        {isEditing ? (
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="text-lg font-semibold text-white bg-transparent border-b border-cyan-400 outline-none font-['Orbitron']"
            autoFocus
          />
        ) : (
          <h1
            onClick={() => setIsEditing(true)}
            className="text-lg font-semibold text-white cursor-pointer hover:text-cyan-400 transition-colors font-['Orbitron']"
          >
            {projectName}
          </h1>
        )}

        <div className="h-6 w-px bg-slate-600" />

        {/* Selection/Move Group */}
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <button onClick={handleUndo} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-600/50 rounded transition-colors disabled:opacity-30" title="Undo (Ctrl+Z)">
            <Undo2 size={16} />
          </button>
          <button onClick={handleRedo} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-600/50 rounded transition-colors disabled:opacity-30" title="Redo (Ctrl+Shift+Z)">
            <Redo2 size={16} />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-600" />

        {/* Mate/Snap Group */}
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <button
            onClick={() => setGridSnap(!gridSnap)}
            className={`p-1.5 rounded transition-colors ${
              gridSnap 
                ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/30' 
                : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-600/50'
            }`}
            title="Grid Snap (G)"
          >
            <Grid3X3 size={16} />
          </button>

          <button
            onClick={() => setMeasureActive(!measureActive)}
            className={`p-1.5 rounded transition-colors ${
              measureActive 
                ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-400/30' 
                : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-600/50'
            }`}
            title="Measure (M)"
          >
            <Ruler size={16} />
          </button>
        </div>

        <div className="h-6 w-px bg-slate-600" />

        {/* View Group */}
        <div className="flex items-center gap-0.5 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
          {cameraPresets.map(p => (
            <button
              key={p.name}
              onClick={() => setCameraPreset(p.name)}
              className="px-2 py-1 text-xs text-slate-400 hover:text-cyan-400 hover:bg-slate-600/50 rounded transition-colors font-['Orbitron']"
              title={`${p.name} view`}
            >
              {p.name[0]}
            </button>
          ))}
          <div className="w-px h-4 bg-slate-600 mx-1" />
          <button
            onClick={() => setShowShortcuts(true)}
            className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-600/50 rounded transition-colors"
            title="Shortcuts (?)"
          >
            <HelpCircle size={14} />
          </button>
        </div>
      </div>

      {/* Center Section - Simulation Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={isPlaying ? pause : play}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 font-['Orbitron'] ${
            isPlaying 
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40' 
              : 'bg-gradient-to-r from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
          }`}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          <span className="hidden sm:inline">
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </span>
        </button>
        
        <button
          onClick={reset}
          className="flex items-center gap-2 px-4 py-2.5 text-slate-300 hover:text-white bg-slate-700/50 hover:bg-slate-600/50 rounded-xl border border-slate-600/50 transition-colors font-['Orbitron']"
        >
          <Square size={16} />
          <span className="hidden sm:inline">RESET</span>
        </button>

        {/* Speed Control */}
        <div className="flex items-center gap-2 ml-2 px-3 py-2 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <Gauge size={16} className="text-cyan-400" />
          <select
            value={simulationSpeed}
            onChange={(e) => setSimulationSpeed(Number(e.target.value))}
            className="text-sm bg-transparent text-slate-300 border-none outline-none font-['Orbitron']"
          >
            {speedOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-slate-800">
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Section - Save/Export Group */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 rounded-lg border border-slate-600/50">
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-600/50 rounded-lg transition-colors"
            title="Import .metamech-sim.json"
          >
            <Upload size={16} />
            <span className="hidden sm:inline text-sm font-['Orbitron']">IMPORT</span>
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:text-cyan-400 hover:bg-slate-600/50 rounded-lg transition-colors"
          >
            <Download size={16} />
            <span className="hidden sm:inline text-sm font-['Orbitron']">EXPORT</span>
          </button>
        </div>

        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 font-['Orbitron'] ${
            saveStatus === 'saved' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/25' :
            saveStatus === 'error' ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25' :
            'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:shadow-lg hover:shadow-amber-500/25 shadow-md shadow-amber-500/10'
          }`}
        >
          {saveIcon()}
          <span className="hidden sm:inline">{saveLabel().toUpperCase()}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.metamech-sim.json"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="h-6 w-px bg-slate-600 mx-2" />

        {/* User Info */}
        <div className="flex items-center gap-3 text-sm">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-cyan-600 text-white rounded-full flex items-center justify-center font-bold shadow-lg shadow-cyan-500/25">
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="hidden md:inline text-slate-300 font-['Orbitron']">{user?.displayName}</span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
