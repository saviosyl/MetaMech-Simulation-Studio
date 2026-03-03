import React, { useMemo, useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  Box,
  Package,
  ChevronDown,
  ChevronRight,
  Layers,
  Weight,
  Info,
} from 'lucide-react';
import { generateBOM, BOMResult, BOMLine } from '../../lib/bom/bomEngine';
import {
  exportBOMAsCSV,
  exportBOMAsJSON,
  canExportSTEP,
  getSTEPExportInfo,
} from '../../lib/bom/bomExporter';

interface BOMPanelProps {
  /** Current parametric parameters for the selected node */
  parameters: Record<string, any>;
  /** Module type id (e.g. 'belt-conveyor') */
  moduleType: string;
  /** Callback to trigger 3D model export (needs scene reference from parent) */
  onExportGLB?: () => void;
  onExportSTL?: () => void;
  onExportFullPackage?: () => void;
}

const categoryLabels: Record<string, string> = {
  drive: '🔧 Drive System',
  electrical: '⚡ Electrical',
  belt: '🔄 Belt',
  frame: '🏗️ Frame / Profiles',
  support: '🦿 Support / Legs',
  adjustment: '⚙️ Adjustment',
  fastener: '🔩 Fasteners',
};

const categoryOrder = ['drive', 'electrical', 'belt', 'frame', 'support', 'adjustment', 'fastener'];

const BOMPanel: React.FC<BOMPanelProps> = ({
  parameters,
  moduleType,
  onExportGLB,
  onExportSTL,
  onExportFullPackage,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(categoryOrder));
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showStepInfo, setShowStepInfo] = useState(false);

  // Only generate BOM for belt conveyor (expandable to others later)
  const bom: BOMResult | null = useMemo(() => {
    if (moduleType !== 'belt-conveyor') return null;
    return generateBOM(parameters);
  }, [moduleType, parameters]);

  if (!bom) {
    return (
      <div className="p-3 text-xs text-gray-500 italic">
        BOM generation available for Belt Conveyor modules.
      </div>
    );
  }

  // Group lines by category
  const grouped = useMemo(() => {
    const map = new Map<string, BOMLine[]>();
    for (const cat of categoryOrder) {
      const items = bom.lines.filter(l => l.category === cat);
      if (items.length > 0) map.set(cat, items);
    }
    return map;
  }, [bom]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full text-sm">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-700 bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-cyan-400" />
            <span className="font-semibold text-white text-xs uppercase tracking-wide">
              Bill of Materials
            </span>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1 px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-medium transition-colors"
            >
              <Download size={12} />
              Export
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-50 py-1">
                <button
                  onClick={() => { exportBOMAsCSV(bom); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-left text-xs"
                >
                  <FileSpreadsheet size={14} className="text-green-400" />
                  <div>
                    <div className="text-white font-medium">BOM as CSV</div>
                    <div className="text-gray-400">Opens in Excel / Sheets</div>
                  </div>
                </button>
                <button
                  onClick={() => { exportBOMAsJSON(bom); setShowExportMenu(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-left text-xs"
                >
                  <FileText size={14} className="text-blue-400" />
                  <div>
                    <div className="text-white font-medium">BOM as JSON</div>
                    <div className="text-gray-400">Machine-readable</div>
                  </div>
                </button>
                <div className="border-t border-gray-700 my-1" />
                {onExportGLB && (
                  <button
                    onClick={() => { onExportGLB(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-left text-xs"
                  >
                    <Box size={14} className="text-purple-400" />
                    <div>
                      <div className="text-white font-medium">3D Model as GLB</div>
                      <div className="text-gray-400">Import into Blender / SW</div>
                    </div>
                  </button>
                )}
                {onExportSTL && (
                  <button
                    onClick={() => { onExportSTL(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-left text-xs"
                  >
                    <Package size={14} className="text-orange-400" />
                    <div>
                      <div className="text-white font-medium">3D Model as STL</div>
                      <div className="text-white font-medium flex items-center gap-1">
                        SolidWorks / Manufacturing
                      </div>
                    </div>
                  </button>
                )}
                <button
                  onClick={() => { setShowStepInfo(!showStepInfo); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-left text-xs"
                >
                  <Info size={14} className="text-yellow-400" />
                  <div>
                    <div className="text-gray-400 font-medium">STEP Export</div>
                    <div className="text-gray-500">{canExportSTEP() ? 'Available' : 'Coming soon'}</div>
                  </div>
                </button>
                {showStepInfo && (
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-750 border-t border-gray-700">
                    {getSTEPExportInfo()}
                  </div>
                )}
                <div className="border-t border-gray-700 my-1" />
                {onExportFullPackage && (
                  <button
                    onClick={() => { onExportFullPackage(); setShowExportMenu(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 text-left text-xs"
                  >
                    <Download size={14} className="text-cyan-400" />
                    <div>
                      <div className="text-white font-medium">Full Package</div>
                      <div className="text-gray-400">BOM + GLB + STL</div>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Config summary */}
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-gray-400">
          <span>{bom.config.length}×{bom.config.width}×{bom.config.height}mm</span>
          <span>{bom.config.beltSpeed} m/min</span>
          <span>Drive: {bom.config.driveEnd}</span>
        </div>
      </div>

      {/* Summary bar */}
      <div className="px-3 py-1.5 bg-gray-800/30 border-b border-gray-700 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3">
          <span className="text-gray-400">
            <span className="text-white font-medium">{bom.lines.length}</span> line items
          </span>
          <span className="text-gray-400">
            <span className="text-white font-medium">{bom.totalParts}</span> parts
          </span>
        </div>
        <div className="flex items-center gap-1 text-gray-400">
          <Weight size={10} />
          <span className="text-white font-medium">{bom.totalWeight}</span> kg
        </div>
      </div>

      {/* BOM Table */}
      <div className="flex-1 overflow-y-auto">
        {Array.from(grouped.entries()).map(([cat, items]) => {
          const isExpanded = expandedCategories.has(cat);
          const catWeight = items.reduce((s, i) => s + i.totalWeight, 0).toFixed(2);

          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between px-3 py-1.5 bg-gray-800/60 hover:bg-gray-700/60 border-b border-gray-700/50 text-xs transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  <span className="font-medium text-gray-300">
                    {categoryLabels[cat] || cat}
                  </span>
                  <span className="text-gray-500 ml-1">({items.length})</span>
                </div>
                <span className="text-gray-500 text-[10px]">{catWeight} kg</span>
              </button>

              {/* Items */}
              {isExpanded && items.map((line) => (
                <div
                  key={line.partNumber}
                  className="flex items-center px-3 py-1 border-b border-gray-800/50 hover:bg-gray-800/30 text-xs"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-[10px] shrink-0">
                        {line.partNumber}
                      </span>
                      <span className="text-gray-300 truncate" title={line.description}>
                        {line.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-white font-medium w-8 text-right">
                      {line.unit === 'm' ? line.quantity.toFixed(1) : line.quantity}
                    </span>
                    <span className="text-gray-500 w-6 text-left">{line.unit}</span>
                    <span className="text-gray-500 w-14 text-right text-[10px]">
                      {line.totalWeight.toFixed(2)} kg
                    </span>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 border-t border-gray-700 bg-gray-800/50 text-[10px] text-gray-500">
        BOM auto-updates with parameter changes • Part numbers from item profile system
      </div>
    </div>
  );
};

export default BOMPanel;
