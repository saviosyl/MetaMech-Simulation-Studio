/**
 * CameraPathPanel — UI for creating, editing, and playing camera paths
 * Placed in the left panel under a "Camera" tab or as a floating panel
 */
import React, { useCallback } from 'react';
import { Camera, Plus, Trash2, Play, Pause, Eye } from 'lucide-react';
import { useEditorStore, CameraKeyframe } from '../../store/editorStore';

// Get current camera position + target from the 3D scene
function getCurrentCameraState(): { position: [number, number, number]; target: [number, number, number] } {
  // Access the R3F camera via the canvas
  const canvas = document.querySelector('canvas');
  if (!canvas) return { position: [10, 10, 10], target: [0, 0, 0] };
  // @ts-ignore — R3F stores __r3f on the canvas
  const r3f = (canvas as any).__r3f;
  if (!r3f?.store) return { position: [10, 10, 10], target: [0, 0, 0] };
  const camera = r3f.store.getState().camera;
  if (!camera) return { position: [10, 10, 10], target: [0, 0, 0] };

  const pos: [number, number, number] = [
    Math.round(camera.position.x * 100) / 100,
    Math.round(camera.position.y * 100) / 100,
    Math.round(camera.position.z * 100) / 100,
  ];

  // Try to get orbit controls target
  const controls = r3f.store.getState().controls;
  let target: [number, number, number] = [0, 3, 0];
  if (controls && 'target' in controls) {
    const t = (controls as any).target;
    target = [
      Math.round(t.x * 100) / 100,
      Math.round(t.y * 100) / 100,
      Math.round(t.z * 100) / 100,
    ];
  }

  return { position: pos, target };
}

const s = {
  panel: {
    padding: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    fontSize: '13px',
    color: 'var(--mm-text-primary)',
  },
  header: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    gap: '8px',
    fontWeight: 600,
    fontSize: '14px',
  },
  btn: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '4px',
    padding: '4px 8px',
    border: '1px solid var(--mm-border)',
    borderRadius: '4px',
    background: 'var(--mm-bg-surface)',
    color: 'var(--mm-text-primary)',
    cursor: 'pointer',
    fontSize: '12px',
  },
  btnAccent: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '4px',
    padding: '4px 8px',
    border: '1px solid var(--mm-accent-primary)',
    borderRadius: '4px',
    background: 'var(--mm-accent-primary)',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '12px',
  },
  pathItem: {
    padding: '8px',
    border: '1px solid var(--mm-border)',
    borderRadius: '6px',
    background: 'var(--mm-bg-surface)',
  },
  kfList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    marginTop: '6px',
    maxHeight: '200px',
    overflow: 'auto' as const,
  },
  kfItem: {
    display: 'flex',
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: '4px 6px',
    background: 'var(--mm-bg-input)',
    borderRadius: '3px',
    fontSize: '11px',
  },
  input: {
    width: '50px',
    padding: '2px 4px',
    border: '1px solid var(--mm-border)',
    borderRadius: '3px',
    background: 'var(--mm-bg-input)',
    color: 'var(--mm-text-primary)',
    fontSize: '11px',
  },
  row: {
    display: 'flex',
    alignItems: 'center' as const,
    gap: '6px',
  },
  muted: {
    color: 'var(--mm-text-secondary)',
    fontSize: '11px',
  },
};

const CameraPathPanel: React.FC = () => {
  const {
    cameraPaths, activeCameraPathId, isCameraPathPlaying,
    addCameraPath, removeCameraPath, updateCameraPath,
    addCameraKeyframe, removeCameraKeyframe, updateCameraKeyframe,
    setActiveCameraPathId, setIsCameraPathPlaying,
  } = useEditorStore();

  const handleAddPath = useCallback(() => {
    const id = addCameraPath();
    setActiveCameraPathId(id);
  }, [addCameraPath, setActiveCameraPathId]);

  const handleCaptureKeyframe = useCallback((pathId: string) => {
    const cam = getCurrentCameraState();
    const kf: CameraKeyframe = {
      position: cam.position,
      target: cam.target,
      duration: 3,
      easing: 'ease-in-out',
    };
    addCameraKeyframe(pathId, kf);
  }, [addCameraKeyframe]);

  const handlePlayPath = useCallback((pathId: string) => {
    setActiveCameraPathId(pathId);
    setIsCameraPathPlaying(true);
  }, [setActiveCameraPathId, setIsCameraPathPlaying]);

  const handleStopPath = useCallback(() => {
    setIsCameraPathPlaying(false);
  }, [setIsCameraPathPlaying]);

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.row}><Camera size={16} /> Camera Paths</span>
        <button style={s.btn} onClick={handleAddPath}><Plus size={12} /> New Path</button>
      </div>

      {cameraPaths.length === 0 && (
        <div style={s.muted}>
          No camera paths yet. Create one and add keyframes by positioning the camera and clicking "Capture View".
        </div>
      )}

      {cameraPaths.map(cp => (
        <div key={cp.id} style={{
          ...s.pathItem,
          borderColor: activeCameraPathId === cp.id ? 'var(--mm-accent-primary)' : 'var(--mm-border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <input
              value={cp.name}
              onChange={(e) => updateCameraPath(cp.id, { name: e.target.value })}
              style={{ ...s.input, width: '120px', fontWeight: 600 }}
            />
            <div style={s.row}>
              {isCameraPathPlaying && activeCameraPathId === cp.id ? (
                <button style={s.btn} onClick={handleStopPath}><Pause size={12} /> Stop</button>
              ) : (
                <button
                  style={s.btnAccent}
                  onClick={() => handlePlayPath(cp.id)}
                  disabled={cp.keyframes.length < 2}
                  title={cp.keyframes.length < 2 ? 'Need at least 2 keyframes' : 'Play camera path'}
                >
                  <Play size={12} /> Play
                </button>
              )}
              <button style={s.btn} onClick={() => removeCameraPath(cp.id)}><Trash2 size={12} /></button>
            </div>
          </div>

          {/* Loop toggle */}
          <label style={{ ...s.row, fontSize: '11px', cursor: 'pointer', marginBottom: '4px' }}>
            <input
              type="checkbox"
              checked={cp.loop}
              onChange={(e) => updateCameraPath(cp.id, { loop: e.target.checked })}
            />
            Loop
          </label>

          {/* Capture button */}
          <button
            style={{ ...s.btn, width: '100%', justifyContent: 'center', marginBottom: '4px' }}
            onClick={() => handleCaptureKeyframe(cp.id)}
          >
            <Eye size={12} /> Capture Current View
          </button>

          {/* Keyframe list */}
          <div style={s.kfList}>
            {cp.keyframes.map((kf, ki) => (
              <div key={ki} style={s.kfItem}>
                <span>KF {ki + 1}: ({kf.position[0].toFixed(1)}, {kf.position[1].toFixed(1)}, {kf.position[2].toFixed(1)})</span>
                <div style={s.row}>
                  <label style={{ fontSize: '10px' }}>
                    {ki < cp.keyframes.length - 1 ? 'Duration:' : 'End'}
                  </label>
                  {ki < cp.keyframes.length - 1 && (
                    <input
                      type="number"
                      value={kf.duration}
                      min={0.5}
                      max={30}
                      step={0.5}
                      style={{ ...s.input, width: '40px' }}
                      onChange={(e) => updateCameraKeyframe(cp.id, ki, { duration: parseFloat(e.target.value) || 3 })}
                    />
                  )}
                  <button
                    onClick={() => removeCameraKeyframe(cp.id, ki)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-secondary)', padding: '2px' }}
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={s.muted}>
            {cp.keyframes.length} keyframe{cp.keyframes.length !== 1 ? 's' : ''} •
            Total: {cp.keyframes.reduce((t, kf) => t + kf.duration, 0).toFixed(1)}s
          </div>
        </div>
      ))}
    </div>
  );
};

export default CameraPathPanel;
