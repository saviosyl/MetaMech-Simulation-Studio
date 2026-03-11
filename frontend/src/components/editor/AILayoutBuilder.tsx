/**
 * AI Layout Builder — MetaMech Simulation Studio
 *
 * Modal dialog for generating layouts from requirements.
 * User fills in parameters → generates layout → loads into scene.
 */
import React, { useState } from 'react';
import { Wand2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { generateLayout, DEFAULT_LAYOUT_INPUT, LayoutInput, LayoutOutput } from '../../lib/aiLayoutBuilder';
import { useEditorStore } from '../../store/editorStore';

interface AILayoutBuilderProps {
  onClose: () => void;
}

const AILayoutBuilder: React.FC<AILayoutBuilderProps> = ({ onClose }) => {
  const [input, setInput] = useState<LayoutInput>({ ...DEFAULT_LAYOUT_INPUT });
  const [result, setResult] = useState<LayoutOutput | null>(null);
  const { loadScene, processNodes } = useEditorStore();

  const handleGenerate = () => {
    const output = generateLayout(input);
    setResult(output);
  };

  const handleApply = () => {
    if (!result) return;
    // Convert nodes to scene format
    const scene = {
      processNodes: result.nodes.map(n => ({
        ...n,
        scale: n.scale || [1, 1, 1],
        locked: false,
      })),
      edges: result.edges,
      environmentAssets: [],
      actors: [],
    };
    loadScene(scene);
    onClose();
  };

  const set = (key: keyof LayoutInput, value: any) => {
    setInput(prev => ({ ...prev, [key]: value }));
    setResult(null);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 13,
    background: 'var(--mm-bg-input)', border: '1px solid var(--mm-border)',
    borderRadius: 6, color: 'var(--mm-text-primary)', outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)',
    marginBottom: 4, display: 'block',
  };
  const rowStyle: React.CSSProperties = { marginBottom: 12 };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)',
        borderRadius: 12, width: '100%', maxWidth: 520, maxHeight: '85vh',
        overflow: 'auto', boxShadow: 'var(--mm-shadow-lg)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid var(--mm-border-subtle)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wand2 size={18} style={{ color: 'var(--mm-accent-primary)' }} />
            <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, fontFamily: "'Orbitron', monospace" }}>
              AI Layout Builder
            </h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-tertiary)', padding: 4 }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div style={{ padding: 20 }}>
          <div style={rowStyle}>
            <label style={labelStyle}>Description</label>
            <input type="text" value={input.summary} onChange={e => set('summary', e.target.value)} placeholder="Describe your line..." style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...rowStyle }}>
            <div>
              <label style={labelStyle}>Total Line Length (mm)</label>
              <input type="number" value={input.totalLengthMm} onChange={e => set('totalLengthMm', +e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Target TPM</label>
              <input type="number" value={input.targetTPM} onChange={e => set('targetTPM', +e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, ...rowStyle }}>
            <div>
              <label style={labelStyle}>Product L (mm)</label>
              <input type="number" value={input.productSizeMm[0]} onChange={e => set('productSizeMm', [+e.target.value, input.productSizeMm[1], input.productSizeMm[2]])} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Product W (mm)</label>
              <input type="number" value={input.productSizeMm[1]} onChange={e => set('productSizeMm', [input.productSizeMm[0], +e.target.value, input.productSizeMm[2]])} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Product H (mm)</label>
              <input type="number" value={input.productSizeMm[2]} onChange={e => set('productSizeMm', [input.productSizeMm[0], input.productSizeMm[1], +e.target.value])} style={inputStyle} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, ...rowStyle }}>
            <div>
              <label style={labelStyle}>Product Weight (kg)</label>
              <input type="number" value={input.productWeightKg} onChange={e => set('productWeightKg', +e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Belt Width (mm)</label>
              <input type="number" value={input.beltWidthMm} onChange={e => set('beltWidthMm', +e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div style={rowStyle}>
            <label style={labelStyle}>Line Type</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['straight', 'l-shape', 'u-shape'] as const).map(t => (
                <button key={t} onClick={() => set('lineType', t)} style={{
                  flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 600,
                  borderRadius: 6, border: '1px solid',
                  borderColor: input.lineType === t ? 'var(--mm-accent-primary)' : 'var(--mm-border)',
                  background: input.lineType === t ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                  color: input.lineType === t ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
                  cursor: 'pointer', textTransform: 'capitalize',
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...rowStyle }}>
            {[
              { key: 'includeSensorLogic', label: 'Sensor + Stopper Logic' },
              { key: 'includeInspection', label: 'Inspection (Checkweigher + Labeler)' },
              { key: 'includeRobotPalletizing', label: 'Robot Palletizing Cell' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--mm-text-secondary)' }}>
                <input type="checkbox" checked={(input as any)[key]} onChange={e => set(key as any, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>

          {/* Generate button */}
          <button onClick={handleGenerate} style={{
            width: '100%', padding: '10px 20px', fontSize: 14, fontWeight: 600,
            color: '#fff', background: 'linear-gradient(135deg, #0891b2, #06b6d4)',
            border: 'none', borderRadius: 8, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            <Wand2 size={16} /> Generate Layout
          </button>

          {/* Result */}
          {result && (
            <div style={{ marginTop: 16 }}>
              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
                marginBottom: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#10b981' }}>Layout Generated</span>
                </div>
                <p style={{ fontSize: 12, color: 'var(--mm-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                  {result.description}
                </p>
              </div>

              {result.warnings.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  {result.warnings.map((w, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 6, padding: '6px 10px',
                      borderRadius: 6, background: 'rgba(245,158,11,0.08)', marginBottom: 4,
                      fontSize: 11, color: '#f59e0b',
                    }}>
                      <AlertTriangle size={12} style={{ flexShrink: 0, marginTop: 1 }} />
                      {w}
                    </div>
                  ))}
                </div>
              )}

              <button onClick={handleApply} style={{
                width: '100%', padding: '10px 20px', fontSize: 14, fontWeight: 600,
                color: '#fff', background: 'linear-gradient(135deg, #059669, #10b981)',
                border: 'none', borderRadius: 8, cursor: 'pointer',
              }}>
                Apply to Scene
              </button>
              {processNodes.length > 0 && (
                <p style={{ fontSize: 11, color: 'var(--mm-text-disabled)', textAlign: 'center', marginTop: 6 }}>
                  ⚠ This will replace your current scene
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AILayoutBuilder;
