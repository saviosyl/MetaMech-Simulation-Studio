/**
 * ValidationPanel — Layout health & simulation warnings
 * 
 * Scans the scene for common issues and shows actionable warnings.
 */
import React, { useState, useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  XCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
} from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';

type Severity = 'error' | 'warning' | 'info' | 'success';

interface ValidationIssue {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
  nodeId?: string;
  nodeName?: string;
}

const CONVEYOR_TYPES = ['conveyor', 'belt-conveyor', 'roller-conveyor', 'bend-conveyor', 'modular-conveyor-straight', 'modular-conveyor-90-curve', 'modular-conveyor-45-curve', 'spiral-conveyor', 'incline-conveyor'];

function validateScene(nodes: any[], edges: any[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Check: no nodes
  if (nodes.length === 0) {
    issues.push({
      id: 'empty-scene',
      severity: 'info',
      title: 'Empty scene',
      detail: 'Drag assets from the library to start building your layout.',
    });
    return issues;
  }

  // Check: has source (Product In)
  const sources = nodes.filter(n => n.type === 'source');
  if (sources.length === 0) {
    issues.push({
      id: 'no-source',
      severity: 'error',
      title: 'No Product In',
      detail: 'Add a Product In node to generate products for simulation.',
    });
  }

  // Check: has sink (Product Out)
  const sinks = nodes.filter(n => n.type === 'sink');
  if (sinks.length === 0) {
    issues.push({
      id: 'no-sink',
      severity: 'warning',
      title: 'No Product Out',
      detail: 'Add a Product Out to collect products at the end of your line. Without one, products may accumulate.',
    });
  }

  // Check: disconnected nodes (no edges in or out)
  // Decorative / environment assets don't need flow edges — skip them
  const DECORATIVE_TYPES = new Set([
    // Environment
    'wall', 'door', 'window', 'stairs', 'pallet-rack', 'safety-rail', 'warehouse-shell',
    'fence', 'fence-gate', 'bollard', 'operator-station', 'electrical-cabinet',
    'tower-light', 'hmi-stand', 'machine-enclosure', 'floor-zone', 'pallet-stack',
    'pallet', 'cardboard-box', 'floor-marking', 'floor', 'stretch-wrapper',
    'guard-partition', 'light-curtain',
    // Pallets (placed as scene objects, not flow nodes)
    'eur-pallet', 'standard-pallet', 'custom-pallet',
    // Actors
    'operator', 'operator-1', 'operator-2', 'operator-3', 'engineer',
    'forklift', 'agv', 'pallet-truck',
    // Static models
    'forklift-static', 'agv-static', 'worker-static', 'pallet-truck-static',
    'pallet-static', 'cardboard-box-static',
  ]);

  for (const node of nodes) {
    if (DECORATIVE_TYPES.has(node.type)) continue;

    const hasIn = edges.some(e => e.to === node.id);
    const hasOut = edges.some(e => e.from === node.id);
    
    if (!hasIn && !hasOut && node.type !== 'source' && node.type !== 'sink') {
      issues.push({
        id: `disconnected-${node.id}`,
        severity: 'warning',
        title: `Disconnected: ${node.name}`,
        detail: 'This node has no connections. Connect it to other nodes or remove it.',
        nodeId: node.id,
        nodeName: node.name,
      });
    }
  }

  // Check: source without output
  for (const src of sources) {
    const hasOut = edges.some(e => e.from === src.id);
    if (!hasOut) {
      issues.push({
        id: `source-no-out-${src.id}`,
        severity: 'error',
        title: `Product In "${src.name}" has no output`,
        detail: 'Connect the Product In output to a conveyor or machine.',
        nodeId: src.id,
        nodeName: src.name,
      });
    }
  }

  // Check: sink without input
  for (const sink of sinks) {
    const hasIn = edges.some(e => e.to === sink.id);
    if (!hasIn) {
      issues.push({
        id: `sink-no-in-${sink.id}`,
        severity: 'warning',
        title: `Product Out "${sink.name}" has no input`,
        detail: 'Connect the Product Out input to receive products.',
        nodeId: sink.id,
        nodeName: sink.name,
      });
    }
  }

  // Check: stopper without sensor tag (if sensor-release mode)
  const stoppers = nodes.filter(n => n.type === 'stopper');
  for (const stopper of stoppers) {
    if ((stopper.parameters.stopperMode === 'sensor-release' || stopper.parameters.stopperMode === 'sensor-triggered') && !stopper.parameters.sensorTag) {
      issues.push({
        id: `stopper-no-sensor-${stopper.id}`,
        severity: 'warning',
        title: `Stopper "${stopper.name}" needs sensor tag`,
        detail: 'Set a sensor tag to link this stopper to a sensor for triggered release.',
        nodeId: stopper.id,
        nodeName: stopper.name,
      });
    }
  }

  // Check: robot without connections
  const robots = nodes.filter(n => ['cartesian-robot', 'cobot', 'robot-5axis', 'robot-6axis'].includes(n.type));
  for (const robot of robots) {
    const hasIn = edges.some(e => e.to === robot.id);
    const hasOut = edges.some(e => e.from === robot.id);
    if (!hasIn) {
      issues.push({
        id: `robot-no-in-${robot.id}`,
        severity: 'warning',
        title: `Robot "${robot.name}" has no pick source`,
        detail: 'Connect an input edge for the robot pick location.',
        nodeId: robot.id,
        nodeName: robot.name,
      });
    }
    if (!hasOut) {
      issues.push({
        id: `robot-no-out-${robot.id}`,
        severity: 'info',
        title: `Robot "${robot.name}" has no place target`,
        detail: 'Connect an output edge for the robot place location (e.g., a pallet).',
        nodeId: robot.id,
        nodeName: robot.name,
      });
    }
  }

  // If no issues found
  if (issues.length === 0) {
    issues.push({
      id: 'all-good',
      severity: 'success',
      title: 'Layout looks good!',
      detail: `${nodes.length} nodes, ${edges.length} connections. Ready to simulate.`,
    });
  }

  return issues;
}

const severityConfig: Record<Severity, { icon: any; color: string; bg: string; border: string }> = {
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  success: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
};

const ValidationPanel: React.FC = () => {
  const { processNodes, edges, selectObject } = useEditorStore();
  const [isOpen, setIsOpen] = useState(false);

  const handleIssueClick = (issue: ValidationIssue) => {
    if (!issue.nodeId) return;
    // Select the problem node to highlight it
    selectObject(issue.nodeId, 'process');
    // Dispatch a custom event so the viewport can zoom to it
    window.dispatchEvent(new CustomEvent('metamech:focus-node', { detail: { nodeId: issue.nodeId } }));
  };

  const issues = useMemo(() => validateScene(processNodes, edges), [processNodes, edges]);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warnCount = issues.filter(i => i.severity === 'warning').length;
  const hasIssues = errorCount > 0 || warnCount > 0;

  return (
    <div className="absolute bottom-12 right-4 z-20" style={{ maxWidth: 360 }}>
      {/* Toggle button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 backdrop-blur-sm border ${
          hasIssues
            ? errorCount > 0
              ? 'bg-red-500/15 border-red-500/40 text-red-400 hover:bg-red-500/25'
              : 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25'
        }`}
      >
        <Shield size={14} />
        <span className="font-['Orbitron']">
          {errorCount > 0 ? `${errorCount} ERROR${errorCount > 1 ? 'S' : ''}` : 
           warnCount > 0 ? `${warnCount} WARNING${warnCount > 1 ? 'S' : ''}` : 
           'VALID'}
        </span>
        {hasIssues && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            {warnCount > 0 && errorCount > 0 && `+ ${warnCount}w`}
          </span>
        )}
        {isOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>

      {/* Issue list */}
      {isOpen && (
        <div className="mt-2 bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg shadow-xl overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-700 flex items-center gap-2">
            <Zap size={14} className="text-cyan-400" />
            <span className="text-xs font-bold text-slate-200 font-['Orbitron']">LAYOUT VALIDATION</span>
            <span className="text-xs text-slate-500 ml-auto font-['Inter']">{hasIssues ? `${errorCount + warnCount} issue${(errorCount + warnCount) !== 1 ? 's' : ''}` : 'No issues'}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {issues.map(issue => {
              const cfg = severityConfig[issue.severity];
              const Icon = cfg.icon;
              return (
                <div
                  key={issue.id}
                  onClick={() => handleIssueClick(issue)}
                  className={`px-3 py-2.5 border-b border-slate-800 last:border-0 ${cfg.bg} hover:bg-slate-800/50 transition-colors ${issue.nodeId ? 'cursor-pointer' : 'cursor-default'}`}
                  title={issue.nodeId ? 'Click to highlight this node' : undefined}
                >
                  <div className="flex items-start gap-2">
                    <Icon size={14} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${cfg.color} font-['Inter']`}>
                        {issue.title}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 font-['Inter']">
                        {issue.detail}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;
