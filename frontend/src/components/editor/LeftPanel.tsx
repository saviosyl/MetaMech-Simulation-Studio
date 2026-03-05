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
  Cpu,
  SquareStack,
  Factory,
  Cog,
  Truck,
  Zap,
  Shield,
  Filter,
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
    { id: 'process' as const, name: 'Process', icon: Factory, color: 'cyan' },
    { id: 'fmcg' as const, name: 'FMCG', icon: Package, color: 'orange' },
    { id: 'medical' as const, name: 'Medical', icon: Shield, color: 'emerald' },
    { id: 'robots' as const, name: 'Robots', icon: Cpu, color: 'amber' },
    { id: 'pallets' as const, name: 'Pallets', icon: SquareStack, color: 'emerald' },
    { id: 'environment' as const, name: 'Environ', icon: Building, color: 'purple' },
    { id: 'actors' as const, name: 'Actors', icon: Users, color: 'orange' },
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
      <div className="flex-shrink-0 w-12 border-r border-[var(--mm-border)] bg-[var(--mm-bg-panel)] backdrop-blur-sm flex flex-col items-center pt-3 gap-2">
        <button
          onClick={() => setLeftPanelCollapsed(false)}
          className="p-2 hover:bg-[var(--mm-bg-surface)] rounded-lg transition-colors"
          title="Expand Library"
        >
          <ChevronRight size={16} className="text-[var(--mm-text-secondary)]" />
        </button>
        {/* Vertical tab icons when collapsed */}
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeLibraryTab === tab.id;
          const colorClass = `${tab.color}-400`;
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveLibraryTab(tab.id); setLeftPanelCollapsed(false); }}
              className={`p-2 rounded-lg transition-all duration-200 ${
                isActive 
                  ? `bg-${tab.color}-500/20 text-${tab.color}-400 ring-1 ring-${tab.color}-400/30 shadow-lg shadow-${tab.color}-500/10` 
                  : 'text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)]'
              }`}
              title={tab.name}
            >
              <Icon size={18} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex h-full overflow-hidden" style={{ width: leftPanelWidth, maxWidth: 400, minWidth: 220 }}>
      <div className="flex-1 bg-[var(--mm-bg-panel)] backdrop-blur-sm border-r border-[var(--mm-border)] flex flex-col overflow-hidden">
        
        {/* Header — Industrial Premium */}
        <div className="px-4 py-3 border-b border-[var(--mm-border)] flex-shrink-0 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-1">
              <button
                onClick={() => setViewMode('library')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 font-['Orbitron'] ${
                  viewMode === 'library'
                    ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/30 shadow-lg shadow-cyan-500/10'
                    : 'text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)]'
                }`}
              >
                LIBRARY
              </button>
              <button
                onClick={() => setViewMode('scene')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 font-['Orbitron'] ${
                  viewMode === 'scene'
                    ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/30 shadow-lg shadow-cyan-500/10'
                    : 'text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)]'
                }`}
              >
                <List size={12} /> SCENE
              </button>
            </div>
            <div className="flex gap-1 items-center">
              {viewMode === 'library' && (
                <>
                  <button
                    onClick={() => setLayout('compact')}
                    className={`p-2 rounded-lg transition-colors ${
                      layout === 'compact' 
                        ? 'bg-slate-600/50 text-[var(--mm-text-primary)]' 
                        : 'text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)]'
                    }`}
                    title="Compact list"
                  >
                    <LayoutList size={14} />
                  </button>
                  <button
                    onClick={() => setLayout('grid')}
                    className={`p-2 rounded-lg transition-colors ${
                      layout === 'grid' 
                        ? 'bg-slate-600/50 text-[var(--mm-text-primary)]' 
                        : 'text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)]'
                    }`}
                    title="Grid view"
                  >
                    <LayoutGrid size={14} />
                  </button>
                </>
              )}
              <button
                onClick={() => setLeftPanelCollapsed(true)}
                className="p-2 text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)] rounded-lg transition-colors"
                title="Collapse"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>
          
          {viewMode === 'library' && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--mm-text-secondary)]" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors font-['Inter']"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)]"
                >
                  ×
                </button>
              )}
            </div>
          )}
        </div>

        {viewMode === 'scene' ? (
          <SceneHierarchy />
        ) : (
          <>
            {/* Category Tabs — Scrollable Pills */}
            <div className="flex gap-1.5 px-4 py-3 border-b border-[var(--mm-border-subtle)] flex-shrink-0 overflow-x-auto scrollbar-none">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeLibraryTab === tab.id;
                const count = getModulesByCategory(tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLibraryTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 border whitespace-nowrap flex-shrink-0 ${
                      isActive
                        ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-400 shadow-lg shadow-cyan-500/10'
                        : 'border-[var(--mm-border-subtle)] text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)] hover:border-slate-500/50'
                    }`}
                  >
                    <Icon size={13} />
                    <span className="text-xs font-semibold font-['Orbitron']">{tab.name.toUpperCase()}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${isActive ? 'bg-cyan-500/20 text-cyan-300' : 'bg-[var(--mm-bg-surface)] text-[var(--mm-text-tertiary)]'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Module List — Premium scrollable */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-2">
              {Object.entries(groupedModules).map(([group, items]) => (
                <div key={group} className="mb-6">
                  {/* Group header with industrial styling */}
                  <div className="flex items-center gap-2 mb-3 sticky top-0 bg-[var(--mm-bg-panel)] backdrop-blur-sm py-2 z-10">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-600 to-transparent"></div>
                    <div className="px-3 py-1 bg-[var(--mm-bg-surface)] rounded-full border border-[var(--mm-border)]">
                      <span className="text-xs font-bold text-[var(--mm-text-primary)] font-['Orbitron'] tracking-wide">
                        {group.toUpperCase()}
                      </span>
                      <span className="ml-2 text-xs text-[var(--mm-text-tertiary)] font-['Inter']">
                        {items.length}
                      </span>
                    </div>
                    <div className="flex-1 h-px bg-gradient-to-l from-transparent via-slate-600 to-transparent"></div>
                  </div>

                  {layout === 'grid' ? (
                    /* Premium Grid View */
                    <div className="grid grid-cols-2 gap-3">
                      {items.map(module => {
                        const Icon = module.icon;
                        const categoryTab = tabs.find(t => t.id === module.category);
                        const cardColor = categoryTab?.color || 'slate';
                        return (
                          <div
                            key={module.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, module)}
                            className={`group p-3 border border-[var(--mm-border-subtle)] rounded-lg cursor-grab transition-all duration-200 bg-gradient-to-br from-slate-800/50 to-slate-700/30 hover:border-${cardColor}-400/50 hover:shadow-lg hover:shadow-${cardColor}-500/10 hover:bg-gradient-to-br hover:from-${cardColor}-900/20 hover:to-slate-700/50`}
                          >
                            <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-${cardColor}-500/20 to-${cardColor}-600/10 border border-${cardColor}-500/30 flex items-center justify-center mb-2 mx-auto group-hover:shadow-lg group-hover:shadow-${cardColor}-500/20`}>
                              <Icon size={18} className={`text-${cardColor}-400 group-hover:text-${cardColor}-300`} />
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-medium text-[var(--mm-text-primary)] group-hover:text-white font-['Inter'] leading-tight">
                                {module.name}
                              </div>
                              <div className="flex justify-center mt-1 gap-1">
                                {getModuleTags(module).map(tag => (
                                  <span key={tag} className="px-1.5 py-0.5 bg-[var(--mm-bg-surface)] text-[var(--mm-text-secondary)] rounded text-xs font-['Inter']">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Premium Compact List View */
                    <div className="space-y-1">
                      {items.map(module => {
                        const Icon = module.icon;
                        const categoryTab = tabs.find(t => t.id === module.category);
                        const cardColor = categoryTab?.color || 'slate';
                        return (
                          <div
                            key={module.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, module)}
                            className={`group flex items-center gap-3 p-2 rounded-lg cursor-grab transition-all duration-200 border border-transparent hover:border-${cardColor}-400/30 hover:bg-gradient-to-r hover:from-${cardColor}-900/10 hover:to-slate-700/30`}
                          >
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br from-${cardColor}-500/20 to-${cardColor}-600/10 border border-${cardColor}-500/20 flex items-center justify-center flex-shrink-0 group-hover:shadow-md group-hover:shadow-${cardColor}-500/20`}>
                              <Icon size={14} className={`text-${cardColor}-400 group-hover:text-${cardColor}-300`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-[var(--mm-text-primary)] group-hover:text-white font-['Inter'] truncate">
                                {module.name}
                              </div>
                              <div className="flex gap-1 mt-0.5">
                                {getModuleTags(module).slice(0, 2).map(tag => (
                                  <span key={tag} className="px-1 py-0.5 bg-[var(--mm-bg-surface)] text-[var(--mm-text-tertiary)] rounded text-xs font-['Inter'] leading-none">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <GripVertical size={12} className="text-[var(--mm-text-tertiary)] flex-shrink-0 group-hover:text-[var(--mm-text-secondary)]" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              
              {modules.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-[var(--mm-bg-surface)] border border-[var(--mm-border)] flex items-center justify-center mx-auto mb-4">
                    <Search size={24} className="text-[var(--mm-text-secondary)]" />
                  </div>
                  <div className="text-[var(--mm-text-secondary)] font-['Inter'] text-sm">No modules found</div>
                  <div className="text-[var(--mm-text-tertiary)] font-['Inter'] text-xs mt-1">Try adjusting your search query</div>
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
  if (name.includes('stopper') || name.includes('pusher-module')) return 'Accessories';
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

// Generate tags for modules based on their properties
function getModuleTags(module: ModuleDefinition): string[] {
  const tags: string[] = [];
  const name = module.id.toLowerCase();
  
  // Simulation readiness
  if (module.category === 'process' || module.category === 'robots') {
    tags.push('sim-ready');
  }
  
  // Industry tags
  if (name.includes('fmcg') || name.includes('food') || name.includes('pharma')) {
    tags.push('FMCG');
  }
  if (name.includes('auto') || name.includes('manufacturing')) {
    tags.push('automotive');
  }
  if (name.includes('robot') || name.includes('pick') || name.includes('place')) {
    tags.push('robotics');
  }
  if (name.includes('agv') || name.includes('autonomous')) {
    tags.push('autonomous');
  }
  
  // Default fallback
  if (tags.length === 0) {
    tags.push('standard');
  }
  
  return tags.slice(0, 3); // Limit to 3 tags
}

export default LeftPanel;
