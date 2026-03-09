/**
 * PathPanel — Create and manage actor movement paths
 * 
 * How to use:
 * 1. Click "New Path" to create a path
 * 2. Click "Add Points" to enter drawing mode
 * 3. Click on the ground in the 3D viewport to add waypoints
 * 4. Click "Done" to finish drawing
 * 5. Assign path to an actor: copy the Path ID, paste in actor's "Assigned Path ID" field
 */
import React from 'react';
import { Route, Plus, Trash2, Eye, EyeOff, RotateCw, Copy } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const PathPanel: React.FC = () => {
  const { paths, addPath, updatePath, removePath, actors, drawingPathId, setDrawingPathId } = useEditorStore();

  const handleCreatePath = () => {
    const id = addPath({ name: `Path ${paths.length + 1}` });
    setDrawingPathId(id);
  };

  const getAssignedActors = (pathId: string) => {
    return actors.filter(a => a.parameters?.pathId === pathId);
  };

  const copyPathId = (id: string) => {
    navigator.clipboard.writeText(id).catch(() => {});
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Route size={14} style={{ color: 'var(--mm-accent-primary)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--mm-text-secondary)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.05em' }}>
            PATHS
          </span>
          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--mm-bg-surface)', color: 'var(--mm-text-tertiary)' }}>
            {paths.length}
          </span>
        </div>
        <button
          onClick={handleCreatePath}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 8px', fontSize: 10, fontWeight: 600,
            color: 'var(--mm-accent-primary)', background: 'var(--mm-accent-primary-muted)',
            border: '1px solid var(--mm-accent-primary)', borderRadius: 6, cursor: 'pointer',
          }}
        >
          <Plus size={10} /> New Path
        </button>
      </div>

      {/* Drawing mode hint */}
      {drawingPathId && (
        <div style={{
          padding: '8px 10px', background: 'var(--mm-accent-primary-muted)',
          border: '1px solid var(--mm-accent-primary)', borderRadius: 8,
        }}>
          <p style={{ fontSize: 10, color: 'var(--mm-accent-primary)', fontWeight: 600, margin: 0 }}>
            🎯 Click on the ground to add waypoints
          </p>
          <button
            onClick={() => setDrawingPathId(null)}
            style={{
              marginTop: 6, padding: '3px 12px', fontSize: 10, fontWeight: 700,
              color: '#fff', background: 'var(--mm-accent-primary)',
              border: 'none', borderRadius: 4, cursor: 'pointer',
            }}
          >
            Done Drawing
          </button>
        </div>
      )}

      {/* How to use */}
      {paths.length === 0 && !drawingPathId && (
        <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', lineHeight: 1.6, padding: '8px 0' }}>
          <strong style={{ color: 'var(--mm-text-secondary)' }}>How to animate actors:</strong><br />
          1. Create a path → click "Add Points" → click ground<br />
          2. Copy the Path ID<br />
          3. Select an Operator or Forklift<br />
          4. Paste Path ID into "Assigned Path ID" field<br />
          5. Press Play ▶ to see them move!
        </div>
      )}

      {/* Path list */}
      {paths.map(path => {
        const assigned = getAssignedActors(path.id);
        const isDrawing = drawingPathId === path.id;

        return (
          <div
            key={path.id}
            style={{
              padding: '8px 10px', borderRadius: 8,
              border: `1px solid ${isDrawing ? 'var(--mm-accent-primary)' : 'var(--mm-border-subtle)'}`,
              background: isDrawing ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
            }}
          >
            {/* Name + actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <input
                type="text"
                value={path.name}
                onChange={e => updatePath(path.id, { name: e.target.value })}
                style={{
                  fontSize: 12, fontWeight: 600, color: 'var(--mm-text-primary)',
                  background: 'transparent', border: 'none', outline: 'none', flex: 1, minWidth: 0,
                }}
              />
              <div style={{ display: 'flex', gap: 2 }}>
                <button onClick={() => copyPathId(path.id)} title="Copy Path ID" style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-tertiary)', borderRadius: 4 }}>
                  <Copy size={10} />
                </button>
                <button onClick={() => updatePath(path.id, { showArrows: !path.showArrows })} title="Toggle arrows" style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: path.showArrows ? 'var(--mm-accent-primary)' : 'var(--mm-text-disabled)', borderRadius: 4 }}>
                  {path.showArrows ? <Eye size={10} /> : <EyeOff size={10} />}
                </button>
                <button onClick={() => updatePath(path.id, { loop: !path.loop })} title="Toggle loop" style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: path.loop ? 'var(--mm-accent-primary)' : 'var(--mm-text-disabled)', borderRadius: 4 }}>
                  <RotateCw size={10} />
                </button>
                <button onClick={() => removePath(path.id)} title="Delete path" style={{ padding: 3, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-disabled)', borderRadius: 4 }}>
                  <Trash2 size={10} />
                </button>
              </div>
            </div>

            {/* Info row */}
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--mm-text-tertiary)' }}>
              <span>{path.points.length} pts</span>
              {path.loop && <span style={{ color: 'var(--mm-accent-primary)' }}>⟳ Loop</span>}
              {assigned.length > 0 && <span style={{ color: '#10b981' }}>{assigned.length} actor{assigned.length > 1 ? 's' : ''}</span>}
            </div>

            {/* Color + ID */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <input
                type="color" value={path.color}
                onChange={e => updatePath(path.id, { color: e.target.value })}
                style={{ width: 18, height: 18, borderRadius: 4, border: '1px solid var(--mm-border)', cursor: 'pointer', padding: 0 }}
              />
              <span style={{ fontSize: 9, color: 'var(--mm-text-disabled)', fontFamily: 'monospace' }}>
                {path.id.slice(0, 8)}…
              </span>
            </div>

            {/* Draw button */}
            <button
              onClick={() => setDrawingPathId(isDrawing ? null : path.id)}
              style={{
                marginTop: 6, width: '100%', padding: '4px 0', fontSize: 10, fontWeight: 600,
                borderRadius: 5, border: 'none', cursor: 'pointer',
                color: isDrawing ? '#fff' : 'var(--mm-text-secondary)',
                background: isDrawing ? 'var(--mm-accent-primary)' : 'var(--mm-bg-input)',
              }}
            >
              {isDrawing ? '✏️ Drawing... (click ground)' : '✏️ Add Points'}
            </button>
          </div>
        );
      })}
    </div>
  );
};

export default PathPanel;
