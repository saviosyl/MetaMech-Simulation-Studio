/**
 * ScenarioLoader — Load pre-built industrial scenarios
 * 
 * Dropdown UI to select and load demo scenarios into the editor.
 * Supports both programmatic (code-defined) and JSON file-based scenarios.
 * File-based scenarios are loaded from Scenario/sample/ via manifest.json.
 */
import React, { useState, useEffect } from 'react';
import { Play, ChevronDown, Factory, Package, ArrowUpDown, CornerDownRight, Rotate3d, Layers, FileJson } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';
import {
  createColorSortScenario,
  createMeteredStopperScenario,
  createDownstreamReadyScenario,
  createInclineScenario,
  createBendRoutingScenario,
  createSpiralScenario,
  createEndOfLineScenario,
  createSensorStopperScenario,
  createBacklogControlScenario,
  Scenario,
} from '../../simulation/scenarios';
import {
  createFMCGEndOfLine,
  createRobotCellFactory,
  createGeneralFactoryDemo,
  createRobotVerification,
  createMachineVerification,
} from '../../simulation/factoryScenarios';
import { listScenarios, loadScenarioFile, ScenarioMeta } from '../../lib/scenarioFileLoader';

interface ScenarioOption {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  create: () => Scenario;
}

const SCENARIOS: ScenarioOption[] = [
  {
    id: 'color-sort',
    name: 'Color Sorting Line',
    description: 'Sensor detects red products → pusher diverts to side conveyor',
    icon: <Package size={16} className="text-red-400" />,
    create: createColorSortScenario,
  },
  {
    id: 'metered-stopper',
    name: 'Metered Release',
    description: 'Stopper accumulates then releases products in timed batches',
    icon: <Layers size={16} className="text-yellow-400" />,
    create: createMeteredStopperScenario,
  },
  {
    id: 'downstream-ready',
    name: 'Downstream Ready',
    description: 'Stopper releases only when downstream machine is available',
    icon: <ArrowUpDown size={16} className="text-green-400" />,
    create: createDownstreamReadyScenario,
  },
  {
    id: 'incline',
    name: 'Incline Conveyor',
    description: 'Products travel up an inclined belt conveyor with supports',
    icon: <CornerDownRight size={16} className="text-blue-400" />,
    create: createInclineScenario,
  },
  {
    id: 'bend-routing',
    name: 'Bend Routing',
    description: '90° bend conveyors routing products through curved path',
    icon: <Rotate3d size={16} className="text-purple-400" />,
    create: createBendRoutingScenario,
  },
  {
    id: 'spiral',
    name: 'Spiral Elevator',
    description: 'Products spiral upward on a helical conveyor to elevated output',
    icon: <Factory size={16} className="text-teal-400" />,
    create: createSpiralScenario,
  },
  {
    id: 'end-of-line',
    name: 'FMCG End-of-Line',
    description: 'Complete palletizing line: source → conveyor → stopper → sensor → robot → pallet → outfeed',
    icon: <Layers size={16} className="text-orange-400" />,
    create: createEndOfLineScenario,
  },
  {
    id: 'sensor-stopper',
    name: 'Sensor → Stopper Logic',
    description: 'SE001 triggers ST001. Products accumulate back-to-back. SE002 monitors queue backup.',
    icon: <Play size={16} className="text-green-400" />,
    create: createSensorStopperScenario,
  },
  {
    id: 'backlog-control',
    name: 'Backlog Control (Dwell)',
    description: 'End-of-line: SE001→ST001 stop, SE002 dwell releases + resumes source. 0-gap accumulation.',
    icon: <Factory size={16} className="text-red-400" />,
    create: createBacklogControlScenario,
  },
  {
    id: 'fmcg-eol',
    name: 'FMCG End-of-Line',
    description: 'Case packer → palletizer → stretch wrapper. Fenced zone, pallet staging, operator station.',
    icon: <Factory size={16} className="text-orange-400" />,
    create: createFMCGEndOfLine,
  },
  {
    id: 'robot-cell',
    name: 'Robot Cell Factory',
    description: 'Fenced 6-axis robot cell with conveyors, HMI, controller, pallet area.',
    icon: <Factory size={16} className="text-blue-400" />,
    create: createRobotCellFactory,
  },
  {
    id: 'factory-line',
    name: 'Factory Conveyor Line',
    description: 'Checkweigher + labeler line with factory walls, windows, floor zones, pallet rack.',
    icon: <Factory size={16} className="text-green-400" />,
    create: createGeneralFactoryDemo,
  },
  {
    id: 'robot-verify',
    name: 'Robot Pick & Place Test',
    description: 'Source → Conveyor → Robot picks → places to Outfeed → Sink. Verify robot animation.',
    icon: <Play size={16} className="text-purple-400" />,
    create: createRobotVerification,
  },
  {
    id: 'machine-verify',
    name: 'Machine Pass-Through Test',
    description: 'Products flow through checkweigher + labeler without falling off.',
    icon: <Play size={16} className="text-cyan-400" />,
    create: createMachineVerification,
  },
];

// Category icon/color map for JSON scenarios
const CATEGORY_STYLES: Record<string, { color: string }> = {
  'FMCG': { color: 'text-orange-400' },
  'Medical': { color: 'text-blue-400' },
  'Factory': { color: 'text-green-400' },
  'Demo': { color: 'text-purple-400' },
};

const ScenarioLoader: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [fileScenarios, setFileScenarios] = useState<{ filename: string; meta: ScenarioMeta }[]>([]);
  const { clearScene, loadScene } = useEditorStore();

  // Load file-based scenarios from manifest when dropdown opens
  useEffect(() => {
    if (isOpen && fileScenarios.length === 0) {
      listScenarios().then(setFileScenarios).catch(() => {});
    }
  }, [isOpen]);

  const loadFileScenario = async (filename: string) => {
    setLoading(filename);
    const scenario = await loadScenarioFile(filename);
    if (scenario) {
      clearScene();

      // Separate process nodes from environment/actor nodes based on type
      const processTypes = new Set([
        'source', 'sink', 'conveyor', 'belt-conveyor', 'roller-conveyor', 'buffer', 'machine',
        'router', 'transfer-bridge', 'popup-transfer', 'pusher-transfer', 'merge-divert',
        'spiral-conveyor', 'vertical-lifter', 'pick-and-place', 'palletizer',
        'modular-conveyor-straight', 'modular-conveyor-90-curve', 'modular-conveyor-45-curve',
        'bend-conveyor', 'stopper', 'pusher', 'sensor', 'industrial-robot', 'machine-static',
        'cartesian-robot', 'cobot', 'robot-5axis', 'robot-6axis',
        'eur-pallet', 'standard-pallet', 'custom-pallet',
        'carton-erector', 'case-packer', 'checkweigher', 'metal-detector',
        'labeler', 'sealing-station', 'reject-station', 'accumulation-table',
        'stretch-wrapper', 'packing-station', 'pallet-conveyor', 'forklift',
      ]);
      const envTypes = new Set([
        'wall', 'door', 'window', 'stairs', 'safety-rail', 'floor-marking',
        'pallet-rack', 'warehouse-shell', 'floor', 'pallet', 'cardboard-box',
        'fence', 'fence-gate', 'bollard', 'operator-station', 'electrical-cabinet',
        'tower-light', 'hmi-stand', 'machine-enclosure', 'floor-zone', 'pallet-stack',
      ]);

      const allNodes = scenario.project.processNodes || [];
      const pNodes = allNodes.filter((n: any) => processTypes.has(n.type));
      const eNodes = [
        ...allNodes.filter((n: any) => envTypes.has(n.type)),
        ...(scenario.project.environmentAssets || []),
      ];

      loadScene({
        processNodes: pNodes.map((n: any) => ({
          ...n,
          scale: n.scale || [1, 1, 1],
          rotation: n.rotation || [0, 0, 0],
          parameters: n.parameters || {},
          locked: false,
          visible: true,
        })),
        edges: (scenario.project.edges || []).map((e: any) => ({
          ...e,
          fromPort: e.fromPort || 'output',
          toPort: e.toPort || 'input',
        })),
        environmentAssets: eNodes.map((n: any) => ({
          ...n,
          scale: n.scale || [1, 1, 1],
          rotation: n.rotation || [0, 0, 0],
          parameters: n.parameters || {},
        })),
        actors: scenario.project.actors || [],
      });
    }
    setLoading(null);
    setIsOpen(false);
  };

  const loadScenario = (option: ScenarioOption) => {
    setLoading(option.id);

    // Clear current scene first
    clearScene();

    const scenario = option.create();

    // Convert scenario nodes to editor ProcessNodes
    const editorNodes = scenario.nodes.map(n => ({
      id: n.id,
      type: n.type,
      name: n.name,
      position: n.position as [number, number, number],
      rotation: n.rotation as [number, number, number],
      scale: [1, 1, 1] as [number, number, number],
      parameters: n.parameters,
      locked: false,
      visible: true,
    }));

    const editorEdges = scenario.edges.map(e => ({
      id: e.id,
      from: e.from,
      to: e.to,
      fromPort: e.fromPort,
      toPort: e.toPort,
    }));

    // Load into editor store
    loadScene({
      processNodes: editorNodes,
      edges: editorEdges,
    });

    // Load rules into simulation engine
    if (scenario.rules && scenario.rules.length > 0) {
      simulationEngine.loadRules(scenario.rules);
    }

    setLoading(null);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-600 transition-colors"
      >
        <Factory size={14} />
        <span>Scenarios</span>
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />

          {/* Dropdown */}
          <div className="absolute top-full left-0 mt-1 w-80 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-40 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-700">
              <h3 className="text-sm font-semibold text-white">Load Demo Scenario</h3>
              <p className="text-xs text-gray-400 mt-0.5">Replace current scene with a pre-built layout</p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* File-based scenarios from Scenario/sample/ */}
              {fileScenarios.length > 0 && (
                <>
                  <div className="px-3 py-1.5 border-b border-gray-700">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Saved Scenarios</span>
                  </div>
                  {fileScenarios.map(fs => (
                    <button
                      key={fs.filename}
                      onClick={() => loadFileScenario(fs.filename)}
                      disabled={loading !== null}
                      className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0 disabled:opacity-50"
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        <FileJson size={16} className={CATEGORY_STYLES[fs.meta.category]?.color || 'text-gray-400'} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{fs.meta.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">{fs.meta.category}</span>
                          {loading === fs.filename && (
                            <span className="text-xs text-teal-400 animate-pulse">Loading...</span>
                          )}
                        </div>
                        {fs.meta.description && <p className="text-xs text-gray-400 mt-0.5">{fs.meta.description}</p>}
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Built-in programmatic scenarios */}
              <div className="px-3 py-1.5 border-b border-gray-700">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Demo Scenarios</span>
              </div>
              {SCENARIOS.map(option => (
                <button
                  key={option.id}
                  onClick={() => loadScenario(option)}
                  disabled={loading !== null}
                  className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-gray-800 transition-colors text-left border-b border-gray-800 last:border-0 disabled:opacity-50"
                >
                  <div className="mt-0.5 flex-shrink-0">{option.icon}</div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{option.name}</span>
                      {loading === option.id && (
                        <span className="text-xs text-teal-400 animate-pulse">Loading...</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{option.description}</p>
                  </div>
                  <Play size={14} className="text-gray-500 mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ScenarioLoader;
