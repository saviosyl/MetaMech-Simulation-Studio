import React, { useEffect, useRef } from 'react';
import { useEditorStore } from '../../store/editorStore';

interface ContextMenuProps {
  x: number;
  y: number;
  objectId: string | null;
  objectType: 'process' | 'environment' | 'actor' | null;
  onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, objectId, objectType, onClose }) => {
  const ref = useRef<HTMLDivElement>(null);
  const {
    removeObject,
    addProcessNode,
    processNodes,
    environmentAssets,
    actors,
    updateObject,
  } = useEditorStore();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const getObject = () => {
    if (!objectId || !objectType) return null;
    if (objectType === 'process') return processNodes.find(n => n.id === objectId);
    if (objectType === 'environment') return environmentAssets.find(a => a.id === objectId);
    if (objectType === 'actor') return actors.find(a => a.id === objectId);
    return null;
  };

  const obj = getObject();

  const handleDelete = () => {
    if (objectId && objectType) {
      removeObject(objectId, objectType);
    }
    onClose();
  };

  const handleRename = () => {
    if (!obj || !objectId || !objectType) return;
    const newName = prompt('Rename object:', obj.name);
    if (newName) {
      updateObject(objectId, objectType, { name: newName });
    }
    onClose();
  };

  const handleDuplicate = () => {
    if (!obj || !objectType) return;
    const pos: [number, number, number] = [obj.position[0] + 2, obj.position[1], obj.position[2]];
    if (objectType === 'process') {
      addProcessNode((obj as any).type, pos);
    }
    onClose();
  };

  const handleAddNode = (type: string) => {
    addProcessNode(type as any, [0, 0, 0]);
    onClose();
  };

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 10000,
  };

  return (
    <div ref={ref} style={menuStyle} className="bg-gray-800 text-white rounded-lg shadow-xl border border-gray-700 py-1 min-w-[180px] text-sm">
      {objectId && objectType ? (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700 mb-1">
            {obj?.name || 'Object'}
          </div>
          <MenuItem label="Rename" onClick={handleRename} />
          {objectType === 'process' && <MenuItem label="Duplicate" onClick={handleDuplicate} />}
          <div className="border-t border-gray-700 my-1" />
          <MenuItem label="Delete" onClick={handleDelete} danger />
        </>
      ) : (
        <>
          <div className="px-3 py-1 text-xs text-gray-400 border-b border-gray-700 mb-1">
            Add to scene
          </div>
          <MenuItem label="Add Source" onClick={() => handleAddNode('source')} />
          <MenuItem label="Add Conveyor" onClick={() => handleAddNode('conveyor')} />
          <MenuItem label="Add Machine" onClick={() => handleAddNode('machine')} />
          <MenuItem label="Add Buffer" onClick={() => handleAddNode('buffer')} />
          <MenuItem label="Add Sink" onClick={() => handleAddNode('sink')} />
        </>
      )}
    </div>
  );
};

const MenuItem: React.FC<{ label: string; onClick: () => void; danger?: boolean }> = ({ label, onClick, danger }) => (
  <button
    onClick={onClick}
    className={`w-full text-left px-3 py-1.5 hover:bg-gray-700 transition-colors ${danger ? 'text-red-400 hover:text-red-300' : ''}`}
  >
    {label}
  </button>
);

export default ContextMenu;
