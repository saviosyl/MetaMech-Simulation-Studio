import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, Square, Save, Download, Upload, Video,
  ArrowLeft, Undo2, Redo2, Check, AlertCircle,
  Loader2, HelpCircle, Sun, Moon, Maximize2,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { useAuth } from '../../contexts/AuthContext';
import { undo, redo } from '../../store/historyMiddleware';
import { SaveStatus } from '../../pages/EditorPage';
import ScenarioLoader from './ScenarioLoader';
import AILayoutBuilder from './AILayoutBuilder';

interface TopBarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  saveStatus: SaveStatus;
  onSave: () => void;
}

// ─── Styles ───
const S = {
  bar: {
    position: 'relative' as const,
    zIndex: 80,
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    padding: '0 12px', height: 46,
    background: 'var(--mm-bg-panel)',
    borderBottom: '1px solid var(--mm-border)',
    boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
  } as React.CSSProperties,
  group: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '3px 6px',
    background: 'var(--mm-bg-surface)',
    borderRadius: 8,
    border: '1px solid var(--mm-border-subtle)',
  } as React.CSSProperties,
  groupLabel: {
    fontSize: 9, fontWeight: 700, color: 'var(--mm-text-disabled)',
    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    fontFamily: "'Orbitron', monospace",
  } as React.CSSProperties,
  divider: { width: 1, height: 24, background: 'var(--mm-border-subtle)', flexShrink: 0 } as React.CSSProperties,
  iconBtn: (active?: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 30, height: 30, borderRadius: 6, border: 'none', cursor: 'pointer',
    background: active ? 'var(--mm-accent-primary-muted)' : 'transparent',
    color: active ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
    transition: 'all 0.15s',
  } as React.CSSProperties),
  simBtn: (color: string) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
    background: color, color: '#fff',
    boxShadow: `0 2px 8px ${color}44`,
    transition: 'all 0.15s',
  } as React.CSSProperties),
  primaryBtn: (bg: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: bg, color: '#fff',
    fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron', monospace",
    letterSpacing: '0.04em', transition: 'all 0.15s',
    boxShadow: `0 2px 8px ${bg}33`,
  } as React.CSSProperties),
};

const TopBar: React.FC<TopBarProps> = ({ projectName, setProjectName, saveStatus, onSave }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingModeRef = useRef<'manual' | 'camera-path' | null>(null);
  const renderBoostRef = useRef<{ gl: any; prevDpr: number; width: number; height: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isPlaying, simulationSpeed,
    play, pause, reset, setSimulationSpeed,
    getSceneData, loadScene,
    setShowShortcuts,
    isCameraPathPlaying,
  } = useEditorStore();

  const speedOptions = [
    { value: 0.25, label: '0.25×' },
    { value: 0.5, label: '0.5×' },
    { value: 1, label: '1×' },
    { value: 2, label: '2×' },
    { value: 4, label: '4×' },
  ];

  const boostViewportCaptureQuality = useCallback((canvas: HTMLCanvasElement) => {
    // @ts-ignore — R3F store reference is attached to canvas at runtime
    const r3f = (canvas as any).__r3f;
    const state = r3f?.store?.getState?.();
    const gl = state?.gl;
    const size = state?.size;
    if (!gl || !size) return;
    const prevDpr = gl.getPixelRatio?.() ?? 1;
    const targetDpr = Math.max(1, Math.min(2, Math.max(prevDpr, 2)));
    gl.setPixelRatio?.(targetDpr);
    gl.setSize?.(size.width, size.height, false);
    renderBoostRef.current = { gl, prevDpr, width: size.width, height: size.height };
  }, []);

  const restoreViewportCaptureQuality = useCallback(() => {
    const boost = renderBoostRef.current;
    if (!boost) return;
    boost.gl.setPixelRatio?.(boost.prevDpr);
    boost.gl.setSize?.(boost.width, boost.height, false);
    renderBoostRef.current = null;
  }, []);

  // ─── Record Video (high quality) ───
  const startRecording = useCallback((mode: 'manual' | 'camera-path' = 'manual') => {
    const canvas = document.querySelector('canvas');
    if (!canvas) { alert('No 3D viewport found'); return; }
    try {
      boostViewportCaptureQuality(canvas as HTMLCanvasElement);
      // Capture at 60fps for smoother output
      const stream = canvas.captureStream(60);

      // Try VP9 first (best quality), fall back to VP8
      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 35_000_000, // 35 Mbps — clearer edges/less blockiness
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '_')}_recording.webm`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        restoreViewportCaptureQuality();
        recordingModeRef.current = null;
      };
      // Larger timeslice = fewer chunks = cleaner encoding
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recordingModeRef.current = mode;
      setIsRecording(true);
    } catch (err) {
      console.error('Recording failed:', err);
      restoreViewportCaptureQuality();
      alert('Recording not supported in this browser');
    }
  }, [projectName, boostViewportCaptureQuality, restoreViewportCaptureQuality]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    // Stop camera path playback too
    useEditorStore.getState().setIsCameraPathPlaying(false);
  }, []);

  // Auto-stop camera-path recordings when non-loop path playback completes
  useEffect(() => {
    if (!isRecording) return;
    if (recordingModeRef.current !== 'camera-path') return;
    if (isCameraPathPlaying) return;
    stopRecording();
  }, [isRecording, isCameraPathPlaying, stopRecording]);

  // Record with camera path: starts recording + plays the active camera path
  const startRecordingWithCameraPath = useCallback(() => {
    const { activeCameraPathId, cameraPaths, setActiveCameraPathId } = useEditorStore.getState();
    if (!activeCameraPathId) {
      // Find first path with >=2 keyframes
      const validPath = cameraPaths.find(p => p.keyframes.length >= 2);
      if (!validPath) {
        alert('Create a camera path with at least 2 keyframes first (Actors tab → Camera Paths)');
        return;
      }
      setActiveCameraPathId(validPath.id);
    }
    // Start path first, then recording on next frame to avoid static lead-in.
    useEditorStore.getState().setIsCameraPathPlaying(true);
    if (!useEditorStore.getState().isPlaying) {
      useEditorStore.getState().play();
    }
    requestAnimationFrame(() => {
      startRecording('camera-path');
    });
  }, [startRecording]);

  const handleExport = () => {
    const sceneData = getSceneData();
    const blob = new Blob([JSON.stringify(sceneData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `${projectName.replace(/\s+/g, '_')}.metamech-sim.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => fileInputRef.current?.click();
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try { loadScene(JSON.parse(e.target?.result as string)); }
      catch { alert('Invalid file format'); }
    };
    reader.readAsText(file); event.target.value = '';
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
    <div style={S.bar}>
      {/* ════ LEFT: Project + Edit + Build ════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifySelf: 'start', minWidth: 0 }}>
        {/* Brand */}
        <button onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-secondary)', transition: 'color 0.15s' }}
          title="Back to Dashboard">
          <ArrowLeft size={15} />
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Orbitron', monospace", letterSpacing: '0.04em' }}>MetaMech</span>
        </button>

        <div style={S.divider} />

        {/* Project name */}
        {isEditing ? (
          <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditing(false)} onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)} autoFocus
            style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Orbitron', monospace", background: 'transparent', border: 'none', borderBottom: '2px solid var(--mm-accent-primary)', color: 'var(--mm-text-primary)', outline: 'none', padding: '2px 0', width: 180 }} />
        ) : (
          <span onClick={() => setIsEditing(true)}
            style={{ fontSize: 13, fontWeight: 600, fontFamily: "'Orbitron', monospace", color: 'var(--mm-text-primary)', cursor: 'pointer' }}>
            {projectName}
          </span>
        )}

        <div style={S.divider} />

        {/* Edit group */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div style={S.group}>
            <button onClick={handleUndo} style={S.iconBtn()} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
            <button onClick={handleRedo} style={S.iconBtn()} title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
          </div>
          <span style={S.groupLabel}>Edit</span>
        </div>

        {/* Scenarios */}
        <ScenarioLoader />
      </div>

      {/* ════ CENTER: Simulation (bigger, prominent) ════ */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, justifySelf: 'center' }}>
        <div style={{ ...S.group, padding: '6px 12px', gap: 8, background: 'var(--mm-bg-app)', border: '2px solid var(--mm-border)' }}>
          {/* Play/Pause */}
          <button onClick={isPlaying ? pause : play}
            style={S.simBtn(isPlaying ? '#f59e0b' : '#06b6d4')}
            title={isPlaying ? 'Pause simulation playback' : 'Start simulation playback'}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>

          {/* Reset */}
          <button onClick={reset} style={S.simBtn('#64748b')} title="Reset simulation and clear transient runtime state">
            <Square size={16} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'var(--mm-border)' }} />

          {/* Speed */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--mm-text-disabled)', letterSpacing: '0.1em', fontFamily: "'Orbitron', monospace" }}>SPEED</span>
            <div style={{ display: 'flex', gap: 2 }}>
              {speedOptions.map(o => (
                <button key={o.value} onClick={() => setSimulationSpeed(o.value)}
                  title={`Set simulation speed to ${o.label}`}
                  style={{
                    padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontWeight: 700, fontFamily: "'Orbitron', monospace",
                    background: simulationSpeed === o.value ? 'var(--mm-accent-primary)' : 'var(--mm-bg-surface)',
                    color: simulationSpeed === o.value ? '#fff' : 'var(--mm-text-secondary)',
                    transition: 'all 0.15s',
                  }}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 28, background: 'var(--mm-border)' }} />

          {/* Record */}
          <button onClick={isRecording ? stopRecording : () => startRecording()}
            style={{
              ...S.simBtn(isRecording ? '#ef4444' : '#8b5cf6'),
              animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : undefined,
            }}
            title={isRecording ? 'Stop viewport recording and save WebM file' : 'Record viewport video with manual camera movement'}>
            <Video size={16} />
          </button>
          {/* Record with camera path */}
          {!isRecording && (
            <button onClick={startRecordingWithCameraPath}
              style={S.simBtn('#6366f1')}
              title="Record using the active camera path for smooth cinematic motion">
              <Video size={14} /><span style={{ fontSize: 9, marginLeft: -2 }}>🎬</span>
            </button>
          )}
          {isRecording && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', fontFamily: "'Orbitron', monospace", animation: 'pulse 1s ease-in-out infinite' }}>
              REC
            </span>
          )}
        </div>
        <span style={S.groupLabel}>Simulation</span>
      </div>

      {/* ════ RIGHT: View + File + Save + User ════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'end' }}>
        {/* View */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div style={S.group}>
            <button onClick={() => useEditorStore.getState().toggleTheme()} style={S.iconBtn()} title="Toggle Theme">
              {useEditorStore.getState().themeMode === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            <button onClick={() => useEditorStore.getState().setPresentationMode(true)} style={S.iconBtn()} title="Presentation Mode"><Maximize2 size={15} /></button>
            <button onClick={() => setShowShortcuts(true)} style={S.iconBtn()} title="Shortcuts (?)"><HelpCircle size={15} /></button>
          </div>
          <span style={S.groupLabel}>View</span>
        </div>

        <div style={S.divider} />

        {/* File */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
          <div style={S.group}>
            <button onClick={handleImport} style={S.iconBtn()} title="Import Project"><Upload size={15} /></button>
            <button onClick={handleExport} style={S.iconBtn()} title="Export Project"><Download size={15} /></button>
            <button onClick={() => setShowAIBuilder(true)} style={{ ...S.iconBtn(), color: 'var(--mm-accent-primary)', fontWeight: 700, fontSize: 11, padding: '4px 8px' }} title="AI Layout Builder">AI</button>
          </div>
          <span style={S.groupLabel}>File</span>
        </div>

        {/* Save */}
        <button onClick={onSave} disabled={saveStatus === 'saving'}
          style={S.primaryBtn(saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#06b6d4')}>
          {saveIcon()}
          {saveStatus === 'saving' ? 'SAVING' : saveStatus === 'saved' ? 'SAVED' : 'SAVE'}
        </button>

        <input ref={fileInputRef} type="file" accept=".json,.metamech-sim.json" onChange={handleFileChange} style={{ display: 'none' }} />

        <div style={S.divider} />

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
      {showAIBuilder && <AILayoutBuilder onClose={() => setShowAIBuilder(false)} />}
    </div>
  );
};

export default TopBar;
