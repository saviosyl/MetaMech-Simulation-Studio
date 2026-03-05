import React, { useCallback, useRef, useState } from 'react';
import { 
  Settings, 
  Move3D, 
  RotateCw, 
  Maximize, 
  Palette,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Zap,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getModuleDefinition } from '../../lib/moduleLibrary';
import { getAssetById, ParametricAssetDef } from '../../lib/assetManifest';
import { mToMm, mmToM, radToDeg, degToRad } from '../../utils/units';
import BOMPanel from './BOMPanel';
import { generateBOM } from '../../lib/bom/bomEngine';

// Collapsible section component for better organization
const CollapsibleSection: React.FC<{
  title: string;
  icon?: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string;
}> = ({ title, icon: Icon, children, defaultOpen = false, badge }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[var(--mm-border-subtle)] rounded-lg bg-gradient-to-br from-slate-700/20 to-slate-800/20 backdrop-blur-sm">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 text-left hover:bg-[var(--mm-bg-surface)] transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon size={16} className="text-cyan-400" />}
          <span className="text-sm font-bold text-[var(--mm-text-primary)] font-['Orbitron'] tracking-wide">
            {title.toUpperCase()}
          </span>
          {badge && (
            <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded text-xs font-['Inter']">
              {badge}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp size={16} className="text-[var(--mm-text-secondary)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--mm-text-secondary)]" />
        )}
      </button>
      {isOpen && (
        <div className="p-3 pt-0 border-t border-slate-600/20">
          {children}
        </div>
      )}
    </div>
  );
};

// Group parameters into logical sections for progressive disclosure
function groupParameters(params: [string, any][]) {
  const geometry: [string, any][] = [];
  const simulation: [string, any][] = [];
  const logic: [string, any][] = [];
  const appearance: [string, any][] = [];
  const advanced: [string, any][] = [];

  const geoKeys = ['length', 'width', 'height', 'radius', 'angle', 'angleDeg', 'bendAngle', 'pitch', 'turns', 'drumDiameter', 'supportSpacing', 'conveyorType', 'driveType', 'showSupports', 'showSideGuides', 'sideGuideHeight', 'adjustableFeetEnabled', 'footAdjustmentMm', 'supportType', 'legCount'];
  const simKeys = ['beltSpeed', 'speed', 'spawnRate', 'ppm', 'processTime', 'capacity', 'cycleTime', 'maxItems', 'productColor', 'productType', 'productLength', 'productWidth', 'productHeight', 'speedFactor', 'pickHeight', 'placeHeight', 'approachHeight', 'pickDelay', 'placeDelay', 'accumulationMode', 'accumulationZones'];
  const logicKeys = ['stopperMode', 'pusherMode', 'holdTime', 'releaseCount', 'openDuration', 'sensorTag', 'sensorType', 'detectColor', 'showBeam', 'mountPosition', 'mountHeight', 'engaged', 'enabled', 'targetColor', 'targetProductType', 'routeBy', 'routeValues', 'stroke', 'side'];
  const appearanceKeys = ['beltColor', 'color', 'materialColor', 'finish', 'showLegs', 'showBeam'];

  for (const [key, def] of params) {
    if (geoKeys.some(g => key.toLowerCase().includes(g.toLowerCase()))) geometry.push([key, def]);
    else if (simKeys.some(s => key.toLowerCase().includes(s.toLowerCase()))) simulation.push([key, def]);
    else if (logicKeys.some(l => key.toLowerCase().includes(l.toLowerCase()))) logic.push([key, def]);
    else if (appearanceKeys.some(a => key.toLowerCase().includes(a.toLowerCase()))) appearance.push([key, def]);
    else advanced.push([key, def]);
  }

  return { geometry, simulation, logic, appearance, advanced };
}

const RightPanel: React.FC = () => {
  const {
    selectedObjectId,
    selectedObjectType,
    processNodes,
    environmentAssets,
    actors,
    transformMode,
    setTransformMode,
    updateObject,
    sceneSettings,
    setSceneSettings,
    rightPanelWidth,
    setRightPanelWidth,
    rightPanelCollapsed,
    setRightPanelCollapsed,
  } = useEditorStore();

  const isResizing = useRef(false);
  const [showBOM, setShowBOM] = useState(true);

  const selectedObject = React.useMemo(() => {
    if (!selectedObjectId || !selectedObjectType) return null;
    
    switch (selectedObjectType) {
      case 'process':
        return processNodes.find(node => node.id === selectedObjectId);
      case 'environment':
        return environmentAssets.find(asset => asset.id === selectedObjectId);
      case 'actor':
        return actors.find(actor => actor.id === selectedObjectId);
      default:
        return null;
    }
  }, [selectedObjectId, selectedObjectType, processNodes, environmentAssets, actors]);

  const moduleDefinition = selectedObject ? getModuleDefinition(selectedObject.type) : null;
  
  // Check for parametric asset def (for enhanced parameter UI)
  const parametricAssetDef = React.useMemo(() => {
    if (!selectedObject || !(selectedObject as any).assetId) return null;
    const def = getAssetById((selectedObject as any).assetId);
    return def?.assetType === 'parametric' ? def as ParametricAssetDef : null;
  }, [selectedObject]);

  const handleParameterChange = (paramKey: string, value: any) => {
    if (!selectedObject || !selectedObjectType) return;
    
    updateObject(selectedObject.id, selectedObjectType, {
      parameters: {
        ...selectedObject.parameters,
        [paramKey]: value,
      },
    });
  };

  const handleTransformChange = (type: 'position' | 'rotation' | 'scale', axis: number, value: number) => {
    if (!selectedObject || !selectedObjectType) return;
    
    const newTransform = [...selectedObject[type]] as [number, number, number];
    newTransform[axis] = value;
    
    updateObject(selectedObject.id, selectedObjectType, {
      [type]: newTransform,
    });
  };

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const newWidth = startWidth - (e.clientX - startX);
      setRightPanelWidth(newWidth);
    };

    const handleMouseUp = () => {
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [rightPanelWidth, setRightPanelWidth]);

  const handleDoubleClick = useCallback(() => {
    setRightPanelCollapsed(!rightPanelCollapsed);
  }, [rightPanelCollapsed, setRightPanelCollapsed]);

  const renderParameterInput = (paramKey: string, paramDef: any) => {
    const value = selectedObject?.parameters[paramKey];
    
    switch (paramDef.type) {
      case 'number':
        return (
          <input
            type="number"
            value={value || paramDef.default}
            onChange={(e) => handleParameterChange(paramKey, Number(e.target.value))}
            min={paramDef.min}
            max={paramDef.max}
            step={paramDef.step}
            className="w-full px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
          />
        );
      
      case 'string':
        return (
          <input
            type="text"
            value={value || paramDef.default}
            onChange={(e) => handleParameterChange(paramKey, e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
          />
        );
      
      case 'select':
        return (
          <select
            value={value || paramDef.default}
            onChange={(e) => handleParameterChange(paramKey, e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
          >
            {paramDef.options.map((option: string) => (
              <option key={option} value={option} className="bg-slate-800">
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center gap-3 p-2 bg-[var(--mm-bg-surface)] rounded-lg border border-[var(--mm-border-subtle)]">
            <input
              type="checkbox"
              checked={value ?? paramDef.default}
              onChange={(e) => handleParameterChange(paramKey, e.target.checked)}
              className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
            />
            <span className="text-sm text-[var(--mm-text-primary)] font-['Inter']">Enabled</span>
          </label>
        );
      
      case 'color':
        return (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || paramDef.default}
              onChange={(e) => handleParameterChange(paramKey, e.target.value)}
              className="w-12 h-9 border border-[var(--mm-border)] rounded-lg bg-slate-800 cursor-pointer"
            />
            <input
              type="text"
              value={value || paramDef.default}
              onChange={(e) => handleParameterChange(paramKey, e.target.value)}
              className="flex-1 px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  if (rightPanelCollapsed) {
    return (
      <div className="flex-shrink-0 w-12 border-l border-[var(--mm-border)] bg-[var(--mm-bg-panel)] backdrop-blur-sm flex items-center justify-center">
        <button
          onClick={() => setRightPanelCollapsed(false)}
          className="p-2 hover:bg-[var(--mm-bg-surface)] rounded-lg transition-colors"
          title="Expand Properties"
        >
          <ChevronLeft size={16} className="text-[var(--mm-text-secondary)]" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 flex h-full overflow-hidden" style={{ width: rightPanelWidth, maxWidth: 400, minWidth: 240 }}>
      {/* Resize Handle */}
      <div
        className="w-1 cursor-col-resize flex-shrink-0 bg-transparent hover:bg-cyan-500/50 transition-colors"
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        title="Drag to resize, double-click to collapse"
      />

      <div className="flex-1 bg-[var(--mm-bg-panel)] backdrop-blur-sm border-l border-[var(--mm-border)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-[var(--mm-border)] flex-shrink-0 bg-gradient-to-r from-slate-800/50 to-slate-700/50">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[var(--mm-text-primary)] flex items-center gap-2 font-['Orbitron'] tracking-wide">
              <Settings size={16} className="text-cyan-400" />
              PROPERTIES
            </h2>
            <button
              onClick={() => setRightPanelCollapsed(true)}
              className="p-2 text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-[var(--mm-bg-surface)] rounded-lg transition-colors"
              title="Collapse Panel"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {selectedObject ? (
            <div className="p-4 space-y-6">
              {/* Object Info - Collapsible */}
              <CollapsibleSection title="Object Information" icon={Settings} defaultOpen={true}>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">NAME</label>
                    <input
                      type="text"
                      value={selectedObject.name}
                      onChange={(e) => updateObject(selectedObject.id, selectedObjectType!, { name: e.target.value })}
                      className="w-full px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] placeholder-slate-400 focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-colors font-['Inter']"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--mm-text-primary)] font-['Orbitron'] tracking-wide">TYPE</label>
                    <div className="mt-1.5 px-3 py-2 bg-[var(--mm-bg-surface)] border border-[var(--mm-border-subtle)] rounded-lg">
                      <div className="text-sm text-[var(--mm-text-primary)] capitalize font-['Inter']">
                        {selectedObject.type.replace('-', ' ')}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Transform Controls - Collapsible */}
              <CollapsibleSection title="Transform" icon={Move3D} defaultOpen={true}>
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-1">
                    {[
                      { mode: 'translate', icon: Move3D, label: 'Move', key: 'W' },
                      { mode: 'rotate', icon: RotateCw, label: 'Rotate', key: 'E' },
                      { mode: 'scale', icon: Maximize, label: 'Scale', key: 'R' },
                    ].map(({ mode, icon: Icon, label, key }) => (
                      <button
                        key={mode}
                        onClick={() => setTransformMode(mode as any)}
                        className={`flex flex-col items-center gap-1 py-2 px-3 text-xs rounded-lg transition-all duration-200 font-['Orbitron'] ${
                          transformMode === mode
                            ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-400/30 shadow-lg shadow-cyan-500/10'
                            : 'bg-[var(--mm-bg-surface)] text-[var(--mm-text-secondary)] hover:text-[var(--mm-text-primary)] hover:bg-slate-600/30'
                        }`}
                        title={`${label} (${key})`}
                      >
                        <Icon size={16} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-2 font-['Orbitron'] tracking-wide">POSITION (mm)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['X', 'Y', 'Z'].map((axis, index) => (
                          <div key={axis}>
                            <label className="block text-xs text-[var(--mm-text-secondary)] mb-1 font-['Inter']">{axis}</label>
                            <input
                              type="number"
                              value={Math.round(mToMm(selectedObject.position[index]))}
                              onChange={(e) => handleTransformChange('position', index, mmToM(Number(e.target.value)))}
                              step="50"
                              className="w-full px-2 py-1.5 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded text-[var(--mm-text-primary)] focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-2 font-['Orbitron'] tracking-wide">ROTATION (°)</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['X', 'Y', 'Z'].map((axis, index) => (
                          <div key={axis}>
                            <label className="block text-xs text-[var(--mm-text-secondary)] mb-1 font-['Inter']">{axis}°</label>
                            <input
                              type="number"
                              value={radToDeg(selectedObject.rotation[index]).toFixed(1)}
                              onChange={(e) => handleTransformChange('rotation', index, degToRad(Number(e.target.value)))}
                              step="1"
                              className="w-full px-2 py-1.5 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded text-[var(--mm-text-primary)] focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-2 font-['Orbitron'] tracking-wide">SCALE</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['X', 'Y', 'Z'].map((axis, index) => (
                          <div key={axis}>
                            <label className="block text-xs text-[var(--mm-text-secondary)] mb-1 font-['Inter']">{axis}</label>
                            <input
                              type="number"
                              value={selectedObject.scale[index].toFixed(2)}
                              onChange={(e) => handleTransformChange('scale', index, Number(e.target.value))}
                              step="0.1"
                              min="0.1"
                              className="w-full px-2 py-1.5 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded text-[var(--mm-text-primary)] focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Parametric Asset Parameters (with units) */}
              {parametricAssetDef && (
                <CollapsibleSection title="Parameters" icon={Sliders} defaultOpen={true}>
                  <div className="space-y-4">
                    {Object.entries(parametricAssetDef.parameterDefs).map(([paramKey, paramDef]) => {
                      const value = selectedObject?.parameters[paramKey] ?? parametricAssetDef.defaults[paramKey];
                      const limits = parametricAssetDef.limits[paramKey];
                      return (
                        <div key={paramKey}>
                          <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">
                            {paramDef.label.toUpperCase()}{paramDef.unit ? ` (${paramDef.unit})` : ''}
                          </label>
                          {paramDef.type === 'number' && (
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => handleParameterChange(paramKey, Number(e.target.value))}
                              min={limits?.[0]}
                              max={limits?.[1]}
                              step={paramDef.step || 1}
                              className="w-full px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
                            />
                          )}
                          {paramDef.type === 'boolean' && (
                            <label className="flex items-center gap-3 p-2 bg-[var(--mm-bg-surface)] rounded-lg border border-[var(--mm-border-subtle)]">
                              <input
                                type="checkbox"
                                checked={value ?? false}
                                onChange={(e) => handleParameterChange(paramKey, e.target.checked)}
                                className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                              />
                              <span className="text-sm text-[var(--mm-text-primary)] font-['Inter']">Enabled</span>
                            </label>
                          )}
                          {paramDef.type === 'select' && paramDef.options && (
                            <select
                              value={value}
                              onChange={(e) => handleParameterChange(paramKey, e.target.value)}
                              className="w-full px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
                            >
                              {paramDef.options.map(opt => (
                                <option key={opt} value={opt} className="bg-slate-800">
                                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleSection>
              )}

              {/* Module Parameters (legacy/non-parametric) */}
              {!parametricAssetDef && moduleDefinition && (() => {
                const params = Object.entries(moduleDefinition.parameters);
                const groups = groupParameters(params);
                return (
                  <>
                    {groups.geometry.length > 0 && (
                      <CollapsibleSection title="Geometry" icon={Maximize} defaultOpen={true}>
                        <div className="space-y-4">
                          {groups.geometry.map(([paramKey, paramDef]) => (
                            <div key={paramKey}>
                              <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">
                                {paramDef.label.toUpperCase()}
                              </label>
                              {renderParameterInput(paramKey, paramDef)}
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}
                    {groups.simulation.length > 0 && (
                      <CollapsibleSection title="Simulation" icon={Sliders} defaultOpen={true} badge="SIM">
                        <div className="space-y-4">
                          {groups.simulation.map(([paramKey, paramDef]) => (
                            <div key={paramKey}>
                              <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">
                                {paramDef.label.toUpperCase()}
                              </label>
                              {renderParameterInput(paramKey, paramDef)}
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}
                    {groups.logic.length > 0 && (
                      <CollapsibleSection title="Logic" icon={Zap} defaultOpen={false} badge="LOGIC">
                        <div className="space-y-4">
                          {groups.logic.map(([paramKey, paramDef]) => (
                            <div key={paramKey}>
                              <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">
                                {paramDef.label.toUpperCase()}
                              </label>
                              {renderParameterInput(paramKey, paramDef)}
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}
                    {groups.appearance.length > 0 && (
                      <CollapsibleSection title="Appearance" icon={Palette} defaultOpen={false}>
                        <div className="space-y-4">
                          {groups.appearance.map(([paramKey, paramDef]) => (
                            <div key={paramKey}>
                              <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">
                                {paramDef.label.toUpperCase()}
                              </label>
                              {renderParameterInput(paramKey, paramDef)}
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}
                    {groups.advanced.length > 0 && (
                      <CollapsibleSection title="Advanced" icon={Settings} defaultOpen={false}>
                        <div className="space-y-4">
                          {groups.advanced.map(([paramKey, paramDef]) => (
                            <div key={paramKey}>
                              <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">
                                {paramDef.label.toUpperCase()}
                              </label>
                              {renderParameterInput(paramKey, paramDef)}
                            </div>
                          ))}
                        </div>
                      </CollapsibleSection>
                    )}
                  </>
                );
              })()}

              {/* BOM Panel for Belt Conveyor */}
              {selectedObject.type === 'belt-conveyor' && (
                <CollapsibleSection title="Bill of Materials" icon={Layers} defaultOpen={false} badge="BOM">
                  <div className="rounded-lg overflow-hidden">
                    <BOMPanel
                      parameters={selectedObject.parameters}
                      moduleType={selectedObject.type}
                      onExportGLB={() => {
                        const bom = generateBOM(selectedObject.parameters);
                        alert(`GLB export: ${bom.config.length}×${bom.config.width}mm — Connect scene ref to enable 3D export`);
                      }}
                      onExportSTL={() => {
                        const bom = generateBOM(selectedObject.parameters);
                        alert(`STL export: ${bom.config.length}×${bom.config.width}mm — Connect scene ref to enable 3D export`);
                      }}
                    />
                  </div>
                </CollapsibleSection>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-6">
              {/* Scene Settings — Premium Dark */}
              <CollapsibleSection title="Scene Settings" icon={Palette} defaultOpen={true}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-1.5 font-['Orbitron'] tracking-wide">ENVIRONMENT</label>
                    <select
                      value={sceneSettings.environment}
                      onChange={(e) => setSceneSettings({ 
                        environment: e.target.value as any 
                      })}
                      className="w-full px-3 py-2 text-sm bg-[var(--mm-bg-input)] border border-[var(--mm-border)] rounded-lg text-[var(--mm-text-primary)] focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 font-['Inter']"
                    >
                      <option value="factory" className="bg-slate-800">Factory</option>
                      <option value="studio-white" className="bg-slate-800">Studio White</option>
                      <option value="dark-showroom" className="bg-slate-800">Dark Showroom</option>
                      <option value="transparent" className="bg-slate-800">Transparent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--mm-text-primary)] mb-2 font-['Orbitron'] tracking-wide">DISPLAY</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 p-2 bg-[var(--mm-bg-surface)] rounded-lg border border-[var(--mm-border-subtle)] cursor-pointer hover:bg-[var(--mm-bg-surface)] transition-colors">
                        <input
                          type="checkbox"
                          checked={sceneSettings.grid.visible}
                          onChange={(e) => setSceneSettings({
                            grid: { ...sceneSettings.grid, visible: e.target.checked }
                          })}
                          className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                        />
                        <div className="flex items-center gap-2">
                          {sceneSettings.grid.visible ? <Eye size={14} className="text-cyan-400" /> : <EyeOff size={14} className="text-[var(--mm-text-tertiary)]" />}
                          <span className="text-sm text-[var(--mm-text-primary)] font-['Inter']">Grid</span>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-2 bg-[var(--mm-bg-surface)] rounded-lg border border-[var(--mm-border-subtle)] cursor-pointer hover:bg-[var(--mm-bg-surface)] transition-colors">
                        <input
                          type="checkbox"
                          checked={sceneSettings.axes.visible}
                          onChange={(e) => setSceneSettings({
                            axes: { ...sceneSettings.axes, visible: e.target.checked }
                          })}
                          className="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                        />
                        <div className="flex items-center gap-2">
                          {sceneSettings.axes.visible ? <Eye size={14} className="text-cyan-400" /> : <EyeOff size={14} className="text-[var(--mm-text-tertiary)]" />}
                          <span className="text-sm text-[var(--mm-text-primary)] font-['Inter']">Axes Helper</span>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

              {/* No Selection Message — Premium */}
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 border border-[var(--mm-border)] flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sliders size={24} className="text-[var(--mm-text-secondary)]" />
                </div>
                <h3 className="text-sm font-semibold text-[var(--mm-text-primary)] mb-1 font-['Orbitron']">NO OBJECT SELECTED</h3>
                <p className="text-xs text-[var(--mm-text-secondary)] font-['Inter']">
                  Select an object in the scene to view and edit its properties.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightPanel;
