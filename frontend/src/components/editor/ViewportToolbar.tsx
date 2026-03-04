import React from 'react';
import { useEditorStore } from '../../store/editorStore';

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
  const activeTool = useEditorStore(s => s.activeTool);
  const setActiveTool = useEditorStore(s => s.setActiveTool);
  const gridSnap = useEditorStore(s => s.gridSnap);
  const setGridSnap = useEditorStore(s => s.setGridSnap);
  const selectedObjectId = useEditorStore(s => s.selectedObjectId);
  const edges = useEditorStore(s => s.edges);
  const removeEdge = useEditorStore(s => s.removeEdge);
  const hiddenIds = useEditorStore(s => s.hiddenIds);
  const toggleVisibility = useEditorStore(s => s.toggleVisibility);
  const processNodes = useEditorStore(s => s.processNodes);

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

  // Toggle visibility of all non-conveyor items (sources, sinks, etc)
  const [showHelpers, setShowHelpers] = React.useState(true);
  const toggleHelpers = () => {
    const helperTypes = ['source', 'sink'];
    for (const node of processNodes) {
      if (helperTypes.includes(node.type)) {
        // Only toggle if current state matches
        const isHidden = hiddenIds.has(node.id);
        if (showHelpers ? !isHidden : isHidden) {
          toggleVisibility(node.id);
        }
      }
    }
    setShowHelpers(!showHelpers);
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

      {/* Show/hide helpers (sources, sinks) */}
      <button
        title={showHelpers ? 'Hide Helpers (Sources, Sinks)' : 'Show Helpers'}
        onClick={toggleHelpers}
        style={btnStyle(!showHelpers)}
      >
        {showHelpers ? '👁' : '👁‍🗨'}
      </button>
    </div>
  );
};

export default ViewportToolbar;
