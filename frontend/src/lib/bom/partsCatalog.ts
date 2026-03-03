/**
 * Parts Catalog for Belt Conveyor (item profile system)
 * Derived from the GLB model node names — real item part numbers.
 *
 * Base model specs: Length=2000mm, Width=400mm, Height≈900mm
 */

export interface PartDef {
  partNumber: string;
  name: string;
  description: string;
  category: 'frame' | 'drive' | 'belt' | 'support' | 'fastener' | 'electrical' | 'adjustment';
  unit: 'pcs' | 'm' | 'set';
  /** Base quantity in the default 2000×400mm conveyor */
  baseQty: number;
  /** How quantity scales with parameters */
  scaling: 'fixed' | 'per-length' | 'per-support' | 'per-connection' | 'belt-length' | 'per-width-pair';
  /** Weight per unit in kg (estimate) */
  weightKg?: number;
}

export const partsCatalog: PartDef[] = [
  // === DRIVE SYSTEM ===
  {
    partNumber: '0070512',
    name: 'Antriebsrolle Gurtförderer 8 40-400',
    description: 'Drive roller for belt conveyor, profile 8 40, width 400mm',
    category: 'drive',
    unit: 'pcs',
    baseQty: 2,
    scaling: 'fixed',
    weightKg: 1.8,
  },
  {
    partNumber: '0070522',
    name: 'Umlenkrolle Gurtförderer 8 40-400',
    description: 'Tail/deflection roller for belt conveyor, profile 8 40, width 400mm',
    category: 'drive',
    unit: 'pcs',
    baseQty: 2,
    scaling: 'fixed',
    weightKg: 1.2,
  },
  {
    partNumber: '0070544',
    name: 'Motor AC D16-180W-i6',
    description: 'AC geared motor, D16mm shaft, 180W, ratio i=6',
    category: 'electrical',
    unit: 'pcs',
    baseQty: 2,
    scaling: 'fixed',
    weightKg: 3.5,
  },
  {
    partNumber: '0070272',
    name: 'Antriebsbeschlagsatz 8 40',
    description: 'Drive fitting set for profile 8 40',
    category: 'drive',
    unit: 'set',
    baseQty: 2,
    scaling: 'fixed',
    weightKg: 0.4,
  },
  {
    partNumber: '0070296',
    name: 'Umlenkbeschlagsatz 8 40 A=0',
    description: 'Deflection fitting set for profile 8 40',
    category: 'drive',
    unit: 'set',
    baseQty: 2,
    scaling: 'fixed',
    weightKg: 0.35,
  },
  {
    partNumber: '0070311',
    name: 'Motorbefestigungssatz 8 40 D16',
    description: 'Motor mounting set for profile 8 40, D16 shaft',
    category: 'drive',
    unit: 'set',
    baseQty: 13,
    scaling: 'fixed',
    weightKg: 0.2,
  },

  // === BELT ===
  {
    partNumber: '0070644',
    name: 'Transportband PVC, staufähig -400 A=2000',
    description: 'PVC transport belt, accumulating, width 400mm, length 2000mm',
    category: 'belt',
    unit: 'm',
    baseQty: 2,
    scaling: 'belt-length',
    weightKg: 2.5,
  },

  // === FRAME / PROFILES ===
  {
    partNumber: '0071639',
    name: 'Schwenkplattensatz 8 40',
    description: 'Swivel plate set for profile 8 40',
    category: 'frame',
    unit: 'set',
    baseQty: 8,
    scaling: 'per-support',
    weightKg: 0.15,
  },
  {
    partNumber: '0002607',
    name: 'Standard-Verbindungssatz 8',
    description: 'Standard connection set for profile 8',
    category: 'fastener',
    unit: 'set',
    baseQty: 32,
    scaling: 'per-connection',
    weightKg: 0.05,
  },

  // === SUPPORT / LEGS ===
  {
    partNumber: '0060885',
    name: 'Fußplatte 8 40x40, M10',
    description: 'Foot plate for profile 8, 40x40mm, M10 thread',
    category: 'support',
    unit: 'pcs',
    baseQty: 8,
    scaling: 'per-support',
    weightKg: 0.3,
  },
  {
    partNumber: '0026574',
    name: 'Stellfuß D40, M10x80',
    description: 'Adjustable levelling foot, D40mm, M10x80',
    category: 'support',
    unit: 'pcs',
    baseQty: 20,
    scaling: 'per-support',
    weightKg: 0.12,
  },

  // === ADJUSTMENT ===
  {
    partNumber: '0071505',
    name: 'Feinjustierungssatz 8 A=0',
    description: 'Fine adjustment set for profile 8',
    category: 'adjustment',
    unit: 'set',
    baseQty: 2,
    scaling: 'fixed',
    weightKg: 0.1,
  },

  // === FASTENERS ===
  {
    partNumber: '0042005',
    name: 'Nutenstein 8 St M5',
    description: 'T-slot nut for profile 8, steel, M5',
    category: 'fastener',
    unit: 'pcs',
    baseQty: 20,
    scaling: 'per-connection',
    weightKg: 0.008,
  },
  {
    partNumber: '0002601',
    name: 'Abdeckkappe 8 40x40',
    description: 'End cap for profile 8, 40x40mm',
    category: 'frame',
    unit: 'pcs',
    baseQty: 4,
    scaling: 'fixed',
    weightKg: 0.01,
  },
  {
    partNumber: '0061071',
    name: 'Zylinderschraube DIN 912 M8x25',
    description: 'Socket head cap screw DIN 912, M8×25mm',
    category: 'fastener',
    unit: 'pcs',
    baseQty: 4,
    scaling: 'fixed',
    weightKg: 0.012,
  },
  {
    partNumber: '8000075',
    name: 'Senkschraube DIN 7991 M5x12',
    description: 'Countersunk screw DIN 7991, M5×12mm',
    category: 'fastener',
    unit: 'pcs',
    baseQty: 10,
    scaling: 'per-connection',
    weightKg: 0.004,
  },
];

export function getPartByNumber(partNumber: string): PartDef | undefined {
  return partsCatalog.find(p => p.partNumber === partNumber);
}

export function getPartsByCategory(category: PartDef['category']): PartDef[] {
  return partsCatalog.filter(p => p.category === category);
}
