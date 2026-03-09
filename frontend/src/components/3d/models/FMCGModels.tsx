/**
 * FMCG End-of-Line Equipment Models — MetaMech Simulation Studio
 *
 * Premium procedural 3D models for end-of-line packaging and handling:
 * - Carton Erector
 * - Case Packer
 * - Checkweigher
 * - Metal Detector
 * - Labeler / Print & Apply
 * - Sealing / Taping Station
 * - Reject Station
 * - Accumulation Table
 * - Stretch Wrapper
 * - Operator Packing Station
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';

// ─── Shared Materials ──────────────────────────────────────────
const matFrame = new THREE.MeshStandardMaterial({ color: 0x4a5568, metalness: 0.6, roughness: 0.4 });
const matPanel = new THREE.MeshStandardMaterial({ color: 0xdee2e6, metalness: 0.3, roughness: 0.5 });
const matGuard = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.2, roughness: 0.5, transparent: true, opacity: 0.4 });
const matBelt = new THREE.MeshStandardMaterial({ color: 0x1e1e1e, metalness: 0.05, roughness: 0.75 });
const matStainless = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.7, roughness: 0.3 });
const matAccent = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.4, roughness: 0.4 });
const matRed = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.3, roughness: 0.5 });
const matGreen = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.3, roughness: 0.5 });
const matDarkSteel = new THREE.MeshStandardMaterial({ color: 0x2d3748, metalness: 0.7, roughness: 0.35 });

interface ModelProps {
  params?: Record<string, any>;
}

// ─── Machine Frame (shared) ───────────────────────────────────
function MachineFrame({ width, depth, height }: { width: number; depth: number; height: number }) {
  const legW = 0.04;
  const topH = 0.03;
  return (
    <group>
      {/* Four legs */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`leg-${i}`} position={[sx * (width / 2 - legW), height / 2, sz * (depth / 2 - legW)]} castShadow>
          <boxGeometry args={[legW, height, legW]} />
          <meshStandardMaterial {...matFrame} />
        </mesh>
      ))}
      {/* Top frame */}
      <mesh position={[0, height + topH / 2, 0]} castShadow>
        <boxGeometry args={[width, topH, depth]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      {/* Cross braces */}
      <mesh position={[0, height * 0.3, 0]} castShadow>
        <boxGeometry args={[width, 0.02, 0.02]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
    </group>
  );
}

// ─── Control Panel (shared) ────────────────────────────────────
function ControlPanel({ position, height = 0.3 }: { position: [number, number, number]; height?: number }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.25, height, 0.08]} />
        <meshStandardMaterial {...matPanel} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, height * 0.15, 0.042]}>
        <boxGeometry args={[0.15, 0.1, 0.005]} />
        <meshStandardMaterial color="#1a1a2e" emissive="#06b6d4" emissiveIntensity={0.3} />
      </mesh>
      {/* Buttons */}
      {[[-0.05, -0.08], [0.05, -0.08]].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.042]}>
          <cylinderGeometry args={[0.012, 0.012, 0.008, 8]} rotation={[Math.PI / 2, 0, 0]} />
          <meshStandardMaterial {...(i === 0 ? matGreen : matRed)} />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CARTON ERECTOR
// ═══════════════════════════════════════════════════════════════
export const CartonErectorModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 1200) / 1000;
  const d = (params?.depth || 800) / 1000;
  const h = (params?.height || 1800) / 1000;

  return (
    <group>
      <MachineFrame width={w} depth={d} height={h * 0.5} />
      {/* Main body enclosure */}
      <mesh position={[0, h * 0.65, 0]} castShadow>
        <boxGeometry args={[w * 0.9, h * 0.5, d * 0.9]} />
        <meshStandardMaterial {...matPanel} />
      </mesh>
      {/* Safety guard panels (yellow transparent) */}
      {[-1, 1].map((sz, i) => (
        <mesh key={i} position={[0, h * 0.65, sz * (d / 2 + 0.01)]}>
          <boxGeometry args={[w * 0.85, h * 0.45, 0.003]} />
          <meshStandardMaterial {...matGuard} />
        </mesh>
      ))}
      {/* Infeed/outfeed belt sections */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`belt-${i}`} position={[sx * (w / 2 + 0.15), h * 0.5, 0]} castShadow>
          <boxGeometry args={[0.3, 0.02, d * 0.6]} />
          <meshStandardMaterial {...matBelt} />
        </mesh>
      ))}
      {/* Flat carton magazine on top */}
      <mesh position={[0, h * 0.95, -d * 0.2]} castShadow>
        <boxGeometry args={[w * 0.5, 0.4, 0.1]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      <ControlPanel position={[w / 2 + 0.14, h * 0.7, d * 0.3]} />
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// CASE PACKER
// ═══════════════════════════════════════════════════════════════
export const CasePackerModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 1500) / 1000;
  const d = (params?.depth || 1000) / 1000;
  const h = (params?.height || 2000) / 1000;

  return (
    <group>
      <MachineFrame width={w} depth={d} height={h * 0.45} />
      {/* Main enclosure */}
      <mesh position={[0, h * 0.6, 0]} castShadow>
        <boxGeometry args={[w * 0.95, h * 0.45, d * 0.95]} />
        <meshStandardMaterial {...matPanel} />
      </mesh>
      {/* Product infeed conveyor (top) */}
      <mesh position={[-w / 2 - 0.2, h * 0.75, 0]} castShadow>
        <boxGeometry args={[0.5, 0.02, d * 0.5]} />
        <meshStandardMaterial {...matBelt} />
      </mesh>
      {/* Case outfeed conveyor (bottom) */}
      <mesh position={[w / 2 + 0.2, h * 0.45, 0]} castShadow>
        <boxGeometry args={[0.5, 0.02, d * 0.6]} />
        <meshStandardMaterial {...matBelt} />
      </mesh>
      {/* Guard panels */}
      {[-1, 1].map((sz, i) => (
        <mesh key={i} position={[0, h * 0.6, sz * (d / 2 + 0.01)]}>
          <boxGeometry args={[w * 0.9, h * 0.4, 0.003]} />
          <meshStandardMaterial {...matGuard} />
        </mesh>
      ))}
      <ControlPanel position={[w / 2 + 0.14, h * 0.65, d * 0.35]} />
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// CHECKWEIGHER
// ═══════════════════════════════════════════════════════════════
export const CheckweigherModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 800) / 1000;
  const h = (params?.height || 900) / 1000;
  const beltH = h * 0.55;
  const beltW = w * 0.85;
  const frameD = 0.45;

  return (
    <group>
      {/* ── Floor legs (4 adjustable feet) ── */}
      {[[-w/2 + 0.06, -frameD/2 + 0.06], [-w/2 + 0.06, frameD/2 - 0.06],
        [w/2 - 0.06, -frameD/2 + 0.06], [w/2 - 0.06, frameD/2 - 0.06]].map(([lx, lz], i) => (
        <group key={`leg-${i}`}>
          <mesh position={[lx, beltH * 0.35, lz]} castShadow>
            <boxGeometry args={[0.04, beltH * 0.7, 0.04]} />
            <meshStandardMaterial {...matStainless} />
          </mesh>
          <mesh position={[lx, 0.005, lz]}>
            <cylinderGeometry args={[0.03, 0.035, 0.01, 12]} />
            <meshStandardMaterial {...matDarkSteel} />
          </mesh>
        </group>
      ))}

      {/* ── Main frame crossbars ── */}
      {[0.12, beltH - 0.03].map((fy, fi) => (
        <group key={`cross-${fi}`}>
          <mesh position={[0, fy, -frameD/2 + 0.02]} castShadow>
            <boxGeometry args={[w - 0.08, 0.025, 0.025]} />
            <meshStandardMaterial {...matStainless} />
          </mesh>
          <mesh position={[0, fy, frameD/2 - 0.02]} castShadow>
            <boxGeometry args={[w - 0.08, 0.025, 0.025]} />
            <meshStandardMaterial {...matStainless} />
          </mesh>
        </group>
      ))}

      {/* ── Load cell housing (precision weighing unit) ── */}
      <mesh position={[0, beltH - 0.04, 0]} castShadow>
        <boxGeometry args={[w * 0.5, 0.06, frameD * 0.6]} />
        <meshStandardMaterial color="#2d2d2d" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* ── Weighing belt (shorter than full width — isolated section) ── */}
      <mesh position={[0, beltH, 0]} castShadow>
        <boxGeometry args={[w * 0.45, 0.012, frameD * 0.7]} />
        <meshStandardMaterial {...matBelt} />
      </mesh>
      {/* Belt side rails */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`wr-${i}`} position={[0, beltH + 0.015, sz * frameD * 0.38]} castShadow>
          <boxGeometry args={[w * 0.45, 0.02, 0.008]} />
          <meshStandardMaterial {...matStainless} />
        </mesh>
      ))}

      {/* ── Infeed/outfeed conveyor sections ── */}
      {[-1, 1].map((sx, i) => (
        <group key={`conv-${i}`}>
          <mesh position={[sx * (w * 0.37), beltH, 0]} castShadow>
            <boxGeometry args={[w * 0.28, 0.015, frameD * 0.7]} />
            <meshStandardMaterial {...matBelt} />
          </mesh>
          {/* Rollers (3 per side) */}
          {[0, 0.08, -0.08].map((rOff, ri) => (
            <mesh key={`roller-${ri}`} position={[sx * (w * 0.37) + rOff * sx, beltH + 0.01, 0]} rotation={[0, 0, Math.PI/2]}>
              <cylinderGeometry args={[0.012, 0.012, frameD * 0.65, 8]} />
              <meshStandardMaterial color="#b0b0b0" metalness={0.85} roughness={0.15} />
            </mesh>
          ))}
          {/* Side guides */}
          {[-1, 1].map((gz, gi) => (
            <mesh key={`guide-${gi}`} position={[sx * (w * 0.37), beltH + 0.03, gz * frameD * 0.38]}>
              <boxGeometry args={[w * 0.28, 0.04, 0.006]} />
              <meshStandardMaterial {...matStainless} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ── HMI display arm ── */}
      <mesh position={[w * 0.38, beltH + 0.2, frameD * 0.3]} castShadow>
        <boxGeometry args={[0.03, 0.4, 0.03]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      {/* Display head (tilted) */}
      <mesh position={[w * 0.38, beltH + 0.42, frameD * 0.32]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.2, 0.14, 0.04]} />
        <meshStandardMaterial {...matPanel} />
      </mesh>
      {/* Screen */}
      <mesh position={[w * 0.38, beltH + 0.43, frameD * 0.345]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.14, 0.08, 0.003]} />
        <meshStandardMaterial color="#0a0a1a" emissive="#10b981" emissiveIntensity={0.3} />
      </mesh>

      {/* ── Status indicator lights ── */}
      {['#10b981', '#eab308', '#ef4444'].map((col, ci) => (
        <mesh key={`light-${ci}`} position={[w * 0.38, beltH + 0.52 + ci * 0.035, frameD * 0.32]}>
          <sphereGeometry args={[0.012, 8, 6]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// METAL DETECTOR
// ═══════════════════════════════════════════════════════════════
export const MetalDetectorModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 600) / 1000;
  const h = (params?.height || 900) / 1000;
  const apertureH = 0.25;
  const apertureW = w * 0.7;

  return (
    <group>
      {/* Base frame */}
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <boxGeometry args={[w, h * 0.25, 0.45]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Detector head — arch shape (two pillars + top) */}
      <mesh position={[-apertureW / 2 - 0.04, h * 0.65, 0]} castShadow>
        <boxGeometry args={[0.08, apertureH * 2, 0.15]} />
        <meshStandardMaterial {...matAccent} />
      </mesh>
      <mesh position={[apertureW / 2 + 0.04, h * 0.65, 0]} castShadow>
        <boxGeometry args={[0.08, apertureH * 2, 0.15]} />
        <meshStandardMaterial {...matAccent} />
      </mesh>
      <mesh position={[0, h * 0.65 + apertureH, 0]} castShadow>
        <boxGeometry args={[apertureW + 0.16, 0.08, 0.15]} />
        <meshStandardMaterial {...matAccent} />
      </mesh>
      {/* Belt through aperture */}
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <boxGeometry args={[w * 0.9, 0.015, 0.35]} />
        <meshStandardMaterial {...matBelt} />
      </mesh>
      {/* Status light */}
      <mesh position={[0, h * 0.65 + apertureH + 0.06, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// LABELER / PRINT & APPLY
// ═══════════════════════════════════════════════════════════════
export const LabelerModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 600) / 1000;
  const h = (params?.height || 1200) / 1000;
  const beltH = h * 0.48;
  const frameD = 0.42;

  return (
    <group>
      {/* ── Stainless steel frame with legs ── */}
      {[[-w/2 + 0.04, -frameD/2 + 0.04], [-w/2 + 0.04, frameD/2 - 0.04],
        [w/2 - 0.04, -frameD/2 + 0.04], [w/2 - 0.04, frameD/2 - 0.04]].map(([lx, lz], i) => (
        <group key={`leg-${i}`}>
          <mesh position={[lx, beltH * 0.45, lz]} castShadow>
            <boxGeometry args={[0.035, beltH * 0.9, 0.035]} />
            <meshStandardMaterial {...matStainless} />
          </mesh>
          <mesh position={[lx, 0.005, lz]}>
            <cylinderGeometry args={[0.025, 0.03, 0.01, 12]} />
            <meshStandardMaterial {...matDarkSteel} />
          </mesh>
        </group>
      ))}

      {/* Frame crossbars */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <boxGeometry args={[w - 0.06, 0.02, frameD - 0.06]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>

      {/* ── Conveyor belt section ── */}
      <mesh position={[0, beltH, 0]} castShadow>
        <boxGeometry args={[w * 0.9, 0.02, frameD * 0.75]} />
        <meshStandardMaterial {...matBelt} />
      </mesh>
      {/* Belt frame */}
      <mesh position={[0, beltH - 0.02, 0]} castShadow>
        <boxGeometry args={[w * 0.92, 0.03, frameD * 0.78]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Side guides */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`sg-${i}`} position={[0, beltH + 0.03, sz * frameD * 0.42]}>
          <boxGeometry args={[w * 0.9, 0.04, 0.006]} />
          <meshStandardMaterial {...matStainless} />
        </mesh>
      ))}
      {/* Drive rollers at ends */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`dr-${i}`} position={[sx * w * 0.44, beltH, 0]} rotation={[0, 0, Math.PI/2]}>
          <cylinderGeometry args={[0.018, 0.018, frameD * 0.7, 10]} />
          <meshStandardMaterial color="#999" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* ── Label applicator tower (rear-mounted) ── */}
      <mesh position={[0, beltH + 0.3, -frameD * 0.4]} castShadow>
        <boxGeometry args={[0.08, 0.6, 0.08]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      {/* Horizontal arm */}
      <mesh position={[0, beltH + 0.55, -frameD * 0.2]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.35]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>

      {/* ── Print & apply head ── */}
      <mesh position={[0, beltH + 0.35, -frameD * 0.08]} castShadow>
        <boxGeometry args={[0.22, 0.18, 0.2]} />
        <meshStandardMaterial {...matDarkSteel} />
      </mesh>
      {/* Applicator pad (bottom) */}
      <mesh position={[0, beltH + 0.25, -frameD * 0.08]}>
        <boxGeometry args={[0.15, 0.02, 0.12]} />
        <meshStandardMaterial color="#444" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* ── Label roll (large) ── */}
      <mesh position={[0, beltH + 0.55, -frameD * 0.42]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.06, 20]} />
        <meshStandardMaterial color="#f0f0f0" metalness={0.1} roughness={0.5} />
      </mesh>
      {/* Roll core */}
      <mesh position={[0, beltH + 0.55, -frameD * 0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, 0.065, 12]} />
        <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
      </mesh>
      {/* Take-up roll (smaller, below) */}
      <mesh position={[0, beltH + 0.2, -frameD * 0.42]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.06, 16]} />
        <meshStandardMaterial color="#e0e0e0" metalness={0.1} roughness={0.5} />
      </mesh>

      {/* ── Label path (thin ribbon from roll to head) ── */}
      <mesh position={[0, beltH + 0.42, -frameD * 0.25]} rotation={[0.4, 0, 0]}>
        <boxGeometry args={[0.05, 0.001, 0.2]} />
        <meshStandardMaterial color="#f8f8f8" metalness={0} roughness={0.9} transparent opacity={0.8} />
      </mesh>

      {/* ── Control panel (side-mounted) ── */}
      <ControlPanel position={[w / 2 + 0.12, beltH + 0.15, 0]} height={0.22} />

      {/* ── Status tower light ── */}
      <mesh position={[-w/2 + 0.04, beltH + 0.6, -frameD * 0.35]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.08, 8]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      {['#10b981', '#eab308'].map((col, ci) => (
        <mesh key={`tl-${ci}`} position={[-w/2 + 0.04, beltH + 0.65 + ci * 0.03, -frameD * 0.35]}>
          <cylinderGeometry args={[0.012, 0.012, 0.025, 8]} />
          <meshStandardMaterial color={col} emissive={col} emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// SEALING / TAPING STATION
// ═══════════════════════════════════════════════════════════════
export const SealingStationModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 700) / 1000;
  const h = (params?.height || 1000) / 1000;

  return (
    <group>
      {/* Frame */}
      <MachineFrame width={w} depth={0.5} height={h * 0.5} />
      {/* Belt */}
      <mesh position={[0, h * 0.52, 0]} castShadow>
        <boxGeometry args={[w * 0.85, 0.015, 0.4]} />
        <meshStandardMaterial {...matBelt} />
      </mesh>
      {/* Sealing arch */}
      <mesh position={[0, h * 0.72, -0.22]} castShadow>
        <boxGeometry args={[0.06, h * 0.4, 0.06]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      <mesh position={[0, h * 0.72, 0.22]} castShadow>
        <boxGeometry args={[0.06, h * 0.4, 0.06]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      <mesh position={[0, h * 0.92, 0]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.5]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      {/* Tape head */}
      <mesh position={[0, h * 0.72, 0]} castShadow>
        <boxGeometry args={[0.15, 0.1, 0.08]} />
        <meshStandardMaterial {...matDarkSteel} />
      </mesh>
      {/* Tape roll */}
      <mesh position={[0.12, h * 0.72, 0]} castShadow rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.04, 0.015, 8, 16]} />
        <meshStandardMaterial color="#d4a574" metalness={0.1} roughness={0.7} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// REJECT STATION
// ═══════════════════════════════════════════════════════════════
export const RejectStationModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 600) / 1000;
  const h = (params?.height || 900) / 1000;
  const beltH = h * 0.52;
  const frameD = 0.42;
  const rejectSide = params?.side === 'left' ? -1 : 1;

  return (
    <group>
      {/* ── Frame legs ── */}
      {[[-w/2 + 0.04, -frameD/2 + 0.04], [-w/2 + 0.04, frameD/2 - 0.04],
        [w/2 - 0.04, -frameD/2 + 0.04], [w/2 - 0.04, frameD/2 - 0.04]].map(([lx, lz], i) => (
        <group key={`leg-${i}`}>
          <mesh position={[lx, beltH * 0.45, lz]} castShadow>
            <boxGeometry args={[0.035, beltH * 0.9, 0.035]} />
            <meshStandardMaterial {...matStainless} />
          </mesh>
          <mesh position={[lx, 0.005, lz]}>
            <cylinderGeometry args={[0.025, 0.03, 0.01, 12]} />
            <meshStandardMaterial {...matDarkSteel} />
          </mesh>
        </group>
      ))}

      {/* ── Main conveyor belt ── */}
      <mesh position={[0, beltH - 0.02, 0]} castShadow>
        <boxGeometry args={[w * 0.92, 0.04, frameD * 0.78]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      <mesh position={[0, beltH, 0]} castShadow>
        <boxGeometry args={[w * 0.88, 0.015, frameD * 0.72]} />
        <meshStandardMaterial {...matBelt} />
      </mesh>
      {/* Side guides (with opening on reject side) */}
      <mesh position={[0, beltH + 0.03, -rejectSide * frameD * 0.42]}>
        <boxGeometry args={[w * 0.88, 0.04, 0.006]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Partial guide on reject side (with gap) */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`pg-${i}`} position={[sx * w * 0.35, beltH + 0.03, rejectSide * frameD * 0.42]}>
          <boxGeometry args={[w * 0.18, 0.04, 0.006]} />
          <meshStandardMaterial {...matStainless} />
        </mesh>
      ))}

      {/* ── Pneumatic pusher assembly (opposite reject side) ── */}
      <mesh position={[0, beltH + 0.06, -rejectSide * (frameD * 0.45 + 0.04)]} castShadow>
        <boxGeometry args={[0.06, 0.06, 0.08]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Cylinder body */}
      <mesh position={[0, beltH + 0.06, -rejectSide * (frameD * 0.45 + 0.12)]} castShadow
        rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.12, 10]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Cylinder rod */}
      <mesh position={[0, beltH + 0.06, -rejectSide * (frameD * 0.3)]}
        rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.01, 0.15, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Push plate */}
      <mesh position={[0, beltH + 0.06, -rejectSide * (frameD * 0.2)]} castShadow>
        <boxGeometry args={[0.2, 0.1, 0.015]} />
        <meshStandardMaterial color="#ef4444" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* ── Reject chute (on reject side) ── */}
      <mesh position={[0, beltH - 0.1, rejectSide * (frameD * 0.55)]} castShadow
        rotation={[rejectSide * 0.3, 0, 0]}>
        <boxGeometry args={[0.35, 0.01, 0.25]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Chute side walls */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`cw-${i}`} position={[sx * 0.17, beltH - 0.06, rejectSide * (frameD * 0.55)]}
          rotation={[rejectSide * 0.3, 0, 0]} castShadow>
          <boxGeometry args={[0.01, 0.06, 0.25]} />
          <meshStandardMaterial {...matStainless} />
        </mesh>
      ))}

      {/* ── Reject bin (stainless) ── */}
      <mesh position={[0, 0.2, rejectSide * (frameD * 0.5 + 0.2)]} castShadow>
        <boxGeometry args={[0.4, 0.38, 0.3]} />
        <meshStandardMaterial color="#7a7a7a" metalness={0.6} roughness={0.35} />
      </mesh>
      {/* Bin rim */}
      <mesh position={[0, 0.39, rejectSide * (frameD * 0.5 + 0.2)]}>
        <boxGeometry args={[0.42, 0.02, 0.32]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>

      {/* ── Sensor bar above belt (photoelectric) ── */}
      <mesh position={[-w * 0.15, beltH + 0.15, -frameD * 0.42]} castShadow>
        <boxGeometry args={[0.03, 0.03, 0.03]} />
        <meshStandardMaterial {...matDarkSteel} />
      </mesh>
      <mesh position={[-w * 0.15, beltH + 0.15, frameD * 0.42]} castShadow>
        <boxGeometry args={[0.03, 0.03, 0.03]} />
        <meshStandardMaterial {...matDarkSteel} />
      </mesh>
      {/* Sensor beam (red) */}
      <mesh position={[-w * 0.15, beltH + 0.15, 0]}>
        <cylinderGeometry args={[0.003, 0.003, frameD * 0.8, 4]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.8} transparent opacity={0.4} />
      </mesh>

      {/* ── Warning tower light ── */}
      <mesh position={[w/2 - 0.04, beltH + 0.15, -frameD * 0.35]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.12, 8]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      <mesh position={[w/2 - 0.04, beltH + 0.22, -frameD * 0.35]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 8]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[w/2 - 0.04, beltH + 0.25, -frameD * 0.35]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 8]} />
        <meshStandardMaterial color="#eab308" emissive="#eab308" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// ACCUMULATION TABLE
// ═══════════════════════════════════════════════════════════════
export const AccumulationTableModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 2000) / 1000;
  const d = (params?.depth || 1500) / 1000;
  const h = (params?.height || 800) / 1000;

  return (
    <group>
      {/* Legs */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.05), h / 2, sz * (d / 2 - 0.05)]} castShadow>
          <boxGeometry args={[0.05, h, 0.05]} />
          <meshStandardMaterial {...matStainless} />
        </mesh>
      ))}
      {/* Table surface — roller bed */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Rollers (visual) */}
      {Array.from({ length: Math.floor(w / 0.08) }).map((_, i) => (
        <mesh key={i} position={[-w / 2 + 0.04 + i * 0.08, h + 0.025, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, d * 0.9, 8]} />
          <meshStandardMaterial color="#9ca3af" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* Side rails */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`rail-${i}`} position={[0, h + 0.06, sz * d / 2]} castShadow>
          <boxGeometry args={[w, 0.08, 0.02]} />
          <meshStandardMaterial {...matStainless} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// STRETCH WRAPPER
// ═══════════════════════════════════════════════════════════════
export const StretchWrapperModel: React.FC<ModelProps> = ({ params }) => {
  const h = (params?.height || 2500) / 1000;
  const baseR = 0.8;

  return (
    <group>
      {/* Turntable base */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[baseR, baseR + 0.05, 0.08, 24]} />
        <meshStandardMaterial {...matDarkSteel} />
      </mesh>
      {/* Turntable surface */}
      <mesh position={[0, 0.09, 0]} castShadow>
        <cylinderGeometry args={[baseR - 0.02, baseR - 0.02, 0.02, 24]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Mast */}
      <mesh position={[baseR + 0.15, h / 2, 0]} castShadow>
        <boxGeometry args={[0.12, h, 0.12]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      {/* Film carriage */}
      <mesh position={[baseR + 0.15, h * 0.5, 0]} castShadow>
        <boxGeometry args={[0.2, 0.3, 0.15]} />
        <meshStandardMaterial {...matDarkSteel} />
      </mesh>
      {/* Film roll */}
      <mesh position={[baseR + 0.3, h * 0.5, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 0.08, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.05} roughness={0.8} transparent opacity={0.6} />
      </mesh>
      {/* Top limit switch */}
      <mesh position={[baseR + 0.15, h - 0.05, 0]}>
        <boxGeometry args={[0.06, 0.04, 0.06]} />
        <meshStandardMaterial {...matRed} />
      </mesh>
      <ControlPanel position={[baseR + 0.5, h * 0.5, 0]} />
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// OPERATOR PACKING STATION
// ═══════════════════════════════════════════════════════════════
export const PackingStationModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 1500) / 1000;
  const d = (params?.depth || 800) / 1000;
  const h = (params?.height || 900) / 1000;

  return (
    <group>
      {/* Worktable legs */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.04), h / 2, sz * (d / 2 - 0.04)]} castShadow>
          <boxGeometry args={[0.04, h, 0.04]} />
          <meshStandardMaterial {...matStainless} />
        </mesh>
      ))}
      {/* Worktop */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial color="#e8d8c8" metalness={0.1} roughness={0.7} />
      </mesh>
      {/* Back panel / shelf */}
      <mesh position={[0, h + 0.35, -d / 2 + 0.02]} castShadow>
        <boxGeometry args={[w, 0.7, 0.03]} />
        <meshStandardMaterial {...matPanel} />
      </mesh>
      {/* Shelf */}
      <mesh position={[0, h + 0.6, -d / 2 + 0.12]} castShadow>
        <boxGeometry args={[w * 0.8, 0.02, 0.2]} />
        <meshStandardMaterial {...matStainless} />
      </mesh>
      {/* Task light */}
      <mesh position={[0, h + 0.65, 0]} castShadow>
        <boxGeometry args={[0.5, 0.02, 0.06]} />
        <meshStandardMaterial color="#f5f5f5" emissive="#ffffff" emissiveIntensity={0.2} />
      </mesh>
      {/* Light arm */}
      <mesh position={[0, h + 0.55, -d / 2 + 0.06]}>
        <boxGeometry args={[0.03, 0.12, 0.03]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// PALLET CONVEYOR (heavy duty roller)
// ═══════════════════════════════════════════════════════════════
export const PalletConveyorModel: React.FC<ModelProps> = ({ params }) => {
  const l = (params?.length || 3000) / 1000;
  const w = (params?.width || 1200) / 1000;
  const h = (params?.height || 500) / 1000;

  return (
    <group>
      {/* Side frames */}
      {[-1, 1].map((sz, i) => (
        <mesh key={i} position={[0, h / 2, sz * w / 2]} castShadow>
          <boxGeometry args={[l, h, 0.06]} />
          <meshStandardMaterial {...matDarkSteel} />
        </mesh>
      ))}
      {/* Heavy rollers */}
      {Array.from({ length: Math.floor(l / 0.15) }).map((_, i) => (
        <mesh key={i} position={[-l / 2 + 0.075 + i * 0.15, h, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.035, 0.035, w - 0.06, 12]} />
          <meshStandardMaterial color="#6b7280" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* Support legs */}
      {[[-l / 2 + 0.1, -w / 2 + 0.05], [-l / 2 + 0.1, w / 2 - 0.05], [l / 2 - 0.1, -w / 2 + 0.05], [l / 2 - 0.1, w / 2 - 0.05]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, h * 0.25, z]} castShadow>
          <boxGeometry args={[0.06, h * 0.5, 0.06]} />
          <meshStandardMaterial {...matDarkSteel} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// FORKLIFT (static representation)
// ═══════════════════════════════════════════════════════════════
export const ForkliftModel: React.FC<ModelProps> = () => {
  return (
    <group>
      {/* Body */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[0.8, 0.5, 1.2]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Cab */}
      <mesh position={[0, 0.85, -0.15]} castShadow>
        <boxGeometry args={[0.7, 0.5, 0.7]} />
        <meshStandardMaterial color="#f59e0b" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Mast */}
      <mesh position={[0, 0.9, 0.65]} castShadow>
        <boxGeometry args={[0.08, 1.5, 0.08]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      <mesh position={[0.2, 0.9, 0.65]} castShadow>
        <boxGeometry args={[0.08, 1.5, 0.08]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>
      {/* Forks */}
      {[-0.15, 0.15].map((x, i) => (
        <mesh key={i} position={[x, 0.08, 0.9]} castShadow>
          <boxGeometry args={[0.08, 0.04, 0.8]} />
          <meshStandardMaterial {...matDarkSteel} />
        </mesh>
      ))}
      {/* Wheels */}
      {[[-0.35, 0.55], [0.35, 0.55], [-0.25, -0.45], [0.25, -0.45]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.12, z]} castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 12]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.1} roughness={0.9} />
        </mesh>
      ))}
      {/* Counterweight */}
      <mesh position={[0, 0.3, -0.65]} castShadow>
        <boxGeometry args={[0.7, 0.35, 0.2]} />
        <meshStandardMaterial {...matDarkSteel} />
      </mesh>
    </group>
  );
};
