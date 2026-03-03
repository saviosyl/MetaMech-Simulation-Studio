import React, { useState } from 'react';
import {
  X,
  Download,
  FileSpreadsheet,
  Box,
  Package,
  Cog,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import type { BOMResult } from '../../lib/bom/bomEngine';
import {
  exportBOMAsCSV,
  exportBOMAsJSON,
} from '../../lib/bom/bomExporter';

type CADSystem = 'solidworks' | 'fusion360' | 'inventor' | 'catia' | 'freecad' | 'none' | null;

interface ExportDialogProps {
  bom: BOMResult;
  onClose: () => void;
  onExportGLB?: () => void;
  onExportSTL?: () => void;
}

const cadSystems: { id: CADSystem; name: string; icon: string; desc: string }[] = [
  { id: 'solidworks', name: 'SolidWorks', icon: '🔧', desc: 'STEP + Assembly structure' },
  { id: 'fusion360', name: 'Fusion 360', icon: '🔵', desc: 'STEP universal format' },
  { id: 'inventor', name: 'Inventor', icon: '🟠', desc: 'STEP universal format' },
  { id: 'catia', name: 'CATIA', icon: '🔴', desc: 'STEP universal format' },
  { id: 'freecad', name: 'FreeCAD', icon: '🟢', desc: 'STEP universal format' },
  { id: 'none', name: 'No CAD Software', icon: '📦', desc: 'GLB + STL + BOM' },
];

const ExportDialog: React.FC<ExportDialogProps> = ({ bom, onClose, onExportGLB, onExportSTL }) => {
  const [step, setStep] = useState<'select-cad' | 'export-options'>('select-cad');
  const [selectedCAD, setSelectedCAD] = useState<CADSystem>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exported, setExported] = useState<Set<string>>(new Set());

  const handleSelectCAD = (cad: CADSystem) => {
    setSelectedCAD(cad);
    setStep('export-options');
  };

  const handleExport = async (format: string, action: () => void) => {
    setExporting(format);
    try {
      action();
      await new Promise(r => setTimeout(r, 500));
      setExported(prev => new Set(prev).add(format));
    } finally {
      setExporting(null);
    }
  };

  const renderCADSelection = () => (
    <div>
      <h3 className="text-lg font-semibold text-white mb-1">What CAD software do you use?</h3>
      <p className="text-sm text-gray-400 mb-4">
        We'll tailor the export format to work best with your tools.
      </p>
      <div className="grid grid-cols-2 gap-2">
        {cadSystems.map(cad => (
          <button
            key={cad.id}
            onClick={() => handleSelectCAD(cad.id)}
            className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500 rounded-lg text-left transition-all"
          >
            <span className="text-2xl">{cad.icon}</span>
            <div>
              <div className="text-sm font-medium text-white">{cad.name}</div>
              <div className="text-[10px] text-gray-400">{cad.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderExportOptions = () => {
    const isCADUser = selectedCAD !== 'none';
    const cadName = cadSystems.find(c => c.id === selectedCAD)?.name || '';

    // Build export options based on CAD selection
    const exportOptions: {
      id: string;
      icon: React.ReactNode;
      title: string;
      desc: string;
      recommended?: boolean;
      action: () => void;
      available: boolean;
    }[] = [];

    if (isCADUser) {
      // STEP export (recommended for CAD users)
      exportOptions.push({
        id: 'step',
        icon: <Cog size={18} className="text-cyan-400" />,
        title: 'STEP File (.step)',
        desc: `Recommended for ${cadName}. Full assembly with part tree. Opens natively.`,
        recommended: true,
        available: false, // Server-side generation needed
        action: () => {
          alert(
            `STEP export for ${cadName} is coming soon!\n\n` +
            `This will generate a proper STEP AP214 file with:\n` +
            `• Individual parts as separate bodies\n` +
            `• Assembly structure preserved\n` +
            `• Real part numbers in the feature tree\n\n` +
            `For now, use STL or GLB — both import into ${cadName}.`
          );
        },
      });
    }

    // STL (always available)
    if (onExportSTL) {
      exportOptions.push({
        id: 'stl',
        icon: <Package size={18} className="text-orange-400" />,
        title: 'STL File (.stl)',
        desc: isCADUser
          ? `Import into ${cadName} as mesh body. Good for visualization.`
          : 'Universal 3D format for manufacturing & 3D printing.',
        recommended: !isCADUser,
        available: true,
        action: () => onExportSTL(),
      });
    }

    // GLB (always available)
    if (onExportGLB) {
      exportOptions.push({
        id: 'glb',
        icon: <Box size={18} className="text-purple-400" />,
        title: 'GLB File (.glb)',
        desc: 'Full 3D model with materials & textures. Opens in Blender, web viewers.',
        available: true,
        action: () => onExportGLB(),
      });
    }

    // BOM CSV (always available)
    exportOptions.push({
      id: 'csv',
      icon: <FileSpreadsheet size={18} className="text-green-400" />,
      title: 'BOM as CSV',
      desc: 'Part numbers, quantities, weights. Opens in Excel / Google Sheets.',
      available: true,
      action: () => exportBOMAsCSV(bom),
    });

    // BOM JSON
    exportOptions.push({
      id: 'json',
      icon: <FileSpreadsheet size={18} className="text-blue-400" />,
      title: 'BOM as JSON',
      desc: 'Machine-readable BOM for integration with ERP/MRP systems.',
      available: true,
      action: () => exportBOMAsJSON(bom),
    });

    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setStep('select-cad')}
            className="text-gray-400 hover:text-white text-xs"
          >
            ← Change CAD
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-sm text-gray-300">
            Exporting for <span className="text-cyan-400 font-medium">{cadName || 'General Use'}</span>
          </span>
        </div>

        {/* Config summary */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4 text-xs">
          <div className="flex items-center justify-between text-gray-300">
            <span>Belt Conveyor {bom.config.length}×{bom.config.width}×{bom.config.height}mm</span>
            <span>{bom.totalWeight} kg</span>
          </div>
          <div className="text-gray-500 mt-0.5">
            {bom.lines.length} parts • {bom.config.beltSpeed} m/min • Drive: {bom.config.driveEnd}
          </div>
        </div>

        {/* Export options */}
        <div className="space-y-2">
          {exportOptions.map(opt => {
            const isExported = exported.has(opt.id);
            const isExporting = exporting === opt.id;

            return (
              <button
                key={opt.id}
                onClick={() => opt.available && handleExport(opt.id, opt.action)}
                disabled={!opt.available || isExporting}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all border ${
                  opt.recommended
                    ? 'bg-cyan-900/20 border-cyan-700 hover:border-cyan-500'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-500'
                } ${!opt.available ? 'opacity-60' : ''} ${isExported ? 'border-green-600 bg-green-900/10' : ''}`}
              >
                <div className="shrink-0">{opt.icon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{opt.title}</span>
                    {opt.recommended && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-cyan-600 text-white rounded-full font-medium uppercase">
                        Recommended
                      </span>
                    )}
                    {!opt.available && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-yellow-600 text-white rounded-full font-medium uppercase">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{opt.desc}</div>
                </div>
                <div className="shrink-0">
                  {isExporting ? (
                    <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  ) : isExported ? (
                    <CheckCircle size={18} className="text-green-400" />
                  ) : opt.available ? (
                    <Download size={18} className="text-gray-500" />
                  ) : (
                    <AlertCircle size={18} className="text-yellow-500" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* SolidWorks-specific tip */}
        {selectedCAD === 'solidworks' && (
          <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700 rounded-lg text-xs text-blue-300">
            <strong>💡 SolidWorks Tip:</strong> Until STEP export is ready, import the STL file via{' '}
            <em>File → Open → Change type to STL</em>. Use <em>Import Diagnostics</em> to convert mesh to solid bodies.
            The CSV BOM can be imported as a custom BOM table.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        {/* Dialog header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Download size={18} className="text-cyan-400" />
            <h2 className="text-base font-semibold text-white">Export Configured Model</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
          >
            <X size={18} className="text-gray-400" />
          </button>
        </div>

        {/* Dialog body */}
        <div className="p-5">
          {step === 'select-cad' ? renderCADSelection() : renderExportOptions()}
        </div>

        {/* Dialog footer */}
        <div className="px-5 py-3 border-t border-gray-700 flex items-center justify-between text-[10px] text-gray-500">
          <span>MetaMech Simulation Studio</span>
          <span>STEP with full assembly tree coming soon</span>
        </div>
      </div>
    </div>
  );
};

export default ExportDialog;
