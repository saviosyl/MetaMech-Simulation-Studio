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

// ─── Premium Industrial Materials ──────────────────────────────
const matStainlessBrushed = new THREE.MeshStandardMaterial({ color: 0xb8bec4, metalness: 0.65, roughness: 0.35 });
const matStainlessSatin = new THREE.MeshStandardMaterial({ color: 0xcdd1d6, metalness: 0.5, roughness: 0.4 });
const matAluminum = new THREE.MeshStandardMaterial({ color: 0xd4d8dc, metalness: 0.7, roughness: 0.25 });
const matBlackPlastic = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.05, roughness: 0.7 });
const matBeltRubber = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.02, roughness: 0.85 });
const matPolycarb = new THREE.MeshStandardMaterial({ color: 0xe8edf2, metalness: 0.1, roughness: 0.15, transparent: true, opacity: 0.3 });
const matMotor = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.6, roughness: 0.4 });
const matCable = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.1, roughness: 0.8 });
const matLabelRoll = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, metalness: 0.05, roughness: 0.6 });
const matScreen = new THREE.MeshStandardMaterial({ color: 0x0a0a1a, emissive: new THREE.Color(0x06b6d4), emissiveIntensity: 0.3 });
const matYellowLight = new THREE.MeshStandardMaterial({ color: 0xeab308, emissive: new THREE.Color(0xeab308), emissiveIntensity: 0.5 });
const matGreenLight = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: new THREE.Color(0x10b981), emissiveIntensity: 0.5 });
const matRedLight = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: new THREE.Color(0xef4444), emissiveIntensity: 0.5 });
const matRedButton = new THREE.MeshStandardMaterial({ color: 0xcc0000, metalness: 0.3, roughness: 0.5 });
const matLightBase = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.5, roughness: 0.4 });

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
// SHARED INDUSTRIAL SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

/** Adjustable leveling foot — stainless thread + rubber pad */
function LevelingFoot({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Rubber pad */}
      <mesh position={[0, 0.003, 0]}>
        <cylinderGeometry args={[0.022, 0.025, 0.006, 12]} />
        <primitive object={matBlackPlastic} attach="material" />
      </mesh>
      {/* Threaded stud */}
      <mesh position={[0, 0.018, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.024, 8]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Hex nut */}
      <mesh position={[0, 0.032, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.008, 6]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
    </group>
  );
}

/** Decorative bolt head */
function BoltHead({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <mesh position={position} rotation={rotation || [0, 0, 0]} castShadow>
      <cylinderGeometry args={[0.004, 0.004, 0.005, 6]} />
      <primitive object={matStainlessSatin} attach="material" />
    </mesh>
  );
}

/** Conveyor roller */
function Roller({ position, length, radius = 0.025 }: { position: [number, number, number]; length: number; radius?: number }) {
  return (
    <group position={position}>
      {/* Main roller body */}
      <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[radius, radius, length, 12]} />
        <primitive object={matAluminum} attach="material" />
      </mesh>
      {/* Bearing caps */}
      {[-1, 1].map((s, i) => (
        <mesh key={i} position={[s * (length / 2 + 0.003), 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[radius * 0.6, radius * 0.6, 0.006, 8]} />
          <primitive object={matBlackPlastic} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** Photoeye sensor on bracket */
function PhotoeyeSensor({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Mounting bracket */}
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.025, 0.04, 0.015]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
      {/* Sensor body */}
      <mesh position={[0, -0.005, 0.015]} castShadow>
        <boxGeometry args={[0.018, 0.028, 0.018]} />
        <primitive object={matBlackPlastic} attach="material" />
      </mesh>
      {/* Sensor lens */}
      <mesh position={[0, -0.005, 0.026]}>
        <cylinderGeometry args={[0.005, 0.005, 0.003, 8]} />
        <meshStandardMaterial color="#880000" emissive="#ff0000" emissiveIntensity={0.3} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

/** Motor/gearbox assembly */
function MotorGearbox({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Motor body */}
      <mesh castShadow rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.05, 0.05, 0.15, 16]} />
        <primitive object={matMotor} attach="material" />
      </mesh>
      {/* Motor end cap */}
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.042, 0.05, 0.01, 16]} />
        <primitive object={matMotor} attach="material" />
      </mesh>
      {/* Fan cover (rear) */}
      <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.052, 0.052, 0.02, 16]} />
        <primitive object={matBlackPlastic} attach="material" />
      </mesh>
      {/* Gearbox */}
      <mesh position={[0.1, 0, 0]} castShadow>
        <boxGeometry args={[0.06, 0.08, 0.08]} />
        <primitive object={matAluminum} attach="material" />
      </mesh>
      {/* Output shaft */}
      <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.012, 0.012, 0.02, 8]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Mounting bolts */}
      {[[-0.04, 0.04], [-0.04, -0.04], [0.04, 0.04], [0.04, -0.04]].map(([dy, dz], i) => (
        <BoltHead key={i} position={[-0.076, dy * 0.8, dz * 0.8]} rotation={[0, 0, Math.PI / 2]} />
      ))}
    </group>
  );
}

/** Tower light stack (green/yellow/red) */
function TowerLight({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Base pole */}
      <mesh position={[0, 0.04, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.08, 8]} />
        <primitive object={matLightBase} attach="material" />
      </mesh>
      {/* Base mounting plate */}
      <mesh position={[0, -0.002, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.004, 8]} />
        <primitive object={matLightBase} attach="material" />
      </mesh>
      {/* Green light */}
      <mesh position={[0, 0.095, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.028, 12]} />
        <primitive object={matGreenLight} attach="material" />
      </mesh>
      {/* Yellow light */}
      <mesh position={[0, 0.125, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.028, 12]} />
        <primitive object={matYellowLight} attach="material" />
      </mesh>
      {/* Red light */}
      <mesh position={[0, 0.155, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.028, 12]} />
        <primitive object={matRedLight} attach="material" />
      </mesh>
      {/* Cap */}
      <mesh position={[0, 0.172, 0]}>
        <cylinderGeometry args={[0.014, 0.008, 0.008, 8]} />
        <primitive object={matLightBase} attach="material" />
      </mesh>
    </group>
  );
}

/** E-Stop mushroom button */
function EStopButton({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Yellow base plate */}
      <mesh castShadow>
        <boxGeometry args={[0.04, 0.008, 0.04]} />
        <meshStandardMaterial color="#eab308" metalness={0.3} roughness={0.5} />
      </mesh>
      {/* Red mushroom cap */}
      <mesh position={[0, 0.012, 0]}>
        <cylinderGeometry args={[0.015, 0.013, 0.012, 12]} />
        <primitive object={matRedButton} attach="material" />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <sphereGeometry args={[0.015, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <primitive object={matRedButton} attach="material" />
      </mesh>
    </group>
  );
}

/** Junction box with cable glands */
function JunctionBox({ position, size = [0.12, 0.1, 0.06] }: { position: [number, number, number]; size?: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Box body */}
      <mesh castShadow>
        <boxGeometry args={size} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Door seam */}
      <mesh position={[0, 0, size[2] / 2 + 0.001]}>
        <boxGeometry args={[size[0] - 0.01, size[1] - 0.01, 0.001]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
      {/* Handle */}
      <mesh position={[size[0] * 0.3, 0, size[2] / 2 + 0.004]} castShadow>
        <boxGeometry args={[0.008, 0.025, 0.006]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Cable glands (bottom) */}
      {[-0.02, 0, 0.02].map((dx, i) => (
        <mesh key={i} position={[dx, -size[1] / 2 - 0.008, 0]} castShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.016, 8]} />
          <primitive object={matBlackPlastic} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** HMI touchscreen on articulated arm */
function HMIPanel({ position, rotation }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Arm post */}
      <mesh position={[0, -0.15, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Arm swivel joint */}
      <mesh position={[0, 0, 0]} castShadow>
        <sphereGeometry args={[0.018, 8, 8]} />
        <primitive object={matBlackPlastic} attach="material" />
      </mesh>
      {/* Horizontal arm */}
      <mesh position={[0, 0.01, 0.04]} castShadow>
        <boxGeometry args={[0.02, 0.02, 0.08]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Screen enclosure */}
      <mesh position={[0, 0.02, 0.1]} rotation={[-0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.2, 0.155, 0.035]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Screen face */}
      <mesh position={[0, 0.024, 0.12]} rotation={[-0.2, 0, 0]}>
        <boxGeometry args={[0.17, 0.12, 0.003]} />
        <primitive object={matScreen} attach="material" />
      </mesh>
      {/* Bezel buttons */}
      {[-0.06, -0.03, 0, 0.03].map((dx, i) => (
        <mesh key={i} position={[dx, -0.04, 0.12]} rotation={[-0.2, 0, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.004, 6]} />
          <primitive object={matBlackPlastic} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/** Conveyor section — belt with rollers and side rails */
function ConveyorSection({
  position, beltWidth, beltLength, beltHeight = 0.012, rollerCount = 3, sideRailHeight = 0.03
}: {
  position: [number, number, number];
  beltWidth: number;
  beltLength: number;
  beltHeight?: number;
  rollerCount?: number;
  sideRailHeight?: number;
}) {
  const rollerSpacing = beltLength / (rollerCount + 1);
  return (
    <group position={position}>
      {/* Belt bed (support plate under belt) */}
      <mesh position={[0, -beltHeight / 2 - 0.004, 0]} castShadow>
        <boxGeometry args={[beltLength, 0.006, beltWidth + 0.01]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
      {/* Belt surface */}
      <mesh castShadow>
        <boxGeometry args={[beltLength, beltHeight, beltWidth]} />
        <primitive object={matBeltRubber} attach="material" />
      </mesh>
      {/* End rollers */}
      <Roller position={[-beltLength / 2 + 0.015, -0.005, 0]} length={beltWidth + 0.02} />
      <Roller position={[beltLength / 2 - 0.015, -0.005, 0]} length={beltWidth + 0.02} />
      {/* Intermediate rollers */}
      {Array.from({ length: rollerCount }).map((_, i) => (
        <Roller key={i} position={[-beltLength / 2 + rollerSpacing * (i + 1), -0.005, 0]} length={beltWidth + 0.02} radius={0.018} />
      ))}
      {/* Side rails */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`rail-${i}`} position={[0, sideRailHeight / 2 + beltHeight / 2, sz * (beltWidth / 2 + 0.005)]} castShadow>
          <boxGeometry args={[beltLength, sideRailHeight, 0.004]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      ))}
      {/* Guide bracket clamps (on side rails) */}
      {[-1, 1].map((sz) =>
        [-1, 1].map((sx, i) => (
          <mesh key={`clamp-${sz}-${i}`} position={[sx * beltLength * 0.35, sideRailHeight + beltHeight / 2, sz * (beltWidth / 2 + 0.008)]} castShadow>
            <boxGeometry args={[0.02, 0.012, 0.012]} />
            <primitive object={matStainlessSatin} attach="material" />
          </mesh>
        ))
      )}
    </group>
  );
}

/** Polycarbonate guard panel */
function GuardPanel({ position, size, rotation }: { position: [number, number, number]; size: [number, number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      <mesh>
        <boxGeometry args={size} />
        <primitive object={matPolycarb} attach="material" />
      </mesh>
      {/* Frame border (stainless trim) */}
      {/* Top edge */}
      <mesh position={[0, size[1] / 2, 0]}>
        <boxGeometry args={[size[0], 0.006, size[2] + 0.004]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
      {/* Bottom edge */}
      <mesh position={[0, -size[1] / 2, 0]}>
        <boxGeometry args={[size[0], 0.006, size[2] + 0.004]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
    </group>
  );
}

/** Access panel with hinge and handle */
function AccessPanel({ position, size, rotation }: { position: [number, number, number]; size: [number, number]; rotation?: [number, number, number] }) {
  return (
    <group position={position} rotation={rotation || [0, 0, 0]}>
      {/* Panel face */}
      <mesh castShadow>
        <boxGeometry args={[size[0], size[1], 0.003]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Seam line (recessed edge) */}
      <mesh position={[0, 0, 0.002]}>
        <boxGeometry args={[size[0] - 0.004, size[1] - 0.004, 0.001]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
      {/* Handle */}
      <mesh position={[size[0] * 0.35, 0, 0.005]} castShadow>
        <boxGeometry args={[0.008, 0.03, 0.008]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Hinges */}
      {[-1, 1].map((sy, i) => (
        <mesh key={i} position={[-size[0] / 2 + 0.008, sy * size[1] * 0.35, 0.003]}>
          <cylinderGeometry args={[0.004, 0.004, 0.015, 6]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// CHECKWEIGHER — Premium Inline Precision Checkweigher
// Inspired by Mettler Toledo / Wipotec / Bizerba machines
// ═══════════════════════════════════════════════════════════════
export const CheckweigherModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 800) / 1000;
  const eqH = (params?.height || 900) / 1000;
  const beltH = params?.infeedHeight ? (params.infeedHeight / 1000) : (eqH * 0.55);
  const frameD = 0.45;
  const tubeSize = 0.04;
  const infeedLen = w * 0.3;
  const weighLen = w * 0.28;
  const outfeedLen = w * 0.3;
  const beltWidth = frameD * 0.65;
  const gapBetween = 0.02;
  const sideRailH = 0.03;

  // Derived frame levels
  const lowerCrossY = beltH * 0.2;
  const midCrossY = beltH * 0.55;
  const upperRailY = beltH - 0.025;

  // Conveyor X positions (centered)
  const totalLen = infeedLen + weighLen + outfeedLen + gapBetween * 2;
  const infeedX = -totalLen / 2 + infeedLen / 2;
  const weighX = infeedX + infeedLen / 2 + gapBetween + weighLen / 2;
  const outfeedX = weighX + weighLen / 2 + gapBetween + outfeedLen / 2;

  // Leg positions
  const legPositions: [number, number][] = useMemo(() => [
    [-totalLen / 2 + 0.04, -frameD / 2 + 0.04],
    [-totalLen / 2 + 0.04, frameD / 2 - 0.04],
    [totalLen / 2 - 0.04, -frameD / 2 + 0.04],
    [totalLen / 2 - 0.04, frameD / 2 - 0.04],
  ], [totalLen, frameD]);

  // Loadcell support column: extends from loadcell housing down to lower crossmember
  const loadcellHousingY = beltH - 0.035;
  const supportColTop = loadcellHousingY - 0.045; // bottom of isolation mounts
  const supportColBottom = lowerCrossY;
  const supportColHeight = supportColTop - supportColBottom;
  const supportColCenterY = supportColBottom + supportColHeight / 2;

  return (
    <group>
      {/* ═══ FRAME — Tubular stainless steel ═══ */}
      {/* Four vertical legs (ground to beltH) */}
      {legPositions.map(([lx, lz], i) => (
        <group key={`leg-${i}`}>
          <mesh position={[lx, beltH / 2, lz]} castShadow>
            <boxGeometry args={[tubeSize, beltH, tubeSize]} />
            <primitive object={matStainlessBrushed} attach="material" />
          </mesh>
          <LevelingFoot position={[lx, 0, lz]} />
        </group>
      ))}

      {/* Lower horizontal crossmembers (front/back) */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`lower-cross-${i}`} position={[0, lowerCrossY, sz * (frameD / 2 - 0.04)]} castShadow>
          <boxGeometry args={[totalLen - 0.08, tubeSize * 0.6, tubeSize * 0.6]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      ))}
      {/* Lower side crossmembers */}
      {[-1, 1].map((sx, i) => (
        <mesh key={`side-cross-${i}`} position={[sx * (totalLen / 2 - 0.04), lowerCrossY, 0]} castShadow>
          <boxGeometry args={[tubeSize * 0.6, tubeSize * 0.6, frameD - 0.08]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      ))}

      {/* Mid-level crossmembers */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`mid-cross-${i}`} position={[0, midCrossY, sz * (frameD / 2 - 0.04)]} castShadow>
          <boxGeometry args={[totalLen - 0.08, tubeSize * 0.5, tubeSize * 0.5]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
      ))}

      {/* Upper frame rails (belt support level) */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`upper-rail-${i}`} position={[0, upperRailY, sz * (frameD / 2 - 0.04)]} castShadow>
          <boxGeometry args={[totalLen - 0.08, tubeSize * 0.65, tubeSize * 0.65]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      ))}

      {/* Diagonal gussets at leg tops */}
      {legPositions.map(([gx, gz], i) => (
        <mesh key={`gusset-${i}`} position={[gx, beltH - 0.06, gz]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.06, 0.005, 0.03]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
      ))}

      {/* ═══ INFEED CONVEYOR SECTION ═══ */}
      <ConveyorSection
        position={[infeedX, beltH, 0]}
        beltWidth={beltWidth}
        beltLength={infeedLen}
        rollerCount={0}
        sideRailHeight={sideRailH}
      />
      <MotorGearbox
        position={[infeedX, beltH - 0.08, -frameD / 2 + 0.02]}
        rotation={[0, Math.PI / 2, 0]}
      />

      {/* ═══ PRECISION WEIGHING CONVEYOR — clean flat belt, no rollers ═══ */}
      <group position={[weighX, beltH, 0]}>
        {/* Weigh belt */}
        <mesh position={[0, 0.002, 0]} castShadow>
          <boxGeometry args={[weighLen, 0.01, beltWidth]} />
          <primitive object={matBeltRubber} attach="material" />
        </mesh>
        {/* Precision bed plate */}
        <mesh position={[0, -0.006, 0]} castShadow>
          <boxGeometry args={[weighLen, 0.004, beltWidth + 0.008]} />
          <primitive object={matAluminum} attach="material" />
        </mesh>
        {/* Tiny nose rollers at ends (radius 0.01 — not visible bars) */}
        <Roller position={[-weighLen / 2 + 0.008, -0.002, 0]} length={beltWidth + 0.015} radius={0.01} />
        <Roller position={[weighLen / 2 - 0.008, -0.002, 0]} length={beltWidth + 0.015} radius={0.01} />
        {/* Side rails (thinner, precision) */}
        {[-1, 1].map((sz, i) => (
          <mesh key={`wr-${i}`} position={[0, 0.02, sz * (beltWidth / 2 + 0.004)]} castShadow>
            <boxGeometry args={[weighLen, 0.025, 0.003]} />
            <primitive object={matAluminum} attach="material" />
          </mesh>
        ))}
      </group>

      {/* ═══ LOADCELL HOUSING / WEIGH MODULE ═══ */}
      <group position={[weighX, loadcellHousingY, 0]}>
        {/* Main loadcell housing */}
        <mesh castShadow>
          <boxGeometry args={[weighLen * 0.85, 0.04, beltWidth * 0.5]} />
          <primitive object={matAluminum} attach="material" />
        </mesh>
        {/* Protective cover */}
        <mesh position={[0, -0.025, 0]} castShadow>
          <boxGeometry args={[weighLen * 0.9, 0.015, beltWidth * 0.6]} />
          <meshStandardMaterial color="#1a1a2a" metalness={0.8} roughness={0.15} />
        </mesh>
        {/* Isolation mounts */}
        {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
          <mesh key={`iso-${i}`} position={[sx * weighLen * 0.35, -0.04, sz * beltWidth * 0.2]}>
            <cylinderGeometry args={[0.008, 0.008, 0.012, 8]} />
            <primitive object={matBlackPlastic} attach="material" />
          </mesh>
        ))}
      </group>
      {/* Support column — extends from loadcell down to lower crossmember */}
      {supportColHeight > 0.01 && (
        <group>
          <mesh position={[weighX, supportColCenterY, 0]} castShadow>
            <boxGeometry args={[0.06, supportColHeight, 0.06]} />
            <primitive object={matStainlessBrushed} attach="material" />
          </mesh>
          {/* Horizontal bracket connecting column base to lower crossmember */}
          <mesh position={[weighX, lowerCrossY, -(frameD / 2 - 0.04) / 2]} castShadow>
            <boxGeometry args={[0.06, tubeSize * 0.5, frameD / 2 - 0.04]} />
            <primitive object={matStainlessSatin} attach="material" />
          </mesh>
        </group>
      )}

      {/* ═══ OUTFEED CONVEYOR SECTION ═══ */}
      <ConveyorSection
        position={[outfeedX, beltH, 0]}
        beltWidth={beltWidth}
        beltLength={outfeedLen}
        rollerCount={0}
        sideRailHeight={sideRailH}
      />
      <MotorGearbox
        position={[outfeedX, beltH - 0.08, frameD / 2 - 0.02]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* ═══ PHOTOEYE SENSORS with L-brackets ═══ */}
      {/* Infeed sensor pair — mounted on side rails */}
      {[-1, 1].map((sz, i) => (
        <group key={`infeed-sensor-${i}`}>
          <PhotoeyeSensor
            position={[infeedX - infeedLen * 0.3, beltH + sideRailH + 0.015, sz * (beltWidth / 2 + 0.01)]}
            rotation={[0, sz < 0 ? 0 : Math.PI, 0]}
          />
          {/* L-bracket connecting sensor to side rail */}
          <mesh position={[infeedX - infeedLen * 0.3, beltH + sideRailH * 0.5 + 0.006, sz * (beltWidth / 2 + 0.008)]} castShadow>
            <boxGeometry args={[0.015, sideRailH + 0.01, 0.003]} />
            <primitive object={matStainlessSatin} attach="material" />
          </mesh>
        </group>
      ))}
      {/* Outfeed sensor pair */}
      {[-1, 1].map((sz, i) => (
        <group key={`outfeed-sensor-${i}`}>
          <PhotoeyeSensor
            position={[outfeedX + outfeedLen * 0.3, beltH + sideRailH + 0.015, sz * (beltWidth / 2 + 0.01)]}
            rotation={[0, sz < 0 ? 0 : Math.PI, 0]}
          />
          <mesh position={[outfeedX + outfeedLen * 0.3, beltH + sideRailH * 0.5 + 0.006, sz * (beltWidth / 2 + 0.008)]} castShadow>
            <boxGeometry args={[0.015, sideRailH + 0.01, 0.003]} />
            <primitive object={matStainlessSatin} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ═══ HMI TOUCHSCREEN — arm base at rear-right leg ═══ */}
      <HMIPanel
        position={[totalLen / 2 - 0.04, beltH + 0.15, frameD / 2 - 0.04]}
        rotation={[0, -0.3, 0]}
      />

      {/* ═══ TOWER LIGHT — post mounted on upper frame rail ═══ */}
      <group position={[totalLen / 2 - 0.04, upperRailY, frameD / 2 - 0.04]}>
        {/* Vertical post from upper rail */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      </group>
      <TowerLight position={[totalLen / 2 - 0.04, upperRailY + 0.12, frameD / 2 - 0.04]} />

      {/* ═══ E-STOP BUTTON — mounted on upper frame rail face ═══ */}
      <EStopButton position={[totalLen / 2 - 0.04, upperRailY + 0.015, frameD / 2 - 0.015]} />

      {/* ═══ JUNCTION BOX — mounted ON rear-left leg ═══ */}
      <JunctionBox position={[-totalLen / 2 + 0.04, midCrossY, -frameD / 2 + 0.04]} />

      {/* ═══ ACCESS PANELS — positioned between lower and upper frame ═══ */}
      <AccessPanel
        position={[0, (lowerCrossY + upperRailY) / 2, frameD / 2]}
        size={[totalLen * 0.5, upperRailY - lowerCrossY - 0.04]}
        rotation={[0, 0, 0]}
      />
      <AccessPanel
        position={[0, (lowerCrossY + upperRailY) / 2, -frameD / 2]}
        size={[totalLen * 0.5, upperRailY - lowerCrossY - 0.04]}
        rotation={[0, Math.PI, 0]}
      />

      {/* ═══ POLYCARBONATE GUARDS ═══ */}
      <GuardPanel
        position={[0, beltH + 0.08, frameD / 2 + 0.008]}
        size={[totalLen * 0.85, 0.12, 0.003]}
      />
      <GuardPanel
        position={[0, beltH + 0.08, -frameD / 2 - 0.008]}
        size={[totalLen * 0.85, 0.12, 0.003]}
      />

      {/* ═══ CABLE CONDUIT — runs along rear lower crossmember ═══ */}
      {/* Vertical run along rear-left leg */}
      <mesh position={[-totalLen / 2 + 0.04, (lowerCrossY + midCrossY) / 2, -frameD / 2 + 0.06]} castShadow>
        <boxGeometry args={[0.025, midCrossY - lowerCrossY, 0.025]} />
        <primitive object={matCable} attach="material" />
      </mesh>
      {/* Horizontal cable tray along lower rear crossmember */}
      <mesh position={[0, lowerCrossY + 0.02, -frameD / 2 + 0.06]} castShadow>
        <boxGeometry args={[totalLen * 0.7, 0.02, 0.03]} />
        <primitive object={matCable} attach="material" />
      </mesh>

      {/* ═══ FRAME BOLTS ═══ */}
      {legPositions.map(([bx, bz], i) => (
        <group key={`bolt-cluster-${i}`}>
          <BoltHead position={[bx - 0.015, upperRailY - 0.015, bz > 0 ? bz + 0.021 : bz - 0.021]} rotation={[Math.PI / 2, 0, 0]} />
          <BoltHead position={[bx + 0.015, upperRailY - 0.015, bz > 0 ? bz + 0.021 : bz - 0.021]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
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
// LABELER — Automatic Label Applicator Station
// Inspired by Herma / Domino / Weber label applicators
// ═══════════════════════════════════════════════════════════════
export const LabelerModel: React.FC<ModelProps> = ({ params }) => {
  const w = (params?.width || 600) / 1000;
  const eqH = (params?.height || 1200) / 1000;
  const beltH = params?.infeedHeight ? (params.infeedHeight / 1000) : (eqH * 0.55);
  const frameD = 0.42;
  const tubeSize = 0.04;
  const beltWidth = frameD * 0.6;
  const beltLength = w * 0.85;
  const sideRailH = 0.03;

  // Derived frame levels
  const lowerCrossY = beltH * 0.2;
  const midCrossY = beltH * 0.55;
  const upperRailY = beltH - 0.025;

  // Leg positions
  const legPositions: [number, number][] = [
    [-w / 2 + 0.04, -frameD / 2 + 0.04],
    [-w / 2 + 0.04, frameD / 2 - 0.04],
    [w / 2 - 0.04, -frameD / 2 + 0.04],
    [w / 2 - 0.04, frameD / 2 - 0.04],
  ];

  // Label tower — rear-mounted, base sits ON the rear upper frame rail
  const towerZ = -frameD / 2 - 0.06;
  const towerBaseY = upperRailY; // sits on frame rail
  const towerTopY = eqH * 0.92;
  const towerHeight = towerTopY - towerBaseY;

  // Reel positions
  const unwindY = towerTopY - 0.08;
  const rewindY = towerBaseY + 0.12;
  const unwindR = 0.1;
  const rewindR = 0.04;

  return (
    <group>
      {/* ═══ FRAME — Tubular stainless steel ═══ */}
      {/* Four vertical legs (ground to beltH) */}
      {legPositions.map(([lx, lz], i) => (
        <group key={`leg-${i}`}>
          <mesh position={[lx, beltH / 2, lz]} castShadow>
            <boxGeometry args={[tubeSize, beltH, tubeSize]} />
            <primitive object={matStainlessBrushed} attach="material" />
          </mesh>
          <LevelingFoot position={[lx, 0, lz]} />
        </group>
      ))}

      {/* Lower crossmembers */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`lc-${i}`} position={[0, lowerCrossY, sz * (frameD / 2 - 0.04)]} castShadow>
          <boxGeometry args={[w - 0.08, tubeSize * 0.6, tubeSize * 0.6]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      ))}
      {[-1, 1].map((sx, i) => (
        <mesh key={`ls-${i}`} position={[sx * (w / 2 - 0.04), lowerCrossY, 0]} castShadow>
          <boxGeometry args={[tubeSize * 0.6, tubeSize * 0.6, frameD - 0.08]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      ))}

      {/* Mid-level crossmembers */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`mc-${i}`} position={[0, midCrossY, sz * (frameD / 2 - 0.04)]} castShadow>
          <boxGeometry args={[w - 0.08, tubeSize * 0.5, tubeSize * 0.5]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
      ))}

      {/* Upper frame rails at belt level */}
      {[-1, 1].map((sz, i) => (
        <mesh key={`ur-${i}`} position={[0, upperRailY, sz * (frameD / 2 - 0.04)]} castShadow>
          <boxGeometry args={[w - 0.06, tubeSize * 0.65, tubeSize * 0.65]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      ))}

      {/* Gussets */}
      {legPositions.map(([gx, gz], i) => (
        <mesh key={`gus-${i}`} position={[gx, beltH - 0.06, gz]} rotation={[0, 0, Math.PI / 4]} castShadow>
          <boxGeometry args={[0.05, 0.004, 0.025]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
      ))}

      {/* ═══ CONVEYOR SECTION ═══ */}
      <ConveyorSection
        position={[0, beltH, 0]}
        beltWidth={beltWidth}
        beltLength={beltLength}
        rollerCount={4}
        sideRailHeight={sideRailH}
      />

      {/* Conveyor motor (side-mounted) */}
      <MotorGearbox
        position={[w / 2 - 0.12, beltH - 0.07, frameD / 2 - 0.01]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* ═══ LABEL APPLICATOR TOWER ═══ */}
      {/* Main vertical post */}
      <mesh position={[0, towerBaseY + towerHeight / 2, towerZ]} castShadow>
        <boxGeometry args={[0.06, towerHeight, 0.06]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>

      {/* Tower base mounting plate — sits ON the rear upper frame rail */}
      <mesh position={[0, upperRailY + 0.008, -frameD / 2 + 0.04]} castShadow>
        <boxGeometry args={[0.12, 0.015, 0.1]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      {/* Mounting bolts on base plate */}
      {[[-0.04, -0.03], [-0.04, 0.03], [0.04, -0.03], [0.04, 0.03]].map(([bx, bz], i) => (
        <BoltHead key={`tb-${i}`} position={[bx, upperRailY + 0.016, -frameD / 2 + 0.04 + bz]} />
      ))}

      {/* Adjustable bracket / slide assembly */}
      <mesh position={[0, beltH + 0.35, towerZ + 0.01]} castShadow>
        <boxGeometry args={[0.08, 0.18, 0.04]} />
        <primitive object={matStainlessSatin} attach="material" />
      </mesh>
      {/* Slide rails */}
      <mesh position={[0.045, beltH + 0.35, towerZ + 0.01]} castShadow>
        <boxGeometry args={[0.012, 0.15, 0.035]} />
        <primitive object={matAluminum} attach="material" />
      </mesh>
      <mesh position={[-0.045, beltH + 0.35, towerZ + 0.01]} castShadow>
        <boxGeometry args={[0.012, 0.15, 0.035]} />
        <primitive object={matAluminum} attach="material" />
      </mesh>

      {/* Hand knobs */}
      {[0.12, 0.2].map((dy, i) => (
        <group key={`knob-${i}`} position={[0.055, beltH + dy + 0.2, towerZ + 0.01]}>
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.012, 0.012, 0.025, 12]} />
            <primitive object={matBlackPlastic} attach="material" />
          </mesh>
          <mesh position={[0.015, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.016, 0.016, 0.006, 5]} />
            <primitive object={matBlackPlastic} attach="material" />
          </mesh>
        </group>
      ))}

      {/* ═══ HORIZONTAL ARM to applicator head ═══ */}
      <mesh position={[0, beltH + 0.32, towerZ / 2]} castShadow>
        <boxGeometry args={[0.045, 0.045, Math.abs(towerZ) + 0.06]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>

      {/* ═══ LABEL HEAD CASING ═══ */}
      <mesh position={[0, beltH + 0.32, -0.04]} castShadow>
        <boxGeometry args={[0.16, 0.12, 0.14]} />
        <primitive object={matStainlessBrushed} attach="material" />
      </mesh>
      <mesh position={[0, beltH + 0.255, -0.04]} castShadow>
        <boxGeometry args={[0.12, 0.008, 0.1]} />
        <primitive object={matAluminum} attach="material" />
      </mesh>

      {/* ═══ PEEL PLATE ═══ */}
      <mesh position={[0, beltH + 0.25, -0.1]} castShadow>
        <boxGeometry args={[0.08, 0.003, 0.02]} />
        <primitive object={matAluminum} attach="material" />
      </mesh>
      <mesh position={[0, beltH + 0.248, -0.088]} rotation={[0.3, 0, 0]}>
        <boxGeometry args={[0.08, 0.002, 0.01]} />
        <primitive object={matAluminum} attach="material" />
      </mesh>

      {/* ═══ LABEL UNWIND REEL ═══ */}
      <group position={[0, unwindY, towerZ]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[unwindR + 0.01, unwindR + 0.01, 0.004, 24]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.055]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[unwindR + 0.01, unwindR + 0.01, 0.004, 24]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.028]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[unwindR, unwindR, 0.05, 24]} />
          <primitive object={matLabelRoll} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.055, 12]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.01, 0.01, 0.08, 8]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      </group>

      {/* ═══ REWIND REEL ═══ */}
      <group position={[0, rewindY, towerZ]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[rewindR + 0.005, rewindR + 0.005, 0.004, 16]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[rewindR + 0.005, rewindR + 0.005, 0.004, 16]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.023]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[rewindR, rewindR, 0.04, 16]} />
          <primitive object={matLabelRoll} attach="material" />
        </mesh>
        <mesh position={[0, 0, 0.023]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.05, 8]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
      </group>

      {/* ═══ TENSION / GUIDE ROLLERS ═══ */}
      <Roller position={[0, unwindY - unwindR - 0.02, towerZ + 0.06]} length={0.05} radius={0.012} />
      <Roller position={[0, (unwindY + beltH + 0.32) / 2, towerZ + 0.06]} length={0.05} radius={0.012} />
      <Roller position={[0, beltH + 0.38, towerZ + 0.08]} length={0.05} radius={0.01} />
      <Roller position={[0, beltH + 0.2, towerZ + 0.06]} length={0.05} radius={0.012} />
      <Roller position={[0, rewindY + rewindR + 0.025, towerZ + 0.06]} length={0.05} radius={0.01} />

      {/* ═══ LABEL WEB PATH ═══ */}
      <mesh position={[0, unwindY - unwindR / 2 - 0.01, towerZ + 0.04]}>
        <boxGeometry args={[0.045, 0.001, 0.03]} />
        <meshStandardMaterial color="#f5f5f0" metalness={0} roughness={0.9} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, (unwindY + beltH + 0.35) / 2, towerZ + 0.065]}>
        <boxGeometry args={[0.045, unwindY - beltH - 0.15, 0.001]} />
        <meshStandardMaterial color="#f5f5f0" metalness={0} roughness={0.9} transparent opacity={0.5} />
      </mesh>
      <mesh position={[0, beltH + 0.35, (towerZ + 0.06 + -0.04) / 2]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.045, 0.001, Math.abs(towerZ + 0.06 - (-0.04))]} />
        <meshStandardMaterial color="#f5f5f0" metalness={0} roughness={0.9} transparent opacity={0.5} />
      </mesh>

      {/* ═══ SENSORS — with L-brackets to side rails ═══ */}
      {/* Product trigger sensor pair */}
      {[-1, 1].map((sz, i) => (
        <group key={`trigger-sensor-${i}`}>
          <PhotoeyeSensor
            position={[-beltLength * 0.25, beltH + sideRailH + 0.015, sz * (beltWidth / 2 + 0.01)]}
            rotation={[0, sz < 0 ? 0 : Math.PI, 0]}
          />
          {/* L-bracket */}
          <mesh position={[-beltLength * 0.25, beltH + sideRailH * 0.5 + 0.006, sz * (beltWidth / 2 + 0.008)]} castShadow>
            <boxGeometry args={[0.015, sideRailH + 0.01, 0.003]} />
            <primitive object={matStainlessSatin} attach="material" />
          </mesh>
        </group>
      ))}

      {/* Label detection sensor (on label head) */}
      <PhotoeyeSensor
        position={[0.06, beltH + 0.28, -0.08]}
        rotation={[0, -Math.PI / 2, 0]}
      />

      {/* ═══ HMI PANEL — arm base at front-right leg ═══ */}
      <HMIPanel
        position={[w / 2 - 0.04, beltH + 0.15, frameD / 2 - 0.04]}
        rotation={[0, -Math.PI / 4, 0]}
      />

      {/* ═══ TOWER LIGHT — short post from upper frame rail ═══ */}
      <group position={[-w / 2 + 0.04, upperRailY, frameD / 2 - 0.04]}>
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.01, 0.01, 0.12, 8]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
      </group>
      <TowerLight position={[-w / 2 + 0.04, upperRailY + 0.12, frameD / 2 - 0.04]} />

      {/* ═══ E-STOP — on upper frame rail ═══ */}
      <EStopButton position={[w / 2 - 0.04, upperRailY + 0.015, frameD / 2 - 0.015]} />

      {/* ═══ CONTROL ENCLOSURE — mounted to right-side mid crossmember ═══ */}
      <group position={[w / 2 - 0.04, midCrossY, -frameD * 0.15]}>
        {/* Mounting bracket to frame leg */}
        <mesh position={[0.04, 0, (frameD * 0.15 - frameD / 2 + 0.04) / 2]} castShadow>
          <boxGeometry args={[0.006, 0.08, 0.06]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
        {/* Enclosure body */}
        <mesh castShadow>
          <boxGeometry args={[0.08, 0.2, 0.18]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
        {/* Door */}
        <mesh position={[0.041, 0, 0]}>
          <boxGeometry args={[0.002, 0.18, 0.16]} />
          <primitive object={matStainlessSatin} attach="material" />
        </mesh>
        {/* Handle */}
        <mesh position={[0.045, 0, 0.04]} castShadow>
          <boxGeometry args={[0.006, 0.025, 0.006]} />
          <primitive object={matStainlessBrushed} attach="material" />
        </mesh>
        {/* Cable glands bottom */}
        {[-0.04, -0.02, 0, 0.02, 0.04].map((dz, i) => (
          <mesh key={i} position={[0, -0.108, dz]}>
            <cylinderGeometry args={[0.005, 0.005, 0.014, 6]} />
            <primitive object={matBlackPlastic} attach="material" />
          </mesh>
        ))}
        {/* Ventilation slots */}
        {[-0.06, -0.03, 0, 0.03, 0.06].map((dz, i) => (
          <mesh key={`vent-${i}`} position={[-0.041, 0.06, dz]}>
            <boxGeometry args={[0.001, 0.04, 0.015]} />
            <meshStandardMaterial color="#222" metalness={0.3} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* ═══ CABLE ROUTING / CONDUIT — frame-mounted ═══ */}
      {/* Vertical conduit on tower post */}
      <mesh position={[0.04, (towerBaseY + towerTopY) / 2, towerZ]} castShadow>
        <boxGeometry args={[0.02, towerHeight * 0.8, 0.02]} />
        <primitive object={matCable} attach="material" />
      </mesh>
      {/* Horizontal run along rear lower crossmember to control enclosure */}
      <mesh position={[w / 4, lowerCrossY + 0.02, -frameD / 2 + 0.06]} castShadow>
        <boxGeometry args={[w / 2, 0.02, 0.02]} />
        <primitive object={matCable} attach="material" />
      </mesh>
      {/* Vertical drop from tower base to rear lower crossmember */}
      <mesh position={[0.04, (towerBaseY + lowerCrossY) / 2, -frameD / 2 + 0.06]} castShadow>
        <boxGeometry args={[0.02, towerBaseY - lowerCrossY, 0.02]} />
        <primitive object={matCable} attach="material" />
      </mesh>

      {/* ═══ ACCESS PANELS ═══ */}
      <AccessPanel
        position={[0, (lowerCrossY + upperRailY) / 2, frameD / 2]}
        size={[w * 0.55, upperRailY - lowerCrossY - 0.04]}
      />

      {/* ═══ POLYCARBONATE GUARDS ═══ */}
      <GuardPanel
        position={[0, beltH + 0.07, frameD / 2 + 0.008]}
        size={[beltLength * 0.9, 0.1, 0.003]}
      />

      {/* ═══ JUNCTION BOX — mounted ON rear-left leg ═══ */}
      <JunctionBox
        position={[-w / 2 + 0.04, midCrossY, -frameD / 2 + 0.04]}
        size={[0.1, 0.08, 0.05]}
      />

      {/* ═══ DECORATIVE BOLTS ═══ */}
      {legPositions.map(([bx, bz], i) => (
        <group key={`bolt-g-${i}`}>
          <BoltHead position={[bx - 0.012, upperRailY, bz > 0 ? bz + 0.021 : bz - 0.021]} rotation={[Math.PI / 2, 0, 0]} />
          <BoltHead position={[bx + 0.012, upperRailY, bz > 0 ? bz + 0.021 : bz - 0.021]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
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
