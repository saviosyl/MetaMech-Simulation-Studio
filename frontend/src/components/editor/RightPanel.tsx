import React, { useCallback, useRef, useState, useEffect } from 'react';
import { Settings, Move3D, RotateCw, Maximize, Palette, Sliders, ChevronLeft, ChevronRight, Layers, ChevronDown, ChevronUp, Eye, EyeOff, Zap, Radio } from 'lucide-react';
import { getConnectionPorts, useEditorStore } from '../../store/editorStore';
import { getModuleDefinition } from '../../lib/moduleLibrary';
import { getAssetById, ParametricAssetDef } from '../../lib/assetManifest';
import { simulationEngine } from '../../simulation/SimulationEngine';
import { mToMm, mmToM, radToDeg, degToRad } from '../../utils/units';
import { getPortWorldPosition } from '../../lib/nodeTransform';
import BOMPanel from './BOMPanel';
import { generateBOM } from '../../lib/bom/bomEngine';

/* ─── Collapsible Section ─── */
const Section: React.FC<{ title: string; icon?: any; children: React.ReactNode; defaultOpen?: boolean; badge?: string }> = ({ title, icon: Icon, children, defaultOpen = false, badge }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: '1px solid rgba(148,163,184,0.2)',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 10,
        background: 'var(--mm-bg-surface)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
      }}
    >
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: open ? 'var(--mm-bg-panel-hover)' : 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.1s' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {Icon && <Icon size={13} style={{ color: 'var(--mm-accent-primary)' }} />}
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mm-text-secondary)', letterSpacing: '0.05em', fontFamily: "'Orbitron', monospace" }}>{title.toUpperCase()}</span>
          {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, background: 'var(--mm-accent-primary-muted)', color: 'var(--mm-accent-primary)' }}>{badge}</span>}
        </span>
        {open ? <ChevronUp size={13} style={{ color: 'var(--mm-text-tertiary)' }} /> : <ChevronDown size={13} style={{ color: 'var(--mm-text-tertiary)' }} />}
      </button>
      {open && <div style={{ padding: '9px 12px', borderTop: '1px solid rgba(148,163,184,0.16)' }}>{children}</div>}
    </div>
  );
};

/* ─── Input helper ─── */
const inputStyle: React.CSSProperties = { width: '100%', padding: '6px 10px', fontSize: 12, background: 'var(--mm-bg-input)', border: '1px solid rgba(148,163,184,0.26)', borderRadius: 7, color: 'var(--mm-text-primary)', outline: 'none' };
const labelStyle: React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 600, color: 'var(--mm-text-tertiary)', marginBottom: 4, letterSpacing: '0.04em', textTransform: 'uppercase' };
const fieldGap: React.CSSProperties = { marginBottom: 10 };
const LENGTH_ANCHORED_TYPES = new Set(['conveyor', 'belt-conveyor', 'roller-conveyor', 'incline-conveyor', 'modular-conveyor-straight']);

/* ─── Parameter grouper ─── */
function groupParams(params: [string, any][]) {
  const geo: [string, any][] = [], sim: [string, any][] = [], logic: [string, any][] = [], appear: [string, any][] = [], adv: [string, any][] = [];
  const geoK = ['length','width','height','radius','angle','angleDeg','bendAngle','pitch','turns','drumDiameter','supportSpacing','conveyorType','driveType','showSupports','showLegs','showSideGuides','sideGuideHeight','adjustableFeetEnabled','footAdjustmentMm','supportType','legCount','ceilingHeight','hangerStyle','hangerCrossbar'];
  const simK = ['beltSpeed','speed','spawnRate','ppm','processTime','capacity','cycleTime','maxItems','productColor','productType','productLength','productWidth','productHeight','speedFactor','pickHeight','placeHeight','approachHeight','pickDelay','placeDelay','accumulationMode','accumulationZones'];
  const logK = ['stopperMode','stopperTag','triggerSensorTag','secondarySensorTag','stopCondition','releaseCondition','releaseDelay','stopCount','pusherMode','holdTime','releaseCount','openDuration','sensorTag','sensorType','detectColor','detectType','detectSize','colorFilter','typeFilter','cooldown','debounce','dwellTimeThreshold','onDwellEvent','showBeam','mountPosition','mountSide','mountHeight','parentConveyorId','lateralOffset','engaged','enabled','targetColor','targetProductType','routeBy','routeValues','stroke','side','runMode','blockedBySensorTag','dwellBlockThreshold','resumeDelay'];
  const appK = [
    'beltColor','frameColor','color','materialColor','finish',
    'wallColor','textureUrl','wallImageMode','wallImageOpacity','wallPatternRepeat',
    'wallLogoWidth','wallLogoHeight','wallLogoKeepAspect','wallLogoOffsetX','wallLogoOffsetY','wallLogoRotation',
    'productTextureUrl','productLabel','wallLabel','labelFontSize','labelColor',
  ];
  for (const [k, d] of params) {
    const kl = k.toLowerCase();
    if (geoK.some(g => kl.includes(g.toLowerCase()))) geo.push([k,d]);
    else if (simK.some(s => kl.includes(s.toLowerCase()))) sim.push([k,d]);
    else if (logK.some(l => kl.includes(l.toLowerCase()))) logic.push([k,d]);
    else if (appK.some(a => kl.includes(a.toLowerCase()))) appear.push([k,d]);
    else adv.push([k,d]);
  }
  return { geo, sim, logic, appear, adv };
}

const RightPanel: React.FC = () => {
  const { selectedObjectId, selectedObjectType, processNodes, environmentAssets, actors, transformMode, setTransformMode, updateObject, sceneSettings, setSceneSettings, rightPanelWidth, setRightPanelWidth, rightPanelCollapsed, setRightPanelCollapsed, isPlaying } = useEditorStore();
  const isResizing = useRef(false);
  const [, forceUpdate] = useState(0);

  // Poll sensor signals during simulation for live TRUE/FALSE display
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => forceUpdate(n => n + 1), 300);
    return () => clearInterval(iv);
  }, [isPlaying]);

  const selectedObject = React.useMemo(() => {
    if (!selectedObjectId || !selectedObjectType) return null;
    switch (selectedObjectType) {
      case 'process': return processNodes.find(n => n.id === selectedObjectId);
      case 'environment': return environmentAssets.find(a => a.id === selectedObjectId);
      case 'actor': return actors.find(a => a.id === selectedObjectId);
      default: return null;
    }
  }, [selectedObjectId, selectedObjectType, processNodes, environmentAssets, actors]);

  const moduleDef = selectedObject ? getModuleDefinition(selectedObject.type) : null;
  const widthMin = selectedObject ? 220 : 160;
  const widthMax = selectedObject ? 380 : 260;
  const paramAssetDef = React.useMemo(() => {
    if (!selectedObject || !(selectedObject as any).assetId) return null;
    const d = getAssetById((selectedObject as any).assetId);
    return d?.assetType === 'parametric' ? d as ParametricAssetDef : null;
  }, [selectedObject]);

  const handleParam = (k: string, v: any) => {
    if (!selectedObject || !selectedObjectType) return;

    // Keep conveyor infeed anchored while changing length, then carry downstream
    // connected nodes by the resulting outfeed delta to preserve node continuity.
    if (selectedObjectType === 'process' && k === 'length' && Number.isFinite(v)) {
      const state = useEditorStore.getState();
      const node = state.processNodes.find(n => n.id === selectedObject.id);
      if (node && LENGTH_ANCHORED_TYPES.has(node.type)) {
        const nextParameters = { ...node.parameters, [k]: v };
        const oldPorts = getConnectionPorts(node.type, node.parameters, node.assetId);
        const nextPorts = getConnectionPorts(node.type, nextParameters, node.assetId);
        const oldIn = oldPorts.find(p => p.type === 'input');
        const oldOut = oldPorts.find(p => p.type === 'output');
        const nextIn = nextPorts.find(p => p.type === 'input');
        const nextOut = nextPorts.find(p => p.type === 'output');

        if (oldIn && oldOut && nextIn && nextOut) {
          const inBefore = getPortWorldPosition(oldIn.localPosition, node);
          const outBefore = getPortWorldPosition(oldOut.localPosition, node);

          const previewNode = { ...node, parameters: nextParameters };
          const inAfter = getPortWorldPosition(nextIn.localPosition, previewNode);
          const anchorDelta: [number, number, number] = [
            inBefore[0] - inAfter[0],
            inBefore[1] - inAfter[1],
            inBefore[2] - inAfter[2],
          ];
          const anchoredPosition: [number, number, number] = [
            node.position[0] + anchorDelta[0],
            node.position[1] + anchorDelta[1],
            node.position[2] + anchorDelta[2],
          ];
          const anchoredNode = { ...previewNode, position: anchoredPosition };
          const outAfter = getPortWorldPosition(nextOut.localPosition, anchoredNode);
          const outDelta: [number, number, number] = [
            outAfter[0] - outBefore[0],
            outAfter[1] - outBefore[1],
            outAfter[2] - outBefore[2],
          ];

          updateObject(node.id, 'process', { parameters: nextParameters, position: anchoredPosition });

          const moved = new Set<string>();
          const outputPortIds = new Set(nextPorts.filter(p => p.type === 'output').map(p => p.id));
          const deltaMag = Math.abs(outDelta[0]) + Math.abs(outDelta[1]) + Math.abs(outDelta[2]);
          if (deltaMag > 1e-6) {
            for (const edge of state.edges) {
              if (edge.from !== node.id) continue;
              if (edge.fromPort && !outputPortIds.has(edge.fromPort)) continue;
              if (moved.has(edge.to)) continue;
              const downstream = state.processNodes.find(n => n.id === edge.to);
              if (!downstream) continue;
              moved.add(edge.to);
              updateObject(downstream.id, 'process', {
                position: [
                  downstream.position[0] + outDelta[0],
                  downstream.position[1] + outDelta[1],
                  downstream.position[2] + outDelta[2],
                ],
              });
            }
          }
          return;
        }

        updateObject(node.id, 'process', { parameters: nextParameters });
        return;
      }
    }

    updateObject(selectedObject.id, selectedObjectType, { parameters: { ...selectedObject.parameters, [k]: v } });
  };

  const handleTransform = (type: 'position' | 'rotation' | 'scale', axis: number, value: number) => {
    if (!selectedObject || !selectedObjectType) return;
    const arr = [...selectedObject[type]] as [number, number, number];
    arr[axis] = value;
    updateObject(selectedObject.id, selectedObjectType, { [type]: arr });
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); isResizing.current = true;
    const startX = e.clientX; const startW = rightPanelWidth;
    const move = (e: MouseEvent) => { if (!isResizing.current) return; setRightPanelWidth(startW - (e.clientX - startX)); };
    const up = () => { isResizing.current = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }, [rightPanelWidth, setRightPanelWidth]);

  // Get all sensor tags in the scene for dropdowns
  const allSensorTags = processNodes
    .filter(n => n.type === 'sensor' && n.parameters?.sensorTag)
    .map(n => n.parameters.sensorTag as string);

  const renderInput = (key: string, def: any) => {
    const val = selectedObject?.parameters[key];

    // Special: sensor tag dropdowns → populated with available sensor tags
    if (key === 'triggerSensorTag' || key === 'secondarySensorTag' || key === 'blockedBySensorTag') {
      return (
        <select value={val ?? ''} onChange={e => handleParam(key, e.target.value)} style={inputStyle}>
          <option value="" style={{ background: 'var(--mm-bg-panel)' }}>— None —</option>
          {allSensorTags.map(tag => (
            <option key={tag} value={tag} style={{ background: 'var(--mm-bg-panel)' }}>{tag}</option>
          ))}
        </select>
      );
    }

    switch (def.type) {
      case 'number': return <input type="number" value={val ?? def.default} onChange={e => handleParam(key, Number(e.target.value))} min={def.min} max={def.max} step={def.step} style={inputStyle} />;
      case 'text':
      case 'string': {
        // Texture fields get a file picker + URL input
        if (key.toLowerCase().includes('texture')) {
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="text" placeholder="Paste URL or pick file…" value={val ?? ''} onChange={e => handleParam(key, e.target.value)} style={{ ...inputStyle, flex: 1, fontSize: 10 }} />
                {val && <button onClick={() => handleParam(key, '')} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-tertiary)', cursor: 'pointer', fontSize: 10 }}>✕</button>}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 6, border: '1px dashed var(--mm-border)', background: 'var(--mm-bg-surface)', cursor: 'pointer', fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                📁 Choose Image…
                <input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => { handleParam(key, ev.target?.result as string); };
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }} />
              </label>
              {val && <div style={{ width: '100%', height: 48, borderRadius: 4, overflow: 'hidden', border: '1px solid var(--mm-border)' }}><img src={val} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
            </div>
          );
        }
        return <input type="text" value={val ?? def.default ?? ''} onChange={e => handleParam(key, e.target.value)} style={inputStyle} />;
      }
      case 'select': return (
        <select value={val ?? def.default} onChange={e => handleParam(key, e.target.value)} style={inputStyle}>
          {def.options?.map((o: string) => <option key={o} value={o} style={{ background: 'var(--mm-bg-panel)' }}>{o.charAt(0).toUpperCase() + o.slice(1).replace(/-/g, ' ')}</option>)}
        </select>);
      case 'boolean': return (
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 6, background: 'var(--mm-bg-surface)', cursor: 'pointer' }}>
          <input type="checkbox" checked={val ?? def.default} onChange={e => handleParam(key, e.target.checked)} />
          <span style={{ fontSize: 12, color: 'var(--mm-text-secondary)' }}>Enabled</span>
        </label>);
      case 'color': return (
        <div style={{ display: 'flex', gap: 6 }}>
          <input type="color" value={val ?? def.default} onChange={e => handleParam(key, e.target.value)} style={{ width: 36, height: 30, border: '1px solid var(--mm-border)', borderRadius: 6, cursor: 'pointer', background: 'var(--mm-bg-input)' }} />
          <input type="text" value={val ?? def.default} onChange={e => handleParam(key, e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        </div>);
      default: return <input type="text" value={val ?? def.default ?? ''} onChange={e => handleParam(key, e.target.value)} style={inputStyle} />;
    }
  };

  // Collapsed
  if (rightPanelCollapsed) {
    return (
      <div data-tour="right-properties" style={{ flexShrink: 0, width: 44, borderLeft: '1px solid var(--mm-border)', background: 'var(--mm-bg-panel)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button onClick={() => setRightPanelCollapsed(false)} style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-tertiary)' }} title="Expand">
          <ChevronLeft size={14} />
        </button>
      </div>
    );
  }

  return (
    <div data-tour="right-properties" style={{ flexShrink: 0, display: 'flex', height: '100%', overflow: 'hidden', width: Math.min(widthMax, Math.max(widthMin, rightPanelWidth)) }}>
      {/* Resize handle */}
      <div style={{ width: 4, cursor: 'col-resize', flexShrink: 0, background: 'transparent', transition: 'background 0.15s' }}
        onMouseDown={handleResizeStart}
        onMouseEnter={e => { (e.currentTarget).style.background = 'var(--mm-accent-primary)'; }}
        onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }} />

      <div
        style={{
          flex: 1,
          background: 'var(--mm-bg-panel)',
          borderLeft: '1px solid var(--mm-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'inset 1px 0 0 rgba(255,255,255,0.02)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '10px 12px',
            borderBottom: '1px solid var(--mm-border-subtle)',
            background: 'var(--mm-bg-toolbar-secondary)',
            backdropFilter: 'blur(6px)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: 'var(--mm-text-secondary)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.05em' }}>
            <Settings size={13} style={{ color: 'var(--mm-accent-primary)' }} /> PROPERTIES
          </span>
          <button onClick={() => setRightPanelCollapsed(true)} style={{ padding: 5, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--mm-text-tertiary)' }} title="Collapse">
            <ChevronRight size={13} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {selectedObject ? (
            <div style={{ padding: 12 }}>
              {/* Object info */}
              <Section title="Object" icon={Settings} defaultOpen={true}>
                <div style={fieldGap}>
                  <label style={labelStyle}>Name</label>
                  <input type="text" value={selectedObject.name} onChange={e => updateObject(selectedObject.id, selectedObjectType!, { name: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Type</label>
                  <div style={{ padding: '6px 10px', fontSize: 12, color: 'var(--mm-text-secondary)', background: 'var(--mm-bg-surface)', borderRadius: 6, textTransform: 'capitalize' }}>
                    {moduleDef?.name || selectedObject.type.replace(/-/g, ' ')}
                  </div>
                </div>
              </Section>

              {/* Live Source State */}
              {selectedObject.type === 'source' && (() => {
                const state = (selectedObject.parameters as any)?._sourceState || 'RUNNING';
                const colors: Record<string, string> = { RUNNING: '#10b981', BLOCKED: '#ef4444', RESUMING: '#f59e0b', PAUSED: '#64748b' };
                const color = colors[state] || '#64748b';
                return (
                  <div style={{
                    margin: '0 0 8px 0', padding: '8px 12px', borderRadius: 8,
                    background: `${color}15`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: state === 'RUNNING' ? `0 0 8px ${color}80` : 'none' }} />
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron', monospace", color }}>{state}</span>
                  </div>
                );
              })()}

              {/* Live Sensor Signal — shown for sensors and stoppers */}
              {selectedObject.type === 'sensor' && selectedObject.parameters?.sensorTag && (() => {
                const tag = selectedObject.parameters.sensorTag;
                const signal = simulationEngine.getSensorSignals().get(tag);
                const isActive = signal?.active ?? false;
                return (
                  <div style={{
                    margin: '0 0 8px 0', padding: '10px 12px', borderRadius: 8,
                    background: isActive ? 'rgba(16,185,129,0.12)' : 'rgba(100,116,139,0.1)',
                    border: `1px solid ${isActive ? 'rgba(16,185,129,0.3)' : 'var(--mm-border-subtle)'}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <Radio size={16} style={{ color: isActive ? '#10b981' : 'var(--mm-text-disabled)' }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: isActive ? '#10b981' : 'var(--mm-text-tertiary)' }}>
                        {tag}: {isActive ? 'TRUE' : 'FALSE'}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--mm-text-disabled)', marginTop: 2 }}>
                        {isActive ? `Detecting product` : 'No product in zone'}
                      </div>
                    </div>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%', flexShrink: 0, marginLeft: 'auto',
                      background: isActive ? '#10b981' : '#475569',
                      boxShadow: isActive ? '0 0 8px rgba(16,185,129,0.5)' : 'none',
                    }} />
                  </div>
                );
              })()}

              {selectedObject.type === 'stopper' && (() => {
                const stoppedCount = processNodes.length > 0 ? 0 : 0; // placeholder
                const hasStopped = simulationEngine.getProducts().some(p => p.stoppedBy === selectedObject.id);
                const state = hasStopped ? 'CLOSED' : 'OPEN';
                const color = hasStopped ? '#ef4444' : '#10b981';
                return (
                  <div style={{
                    margin: '0 0 8px 0', padding: '8px 12px', borderRadius: 8,
                    background: `${color}15`, border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron', monospace", color }}>
                      {selectedObject.parameters?.stopperTag || 'ST???'}: {state}
                    </span>
                  </div>
                );
              })()}

              {selectedObject.type === 'stopper' && selectedObject.parameters?.triggerSensorTag && (() => {
                const tag = selectedObject.parameters.triggerSensorTag;
                const signal = simulationEngine.getSensorSignals().get(tag);
                const isActive = signal?.active ?? false;
                return (
                  <div style={{
                    margin: '0 0 8px 0', padding: '8px 12px', borderRadius: 8,
                    background: 'rgba(100,116,139,0.08)', border: '1px solid var(--mm-border-subtle)',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
                  }}>
                    <span style={{ color: 'var(--mm-text-tertiary)' }}>Trigger:</span>
                    <span style={{ fontWeight: 700, fontFamily: "'Orbitron', monospace", color: isActive ? '#10b981' : 'var(--mm-text-disabled)' }}>
                      {tag} = {isActive ? 'TRUE' : 'FALSE'}
                    </span>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', marginLeft: 'auto',
                      background: isActive ? '#10b981' : '#475569',
                    }} />
                  </div>
                );
              })()}

              {/* Robot Debug View */}
              {['cartesian-robot', 'cobot', 'robot-5axis', 'robot-6axis'].includes(selectedObject.type) && (() => {
                const rState = simulationEngine.getRobotStates().get(selectedObject.id);
                if (!rState) return null;
                const phaseColors: Record<string, string> = {
                  'idle': '#64748b', 'approach-pick': '#f59e0b', 'pick': '#10b981',
                  'retract-pick': '#06b6d4', 'move-to-place': '#8b5cf6',
                  'approach-place': '#f59e0b', 'place': '#10b981',
                  'retract-place': '#06b6d4', 'return': '#64748b',
                };
                const color = phaseColors[rState.phase] || '#64748b';
                const stuckReason = rState.phase === 'idle' && !rState.heldProductId
                  ? 'Waiting for product at pick point'
                  : null;
                return (
                  <div style={{
                    margin: '0 0 8px 0', padding: '10px 12px', borderRadius: 8,
                    background: `${color}15`, border: `1px solid ${color}30`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron', monospace", color, textTransform: 'uppercase' }}>
                        {rState.phase.replace(/-/g, ' ')}
                      </span>
                      <span style={{ fontSize: 10, color: 'var(--mm-text-disabled)', marginLeft: 'auto' }}>
                        Cycle #{rState.cycleCount}
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', lineHeight: 1.6 }}>
                      {rState.heldProductId && <div>🤏 Holding: {rState.heldProductId.slice(0, 8)}</div>}
                      {rState.phase !== 'idle' && <div>Progress: {Math.round(rState.phaseProgress * 100)}%</div>}
                      <div>Gripper: {rState.gripperOpen ? 'OPEN' : 'CLOSED'}</div>
                      {stuckReason && <div style={{ color: '#f59e0b', marginTop: 4 }}>⚠ {stuckReason}</div>}
                    </div>
                  </div>
                );
              })()}

              {/* Transform */}
              <Section title="Transform" icon={Move3D} defaultOpen={true}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {[{ m: 'translate', icon: Move3D, l: 'Move' }, { m: 'rotate', icon: RotateCw, l: 'Rotate' }, { m: 'scale', icon: Maximize, l: 'Scale' }].map(({ m, icon: I, l }) => (
                    <button key={m} onClick={() => setTransformMode(m as any)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 4px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 600, fontFamily: "'Orbitron', monospace",
                        background: transformMode === m ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
                        color: transformMode === m ? 'var(--mm-accent-primary)' : 'var(--mm-text-tertiary)', transition: 'all 0.15s' }}>
                      <I size={13} />{l}
                    </button>
                  ))}
                </div>
                {([['Position (mm)', 'position', (v: number) => Math.round(mToMm(v)), (v: number) => mmToM(v), 50],
                   ['Rotation (°)', 'rotation', (v: number) => +radToDeg(v).toFixed(1), (v: number) => degToRad(v), 1],
                   ['Scale', 'scale', (v: number) => +v.toFixed(2), (v: number) => v, 0.1]] as const).map(([label, prop, toDisplay, fromInput, step]) => (
                  <div key={prop} style={fieldGap}>
                    <label style={labelStyle}>{label}</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4 }}>
                      {['X', 'Y', 'Z'].map((axis, i) => (
                        <div key={axis}>
                          <span style={{ fontSize: 9, color: 'var(--mm-text-disabled)', marginBottom: 2, display: 'block' }}>{axis}</span>
                          <input type="number" value={(toDisplay as any)(selectedObject[prop][i])} onChange={e => handleTransform(prop as any, i, (fromInput as any)(Number(e.target.value)))} step={step as number} style={{ ...inputStyle, padding: '4px 6px', fontSize: 11 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </Section>

              {/* Module params — always show grouped (covers both parametric + non-parametric) */}
              {moduleDef && (() => {
                const g = groupParams(Object.entries(moduleDef.parameters));
                return (<>
                  {g.geo.length > 0 && <Section title="Geometry" icon={Maximize} defaultOpen={true}>{g.geo.map(([k,d]) => <div key={k} style={fieldGap}><label style={labelStyle}>{d.label}</label>{renderInput(k,d)}</div>)}</Section>}
                  {g.sim.length > 0 && <Section title="Simulation" icon={Sliders} defaultOpen={true} badge="SIM">{g.sim.map(([k,d]) => <div key={k} style={fieldGap}><label style={labelStyle}>{d.label}</label>{renderInput(k,d)}</div>)}</Section>}
                  {g.logic.length > 0 && <Section title="Logic" icon={Zap} defaultOpen={['sensor','stopper','pusher','source'].includes(selectedObject.type)} badge="LOGIC">{g.logic.map(([k,d]) => <div key={k} style={fieldGap}><label style={labelStyle}>{d.label}</label>{renderInput(k,d)}</div>)}</Section>}
                  {g.appear.length > 0 && <Section title="Appearance" icon={Palette} defaultOpen={true}>{g.appear.map(([k,d]) => <div key={k} style={fieldGap}><label style={labelStyle}>{d.label}</label>{renderInput(k,d)}</div>)}</Section>}
                  {g.adv.length > 0 && <Section title="Advanced" icon={Settings} defaultOpen={false}>{g.adv.map(([k,d]) => <div key={k} style={fieldGap}><label style={labelStyle}>{d.label}</label>{renderInput(k,d)}</div>)}</Section>}
                </>);
              })()}
            </div>
          ) : (
            <div style={{ padding: 12 }}>
              {/* Scene settings */}
              <Section title="Scene" icon={Palette} defaultOpen={true}>
                <div style={fieldGap}>
                  <label style={labelStyle}>Environment</label>
                  <select value={sceneSettings.environment} onChange={e => setSceneSettings({ environment: e.target.value as any })} style={inputStyle}>
                    {['factory', 'studio-white', 'dark-showroom', 'transparent'].map(v => <option key={v} value={v} style={{ background: 'var(--mm-bg-panel)' }}>{v.charAt(0).toUpperCase() + v.slice(1).replace('-', ' ')}</option>)}
                  </select>
                </div>
                {[{ label: 'Grid', checked: sceneSettings.grid.visible, set: (v: boolean) => setSceneSettings({ grid: { ...sceneSettings.grid, visible: v } }) },
                  { label: 'Axes', checked: sceneSettings.axes.visible, set: (v: boolean) => setSceneSettings({ axes: { ...sceneSettings.axes, visible: v } }) }].map(item => (
                  <label key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 8px', borderRadius: 6, background: 'var(--mm-bg-surface)', cursor: 'pointer', marginBottom: 4 }}>
                    <input type="checkbox" checked={item.checked} onChange={e => item.set(e.target.checked)} />
                    {item.checked ? <Eye size={13} style={{ color: 'var(--mm-accent-primary)' }} /> : <EyeOff size={13} style={{ color: 'var(--mm-text-disabled)' }} />}
                    <span style={{ fontSize: 12, color: 'var(--mm-text-secondary)' }}>{item.label}</span>
                  </label>
                ))}
              </Section>

              {/* Empty state */}
              <div style={{ textAlign: 'center', padding: '16px 0 4px' }}>
                <div style={{ width: 100, margin: '0 auto', padding: '10px 10px 8px', borderRadius: 10, border: '1px dashed rgba(148,163,184,0.26)', background: 'var(--mm-bg-surface)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px' }}>
                    <Sliders size={16} style={{ color: 'var(--mm-text-disabled)' }} />
                  </div>
                  <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--mm-text-disabled)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Orbitron', monospace" }}>
                    Inspector
                  </div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mm-text-tertiary)', marginTop: 10, marginBottom: 4 }}>No object selected</div>
                <div style={{ fontSize: 11, color: 'var(--mm-text-disabled)' }}>Click an object to edit properties</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
