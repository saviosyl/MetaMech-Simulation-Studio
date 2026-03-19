/**
 * ImportModelDialog — Import custom 3D models (.glb/.gltf) into the layout
 * Theme-aware, premium design using CSS variables
 * Large file safeguard: warns if file > 10MB, rejects > 50MB
 */
import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, AlertTriangle, FileBox, Check } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const WARN_FILE_SIZE = 10 * 1024 * 1024;

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

  const handleClose = () => {
    setImporting(false);
    setError('');
    setWarning('');
    setFile(null);
    setName('');
    setCategory('custom');
    onClose();
  };

  const processSelectedFile = (f: File | null | undefined) => {
    if (!f) return;
    setError('');
    setWarning('');
    const ext = f.name.toLowerCase().split('.').pop();
    if (!['glb', 'gltf'].includes(ext || '')) {
      setError('Only .glb and .gltf files are supported. Convert STEP/STP to GLB first.');
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError(`File too large (${(f.size / 1024 / 1024).toFixed(1)}MB). Maximum 50MB.`);
      return;
    }
    if (f.size > WARN_FILE_SIZE) {
      setWarning(`Large file (${(f.size / 1024 / 1024).toFixed(1)}MB). May affect performance.`);
    }
    setFile(f);
    if (!name) setName(f.name.replace(/\.(glb|gltf)$/i, '').replace(/[_-]/g, ' '));
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    processSelectedFile(e.target.files?.[0]);
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      addCustomModel({
        name: name || file.name, glbUrl: dataUrl, sourceFile: file.name, fileSize: file.size,
        position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], parameters: {}, category,
      });
      handleClose();
    } catch { setError('Failed to import. File may be corrupted.'); }
    finally { setImporting(false); }
  };

  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--mm-text-tertiary)',
    marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase',
    fontFamily: "'Orbitron', monospace",
  };
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', fontSize: 12, background: 'var(--mm-bg-input)',
    border: '1px solid var(--mm-border)', borderRadius: 8, color: 'var(--mm-text-primary)',
    outline: 'none',
  };

  const dialog = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 18 }} onClick={handleClose}>
      {/* Backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(3, 10, 24, 0.42)' }} />

      {/* Dialog */}
      <div
        style={{
          position: 'relative', width: 460, maxWidth: '96vw',
          background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)',
          borderRadius: 14, boxShadow: '0 14px 42px rgba(2, 12, 28, 0.32)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '13px 18px', borderBottom: '1px solid var(--mm-border-subtle)',
          background: 'var(--mm-bg-toolbar-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <FileBox size={16} style={{ color: 'var(--mm-accent-primary)' }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--mm-text-primary)', fontFamily: "'Orbitron', monospace", letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
              IMPORT 3D MODEL
            </span>
          </div>
          <button
            onClick={handleClose}
            style={{ padding: 4, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mm-text-tertiary)' }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Model Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter model name..." style={inputStyle} />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={inputStyle}>
              <option value="custom">Custom</option>
              <option value="machine">Machine</option>
              <option value="structure">Structure</option>
              <option value="fixture">Fixture</option>
              <option value="vehicle">Vehicle</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* File picker — AT BOTTOM of form fields */}
          <div style={{ display: 'grid', gap: 8 }}>
            <label style={labelStyle}>3D Model File</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                processSelectedFile(e.dataTransfer.files?.[0]);
              }}
              style={{
                border: '1px dashed var(--mm-border-strong)', borderRadius: 10, padding: '14px 14px',
                textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s',
                background: file ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)',
              }}
              onMouseEnter={e => { (e.currentTarget).style.borderColor = 'var(--mm-accent-primary)'; }}
              onMouseLeave={e => { (e.currentTarget).style.borderColor = 'var(--mm-border-strong)'; }}
            >
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 34 }}>
                  <Check size={16} style={{ color: 'var(--mm-accent-primary)' }} />
                  <div style={{ minWidth: 0, textAlign: 'left', maxWidth: '100%' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mm-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{file.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--mm-text-secondary)', marginTop: 2 }}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <Upload size={18} style={{ margin: '0 auto 6px', display: 'block', color: 'var(--mm-text-tertiary)' }} />
                  <div style={{ fontSize: 12, color: 'var(--mm-text-secondary)', fontWeight: 500 }}>
                    Click to browse or drag .GLB / .GLTF
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--mm-text-disabled)', marginTop: 4 }}>
                    Max 50MB • Convert STEP/STP to GLB first
                  </div>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept=".glb,.gltf" onChange={handleFileSelect} style={{ display: 'none' }} />
          </div>

          {/* Warning */}
          {warning && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.3)', borderRadius: 8 }}>
              <AlertTriangle size={13} style={{ color: '#eab308', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#eab308' }}>{warning}</span>
            </div>
          )}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8 }}>
              <AlertTriangle size={13} style={{ color: '#ef4444', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Footer — Cancel and Import buttons AT BOTTOM */}
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: 10,
          alignItems: 'center',
          padding: '11px 18px', borderTop: '1px solid var(--mm-border-subtle)',
          background: 'var(--mm-bg-surface)',
        }}>
          <button
            onClick={handleClose}
            style={{
              padding: '8px 18px', fontSize: 11, fontWeight: 600,
              color: 'var(--mm-text-secondary)', background: 'var(--mm-bg-input)',
              border: '1px solid var(--mm-border)', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || importing || !!error}
            style={{
              padding: '8px 20px', fontSize: 11, fontWeight: 700,
              color: '#fff', background: !file || importing || !!error ? 'var(--mm-text-disabled)' : 'var(--mm-accent-primary)',
              border: 'none', borderRadius: 8, cursor: !file || importing || !!error ? 'not-allowed' : 'pointer',
              fontFamily: "'Orbitron', monospace", letterSpacing: '0.04em',
              opacity: !file || importing || !!error ? 0.5 : 1,
            }}
          >
            {importing ? 'IMPORTING...' : 'IMPORT MODEL'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
};

export default ImportModelDialog;
