import React from 'react';
import { useEditorStore } from '../../store/editorStore';

type ToolType = 'select' | 'move' | 'rotate' | 'scale' | 'mate' | 'measure';

interface ToolButton {
  id: ToolType;
  label: string;
  icon: string;
  isToggle?: boolean;
}

const tools: ToolButton[] = [
  { id: 'select', label: 'Select (Q)', icon: '🔘' },
  { id: 'move', label: 'Move (W)', icon: '✥' },
  { id: 'rotate', label: 'Rotate (E)', icon: '↻' },
  { id: 'scale', label: 'Scale (R)', icon: '⤡' },
  { id: 'mate', label: 'Mate/Connect (M)', icon: '🔗' },
  { id: 'measure', label: 'Measure', icon: '📏' },
];

const ViewportToolbar: React.FC = () => {
  const activeTool = useEditorStore(s => s.activeTool);
  const setActiveTool = useEditorStore(s => s.setActiveTool);
  const gridSnap = useEditorStore(s => s.gridSnap);
  const setGridSnap = useEditorStore(s => s.setGridSnap);
  const gridSnapSize = useEditorStore(s => s.gridSnapSize);

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
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        borderRadius: 24,
        padding: '4px 8px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
      }}
    >
      {tools.map(tool => (
        <button
          key={tool.id}
          title={tool.label}
          onClick={() => setActiveTool(tool.id)}
          style={{
            width: 36,
            height: 36,
            border: 'none',
            borderRadius: 12,
            background: activeTool === tool.id ? 'rgba(6,182,212,0.5)' : 'transparent',
            color: activeTool === tool.id ? '#fff' : '#aaa',
            fontSize: 18,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s',
          }}
        >
          {tool.icon}
        </button>
      ))}

      {/* Divider */}
      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.2)', margin: '0 4px' }} />

      {/* Grid snap toggle */}
      <button
        title={`Grid Snap ${gridSnap ? `ON (${gridSnapSize * 1000} mm)` : 'OFF'}`}
        onClick={() => setGridSnap(!gridSnap)}
        style={{
          width: 36,
          height: 36,
          border: 'none',
          borderRadius: 12,
          background: gridSnap ? 'rgba(6,182,212,0.5)' : 'transparent',
          color: gridSnap ? '#fff' : '#aaa',
          fontSize: 18,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.15s',
        }}
      >
        ⊞
      </button>
    </div>
  );
};

export default ViewportToolbar;
