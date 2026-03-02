import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff, Package, Building, Users } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const categoryIcons: Record<string, any> = {
  process: Package,
  environment: Building,
  actors: Users,
};

const SceneHierarchy: React.FC = () => {
  const {
    processNodes, environmentAssets, actors,
    selectedObjectId, setSelectedObject,
    updateObject, hiddenIds, toggleVisibility,
  } = useEditorStore();

  const [expanded, setExpanded] = useState<Record<string, boolean>>({ process: true, environment: true, actors: true });
  const [renamingId, setRenamingId] = useState<string | null>(null);

  const categories = [
    { key: 'process', label: 'Process', items: processNodes, type: 'process' as const },
    { key: 'environment', label: 'Environment', items: environmentAssets, type: 'environment' as const },
    { key: 'actors', label: 'Actors', items: actors, type: 'actor' as const },
  ];

  const toggleExpand = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1">
      {categories.map(cat => {
        const Icon = categoryIcons[cat.key] || Package;
        const isExpanded = expanded[cat.key];
        return (
          <div key={cat.key}>
            <button
              onClick={() => toggleExpand(cat.key)}
              className="w-full flex items-center gap-2 px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              <Icon size={14} />
              <span>{cat.label}</span>
              <span className="ml-auto text-xs text-gray-400">{cat.items.length}</span>
            </button>
            {isExpanded && (
              <div className="ml-4 space-y-0.5">
                {cat.items.map(item => {
                  const isSelected = selectedObjectId === item.id;
                  const isHidden = hiddenIds.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-1 px-2 py-1 text-sm rounded cursor-pointer group ${
                        isSelected ? 'bg-teal-100 text-teal-800' : 'hover:bg-gray-50 text-gray-700'
                      }`}
                      onClick={() => setSelectedObject(item.id, cat.type)}
                      onDoubleClick={() => setRenamingId(item.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setSelectedObject(item.id, cat.type);
                      }}
                    >
                      <span className="flex-1 truncate">
                        {renamingId === item.id ? (
                          <input
                            type="text"
                            defaultValue={item.name}
                            autoFocus
                            className="w-full px-1 py-0 text-sm border border-teal-400 rounded bg-white"
                            onBlur={(e) => {
                              updateObject(item.id, cat.type, { name: e.target.value });
                              setRenamingId(null);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateObject(item.id, cat.type, { name: (e.target as HTMLInputElement).value });
                                setRenamingId(null);
                              }
                              if (e.key === 'Escape') setRenamingId(null);
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          item.name
                        )}
                      </span>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-gray-200 rounded"
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(item.id); }}
                        title={isHidden ? 'Show' : 'Hide'}
                      >
                        {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  );
                })}
                {cat.items.length === 0 && (
                  <div className="px-2 py-1 text-xs text-gray-400 italic">No items</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default SceneHierarchy;
