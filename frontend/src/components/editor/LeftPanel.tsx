import React, { useCallback, useRef, useState, useMemo } from 'react';
import { 
  Package, 
  Building, 
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  List,
  GripVertical,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getModulesByCategory, ModuleDefinition } from '../../lib/moduleLibrary';
import SceneHierarchy from './SceneHierarchy';

type ViewLayout = 'compact' | 'grid' | 'detailed';

const LeftPanel: React.FC = () => {
  const { 
    activeLibraryTab, setActiveLibraryTab,
    leftPanelWidth, setLeftPanelWidth,
    leftPanelCollapsed, setLeftPanelCollapsed,
  } = useEditorStore();
  
  const isResizing = useRef(false);
  const [viewMode, setViewMode] = useState<'library' | 'scene'>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [layout, setLayout] = useState<ViewLayout>('compact');

  const tabs = [
    { id: 'process' as const, name: 'Process', icon: Package },
    { id: 'environment' as const, name: 'Environ', icon: Building },
    { id: 'actors' as const, name: 'Actors', icon: Users },
  ];

  const allModules = getModulesByCategory(activeLibraryTab);
  
  const modules = useMemo(() => {
    if (!searchQuery.trim()) return allModules;
    const q = searchQuery.toLowerCase();
    return allModules.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.description.toLowerCase().includes(q)
    );
  }, [allModules, searchQuery]);

  // Group modules by subcategory
  const groupedModules = useMemo(() => {
    const groups: Record<string, ModuleDefinition[]> = {};
    modules.forEach(m => {
      const group = getSubcategory(m);
      if (!groups[group]) groups[group] = [];
      groups[group].push(m);
    });
    return groups;
  }, [modules]);

  const handleDragStart = (event: React.DragEvent, module: ModuleDefinition) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'module',
      moduleId: module.id,
      category: module.category,
    }));
    event.dataTransfer.effectAllowed = 'copy';
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = leftPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = startWidth + (e.clientX - startX);
      setLeftPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [leftPanelWidth, setLeftPanelWidth]);

  if (leftPanelCollapsed) {
    return (
      <div style={{ flexShrink: 0, width: 40, borderRight: '1px solid #e5e7eb', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 8, gap: 4 }}>
        <button
          onClick={() => setLeftPanelCollapsed(false)}
          style={{ cursor: 'pointer', padding: 6, border: 'none', background: 'none', borderRadius: 6 }}
          title="Expand Library"
        >
          <ChevronRight size={16} color="#6b7280" />
        </button>
        {/* Vertical tab icons when collapsed */}
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveLibraryTab(tab.id); setLeftPanelCollapsed(false); }}
              style={{
                cursor: 'pointer', padding: 8, border: 'none', borderRadius: 6,
                background: activeLibraryTab === tab.id ? '#f0fdfa' : 'transparent',
              }}
              title={tab.name}
            >
              <Icon size={18} color={activeLibraryTab === tab.id ? '#0d9488' : '#9ca3af'} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, width: leftPanelWidth, maxWidth: 400, minWidth: 220, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* Header — compact */}
        <div style={{ padding: '8px 10px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              <button
                onClick={() => setViewMode('library')}
                style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 4, cursor: 'pointer',
                  background: viewMode === 'library' ? '#ccfbf1' : 'transparent',
                  color: viewMode === 'library' ? '#0f766e' : '#6b7280',
                }}
              >
                Library
              </button>
              <button
                onClick={() => setViewMode('scene')}
                style={{
                  padding: '4px 10px', fontSize: 12, fontWeight: 500, border: 'none', borderRadius: 4, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: viewMode === 'scene' ? '#ccfbf1' : 'transparent',
                  color: viewMode === 'scene' ? '#0f766e' : '#6b7280',
                }}
              >
                <List size={12} /> Scene
              </button>
            </div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {viewMode === 'library' && (
                <>
                  <button
                    onClick={() => setLayout('compact')}
                    style={{ padding: 3, border: 'none', borderRadius: 3, cursor: 'pointer', background: layout === 'compact' ? '#e5e7eb' : 'transparent' }}
                    title="Compact list"
                  >
                    <LayoutList size={14} color={layout === 'compact' ? '#374151' : '#9ca3af'} />
                  </button>
                  <button
                    onClick={() => setLayout('grid')}
                    style={{ padding: 3, border: 'none', borderRadius: 3, cursor: 'pointer', background: layout === 'grid' ? '#e5e7eb' : 'transparent' }}
                    title="Grid view"
                  >
                    <LayoutGrid size={14} color={layout === 'grid' ? '#374151' : '#9ca3af'} />
                  </button>
                </>
              )}
              <button
                onClick={() => setLeftPanelCollapsed(true)}
                style={{ padding: 3, border: 'none', background: 'none', cursor: 'pointer', borderRadius: 3 }}
                title="Collapse"
              >
                <ChevronLeft size={14} color="#9ca3af" />
              </button>
            </div>
          </div>
          
          {viewMode === 'library' && (
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: 28, paddingRight: 8, paddingTop: 6, paddingBottom: 6,
                  fontSize: 12, border: '1px solid #e5e7eb', borderRadius: 6, outline: 'none',
                  background: '#f9fafb',
                }}
              />
            </div>
          )}
        </div>

        {viewMode === 'scene' ? (
          <SceneHierarchy />
        ) : (
          <>
            {/* Category Tabs — compact pill style */}
            <div style={{ display: 'flex', padding: '6px 10px', gap: 4, borderBottom: '1px solid #f3f4f6', flexShrink: 0 }}>
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeLibraryTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLibraryTab(tab.id)}
                    style={{
                      flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                      padding: '5px 4px', fontSize: 11, fontWeight: isActive ? 600 : 400,
                      border: isActive ? '1px solid #99f6e4' : '1px solid transparent',
                      borderRadius: 6, cursor: 'pointer',
                      background: isActive ? '#f0fdfa' : 'transparent',
                      color: isActive ? '#0f766e' : '#6b7280',
                      transition: 'all 0.15s',
                    }}
                  >
                    <Icon size={13} />
                    {tab.name}
                  </button>
                );
              })}
            </div>

            {/* Module List — scrollable */}
            <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: layout === 'grid' ? '8px' : '4px 6px' }}>
              {Object.entries(groupedModules).map(([group, items]) => (
                <div key={group} style={{ marginBottom: 8 }}>
                  {/* Group header */}
                  <div style={{ 
                    fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: '#9ca3af', padding: '4px 6px', position: 'sticky', top: 0, background: '#fff', zIndex: 1,
                  }}>
                    {group} ({items.length})
                  </div>

                  {layout === 'grid' ? (
                    /* Grid View */
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                      {items.map(module => {
                        const Icon = module.icon;
                        return (
                          <div
                            key={module.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, module)}
                            style={{
                              padding: 8, border: '1px solid #e5e7eb', borderRadius: 8,
                              cursor: 'grab', textAlign: 'center', transition: 'all 0.15s',
                              background: '#fff',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#5eead4'; e.currentTarget.style.background = '#f0fdfa'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.background = '#fff'; }}
                          >
                            <div style={{ 
                              width: 32, height: 32, borderRadius: 6, background: '#f3f4f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px',
                            }}>
                              <Icon size={16} color="#6b7280" />
                            </div>
                            <div style={{ fontSize: 10, fontWeight: 500, color: '#374151', lineHeight: 1.2 }}>
                              {module.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Compact List View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {items.map(module => {
                        const Icon = module.icon;
                        return (
                          <div
                            key={module.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, module)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              padding: '6px 8px', borderRadius: 6,
                              cursor: 'grab', transition: 'all 0.1s',
                              border: '1px solid transparent',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.borderColor = '#99f6e4'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                          >
                            <div style={{
                              width: 28, height: 28, borderRadius: 5, background: '#f3f4f6',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                            }}>
                              <Icon size={14} color="#6b7280" />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 500, color: '#1f2937', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {module.name}
                              </div>
                            </div>
                            <GripVertical size={12} color="#d1d5db" style={{ flexShrink: 0 }} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              
              {modules.length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#9ca3af', fontSize: 12 }}>
                  No modules found
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Resize Handle */}
      <div
        style={{ width: 5, cursor: 'col-resize', flexShrink: 0, background: 'transparent', transition: 'background 0.15s' }}
        onMouseDown={handleResizeStart}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#14b8a6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="Drag to resize"
      />
    </div>
  );
};

// Categorize modules into subcategories for grouping
function getSubcategory(module: ModuleDefinition): string {
  const name = module.id.toLowerCase();
  
  if (name.includes('conveyor') || name.includes('belt') || name.includes('roller') || name.includes('modular')) return 'Conveyors';
  if (name.includes('transfer') || name.includes('merge') || name.includes('divert') || name.includes('pusher') || name.includes('popup')) return 'Transfers';
  if (name.includes('spiral') || name.includes('lifter') || name.includes('vertical')) return 'Vertical Transport';
  if (name.includes('source') || name.includes('sink')) return 'Flow Control';
  if (name.includes('machine') || name.includes('palletizer') || name.includes('pick') || name.includes('robot')) return 'Machines';
  if (name.includes('buffer') || name.includes('router')) return 'Routing & Storage';
  if (name.includes('wall') || name.includes('door') || name.includes('window') || name.includes('stair')) return 'Building';
  if (name.includes('rack') || name.includes('pallet') || name.includes('box') || name.includes('rail') || name.includes('floor') || name.includes('warehouse')) return 'Warehouse';
  if (name.includes('operator') || name.includes('engineer') || name.includes('worker')) return 'People';
  if (name.includes('forklift') || name.includes('agv') || name.includes('truck')) return 'Vehicles';
  
  return 'Other';
}

export default LeftPanel;
