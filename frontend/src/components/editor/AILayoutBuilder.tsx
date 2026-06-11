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

const LAYOUT_PRESETS: { id: string; name: string; apply: Partial<LayoutInput> }[] = [
  {
    id: 'fmcg-eol',
    name: 'FMCG EOL',
    apply: {
      summary: 'FMCG end-of-line with inspection and palletizing',
      lineType: 'straight',
      targetTPM: 24,
      totalLengthMm: 16000,
      includeInspection: true,
      includeSensorLogic: true,
      includeRobotPalletizing: true,
      includeBufferZone: true,
      optimizeFor: 'balanced',
      autoRouteAndSpace: true,
    },
  },
  {
    id: 'compact-cell',
    name: 'Compact Cell',
    apply: {
      summary: 'Compact U-shape cell for constrained floor space',
      lineType: 'u-shape',
      targetTPM: 16,
      totalLengthMm: 11000,
      includeInspection: false,
      includeSensorLogic: true,
      includeRobotPalletizing: false,
      includeBufferZone: true,
      optimizeFor: 'compact',
      autoRouteAndSpace: true,
    },
  },
  {
    id: 'high-throughput',
    name: 'High Throughput',
    apply: {
      summary: 'Higher throughput line with accumulation and palletizing',
      lineType: 'l-shape',
      targetTPM: 40,
      totalLengthMm: 18000,
      includeInspection: true,
      includeSensorLogic: true,
      includeRobotPalletizing: true,
      includeBufferZone: true,
      optimizeFor: 'throughput',
      autoRouteAndSpace: true,
    },
  },
];

const AILayoutBuilder: React.FC<AILayoutBuilderProps> = ({ onClose }) => {
  const [input, setInput] = useState<LayoutInput>({ ...DEFAULT_LAYOUT_INPUT });
  const [result, setResult] = useState<LayoutOutput | null>(null);
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const { loadScene, processNodes, getSceneData } = useEditorStore();

  const handleGenerate = () => {
    const output = generateLayout(input);
    setResult(output);
  };

  const handleApply = () => {
    if (!result) return;
    // Convert nodes to scene format
    const generatedScene = {
      processNodes: result.nodes.map(n => ({
        ...n,
        scale: n.scale || [1, 1, 1],
        locked: false,
      })),
      edges: result.edges,
      environmentAssets: [],
      actors: [],
    };
    if (applyMode === 'replace') {
      loadScene(generatedScene);
      onClose();
      return;
    }

    const current = getSceneData();
    const currentMaxX = (current.processNodes || []).reduce((max: number, n: any) => Math.max(max, Number(n?.position?.[0] || 0)), 0);
    const generatedMinX = generatedScene.processNodes.reduce((min: number, n: any) => Math.min(min, Number(n?.position?.[0] || 0)), 0);
    const appendOffsetX = currentMaxX - generatedMinX + 4.0;
    const shiftedNodes = generatedScene.processNodes.map((n: any) => ({
      ...n,
      position: [Number(n.position?.[0] || 0) + appendOffsetX, Number(n.position?.[1] || 0), Number(n.position?.[2] || 0)] as [number, number, number],
    }));

    loadScene({
      ...current,
      processNodes: [...(current.processNodes || []), ...shiftedNodes],
      edges: [...(current.edges || []), ...generatedScene.edges],
    });
    onClose();
  };

  const applyPreset = (presetId: string) => {
    const preset = LAYOUT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setInput(prev => ({ ...prev, ...preset.apply }));
    setResult(null);
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
            <label style={labelStyle}>Quick Presets</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
              {LAYOUT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  style={{
                    padding: '7px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid var(--mm-border)',
                    background: 'var(--mm-bg-surface)',
                    color: 'var(--mm-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

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

          <div style={rowStyle}>
            <label style={labelStyle}>Optimize For</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 6 }}>
              {(['balanced', 'throughput', 'compact', 'cost'] as const).map((goal) => (
                <button
                  key={goal}
                  onClick={() => set('optimizeFor', goal)}
                  style={{
                    padding: '8px 6px',
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: input.optimizeFor === goal ? 'var(--mm-accent-primary)' : 'var(--mm-border)',
                    background: input.optimizeFor === goal ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                    color: input.optimizeFor === goal ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                  }}
                >
                  {goal}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, ...rowStyle }}>
            {[
              { key: 'includeSensorLogic', label: 'Sensor + Stopper Logic' },
              { key: 'includeInspection', label: 'Inspection (Checkweigher + Labeler)' },
              { key: 'includeRobotPalletizing', label: 'Robot Palletizing Cell' },
              { key: 'includeBufferZone', label: 'Accumulation Buffer Zone' },
              { key: 'autoRouteAndSpace', label: 'Auto-route + Auto-space pass' },
            ].map(({ key, label }) => (
              <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--mm-text-secondary)' }}>
                <input type="checkbox" checked={(input as any)[key]} onChange={e => set(key as any, e.target.checked)} />
                {label}
              </label>
            ))}
          </div>

          <div style={{ ...rowStyle, marginTop: -2 }}>
            <label style={labelStyle}>Apply Mode</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'replace', label: 'Replace Scene' },
                { id: 'append', label: 'Append Right (+4m)' },
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setApplyMode(mode.id as 'replace' | 'append')}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 6,
                    border: '1px solid',
                    borderColor: applyMode === mode.id ? 'var(--mm-accent-primary)' : 'var(--mm-border)',
                    background: applyMode === mode.id ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                    color: applyMode === mode.id ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
                    cursor: 'pointer',
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
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

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gap: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', marginBottom: 2 }}>Est. Throughput</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mm-text-primary)' }}>{result.kpis.estimatedThroughputTpm} TPM</div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', marginBottom: 2 }}>Cycle Time</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mm-text-primary)' }}>{result.kpis.estimatedCycleTimeSec}s</div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', marginBottom: 2 }}>Footprint</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mm-text-primary)' }}>{result.kpis.estimatedFootprintM2} m²</div>
                </div>
                <div style={{ padding: '8px 10px', borderRadius: 6, background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)' }}>
                  <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', marginBottom: 2 }}>Capex Band</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--mm-text-primary)' }}>{result.kpis.capexBand}</div>
                </div>
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
                  {applyMode === 'replace' ? '⚠ This will replace your current scene' : 'Generated layout will be appended to the right of current scene'}
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
