import React, { useState } from 'react';
import { ChevronUp, ChevronDown, BarChart3, AlertTriangle, Activity } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';

type StatsTab = 'overview' | 'flow' | 'kpi';

const StatsPanel: React.FC = () => {
  const { isPlaying } = useEditorStore();
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<StatsTab>('overview');
  const [stats, setStats] = useState<ReturnType<typeof simulationEngine.getStats> | null>(null);

  React.useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setStats(simulationEngine.getStats());
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying]);

  if (!isPlaying && !stats) return null;

  const tabs: { id: StatsTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'flow', label: 'Flow States' },
    { id: 'kpi', label: 'KPIs' },
  ];

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
              Time: {formatTime(stats.simTime)} | Products: {stats.productCount} | TPM: {stats.throughputPerMin.toFixed(1)}
            </span>
          )}
        </div>
        {collapsed ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {!collapsed && stats && (
        <div className="px-4 pb-3">
          {/* Tab bar */}
          <div className="flex gap-1 mb-3 border-b border-gray-700 pb-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 text-xs rounded-t font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-gray-800 text-teal-400 border-b-2 border-teal-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'overview' && <OverviewTab stats={stats} />}
          {activeTab === 'flow' && <FlowTab stats={stats} />}
          {activeTab === 'kpi' && <KpiTab stats={stats} />}
        </div>
      )}
    </div>
  );
};

// ─── Overview Tab ──────────────────────────────────────────────
const OverviewTab: React.FC<{ stats: any }> = ({ stats }) => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
    <KpiCard label="Throughput" value={`${stats.throughputPerMin.toFixed(1)}`} unit="prod/min" color="teal" sub={`Total: ${stats.totalThroughput}`} />
    <KpiCard label="Avg Cycle Time" value={stats.avgCycleTime.toFixed(2)} unit="sec" color="blue" />

    {/* Machine Utilization */}
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">Machine Utilization</div>
      <div className="space-y-1">
        {stats.machineUtils.length === 0 && <div className="text-xs text-gray-500">No machines</div>}
        {stats.machineUtils.slice(0, 4).map((m: any) => (
          <div key={m.nodeId} className="flex items-center gap-2">
            <div className="flex-1 text-xs truncate">{m.name.split('_')[0]}</div>
            <UtilBar value={m.utilization} />
            <div className="text-xs w-8 text-right">{Math.round(m.utilization * 100)}%</div>
          </div>
        ))}
      </div>
    </div>

    {/* Bottleneck + Buffers */}
    <div className="bg-gray-800 rounded-lg p-3">
      <div className="text-xs text-gray-400 mb-1">Bottleneck</div>
      {stats.bottleneck ? (
        <div className="flex items-center gap-1">
          <AlertTriangle size={12} className="text-red-400" />
          <span className="text-sm font-medium text-red-400">{stats.bottleneck.name.split('_')[0]}</span>
          <span className="text-xs text-gray-500 ml-auto">{Math.round(stats.bottleneck.utilization * 100)}%</span>
        </div>
      ) : (
        <div className="text-xs text-gray-500">None detected</div>
      )}
      {stats.bufferLevels.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-xs text-gray-400">Buffers</div>
          {stats.bufferLevels.map((b: any) => (
            <div key={b.nodeId} className="flex items-center gap-2">
              <span className="text-xs truncate flex-1">{b.name.split('_')[0]}</span>
              <UtilBar value={b.capacity > 0 ? b.level / b.capacity : 0} />
              <span className="text-xs w-10 text-right">{b.level}/{b.capacity}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);

// ─── Flow States Tab ───────────────────────────────────────────
const FlowTab: React.FC<{ stats: any }> = ({ stats }) => {
  const flowStates = stats.flowStates || [];

  if (flowStates.length === 0) {
    return <div className="text-xs text-gray-500 p-2">No flow data — add conveyors/machines to see flow states.</div>;
  }

  return (
    <div className="space-y-1 max-h-48 overflow-y-auto">
      <div className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 text-xs text-gray-400 font-medium px-2 pb-1 border-b border-gray-700 sticky top-0 bg-gray-900">
        <span>Node</span>
        <span>State</span>
        <span>Blocked %</span>
        <span>Starved %</span>
        <span>Queue</span>
      </div>
      {flowStates.map((fs: any) => {
        const nodeStats = simulationEngine.getNodeStats().get(fs.nodeId);
        return (
          <div key={fs.nodeId} className="grid grid-cols-[1fr_80px_80px_80px_60px] gap-2 text-xs px-2 py-1 hover:bg-gray-800 rounded">
            <span className="truncate text-gray-200">{fs.name.split('_')[0]}</span>
            <FlowStateBadge state={fs.state} />
            <div className="flex items-center gap-1">
              <UtilBar value={fs.blockedPct / 100} color="#ef4444" />
              <span className="w-8 text-right">{fs.blockedPct.toFixed(0)}%</span>
            </div>
            <div className="flex items-center gap-1">
              <UtilBar value={fs.starvedPct / 100} color="#f59e0b" />
              <span className="w-8 text-right">{fs.starvedPct.toFixed(0)}%</span>
            </div>
            <span className="text-right text-gray-300">{nodeStats?.queueLength ?? 0}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── KPIs Tab ──────────────────────────────────────────────────
const KpiTab: React.FC<{ stats: any }> = ({ stats }) => {
  const flowStates = stats.flowStates || [];
  const totalBlocked = flowStates.reduce((s: number, f: any) => s + f.blockedPct, 0);
  const avgBlocked = flowStates.length > 0 ? totalBlocked / flowStates.length : 0;
  const totalStarved = flowStates.reduce((s: number, f: any) => s + f.starvedPct, 0);
  const avgStarved = flowStates.length > 0 ? totalStarved / flowStates.length : 0;

  // Find worst blocked/starved
  const worstBlocked = flowStates.length > 0 ? flowStates.reduce((a: any, b: any) => a.blockedPct > b.blockedPct ? a : b) : null;
  const worstStarved = flowStates.length > 0 ? flowStates.reduce((a: any, b: any) => a.starvedPct > b.starvedPct ? a : b) : null;

  // OEE-like metric (simplified: throughput efficiency)
  const targetThroughput = stats.simTime > 0 ? stats.productCount : 1;
  const efficiency = targetThroughput > 0 ? Math.min(100, (stats.totalThroughput / Math.max(1, targetThroughput)) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
      <KpiCard label="System Throughput" value={stats.throughputPerMin.toFixed(1)} unit="prod/min" color="teal" sub={`${stats.totalThroughput} total in ${formatTime(stats.simTime)}`} />
      <KpiCard label="Avg Cycle Time" value={stats.avgCycleTime.toFixed(2)} unit="sec" color="blue" sub={`${stats.productCount} products active`} />
      <KpiCard
        label="Avg Blocked Time"
        value={avgBlocked.toFixed(1)}
        unit="%"
        color={avgBlocked > 20 ? 'red' : avgBlocked > 10 ? 'yellow' : 'green'}
        sub={worstBlocked && worstBlocked.blockedPct > 0 ? `Worst: ${worstBlocked.name.split('_')[0]} (${worstBlocked.blockedPct.toFixed(0)}%)` : 'No blocking'}
      />
      <KpiCard
        label="Avg Starved Time"
        value={avgStarved.toFixed(1)}
        unit="%"
        color={avgStarved > 20 ? 'red' : avgStarved > 10 ? 'yellow' : 'green'}
        sub={worstStarved && worstStarved.starvedPct > 0 ? `Worst: ${worstStarved.name.split('_')[0]} (${worstStarved.starvedPct.toFixed(0)}%)` : 'No starvation'}
      />
      <KpiCard label="Line Efficiency" value={efficiency.toFixed(0)} unit="%" color={efficiency > 80 ? 'green' : efficiency > 50 ? 'yellow' : 'red'} />
      <KpiCard label="Active Products" value={`${stats.productCount}`} unit="" color="gray" />

      {/* Conveyor queue lengths */}
      <div className="bg-gray-800 rounded-lg p-3 col-span-2">
        <div className="text-xs text-gray-400 mb-2 flex items-center gap-1">
          <Activity size={12} />
          Queue Lengths
        </div>
        <div className="flex flex-wrap gap-2">
          {flowStates.slice(0, 8).map((fs: any) => {
            const ns = simulationEngine.getNodeStats().get(fs.nodeId);
            const q = ns?.queueLength ?? 0;
            const peak = ns?.peakQueueLength ?? 0;
            return (
              <div key={fs.nodeId} className="bg-gray-700 rounded px-2 py-1">
                <div className="text-xs text-gray-300 truncate max-w-[80px]">{fs.name.split('_')[0]}</div>
                <div className="text-sm font-bold text-white">{q} <span className="text-xs font-normal text-gray-500">/ peak {peak}</span></div>
              </div>
            );
          })}
          {flowStates.length === 0 && <div className="text-xs text-gray-500">No queue data</div>}
        </div>
      </div>
    </div>
  );
};

// ─── Shared Components ─────────────────────────────────────────
const colorMap: Record<string, string> = {
  teal: 'text-teal-400',
  blue: 'text-blue-400',
  red: 'text-red-400',
  yellow: 'text-yellow-400',
  green: 'text-green-400',
  gray: 'text-gray-300',
};

const KpiCard: React.FC<{ label: string; value: string; unit: string; color: string; sub?: string }> = ({ label, value, unit, color, sub }) => (
  <div className="bg-gray-800 rounded-lg p-3">
    <div className="text-xs text-gray-400 mb-1">{label}</div>
    <div className={`text-lg font-bold ${colorMap[color] || 'text-white'}`}>
      {value} <span className="text-xs font-normal">{unit}</span>
    </div>
    {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
  </div>
);

const UtilBar: React.FC<{ value: number; color?: string }> = ({ value, color }) => (
  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
    <div
      className="h-full rounded-full transition-all"
      style={{
        width: `${Math.min(100, value * 100)}%`,
        backgroundColor: color || (value > 0.9 ? '#ef4444' : value > 0.7 ? '#f59e0b' : '#10b981'),
      }}
    />
  </div>
);

const flowStateColors: Record<string, { bg: string; text: string }> = {
  running: { bg: 'bg-green-900/50', text: 'text-green-400' },
  blocked: { bg: 'bg-red-900/50', text: 'text-red-400' },
  starved: { bg: 'bg-yellow-900/50', text: 'text-yellow-400' },
  stopped: { bg: 'bg-orange-900/50', text: 'text-orange-400' },
  idle: { bg: 'bg-gray-800', text: 'text-gray-400' },
  faulted: { bg: 'bg-red-900/70', text: 'text-red-300' },
};

const FlowStateBadge: React.FC<{ state: string }> = ({ state }) => {
  const colors = flowStateColors[state] || flowStateColors.idle;
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
      {state}
    </span>
  );
};

function formatTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs.toFixed(0)}s`;
}

export default StatsPanel;
