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
  shortLabel: string;
  tooltip: string;
  icon: React.ReactNode;
}

const tools: ToolButton[] = [
  { id: 'select', shortLabel: 'Select', tooltip: 'Select objects (Q)', icon: <MousePointer size={14} /> },
  { id: 'move', shortLabel: 'Move', tooltip: 'Move objects (W)', icon: <Move size={14} /> },
  { id: 'rotate', shortLabel: 'Rotate', tooltip: 'Rotate objects (E)', icon: <RotateCcw size={14} /> },
  { id: 'scale', shortLabel: 'Scale', tooltip: 'Scale objects (R)', icon: <Maximize2 size={14} /> },
  { id: 'mate', shortLabel: 'Mate', tooltip: 'Create/inspect node connections (M)', icon: <Link2 size={14} /> },
  { id: 'snap-move', shortLabel: 'Snap', tooltip: 'Drag with auto-snap assist (N)', icon: <Magnet size={14} /> },
  { id: 'measure', shortLabel: 'Measure', tooltip: 'Measure distances in viewport', icon: <Ruler size={14} /> },
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

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 8px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(15,23,42,0.55)',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontFamily: "'Orbitron', monospace",
    color: 'rgba(148,163,184,0.9)',
    marginRight: 2,
    paddingRight: 6,
    borderRight: '1px solid rgba(255,255,255,0.1)',
  };

  const btnStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 32,
    padding: '0 10px',
    border: '1px solid transparent',
    borderRadius: 8,
    background: active ? 'rgba(6,182,212,0.25)' : 'rgba(15,23,42,0.3)',
    color: active ? '#e6fbff' : '#cbd5e1',
    opacity: disabled ? 0.45 : 1,
    fontSize: 11,
    fontWeight: 600,
    fontFamily: "'Inter', sans-serif",
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 70,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: 'min(96%, 1240px)',
        flexWrap: 'wrap',
        justifyContent: 'center',
        background: 'rgba(2,6,23,0.78)',
        backdropFilter: 'blur(12px)',
        borderRadius: 14,
        padding: '8px 10px',
        boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {/* Tools */}
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>Tools</span>
        {tools.map(tool => (
          <button
            key={tool.id}
            title={tool.tooltip}
            onClick={() => setActiveTool(tool.id)}
            style={btnStyle(activeTool === tool.id)}
          >
            {tool.icon}
            <span>{tool.shortLabel}</span>
          </button>
        ))}
      </div>

      {/* Edit */}
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>Edit</span>
        <button
          title="Copy selected object(s) (Ctrl+C)"
          onClick={copySelected}
          style={btnStyle(false, !selectedObjectId)}
          disabled={!selectedObjectId}
        >
          <Copy size={14} />
          <span>Copy</span>
        </button>
        <button
          title="Paste copied object(s) (Ctrl+V)"
          onClick={pasteClipboard}
          style={btnStyle(false, !clipboard)}
          disabled={!clipboard}
        >
          <Download size={14} />
          <span>Paste</span>
        </button>
        {selectedEdges.length > 0 && (
          <button
            title={`Disconnect selected object (${selectedEdges.length} connection${selectedEdges.length > 1 ? 's' : ''})`}
            onClick={disconnectSelected}
            style={{ ...btnStyle(false), color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }}
          >
            <Trash2 size={14} />
            <span>Disconnect</span>
          </button>
        )}
        <button
          title="Import custom 3D model (.GLB/.GLTF)"
          onClick={() => setShowImport(true)}
          style={btnStyle(false)}
        >
          <Package size={14} />
          <span>Import</span>
        </button>
      </div>

      {/* View */}
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>View</span>
        <button
          title={`Toggle grid snapping (${gridSnap ? 'On' : 'Off'})`}
          onClick={() => setGridSnap(!gridSnap)}
          style={btnStyle(gridSnap)}
        >
          <Grid3X3 size={14} />
          <span>Grid Snap</span>
        </button>
        <button
          title={overlaysHidden ? 'Show overlays and flow helpers' : 'Hide overlays for clean presentation view'}
          onClick={toggleCleanView}
          style={btnStyle(overlaysHidden)}
        >
          {overlaysHidden ? <EyeOff size={14} /> : <Eye size={14} />}
          <span>Clean View</span>
        </button>
        <button
          title={pathsVisible ? 'Hide path trajectories and waypoints' : 'Show path trajectories and waypoints'}
          onClick={() => setPathsVisible(!pathsVisible)}
          style={btnStyle(pathsVisible)}
        >
          <Route size={14} />
          <span>Paths</span>
        </button>
      </div>

      {/* Camera */}
      <div style={sectionStyle}>
        <span style={sectionLabelStyle}>Camera</span>
        <CameraViewToolbar />
      </div>

      {/* Import dialog */}
      <ImportModelDialog isOpen={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
};

export default ViewportToolbar;
