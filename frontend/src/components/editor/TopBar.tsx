import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, Square, Save, Download, Upload, Video,
  ArrowLeft, Undo2, Redo2, Check, AlertCircle,
  Loader2, HelpCircle, Sun, Moon, Maximize2, Film, LifeBuoy,
} from 'lucide-react';
import * as THREE from 'three';
import { useEditorStore } from '../../store/editorStore';
import { useAuth } from '../../contexts/AuthContext';
import { undo, redo } from '../../store/historyMiddleware';
import { SaveStatus } from '../../pages/EditorPage';
import ScenarioLoader from './ScenarioLoader';
import AILayoutBuilder from './AILayoutBuilder';
import {
  VideoFormatPreference,
  VideoQualityPreset,
  VIDEO_CAPTURE_PRESETS,
  VIDEO_QUALITY_PRESET_ORDER,
  resolveRecordingMimeType,
} from '../../lib/videoExportPresets';

interface TopBarProps {
  projectName: string;
  setProjectName: (name: string) => void;
  saveStatus: SaveStatus;
  onSave: () => void;
  onOpenHelpSupport: () => void;
}

// ─── Styles ───
const S = {
  bar: {
    position: 'relative' as const,
    zIndex: 80,
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 8,
    margin: '4px 10px 0',
    padding: '5px 10px',
    minHeight: 52,
    background: 'var(--mm-bg-toolbar)',
    border: '1px solid var(--mm-border-subtle)',
    borderRadius: 16,
    boxShadow: 'var(--mm-shadow-md)',
  } as React.CSSProperties,
  group: {
    display: 'flex', alignItems: 'center', gap: 4,
    padding: '1px 2px',
    background: 'transparent',
    borderRadius: 8,
    border: 'none',
  } as React.CSSProperties,
  strip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 4px',
    borderRadius: 9,
    background: 'var(--mm-bg-surface)',
    border: '1px solid var(--mm-border-subtle)',
  } as React.CSSProperties,
  groupLabel: {
    fontSize: 8, fontWeight: 700, color: 'var(--mm-text-disabled)',
    letterSpacing: '0.08em', textTransform: 'uppercase' as const,
    fontFamily: "'Orbitron', monospace",
  } as React.CSSProperties,
  divider: { width: 1, height: 20, background: 'var(--mm-border-subtle)', flexShrink: 0 } as React.CSSProperties,
  iconBtn: (active?: boolean) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 9, border: '1px solid transparent', cursor: 'pointer',
    background: active ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)',
    color: active ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
    transition: 'all 0.15s',
  } as React.CSSProperties),
  simBtn: (color: string) => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 34, height: 34, borderRadius: 9, border: 'none', cursor: 'pointer',
    background: color, color: '#fff',
    boxShadow: `0 2px 8px ${color}44`,
    transition: 'all 0.15s',
  } as React.CSSProperties),
  primaryBtn: (bg: string) => ({
    display: 'inline-flex', alignItems: 'center', gap: 6,
    height: 34,
    padding: '0 12px', borderRadius: 9, border: 'none', cursor: 'pointer',
    background: bg, color: '#fff',
    fontSize: 11, fontWeight: 600,
    letterSpacing: '0.01em', transition: 'all 0.15s',
    boxShadow: `0 2px 8px ${bg}33`,
  } as React.CSSProperties),
  compactSelect: {
    height: 32,
    padding: '0 9px',
    fontSize: 11,
    borderRadius: 9,
    border: '1px solid var(--mm-border-subtle)',
    background: 'var(--mm-bg-surface)',
    color: 'var(--mm-text-secondary)',
    fontWeight: 500,
    outline: 'none',
  } as React.CSSProperties,
  projectNameText: {
    display: 'inline-block',
    maxWidth: 170,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--mm-text-primary)',
    cursor: 'pointer',
    letterSpacing: '0.01em',
  } as React.CSSProperties,
};

const TopBar: React.FC<TopBarProps> = ({ projectName, setProjectName, saveStatus, onSave, onOpenHelpSupport }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [showAIBuilder, setShowAIBuilder] = useState(false);
  const [videoFormatPreference, setVideoFormatPreference] = useState<VideoFormatPreference>('auto');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingModeRef = useRef<'manual' | 'camera-path' | null>(null);
  const renderBoostRef = useRef<{ gl: THREE.WebGLRenderer; prevDpr: number; width: number; height: number } | null>(null);
  const fallbackNoticeShownRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const {
    isPlaying, simulationSpeed,
    play, pause, reset, setSimulationSpeed,
    getSceneData, loadScene,
    setShowShortcuts,
    isCameraPathPlaying,
    captureQualityPreset,
    setCaptureQualityPreset,
    setIsExportRendering,
    themeMode,
    toggleTheme,
    setPresentationMode,
  } = useEditorStore();

  const speedOptions = [
    { value: 0.25, label: '0.25×' },
    { value: 0.5, label: '0.5×' },
    { value: 1, label: '1×' },
    { value: 2, label: '2×' },
    { value: 4, label: '4×' },
  ];

  const boostViewportCaptureQuality = useCallback((canvas: HTMLCanvasElement, preset: VideoQualityPreset) => {
    // @ts-ignore — R3F store reference is attached to canvas at runtime
    const r3f = (canvas as any).__r3f;
    const state = r3f?.store?.getState?.();
    const gl = state?.gl as THREE.WebGLRenderer | undefined;
    const size = state?.size;
    if (!gl || !size) return;
    const presetConfig = VIDEO_CAPTURE_PRESETS[preset];
    const prevDpr = gl.getPixelRatio?.() ?? 1;
    const targetDpr = Math.max(1, Math.min(3, Math.max(prevDpr, presetConfig.targetDpr)));
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

  // ─── Record Video (quality preset + format preference) ───
  const startRecording = useCallback((mode: 'manual' | 'camera-path' = 'manual') => {
    const canvas = document.querySelector('canvas');
    if (!canvas) { alert('No 3D viewport found'); return; }
    try {
      const preset = VIDEO_CAPTURE_PRESETS[captureQualityPreset];
      setIsExportRendering(true);
      boostViewportCaptureQuality(canvas as HTMLCanvasElement, captureQualityPreset);
      const stream = (canvas as HTMLCanvasElement).captureStream(preset.captureFps);

      const format = resolveRecordingMimeType(videoFormatPreference);
      if (format.usedFallback && !fallbackNoticeShownRef.current) {
        fallbackNoticeShownRef.current = true;
        alert('Requested video format is not supported by this browser. Falling back automatically.');
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: format.mimeType,
        videoBitsPerSecond: preset.videoBitsPerSecond,
      });

      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: format.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${projectName.replace(/\s+/g, '_')}_${preset.label.toLowerCase()}_recording.${format.extension}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
        stream.getTracks().forEach((track) => track.stop());
        restoreViewportCaptureQuality();
        recordingModeRef.current = null;
        setIsExportRendering(false);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      recordingModeRef.current = mode;
      setIsRecording(true);
    } catch (err) {
      console.error('Recording failed:', err);
      restoreViewportCaptureQuality();
      setIsExportRendering(false);
      alert('Recording not supported in this browser');
    }
  }, [
    projectName,
    boostViewportCaptureQuality,
    restoreViewportCaptureQuality,
    captureQualityPreset,
    videoFormatPreference,
    setIsExportRendering,
  ]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    } else {
      restoreViewportCaptureQuality();
      setIsExportRendering(false);
    }
    setIsRecording(false);
    // Stop camera path playback too
    useEditorStore.getState().setIsCameraPathPlaying(false);
  }, [restoreViewportCaptureQuality, setIsExportRendering]);

  // Auto-stop camera-path recordings when non-loop path playback completes
  useEffect(() => {
    if (!isRecording) return;
    if (recordingModeRef.current !== 'camera-path') return;
    if (isCameraPathPlaying) return;
    stopRecording();
  }, [isRecording, isCameraPathPlaying, stopRecording]);

  useEffect(() => {
    return () => {
      restoreViewportCaptureQuality();
      setIsExportRendering(false);
    };
  }, [restoreViewportCaptureQuality, setIsExportRendering]);

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
    <div style={S.bar} data-tour="top-ribbon">
      {/* ════ LEFT: Project + Edit + Build ════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifySelf: 'start', minWidth: 0 }}>
        {/* Brand */}
        <button onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-secondary)', transition: 'color 0.15s', padding: '0 2px' }}
          title="Back to Dashboard">
          <ArrowLeft size={14} />
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.01em' }}>MetaMech</span>
        </button>

        <div style={S.divider} />

        {/* Project name */}
        {isEditing ? (
          <input type="text" value={projectName} onChange={(e) => setProjectName(e.target.value)}
            onBlur={() => setIsEditing(false)} onKeyPress={(e) => e.key === 'Enter' && setIsEditing(false)} autoFocus
            style={{ fontSize: 11, fontWeight: 600, background: 'transparent', border: 'none', borderBottom: '2px solid var(--mm-accent-primary)', color: 'var(--mm-text-primary)', outline: 'none', padding: '1px 0', width: 160 }} />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            title={projectName}
            style={S.projectNameText}
          >
            {projectName}
          </span>
        )}

        <div style={S.divider} />

        {/* Edit */}
        <div style={S.strip}>
          <button onClick={handleUndo} style={S.iconBtn()} title="Undo (Ctrl+Z)"><Undo2 size={15} /></button>
          <button onClick={handleRedo} style={S.iconBtn()} title="Redo (Ctrl+Shift+Z)"><Redo2 size={15} /></button>
        </div>

        {/* Scenarios */}
        <ScenarioLoader />
      </div>

      {/* ════ CENTER: Simulation (bigger, prominent) ════ */}
      <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'center' }}>
        <div
          style={{
            ...S.strip,
            padding: '4px 6px',
            gap: 6,
            flexWrap: 'nowrap',
            background: 'var(--mm-bg-surface)',
            border: '1px solid var(--mm-border-subtle)',
          }}
          data-tour="simulation-controls"
        >
          {/* Play/Pause */}
          <button onClick={isPlaying ? pause : play}
            style={S.simBtn(isPlaying ? '#f59e0b' : '#06b6d4')}
            title={isPlaying ? 'Pause simulation playback' : 'Start simulation playback'}>
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>

          {/* Reset */}
          <button onClick={reset} style={S.simBtn('#64748b')} title="Reset simulation and clear transient runtime state">
            <Square size={14} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'var(--mm-border-subtle)' }} />

          {/* Speed (single-row inline) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }}>
            <span style={{ fontSize: 9, fontWeight: 600, color: 'var(--mm-text-tertiary)', letterSpacing: '0.05em', flexShrink: 0 }}>Speed</span>
            {speedOptions.map(o => (
              <button key={o.value} onClick={() => setSimulationSpeed(o.value)}
                title={`Set simulation speed to ${o.label}`}
                style={{
                  height: 24,
                  padding: '0 7px', borderRadius: 8, border: '1px solid transparent', cursor: 'pointer',
                  fontSize: 10, fontWeight: 600,
                  background: simulationSpeed === o.value ? 'var(--mm-accent-primary)' : 'var(--mm-bg-surface)',
                  color: simulationSpeed === o.value ? '#fff' : 'var(--mm-text-secondary)',
                  transition: 'all 0.15s',
                }}>
                {o.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 20, background: 'var(--mm-border-subtle)' }} />

          {/* Export quality / format (single-row inline group) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0, flexWrap: 'nowrap' }}>
            <Film size={12} style={{ color: 'var(--mm-text-tertiary)', flexShrink: 0 }} />
            <select
              value={captureQualityPreset}
              onChange={(e) => setCaptureQualityPreset(e.target.value as VideoQualityPreset)}
              style={{ ...S.compactSelect, minWidth: 104 }}
              title="Recording quality preset: higher settings increase resolution, bitrate, shadows, and reflections."
            >
              {VIDEO_QUALITY_PRESET_ORDER.map((key) => (
                <option key={key} value={key}>
                  {VIDEO_CAPTURE_PRESETS[key].label}
                </option>
              ))}
            </select>
            <select
              value={videoFormatPreference}
              onChange={(e) => setVideoFormatPreference(e.target.value as VideoFormatPreference)}
              style={{ ...S.compactSelect, minWidth: 100 }}
              title="Preferred export format. MP4 is used when browser support is available."
            >
              <option value="auto">Auto (prefer MP4)</option>
              <option value="mp4">MP4 (if supported)</option>
              <option value="webm">WebM</option>
            </select>
          </div>

          {/* Record */}
          <button onClick={isRecording ? stopRecording : () => startRecording()}
            style={{
              ...S.simBtn(isRecording ? '#ef4444' : '#8b5cf6'),
              animation: isRecording ? 'pulse 1.5s ease-in-out infinite' : undefined,
            }}
            title={isRecording ? 'Stop recording and export video file' : `Record viewport video (${VIDEO_CAPTURE_PRESETS[captureQualityPreset].label} preset)`}>
            <Video size={14} />
          </button>
          {/* Record with camera path */}
          {!isRecording && (
            <button onClick={startRecordingWithCameraPath}
              style={S.simBtn('#6366f1')}
              title={`Record with active camera path (${VIDEO_CAPTURE_PRESETS[captureQualityPreset].label} preset)`}>
              <Video size={14} /><span style={{ fontSize: 8, marginLeft: -2 }}>🎬</span>
            </button>
          )}
          {isRecording && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', animation: 'pulse 1s ease-in-out infinite' }}>
              REC
            </span>
          )}
        </div>
      </div>

      {/* ════ RIGHT: View + File + Save + User ════ */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, justifySelf: 'end' }}>
        <div style={S.strip}>
          <button onClick={toggleTheme} style={S.iconBtn()} title="Toggle Theme">
            {themeMode === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button onClick={() => setPresentationMode(true)} style={S.iconBtn()} title="Presentation Mode"><Maximize2 size={14} /></button>
          <button onClick={() => setShowShortcuts(true)} style={S.iconBtn()} title="Shortcuts (?)"><HelpCircle size={14} /></button>
        </div>

        <div style={S.divider} />

        <div style={S.strip}>
          <button onClick={handleImport} style={S.iconBtn()} title="Import Project"><Upload size={14} /></button>
          <button onClick={handleExport} style={S.iconBtn()} title="Export Project"><Download size={14} /></button>
          <button onClick={() => setShowAIBuilder(true)} style={{ ...S.iconBtn(), width: 38, color: 'var(--mm-accent-primary)', fontWeight: 700, fontSize: 10 }} title="AI Layout Builder">AI</button>
        </div>

        {/* Save */}
        <button onClick={onSave} disabled={saveStatus === 'saving'}
          style={S.primaryBtn(saveStatus === 'saved' ? '#10b981' : saveStatus === 'error' ? '#ef4444' : '#06b6d4')}>
          {saveIcon()}
          {saveStatus === 'saving' ? 'SAVING' : saveStatus === 'saved' ? 'SAVED' : 'SAVE'}
        </button>

        {/* Help / Support */}
        <button
          onClick={onOpenHelpSupport}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            height: 34,
            padding: '0 9px',
            borderRadius: 9,
            border: '1px solid var(--mm-border-subtle)',
            background: 'var(--mm-bg-surface)',
            color: 'var(--mm-text-secondary)',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.01em',
          }}
          title="Open MetaMech Help / Support and product guide"
          data-tour="help-support"
        >
          <LifeBuoy size={11} />
          HELP
        </button>

        <input ref={fileInputRef} type="file" accept=".json,.metamech-sim.json" onChange={handleFileChange} style={{ display: 'none' }} />

        <div style={S.divider} />

        {/* User */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #06b6d4, #0891b2)' }}>
            {user?.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
      {showAIBuilder && <AILayoutBuilder onClose={() => setShowAIBuilder(false)} />}
    </div>
  );
};

export default TopBar;
