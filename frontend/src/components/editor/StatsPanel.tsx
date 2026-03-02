import React, { useState } from 'react';
import { ChevronUp, ChevronDown, BarChart3 } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';

const StatsPanel: React.FC = () => {
  const { isPlaying } = useEditorStore();
  const [collapsed, setCollapsed] = useState(false);
  const [stats, setStats] = useState<ReturnType<typeof simulationEngine.getStats> | null>(null);

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStats(simulationEngine.getStats());
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isPlaying && !stats) return null;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur text-white border-t border-gray-700 z-20">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-800 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 size={16} className="text-teal-400" />
          <span className="text-sm font-medium">Simulation Statistics</span>
          {stats && (
            <span className="text-xs text-gray-400 ml-2">
              Time: {stats.simTime.toFixed(1)}s | Products: {stats.productCount}
            </span>
          )}
        </div>
        {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {!collapsed && stats && (
        <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          {/* Throughput */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Throughput</div>
            <div className="text-lg font-bold text-teal-400">
              {stats.throughputPerMin.toFixed(1)} <span className="text-xs font-normal">prod/min</span>
            </div>
            <div className="text-xs text-gray-500">Total: {stats.totalThroughput}</div>
          </div>

          {/* Cycle Time */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Avg Cycle Time</div>
            <div className="text-lg font-bold text-blue-400">
              {stats.avgCycleTime.toFixed(2)} <span className="text-xs font-normal">sec</span>
            </div>
          </div>

          {/* Machine Utilization */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Machine Utilization</div>
            <div className="space-y-1">
              {stats.machineUtils.length === 0 && (
                <div className="text-xs text-gray-500">No machines</div>
              )}
              {stats.machineUtils.slice(0, 3).map(m => (
                <div key={m.nodeId} className="flex items-center gap-2">
                  <div className="flex-1 text-xs truncate">{m.name.split('_')[0]}</div>
                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${m.utilization * 100}%`,
                        backgroundColor: m.utilization > 0.9 ? '#ef4444' : m.utilization > 0.7 ? '#f59e0b' : '#10b981',
                      }}
                    />
                  </div>
                  <div className="text-xs w-8 text-right">{Math.round(m.utilization * 100)}%</div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottleneck */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="text-xs text-gray-400 mb-1">Bottleneck</div>
            {stats.bottleneck ? (
              <div>
                <div className="text-sm font-medium text-red-400">{stats.bottleneck.name.split('_')[0]}</div>
                <div className="text-xs text-gray-500">{Math.round(stats.bottleneck.utilization * 100)}% utilized</div>
              </div>
            ) : (
              <div className="text-xs text-gray-500">None detected</div>
            )}

            {/* Buffer levels */}
            {stats.bufferLevels.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-400">Buffers</div>
                {stats.bufferLevels.map(b => (
                  <div key={b.nodeId} className="text-xs text-gray-500">
                    {b.name.split('_')[0]}: {b.level}/{b.capacity}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsPanel;
