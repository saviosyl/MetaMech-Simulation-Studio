/**
 * CameraViewToolbar — Quick orthographic view switcher
 * Top / Front / Right / Left / Back / Perspective
 * Theme-aware — uses CSS variables
 */
import React, { useState } from 'react';
import { Eye, ChevronDown } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const VIEWS = [
  { id: 'top', label: 'Top View', desc: 'Normal to top plane', key: '7' },
  { id: 'front', label: 'Front View', desc: 'Normal to front plane', key: '1' },
  { id: 'right', label: 'Right View', desc: 'Normal to right plane', key: '3' },
  { id: 'left', label: 'Left View', desc: 'Normal to left plane', key: '' },
  { id: 'back', label: 'Back View', desc: 'Normal to back plane', key: '' },
  { id: 'bottom', label: 'Bottom View', desc: 'Normal to bottom plane', key: '' },
  { id: 'perspective', label: '3D Perspective', desc: 'Free orbit camera', key: '5' },
] as const;

const CameraViewToolbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { setCameraView, cameraMode } = useEditorStore();

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 8px', fontSize: 10, fontWeight: 600,
          color: '#cbd5e1', background: 'rgba(15,23,42,0.3)',
          border: '1px solid transparent', borderRadius: 8, cursor: 'pointer',
          fontFamily: "'Inter', sans-serif", letterSpacing: '0.01em',
          transition: 'all 0.15s',
        }}
        title="Open camera presets (normal views and perspective)"
      >
        <Eye size={13} style={{ color: '#67e8f9' }} />
        <span>{cameraMode === 'orthographic' ? 'Ortho' : '3D'}</span>
        <ChevronDown size={10} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={() => setOpen(false)} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 4, width: 180,
            background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)',
            borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 100,
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '8px 12px', borderBottom: '1px solid var(--mm-border-subtle)',
              fontSize: 9, fontWeight: 700, color: 'var(--mm-text-tertiary)',
              fontFamily: "'Orbitron', monospace", letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>
              Camera View
            </div>
            {VIEWS.map(v => (
              <button
                key={v.id}
                onClick={() => { setCameraView(v.id); setOpen(false); }}
                title={`${v.label} — ${v.desc}`}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', border: 'none', cursor: 'pointer',
                  background: 'transparent', color: 'var(--mm-text-primary)',
                  fontSize: 12, textAlign: 'left', transition: 'background 0.1s',
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
                    fontSize: 9, padding: '2px 6px', borderRadius: 4,
                    background: 'var(--mm-bg-input)', color: 'var(--mm-text-tertiary)',
                    fontFamily: 'monospace',
                  }}>
                    {v.key}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CameraViewToolbar;
