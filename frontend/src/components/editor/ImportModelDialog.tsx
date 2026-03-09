/**
 * ImportModelDialog — Import custom 3D models (.glb/.gltf) into the layout
 * 
 * Large file safeguard: warns if file > 10MB, rejects > 50MB
 */
import React, { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, FileBox } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB hard limit
const WARN_FILE_SIZE = 10 * 1024 * 1024; // 10MB warning

interface ImportModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportModelDialog: React.FC<ImportModelDialogProps> = ({ isOpen, onClose }) => {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('custom');
  const [error, setError] = useState('');
  const [warning, setWarning] = useState('');
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addCustomModel } = useEditorStore();

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError('');
    setWarning('');

    // Validate file type
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['glb', 'gltf'].includes(ext || '')) {
      setError('Only .glb and .gltf files are supported. Convert STEP/STP files to GLB first.');
      return;
    }

    // File size check
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum is 50MB. Please optimize or simplify the model.`);
      return;
    }
    if (f.size > WARN_FILE_SIZE) {
      setWarning(`Large file (${(f.size / 1024 / 1024).toFixed(1)}MB). This may affect editor performance.`);
    }

    setFile(f);
    if (!name) setName(f.name.replace(/\.(glb|gltf)$/i, '').replace(/[_-]/g, ' '));
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    try {
      // Read file as data URL for persistence
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      addCustomModel({
        name: name || file.name,
        glbUrl: dataUrl,
        sourceFile: file.name,
        fileSize: file.size,
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        parameters: {},
        category,
      });

      onClose();
      setFile(null);
      setName('');
      setError('');
      setWarning('');
    } catch (err) {
      setError('Failed to import model. The file may be corrupted.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-[420px] max-w-[95vw]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <FileBox size={18} className="text-cyan-400" />
            <h2 className="text-sm font-bold text-white" style={{ fontFamily: "'Orbitron', monospace" }}>
              IMPORT 3D MODEL
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* File picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              3D Model File
            </label>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center cursor-pointer hover:border-cyan-500 hover:bg-cyan-500/5 transition-colors"
            >
              <Upload size={24} className="mx-auto text-gray-500 mb-2" />
              {file ? (
                <div>
                  <p className="text-sm text-white font-medium">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-300">Drop .GLB or .GLTF file here</p>
                  <p className="text-xs text-gray-500 mt-1">or click to browse • Max 50MB</p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Model name..."
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-500 outline-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-cyan-500 outline-none"
            >
              <option value="custom">Custom</option>
              <option value="machine">Machine</option>
              <option value="structure">Structure</option>
              <option value="fixture">Fixture</option>
              <option value="vehicle">Vehicle</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Warning */}
          {warning && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertTriangle size={14} className="text-yellow-500 flex-shrink-0" />
              <span className="text-xs text-yellow-400">{warning}</span>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" />
              <span className="text-xs text-red-400">{error}</span>
            </div>
          )}

          {/* Info */}
          <p className="text-[10px] text-gray-500">
            Supported: .GLB, .GLTF • For STEP/STP files, convert to GLB first using an online converter or CAD tool.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-gray-400 hover:text-white bg-gray-800 rounded-lg border border-gray-600 hover:border-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing || !!error}
            className="px-4 py-2 text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing...' : 'Import Model'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportModelDialog;
