/**
 * BOM & Model Export — CSV, JSON, STL, GLB download support.
 * 
 * Export formats:
 *   - BOM as CSV (opens in Excel, Google Sheets)
 *   - BOM as JSON (machine-readable)
 *   - 3D Model as GLB (opens in SolidWorks via import, Blender, any 3D tool)
 *   - 3D Model as STL (universal manufacturing format, SolidWorks native import)
 *   - Full package as ZIP (BOM + 3D model together)
 */

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { STLExporter } from 'three/examples/jsm/exporters/STLExporter.js';
import type { BOMResult } from './bomEngine';

// ─── Helpers ───

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadText(text: string, filename: string, mimeType = 'text/plain') {
  downloadBlob(new Blob([text], { type: mimeType }), filename);
}

function makeFilename(bom: BOMResult, ext: string): string {
  const { length, width, height } = bom.config;
  return `BeltConveyor_${length}x${width}x${height}mm.${ext}`;
}

// ─── CSV Export ───

export function exportBOMAsCSV(bom: BOMResult): void {
  const headers = [
    'Item', 'Part Number', 'Name', 'Description', 'Category',
    'Quantity', 'Unit', 'Unit Weight (kg)', 'Total Weight (kg)',
    'Unit Price', 'Total Price',
  ];

  const rows = bom.lines.map(l => [
    l.item,
    l.partNumber,
    `"${l.name}"`,
    `"${l.description}"`,
    l.category,
    l.quantity,
    l.unit,
    l.unitWeight,
    l.totalWeight,
    l.unitPrice,
    l.totalPrice,
  ].join(','));

  // Add summary rows
  rows.push('');
  rows.push(`,,,,TOTAL,${bom.totalParts},pcs,,${bom.totalWeight},,${bom.totalPrice}`);
  rows.push('');
  rows.push(`Configuration:,Length=${bom.config.length}mm,Width=${bom.config.width}mm,Height=${bom.config.height}mm,Speed=${bom.config.beltSpeed}m/min,Drive=${bom.config.driveEnd},Guides=${bom.config.sideGuides}`);
  rows.push(`Generated:,${bom.generatedAt}`);

  const csv = [headers.join(','), ...rows].join('\n');
  downloadText(csv, makeFilename(bom, 'csv'), 'text/csv');
}

// ─── JSON Export ───

export function exportBOMAsJSON(bom: BOMResult): void {
  const json = JSON.stringify(bom, null, 2);
  downloadText(json, makeFilename(bom, 'json'), 'application/json');
}

// ─── GLB Export (SolidWorks can import via third-party plugin or convert) ───

export async function exportModelAsGLB(
  scene: THREE.Object3D,
  bom: BOMResult
): Promise<void> {
  const exporter = new GLTFExporter();

  return new Promise((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => {
        // Binary GLB
        if (result instanceof ArrayBuffer) {
          downloadBlob(
            new Blob([result], { type: 'model/gltf-binary' }),
            makeFilename(bom, 'glb')
          );
        } else {
          // JSON glTF fallback
          const json = JSON.stringify(result, null, 2);
          downloadText(json, makeFilename(bom, 'gltf'), 'model/gltf+json');
        }
        resolve();
      },
      (error) => {
        console.error('[Export] GLB export failed:', error);
        reject(error);
      },
      { binary: true }
    );
  });
}

// ─── STL Export (SolidWorks native import) ───

export function exportModelAsSTL(
  scene: THREE.Object3D,
  bom: BOMResult
): void {
  const exporter = new STLExporter();
  const stlString = exporter.parse(scene, { binary: false });
  downloadText(stlString, makeFilename(bom, 'stl'), 'model/stl');
}

export function exportModelAsSTLBinary(
  scene: THREE.Object3D,
  bom: BOMResult
): void {
  const exporter = new STLExporter();
  const result = exporter.parse(scene, { binary: true });
  downloadBlob(
    new Blob([result as unknown as ArrayBuffer], { type: 'model/stl' }),
    makeFilename(bom, 'stl')
  );
}

// ─── Full Package Export (BOM CSV + GLB in a downloadable set) ───

export async function exportFullPackage(
  scene: THREE.Object3D,
  bom: BOMResult
): Promise<void> {
  // Export BOM as CSV
  exportBOMAsCSV(bom);

  // Export model as GLB (slight delay so browser handles both downloads)
  await new Promise(r => setTimeout(r, 500));
  await exportModelAsGLB(scene, bom);

  // Export model as STL
  await new Promise(r => setTimeout(r, 500));
  exportModelAsSTLBinary(scene, bom);
}

// ─── STEP Export placeholder ───

/**
 * STEP export requires server-side processing (OpenCascade / FreeCAD).
 * This is a placeholder that returns info about the capability.
 */
export function canExportSTEP(): boolean {
  // Will be true once we add server-side STEP conversion
  return false;
}

export function getSTEPExportInfo(): string {
  return 'STEP export requires server-side processing. Use GLB or STL for now — both import into SolidWorks. STEP support coming soon.';
}
