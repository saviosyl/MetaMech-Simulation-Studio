/**
 * EnvironmentModels — Factory environment assets
 * Walls, fences, pallets, operator stations, etc.
 */
import React from 'react';
import * as THREE from 'three';

const steel = { color: '#4a4a4a', metalness: 0.8, roughness: 0.3 };
const yellow = { color: '#f5c518', metalness: 0.4, roughness: 0.5 };
const white = { color: '#e8e8e8', metalness: 0.2, roughness: 0.7 };
const blue = { color: '#2563eb', metalness: 0.3, roughness: 0.6 };
const orange = { color: '#ea580c', metalness: 0.4, roughness: 0.5 };

// ─── Wall Panel ────────────────────────────────────────
export const WallModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const w = (params.width || 4000) / 1000;
  const h = (params.height || 3000) / 1000;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Main panel */}
      <mesh position={[0, h/2, 0]} castShadow>
        <boxGeometry args={[w, h, 0.15]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.1} roughness={0.8} emissive={em} />
      </mesh>
      {/* Bottom rail */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <boxGeometry args={[w + 0.02, 0.1, 0.18]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Top rail */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w + 0.02, 0.06, 0.18]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Window Panel ──────────────────────────────────────
export const WindowModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const w = (params.width || 2000) / 1000;
  const h = (params.height || 2000) / 1000;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Frame */}
      <mesh position={[0, h/2 + 0.8, 0]} castShadow>
        <boxGeometry args={[w + 0.08, h + 0.08, 0.08]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>
      {/* Glass */}
      <mesh position={[0, h/2 + 0.8, 0]}>
        <boxGeometry args={[w - 0.04, h - 0.04, 0.03]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.3} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Sill */}
      <mesh position={[0, 0.78, 0.06]} castShadow>
        <boxGeometry args={[w + 0.12, 0.04, 0.12]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Safety Fence / Machine Guard ──────────────────────
export const FenceModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const w = (params.width || 2000) / 1000;
  const h = (params.height || 2000) / 1000;
  const em = isSelected ? '#222' : '#000';
  const posts = Math.max(2, Math.ceil(w / 1.2) + 1);
  return (
    <group>
      {/* Posts */}
      {Array.from({ length: posts }).map((_, i) => {
        const x = -w/2 + (i / (posts - 1)) * w;
        return (
          <mesh key={i} position={[x, h/2, 0]} castShadow>
            <boxGeometry args={[0.04, h, 0.04]} />
            <meshStandardMaterial {...yellow} emissive={em} />
          </mesh>
        );
      })}
      {/* Horizontal bars */}
      {[0.15, h/2, h - 0.05].map((y, i) => (
        <mesh key={`bar-${i}`} position={[0, y, 0]} castShadow>
          <boxGeometry args={[w, 0.03, 0.03]} />
          <meshStandardMaterial {...yellow} emissive={em} />
        </mesh>
      ))}
      {/* Mesh fill (semi-transparent) */}
      <mesh position={[0, h/2, 0]}>
        <boxGeometry args={[w - 0.06, h - 0.25, 0.01]} />
        <meshStandardMaterial color="#f5c518" transparent opacity={0.08} wireframe side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// ─── Fence Gate / Access Door ──────────────────────────
export const FenceGateModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const w = (params.width || 1200) / 1000;
  const h = (params.height || 2000) / 1000;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Gate frame posts */}
      {[-w/2, w/2].map((x, i) => (
        <mesh key={i} position={[x, h/2, 0]} castShadow>
          <boxGeometry args={[0.06, h, 0.06]} />
          <meshStandardMaterial {...yellow} emissive={em} />
        </mesh>
      ))}
      {/* Gate panel */}
      <mesh position={[0, h/2, 0]} castShadow>
        <boxGeometry args={[w - 0.08, h - 0.1, 0.03]} />
        <meshStandardMaterial color="#f5c518" transparent opacity={0.15} metalness={0.5} roughness={0.4} emissive={em} />
      </mesh>
      {/* Handle */}
      <mesh position={[w/2 - 0.12, h/2, 0.04]} castShadow>
        <boxGeometry args={[0.04, 0.12, 0.04]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Top bar */}
      <mesh position={[0, h, 0]} castShadow>
        <boxGeometry args={[w + 0.04, 0.04, 0.06]} />
        <meshStandardMaterial {...yellow} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Pallet Rack ───────────────────────────────────────
export const PalletRackModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const levels = params.levels || 3;
  const bays = params.bays || 2;
  const rackH = levels * 1.2;
  const rackW = bays * 1.4;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Uprights */}
      {[-rackW/2, rackW/2].map((x, i) => (
        <mesh key={`up-${i}`} position={[x, rackH/2, 0]} castShadow>
          <boxGeometry args={[0.06, rackH, 0.06]} />
          <meshStandardMaterial {...blue} emissive={em} />
        </mesh>
      ))}
      {/* Cross braces */}
      {[-rackW/2, rackW/2].map((x, i) => (
        <mesh key={`brace-${i}`} position={[x, rackH/2, 0]} rotation={[0, 0, 0.3]} castShadow>
          <boxGeometry args={[0.02, rackH * 0.9, 0.02]} />
          <meshStandardMaterial {...blue} emissive={em} />
        </mesh>
      ))}
      {/* Shelf beams */}
      {Array.from({ length: levels + 1 }).map((_, lvl) => {
        const y = lvl * 1.2;
        return (
          <group key={`shelf-${lvl}`}>
            <mesh position={[0, y + 0.03, -0.2]} castShadow>
              <boxGeometry args={[rackW, 0.06, 0.04]} />
              <meshStandardMaterial {...orange} emissive={em} />
            </mesh>
            <mesh position={[0, y + 0.03, 0.2]} castShadow>
              <boxGeometry args={[rackW, 0.06, 0.04]} />
              <meshStandardMaterial {...orange} emissive={em} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ─── Bollard ───────────────────────────────────────────
export const BollardModel: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      <mesh position={[0, 0.4, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.8, 12]} />
        <meshStandardMaterial {...yellow} emissive={em} />
      </mesh>
      <mesh position={[0, 0.82, 0]} castShadow>
        <sphereGeometry args={[0.08, 12, 8]} />
        <meshStandardMaterial {...yellow} emissive={em} />
      </mesh>
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.04, 12]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Operator Station / Pack Bench ─────────────────────
export const OperatorStationModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const w = (params.width || 1500) / 1000;
  const d = (params.depth || 800) / 1000;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Table top */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial {...white} emissive={em} />
      </mesh>
      {/* Legs */}
      {[[-w/2+0.05, -d/2+0.05], [-w/2+0.05, d/2-0.05], [w/2-0.05, -d/2+0.05], [w/2-0.05, d/2-0.05]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.42, z]} castShadow>
          <boxGeometry args={[0.04, 0.84, 0.04]} />
          <meshStandardMaterial {...steel} emissive={em} />
        </mesh>
      ))}
      {/* Lower shelf */}
      <mesh position={[0, 0.2, 0]} castShadow>
        <boxGeometry args={[w - 0.1, 0.02, d - 0.1]} />
        <meshStandardMaterial color="#a1a1aa" metalness={0.3} roughness={0.7} emissive={em} />
      </mesh>
      {/* Monitor */}
      <mesh position={[0, 1.15, -d/2 + 0.08]} castShadow>
        <boxGeometry args={[0.5, 0.35, 0.03]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} emissive={em} />
      </mesh>
      {/* Monitor stand */}
      <mesh position={[0, 0.97, -d/2 + 0.08]} castShadow>
        <cylinderGeometry args={[0.02, 0.04, 0.2, 8]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Electrical Cabinet ────────────────────────────────
export const ElectricalCabinetModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ isSelected }) => {
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[0.8, 1.9, 0.5]} />
        <meshStandardMaterial color="#71717a" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>
      {/* Door line */}
      <mesh position={[0.005, 0.95, 0.251]} castShadow>
        <boxGeometry args={[0.7, 1.8, 0.005]} />
        <meshStandardMaterial color="#78716c" metalness={0.6} roughness={0.4} emissive={em} />
      </mesh>
      {/* Handle */}
      <mesh position={[0.28, 0.95, 0.27]} castShadow>
        <boxGeometry args={[0.03, 0.15, 0.03]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Warning label */}
      <mesh position={[0, 1.5, 0.255]}>
        <planeGeometry args={[0.12, 0.12]} />
        <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.1} />
      </mesh>
    </group>
  );
};

// ─── Warning Tower Light (stack light) ─────────────────
export const TowerLightModel: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const em = isSelected ? '#222' : '#000';
  const colors = ['#ef4444', '#f59e0b', '#22c55e'];
  return (
    <group>
      {/* Pole */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 1.2, 8]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.04, 12]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Light segments */}
      {colors.map((c, i) => (
        <mesh key={i} position={[0, 1.22 + i * 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.1, 12]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.3} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Pallet Stack (empty) ──────────────────────────────
export const PalletStackModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const count = params.stackCount || 5;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => (
        <group key={i} position={[0, i * 0.15, 0]}>
          {/* Pallet boards */}
          {[-0.3, 0, 0.3].map((z, j) => (
            <mesh key={`board-${j}`} position={[0, 0.14, z]} castShadow>
              <boxGeometry args={[1.2, 0.02, 0.14]} />
              <meshStandardMaterial color="#a87c4f" roughness={0.9} emissive={em} />
            </mesh>
          ))}
          {/* Blocks */}
          {[-0.45, 0, 0.45].map((x, j) => (
            <mesh key={`block-${j}`} position={[x, 0.07, 0]} castShadow>
              <boxGeometry args={[0.14, 0.12, 0.8]} />
              <meshStandardMaterial color="#8b6f47" roughness={0.9} emissive={em} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// ─── Stretch Wrapper ───────────────────────────────────
export const StretchWrapperModel: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Turntable */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.85, 0.16, 24]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Mast */}
      <mesh position={[1, 1.3, 0]} castShadow>
        <boxGeometry args={[0.1, 2.6, 0.1]} />
        <meshStandardMaterial {...blue} emissive={em} />
      </mesh>
      {/* Film carriage */}
      <mesh position={[0.85, 1.2, 0]} castShadow>
        <boxGeometry args={[0.2, 0.4, 0.15]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Base frame */}
      <mesh position={[0.5, 0.02, 0]} castShadow>
        <boxGeometry args={[2.2, 0.04, 1.8]} />
        <meshStandardMaterial color="#52525b" metalness={0.6} roughness={0.4} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Floor Zone Marking ────────────────────────────────
export const FloorZoneModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params }) => {
  const w = (params.width || 4000) / 1000;
  const d = (params.depth || 4000) / 1000;
  const zoneColor = params.zoneColor || 'yellow';
  const colorMap: Record<string,string> = { yellow: '#fbbf24', green: '#22c55e', red: '#ef4444', blue: '#3b82f6', white: '#e5e7eb' };
  const c = colorMap[zoneColor] || colorMap.yellow;
  return (
    <group>
      {/* Zone fill */}
      <mesh position={[0, 0.005, 0]} rotation={[-Math.PI/2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={c} transparent opacity={0.12} side={THREE.DoubleSide} />
      </mesh>
      {/* Border lines */}
      {[
        [0, 0.008, -d/2, w, 0.004, 0.04],
        [0, 0.008, d/2, w, 0.004, 0.04],
        [-w/2, 0.008, 0, 0.04, 0.004, d],
        [w/2, 0.008, 0, 0.04, 0.004, d],
      ].map(([x, y, z, bw, bh, bd], i) => (
        <mesh key={i} position={[x as number, y as number, z as number]}>
          <boxGeometry args={[bw as number, bh as number, bd as number]} />
          <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.15} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Machine Enclosure / Cabinet ───────────────────────
export const MachineEnclosureModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const w = (params.width || 2000) / 1000;
  const h = (params.height || 2500) / 1000;
  const d = (params.depth || 2000) / 1000;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, h/2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#52525b" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>
      {/* Door panel */}
      <mesh position={[0, h/2, d/2 + 0.005]} castShadow>
        <boxGeometry args={[w * 0.7, h * 0.8, 0.01]} />
        <meshStandardMaterial color="#64748b" metalness={0.6} roughness={0.4} emissive={em} />
      </mesh>
      {/* Viewing window */}
      <mesh position={[0, h * 0.65, d/2 + 0.008]}>
        <boxGeometry args={[w * 0.4, h * 0.25, 0.005]} />
        <meshStandardMaterial color="#93c5fd" transparent opacity={0.25} metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Top ventilation */}
      <mesh position={[0, h + 0.05, 0]} castShadow>
        <boxGeometry args={[w - 0.1, 0.1, d - 0.1]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.6} roughness={0.4} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── HMI Stand ─────────────────────────────────────────
export const HMIStandModel: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Pole */}
      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.025, 0.03, 1.3, 8]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Base */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.04, 12]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Screen housing */}
      <mesh position={[0, 1.35, 0.04]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.35, 0.28, 0.05]} />
        <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>
      {/* Screen */}
      <mesh position={[0, 1.35, 0.068]} rotation={[-0.2, 0, 0]}>
        <planeGeometry args={[0.3, 0.22]} />
        <meshStandardMaterial color="#1e3a5f" emissive="#1e3a5f" emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};

// ─── Pallet Truck (manual) ─────────────────────────────
export const PalletTruckModel: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Forks */}
      {[-0.22, 0.22].map((z, i) => (
        <mesh key={i} position={[0.4, 0.04, z]} castShadow>
          <boxGeometry args={[1.2, 0.06, 0.16]} />
          <meshStandardMaterial {...steel} emissive={em} />
        </mesh>
      ))}
      {/* Hydraulic body */}
      <mesh position={[-0.25, 0.15, 0]} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.55]} />
        <meshStandardMaterial {...yellow} emissive={em} />
      </mesh>
      {/* Handle */}
      <mesh position={[-0.55, 0.55, 0]} rotation={[0, 0, 0.5]} castShadow>
        <boxGeometry args={[0.04, 0.7, 0.04]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Wheels */}
      {[[-0.25, -0.25], [-0.25, 0.25], [0.9, -0.15], [0.9, 0.15]].map(([x, z], i) => (
        <mesh key={`wh-${i}`} position={[x, 0.04, z]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.06, 8]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} emissive={em} />
        </mesh>
      ))}
    </group>
  );
};

// ─── Forklift ──────────────────────────────────────────
export const ForkliftModel: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      {/* Body */}
      <mesh position={[-0.3, 0.6, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 0.9]} />
        <meshStandardMaterial {...yellow} emissive={em} />
      </mesh>
      {/* Cab */}
      <mesh position={[-0.2, 1.25, 0]} castShadow>
        <boxGeometry args={[0.8, 0.5, 0.85]} />
        <meshStandardMaterial {...yellow} emissive={em} />
      </mesh>
      {/* Roof */}
      <mesh position={[-0.2, 1.55, 0]} castShadow>
        <boxGeometry args={[0.9, 0.04, 0.95]} />
        <meshStandardMaterial {...steel} emissive={em} />
      </mesh>
      {/* Mast */}
      {[-0.2, 0.2].map((z, i) => (
        <mesh key={i} position={[0.5, 1.0, z]} castShadow>
          <boxGeometry args={[0.06, 2.0, 0.06]} />
          <meshStandardMaterial {...steel} emissive={em} />
        </mesh>
      ))}
      {/* Forks */}
      {[-0.2, 0.2].map((z, i) => (
        <mesh key={`fork-${i}`} position={[0.9, 0.12, z]} castShadow>
          <boxGeometry args={[0.9, 0.04, 0.1]} />
          <meshStandardMaterial {...steel} emissive={em} />
        </mesh>
      ))}
      {/* Wheels */}
      {[[-0.7, -0.45], [-0.7, 0.45], [0.3, -0.4], [0.3, 0.4]].map(([x, z], i) => (
        <mesh key={`wh-${i}`} position={[x, 0.15, z]} rotation={[Math.PI/2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} emissive={em} />
        </mesh>
      ))}
      {/* Counterweight */}
      <mesh position={[-0.85, 0.4, 0]} castShadow>
        <boxGeometry args={[0.2, 0.5, 0.85]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Cardboard Box ─────────────────────────────────────
export const CardboardBoxModel: React.FC<{ params: Record<string,any>; isSelected: boolean }> = ({ params, isSelected }) => {
  const w = (params.width || 400) / 1000;
  const h = (params.height || 300) / 1000;
  const d = (params.depth || 300) / 1000;
  const em = isSelected ? '#222' : '#000';
  return (
    <group>
      <mesh position={[0, h/2, 0]} castShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#c4a876" roughness={0.9} metalness={0.05} emissive={em} />
      </mesh>
      {/* Tape strip */}
      <mesh position={[0, h, 0]}>
        <boxGeometry args={[0.04, 0.005, d + 0.01]} />
        <meshStandardMaterial color="#a87c4f" roughness={0.7} />
      </mesh>
    </group>
  );
};
