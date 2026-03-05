/**
 * SensorZoneOverlay — Visualizes sensor detection zone
 * 
 * Shows a translucent cylinder/disc around the sensor position
 * indicating the detection range. Pulses when actively detecting.
 */
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface SensorZoneOverlayProps {
  range?: number; // Detection range in meters
  isActive?: boolean;
  height?: number;
}

const SensorZoneOverlay: React.FC<SensorZoneOverlayProps> = ({ 
  range = 0.3, 
  isActive = false,
  height = 0.8,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      if (isActive) {
        mat.opacity = 0.15 + Math.sin(Date.now() * 0.005) * 0.1;
        mat.color.set('#10b981');
      } else {
        mat.opacity = 0.08;
        mat.color.set('#06b6d4');
      }
    }
  });

  return (
    <mesh ref={meshRef} position={[0, height / 2, 0]}>
      <cylinderGeometry args={[range, range, height, 16, 1, true]} />
      <meshBasicMaterial 
        color="#06b6d4" 
        transparent 
        opacity={0.08} 
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
};

export default SensorZoneOverlay;
