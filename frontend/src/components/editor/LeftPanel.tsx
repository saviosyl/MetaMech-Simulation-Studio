import React, { useCallback, useRef, useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight, List, LayoutGrid, LayoutList, Package, Building, Users, Cpu, SquareStack, Factory, Shield } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getModulesByCategory, ModuleDefinition } from '../../lib/moduleLibrary';
import SceneHierarchy from './SceneHierarchy';
import PathPanel from './PathPanel';
import CameraPathPanel from './CameraPathPanel';

type ViewLayout = 'compact' | 'grid';

const TABS = [
  { id: 'process' as const, name: 'Process', icon: Factory },
  { id: 'fmcg' as const, name: 'FMCG', icon: Package },
  { id: 'medical' as const, name: 'Medical', icon: Shield },
  { id: 'robots' as const, name: 'Robots', icon: Cpu },
  { id: 'pallets' as const, name: 'Pallets', icon: SquareStack },
  { id: 'environment' as const, name: 'Environ', icon: Building },
  { id: 'actors' as const, name: 'Actors', icon: Users },
];

function getSubcategory(module: ModuleDefinition): string {
  const n = module.id.toLowerCase();
  if (n.includes('conveyor') || n.includes('belt') || n.includes('roller') || n.includes('modular')) return 'Conveyors';
  if (n.includes('stopper') || n.includes('pusher-module')) return 'Accessories';
  if (n.includes('transfer') || n.includes('merge') || n.includes('divert') || n.includes('pusher') || n.includes('popup')) return 'Transfers';
  if (n.includes('spiral') || n.includes('lifter') || n.includes('vertical')) return 'Vertical Transport';
  if (n.includes('source') || n.includes('sink')) return 'Flow Control';
  if (n.includes('machine') || n.includes('palletizer') || n.includes('pick') || n.includes('robot')) return 'Machines';
  if (n.includes('buffer') || n.includes('router')) return 'Routing & Storage';
  if (n.includes('wall') || n.includes('door') || n.includes('window') || n.includes('stair')) return 'Building';
  if (n.includes('rack') || n.includes('pallet') || n.includes('box') || n.includes('rail') || n.includes('floor') || n.includes('warehouse')) return 'Warehouse';
  if (n.includes('operator') || n.includes('engineer') || n.includes('worker')) return 'People';
  if (n.includes('forklift') || n.includes('agv') || n.includes('truck')) return 'Vehicles';
  return 'Other';
}

const LeftPanel: React.FC = () => {
  const { activeLibraryTab, setActiveLibraryTab, leftPanelWidth, setLeftPanelWidth, leftPanelCollapsed, setLeftPanelCollapsed } = useEditorStore();
  const isResizing = useRef(false);
  const [viewMode, setViewMode] = useState<'library' | 'scene'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<ViewLayout>('compact');

  const allModules = getModulesByCategory(activeLibraryTab);
  const modules = useMemo(() => {
    if (!searchQuery.trim()) return allModules;
    const q = searchQuery.toLowerCase();
    return allModules.filter(m => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  }, [allModules, searchQuery]);

  const groupedModules = useMemo(() => {
    const g: Record<string, ModuleDefinition[]> = {};
    modules.forEach(m => { const k = getSubcategory(m); if (!g[k]) g[k] = []; g[k].push(m); });
    return g;
  }, [modules]);

  const handleDragStart = (e: React.DragEvent, module: ModuleDefinition) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'module', moduleId: module.id, category: module.category }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault(); isResizing.current = true;
    const startX = e.clientX; const startWidth = leftPanelWidth;
    const move = (e: MouseEvent) => { if (!isResizing.current) return; setLeftPanelWidth(startWidth + (e.clientX - startX)); };
    const up = () => { isResizing.current = false; document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); document.body.style.cursor = ''; document.body.style.userSelect = ''; };
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  }, [leftPanelWidth, setLeftPanelWidth]);

  // ─── Collapsed sidebar ───
  if (leftPanelCollapsed) {
    return (
      <div data-tour="left-library" style={{ flexShrink: 0, width: 44, borderRight: '1px solid var(--mm-border)', background: 'var(--mm-bg-panel)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 10, gap: 4 }}>
        <button onClick={() => setLeftPanelCollapsed(false)} style={{ padding: 6, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-tertiary)' }} title="Expand">
          <ChevronRight size={14} />
        </button>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeLibraryTab === tab.id;
          return (
            <button key={tab.id} onClick={() => { setActiveLibraryTab(tab.id); setLeftPanelCollapsed(false); }}
              style={{ padding: 6, borderRadius: 6, background: active ? 'var(--mm-accent-primary-muted)' : 'none', border: 'none', cursor: 'pointer', color: active ? 'var(--mm-accent-primary)' : 'var(--mm-text-tertiary)', transition: 'all 0.15s' }} title={tab.name}>
              <Icon size={15} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div data-tour="left-library" style={{ flexShrink: 0, display: 'flex', height: '100%', overflow: 'hidden', width: Math.min(360, Math.max(200, leftPanelWidth)) }}>
      <div
        style={{
          flex: 1,
          background: 'var(--mm-bg-panel)',
          borderRight: '1px solid var(--mm-border)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: 'inset -1px 0 0 rgba(255,255,255,0.02)',
        }}
      >
        
        {/* Header */}
        <div
          style={{
            padding: '9px 12px',
            borderBottom: '1px solid var(--mm-border-subtle)',
            background: 'rgba(15,23,42,0.34)',
            backdropFilter: 'blur(6px)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {(['library', 'scene'] as const).map(m => (
                <button key={m} onClick={() => setViewMode(m)}
                  style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Orbitron', monospace", letterSpacing: '0.05em',
                    background: viewMode === m ? 'var(--mm-accent-primary-muted)' : 'transparent',
                    color: viewMode === m ? 'var(--mm-accent-primary)' : 'var(--mm-text-tertiary)',
                    transition: 'all 0.15s',
                  }}>
                  {m === 'scene' && <List size={10} style={{ marginRight: 4, verticalAlign: -1 }} />}
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {viewMode === 'library' && (
                <>
                  <button onClick={() => setLayout('compact')} style={{ padding: 5, borderRadius: 4, border: 'none', cursor: 'pointer', background: layout === 'compact' ? 'var(--mm-bg-surface)' : 'transparent', color: layout === 'compact' ? 'var(--mm-text-primary)' : 'var(--mm-text-tertiary)' }} title="List">
                    <LayoutList size={13} />
                  </button>
                  <button onClick={() => setLayout('grid')} style={{ padding: 5, borderRadius: 4, border: 'none', cursor: 'pointer', background: layout === 'grid' ? 'var(--mm-bg-surface)' : 'transparent', color: layout === 'grid' ? 'var(--mm-text-primary)' : 'var(--mm-text-tertiary)' }} title="Grid">
                    <LayoutGrid size={13} />
                  </button>
                </>
              )}
              <button onClick={() => setLeftPanelCollapsed(true)} style={{ padding: 5, borderRadius: 4, border: 'none', cursor: 'pointer', background: 'transparent', color: 'var(--mm-text-tertiary)' }} title="Collapse">
                <ChevronLeft size={13} />
              </button>
            </div>
          </div>

          {viewMode === 'library' && (
            <div style={{ position: 'relative' }}>
              <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--mm-text-tertiary)' }} />
              <input
                type="text" placeholder="Search assets…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: 30, paddingRight: 10, paddingTop: 7, paddingBottom: 7, fontSize: 12, background: 'var(--mm-bg-input)', border: '1px solid var(--mm-border)', borderRadius: 6, color: 'var(--mm-text-primary)', outline: 'none' }}
              />
            </div>
          )}
        </div>

        {viewMode === 'scene' ? <SceneHierarchy /> : (
          <>
            {/* Category tabs — single compact strip with horizontal scroll */}
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 5,
                padding: '7px 8px',
                borderBottom: '1px solid var(--mm-border-subtle)',
                background: 'rgba(15,23,42,0.2)',
                flexShrink: 0,
                overflow: 'hidden',
              }}
            >
              {TABS.map(tab => {
                const active = activeLibraryTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button key={tab.id} onClick={() => setActiveLibraryTab(tab.id)}
                    title={`Show ${tab.name} assets`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '5px 7px', borderRadius: 6, minWidth: 0,
                      border: `1px solid ${active ? 'rgba(34,211,238,0.3)' : 'rgba(148,163,184,0.16)'}`,
                      background: active ? 'var(--mm-accent-primary-muted)' : 'rgba(15,23,42,0.24)',
                      color: active ? 'var(--mm-accent-primary)' : 'var(--mm-text-tertiary)',
                      cursor: 'pointer', fontSize: 10, fontWeight: 600,
                      fontFamily: "'Orbitron', monospace", transition: 'all 0.15s',
                    }}>
                    <Icon size={12} />
                    <span style={{ lineHeight: 1, whiteSpace: 'nowrap' }}>{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Module list */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '10px 12px' }}>
              {Object.entries(groupedModules).map(([group, items]) => (
                <div key={group} style={{ marginBottom: 12, border: '1px solid rgba(148,163,184,0.16)', borderRadius: 10, background: 'rgba(15,23,42,0.2)', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6, position: 'sticky', top: 0, background: 'rgba(2,6,23,0.72)', zIndex: 5, padding: '6px 8px', borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mm-text-tertiary)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Orbitron', monospace" }}>
                      {group}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--mm-text-disabled)', padding: '1px 6px', borderRadius: 999, background: 'rgba(148,163,184,0.14)' }}>
                      {items.length}
                    </span>
                  </div>

                  {layout === 'grid' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: '0 8px 8px' }}>
                      {items.map(mod => {
                        const Icon = mod.icon;
                        return (
                          <div key={mod.id} draggable onDragStart={(e) => handleDragStart(e, mod)}
                            style={{ padding: 10, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, cursor: 'grab', background: 'var(--mm-bg-surface)', transition: 'all 0.15s', textAlign: 'center' }}
                            onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--mm-border-strong)'; }}
                            onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--mm-border-subtle)'; }}>
                            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--mm-accent-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 6px' }}>
                              <Icon size={14} style={{ color: 'var(--mm-accent-primary)' }} />
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--mm-text-primary)', lineHeight: 1.3 }}>{mod.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, padding: '0 6px 8px' }}>
                      {items.map(mod => {
                        const Icon = mod.icon;
                        return (
                          <div key={mod.id} draggable onDragStart={(e) => handleDragStart(e, mod)}
                            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 8px', borderRadius: 7, cursor: 'grab', border: '1px solid transparent', transition: 'background 0.1s, border-color 0.1s' }}
                            onMouseEnter={e => { (e.currentTarget).style.background = 'var(--mm-bg-surface)'; }}
                            onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}>
                            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'var(--mm-accent-primary-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <Icon size={13} style={{ color: 'var(--mm-accent-primary)' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--mm-text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mod.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {modules.length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <Search size={20} style={{ color: 'var(--mm-text-disabled)', margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>No assets found</div>
                </div>
              )}

              {/* Path Panel — shown under Actors tab */}
              {activeLibraryTab === 'actors' && (
                <div style={{ padding: '12px 14px', borderTop: '1px solid var(--mm-border-subtle)' }}>
                  <PathPanel />
                </div>
              )}

              {/* Camera Path Panel — shown under Actors tab */}
              {activeLibraryTab === 'actors' && (
                <div style={{ borderTop: '1px solid var(--mm-border-subtle)' }}>
                  <CameraPathPanel />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Resize handle */}
      <div style={{ width: 4, cursor: 'col-resize', flexShrink: 0, background: 'transparent', transition: 'background 0.15s' }}
        onMouseDown={handleResizeStart}
        onMouseEnter={e => { (e.currentTarget).style.background = 'var(--mm-accent-primary)'; }}
        onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; }}
        title="Drag to resize" />
    </div>
  );
};

export default LeftPanel;
