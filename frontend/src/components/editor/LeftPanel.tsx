import React, { useCallback, useRef, useState } from 'react';
import { 
  Package, 
  Building, 
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  List
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getModulesByCategory, ModuleDefinition } from '../../lib/moduleLibrary';
import SceneHierarchy from './SceneHierarchy';

const LeftPanel: React.FC = () => {
  const { 
    activeLibraryTab, setActiveLibraryTab,
    leftPanelWidth, setLeftPanelWidth,
    leftPanelCollapsed, setLeftPanelCollapsed,
  } = useEditorStore();
  
  const isResizing = useRef(false);
  const [viewMode, setViewMode] = useState<'library' | 'scene'>('library');

  const tabs = [
    { id: 'process' as const, name: 'Process', icon: Package },
    { id: 'environment' as const, name: 'Environment', icon: Building },
    { id: 'actors' as const, name: 'Actors', icon: Users },
  ];

  const modules = getModulesByCategory(activeLibraryTab);

  const handleDragStart = (event: React.DragEvent, module: ModuleDefinition) => {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'module',
      moduleId: module.id,
      category: module.category,
    }));
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

  const handleDoubleClick = useCallback(() => {
    setLeftPanelCollapsed(!leftPanelCollapsed);
  }, [leftPanelCollapsed, setLeftPanelCollapsed]);

  if (leftPanelCollapsed) {
    return (
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setLeftPanelCollapsed(false)}
          className="w-8 h-full bg-white border-r border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          title="Expand Library"
        >
          <ChevronRight size={16} className="text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ flexShrink: 0, width: leftPanelWidth, maxWidth: 400, minWidth: 240, display: 'flex', height: '100%', overflow: 'hidden' }}>
      <div style={{ flex: 1, background: '#fff', borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('library')}
                className={`px-2 py-1 text-sm rounded ${viewMode === 'library' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                Library
              </button>
              <button
                onClick={() => setViewMode('scene')}
                className={`px-2 py-1 text-sm rounded flex items-center gap-1 ${viewMode === 'scene' ? 'bg-teal-100 text-teal-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <List size={14} /> Scene
              </button>
            </div>
            <button
              onClick={() => setLeftPanelCollapsed(true)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Collapse"
            >
              <ChevronLeft size={16} className="text-gray-500" />
            </button>
          </div>
          
          {viewMode === 'library' && (
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}
        </div>

        {viewMode === 'scene' ? (
          <SceneHierarchy />
        ) : (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {tabs.map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLibraryTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-2 text-sm font-medium transition-colors ${
                      activeLibraryTab === tab.id
                        ? 'border-b-2 border-teal-500 text-teal-600 bg-teal-50'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    <Icon size={16} />
                    <span className="hidden sm:inline">{tab.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Module List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {modules.map(module => {
                const Icon = module.icon;
                return (
                  <div
                    key={module.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, module)}
                    className="group p-3 border border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 cursor-grab active:cursor-grabbing transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-100 group-hover:bg-teal-100 rounded-lg flex items-center justify-center">
                        <Icon size={20} className="text-gray-600 group-hover:text-teal-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 group-hover:text-teal-900 truncate">
                          {module.name}
                        </h3>
                        <p className="text-sm text-gray-500 group-hover:text-teal-700 line-clamp-2 mt-1">
                          {module.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 text-xs text-gray-400 group-hover:text-teal-500">
                      Drag to viewport to add
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            <div className="font-medium mb-2">Quick Actions</div>
            <div className="space-y-1 text-xs">
              <div><kbd className="px-1 bg-gray-200 rounded">W</kbd> Translate</div>
              <div><kbd className="px-1 bg-gray-200 rounded">E</kbd> Rotate</div>
              <div><kbd className="px-1 bg-gray-200 rounded">R</kbd> Scale</div>
              <div><kbd className="px-1 bg-gray-200 rounded">Del</kbd> Delete</div>
            </div>
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        style={{ width: 6, cursor: 'col-resize', flexShrink: 0, background: 'transparent', transition: 'background 0.15s' }}
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#14b8a6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="Drag to resize, double-click to collapse"
      />
    </div>
  );
};

export default LeftPanel;
