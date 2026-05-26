import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, GripHorizontal, X } from 'lucide-react';
import { useEditorStore } from '../../store/editorStore';
import { getAllModules, ModuleDefinition } from '../../lib/moduleLibrary';

type Currency = 'EUR' | 'USD' | 'INR';

interface SimulationBomPanelProps {
  open: boolean;
  onClose: () => void;
}

interface BomRow {
  key: string;
  moduleId: string;
  company: string;
  model: string;
  currency: Currency;
  unitPrice: number;
  pricingMode: 'per_unit' | 'per_meter';
  bomQuantity: number;
  sceneCount: number;
}

interface BomPosition {
  x: number;
  y: number;
}

const CURRENCIES: Currency[] = ['EUR', 'USD', 'INR'];

function toMoney(value: number, currency: Currency): string {
  const symbol = currency === 'USD' ? '$' : currency === 'INR' ? '₹' : '€';
  return `${symbol}${value.toFixed(2)} ${currency}`;
}

function asCurrency(value: unknown): Currency {
  const normalized = String(value || '').toUpperCase();
  if (normalized === 'USD' || normalized === 'INR') return normalized;
  return 'EUR';
}

function defaultRates(target: Currency): Record<Currency, number> {
  return {
    EUR: target === 'EUR' ? 1 : 1,
    USD: target === 'USD' ? 1 : 1,
    INR: target === 'INR' ? 1 : 1,
  };
}

function resolveModuleForObject(
  objectType: string,
  assetId: string | undefined,
  modulesById: Map<string, ModuleDefinition>,
  modulesByAssetId: Map<string, ModuleDefinition>,
): ModuleDefinition | undefined {
  if (modulesById.has(objectType)) return modulesById.get(objectType);
  if (assetId && modulesById.has(assetId)) return modulesById.get(assetId);
  if (assetId && modulesByAssetId.has(assetId)) return modulesByAssetId.get(assetId);
  return undefined;
}

function isLengthPricedOemModule(module: ModuleDefinition): boolean {
  if (module.category !== 'oem') return false;
  return Boolean(module.parameters && Object.prototype.hasOwnProperty.call(module.parameters, 'oemLengthMm'));
}

function resolveLengthMetersForObject(
  module: ModuleDefinition,
  objectParameters: Record<string, any> | undefined,
): number {
  const objectLengthMm = Number(objectParameters?.oemLengthMm);
  const defaultLengthMm = Number((module.parameters as any)?.oemLengthMm?.default);
  const lengthMm = Number.isFinite(objectLengthMm) && objectLengthMm > 0
    ? objectLengthMm
    : (Number.isFinite(defaultLengthMm) && defaultLengthMm > 0 ? defaultLengthMm : 0);
  return Math.max(0, lengthMm / 1000);
}

const SimulationBomPanel: React.FC<SimulationBomPanelProps> = ({ open, onClose }) => {
  const [outputCurrency, setOutputCurrency] = useState<Currency>('EUR');
  const [rates, setRates] = useState<Record<Currency, number>>(() => defaultRates('EUR'));
  const [qtyByKey, setQtyByKey] = useState<Record<string, number>>({});
  const [position, setPosition] = useState<BomPosition | null>(null);
  const dragRef = useRef<{ offsetX: number; offsetY: number } | null>(null);

  const processNodes = useEditorStore((state) => state.processNodes);
  const environmentAssets = useEditorStore((state) => state.environmentAssets);
  const actors = useEditorStore((state) => state.actors);

  const rows = useMemo<BomRow[]>(() => {
    const modules = getAllModules();
    const modulesById = new Map<string, ModuleDefinition>();
    const modulesByAssetId = new Map<string, ModuleDefinition>();
    for (const module of modules) {
      modulesById.set(module.id, module);
      if (module.assetId && !modulesByAssetId.has(module.assetId)) {
        modulesByAssetId.set(module.assetId, module);
      }
    }

    const counter = new Map<string, {
      module: ModuleDefinition;
      count: number;
      pricingMode: 'per_unit' | 'per_meter';
      quantity: number;
    }>();
    const allObjects = [...processNodes, ...environmentAssets, ...actors];
    for (const object of allObjects) {
      const module = resolveModuleForObject(object.type, object.assetId, modulesById, modulesByAssetId);
      if (!module || typeof module.priceUsd !== 'number' || !Number.isFinite(module.priceUsd) || module.priceUsd <= 0) continue;
      const pricingMode: 'per_unit' | 'per_meter' = isLengthPricedOemModule(module) ? 'per_meter' : 'per_unit';
      const quantityContribution = pricingMode === 'per_meter'
        ? resolveLengthMetersForObject(module, object.parameters)
        : 1;
      const key = module.id;
      const existing = counter.get(key);
      if (existing) {
        existing.count += 1;
        existing.quantity += quantityContribution;
      } else {
        counter.set(key, { module, count: 1, pricingMode, quantity: quantityContribution });
      }
    }

    return Array.from(counter.entries())
      .map(([key, entry]) => ({
        key,
        moduleId: key,
        company: entry.module.oemCompany || 'Simulation',
        model: entry.module.name,
        currency: asCurrency(entry.module.priceCurrency),
        unitPrice: entry.module.priceUsd || 0,
        pricingMode: entry.pricingMode,
        bomQuantity: entry.quantity,
        sceneCount: entry.count,
      }))
      .sort((a, b) => a.company.localeCompare(b.company) || a.model.localeCompare(b.model));
  }, [processNodes, environmentAssets, actors]);

  useEffect(() => {
    setQtyByKey((prev) => {
      const next: Record<string, number> = {};
      for (const row of rows) {
        if (row.pricingMode === 'per_meter') continue;
        const prior = prev[row.key];
        next[row.key] = Number.isFinite(prior) ? Math.max(0, Math.floor(prior)) : row.sceneCount;
      }
      return next;
    });
  }, [rows]);

  useEffect(() => {
    setRates((prev) => ({ ...prev, [outputCurrency]: 1 }));
  }, [outputCurrency]);

  useEffect(() => {
    if (!open || position) return;
    setPosition({
      x: Math.max(10, window.innerWidth - 500),
      y: Math.max(10, window.innerHeight - 470),
    });
  }, [open, position]);

  const beginDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!position) return;
    dragRef.current = {
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
    };
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const width = 470;
      const height = 440;
      const x = Math.min(
        Math.max(8, moveEvent.clientX - dragRef.current.offsetX),
        Math.max(8, window.innerWidth - width - 8),
      );
      const y = Math.min(
        Math.max(8, moveEvent.clientY - dragRef.current.offsetY),
        Math.max(8, window.innerHeight - height - 8),
      );
      setPosition({ x, y });
    };
    const onMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const grandTotal = useMemo(() => {
    return rows.reduce((sum, row) => {
      const qty = row.pricingMode === 'per_meter'
        ? row.bomQuantity
        : Math.max(0, Math.floor(qtyByKey[row.key] ?? row.sceneCount));
      const rate = Number(rates[row.currency] || 0);
      return sum + row.unitPrice * qty * Math.max(0, rate);
    }, 0);
  }, [rows, qtyByKey, rates]);

  const exportCsv = () => {
    const header = ['Company', 'Model', 'Pricing Basis', 'Qty', `Unit (${outputCurrency})`, `Total (${outputCurrency})`];
    const lines = rows.map((row) => {
      const qty = row.pricingMode === 'per_meter'
        ? row.bomQuantity
        : Math.max(0, Math.floor(qtyByKey[row.key] ?? row.sceneCount));
      const rate = Number(rates[row.currency] || 0);
      const unitConverted = row.unitPrice * Math.max(0, rate);
      return [
        row.company,
        row.model,
        row.pricingMode === 'per_meter' ? 'Cost per meter' : 'Unit cost',
        row.pricingMode === 'per_meter' ? qty.toFixed(3) : String(qty),
        unitConverted.toFixed(2),
        (unitConverted * qty).toFixed(2),
      ];
    });
    lines.push(['', '', '', '', 'Grand Total', grandTotal.toFixed(2)]);
    const csv = [header, ...lines]
      .map((cols) => cols.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'simulation-bom.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  return (
    <div
      className="simulation-bom-panel"
      style={{
        position: 'fixed',
        left: position?.x ?? 24,
        top: position?.y ?? 24,
        width: 470,
        maxHeight: '70vh',
        borderRadius: 12,
        border: '1px solid #d7dee9',
        background: '#ffffff',
        boxShadow: '0 18px 45px rgba(15, 23, 42, 0.16)',
        overflow: 'hidden',
        zIndex: 90,
        color: '#0f172a',
      }}
    >
      <style>
        {`
          .simulation-bom-panel input,
          .simulation-bom-panel select {
            background: #ffffff;
            color: #0f172a;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
          }
          .simulation-bom-panel input::placeholder {
            color: #64748b;
          }
        `}
      </style>
      <div
        onMouseDown={beginDrag}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderBottom: '1px solid var(--mm-border-subtle)',
          cursor: 'move',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <GripHorizontal size={14} color="#334155" />
          <strong style={{ fontSize: 12, color: '#0f172a' }}>Simulation BOM</strong>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={exportCsv}
            style={{ border: '1px solid #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#0f172a', padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
          >
            <Download size={12} style={{ marginRight: 4, verticalAlign: -2 }} />
            Export
          </button>
          <button
            onMouseDown={(e) => e.stopPropagation()}
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', color: '#334155', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div style={{ borderBottom: '1px solid #e2e8f0', padding: '10px 12px', display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <label style={{ fontSize: 11, color: '#0f172a' }}>Output Currency</label>
          <select
            value={outputCurrency}
            onChange={(e) => setOutputCurrency(asCurrency(e.target.value))}
            style={{ minWidth: 110, fontSize: 11 }}
          >
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>{currency}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: 11, color: '#0f172a' }}>
          Enter conversion rates (required): <strong>1 source currency = ? {outputCurrency}</strong>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {CURRENCIES.map((currency) => (
            <label key={currency} style={{ display: 'grid', gap: 4, fontSize: 10, color: '#0f172a' }}>
              <span>{currency} → {outputCurrency}</span>
              <input
                type="number"
                min={0}
                step={0.0001}
                value={rates[currency] ?? 1}
                onChange={(e) => setRates((prev) => ({ ...prev, [currency]: Math.max(0, Number(e.target.value) || 0) }))}
                disabled={currency === outputCurrency}
                style={{ fontSize: 11 }}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={{ overflow: 'auto', maxHeight: 'calc(70vh - 180px)', padding: '8px 10px' }}>
        {rows.length === 0 ? (
          <div style={{ color: '#0f172a', fontSize: 12, padding: '14px 4px' }}>
            No priced OEM modules currently placed in the simulation scene.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ color: '#0f172a' }}>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>Company</th>
                <th style={{ textAlign: 'left', padding: '6px 4px' }}>Model</th>
                <th style={{ textAlign: 'right', padding: '6px 4px' }}>Qty</th>
                <th style={{ textAlign: 'right', padding: '6px 4px' }}>Unit</th>
                <th style={{ textAlign: 'right', padding: '6px 4px' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const qty = row.pricingMode === 'per_meter'
                  ? row.bomQuantity
                  : Math.max(0, Math.floor(qtyByKey[row.key] ?? row.sceneCount));
                const rate = Number(rates[row.currency] || 0);
                const unitConverted = row.unitPrice * Math.max(0, rate);
                const lineTotal = unitConverted * qty;
                return (
                  <tr key={row.key} style={{ borderTop: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '6px 4px' }}>{row.company}</td>
                    <td style={{ padding: '6px 4px' }}>{row.model}</td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {row.pricingMode === 'per_meter' ? (
                        <span title="Auto-calculated from parametric lengths in scene">
                          {qty.toFixed(3)} m
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={qty}
                          onChange={(e) => setQtyByKey((prev) => ({ ...prev, [row.key]: Math.max(0, Math.floor(Number(e.target.value) || 0)) }))}
                          style={{ width: 56, textAlign: 'right', borderRadius: 6, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', padding: '2px 6px', fontSize: 11 }}
                        />
                      )}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right' }}>
                      {toMoney(unitConverted, outputCurrency)}{row.pricingMode === 'per_meter' ? ' /m' : ''}
                    </td>
                    <td style={{ padding: '6px 4px', textAlign: 'right', color: '#0f172a' }}>{toMoney(lineTotal, outputCurrency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: '#0f172a' }}>Grand Total ({outputCurrency})</span>
        <strong style={{ color: '#0f172a' }}>{toMoney(grandTotal, outputCurrency)}</strong>
      </div>
    </div>
  );
};

export default SimulationBomPanel;

