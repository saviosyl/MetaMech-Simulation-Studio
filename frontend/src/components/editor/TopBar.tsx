import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, Square, Save, Download, Upload,
  ArrowLeft, Gauge, Undo2, Redo2, Check, AlertCircle,
  Loader2, Grid3X3, Ruler, HelpCircle,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useAuth } from '../../contexts/AuthContext';
import { undo, redo } from '../../store/historyMiddleware';
import { SaveStatus } from '../../pages/EditorPage';
import ScenarioLoader from './ScenarioLoader';

interface TopBarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  saveStatus: SaveStatus;
  onSave: () => void;
}

/* ─── Toolbar Group wrapper ─── */
const ToolGroup: React.FC<{ label?: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-col items-center gap-0.5">
    <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-[var(--mm-bg-surface)] rounded-md border border-[var(--mm-border-subtle)]">
      {children}
    </div>
    {label && <span className="text-[9px] font-medium text-[var(--mm-text-tertiary)] tracking-wider uppercase">{label}</span>}
  </div>
);

/* ─── Small toolbar button ─── */
const ToolBtn: React.FC<{ 
  onClick: () => void; 
  active?: boolean; 
  title: string; 
  disabled?: boolean;
  accent?: string;
  children: React.ReactNode 
}> = ({ onClick, active, title, disabled, accent, children }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`p-1.5 rounded transition-all duration-150 ${
      active
        ? `bg-[var(--mm-accent-primary-muted)] text-[var(--mm-accent-primary)] ring-1 ring-[var(--mm-accent-primary)]/30`
        : `text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-panel-hover)]`
    } ${disabled ? 'opacity-30' : ''}`}
    style={accent ? { color: active ? accent : undefined } : undefined}
  >
    {children}
  </button>
);

const TopBar: React.FC<TopBarProps> = ({ projectName, setProjectName, saveStatus, onSave }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isPlaying, isPaused, simulationSpeed,
    play, pause, reset, setSimulationSpeed,
    getSceneData, loadScene,
    gridSnap, setGridSnap,
    measureActive, setMeasureActive,
    cameraPresets, setCameraPreset,
    setShowShortcuts,
  } = useEditorStore();

  const speedOptions = [
    { value: 0.25, label: '0.25×' },
    { value: 0.5, label: '0.5×' },
    { value: 1, label: '1×' },
    { value: 2, label: '2×' },
    { value: 4, label: '4×' },
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

  const handleImport = () => fileInputRef.current?.click();

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
    event.target.value = '';
  };

  const handleUndo = () => undo(useEditorStore.setState, useEditorStore.getState);
  const handleRedo = () => redo(useEditorStore.setState, useEditorStore.getState);

  const saveIcon = () => {
    switch (saveStatus) {
      case 'saving': return <Loader2 size={14} className="animate-spin" />;
      case 'saved': return <Check size={14} />;
      case 'error': return <AlertCircle size={14} />;
      default: return <Save size={14} />;
    }
  };

  return (
    <div 
      className="flex items-center justify-between px-3 py-1.5 border-b shadow-md"
      style={{ 
        background: 'var(--mm-bg-panel)', 
        borderColor: 'var(--mm-border)',
        minHeight: 'var(--mm-toolbar-height)',
      }}
    >
      {/* ─── Left: Project ─── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-[var(--mm-text-secondary)] hover:text-[var(--mm-accent-primary)] transition-colors"
          title="Back to Dashboard"
        >
          <ArrowLeft size={14} />
          <span className="hidden sm:inline text-xs font-semibold font-['Orbitron'] tracking-wide">MetaMech</span>
        </button>
        
        <div className="h-5 w-px bg-[var(--mm-border-subtle)]" />
        
        {isEditing ? (
          <input
            type="text"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)}
            className="text-sm font-semibold bg-transparent border-b border-[var(--mm-accent-primary)] outline-none font-['Orbitron']"
            style={{ color: 'var(--mm-text-primary)' }}
            autoFocus
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className="text-sm font-semibold cursor-pointer hover:text-[var(--mm-accent-primary)] transition-colors font-['Orbitron']"
            style={{ color: 'var(--mm-text-primary)' }}
          >
            {projectName}
          </span>
        )}

        <div className="h-5 w-px bg-[var(--mm-border-subtle)]" />

        {/* ─── Group: Edit ─── */}
        <ToolGroup label="Edit">
          <ToolBtn onClick={handleUndo} title="Undo (Ctrl+Z)"><Undo2 size={14} /></ToolBtn>
          <ToolBtn onClick={handleRedo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={14} /></ToolBtn>
        </ToolGroup>

        {/* ─── Group: Scenarios ─── */}
        <ScenarioLoader />

        {/* ─── Group: Tools ─── */}
        <ToolGroup label="Tools">
          <ToolBtn onClick={() => setGridSnap(!gridSnap)} active={gridSnap} title="Grid Snap (G)">
            <Grid3X3 size={14} />
          </ToolBtn>
          <ToolBtn onClick={() => setMeasureActive(!measureActive)} active={measureActive} title="Measure (M)" accent="var(--mm-accent-warning)">
            <Ruler size={14} />
          </ToolBtn>
        </ToolGroup>

        {/* ─── Group: View ─── */}
        <ToolGroup label="View">
          {cameraPresets.map(p => (
            <button
              key={p.name}
              onClick={() => setCameraPreset(p.name)}
              className="px-1.5 py-1 text-[10px] font-semibold text-[var(--mm-text-tertiary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-panel-hover)] rounded transition-colors font-['Orbitron']"
              title={`${p.name} view`}
            >
              {p.name[0]}
            </button>
          ))}
          <ToolBtn onClick={() => setShowShortcuts(true)} title="Keyboard Shortcuts (?)">
            <HelpCircle size={13} />
          </ToolBtn>
        </ToolGroup>
      </div>

      {/* ─── Center: Simulation ─── */}
      <div className="flex items-center gap-2">
        <ToolGroup label="Simulation">
          <button
            onClick={isPlaying ? pause : play}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold text-xs transition-all font-['Orbitron'] tracking-wide ${
              isPlaying 
                ? 'bg-amber-500/90 text-white shadow-sm shadow-amber-500/30 hover:bg-amber-500' 
                : 'bg-cyan-500/90 text-white shadow-sm shadow-cyan-500/30 hover:bg-cyan-500'
            }`}
            title={isPlaying ? 'Pause Simulation' : 'Play Simulation'}
          >
            {isPlaying ? <Pause size={13} /> : <Play size={13} />}
            {isPlaying ? 'PAUSE' : 'PLAY'}
          </button>
          
          <ToolBtn onClick={reset} title="Reset Simulation">
            <Square size={13} />
          </ToolBtn>

          <div className="w-px h-4 bg-[var(--mm-border-subtle)] mx-0.5" />

          {/* Speed — labeled */}
          <div className="flex items-center gap-1 px-1">
            <Gauge size={12} className="text-[var(--mm-text-tertiary)]" />
            <select
              value={simulationSpeed}
              onChange={(e) => setSimulationSpeed(Number(e.target.value))}
              className="text-[11px] bg-transparent border-none outline-none font-semibold cursor-pointer font-['Orbitron']"
              style={{ color: 'var(--mm-text-secondary)' }}
              title="Simulation Speed"
            >
              {speedOptions.map(o => (
                <option key={o.value} value={o.value} style={{ background: 'var(--mm-bg-panel)', color: 'var(--mm-text-primary)' }}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </ToolGroup>
      </div>

      {/* ─── Right: File + User ─── */}
      <div className="flex items-center gap-3">
        <ToolGroup label="File">
          <ToolBtn onClick={handleImport} title="Import Project">
            <Upload size={14} />
          </ToolBtn>
          <ToolBtn onClick={handleExport} title="Export Project">
            <Download size={14} />
          </ToolBtn>
        </ToolGroup>

        <button
          onClick={onSave}
          disabled={saveStatus === 'saving'}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md font-semibold text-xs transition-all font-['Orbitron'] tracking-wide ${
            saveStatus === 'saved' ? 'bg-emerald-500/90 text-white' :
            saveStatus === 'error' ? 'bg-red-500/90 text-white' :
            'bg-amber-500/90 text-white hover:bg-amber-500'
          }`}
          title="Save Project"
        >
          {saveIcon()}
          {saveStatus === 'saving' ? 'SAVING' : saveStatus === 'saved' ? 'SAVED' : 'SAVE'}
        </button>

        <input ref={fileInputRef} type="file" accept=".json,.metamech-sim.json" onChange={handleFileChange} className="hidden" />

        <div className="h-5 w-px bg-[var(--mm-border-subtle)]" />

        {/* User avatar */}
        <div className="flex items-center gap-2">
          <div 
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}
          >
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <span className="hidden md:inline text-xs font-['Orbitron']" style={{ color: 'var(--mm-text-secondary)' }}>
            {user?.displayName}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
