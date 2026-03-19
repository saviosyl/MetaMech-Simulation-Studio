/**
 * CameraViewToolbar — Camera mode + standard view presets
 * Reliable dropdown via portal (not clipped by parent ribbon overflow/transform)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye, ChevronDown, Check } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const VIEWS = [
  { id: 'top', label: 'Top View', desc: 'Normal to top plane', key: '7' },
  { id: 'front', label: 'Front View', desc: 'Normal to front plane', key: '1' },
  { id: 'right', label: 'Right View', desc: 'Normal to right plane', key: '3' },
  { id: 'left', label: 'Left View', desc: 'Normal to left plane', key: '' },
  { id: 'back', label: 'Back View', desc: 'Normal to back plane', key: '' },
  { id: 'bottom', label: 'Bottom View', desc: 'Normal to bottom plane', key: '' },
] as const;

const CameraViewToolbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const { setCameraView, setCameraMode, cameraMode } = useEditorStore();

  const updateMenuPos = useCallback(() => {
    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;
    const panelWidth = 200;
    const left = Math.max(8, Math.min(window.innerWidth - panelWidth - 8, rect.right - panelWidth));
    const top = rect.bottom + 5;
    setMenuPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    const onRelayout = () => updateMenuPos();
    window.addEventListener('resize', onRelayout);
    window.addEventListener('scroll', onRelayout, true);
    return () => {
      window.removeEventListener('resize', onRelayout);
      window.removeEventListener('scroll', onRelayout, true);
    };
  }, [open, updateMenuPos]);

  const switchToPerspective = () => {
    setCameraView('perspective');
    setOpen(false);
  };

  const switchToOrtho = () => {
    // Use top orthographic as deterministic entry point for CAD-like flat view.
    if (cameraMode !== 'orthographic') setCameraView('top');
    else setCameraMode('orthographic');
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={buttonRef}
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 32, padding: '0 9px', fontSize: 10, fontWeight: 600,
          color: 'var(--mm-text-secondary)', background: 'var(--mm-bg-panel)',
          border: '1px solid var(--mm-border-subtle)', borderRadius: 9, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
          transition: 'all 0.15s',
        }}
        title="Open camera presets (normal views and perspective)"
      >
        <Eye size={12} style={{ color: 'var(--mm-accent-primary)' }} />
        <span>{cameraMode === 'orthographic' ? 'Ortho' : '3D'}</span>
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 120 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            width: 200,
            background: 'var(--mm-bg-panel)',
            border: '1px solid var(--mm-border)',
            borderRadius: 9,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 130,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--mm-border-subtle)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--mm-text-tertiary)',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Camera Mode
            </div>
            <div style={{ display: 'flex', gap: 6, padding: 8, borderBottom: '1px solid var(--mm-border-subtle)' }}>
              <button
                onClick={switchToPerspective}
                title="Switch to 3D perspective camera mode"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: `1px solid ${cameraMode === 'perspective' ? 'rgba(6,182,212,0.45)' : 'var(--mm-border-subtle)'}`,
                  background: cameraMode === 'perspective' ? 'rgba(6,182,212,0.16)' : 'var(--mm-bg-surface)',
                  color: 'var(--mm-text-primary)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                3D {cameraMode === 'perspective' && <Check size={12} />}
              </button>
              <button
                onClick={switchToOrtho}
                title="Switch to orthographic camera mode (flat CAD-style views)"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 5,
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: `1px solid ${cameraMode === 'orthographic' ? 'rgba(6,182,212,0.45)' : 'var(--mm-border-subtle)'}`,
                  background: cameraMode === 'orthographic' ? 'rgba(6,182,212,0.16)' : 'var(--mm-bg-surface)',
                  color: 'var(--mm-text-primary)',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                Ortho {cameraMode === 'orthographic' && <Check size={12} />}
              </button>
            </div>

            <div style={{
              padding: '8px 12px',
              borderBottom: '1px solid var(--mm-border-subtle)',
              fontSize: 9,
              fontWeight: 700,
              color: 'var(--mm-text-tertiary)',
              fontFamily: "'Orbitron', monospace",
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Standard Views
            </div>
            {VIEWS.map(v => (
              <button
                key={v.id}
                onClick={() => { setCameraView(v.id); setOpen(false); }}
                title={`${v.label} — ${v.desc}`}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  border: 'none',
                  cursor: 'pointer',
                  background: 'transparent',
                  color: 'var(--mm-text-primary)',
                  fontSize: 12,
                  textAlign: 'left',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { (e.currentTarget).style.background = 'var(--mm-bg-surface)'; }}
                onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
              >
                <div>
                  <div style={{ fontWeight: 500 }}>{v.label}</div>
                  <div style={{ fontSize: 9, color: 'var(--mm-text-tertiary)', marginTop: 1 }}>{v.desc}</div>
                </div>
                {v.key && (
                  <span style={{
                    fontSize: 9,
                    padding: '2px 6px',
                    borderRadius: 4,
                    background: 'var(--mm-bg-input)',
                    color: 'var(--mm-text-tertiary)',
                    fontFamily: 'monospace',
                  }}>
                    {v.key}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </div>
  );
};

export default CameraViewToolbar;
