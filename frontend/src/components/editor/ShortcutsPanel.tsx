import React from 'react';
import { X } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const shortcuts = [
  { key: 'W', description: 'Translate mode' },
  { key: 'E', description: 'Rotate mode' },
  { key: 'R', description: 'Scale mode' },
  { key: 'Del / Backspace', description: 'Delete selected' },
  { key: 'Ctrl+Z', description: 'Undo' },
  { key: 'Ctrl+Shift+Z', description: 'Redo' },
  { key: 'Ctrl+S', description: 'Save' },
  { key: 'Ctrl+A', description: 'Select all' },
  { key: 'G', description: 'Toggle grid snap' },
  { key: 'M', description: 'Measurement tool' },
  { key: 'F', description: 'Focus/frame selected' },
  { key: 'Esc', description: 'Deselect / Close' },
  { key: '?', description: 'Show shortcuts' },
];

const ShortcutsPanel: React.FC = () => {
  const { showShortcuts, setShowShortcuts } = useEditorStore();
  if (!showShortcuts) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowShortcuts(false)}>
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Keyboard Shortcuts</h2>
          <button onClick={() => setShowShortcuts(false)} className="p-1 rounded hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-2">
          {shortcuts.map(s => (
            <div key={s.key} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
              <span className="text-sm text-gray-600">{s.description}</span>
              <kbd className="px-2 py-0.5 text-xs font-mono bg-gray-100 border border-gray-200 rounded">{s.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutsPanel;
