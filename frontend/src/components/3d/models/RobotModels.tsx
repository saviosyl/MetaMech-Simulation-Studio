/**
 * Robot 3D Models — Premium Industrial Automation Equipment
 *
 * Redesigned for real industrial machine appearance:
 * - Cartesian gantry: box-section beams, linear carriages, cable track
 * - Collaborative robot: segmented housings, covered joints, modern safe-machine
 * - 5-axis robot: strong base, industrial arm links, flanged joints
 * - 6-axis robot: heavy base, reinforced arms, compact wrist cluster
 *
 * Design rules:
 * - No sphere joints (use housings/cylinders)
 * - No capsule arms (use box-section or shaped links)
 * - Flanged interfaces at every joint transition
 * - Realistic mass distribution (heavy base, tapering upward)
 * - Industrial paint + dark mechanical accent pattern
 */
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { simulationEngine } from '../../../simulation/SimulationEngine';
import { useEditorStore } from '../../../store/editorStore';

// ─── Shared Industrial Materials ───────────────────────────────
// Body paint: warm industrial orange (KUKA-style)
const matBodyOrange = new THREE.MeshStandardMaterial({
  color: 0xd45a10, metalness: 0.25, roughness: 0.55,
});
// Cobot body: light grey with slight blue undertone
const matCobotBody = new THREE.MeshStandardMaterial({
  color: 0xd8dce3, metalness: 0.2, roughness: 0.5,
});
// Cobot accent: muted teal-green for safe-machine look
const matCobotAccent = new THREE.MeshStandardMaterial({
  color: 0x2d8a6e, metalness: 0.3, roughness: 0.45,
});
// Dark mechanical: joint housings, gearbox covers, motor casings
const matMechanical = new THREE.MeshStandardMaterial({
  color: 0x1e1e1e, metalness: 0.85, roughness: 0.2,
});
// Aluminum: machined interfaces, flanges, structural members
const matAluminum = new THREE.MeshStandardMaterial({
  color: 0xa8b0b8, metalness: 0.75, roughness: 0.28,
});
// Frame steel: gantry beams, base plates, pedestals
const matSteel = new THREE.MeshStandardMaterial({
  color: 0x5a5f65, metalness: 0.8, roughness: 0.25,
});
// Base plate: heavy dark foundation
const matBasePlate = new THREE.MeshStandardMaterial({
  color: 0x333333, metalness: 0.85, roughness: 0.2,
});
// Tool/flange: machined steel look
const matFlange = new THREE.MeshStandardMaterial({
  color: 0x4a4a4a, metalness: 0.9, roughness: 0.15,
});
// Cable cover: dark rubber/plastic
const matCableCover = new THREE.MeshStandardMaterial({
  color: 0x222222, metalness: 0.1, roughness: 0.8,
});
// Gantry beam: RAL 7035 light grey industrial
const matGantryBeam = new THREE.MeshStandardMaterial({
  color: 0xc4cad0, metalness: 0.6, roughness: 0.35,
});
// Linear rail: bright machined steel
const matRail = new THREE.MeshStandardMaterial({
  color: 0xb8bec5, metalness: 0.9, roughness: 0.12,
});
// Warning stripe
const matWarning = new THREE.MeshStandardMaterial({
  color: 0xe8b710, metalness: 0.15, roughness: 0.6,
});
// Safety zone
const matSafetyZone = new THREE.MeshBasicMaterial({
  color: 0xf0c030, transparent: true, opacity: 0.06, side: THREE.DoubleSide,
});

interface RobotProps {
  parameters: Record<string, any>;
  isSelected: boolean;
  nodeId?: string;
}

/** Get simulation-driven joint angles from robot phase/progress */
function useSimulationPose(nodeId?: string) {
  const isPlaying = useEditorStore(s => s.isPlaying);
  const isPaused = useEditorStore(s => s.isPaused);
  const simActive = isPlaying || isPaused;

  if (!simActive || !nodeId) return null;

  const robotStates = simulationEngine.getRobotStates();
  const state = robotStates.get(nodeId);
  if (!state) return null;

  return state;
}

// ─── Shared Sub-Components ─────────────────────────────────────

/** Industrial flanged base plate with bolt pattern */
function BaseFlange({ radius, height, em }: { radius: number; height: number; em: THREE.Color }) {
  return (
    <group>
      {/* Main plate */}
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[radius, radius * 1.05, height, 32]} />
        <meshStandardMaterial {...matBasePlate} emissive={em} />
      </mesh>
      {/* Bolt ring */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const br = radius * 0.85;
        return (
          <mesh key={`bolt-${i}`} position={[Math.cos(angle) * br, height + 0.003, Math.sin(angle) * br]}>
            <cylinderGeometry args={[0.008, 0.008, 0.006, 6]} />
            <meshStandardMaterial {...matMechanical} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Industrial pedestal — square steel column with flanged top/bottom */
function Pedestal({ height, width, em }: { height: number; width: number; em: THREE.Color }) {
  if (height <= 0) return null;
  const wallT = 0.015;
  return (
    <group>
      {/* Bottom flange plate */}
      <mesh position={[0, 0.01, 0]} castShadow>
        <boxGeometry args={[width + 0.06, 0.02, width + 0.06]} />
        <meshStandardMaterial {...matBasePlate} emissive={em} />
      </mesh>
      {/* Bottom flange bolts */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`pb-${i}`} position={[sx * (width / 2 + 0.02), 0.024, sz * (width / 2 + 0.02)]}>
          <cylinderGeometry args={[0.006, 0.006, 0.006, 6]} />
          <meshStandardMaterial {...matMechanical} />
        </mesh>
      ))}
      {/* Column — hollow look with 4 wall panels */}
      {[
        { pos: [0, height / 2 + 0.02, width / 2] as [number, number, number], size: [width, height, wallT] as [number, number, number] },
        { pos: [0, height / 2 + 0.02, -width / 2] as [number, number, number], size: [width, height, wallT] as [number, number, number] },
        { pos: [width / 2, height / 2 + 0.02, 0] as [number, number, number], size: [wallT, height, width] as [number, number, number] },
        { pos: [-width / 2, height / 2 + 0.02, 0] as [number, number, number], size: [wallT, height, width] as [number, number, number] },
      ].map((wall, i) => (
        <mesh key={`pw-${i}`} position={wall.pos} castShadow>
          <boxGeometry args={wall.size} />
          <meshStandardMaterial {...matSteel} emissive={em} />
        </mesh>
      ))}
      {/* Top flange */}
      <mesh position={[0, height + 0.02 + 0.01, 0]} castShadow>
        <boxGeometry args={[width + 0.04, 0.02, width + 0.04]} />
        <meshStandardMaterial {...matSteel} emissive={em} />
      </mesh>
      {/* Corner gussets */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`gus-${i}`} position={[sx * width / 2, 0.07, sz * width / 2]} castShadow>
          <boxGeometry args={[0.015, 0.08, 0.015]} />
          <meshStandardMaterial {...matSteel} emissive={em} />
        </mesh>
      ))}
    </group>
  );
}

/** Tool flange — ISO standard machined interface */
function ToolFlange({ y, radius, em }: { y: number; radius: number; em: THREE.Color }) {
  return (
    <group position={[0, y, 0]}>
      {/* Flange disk */}
      <mesh castShadow>
        <cylinderGeometry args={[radius, radius, 0.012, 24]} />
        <meshStandardMaterial {...matFlange} emissive={em} />
      </mesh>
      {/* Centering ring */}
      <mesh position={[0, 0.008, 0]}>
        <cylinderGeometry args={[radius * 0.55, radius * 0.55, 0.004, 16]} />
        <meshStandardMaterial {...matAluminum} emissive={em} />
      </mesh>
      {/* Bolt holes */}
      {Array.from({ length: 6 }).map((_, i) => {
        const a = (i / 6) * Math.PI * 2;
        const r = radius * 0.75;
        return (
          <mesh key={i} position={[Math.cos(a) * r, 0.009, Math.sin(a) * r]}>
            <cylinderGeometry args={[0.004, 0.004, 0.005, 6]} />
            <meshStandardMaterial {...matMechanical} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Joint housing — industrial gearbox/actuator look */
function JointHousing({
  radius, width, em, axis = 'z'
}: {
  radius: number; width: number; em: THREE.Color; axis?: 'x' | 'y' | 'z';
}) {
  const rot: [number, number, number] = axis === 'x' ? [Math.PI / 2, 0, 0] :
    axis === 'z' ? [0, 0, Math.PI / 2] : [0, 0, 0];
  return (
    <group>
      {/* Main cylindrical housing */}
      <mesh rotation={rot} castShadow>
        <cylinderGeometry args={[radius, radius, width, 24]} />
        <meshStandardMaterial {...matMechanical} emissive={em} />
      </mesh>
      {/* Flange rings on each side */}
      {[-1, 1].map(s => (
        <mesh key={s} rotation={rot} position={
          axis === 'z' ? [s * (width / 2 + 0.003), 0, 0] :
          axis === 'x' ? [0, 0, s * (width / 2 + 0.003)] :
          [0, s * (width / 2 + 0.003), 0]
        } castShadow>
          <cylinderGeometry args={[radius * 1.12, radius * 1.12, 0.006, 24]} />
          <meshStandardMaterial {...matMechanical} emissive={em} />
        </mesh>
      ))}
    </group>
  );
}

/** Arm link — industrial box-section with edge chamfers simulated by inset panels */
function ArmLink({
  width, depth, length, bodyMat, em, cableChannel = false
}: {
  width: number; depth: number; length: number;
  bodyMat: THREE.MeshStandardMaterial; em: THREE.Color;
  cableChannel?: boolean;
}) {
  return (
    <group>
      {/* Main body */}
      <mesh position={[0, length / 2, 0]} castShadow>
        <boxGeometry args={[width, length, depth]} />
        <meshStandardMaterial {...bodyMat} emissive={em} />
      </mesh>
      {/* Edge trim strips — subtle dark reveal lines */}
      {[
        [width / 2 + 0.001, length / 2, 0, 0.003, length * 0.9, depth * 0.6],
        [-width / 2 - 0.001, length / 2, 0, 0.003, length * 0.9, depth * 0.6],
      ].map(([x, y, z, w, h, d], i) => (
        <mesh key={`trim-${i}`} position={[x, y, z]}>
          <boxGeometry args={[w, h, d]} />
          <meshStandardMaterial color={0x111111} metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* Cable channel on back */}
      {cableChannel && (
        <mesh position={[0, length / 2, -depth / 2 - 0.006]} castShadow>
          <boxGeometry args={[width * 0.35, length * 0.85, 0.012]} />
          <meshStandardMaterial {...matCableCover} />
        </mesh>
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════════════════════
// 1. CARTESIAN (GANTRY) ROBOT
// ═══════════════════════════════════════════════════════════════

export const CartesianRobotModel: React.FC<RobotProps> = ({ parameters, isSelected, nodeId }) => {
  const carriageRef = useRef<THREE.Group>(null);

  const rX = (parameters.reachX || 2000) / 1000;
  const rY = (parameters.reachY || 1500) / 1000;
  const rZ = (parameters.reachZ || 1000) / 1000;
  const bH = (parameters.baseHeight || 2500) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 0) / 1000 : 0;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  const colW = 0.12;
  const beamH = 0.14;
  const beamD = 0.10;
  const carriageW = 0.18;

  const simState = useSimulationPose(nodeId);

  useFrame(({ clock }) => {
    if (carriageRef.current) {
      if (simState) {
        const p = simState.phaseProgress;
        const ease = p * p * (3 - 2 * p);
        let targetX = 0;
        switch (simState.phase) {
          case 'idle': targetX = 0; break;
          case 'approach-pick': case 'pick': case 'retract-pick':
            targetX = -rX * 0.35; break;
          case 'move-to-place':
            targetX = -rX * 0.35 + rX * 0.7 * ease; break;
          case 'approach-place': case 'place': case 'retract-place':
            targetX = rX * 0.35; break;
          case 'return':
            targetX = rX * 0.35 * (1 - ease); break;
        }
        carriageRef.current.position.x += (targetX - carriageRef.current.position.x) * 0.12;
      } else {
        const t = (Math.sin(clock.getElapsedTime() * 0.6) + 1) / 2;
        carriageRef.current.position.x = -rX / 2 + t * rX * 0.85;
      }
    }
  });

  return (
    <group>
      {/* Pedestal if enabled */}
      {pedH > 0 && <Pedestal height={pedH} width={0.35} em={em} />}

      {/* ── Base frame: heavy welded steel frame ── */}
      <group position={[0, pedH, 0]}>
        {/* Bottom base plates at each corner */}
        {[[-rX / 2, -rY / 2], [-rX / 2, rY / 2], [rX / 2, -rY / 2], [rX / 2, rY / 2]].map(([cx, cz], i) => (
          <mesh key={`fp-${i}`} position={[cx, 0.01, cz]} castShadow>
            <boxGeometry args={[colW + 0.08, 0.02, colW + 0.08]} />
            <meshStandardMaterial {...matBasePlate} emissive={em} />
          </mesh>
        ))}

        {/* Base cross members (X direction) */}
        {[-rY / 2, rY / 2].map((z, i) => (
          <mesh key={`bcx-${i}`} position={[0, 0.04, z]} castShadow>
            <boxGeometry args={[rX, 0.06, colW * 0.7]} />
            <meshStandardMaterial {...matSteel} emissive={em} />
          </mesh>
        ))}
        {/* Base cross members (Z direction) */}
        {[-rX / 2, rX / 2].map((x, i) => (
          <mesh key={`bcz-${i}`} position={[x, 0.04, 0]} castShadow>
            <boxGeometry args={[colW * 0.7, 0.06, rY]} />
            <meshStandardMaterial {...matSteel} emissive={em} />
          </mesh>
        ))}

        {/* Four gantry columns — box-section with gussets */}
        {[[-rX / 2, -rY / 2], [-rX / 2, rY / 2], [rX / 2, -rY / 2], [rX / 2, rY / 2]].map(([cx, cz], i) => (
          <group key={`col-${i}`} position={[cx, 0, cz]}>
            {/* Column body */}
            <mesh position={[0, bH / 2 + 0.07, 0]} castShadow>
              <boxGeometry args={[colW, bH, colW]} />
              <meshStandardMaterial {...matGantryBeam} emissive={em} />
            </mesh>
            {/* Column base gussets */}
            {[[-1, 0], [1, 0], [0, -1], [0, 1]].map(([dx, dz], gi) => (
              <mesh key={gi} position={[dx * colW * 0.5, 0.12, dz * colW * 0.5]} castShadow>
                <boxGeometry args={[dx !== 0 ? 0.01 : colW * 0.6, 0.12, dz !== 0 ? 0.01 : colW * 0.6]} />
                <meshStandardMaterial {...matSteel} emissive={em} />
              </mesh>
            ))}
            {/* Column top plate */}
            <mesh position={[0, bH + 0.07 + 0.01, 0]} castShadow>
              <boxGeometry args={[colW + 0.02, 0.02, colW + 0.02]} />
              <meshStandardMaterial {...matSteel} emissive={em} />
            </mesh>
          </group>
        ))}

        {/* ── X-axis beams (two parallel, along X) ── */}
        {[-rY / 2, rY / 2].map((z, i) => (
          <group key={`xbeam-${i}`} position={[0, bH + 0.07, z]}>
            {/* Main beam — box section */}
            <mesh position={[0, beamH / 2 + 0.02, 0]} castShadow>
              <boxGeometry args={[rX + colW, beamH, beamD]} />
              <meshStandardMaterial {...matGantryBeam} emissive={em} />
            </mesh>
            {/* Linear rail on top */}
            <mesh position={[0, beamH + 0.025, 0]}>
              <boxGeometry args={[rX + colW - 0.04, 0.012, 0.025]} />
              <meshStandardMaterial {...matRail} emissive={em} />
            </mesh>
            {/* Side stiffener rib */}
            <mesh position={[0, beamH / 2 + 0.02, beamD / 2 + 0.003]}>
              <boxGeometry args={[rX + colW - 0.1, beamH * 0.3, 0.005]} />
              <meshStandardMaterial {...matSteel} emissive={em} />
            </mesh>
          </group>
        ))}

        {/* Warning tape strips on beam ends */}
        {[-rX / 2, rX / 2].map((x, xi) => [-rY / 2, rY / 2].map((z, zi) => (
          <mesh key={`warn-${xi}-${zi}`} position={[x, bH + beamH + 0.07 + 0.015, z]}>
            <boxGeometry args={[0.08, 0.008, beamD + 0.01]} />
            <meshStandardMaterial {...matWarning} emissive={em} />
          </mesh>
        )))}

        {/* ── Y-axis cross beam (moving carriage assembly) ── */}
        <group ref={carriageRef}>
          {/* Y beam body */}
          <mesh position={[0, bH + beamH + 0.07 + beamH / 2 + 0.03, 0]} castShadow>
            <boxGeometry args={[beamD * 1.2, beamH * 0.9, rY + 0.05]} />
            <meshStandardMaterial color={0x3a6ea5} metalness={0.5} roughness={0.4} emissive={em} />
          </mesh>
          {/* Y beam rail blocks (riding on X rails) */}
          {[-rY / 2, rY / 2].map((z, i) => (
            <mesh key={`yblock-${i}`} position={[0, bH + beamH + 0.07 + 0.02, z]}>
              <boxGeometry args={[0.06, 0.035, 0.04]} />
              <meshStandardMaterial {...matMechanical} emissive={em} />
            </mesh>
          ))}
          {/* Y axis linear rail */}
          <mesh position={[0, bH + 2 * beamH + 0.1 + 0.008, 0]}>
            <boxGeometry args={[0.02, 0.01, rY - 0.1]} />
            <meshStandardMaterial {...matRail} emissive={em} />
          </mesh>

          {/* ── Z-axis vertical module ── */}
          <group position={[0, bH + beamH + 0.07, 0]}>
            {/* Z carriage housing */}
            <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[carriageW, carriageW * 0.8, carriageW]} />
              <meshStandardMaterial color={0x3a6ea5} metalness={0.5} roughness={0.4} emissive={em} />
            </mesh>
            {/* Z linear guide */}
            <mesh position={[0, -rZ / 2, 0]} castShadow>
              <boxGeometry args={[0.04, rZ, 0.04]} />
              <meshStandardMaterial {...matAluminum} emissive={em} />
            </mesh>
            {/* Z rail */}
            <mesh position={[0.025, -rZ / 2, 0]}>
              <boxGeometry args={[0.008, rZ - 0.05, 0.02]} />
              <meshStandardMaterial {...matRail} />
            </mesh>
            {/* Z motor housing (top) */}
            <mesh position={[0, carriageW * 0.35, 0]} castShadow>
              <boxGeometry args={[0.08, 0.06, 0.08]} />
              <meshStandardMaterial {...matMechanical} emissive={em} />
            </mesh>

            {/* ── Tool head assembly ── */}
            <group position={[0, -rZ, 0]}>
              {/* Tool adapter plate */}
              <mesh castShadow>
                <boxGeometry args={[0.14, 0.025, 0.14]} />
                <meshStandardMaterial {...matFlange} emissive={em} />
              </mesh>
              {/* Vacuum manifold */}
              <mesh position={[0, -0.03, 0]} castShadow>
                <boxGeometry args={[0.12, 0.03, 0.12]} />
                <meshStandardMaterial {...matMechanical} emissive={em} />
              </mesh>
              {/* Vacuum cups — 4 corner pattern */}
              {[[-0.04, -0.04], [-0.04, 0.04], [0.04, -0.04], [0.04, 0.04]].map(([vx, vz], i) => (
                <group key={`vc-${i}`} position={[vx, -0.06, vz]}>
                  {/* Cup stem */}
                  <mesh>
                    <cylinderGeometry args={[0.005, 0.005, 0.03, 8]} />
                    <meshStandardMaterial {...matAluminum} />
                  </mesh>
                  {/* Cup bellows */}
                  <mesh position={[0, -0.022, 0]}>
                    <cylinderGeometry args={[0.018, 0.012, 0.015, 12]} />
                    <meshStandardMaterial {...matCableCover} />
                  </mesh>
                </group>
              ))}
              {/* Airline connections */}
              <mesh position={[0.06, -0.015, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.006, 0.006, 0.03, 8]} />
                <meshStandardMaterial {...matAluminum} />
              </mesh>
            </group>
          </group>

          {/* Cable track suggestion */}
          <mesh position={[-beamD * 0.6, bH + beamH + 0.12, rY * 0.15]}>
            <boxGeometry args={[0.03, 0.02, rY * 0.4]} />
            <meshStandardMaterial {...matCableCover} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// 2. COLLABORATIVE ROBOT (COBOT)
// ═══════════════════════════════════════════════════════════════

export const CobotModel: React.FC<RobotProps> = ({ parameters, isSelected, nodeId }) => {
  const j1Ref = useRef<THREE.Group>(null);
  const j2Ref = useRef<THREE.Group>(null);

  const reach = (parameters.reach || 850) / 1000;
  const bH = (parameters.baseHeight || 200) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 800) / 1000 : 0;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  const seg1 = reach * 0.46;
  const seg2 = reach * 0.42;
  const linkW = 0.075;
  const linkD = 0.065;
  const jointR = 0.048;

  const simState = useSimulationPose(nodeId);

  useFrame(({ clock }) => {
    if (simState) {
      const p = simState.phaseProgress;
      const ease = p * p * (3 - 2 * p);
      let j1z = 0, j2z = -0.25;
      switch (simState.phase) {
        case 'idle': j1z = 0; j2z = -0.25; break;
        case 'approach-pick': j1z = 0.3 * ease; j2z = -0.25 - 0.4 * ease; break;
        case 'pick': j1z = 0.3; j2z = -0.65; break;
        case 'retract-pick': j1z = 0.3 - 0.15 * ease; j2z = -0.65 + 0.2 * ease; break;
        case 'move-to-place': j1z = 0.15 - 0.45 * ease; j2z = -0.45; break;
        case 'approach-place': j1z = -0.3; j2z = -0.45 - 0.2 * ease; break;
        case 'place': j1z = -0.3; j2z = -0.65; break;
        case 'retract-place': j1z = -0.3; j2z = -0.65 + 0.2 * ease; break;
        case 'return': j1z = -0.3 * (1 - ease); j2z = -0.45 * (1 - ease) - 0.25 * ease; break;
      }
      if (j1Ref.current) j1Ref.current.rotation.z += (j1z - j1Ref.current.rotation.z) * 0.12;
      if (j2Ref.current) j2Ref.current.rotation.z += (j2z - j2Ref.current.rotation.z) * 0.12;
    } else {
      const t = clock.getElapsedTime() * 0.4;
      if (j1Ref.current) j1Ref.current.rotation.z = Math.sin(t) * 0.35;
      if (j2Ref.current) j2Ref.current.rotation.z = Math.sin(t * 1.2 + 1) * 0.5 - 0.25;
    }
  });

  return (
    <group>
      {/* Pedestal */}
      {pedH > 0 && <Pedestal height={pedH} width={0.2} em={em} />}

      <group position={[0, pedH, 0]}>
        {/* ── Base assembly ── */}
        {/* Base mounting flange */}
        <BaseFlange radius={0.11} height={0.018} em={em} />

        {/* Base body — tapered cylindrical housing */}
        <mesh position={[0, bH / 2 + 0.018, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.1, bH, 32]} />
          <meshStandardMaterial {...matCobotBody} emissive={em} />
        </mesh>
        {/* Base accent ring */}
        <mesh position={[0, bH * 0.6 + 0.018, 0]}>
          <cylinderGeometry args={[0.092, 0.092, bH * 0.08, 32]} />
          <meshStandardMaterial {...matCobotAccent} emissive={em} />
        </mesh>
        {/* Base top interface plate */}
        <mesh position={[0, bH + 0.018, 0]} castShadow>
          <cylinderGeometry args={[0.085, 0.09, 0.015, 32]} />
          <meshStandardMaterial {...matMechanical} emissive={em} />
        </mesh>

        {/* ── J1: Shoulder rotation ── */}
        <group ref={j1Ref} position={[0, bH + 0.025, 0]}>
          {/* J1 housing */}
          <JointHousing radius={jointR} width={linkD * 1.15} em={em} axis="z" />

          {/* ── Upper arm link ── */}
          <group position={[0, 0, 0]}>
            {/* Main arm body — rounded box section */}
            <mesh position={[0, seg1 / 2, 0]} castShadow>
              <boxGeometry args={[linkW, seg1, linkD]} />
              <meshStandardMaterial {...matCobotBody} emissive={em} />
            </mesh>
            {/* Arm accent stripe */}
            <mesh position={[linkW / 2 + 0.001, seg1 / 2, 0]}>
              <boxGeometry args={[0.003, seg1 * 0.7, linkD * 0.4]} />
              <meshStandardMaterial {...matCobotAccent} emissive={em} />
            </mesh>
            {/* Arm bottom transition plate */}
            <mesh position={[0, 0.015, 0]} castShadow>
              <boxGeometry args={[linkW + 0.008, 0.008, linkD + 0.008]} />
              <meshStandardMaterial {...matMechanical} emissive={em} />
            </mesh>
            {/* Arm top transition plate */}
            <mesh position={[0, seg1 - 0.01, 0]} castShadow>
              <boxGeometry args={[linkW + 0.006, 0.008, linkD + 0.006]} />
              <meshStandardMaterial {...matMechanical} emissive={em} />
            </mesh>
            {/* Cable routing channel (back) */}
            <mesh position={[0, seg1 / 2, -linkD / 2 - 0.005]}>
              <boxGeometry args={[linkW * 0.3, seg1 * 0.8, 0.01]} />
              <meshStandardMaterial {...matCableCover} />
            </mesh>

            {/* ── J2: Elbow ── */}
            <group ref={j2Ref} position={[0, seg1, 0]}>
              <JointHousing radius={jointR * 0.9} width={linkD * 1.0} em={em} axis="z" />

              {/* ── Forearm link ── */}
              <group>
                <mesh position={[0, seg2 / 2, 0]} castShadow>
                  <boxGeometry args={[linkW * 0.85, seg2, linkD * 0.85]} />
                  <meshStandardMaterial {...matCobotBody} emissive={em} />
                </mesh>
                {/* Forearm accent */}
                <mesh position={[linkW * 0.85 / 2 + 0.001, seg2 / 2, 0]}>
                  <boxGeometry args={[0.003, seg2 * 0.6, linkD * 0.3]} />
                  <meshStandardMaterial {...matCobotAccent} emissive={em} />
                </mesh>
                {/* Forearm bottom plate */}
                <mesh position={[0, 0.012, 0]} castShadow>
                  <boxGeometry args={[linkW * 0.85 + 0.006, 0.006, linkD * 0.85 + 0.006]} />
                  <meshStandardMaterial {...matMechanical} emissive={em} />
                </mesh>

                {/* ── J3: Wrist bend ── */}
                <group position={[0, seg2, 0]}>
                  <JointHousing radius={jointR * 0.65} width={linkD * 0.7} em={em} axis="z" />

                  {/* Wrist extension */}
                  <mesh position={[0, 0.03, 0]} castShadow>
                    <cylinderGeometry args={[jointR * 0.5, jointR * 0.55, 0.04, 16]} />
                    <meshStandardMaterial {...matCobotBody} emissive={em} />
                  </mesh>

                  {/* ── J4: Wrist rotation ── */}
                  <group position={[0, 0.055, 0]}>
                    <mesh castShadow>
                      <cylinderGeometry args={[jointR * 0.45, jointR * 0.45, 0.02, 16]} />
                      <meshStandardMaterial {...matMechanical} emissive={em} />
                    </mesh>

                    {/* Tool flange */}
                    <ToolFlange y={0.018} radius={jointR * 0.55} em={em} />
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// 3. 5-AXIS INDUSTRIAL ROBOT
// ═══════════════════════════════════════════════════════════════

export const Robot5AxisModel: React.FC<RobotProps> = ({ parameters, isSelected, nodeId }) => {
  const turretRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);

  const reach = (parameters.reach || 1400) / 1000;
  const bH = (parameters.baseHeight || 400) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 0) / 1000 : 0;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  const seg1 = reach * 0.44;
  const seg2 = reach * 0.36;
  const baseR = 0.17;
  const armW = 0.11;
  const armD = 0.10;

  const simState = useSimulationPose(nodeId);

  useFrame(({ clock }) => {
    if (simState) {
      const p = simState.phaseProgress;
      const ease = p * p * (3 - 2 * p);
      let tY = 0, aZ = -0.15;
      switch (simState.phase) {
        case 'idle': tY = 0; aZ = -0.15; break;
        case 'approach-pick': tY = -0.5 * ease; aZ = -0.15 - 0.4 * ease; break;
        case 'pick': tY = -0.5; aZ = -0.55; break;
        case 'retract-pick': tY = -0.5; aZ = -0.55 + 0.2 * ease; break;
        case 'move-to-place': tY = -0.5 + 1.0 * ease; aZ = -0.35; break;
        case 'approach-place': tY = 0.5; aZ = -0.35 - 0.2 * ease; break;
        case 'place': tY = 0.5; aZ = -0.55; break;
        case 'retract-place': tY = 0.5; aZ = -0.55 + 0.2 * ease; break;
        case 'return': tY = 0.5 * (1 - ease); aZ = -0.35 * (1 - ease) - 0.15 * ease; break;
      }
      if (turretRef.current) turretRef.current.rotation.y += (tY - turretRef.current.rotation.y) * 0.12;
      if (armRef.current) armRef.current.rotation.z += (aZ - armRef.current.rotation.z) * 0.12;
    } else {
      if (turretRef.current) turretRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.35) * 0.7;
      if (armRef.current) armRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.5 + 0.5) * 0.4 - 0.15;
    }
  });

  return (
    <group>
      {/* Pedestal */}
      {pedH > 0 && <Pedestal height={pedH} width={0.32} em={em} />}

      <group position={[0, pedH, 0]}>
        {/* ── Base assembly ── */}
        <BaseFlange radius={baseR + 0.06} height={0.025} em={em} />

        {/* Base body — heavy industrial cylinder, tapered */}
        <mesh position={[0, bH * 0.35 + 0.025, 0]} castShadow>
          <cylinderGeometry args={[baseR, baseR + 0.04, bH * 0.7, 32]} />
          <meshStandardMaterial {...matBodyOrange} emissive={em} />
        </mesh>
        {/* Base accent band */}
        <mesh position={[0, bH * 0.15 + 0.025, 0]}>
          <cylinderGeometry args={[baseR + 0.042, baseR + 0.042, bH * 0.06, 32]} />
          <meshStandardMaterial {...matMechanical} emissive={em} />
        </mesh>
        {/* Upper base taper */}
        <mesh position={[0, bH * 0.75 + 0.025, 0]} castShadow>
          <cylinderGeometry args={[baseR * 0.85, baseR, bH * 0.3, 32]} />
          <meshStandardMaterial {...matBodyOrange} emissive={em} />
        </mesh>
        {/* Top bearing interface */}
        <mesh position={[0, bH + 0.025, 0]} castShadow>
          <cylinderGeometry args={[baseR * 0.88, baseR * 0.85, 0.02, 32]} />
          <meshStandardMaterial {...matMechanical} emissive={em} />
        </mesh>

        {/* ── J1: Turret rotation ── */}
        <group ref={turretRef} position={[0, bH + 0.035, 0]}>
          {/* Shoulder housing — industrial block */}
          <mesh position={[0, 0.06, 0]} castShadow>
            <boxGeometry args={[baseR * 1.5, 0.12, baseR * 1.15]} />
            <meshStandardMaterial {...matBodyOrange} emissive={em} />
          </mesh>
          {/* Shoulder housing edge trim */}
          <mesh position={[0, 0.12 + 0.003, 0]}>
            <boxGeometry args={[baseR * 1.5 + 0.005, 0.006, baseR * 1.15 + 0.005]} />
            <meshStandardMaterial {...matMechanical} emissive={em} />
          </mesh>
          {/* Shoulder side covers */}
          {[-1, 1].map(s => (
            <mesh key={s} position={[s * (baseR * 0.75 + 0.005), 0.06, 0]}>
              <boxGeometry args={[0.008, 0.1, baseR * 0.9]} />
              <meshStandardMaterial {...matMechanical} emissive={em} />
            </mesh>
          ))}

          {/* ── J2: Shoulder pivot ── */}
          <JointHousing radius={0.065} width={baseR * 1.2} em={em} axis="z" />

          {/* ── Upper arm ── */}
          <group ref={armRef} position={[0, 0.12, 0]}>
            <ArmLink width={armW} depth={armD} length={seg1} bodyMat={matBodyOrange} em={em} cableChannel />

            {/* ── J3: Elbow ── */}
            <group position={[0, seg1, 0]}>
              <JointHousing radius={0.055} width={armD * 1.1} em={em} axis="z" />

              {/* ── Forearm ── */}
              <ArmLink width={armW * 0.82} depth={armD * 0.82} length={seg2} bodyMat={matBodyOrange} em={em} cableChannel />

              {/* ── J4: Wrist rotation ── */}
              <group position={[0, seg2, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.04, 0.04, 0.05, 16]} />
                  <meshStandardMaterial {...matMechanical} emissive={em} />
                </mesh>
                {/* Wrist flange ring */}
                <mesh position={[0, 0.028, 0]}>
                  <cylinderGeometry args={[0.044, 0.044, 0.006, 16]} />
                  <meshStandardMaterial {...matMechanical} emissive={em} />
                </mesh>

                {/* ── J5: Wrist bend ── */}
                <group position={[0, 0.04, 0]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.035, 0.035, 0.045, 16]} />
                    <meshStandardMaterial {...matMechanical} emissive={em} />
                  </mesh>

                  {/* Tool flange */}
                  <ToolFlange y={0.035} radius={0.04} em={em} />
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Safety zone indicator */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[reach * 0.85, reach * 0.95, 48]} />
        <primitive object={matSafetyZone} attach="material" />
      </mesh>
    </group>
  );
};

// ═══════════════════════════════════════════════════════════════
// 4. 6-AXIS INDUSTRIAL ROBOT (HERO MODEL)
// ═══════════════════════════════════════════════════════════════

export const Robot6AxisModel: React.FC<RobotProps> = ({ parameters, isSelected, nodeId }) => {
  const j1Ref = useRef<THREE.Group>(null);
  const j2Ref = useRef<THREE.Group>(null);
  const j3Ref = useRef<THREE.Group>(null);

  const reach = (parameters.reach || 2000) / 1000;
  const bH = (parameters.baseHeight || 500) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 600) / 1000 : 0;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  const seg1 = reach * 0.38;
  const seg2 = reach * 0.33;
  const seg3 = reach * 0.16;
  const baseR = 0.2;
  const upperArmW = 0.13;
  const upperArmD = 0.12;
  const forearmW = 0.095;
  const forearmD = 0.09;

  const simState = useSimulationPose(nodeId);

  useFrame(({ clock }) => {
    if (simState) {
      // Simulation-driven animation
      const p = simState.phaseProgress;
      const ease = p * p * (3 - 2 * p); // smoothstep

      let j1y = 0, j2z = 0.15, j3z = -0.25;
      switch (simState.phase) {
        case 'idle':
          j1y = 0; j2z = 0.15; j3z = -0.25; break;
        case 'approach-pick':
          j1y = -0.6 * ease; j2z = 0.15 + 0.35 * ease; j3z = -0.25 - 0.3 * ease; break;
        case 'pick':
          j1y = -0.6; j2z = 0.5; j3z = -0.55; break;
        case 'retract-pick':
          j1y = -0.6; j2z = 0.5 - 0.2 * ease; j3z = -0.55 + 0.15 * ease; break;
        case 'move-to-place':
          j1y = -0.6 + 1.2 * ease; j2z = 0.3; j3z = -0.4; break;
        case 'approach-place':
          j1y = 0.6; j2z = 0.3 + 0.2 * ease; j3z = -0.4 - 0.15 * ease; break;
        case 'place':
          j1y = 0.6; j2z = 0.5; j3z = -0.55; break;
        case 'retract-place':
          j1y = 0.6; j2z = 0.5 - 0.2 * ease; j3z = -0.55 + 0.15 * ease; break;
        case 'return':
          j1y = 0.6 * (1 - ease); j2z = 0.3 * (1 - ease) + 0.15; j3z = -0.4 * (1 - ease) - 0.25 * ease; break;
      }
      if (j1Ref.current) j1Ref.current.rotation.y += (j1y - j1Ref.current.rotation.y) * 0.12;
      if (j2Ref.current) j2Ref.current.rotation.z += (j2z - j2Ref.current.rotation.z) * 0.12;
      if (j3Ref.current) j3Ref.current.rotation.z += (j3z - j3Ref.current.rotation.z) * 0.12;
    } else {
      // Demo idle animation
      const t = clock.getElapsedTime();
      if (j1Ref.current) j1Ref.current.rotation.y = Math.sin(t * 0.3) * 0.85;
      if (j2Ref.current) j2Ref.current.rotation.z = Math.sin(t * 0.45 + 0.3) * 0.4 + 0.15;
      if (j3Ref.current) j3Ref.current.rotation.z = Math.sin(t * 0.6 + 1.0) * 0.35 - 0.25;
    }
  });

  return (
    <group>
      {/* Pedestal */}
      {pedH > 0 && <Pedestal height={pedH} width={0.38} em={em} />}

      <group position={[0, pedH, 0]}>
        {/* ── Base assembly ── */}
        <BaseFlange radius={baseR + 0.08} height={0.03} em={em} />

        {/* Base lower section — heavy cast look */}
        <mesh position={[0, bH * 0.2 + 0.03, 0]} castShadow>
          <cylinderGeometry args={[baseR + 0.02, baseR + 0.05, bH * 0.4, 32]} />
          <meshStandardMaterial {...matBodyOrange} emissive={em} />
        </mesh>
        {/* Base mechanical band */}
        <mesh position={[0, bH * 0.1 + 0.03, 0]}>
          <cylinderGeometry args={[baseR + 0.052, baseR + 0.052, bH * 0.04, 32]} />
          <meshStandardMaterial {...matMechanical} emissive={em} />
        </mesh>
        {/* Base upper section — tapered */}
        <mesh position={[0, bH * 0.6 + 0.03, 0]} castShadow>
          <cylinderGeometry args={[baseR * 0.9, baseR + 0.02, bH * 0.4, 32]} />
          <meshStandardMaterial {...matBodyOrange} emissive={em} />
        </mesh>
        {/* Top cap */}
        <mesh position={[0, bH * 0.82 + 0.03, 0]} castShadow>
          <cylinderGeometry args={[baseR * 0.85, baseR * 0.9, bH * 0.16, 32]} />
          <meshStandardMaterial {...matBodyOrange} emissive={em} />
        </mesh>
        {/* Top bearing ring */}
        <mesh position={[0, bH + 0.03, 0]}>
          <cylinderGeometry args={[baseR * 0.87, baseR * 0.85, 0.015, 32]} />
          <meshStandardMaterial {...matMechanical} emissive={em} />
        </mesh>
        {/* Brand badge area */}
        <mesh position={[0, bH * 0.45 + 0.03, baseR + 0.02 + 0.002]} rotation={[0, 0, 0]}>
          <boxGeometry args={[baseR * 0.6, bH * 0.18, 0.003]} />
          <meshStandardMaterial color={0x111111} metalness={0.5} roughness={0.5} />
        </mesh>

        {/* ── J1: Base rotation / turret ── */}
        <group ref={j1Ref} position={[0, bH + 0.035, 0]}>
          {/* Shoulder housing block — industrial wedge */}
          <mesh position={[0, 0.07, 0]} castShadow>
            <boxGeometry args={[baseR * 1.6, 0.2, baseR * 1.2]} />
            <meshStandardMaterial {...matBodyOrange} emissive={em} />
          </mesh>
          {/* Shoulder top plate */}
          <mesh position={[0, 0.17 + 0.005, 0]}>
            <boxGeometry args={[baseR * 1.6 + 0.005, 0.01, baseR * 1.2 + 0.005]} />
            <meshStandardMaterial {...matMechanical} emissive={em} />
          </mesh>
          {/* Shoulder ear covers */}
          {[-1, 1].map(s => (
            <mesh key={`ear-${s}`} position={[s * (baseR * 0.8 + 0.01), 0.07, 0]} castShadow>
              <boxGeometry args={[0.01, 0.16, baseR * 0.95]} />
              <meshStandardMaterial {...matMechanical} emissive={em} />
            </mesh>
          ))}

          {/* ── J2: Shoulder pivot ── */}
          <group ref={j2Ref} position={[0, 0.17, 0]}>
            {/* J2 housing */}
            <JointHousing radius={0.075} width={baseR * 1.3} em={em} axis="z" />

            {/* ── Upper arm (S-arm) ── */}
            <ArmLink width={upperArmW} depth={upperArmD} length={seg1} bodyMat={matBodyOrange} em={em} cableChannel />
            {/* Upper arm reinforcement ribs */}
            {[0.25, 0.5, 0.75].map((frac, i) => (
              <mesh key={`rib-${i}`} position={[0, seg1 * frac, upperArmD / 2 + 0.002]}>
                <boxGeometry args={[upperArmW + 0.005, 0.008, 0.004]} />
                <meshStandardMaterial {...matMechanical} />
              </mesh>
            ))}

            {/* ── J3: Elbow ── */}
            <group ref={j3Ref} position={[0, seg1, 0]}>
              <JointHousing radius={0.065} width={upperArmD * 1.1} em={em} axis="z" />

              {/* ── Forearm ── */}
              <ArmLink width={forearmW} depth={forearmD} length={seg2} bodyMat={matBodyOrange} em={em} cableChannel />

              {/* ── Wrist cluster (J4/J5/J6) ── */}
              <group position={[0, seg2, 0]}>
                {/* J4: Wrist roll housing */}
                <mesh castShadow>
                  <cylinderGeometry args={[0.045, 0.048, 0.06, 20]} />
                  <meshStandardMaterial {...matMechanical} emissive={em} />
                </mesh>
                {/* J4 flange ring */}
                <mesh position={[0, 0.033, 0]}>
                  <cylinderGeometry args={[0.05, 0.05, 0.006, 20]} />
                  <meshStandardMaterial {...matMechanical} emissive={em} />
                </mesh>

                {/* J5: Wrist pitch */}
                <group position={[0, 0.05, 0]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                    <cylinderGeometry args={[0.038, 0.038, 0.05, 16]} />
                    <meshStandardMaterial {...matMechanical} emissive={em} />
                  </mesh>
                  {/* J5 side caps */}
                  {[-1, 1].map(s => (
                    <mesh key={`j5c-${s}`} position={[0, 0, s * 0.028]} rotation={[Math.PI / 2, 0, 0]}>
                      <cylinderGeometry args={[0.04, 0.04, 0.004, 16]} />
                      <meshStandardMaterial {...matMechanical} emissive={em} />
                    </mesh>
                  ))}

                  {/* J6: Tool rotation + wrist extension */}
                  <group position={[0, 0.02, 0]}>
                    <mesh position={[0, seg3 / 2, 0]} castShadow>
                      <boxGeometry args={[forearmW * 0.65, seg3, forearmD * 0.65]} />
                      <meshStandardMaterial {...matBodyOrange} emissive={em} />
                    </mesh>
                    {/* Wrist cover panels */}
                    {[-1, 1].map(s => (
                      <mesh key={`wp-${s}`} position={[s * (forearmW * 0.65 / 2 + 0.002), seg3 / 2, 0]}>
                        <boxGeometry args={[0.003, seg3 * 0.8, forearmD * 0.5]} />
                        <meshStandardMaterial {...matMechanical} />
                      </mesh>
                    ))}

                    {/* Tool flange */}
                    <ToolFlange y={seg3 + 0.008} radius={0.04} em={em} />

                    {/* Default end effector — mechanical gripper */}
                    <group position={[0, seg3 + 0.025, 0]}>
                      {/* Gripper body */}
                      <mesh castShadow>
                        <boxGeometry args={[0.09, 0.03, 0.045]} />
                        <meshStandardMaterial {...matFlange} emissive={em} />
                      </mesh>
                      {/* Actuator housing */}
                      <mesh position={[0, 0, -0.028]}>
                        <boxGeometry args={[0.05, 0.025, 0.012]} />
                        <meshStandardMaterial {...matMechanical} emissive={em} />
                      </mesh>
                      {/* Gripper fingers */}
                      {[-1, 1].map(s => (
                        <group key={`gf-${s}`} position={[s * 0.035, 0.03, 0]}>
                          {/* Finger base */}
                          <mesh castShadow>
                            <boxGeometry args={[0.015, 0.025, 0.035]} />
                            <meshStandardMaterial {...matMechanical} emissive={em} />
                          </mesh>
                          {/* Finger tip */}
                          <mesh position={[0, 0.02, 0]} castShadow>
                            <boxGeometry args={[0.012, 0.02, 0.025]} />
                            <meshStandardMaterial {...matAluminum} emissive={em} />
                          </mesh>
                        </group>
                      ))}
                    </group>
                  </group>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* Safety zone ring — floor indicator */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[reach * 0.88, reach, 48]} />
        <primitive object={matSafetyZone} attach="material" />
      </mesh>
    </group>
  );
};
