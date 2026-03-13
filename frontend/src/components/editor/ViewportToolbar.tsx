import React, { useState } from 'react';
import { useEditorStore } from '../../store/editorStore';
import ImportModelDialog from './ImportModelDialog';
import CameraViewToolbar from './CameraViewToolbar';
import {
  MousePointer, Move, RotateCcw, Maximize2, Link2, Magnet, Ruler,
  Grid3X3, Eye, EyeOff, Route, Trash2, Copy, Download, Package,
} from 'lucide-react';

type ToolType = 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'snap-move' | 'measure';

interface ToolButton {
  id: ToolType;
  tooltip: string;
  icon: React.ReactNode;
}

const tools: ToolButton[] = [
  { id: 'select', tooltip: 'Select objects (Q)', icon: <MousePointer size={13} /> },
  { id: 'move', tooltip: 'Move objects (W)', icon: <Move size={13} /> },
  { id: 'rotate', tooltip: 'Rotate objects (E)', icon: <RotateCcw size={13} /> },
  { id: 'scale', tooltip: 'Scale objects (R)', icon: <Maximize2 size={13} /> },
  { id: 'mate', tooltip: 'Create/inspect node connections (M)', icon: <Link2 size={13} /> },
  { id: 'snap-move', tooltip: 'Drag with auto-snap assist (N)', icon: <Magnet size={13} /> },
  { id: 'measure', tooltip: 'Measure distances in viewport', icon: <Ruler size={13} /> },
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
  const pathsVisible = useEditorStore(s => s.pathsVisible);
  const setPathsVisible = useEditorStore(s => s.setPathsVisible);

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

  const clusterStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
  };

  const dividerStyle: React.CSSProperties = {
    width: 1,
    height: 22,
    background: 'rgba(148,163,184,0.25)',
    margin: '0 2px',
    flexShrink: 0,
  };

  const btnStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    padding: 0,
    border: '1px solid transparent',
    borderRadius: 7,
    background: active ? 'rgba(6,182,212,0.2)' : 'rgba(15,23,42,0.18)',
    color: active ? '#e6fbff' : '#cbd5e1',
    opacity: disabled ? 0.45 : 1,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 'clamp(24px, 3.5vw, 40px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        width: 'min(1220px, calc(100% - 24px))',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        justifyContent: 'center',
        background: 'rgba(2,6,23,0.58)',
        backdropFilter: 'blur(10px)',
        borderRadius: 11,
        padding: '6px 8px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.28)',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
      title="Main modeling ribbon"
    >
      {/* Tools */}
      <div style={clusterStyle}>
        {tools.map(tool => (
          <button
            key={tool.id}
            title={tool.tooltip}
            onClick={() => setActiveTool(tool.id)}
            style={btnStyle(activeTool === tool.id)}
          >
            {tool.icon}
          </button>
        ))}
      </div>

      <div style={dividerStyle} />

      {/* Edit */}
      <div style={clusterStyle}>
        <button
          title="Copy selected object(s) to clipboard (Ctrl+C)"
          onClick={copySelected}
          style={btnStyle(false, !selectedObjectId)}
          disabled={!selectedObjectId}
        >
          <Copy size={14} />
        </button>
        <button
          title="Paste copied object(s) from clipboard (Ctrl+V)"
          onClick={pasteClipboard}
          style={btnStyle(false, !clipboard)}
          disabled={!clipboard}
        >
          <Download size={14} />
        </button>
        {selectedEdges.length > 0 && (
          <button
            title={`Disconnect selected object (${selectedEdges.length} connection${selectedEdges.length > 1 ? 's' : ''})`}
            onClick={disconnectSelected}
            style={{ ...btnStyle(false), color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }}
          >
            <Trash2 size={14} />
          </button>
        )}
        <button
          title="Import custom 3D model (.GLB/.GLTF) into scene"
          onClick={() => setShowImport(true)}
          style={btnStyle(false)}
        >
          <Package size={14} />
        </button>
      </div>

      <div style={dividerStyle} />

      {/* View */}
      <div style={clusterStyle}>
        <button
          title={`Toggle grid snapping for transforms (${gridSnap ? 'On' : 'Off'})`}
          onClick={() => setGridSnap(!gridSnap)}
          style={btnStyle(gridSnap)}
        >
          <Grid3X3 size={14} />
        </button>
        <button
          title={overlaysHidden ? 'Show helpers: ports, connections, and overlays' : 'Hide helpers for a clean presentation view'}
          onClick={toggleCleanView}
          style={btnStyle(overlaysHidden)}
        >
          {overlaysHidden ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
        <button
          title={pathsVisible ? 'Hide path trajectories and waypoints' : 'Show path trajectories and waypoints'}
          onClick={() => setPathsVisible(!pathsVisible)}
          style={btnStyle(pathsVisible)}
        >
          <Route size={14} />
        </button>
      </div>

      <div style={dividerStyle} />

      {/* Camera */}
      <div style={clusterStyle}>
        <CameraViewToolbar />
      </div>

      {/* Import dialog */}
      <ImportModelDialog isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
};

export default ViewportToolbar;
