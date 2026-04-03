import React, { useState, useEffect } from 'react';
import { useEditorStore } from '../../store/editorStore';
import ImportModelDialog from './ImportModelDialog';
import CameraViewToolbar from './CameraViewToolbar';
import {
  MousePointer, Move, RotateCcw, Maximize2, Link2, Magnet, Ruler,
  Grid3X3, Eye, EyeOff, Route, Navigation, Trash2, Copy, Download, Package,
} from 'lucide-react';

type ToolType = 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'snap-move' | 'measure';

interface ToolButton {
  id: ToolType;
  tooltip: string;
  icon: React.ReactNode;
}

const tools: ToolButton[] = [
  { id: 'select', tooltip: 'Select objects (Q)', icon: <MousePointer size={16} /> },
  { id: 'move', tooltip: 'Move objects (W)', icon: <Move size={16} /> },
  { id: 'rotate', tooltip: 'Rotate objects (E)', icon: <RotateCcw size={16} /> },
  { id: 'scale', tooltip: 'Scale objects (R)', icon: <Maximize2 size={16} /> },
  { id: 'mate', tooltip: 'Create/inspect node connections (M)', icon: <Link2 size={16} /> },
  { id: 'snap-move', tooltip: 'Drag with auto-snap assist (N)', icon: <Magnet size={16} /> },
  { id: 'measure', tooltip: 'Measure distances in viewport', icon: <Ruler size={16} /> },
];

const ViewportToolbar: React.FC = () => {
  const [showImport, setShowImport] = useState(false);
  const [viewportWidth, setViewportWidth] = useState<number>(() => (typeof window !== 'undefined' ? window.innerWidth : 1920));
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
  const directionDebugVisible = useEditorStore(s => s.directionDebugVisible);
  const setDirectionDebugVisible = useEditorStore(s => s.setDirectionDebugVisible);
  const pathsVisible = useEditorStore(s => s.pathsVisible);
  const setPathsVisible = useEditorStore(s => s.setPathsVisible);
  const requestFocus = useEditorStore(s => s.requestFocus);

  useEffect(() => {
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const compact = viewportWidth <= 1366;
  const veryCompact = viewportWidth <= 1280;
  const ribbonTopOffset = compact
    ? 'calc(var(--mm-top-ribbon-height, 72px) + 8px)'
    : 'calc(var(--mm-top-ribbon-height, 56px) + 10px)';

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
    gap: 5,
  };

  const dividerStyle: React.CSSProperties = {
    width: 1,
    height: 20,
    background: 'var(--mm-border-subtle)',
    margin: '0 4px',
    flexShrink: 0,
  };

  const btnStyle = (active: boolean, disabled = false): React.CSSProperties => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    padding: 0,
    border: '1px solid var(--mm-border-subtle)',
    borderRadius: 9,
    background: active ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)',
    color: active ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)',
    opacity: disabled ? 0.45 : 1,
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: ribbonTopOffset,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        width: 'fit-content',
        maxWidth: veryCompact ? 'calc(100% - 16px)' : 'calc(100% - 28px)',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        overflowY: 'hidden',
        justifyContent: 'center',
        minHeight: 38,
        background: 'var(--mm-bg-toolbar-secondary)',
        backdropFilter: 'blur(8px)',
        borderRadius: 10,
        padding: veryCompact ? '3px 5px' : '4px 6px',
        boxShadow: 'var(--mm-shadow-sm)',
        border: '1px solid var(--mm-border-subtle)',
        scrollbarWidth: 'thin',
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
        <button
          title="Fit view to selected object or full layout (F)"
          onClick={requestFocus}
          style={btnStyle(false)}
        >
          <Maximize2 size={16} />
        </button>
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
          <Copy size={16} />
        </button>
        <button
          title="Paste copied object(s) from clipboard (Ctrl+V)"
          onClick={pasteClipboard}
          style={btnStyle(false, !clipboard)}
          disabled={!clipboard}
        >
          <Download size={16} />
        </button>
        {selectedEdges.length > 0 && (
          <button
            title={`Disconnect selected object (${selectedEdges.length} connection${selectedEdges.length > 1 ? 's' : ''})`}
            onClick={disconnectSelected}
            style={{ ...btnStyle(false), color: '#fca5a5', borderColor: 'rgba(239,68,68,0.35)' }}
          >
            <Trash2 size={16} />
          </button>
        )}
        <button
          title="Import custom 3D model (.GLB/.GLTF) into scene"
          onClick={() => setShowImport(true)}
          style={btnStyle(false)}
        >
          <Package size={16} />
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
          <Grid3X3 size={16} />
        </button>
        <button
          title={overlaysHidden ? 'Show helpers: ports, connections, and overlays' : 'Hide helpers for a clean presentation view'}
          onClick={toggleCleanView}
          style={btnStyle(overlaysHidden)}
        >
          {overlaysHidden ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
        <button
          title={pathsVisible ? 'Hide path trajectories and waypoints' : 'Show path trajectories and waypoints'}
          onClick={() => setPathsVisible(!pathsVisible)}
          style={btnStyle(pathsVisible)}
        >
          <Route size={16} />
        </button>
        <button
          title={directionDebugVisible ? 'Hide node/port direction arrows' : 'Show node/port direction arrows'}
          onClick={() => setDirectionDebugVisible(!directionDebugVisible)}
          style={btnStyle(directionDebugVisible)}
        >
          <Navigation size={16} />
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
