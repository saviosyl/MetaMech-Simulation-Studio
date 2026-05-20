/**
 * ScenarioLoader — Load JSON scenarios from GitHub folder
 * 
 * Dropdown UI to load scenario JSON files into the editor.
 * Primary source is the repository /scenarios folder via GitHub API.
 */
import React, { useState, useEffect } from 'react';
import { ChevronDown, Factory, FileJson } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';
import { listScenarios, loadScenarioFile, ScenarioEntry } from '../../lib/scenarioFileLoader';

// Category icon/color map for JSON scenarios
const CATEGORY_STYLES: Record<string, { color: string }> = {
  'FMCG': { color: 'text-orange-400' },
  'Medical': { color: 'text-blue-400' },
  'Factory': { color: 'text-green-400' },
  'Demo': { color: 'text-purple-400' },
  'Custom': { color: 'text-cyan-400' },
};

const ScenarioLoader: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [fileScenarios, setFileScenarios] = useState<ScenarioEntry[]>([]);
  const { clearScene, loadScene } = useEditorStore();

  // Load scenarios from GitHub folder when dropdown opens
  useEffect(() => {
    if (isOpen && fileScenarios.length === 0) {
      listScenarios().then(setFileScenarios).catch(() => {});
    }
  }, [isOpen, fileScenarios.length]);

  const loadFileScenario = async (entry: ScenarioEntry) => {
    setLoading(entry.filename);
    const scenario = await loadScenarioFile(entry.filename, entry.downloadUrl);
    if (scenario) {
      clearScene();
      // Preserve the scenario's authored buckets to avoid forcing nodes through
      // the wrong renderer (which can create box fallbacks and oversized walls).
      const actorTypes = new Set(['operator', 'operator-2', 'engineer', 'agv', 'pallet-truck']);
      const authoredProcess = Array.isArray(scenario.project.processNodes) ? scenario.project.processNodes : [];
      const authoredActors = Array.isArray(scenario.project.actors) ? scenario.project.actors : [];

      // Back-compat for old files that stored actors inside processNodes.
      const extractedActors = authoredActors.length === 0
        ? authoredProcess.filter((n: any) => actorTypes.has(n.type))
        : [];
      const processNodes = authoredProcess.filter((n: any) => !actorTypes.has(n.type));
      const actors = [...authoredActors, ...extractedActors];

      loadScene({
        processNodes: processNodes.map((n: any) => ({
          ...n,
          scale: n.scale || [1, 1, 1],
          rotation: n.rotation || [0, 0, 0],
          parameters: n.parameters || {},
          locked: n.locked ?? false,
          visible: n.visible ?? true,
        })),
        edges: (scenario.project.edges || []).map((e: any) => ({
          ...e,
          fromPort: e.fromPort || 'output',
          toPort: e.toPort || 'input',
        })),
        environmentAssets: (scenario.project.environmentAssets || []).map((n: any) => ({
          ...n,
          scale: n.scale || [1, 1, 1],
          rotation: n.rotation || [0, 0, 0],
          parameters: n.parameters || {},
        })),
        actors: actors.map((n: any) => ({
          ...n,
          scale: n.scale || [1, 1, 1],
          rotation: n.rotation || [0, 0, 0],
          parameters: n.parameters || {},
        })),
        underlay: scenario.project.underlay || null,
        sceneSettings: scenario.project.sceneSettings,
        customProducts: scenario.project.customProducts || [],
        customModels: scenario.project.customModels || [],
        paths: scenario.project.paths || [],
        cameraPaths: scenario.project.cameraPaths || [],
        pathsVisible: scenario.project.pathsVisible ?? true,
      });
      simulationEngine.loadRules(Array.isArray(scenario.rules) ? scenario.rules : []);
    } else {
      simulationEngine.loadRules([]);
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
              <h3 className="text-sm font-semibold text-white">Load Scenario JSON</h3>
              <p className="text-xs text-gray-400 mt-0.5">Files are loaded from the GitHub <code className="text-gray-300">/scenarios</code> folder.</p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {/* JSON scenarios from GitHub folder */}
              {fileScenarios.length > 0 && (
                <>
                  <div className="px-3 py-1.5 border-b border-gray-700">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Available Scenarios</span>
                  </div>
                  {fileScenarios.map(fs => (
                    <button
                      key={fs.filename}
                      onClick={() => loadFileScenario(fs)}
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
                        <p className="text-[10px] text-gray-500 mt-0.5">{fs.filename}</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {fileScenarios.length === 0 && (
                <div className="px-3 py-4 text-xs text-gray-400 leading-relaxed">
                  No scenario JSON files found.
                  <br />
                  Add files to the repository <code className="text-gray-300">/scenarios</code> folder and reopen this menu.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ScenarioLoader;
