/**
 * Unit Conversion Utilities
 * 
 * Convention:
 * - Internal scene units: meters (1 Three.js unit = 1 meter)
 * - UI display for dimensions: millimeters (mm)
 * - UI display for speeds: meters per minute (m/min)
 * - UI display for angles: degrees (°)
 * - UI display for time: seconds (s)
 * - UI display for weight/capacity: kilograms (kg)
 * - UI display for temperature: Celsius (°C)
 */

// Length conversions
export const mmToM = (mm: number): number => mm / 1000;
export const mToMm = (m: number): number => m * 1000;

// Angle conversions
export const degToRad = (deg: number): number => (deg * Math.PI) / 180;
export const radToDeg = (rad: number): number => (rad * 180) / Math.PI;

// Speed conversions
export const mPerMinToMPerSec = (mpm: number): number => mpm / 60;
export const mPerSecToMPerMin = (mps: number): number => mps * 60;

// Formatters (input in internal units, output as display string)
export const formatMm = (m: number): string => `${(m * 1000).toFixed(0)} mm`;
export const formatM = (m: number): string => `${m.toFixed(2)} m`;
export const formatDeg = (rad: number): string => `${((rad * 180) / Math.PI).toFixed(1)}°`;
export const formatSeconds = (s: number): string => `${s.toFixed(1)} s`;
export const formatMPerMin = (mps: number): string => `${(mps * 60).toFixed(1)} m/min`;
