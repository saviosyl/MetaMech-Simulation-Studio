/**
 * Industrial Machine Model — Procedural box-form machine/station
 *
 * Boxy industrial machine with:
 * - Main enclosure body
 * - Control panel on front
 * - Infeed/outfeed openings
 * - Status light tower
 * - Ventilation grille
 * - Base frame
 */
import React from 'react';
import * as THREE from 'three';

const matBody = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.6, roughness: 0.35 });
const matPanel = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.7, roughness: 0.25 });
const matFrame = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.75, roughness: 0.3 });
const matDoor = new THREE.MeshStandardMaterial({ color: 0xb8b8b8, metalness: 0.65, roughness: 0.3 });
const matGreen = new THREE.MeshStandardMaterial({ color: 0x22cc44, emissive: 0x22cc44, emissiveIntensity: 0.5 });
const matAmber = new THREE.MeshStandardMaterial({ color: 0xffaa00, emissive: 0xffaa00, emissiveIntensity: 0.3 });
const matVent = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.4 });

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const IndustrialMachineModel: React.FC<Props> = ({ parameters, isSelected }) => {
  const mW = (parameters.machineWidth || 1500) / 1000;
  const mL = (parameters.machineLength || 2000) / 1000;
  const mH = (parameters.machineHeight || 1800) / 1000;
  const em = isSelected ? new THREE.Color('#222') : new THREE.Color('#000');
  const baseH = 0.1;
  const defaultPortH = baseH + mH * 0.35;
  const inputOpeningH = parameters.infeedHeight != null ? (parameters.infeedHeight / 1000) : defaultPortH;
  const outputOpeningH = parameters.outfeedHeight != null ? (parameters.outfeedHeight / 1000) : inputOpeningH;

  return (
    <group>
      {/* Base frame */}
      <mesh position={[0, baseH / 2, 0]} castShadow>
        <boxGeometry args={[mL + 0.04, baseH, mW + 0.04]} />
        <meshStandardMaterial {...matFrame} emissive={em} />
      </mesh>

      {/* Main body */}
      <mesh position={[0, baseH + mH / 2, 0]} castShadow>
        <boxGeometry args={[mL, mH, mW]} />
        <meshStandardMaterial {...matBody} emissive={em} />
      </mesh>

      {/* Front panel (darker) */}
      <mesh position={[0, baseH + mH * 0.55, mW / 2 + 0.001]}>
        <boxGeometry args={[mL * 0.8, mH * 0.4, 0.005]} />
        <meshStandardMaterial {...matPanel} emissive={em} />
      </mesh>

      {/* Access door (left side) */}
      <mesh position={[-mL / 2 - 0.001, baseH + mH * 0.45, 0]} castShadow>
        <boxGeometry args={[0.005, mH * 0.7, mW * 0.6]} />
        <meshStandardMaterial {...matDoor} emissive={em} />
      </mesh>

      {/* Door handle */}
      <mesh position={[-mL / 2 - 0.015, baseH + mH * 0.5, mW * 0.2]}>
        <boxGeometry args={[0.01, 0.06, 0.01]} />
        <meshStandardMaterial {...matFrame} />
      </mesh>

      {/* Output opening (right side) */}
      <mesh position={[mL / 2 + 0.001, outputOpeningH, 0]}>
        <boxGeometry args={[0.01, mH * 0.25, mW * 0.5]} />
        <meshStandardMaterial color={0x111111} metalness={0.9} roughness={0.1} emissive={em} />
      </mesh>

      {/* Input opening (left side) */}
      <mesh position={[-mL / 2 - 0.001, inputOpeningH, 0]}>
        <boxGeometry args={[0.01, mH * 0.25, mW * 0.5]} />
        <meshStandardMaterial color={0x111111} metalness={0.9} roughness={0.1} emissive={em} />
      </mesh>

      {/* Control panel (front upper area) */}
      <mesh position={[mL * 0.25, baseH + mH * 0.8, mW / 2 + 0.01]}>
        <boxGeometry args={[0.2, 0.15, 0.02]} />
        <meshStandardMaterial {...matPanel} emissive={em} />
      </mesh>

      {/* Screen on control panel */}
      <mesh position={[mL * 0.25, baseH + mH * 0.81, mW / 2 + 0.02]}>
        <boxGeometry args={[0.12, 0.08, 0.005]} />
        <meshStandardMaterial color={0x003366} emissive={new THREE.Color(0x003366)} emissiveIntensity={0.3} />
      </mesh>

      {/* Buttons on panel */}
      {[0, 0.04, 0.08].map((dx, i) => (
        <mesh key={`btn-${i}`} position={[mL * 0.25 - 0.04 + dx, baseH + mH * 0.75, mW / 2 + 0.02]}>
          <cylinderGeometry args={[0.008, 0.008, 0.01, 8]} />
          <meshStandardMaterial color={[0x22cc44, 0xff4444, 0x4444ff][i]} emissive={new THREE.Color([0x22cc44, 0xff4444, 0x4444ff][i])} emissiveIntensity={0.2} />
        </mesh>
      ))}

      {/* Status light tower (top right) */}
      <group position={[mL * 0.35, baseH + mH + 0.01, mW * 0.3]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.015, 0.015, 0.02, 8]} />
          <meshStandardMaterial {...matFrame} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
          <meshStandardMaterial {...matGreen} />
        </mesh>
        <mesh position={[0, 0.065, 0]}>
          <cylinderGeometry args={[0.012, 0.012, 0.03, 8]} />
          <meshStandardMaterial {...matAmber} />
        </mesh>
      </group>

      {/* Ventilation grille (back) */}
      {Array.from({ length: 6 }).map((_, i) => (
        <mesh key={`vent-${i}`} position={[0, baseH + mH * 0.7 + i * 0.03, -mW / 2 - 0.001]}>
          <boxGeometry args={[mL * 0.4, 0.01, 0.005]} />
          <meshStandardMaterial {...matVent} />
        </mesh>
      ))}

      {/* Cable entry (bottom back) */}
      <mesh position={[mL * 0.3, baseH + 0.05, -mW / 2 - 0.01]}>
        <cylinderGeometry args={[0.02, 0.02, 0.02, 8]} />
        <meshStandardMaterial color={0x222222} />
      </mesh>

      {/* Top edge trim */}
      <mesh position={[0, baseH + mH + 0.01, 0]}>
        <boxGeometry args={[mL + 0.01, 0.015, mW + 0.01]} />
        <meshStandardMaterial {...matFrame} emissive={em} />
      </mesh>
    </group>
  );
};

export default IndustrialMachineModel;
