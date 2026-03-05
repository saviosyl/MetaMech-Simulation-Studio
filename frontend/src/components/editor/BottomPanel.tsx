/**
 * BottomPanel — Resizable simulation stats + validation
 *
 * Drag the top edge to resize vertically.
 * Collapsed: compact KPI bar
 * Expanded: full tabs with stats, flow, KPIs, validation
 */
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  BarChart3, AlertTriangle, Activity, ChevronUp, ChevronDown,
  GripHorizontal, Shield, Zap, CheckCircle2, XCircle, Info,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';
import { isAccessoryType } from '../../lib/accessorySnap';

type Tab = 'overview' | 'flow' | 'kpi' | 'validation';

const MIN_HEIGHT = 42;  // collapsed header only
const DEFAULT_HEIGHT = 200;
const MAX_HEIGHT = 500;

// ─── Styles ───
const S = {
  panel: (h: number) => ({
    position: 'absolute' as const, bottom: 0, left: 0, right: 0, zIndex: 20,
    height: h, display: 'flex', flexDirection: 'column' as const,
    background: 'var(--mm-bg-panel)', borderTop: '1px solid var(--mm-border)',
    transition: 'none',
  }),
  dragHandle: {
    position: 'absolute' as const, top: -6, left: 0, right: 0, height: 12,
    cursor: 'ns-resize', display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 21,
  },
  handleBar: {
    width: 40, height: 4, borderRadius: 2,
    background: 'var(--mm-border-strong)', opacity: 0.6,
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 16px', height: 36, flexShrink: 0,
    borderBottom: '1px solid var(--mm-border-subtle)',
    cursor: 'pointer',
  } as React.CSSProperties,
  tabs: {
    display: 'flex', gap: 2, padding: '6px 16px 0',
    borderBottom: '1px solid var(--mm-border-subtle)',
    flexShrink: 0,
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '6px 14px', fontSize: 11, fontWeight: 600,
    fontFamily: "'Orbitron', monospace", borderRadius: '6px 6px 0 0',
    border: 'none', cursor: 'pointer',
    background: active ? 'var(--mm-bg-surface)' : 'transparent',
    color: active ? 'var(--mm-accent-primary)' : 'var(--mm-text-tertiary)',
    borderBottom: active ? '2px solid var(--mm-accent-primary)' : '2px solid transparent',
    transition: 'all 0.15s',
  } as React.CSSProperties),
  content: {
    flex: 1, overflowY: 'auto' as const, padding: '10px 16px',
    fontSize: 12, color: 'var(--mm-text-secondary)',
  } as React.CSSProperties,
  kpiCard: {
    display: 'inline-flex', flexDirection: 'column' as const, alignItems: 'center',
    padding: '8px 16px', borderRadius: 8,
    background: 'var(--mm-bg-surface)', border: '1px solid var(--mm-border-subtle)',
    minWidth: 100,
  } as React.CSSProperties,
  kpiValue: { fontSize: 18, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: 'var(--mm-text-primary)' } as React.CSSProperties,
  kpiLabel: { fontSize: 9, fontWeight: 600, color: 'var(--mm-text-tertiary)', letterSpacing: '0.08em', marginTop: 2 } as React.CSSProperties,
  issueRow: (color: string) => ({
    display: 'flex', alignItems: 'flex-start', gap: 8,
    padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
    background: `${color}10`, transition: 'background 0.15s',
  } as React.CSSProperties),
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ─── Validation logic (shared with old ValidationPanel) ───
interface ValidationIssue {
  id: string; severity: 'error' | 'warning' | 'info' | 'success';
  title: string; detail: string; nodeId?: string;
}

function validateScene(nodes: any[], edges: any[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (nodes.length === 0) {
    issues.push({ id: 'empty', severity: 'info', title: 'Empty scene', detail: 'Add modules from the library to get started.' });
    return issues;
  }
  // Missing source
  const sources = nodes.filter((n: any) => n.type === 'source');
  if (sources.length === 0) issues.push({ id: 'no-source', severity: 'error', title: 'No source node', detail: 'Add a Source to generate products.' });
  // Missing sink
  const sinks = nodes.filter((n: any) => n.type === 'sink');
  if (sinks.length === 0) issues.push({ id: 'no-sink', severity: 'warning', title: 'No sink node', detail: 'Add a Sink to collect finished products.' });
  // Disconnected nodes
  const connectedIds = new Set<string>();
  edges.forEach((e: any) => { connectedIds.add(e.from); connectedIds.add(e.to); });
  const disconnected = nodes.filter((n: any) => !connectedIds.has(n.id) && !['source', 'sink'].includes(n.type) && !isAccessoryType(n.type));
  for (const n of disconnected) {
    issues.push({ id: `disc-${n.id}`, severity: 'warning', title: `"${n.name}" not connected`, detail: 'This node has no edges — products cannot reach it.', nodeId: n.id });
  }
  // Sources without output
  for (const src of sources) {
    if (!edges.some((e: any) => e.from === src.id)) {
      issues.push({ id: `src-no-out-${src.id}`, severity: 'error', title: `Source "${src.name}" has no output`, detail: 'Connect an output edge.', nodeId: src.id });
    }
  }
  // Sinks without input
  for (const sink of sinks) {
    if (!edges.some((e: any) => e.to === sink.id)) {
      issues.push({ id: `sink-no-in-${sink.id}`, severity: 'warning', title: `Sink "${sink.name}" has no input`, detail: 'Connect an input edge.', nodeId: sink.id });
    }
  }
  if (issues.length === 0) {
    issues.push({ id: 'all-good', severity: 'success', title: 'Layout looks good!', detail: `${nodes.length} nodes, ${edges.length} connections. Ready to simulate.` });
  }
  return issues;
}

const sevColors: Record<string, string> = { error: '#ef4444', warning: '#f59e0b', info: '#3b82f6', success: '#10b981' };
const sevIcons: Record<string, any> = { error: XCircle, warning: AlertTriangle, info: Info, success: CheckCircle2 };

const BottomPanel: React.FC = () => {
  const { isPlaying, processNodes, edges, selectObject } = useEditorStore();
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [collapsed, setCollapsed] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [stats, setStats] = useState<ReturnType<typeof simulationEngine.getStats> | null>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);

  // Poll simulation stats
  useEffect(() => {
    if (!isPlaying) return;
    const iv = setInterval(() => setStats(simulationEngine.getStats()), 500);
    return () => clearInterval(iv);
  }, [isPlaying]);

  // Drag resize
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    isDragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }, [height]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dy = startY.current - e.clientY;
      const newH = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startH.current + dy));
      setHeight(newH);
      if (newH > MIN_HEIGHT + 10) setCollapsed(false);
    };
    const onUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (height <= MIN_HEIGHT + 10) setCollapsed(true);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [height]);

  const toggleCollapse = () => {
    if (collapsed) { setCollapsed(false); setHeight(DEFAULT_HEIGHT); }
    else { setCollapsed(true); setHeight(MIN_HEIGHT); }
  };

  const issues = React.useMemo(() => validateScene(processNodes, edges), [processNodes, edges]);
  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const realIssueCount = errorCount + warnCount;

  const handleIssueClick = (issue: ValidationIssue) => {
    if (!issue.nodeId) return;
    selectObject(issue.nodeId, 'process');
    window.dispatchEvent(new CustomEvent('metamech:focus-node', { detail: { nodeId: issue.nodeId } }));
  };

  const tabs: { id: Tab; label: string; badge?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'flow', label: 'Flow' },
    { id: 'kpi', label: 'KPIs' },
    { id: 'validation', label: 'Validation', badge: realIssueCount },
  ];

  const actualHeight = collapsed ? MIN_HEIGHT : height;

  return (
    <div style={S.panel(actualHeight)}>
      {/* Drag handle */}
      {!collapsed && (
        <div style={S.dragHandle} onMouseDown={onMouseDown}>
          <div style={S.handleBar} />
        </div>
      )}

      {/* Header bar */}
      <div style={S.header} onClick={toggleCollapse}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <BarChart3 size={14} style={{ color: 'var(--mm-accent-primary)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "'Orbitron', monospace", color: 'var(--mm-text-primary)' }}>
            SIMULATION
          </span>
          {stats && (
            <span style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
              {formatTime(stats.simTime)} &nbsp;|&nbsp; {stats.productCount} products &nbsp;|&nbsp; {stats.throughputPerMin.toFixed(1)} TPM
            </span>
          )}
          {/* Validation badge */}
          {realIssueCount > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
              background: errorCount > 0 ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
              color: errorCount > 0 ? '#ef4444' : '#f59e0b',
            }}>
              <AlertTriangle size={10} />
              {realIssueCount}
            </span>
          )}
          {realIssueCount === 0 && processNodes.length > 0 && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700,
              background: 'rgba(16,185,129,0.15)', color: '#10b981',
            }}>
              <CheckCircle2 size={10} /> Valid
            </span>
          )}
        </div>
        <div style={{ color: 'var(--mm-text-tertiary)' }}>
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {/* Tabs */}
      {!collapsed && (
        <div style={S.tabs}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)} style={S.tab(activeTab === t.id)}>
              {t.label}
              {t.badge != null && t.badge > 0 && (
                <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 6, fontSize: 9, background: 'rgba(239,68,68,0.2)', color: '#ef4444' }}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {!collapsed && (
        <div style={S.content}>
          {activeTab === 'overview' && stats && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={S.kpiCard}><span style={S.kpiValue}>{stats.productCount}</span><span style={S.kpiLabel}>PRODUCTS</span></div>
              <div style={S.kpiCard}><span style={S.kpiValue}>{stats.throughputPerMin.toFixed(1)}</span><span style={S.kpiLabel}>TPM</span></div>
              <div style={S.kpiCard}><span style={S.kpiValue}>{formatTime(stats.simTime)}</span><span style={S.kpiLabel}>SIM TIME</span></div>
              <div style={S.kpiCard}><span style={S.kpiValue}>{stats.activeProducts}</span><span style={S.kpiLabel}>ACTIVE</span></div>
              <div style={S.kpiCard}><span style={S.kpiValue}>{stats.completedProducts}</span><span style={S.kpiLabel}>COMPLETE</span></div>
              <div style={S.kpiCard}><span style={S.kpiValue}>{stats.blockedProducts}</span><span style={S.kpiLabel}>BLOCKED</span></div>
            </div>
          )}
          {activeTab === 'overview' && !stats && (
            <div style={{ color: 'var(--mm-text-tertiary)', textAlign: 'center', padding: 20 }}>
              Press <strong>Play</strong> to start simulation and see stats.
            </div>
          )}

          {activeTab === 'flow' && stats && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stats.nodeDetails && Object.entries(stats.nodeDetails).map(([nodeId, detail]: [string, any]) => (
                <div key={nodeId} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '4px 8px',
                  background: 'var(--mm-bg-surface)', borderRadius: 6, fontSize: 11,
                }}>
                  <span style={{ color: 'var(--mm-text-primary)', fontWeight: 600 }}>{detail.name || nodeId.slice(0, 8)}</span>
                  <span style={{ color: 'var(--mm-text-tertiary)' }}>
                    Q:{detail.queueSize || 0} | T:{detail.throughput || 0} | U:{((detail.utilization || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
              {(!stats.nodeDetails || Object.keys(stats.nodeDetails).length === 0) && (
                <span style={{ color: 'var(--mm-text-tertiary)' }}>No node data yet.</span>
              )}
            </div>
          )}

          {activeTab === 'kpi' && stats && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={S.kpiCard}><span style={{ ...S.kpiValue, color: '#10b981' }}>{((stats.oee || 0) * 100).toFixed(1)}%</span><span style={S.kpiLabel}>OEE</span></div>
              <div style={S.kpiCard}><span style={{ ...S.kpiValue, color: '#06b6d4' }}>{((stats.availability || 0) * 100).toFixed(1)}%</span><span style={S.kpiLabel}>AVAILABILITY</span></div>
              <div style={S.kpiCard}><span style={{ ...S.kpiValue, color: '#8b5cf6' }}>{((stats.performance || 0) * 100).toFixed(1)}%</span><span style={S.kpiLabel}>PERFORMANCE</span></div>
              <div style={S.kpiCard}><span style={{ ...S.kpiValue, color: '#f59e0b' }}>{((stats.quality || 0) * 100).toFixed(1)}%</span><span style={S.kpiLabel}>QUALITY</span></div>
              <div style={S.kpiCard}><span style={S.kpiValue}>{(stats.avgCycleTime || 0).toFixed(1)}s</span><span style={S.kpiLabel}>AVG CYCLE</span></div>
            </div>
          )}

          {activeTab === 'validation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {issues.map(issue => {
                const color = sevColors[issue.severity] || '#6b7280';
                const Icon = sevIcons[issue.severity] || Info;
                return (
                  <div key={issue.id} onClick={() => handleIssueClick(issue)}
                    style={{ ...S.issueRow(color), cursor: issue.nodeId ? 'pointer' : 'default' }}>
                    <Icon size={14} style={{ color, flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color }}>{issue.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 1 }}>{issue.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BottomPanel;
