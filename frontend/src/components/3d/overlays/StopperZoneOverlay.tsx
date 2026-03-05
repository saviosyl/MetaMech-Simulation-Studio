/**
 * StopperZoneOverlay — Visualizes stopper blocking zone
 * 
 * Shows a red/green bar across the conveyor at the stopper position.
 * Red = engaged (blocking), Green = released.
 */
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface StopperZoneOverlayProps {
  width?: number;
  isEngaged?: boolean;
}

const StopperZoneOverlay: React.FC<StopperZoneOverlayProps> = ({ 
  width = 0.6, 
  isEngaged = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.set(isEngaged ? '#ef4444' : '#10b981');
      mat.opacity = isEngaged ? 0.4 : 0.2;
    }
  });

  return (
    <group>
      {/* Blocking bar */}
      <mesh ref={meshRef} position={[0, 0.85, 0]}>
        <boxGeometry args={[0.03, 0.15, width + 0.1]} />
        <meshBasicMaterial 
          color="#ef4444" 
          transparent 
          opacity={0.4}
          depthWrite={false}
        />
      </mesh>
      {/* Status indicator dot */}
      <mesh position={[0, 1.0, 0]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshBasicMaterial color={isEngaged ? '#ef4444' : '#10b981'} />
      </mesh>
    </group>
  );
};

export default StopperZoneOverlay;
