import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import ImportModelDialog from './ImportModelDialog';
import CameraViewToolbar from './CameraViewToolbar';

type ToolType = 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'snap-move' | 'measure';

interface ToolButton {
  id: ToolType;
  label: string;
  icon: string;
}

const tools: ToolButton[] = [
  { id: 'select', label: 'Select (Q)', icon: '🔘' },
  { id: 'move', label: 'Move (W)', icon: '✥' },
  { id: 'rotate', label: 'Rotate (E)', icon: '↻' },
  { id: 'scale', label: 'Scale (R)', icon: '⤡' },
  { id: 'mate', label: 'Mate/Connect (M)', icon: '🔗' },
  { id: 'snap-move', label: 'Snap Move — drag with auto-snap (N)', icon: '🧲' },
  { id: 'measure', label: 'Measure', icon: '📏' },
];

const ViewportToolbar: React.FC = () => {
  const [showImport, setShowImport] = useState(false);
  const activeTool = useEditorStore(s => s.activeTool);
  const setActiveTool = useEditorStore(s => s.setActiveTool);
  const gridSnap = useEditorStore(s => s.gridSnap);
  const setGridSnap = useEditorStore(s => s.setGridSnap);
  const selectedObjectId = useEditorStore(s => s.selectedObjectId);
  const edges = useEditorStore(s => s.edges);
  const removeEdge = useEditorStore(s => s.removeEdge);
  const clipboard = useEditorStore(s => s.clipboard);
  const copySelected = useEditorStore(s => s.copySelected);
  const pasteClipboard = useEditorStore(s => s.pasteClipboard);
  const overlaysHidden = useEditorStore(s => s.overlaysHidden);
  const setOverlaysHidden = useEditorStore(s => s.setOverlaysHidden);

  // Check if selected node has any connections
  const selectedEdges = selectedObjectId
    ? edges.filter(e => e.from === selectedObjectId || e.to === selectedObjectId)
    : [];

  // Disconnect all mates for selected node
  const disconnectSelected = () => {
    for (const edge of selectedEdges) {
      removeEdge(edge.id);
    }
  };

  // Toggle clean view: hide sources, sinks, mates, connection lines, snap ports
  const toggleCleanView = () => {
    setOverlaysHidden(!overlaysHidden);
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: 36,
    height: 36,
    border: 'none',
    borderRadius: 12,
    background: active ? 'rgba(6,182,212,0.5)' : 'transparent',
    color: active ? '#fff' : '#aaa',
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s',
  });

  const divider = (
    <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />
  );

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(10px)',
        borderRadius: 24,
        padding: '4px 8px',
        boxShadow: '0 2px 16px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Main tools */}
      {tools.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => setActiveTool(tool.id)}
          style={btnStyle(activeTool === tool.id)}
        >
          {tool.icon}
        </button>
      ))}

      {divider}

      {/* Grid snap */}
      <button
        title={`Grid Snap ${gridSnap ? 'ON' : 'OFF'}`}
        onClick={() => setGridSnap(!gridSnap)}
        style={btnStyle(gridSnap)}
      >
        ⊞
      </button>

      {/* Disconnect mate */}
      {selectedEdges.length > 0 && (
        <>
          {divider}
          <button
            title={`Disconnect (${selectedEdges.length} connection${selectedEdges.length > 1 ? 's' : ''})`}
            onClick={disconnectSelected}
            style={{
              ...btnStyle(false),
              color: '#ef4444',
              fontSize: 16,
            }}
          >
            ✂
          </button>
        </>
      )}

      {divider}

      {/* Copy / Paste */}
      <button
        title="Copy (Ctrl+C)"
        onClick={copySelected}
        style={{ ...btnStyle(false), fontSize: 14, opacity: selectedObjectId ? 1 : 0.4 }}
        disabled={!selectedObjectId}
      >
        📋
      </button>
      <button
        title="Paste (Ctrl+V)"
        onClick={pasteClipboard}
        style={{ ...btnStyle(false), fontSize: 14, opacity: clipboard ? 1 : 0.4 }}
        disabled={!clipboard}
      >
        📄
      </button>

      {divider}

      {/* Import 3D Model */}
      <button
        title="Import 3D Model (.GLB)"
        onClick={() => setShowImport(true)}
        style={{ ...btnStyle(false), fontSize: 15 }}
      >
        📦
      </button>

      {divider}

      {/* Clean view */}
      <button
        title={overlaysHidden ? 'Show All (Sources, Sinks, Connections)' : 'Hide All (Clean View — models only)'}
        onClick={toggleCleanView}
        style={btnStyle(overlaysHidden)}
      >
        {overlaysHidden ? '👁‍🗨' : '👁'}
      </button>

      {/* Camera Views */}
      <div style={{ marginLeft: 4 }}>
        <CameraViewToolbar />
      </div>

      {/* Import dialog */}
      <ImportModelDialog isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
};

export default ViewportToolbar;
