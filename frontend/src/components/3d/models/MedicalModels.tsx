/**
 * Medical / Cleanroom Equipment Models — MetaMech Simulation Studio
 *
 * Premium procedural 3D models for pharma/medical/cleanroom layouts:
 * - Stainless Conveyors (straight + bend)
 * - Laminar Flow Hood
 * - Clean Bench / Worktable
 * - Pass-Through Hatch
 * - Gowning Bench
 * - Cleanroom Cart/Trolley
 * - Guard Partition Panel
 * - Machine Enclosure
 * - Light Curtain / Safety Scanner
 * - Inspection Station
 * - Manual Assembly Bench
 * - Product Collection Bins
 */
import React from 'react';
import * as THREE from 'three';

// ─── Cleanroom Materials (stainless / hygienic) ────────────────
const matSS316 = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, metalness: 0.8, roughness: 0.2 });
const matSSBrushed = new THREE.MeshStandardMaterial({ color: 0xb8b8c0, metalness: 0.7, roughness: 0.35 });
const matWhitePanel = new THREE.MeshStandardMaterial({ color: 0xf8f8f8, metalness: 0.1, roughness: 0.4 });
const matGlass = new THREE.MeshStandardMaterial({ color: 0xc8e0ff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.3 });
const matHEPA = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, metalness: 0.05, roughness: 0.8 });
const matCleanBelt = new THREE.MeshStandardMaterial({ color: 0xf0f0f0, metalness: 0.1, roughness: 0.5 });
const matSafetyYellow = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.2, roughness: 0.5 });
const matRedLight = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: new THREE.Color(0xef4444), emissiveIntensity: 0.5 });

interface ModelProps {
  params?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// STAINLESS CONVEYOR (cleanroom version)
// ═══════════════════════════════════════════════════════════════
export const StainlessConveyorModel: React.FC<ModelProps> = ({ params }) => {
  const l = (params?.length || 2000) / 1000;
  const w = (params?.width || 400) / 1000;
  const h = (params?.height || 800) / 1000;

  return (
    <group>
      {/* Side frames — stainless C-channel */}
      {[-1, 1].map((sz, i) => (
        <mesh key={i} position={[0, h / 2, sz * (w / 2 + 0.015)]} castShadow>
          <boxGeometry args={[l, h, 0.03]} />
          <meshStandardMaterial {...matSS316} />
        </mesh>
      ))}
      {/* Clean belt surface */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[l - 0.02, 0.008, w]} />
        <meshStandardMaterial {...matCleanBelt} />
      </mesh>
      {/* Slider bed */}
      <mesh position={[0, h - 0.008, 0]} castShadow>
        <boxGeometry args={[l - 0.04, 0.004, w - 0.01]} />
        <meshStandardMaterial {...matSSBrushed} />
      </mesh>
      {/* Hygienic support legs (round tube, no crevices) */}
      {[[-l / 2 + 0.1], [l / 2 - 0.1]].map(([x], i) => (
        <group key={i}>
          <mesh position={[x, h / 2, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, h, 12]} />
            <meshStandardMaterial {...matSS316} />
          </mesh>
          {/* Foot pad */}
          <mesh position={[x, 0.01, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
            <meshStandardMaterial {...matSSBrushed} />
          </mesh>
        </group>
      ))}
      {/* End rollers */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`r-${i}`} position={[sx * (l / 2 - 0.01), h, 0]} castShadow rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.015, 0.015, w, 12]} />
          <meshStandardMaterial {...matSS316} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// LAMINAR FLOW HOOD
// ═══════════════════════════════════════════════════════════════
export const LaminarFlowHoodModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 1200) / 1000;
  const d = (params?.depth || 800) / 1000;
  const h = (params?.height || 2200) / 1000;

  return (
    <group>
      {/* Base cabinet */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[w, 0.8, d]} />
        <meshStandardMaterial {...matWhitePanel} />
      </mesh>
      {/* Work surface */}
      <mesh position={[0, 0.82, 0]} castShadow>
        <boxGeometry args={[w, 0.03, d]} />
        <meshStandardMaterial {...matSS316} />
      </mesh>
      {/* Back panel */}
      <mesh position={[0, h / 2 + 0.4, -d / 2 + 0.015]} castShadow>
        <boxGeometry args={[w, h - 0.8, 0.03]} />
        <meshStandardMaterial {...matWhitePanel} />
      </mesh>
      {/* Side panels */}
      {[-1, 1].map((sx, i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.015), h / 2 + 0.4, 0]} castShadow>
          <boxGeometry args={[0.03, h - 0.8, d]} />
          <meshStandardMaterial {...matGlass} />
        </mesh>
      ))}
      {/* HEPA filter housing (top) */}
      <mesh position={[0, h - 0.08, 0]} castShadow>
        <boxGeometry args={[w, 0.15, d]} />
        <meshStandardMaterial {...matWhitePanel} />
      </mesh>
      {/* HEPA filter grille */}
      <mesh position={[0, h - 0.16, 0]}>
        <boxGeometry args={[w - 0.06, 0.01, d - 0.06]} />
        <meshStandardMaterial {...matHEPA} />
      </mesh>
      {/* Sash (front glass) */}
      <mesh position={[0, h * 0.65, d / 2 - 0.005]}>
        <boxGeometry args={[w - 0.04, h * 0.35, 0.005]} />
        <meshStandardMaterial {...matGlass} />
      </mesh>
      {/* UV light indicator */}
      <mesh position={[w / 2 - 0.05, h - 0.02, d / 2 - 0.02]}>
        <sphereGeometry args={[0.01, 8, 8]} />
        <meshStandardMaterial color="#8b5cf6" emissive="#8b5cf6" emissiveIntensity={0.8} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// CLEAN BENCH / WORKTABLE
// ═══════════════════════════════════════════════════════════════
export const CleanBenchModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 1500) / 1000;
  const d = (params?.depth || 750) / 1000;
  const h = (params?.height || 850) / 1000;

  return (
    <group>
      {/* Round tube legs */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.04), h / 2, sz * (d / 2 - 0.04)]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, h, 12]} />
          <meshStandardMaterial {...matSS316} />
        </mesh>
      ))}
      {/* Stainless worktop */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w, 0.03, d]} />
        <meshStandardMaterial {...matSS316} />
      </mesh>
      {/* Lower shelf */}
      <mesh position={[0, h * 0.2, 0]} castShadow>
        <boxGeometry args={[w - 0.08, 0.02, d - 0.08]} />
        <meshStandardMaterial {...matSSBrushed} />
      </mesh>
      {/* Upstand (back splash) */}
      <mesh position={[0, h + 0.05, -d / 2 + 0.01]} castShadow>
        <boxGeometry args={[w, 0.1, 0.015]} />
        <meshStandardMaterial {...matSS316} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// PASS-THROUGH HATCH / PASS BOX
// ═══════════════════════════════════════════════════════════════
export const PassThroughHatchModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 600) / 1000;
  const h = (params?.height || 600) / 1000;
  const d = (params?.depth || 600) / 1000;

  return (
    <group>
      {/* Main box */}
      <mesh position={[0, h / 2 + 0.8, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial {...matSS316} />
      </mesh>
      {/* Door (front) */}
      <mesh position={[0, h / 2 + 0.8, d / 2 + 0.005]}>
        <boxGeometry args={[w - 0.04, h - 0.04, 0.01]} />
        <meshStandardMaterial {...matSSBrushed} />
      </mesh>
      {/* Door (back) */}
      <mesh position={[0, h / 2 + 0.8, -d / 2 - 0.005]}>
        <boxGeometry args={[w - 0.04, h - 0.04, 0.01]} />
        <meshStandardMaterial {...matSSBrushed} />
      </mesh>
      {/* Window */}
      <mesh position={[0, h / 2 + 0.85, d / 2 + 0.012]}>
        <boxGeometry args={[w * 0.5, h * 0.5, 0.005]} />
        <meshStandardMaterial {...matGlass} />
      </mesh>
      {/* Interlock indicator */}
      <mesh position={[w / 2 - 0.03, h + 0.8, d / 2 + 0.015]}>
        <sphereGeometry args={[0.012, 8, 8]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.6} />
      </mesh>
      {/* Wall mount bracket hints */}
      {[-1, 1].map((sx, i) => (
        <mesh key={i} position={[sx * (w / 2 + 0.01), h / 2 + 0.8, 0]} castShadow>
          <boxGeometry args={[0.02, h + 0.04, d + 0.02]} />
          <meshStandardMaterial {...matSSBrushed} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// CLEANROOM CART / TROLLEY
// ═══════════════════════════════════════════════════════════════
export const CleanroomCartModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 600) / 1000;
  const d = (params?.depth || 400) / 1000;
  const h = (params?.height || 900) / 1000;
  const shelves = params?.shelves || 3;

  return (
    <group>
      {/* Round tube frame uprights */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2 - 0.02), h / 2, sz * (d / 2 - 0.02)]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, h, 8]} />
          <meshStandardMaterial {...matSS316} />
        </mesh>
      ))}
      {/* Shelves */}
      {Array.from({ length: shelves }).map((_, i) => (
        <mesh key={i} position={[0, 0.1 + (h - 0.15) * (i / (shelves - 1)), 0]} castShadow>
          <boxGeometry args={[w - 0.04, 0.015, d - 0.04]} />
          <meshStandardMaterial {...matSS316} />
        </mesh>
      ))}
      {/* Casters */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`c-${i}`} position={[sx * (w / 2 - 0.03), 0.025, sz * (d / 2 - 0.03)]} castShadow>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshStandardMaterial color="#4a5568" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {/* Push handle */}
      <mesh position={[0, h + 0.04, -d / 2 + 0.01]} castShadow>
        <boxGeometry args={[w - 0.06, 0.02, 0.02]} />
        <meshStandardMaterial {...matSS316} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// GUARD PARTITION PANEL
// ═══════════════════════════════════════════════════════════════
export const GuardPartitionModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 1200) / 1000;
  const h = (params?.height || 2100) / 1000;

  return (
    <group>
      {/* Aluminum posts */}
      {[-1, 1].map((sx, i) => (
        <mesh key={i} position={[sx * (w / 2), h / 2, 0]} castShadow>
          <boxGeometry args={[0.04, h, 0.04]} />
          <meshStandardMaterial color="#a0a0a8" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Lower solid panel */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <boxGeometry args={[w - 0.04, 0.8, 0.025]} />
        <meshStandardMaterial {...matWhitePanel} />
      </mesh>
      {/* Upper glass panel */}
      <mesh position={[0, h / 2 + 0.4, 0]}>
        <boxGeometry args={[w - 0.04, h - 1, 0.008]} />
        <meshStandardMaterial {...matGlass} />
      </mesh>
      {/* Foot plates */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`fp-${i}`} position={[sx * (w / 2), 0.01, 0]} castShadow>
          <boxGeometry args={[0.12, 0.02, 0.12]} />
          <meshStandardMaterial {...matSSBrushed} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// LIGHT CURTAIN / SAFETY SCANNER
// ═══════════════════════════════════════════════════════════════
export const LightCurtainModel: React.FC<ModelProps> = ({ params }) => {
  const h = (params?.height || 1500) / 1000;
  const gap = (params?.gap || 1200) / 1000;

  return (
    <group>
      {/* Emitter column */}
      <mesh position={[0, h / 2, -gap / 2]} castShadow>
        <boxGeometry args={[0.04, h, 0.04]} />
        <meshStandardMaterial {...matSafetyYellow} />
      </mesh>
      {/* Receiver column */}
      <mesh position={[0, h / 2, gap / 2]} castShadow>
        <boxGeometry args={[0.04, h, 0.04]} />
        <meshStandardMaterial {...matSafetyYellow} />
      </mesh>
      {/* Beam visualization (subtle red lines) */}
      {Array.from({ length: Math.floor(h / 0.05) }).map((_, i) => (
        <mesh key={i} position={[0, 0.05 + i * 0.05, 0]}>
          <boxGeometry args={[0.002, 0.002, gap - 0.04]} />
          <meshStandardMaterial {...matRedLight} />
        </mesh>
      ))}
      {/* Mount brackets */}
      {[-1, 1].map((sz, i) => (
        <mesh key={i} position={[0, h + 0.03, sz * (gap / 2)]} castShadow>
          <boxGeometry args={[0.06, 0.02, 0.06]} />
          <meshStandardMaterial {...matSSBrushed} />
        </mesh>
      ))}
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// INSPECTION STATION (vision system)
// ═══════════════════════════════════════════════════════════════
export const InspectionStationModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 800) / 1000;
  const h = (params?.height || 1200) / 1000;

  return (
    <group>
      {/* Base frame */}
      <mesh position={[0, h * 0.35, 0]} castShadow>
        <boxGeometry args={[w, h * 0.25, 0.45]} />
        <meshStandardMaterial {...matSS316} />
      </mesh>
      {/* Belt */}
      <mesh position={[0, h * 0.5, 0]} castShadow>
        <boxGeometry args={[w * 0.85, 0.008, 0.35]} />
        <meshStandardMaterial {...matCleanBelt} />
      </mesh>
      {/* Camera tower */}
      <mesh position={[0, h * 0.75, -0.2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, h * 0.5, 8]} />
        <meshStandardMaterial {...matSSBrushed} />
      </mesh>
      {/* Camera head */}
      <mesh position={[0, h, -0.2]} castShadow>
        <boxGeometry args={[0.08, 0.06, 0.08]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Camera lens */}
      <mesh position={[0, h - 0.035, -0.16]} castShadow>
        <cylinderGeometry args={[0.015, 0.02, 0.03, 12]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Ring light */}
      <mesh position={[0, h * 0.52, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.01, 8, 24]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
      {/* Monitor */}
      <mesh position={[w / 2 + 0.12, h * 0.7, 0]} castShadow>
        <boxGeometry args={[0.18, 0.12, 0.04]} />
        <meshStandardMaterial {...matWhitePanel} />
      </mesh>
      <mesh position={[w / 2 + 0.12, h * 0.72, 0.022]}>
        <boxGeometry args={[0.14, 0.08, 0.003]} />
        <meshStandardMaterial color="#0f172a" emissive="#06b6d4" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// MACHINE ENCLOSURE (cleanroom)
// ═══════════════════════════════════════════════════════════════
export const MachineEnclosureModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 1500) / 1000;
  const d = (params?.depth || 1200) / 1000;
  const h = (params?.height || 2000) / 1000;

  return (
    <group>
      {/* Frame posts */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (w / 2), h / 2, sz * (d / 2)]} castShadow>
          <boxGeometry args={[0.04, h, 0.04]} />
          <meshStandardMaterial color="#a0a0a8" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Top frame */}
      {[[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([sx, sz], i) => (
        <mesh key={`top-${i}`} position={[sx * (w / 2), h, (i < 2 ? 0 : sz * (d / 2))]} castShadow>
          <boxGeometry args={[i < 2 ? 0.04 : w, 0.04, i < 2 ? d : 0.04]} />
          <meshStandardMaterial color="#a0a0a8" metalness={0.6} roughness={0.3} />
        </mesh>
      ))}
      {/* Side panels (polycarbonate) */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`side-${i}`} position={[sx * (w / 2), h / 2, 0]}>
          <boxGeometry args={[0.006, h - 0.08, d - 0.08]} />
          <meshStandardMaterial {...matGlass} />
        </mesh>
      ))}
      {/* Back panel (solid) */}
      <mesh position={[0, h / 2, -d / 2]}>
        <boxGeometry args={[w - 0.08, h - 0.08, 0.025]} />
        <meshStandardMaterial {...matWhitePanel} />
      </mesh>
      {/* Front opening (no panel — access) */}
      {/* Status light bar */}
      <mesh position={[0, h + 0.03, 0]} castShadow>
        <boxGeometry args={[w * 0.3, 0.04, 0.04]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.4} />
      </mesh>
    </group>
  );
};
