import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ConveyorModelProps {
  length?: number;
  width?: number;
  isSelected: boolean;
}

const ConveyorModel: React.FC<ConveyorModelProps> = ({ length = 5, width = 1, isSelected }) => {
  const rollersRef = useRef<THREE.Group>(null);
  const beltRef = useRef<THREE.Mesh>(null);

  const rollerCount = Math.max(3, Math.floor(length / 0.4));
  const frameHeight = 0.6;
  const rollerRadius = 0.06;
  const beltY = frameHeight + rollerRadius * 2;

  const selectedEmissive = isSelected ? '#222222' : '#000000';

  useFrame(() => {
    if (rollersRef.current) {
      rollersRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          child.rotation.z += 0.02;
        }
      });
    }
  });

  const rollerPositions = useMemo(() => {
    const positions: number[] = [];
    const spacing = length / (rollerCount - 1);
    for (let i = 0; i < rollerCount; i++) {
      positions.push(-length / 2 + i * spacing);
    }
    return positions;
  }, [length, rollerCount]);

  return (
    <group>
      {/* Left frame rail */}
      <mesh position={[0, frameHeight / 2, -width / 2 - 0.05]} castShadow>
        <boxGeometry args={[length, frameHeight, 0.08]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} emissive={selectedEmissive} />
      </mesh>
      {/* Right frame rail */}
      <mesh position={[0, frameHeight / 2, width / 2 + 0.05]} castShadow>
        <boxGeometry args={[length, frameHeight, 0.08]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} emissive={selectedEmissive} />
      </mesh>

      {/* Legs */}
      {[-length / 2 + 0.2, length / 2 - 0.2].map((x, xi) =>
        [-width / 2 - 0.05, width / 2 + 0.05].map((z, zi) => (
          <mesh key={`leg-${xi}-${zi}`} position={[x, 0, z]} castShadow>
            <boxGeometry args={[0.08, frameHeight, 0.08]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.4} emissive={selectedEmissive} />
          </mesh>
        ))
      )}

      {/* Rollers */}
      <group ref={rollersRef}>
        {rollerPositions.map((x, i) => (
          <mesh key={`roller-${i}`} position={[x, beltY - rollerRadius, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[rollerRadius, rollerRadius, width, 8]} />
            <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} emissive={selectedEmissive} />
          </mesh>
        ))}
      </group>

      {/* Belt surface */}
      <mesh ref={beltRef} position={[0, beltY, 0]} receiveShadow castShadow>
        <boxGeometry args={[length - 0.05, 0.03, width - 0.02]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.1} roughness={0.9} emissive={selectedEmissive} />
      </mesh>

      {/* Side rails (safety) */}
      {[-width / 2 - 0.05, width / 2 + 0.05].map((z, i) => (
        <mesh key={`rail-${i}`} position={[0, beltY + 0.15, z]} castShadow>
          <boxGeometry args={[length, 0.25, 0.03]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.5} roughness={0.4} emissive={selectedEmissive} />
        </mesh>
      ))}
    </group>
  );
};

export default ConveyorModel;
