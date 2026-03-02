import React, { useCallback, useRef } from 'react';
import { 
  Settings, 
  Move3D, 
  RotateCw, 
  Maximize, 
  Palette,
  Sliders,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getModuleDefinition } from '../../lib/moduleLibrary';
import { getAssetById, ParametricAssetDef } from '../../lib/assetManifest';
import { mToMm, mmToM, radToDeg, degToRad } from '../../utils/units';

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
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        );
      
      case 'string':
        return (
          <input
            type="text"
            value={value || paramDef.default}
            onChange={(e) => handleParameterChange(paramKey, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        );
      
      case 'select':
        return (
          <select
            value={value || paramDef.default}
            onChange={(e) => handleParameterChange(paramKey, e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            {paramDef.options.map((option: string) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        );
      
      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value ?? paramDef.default}
              onChange={(e) => handleParameterChange(paramKey, e.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">Enabled</span>
          </label>
        );
      
      case 'color':
        return (
          <div className="flex gap-2">
            <input
              type="color"
              value={value || paramDef.default}
              onChange={(e) => handleParameterChange(paramKey, e.target.value)}
              className="w-12 h-9 border border-gray-300 rounded-lg"
            />
            <input
              type="text"
              value={value || paramDef.default}
              onChange={(e) => handleParameterChange(paramKey, e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
        );
      
      default:
        return null;
    }
  };

  if (rightPanelCollapsed) {
    return (
      <div style={{ flexShrink: 0, width: 32, borderLeft: '1px solid #e5e7eb', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => setRightPanelCollapsed(false)}
          style={{ cursor: 'pointer', padding: 4, border: 'none', background: 'none' }}
          title="Expand Properties"
        >
          <ChevronLeft size={16} color="#6b7280" />
        </button>
      </div>
    );
  }

  return (
    <div style={{ 
      flexShrink: 0, 
      width: rightPanelWidth, 
      maxWidth: 400, 
      minWidth: 240,
      display: 'flex',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Resize Handle */}
      <div
        style={{ width: 6, cursor: 'col-resize', flexShrink: 0, background: 'transparent', transition: 'background 0.15s' }}
        onMouseDown={handleResizeStart}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#14b8a6')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        title="Drag to resize, double-click to collapse"
      />

      <div style={{ flex: 1, background: '#fff', borderLeft: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: 12, borderBottom: '1px solid #e5e7eb', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
              <Settings size={16} />
              Properties
            </h2>
            <button
              onClick={() => setRightPanelCollapsed(true)}
              style={{ cursor: 'pointer', padding: 4, border: 'none', background: 'none', borderRadius: 4 }}
              title="Collapse Panel"
            >
              <ChevronRight size={16} color="#6b7280" />
            </button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {selectedObject ? (
            <div className="p-4 space-y-6">
              {/* Object Info */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Object Information</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={selectedObject.name}
                      onChange={(e) => updateObject(selectedObject.id, selectedObjectType!, { name: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Type</label>
                    <div className="text-sm text-gray-600 capitalize">
                      {selectedObject.type.replace('-', ' ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Transform Controls */}
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Transform</h3>
                
                <div className="flex gap-1 mb-4">
                  {[
                    { mode: 'translate', icon: Move3D, label: 'Move (W)' },
                    { mode: 'rotate', icon: RotateCw, label: 'Rotate (E)' },
                    { mode: 'scale', icon: Maximize, label: 'Scale (R)' },
                  ].map(({ mode, icon: Icon, label }) => (
                    <button
                      key={mode}
                      onClick={() => setTransformMode(mode as any)}
                      className={`flex-1 flex items-center justify-center gap-1 py-2 px-3 text-sm rounded-lg transition-colors ${
                        transformMode === mode
                          ? 'bg-teal-100 text-teal-700 border border-teal-300'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      title={label}
                    >
                      <Icon size={14} />
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position (mm)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['X', 'Y', 'Z'].map((axis, index) => (
                        <div key={axis}>
                          <label className="block text-xs text-gray-500 mb-1">{axis} (mm)</label>
                          <input
                            type="number"
                            value={Math.round(mToMm(selectedObject.position[index]))}
                            onChange={(e) => handleTransformChange('position', index, mmToM(Number(e.target.value)))}
                            step="50"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rotation (°)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['X', 'Y', 'Z'].map((axis, index) => (
                        <div key={axis}>
                          <label className="block text-xs text-gray-500 mb-1">{axis}°</label>
                          <input
                            type="number"
                            value={radToDeg(selectedObject.rotation[index]).toFixed(1)}
                            onChange={(e) => handleTransformChange('rotation', index, degToRad(Number(e.target.value)))}
                            step="1"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scale</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['X', 'Y', 'Z'].map((axis, index) => (
                        <div key={axis}>
                          <label className="block text-xs text-gray-500 mb-1">{axis}</label>
                          <input
                            type="number"
                            value={selectedObject.scale[index].toFixed(2)}
                            onChange={(e) => handleTransformChange('scale', index, Number(e.target.value))}
                            step="0.1"
                            min="0.1"
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Parametric Asset Parameters (with units) */}
              {parametricAssetDef && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Parameters</h3>
                  <div className="space-y-3">
                    {Object.entries(parametricAssetDef.parameterDefs).map(([paramKey, paramDef]) => {
                      const value = selectedObject?.parameters[paramKey] ?? parametricAssetDef.defaults[paramKey];
                      const limits = parametricAssetDef.limits[paramKey];
                      return (
                        <div key={paramKey}>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {paramDef.label}{paramDef.unit ? ` (${paramDef.unit})` : ''}
                          </label>
                          {paramDef.type === 'number' && (
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => handleParameterChange(paramKey, Number(e.target.value))}
                              min={limits?.[0]}
                              max={limits?.[1]}
                              step={paramDef.step || 1}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            />
                          )}
                          {paramDef.type === 'boolean' && (
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={value ?? false}
                                onChange={(e) => handleParameterChange(paramKey, e.target.checked)}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                              />
                              <span className="text-sm text-gray-700">Enabled</span>
                            </label>
                          )}
                          {paramDef.type === 'select' && paramDef.options && (
                            <select
                              value={value}
                              onChange={(e) => handleParameterChange(paramKey, e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                            >
                              {paramDef.options.map(opt => (
                                <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Module Parameters (legacy/non-parametric) */}
              {!parametricAssetDef && moduleDefinition && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Parameters</h3>
                  <div className="space-y-3">
                    {Object.entries(moduleDefinition.parameters).map(([paramKey, paramDef]) => (
                      <div key={paramKey}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {paramDef.label}
                        </label>
                        {renderParameterInput(paramKey, paramDef)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {/* Scene Settings */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Palette size={16} />
                  Scene Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                    <select
                      value={sceneSettings.environment}
                      onChange={(e) => setSceneSettings({ 
                        environment: e.target.value as any 
                      })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="factory">Factory</option>
                      <option value="studio-white">Studio White</option>
                      <option value="dark-showroom">Dark Showroom</option>
                      <option value="transparent">Transparent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Grid</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={sceneSettings.grid.visible}
                          onChange={(e) => setSceneSettings({
                            grid: { ...sceneSettings.grid, visible: e.target.checked }
                          })}
                          className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm text-gray-700">Visible</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Axes Helper</label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={sceneSettings.axes.visible}
                        onChange={(e) => setSceneSettings({
                          axes: { ...sceneSettings.axes, visible: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-sm text-gray-700">Visible</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* No Selection Message */}
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Sliders size={24} className="text-gray-400" />
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No Object Selected</h3>
                <p className="text-sm text-gray-500">
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
