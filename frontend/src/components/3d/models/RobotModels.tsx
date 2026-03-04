/**
 * Robot 3D Models — Premium Industrial Robots
 *
 * - Cartesian (gantry) robot
 * - Collaborative robot (cobot)
 * - 5-axis articulated robot
 * - 6-axis articulated robot
 *
 * All models are procedural geometry, parametric from properties.
 */
import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Materials
const matFrame = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.75, roughness: 0.3 });
const matDark = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.8, roughness: 0.2 });
const matOrange = new THREE.MeshStandardMaterial({ color: 0xe8600a, metalness: 0.35, roughness: 0.45 });
const matBlue = new THREE.MeshStandardMaterial({ color: 0x2060a8, metalness: 0.3, roughness: 0.5 });
const matLight = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.5, roughness: 0.35 });
const matGreen = new THREE.MeshStandardMaterial({ color: 0x22aa55, metalness: 0.25, roughness: 0.5 });
const matYellow = new THREE.MeshStandardMaterial({ color: 0xe8b710, metalness: 0.2, roughness: 0.55 });
const matTool = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.7, roughness: 0.3 });

interface RobotProps {
  parameters: Record<string, any>;
  isSelected: boolean;
}

// ─── Cartesian (Gantry) Robot ──────────────────────────────────

export const CartesianRobotModel: React.FC<RobotProps> = ({ parameters, isSelected }) => {
  const carriageRef = useRef<THREE.Group>(null);

  const rX = (parameters.reachX || 2000) / 1000;
  const rY = (parameters.reachY || 1500) / 1000;
  const rZ = (parameters.reachZ || 1000) / 1000;
  const bH = (parameters.baseHeight || 2500) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 0) / 1000 : 0;
  const totalH = bH + pedH;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  // Animate carriage
  useFrame(({ clock }) => {
    if (carriageRef.current) {
      const t = (Math.sin(clock.getElapsedTime() * 0.8) + 1) / 2;
      carriageRef.current.position.x = -rX / 2 + t * rX;
    }
  });

  return (
    <group>
      {/* Pedestal */}
      {pedH > 0 && (
        <mesh position={[0, pedH / 2, 0]} castShadow>
          <boxGeometry args={[0.3, pedH, 0.3]} />
          <meshStandardMaterial color={0x555555} metalness={0.7} roughness={0.3} emissive={em} />
        </mesh>
      )}

      {/* Four gantry columns */}
      {[[-rX / 2, -rY / 2], [-rX / 2, rY / 2], [rX / 2, -rY / 2], [rX / 2, rY / 2]].map(([cx, cz], i) => (
        <mesh key={`col-${i}`} position={[cx, pedH + totalH / 2, cz]} castShadow>
          <boxGeometry args={[0.08, totalH, 0.08]} />
          <meshStandardMaterial {...matFrame} emissive={em} />
        </mesh>
      ))}

      {/* X-axis top beams (parallel along X) */}
      {[-rY / 2, rY / 2].map((z, i) => (
        <mesh key={`xbeam-${i}`} position={[0, pedH + totalH, z]} castShadow>
          <boxGeometry args={[rX + 0.1, 0.1, 0.12]} />
          <meshStandardMaterial {...matFrame} emissive={em} />
        </mesh>
      ))}

      {/* Y-axis cross beam (moves along X) */}
      <group ref={carriageRef}>
        <mesh position={[0, pedH + totalH + 0.12, 0]} castShadow>
          <boxGeometry args={[0.1, 0.1, rY + 0.1]} />
          <meshStandardMaterial {...matBlue} emissive={em} />
        </mesh>

        {/* Z-axis vertical slide */}
        <mesh position={[0, pedH + totalH - rZ / 2, 0]} castShadow>
          <boxGeometry args={[0.06, rZ, 0.06]} />
          <meshStandardMaterial {...matDark} emissive={em} />
        </mesh>

        {/* Tool head */}
        <mesh position={[0, pedH + totalH - rZ - 0.05, 0]} castShadow>
          <boxGeometry args={[0.12, 0.1, 0.12]} />
          <meshStandardMaterial {...matTool} emissive={em} />
        </mesh>

        {/* Vacuum cups */}
        {[[-0.03, 0, -0.03], [-0.03, 0, 0.03], [0.03, 0, -0.03], [0.03, 0, 0.03]].map(([vx, _vy, vz], i) => (
          <mesh key={`vc-${i}`} position={[vx, pedH + totalH - rZ - 0.12, vz]}>
            <cylinderGeometry args={[0.015, 0.02, 0.03, 8]} />
            <meshStandardMaterial color={0x333333} metalness={0.3} roughness={0.7} />
          </mesh>
        ))}
      </group>

      {/* Base frame */}
      <mesh position={[0, pedH + 0.03, 0]} castShadow>
        <boxGeometry args={[rX + 0.2, 0.06, rY + 0.2]} />
        <meshStandardMaterial {...matDark} emissive={em} />
      </mesh>
    </group>
  );
};

// ─── Collaborative Robot (Cobot) ───────────────────────────────

export const CobotModel: React.FC<RobotProps> = ({ parameters, isSelected }) => {
  const j1Ref = useRef<THREE.Group>(null);
  const j2Ref = useRef<THREE.Group>(null);

  const reach = (parameters.reach || 850) / 1000;
  const bH = (parameters.baseHeight || 200) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 800) / 1000 : 0;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  const seg1 = reach * 0.45;
  const seg2 = reach * 0.4;
  const jointR = 0.05;

  useFrame(({ clock }) => {
    if (j1Ref.current && j2Ref.current) {
      const t = clock.getElapsedTime() * 0.5;
      j1Ref.current.rotation.z = Math.sin(t) * 0.4;
      j2Ref.current.rotation.z = Math.sin(t * 1.3 + 1) * 0.6 - 0.3;
    }
  });

  return (
    <group>
      {/* Pedestal column */}
      {pedH > 0 && (
        <mesh position={[0, pedH / 2, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, pedH, 16]} />
          <meshStandardMaterial color={0x666666} metalness={0.7} roughness={0.3} emissive={em} />
        </mesh>
      )}

      {/* Base — round, heavy */}
      <mesh position={[0, pedH + bH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.14, bH, 24]} />
        <meshStandardMaterial {...matLight} emissive={em} />
      </mesh>

      {/* Joint 1 (shoulder) */}
      <group ref={j1Ref} position={[0, pedH + bH, 0]}>
        <mesh castShadow>
          <sphereGeometry args={[jointR, 16, 16]} />
          <meshStandardMaterial {...matGreen} emissive={em} />
        </mesh>

        {/* Upper arm */}
        <mesh position={[0, seg1 / 2, 0]} castShadow>
          <capsuleGeometry args={[0.035, seg1 - 0.07, 8, 16]} />
          <meshStandardMaterial {...matLight} emissive={em} />
        </mesh>

        {/* Joint 2 (elbow) */}
        <group ref={j2Ref} position={[0, seg1, 0]}>
          <mesh castShadow>
            <sphereGeometry args={[jointR * 0.85, 16, 16]} />
            <meshStandardMaterial {...matGreen} emissive={em} />
          </mesh>

          {/* Forearm */}
          <mesh position={[0, seg2 / 2, 0]} castShadow>
            <capsuleGeometry args={[0.03, seg2 - 0.06, 8, 16]} />
            <meshStandardMaterial {...matLight} emissive={em} />
          </mesh>

          {/* Wrist joint */}
          <mesh position={[0, seg2, 0]} castShadow>
            <sphereGeometry args={[jointR * 0.7, 12, 12]} />
            <meshStandardMaterial {...matDark} emissive={em} />
          </mesh>

          {/* Tool flange */}
          <mesh position={[0, seg2 + 0.04, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.04, 12]} />
            <meshStandardMaterial {...matTool} emissive={em} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ─── 5-Axis Industrial Robot ───────────────────────────────────

export const Robot5AxisModel: React.FC<RobotProps> = ({ parameters, isSelected }) => {
  const turretRef = useRef<THREE.Group>(null);
  const armRef = useRef<THREE.Group>(null);

  const reach = (parameters.reach || 1400) / 1000;
  const bH = (parameters.baseHeight || 400) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 0) / 1000 : 0;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  const seg1 = reach * 0.42;
  const seg2 = reach * 0.38;
  const baseR = 0.18;

  useFrame(({ clock }) => {
    if (turretRef.current) turretRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.8;
    if (armRef.current) armRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.6 + 0.5) * 0.5 - 0.2;
  });

  return (
    <group>
      {/* Pedestal */}
      {pedH > 0 && (
        <mesh position={[0, pedH / 2, 0]} castShadow>
          <boxGeometry args={[0.35, pedH, 0.35]} />
          <meshStandardMaterial color={0x555555} metalness={0.7} roughness={0.3} emissive={em} />
        </mesh>
      )}

      {/* Heavy base */}
      <mesh position={[0, pedH + bH * 0.15, 0]} castShadow>
        <cylinderGeometry args={[baseR + 0.05, baseR + 0.08, bH * 0.3, 24]} />
        <meshStandardMaterial {...matDark} emissive={em} />
      </mesh>

      {/* Base column */}
      <mesh position={[0, pedH + bH / 2, 0]} castShadow>
        <cylinderGeometry args={[baseR, baseR, bH, 24]} />
        <meshStandardMaterial {...matOrange} emissive={em} />
      </mesh>

      {/* Turret (J1 rotates) */}
      <group ref={turretRef} position={[0, pedH + bH, 0]}>
        {/* Shoulder housing */}
        <mesh castShadow>
          <boxGeometry args={[baseR * 1.4, 0.15, baseR * 1.2]} />
          <meshStandardMaterial {...matOrange} emissive={em} />
        </mesh>

        {/* J2 shoulder joint */}
        <mesh position={[0, 0.08, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.08, 16]} />
          <meshStandardMaterial {...matDark} emissive={em} />
        </mesh>

        {/* Upper arm */}
        <group ref={armRef} position={[0, 0.12, 0]}>
          <mesh position={[0, seg1 / 2, 0]} castShadow>
            <boxGeometry args={[0.1, seg1, 0.1]} />
            <meshStandardMaterial {...matOrange} emissive={em} />
          </mesh>

          {/* Elbow joint */}
          <mesh position={[0, seg1, 0]} castShadow>
            <sphereGeometry args={[0.06, 12, 12]} />
            <meshStandardMaterial {...matDark} emissive={em} />
          </mesh>

          {/* Forearm */}
          <mesh position={[0, seg1 + seg2 / 2, 0]} castShadow>
            <boxGeometry args={[0.08, seg2, 0.08]} />
            <meshStandardMaterial {...matOrange} emissive={em} />
          </mesh>

          {/* J4 wrist joint */}
          <mesh position={[0, seg1 + seg2, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.06, 12]} />
            <meshStandardMaterial {...matDark} emissive={em} />
          </mesh>

          {/* J5 wrist rotate */}
          <mesh position={[0, seg1 + seg2 + 0.05, 0]} castShadow>
            <cylinderGeometry args={[0.035, 0.04, 0.04, 12]} />
            <meshStandardMaterial {...matDark} emissive={em} />
          </mesh>

          {/* Tool flange */}
          <mesh position={[0, seg1 + seg2 + 0.08, 0]} castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.02, 12]} />
            <meshStandardMaterial {...matTool} emissive={em} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ─── 6-Axis Industrial Robot ───────────────────────────────────

export const Robot6AxisModel: React.FC<RobotProps> = ({ parameters, isSelected }) => {
  const j1Ref = useRef<THREE.Group>(null);
  const j2Ref = useRef<THREE.Group>(null);
  const j3Ref = useRef<THREE.Group>(null);

  const reach = (parameters.reach || 2000) / 1000;
  const bH = (parameters.baseHeight || 500) / 1000;
  const pedH = parameters.pedestalEnabled ? (parameters.pedestalHeight || 600) / 1000 : 0;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');

  const seg1 = reach * 0.38;
  const seg2 = reach * 0.32;
  const seg3 = reach * 0.18;
  const baseR = 0.22;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (j1Ref.current) j1Ref.current.rotation.y = Math.sin(t * 0.35) * 1.0;
    if (j2Ref.current) j2Ref.current.rotation.z = Math.sin(t * 0.5 + 0.3) * 0.5 + 0.2;
    if (j3Ref.current) j3Ref.current.rotation.z = Math.sin(t * 0.7 + 1.0) * 0.4 - 0.3;
  });

  return (
    <group>
      {/* Pedestal */}
      {pedH > 0 && (
        <mesh position={[0, pedH / 2, 0]} castShadow>
          <boxGeometry args={[0.4, pedH, 0.4]} />
          <meshStandardMaterial color={0x555555} metalness={0.7} roughness={0.3} emissive={em} />
        </mesh>
      )}

      {/* Base plate */}
      <mesh position={[0, pedH + 0.025, 0]} castShadow>
        <cylinderGeometry args={[baseR + 0.1, baseR + 0.12, 0.05, 24]} />
        <meshStandardMaterial {...matDark} emissive={em} />
      </mesh>

      {/* Base body */}
      <mesh position={[0, pedH + bH * 0.4, 0]} castShadow>
        <cylinderGeometry args={[baseR, baseR + 0.02, bH * 0.7, 24]} />
        <meshStandardMaterial {...matOrange} emissive={em} />
      </mesh>

      {/* Brand badge */}
      <mesh position={[0, pedH + bH * 0.4, baseR + 0.001]}>
        <planeGeometry args={[baseR, bH * 0.15]} />
        <meshStandardMaterial color={0x111111} metalness={0.5} roughness={0.5} />
      </mesh>

      {/* J1 — turret */}
      <group ref={j1Ref} position={[0, pedH + bH * 0.75, 0]}>
        {/* Shoulder housing — chunky wedge */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <boxGeometry args={[baseR * 1.3, 0.2, baseR * 1.1]} />
          <meshStandardMaterial {...matOrange} emissive={em} />
        </mesh>

        {/* J2 — shoulder pivot */}
        <group ref={j2Ref} position={[0, 0.16, 0]}>
          {/* Shoulder joint cylinder */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, baseR * 1.1, 16]} />
            <meshStandardMaterial {...matDark} emissive={em} />
          </mesh>

          {/* Upper arm */}
          <mesh position={[0, seg1 / 2, 0]} castShadow>
            <boxGeometry args={[0.12, seg1, 0.12]} />
            <meshStandardMaterial {...matOrange} emissive={em} />
          </mesh>

          {/* Upper arm side covers */}
          {[-1, 1].map(s => (
            <mesh key={`cover-${s}`} position={[s * 0.065, seg1 * 0.3, 0]} castShadow>
              <boxGeometry args={[0.01, seg1 * 0.5, 0.1]} />
              <meshStandardMaterial {...matDark} emissive={em} />
            </mesh>
          ))}

          {/* J3 — elbow */}
          <group ref={j3Ref} position={[0, seg1, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.065, 0.065, 0.14, 16]} />
              <meshStandardMaterial {...matDark} emissive={em} />
            </mesh>

            {/* Forearm */}
            <mesh position={[0, seg2 / 2, 0]} castShadow>
              <boxGeometry args={[0.09, seg2, 0.09]} />
              <meshStandardMaterial {...matOrange} emissive={em} />
            </mesh>

            {/* J4 — wrist roll housing */}
            <mesh position={[0, seg2, 0]} castShadow>
              <cylinderGeometry args={[0.045, 0.045, 0.08, 12]} />
              <meshStandardMaterial {...matDark} emissive={em} />
            </mesh>

            {/* J5 — wrist pitch */}
            <mesh position={[0, seg2 + 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.06, 12]} />
              <meshStandardMaterial {...matDark} emissive={em} />
            </mesh>

            {/* J6 — wrist yaw / tool flange */}
            <mesh position={[0, seg2 + seg3 * 0.5, 0]} castShadow>
              <boxGeometry args={[0.06, seg3, 0.06]} />
              <meshStandardMaterial {...matOrange} emissive={em} />
            </mesh>

            {/* Tool mount plate */}
            <mesh position={[0, seg2 + seg3, 0]} castShadow>
              <cylinderGeometry args={[0.035, 0.035, 0.015, 16]} />
              <meshStandardMaterial {...matTool} emissive={em} />
            </mesh>

            {/* Tool — gripper or vacuum */}
            <mesh position={[0, seg2 + seg3 + 0.04, 0]} castShadow>
              <boxGeometry args={[0.08, 0.06, 0.04]} />
              <meshStandardMaterial {...matTool} emissive={em} />
            </mesh>

            {/* Gripper fingers */}
            {[-0.035, 0.035].map((gx, i) => (
              <mesh key={`finger-${i}`} position={[gx, seg2 + seg3 + 0.08, 0]} castShadow>
                <boxGeometry args={[0.01, 0.04, 0.03]} />
                <meshStandardMaterial {...matDark} emissive={em} />
              </mesh>
            ))}
          </group>
        </group>
      </group>

      {/* Safety zone indicator */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[reach * 0.9, reach, 32]} />
        <meshBasicMaterial color={matYellow.color} transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
