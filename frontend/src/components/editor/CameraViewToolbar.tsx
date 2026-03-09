/**
 * CameraViewToolbar — Quick orthographic view switcher
 * Top / Front / Right / Left / Back / Perspective
 */
import React, { useState } from 'react';
import { Eye, ChevronDown } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const VIEWS = [
  { id: 'top', label: 'Top', key: '7' },
  { id: 'front', label: 'Front', key: '1' },
  { id: 'right', label: 'Right', key: '3' },
  { id: 'left', label: 'Left', key: '' },
  { id: 'back', label: 'Back', key: '' },
  { id: 'bottom', label: 'Bottom', key: '' },
  { id: 'perspective', label: 'Perspective', key: '5' },
] as const;

const CameraViewToolbar: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { setCameraView, cameraMode } = useEditorStore();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-800/90 hover:bg-gray-700 rounded-md border border-gray-600/50 transition-colors backdrop-blur-sm"
        title="Camera Views"
      >
        <Eye size={13} />
        <span className="hidden sm:inline">{cameraMode === 'orthographic' ? 'Ortho' : '3D'}</span>
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-1 w-36 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-40 overflow-hidden">
            <div className="px-3 py-1.5 border-b border-gray-700">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Camera View</span>
            </div>
            {VIEWS.map(v => (
              <button
                key={v.id}
                onClick={() => {
                  setCameraView(v.id);
                  setOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                <span>{v.label}</span>
                {v.key && <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{v.key}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default CameraViewToolbar;
