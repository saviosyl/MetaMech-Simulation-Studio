/**
 * FlowDirectionArrow — Shows conveyor transport direction
 * 
 * Renders a small animated arrow pointing from input to output port.
 */
import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface FlowDirectionArrowProps {
  length: number; // conveyor length in meters
  height: number; // belt height in meters
  visible?: boolean;
  color?: string;
}

const FlowDirectionArrow: React.FC<FlowDirectionArrowProps> = ({ 
  length, 
  height, 
  visible = true,
  color = '#06b6d4' 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const pulseRef = useRef(0);

  useFrame((_, delta) => {
    pulseRef.current = (pulseRef.current + delta * 1.5) % 1;
  });

  if (!visible) return null;

  const arrowSize = Math.min(0.12, length * 0.08);
  const yPos = height + 0.02;

  return (
    <group ref={groupRef}>
      {/* Arrow body — thin line along X */}
      <mesh position={[0, yPos, 0]}>
        <boxGeometry args={[length * 0.6, 0.008, 0.03]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>

      {/* Arrow head — triangle pointing +X (output direction) */}
      <mesh position={[length * 0.35, yPos, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[arrowSize, arrowSize * 2, 4]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>

      {/* Animated pulse dot moving along the arrow */}
      <mesh position={[-length * 0.3 + pulseRef.current * length * 0.6, yPos + 0.01, 0]}>
        <sphereGeometry args={[0.02, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

export default FlowDirectionArrow;
