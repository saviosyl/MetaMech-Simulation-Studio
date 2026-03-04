/**
 * Palletizing Controller — MetaMech Simulation Studio
 *
 * Manages pallet slot positions, layer tracking, and pattern generation.
 * Used by robots to determine where to place each product on the pallet.
 */

export type LayerPattern = 'aligned' | 'interlocked' | 'rotated';

export interface PalletDefinition {
  lengthMm: number;
  widthMm: number;
  heightMm: number;   // pallet deck height
  maxLayers: number;
  rows: number;
  columns: number;
  productSpacingMm: number;
  layerPattern: LayerPattern;
  maxPalletHeightMm?: number;
}

export interface SlotPosition {
  /** World-relative offset from pallet center */
  x: number;
  y: number;
  z: number;
  /** Rotation in radians (Y-axis) */
  rotationY: number;
  /** Layer index (0-based) */
  layer: number;
  /** Slot index within layer */
  slotIndex: number;
}

export interface PalletState {
  definition: PalletDefinition;
  /** Total slots filled */
  filledCount: number;
  /** Current layer being filled (0-based) */
  currentLayer: number;
  /** Slots filled in current layer */
  slotsFilledInLayer: number;
  /** Total slots per layer */
  slotsPerLayer: number;
  /** Is pallet complete? */
  complete: boolean;
  /** Product IDs placed on this pallet */
  placedProductIds: string[];
}

/**
 * Generate slot positions for one layer of a pallet.
 */
export function generateLayerSlots(
  def: PalletDefinition,
  layer: number,
  productSizeMm: [number, number, number], // [L, W, H]
): SlotPosition[] {
  const slots: SlotPosition[] = [];
  const pL = def.lengthMm / 1000;
  const _pW = def.widthMm / 1000; // used for future bounds check
  const pH = def.heightMm / 1000;
  const spacing = def.productSpacingMm / 1000;
  const [prodL, prodW, prodH] = productSizeMm.map(v => v / 1000);

  const isRotatedLayer = def.layerPattern === 'rotated' && layer % 2 === 1;
  const isInterlocked = def.layerPattern === 'interlocked' && layer % 2 === 1;

  // Effective product dimensions for this layer
  const effL = isRotatedLayer ? prodW : prodL;
  const effW = isRotatedLayer ? prodL : prodW;
  const rotation = isRotatedLayer ? Math.PI / 2 : 0;

  const rows = def.rows;
  const cols = def.columns;

  // Calculate actual placement grid
  const totalGridL = cols * effL + (cols - 1) * spacing;
  const totalGridW = rows * effW + (rows - 1) * spacing;

  // Center the grid on the pallet
  const startX = -totalGridL / 2 + effL / 2;
  const startZ = -totalGridW / 2 + effW / 2;

  // Y position: pallet height + layer * product height
  const y = pH + layer * prodH + prodH / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let x = startX + c * (effL + spacing);
      let z = startZ + r * (effW + spacing);

      // Interlocked: offset every other row by half a product width
      if (isInterlocked && r % 2 === 1) {
        x += (effL + spacing) / 2;
        // Skip if it goes off the pallet
        if (x + effL / 2 > pL / 2) continue;
      }

      slots.push({
        x, y, z,
        rotationY: rotation,
        layer,
        slotIndex: slots.length,
      });
    }
  }

  return slots;
}

/**
 * Create initial pallet state.
 */
export function createPalletState(def: PalletDefinition): PalletState {
  return {
    definition: def,
    filledCount: 0,
    currentLayer: 0,
    slotsFilledInLayer: 0,
    slotsPerLayer: def.rows * def.columns,
    complete: false,
    placedProductIds: [],
  };
}

/**
 * Get the next available slot position on the pallet.
 * Returns null if pallet is complete.
 */
export function getNextSlotPosition(
  state: PalletState,
  productSizeMm: [number, number, number],
): SlotPosition | null {
  if (state.complete) return null;

  const layer = state.currentLayer;
  const slots = generateLayerSlots(state.definition, layer, productSizeMm);

  if (state.slotsFilledInLayer >= slots.length) {
    // Layer full — try next layer
    if (layer + 1 >= state.definition.maxLayers) {
      return null; // pallet complete
    }
    // Auto advance (caller should call advanceLayer first)
    return null;
  }

  return slots[state.slotsFilledInLayer];
}

/**
 * Mark the current slot as filled.
 */
export function fillSlot(state: PalletState, productId: string): void {
  state.slotsFilledInLayer++;
  state.filledCount++;
  state.placedProductIds.push(productId);

  // Check if layer is complete
  if (state.slotsFilledInLayer >= state.slotsPerLayer) {
    if (state.currentLayer + 1 >= state.definition.maxLayers) {
      state.complete = true;
    } else {
      // Auto-advance to next layer
      state.currentLayer++;
      state.slotsFilledInLayer = 0;
    }
  }
}

/**
 * Convert pallet node parameters to PalletDefinition.
 */
export function paramsToPalletDef(params: Record<string, any>): PalletDefinition {
  return {
    lengthMm: params.length || 1200,
    widthMm: params.width || 800,
    heightMm: params.height || 144,
    maxLayers: params.maxLayers || 5,
    rows: params.rows || 4,
    columns: params.columns || 3,
    productSpacingMm: params.productSpacing || 10,
    layerPattern: params.layerPattern || 'aligned',
    maxPalletHeightMm: params.maxPalletHeight || 1800,
  };
}
