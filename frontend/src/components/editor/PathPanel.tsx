/**
 * PathPanel — Create and manage actor movement paths
 */
import React, { useState } from 'react';
import { Route, Plus, Trash2, Eye, EyeOff, RotateCw } from 'lucide-react';
import { useEditorStore, ActorPath } from '../../store/editorStore';

const PathPanel: React.FC = () => {
  const { paths, addPath, updatePath, removePath, addPathPoint, removePathPoint, actors } = useEditorStore();
  const [editingPathId, setEditingPathId] = useState<string | null>(null);
  const [drawingPathId, setDrawingPathId] = useState<string | null>(null);

  const handleCreatePath = () => {
    const id = addPath({ name: `Path ${paths.length + 1}` });
    setEditingPathId(id);
    setDrawingPathId(id);
  };

  // Get actors assigned to a path
  const getAssignedActors = (pathId: string) => {
    return actors.filter(a => a.parameters?.pathId === pathId);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Route size={14} className="text-cyan-400" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider" style={{ fontFamily: "'Orbitron', monospace" }}>
            Paths
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{paths.length}</span>
        </div>
        <button
          onClick={handleCreatePath}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-cyan-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/20 rounded-md border border-cyan-500/30 transition-colors"
        >
          <Plus size={10} /> New Path
        </button>
      </div>

      {/* Drawing mode hint */}
      {drawingPathId && (
        <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <p className="text-[10px] text-cyan-400 font-medium">
            🎯 Drawing mode active — Click on the ground plane to add waypoints. Press Escape or click "Done" to finish.
          </p>
          <button
            onClick={() => setDrawingPathId(null)}
            className="mt-1 px-2 py-0.5 text-[10px] text-white bg-cyan-600 rounded hover:bg-cyan-500"
          >
            Done
          </button>
        </div>
      )}

      {/* Path list */}
      {paths.length === 0 ? (
        <p className="text-xs text-gray-500 text-center py-4">
          No paths yet. Create one to define movement routes for operators and forklifts.
        </p>
      ) : (
        <div className="space-y-2">
          {paths.map(path => {
            const assigned = getAssignedActors(path.id);
            const isEditing = editingPathId === path.id;

            return (
              <div
                key={path.id}
                className={`p-2.5 rounded-lg border transition-colors ${
                  isEditing ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-700 bg-gray-800/50'
                }`}
              >
                {/* Path header */}
                <div className="flex items-center justify-between mb-1">
                  <input
                    type="text"
                    value={path.name}
                    onChange={e => updatePath(path.id, { name: e.target.value })}
                    className="text-xs font-medium text-white bg-transparent border-none outline-none flex-1"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updatePath(path.id, { showArrows: !path.showArrows })}
                      className="p-1 rounded hover:bg-gray-600 text-gray-400"
                      title={path.showArrows ? 'Hide arrows' : 'Show arrows'}
                    >
                      {path.showArrows ? <Eye size={10} /> : <EyeOff size={10} />}
                    </button>
                    <button
                      onClick={() => updatePath(path.id, { loop: !path.loop })}
                      className={`p-1 rounded hover:bg-gray-600 ${path.loop ? 'text-cyan-400' : 'text-gray-400'}`}
                      title={path.loop ? 'Loop ON' : 'Loop OFF'}
                    >
                      <RotateCw size={10} />
                    </button>
                    <button
                      onClick={() => removePath(path.id)}
                      className="p-1 rounded hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                    >
                      <Trash2 size={10} />
                    </button>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <span>{path.points.length} points</span>
                  {path.loop && <span className="text-cyan-400">⟳ Loop</span>}
                  {assigned.length > 0 && (
                    <span className="text-green-400">{assigned.length} actor{assigned.length > 1 ? 's' : ''}</span>
                  )}
                </div>

                {/* Path color */}
                <div className="flex items-center gap-2 mt-1.5">
                  <input
                    type="color"
                    value={path.color}
                    onChange={e => updatePath(path.id, { color: e.target.value })}
                    className="w-5 h-5 rounded border border-gray-600 cursor-pointer"
                  />
                  <span className="text-[10px] text-gray-500">ID: {path.id.slice(0, 8)}</span>
                </div>

                {/* Draw button */}
                <button
                  onClick={() => setDrawingPathId(drawingPathId === path.id ? null : path.id)}
                  className={`mt-2 w-full py-1 text-[10px] font-medium rounded ${
                    drawingPathId === path.id
                      ? 'bg-cyan-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {drawingPathId === path.id ? '✏️ Drawing...' : '✏️ Add Points'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PathPanel;
