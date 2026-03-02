import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface MachineModelProps {
  isSelected: boolean;
}

const MachineModel: React.FC<MachineModelProps> = ({ isSelected }) => {
  const lightRef = useRef<THREE.Mesh>(null);
  const em = isSelected ? '#222222' : '#000000';

  useFrame(({ clock }) => {
    if (lightRef.current) {
      const mat = lightRef.current.material as THREE.MeshStandardMaterial;
      const pulse = (Math.sin(clock.getElapsedTime() * 3) + 1) / 2;
      mat.emissiveIntensity = 0.5 + pulse * 2;
    }
  });

  return (
    <group>
      {/* Main housing */}
      <mesh position={[0, 0.75, 0]} castShadow>
        <boxGeometry args={[2, 1.5, 2]} />
        <meshStandardMaterial color="#5a6a7a" metalness={0.7} roughness={0.4} emissive={em} />
      </mesh>

      {/* Top panel */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[2.05, 0.1, 2.05]} />
        <meshStandardMaterial color="#4a5a6a" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>

      {/* Front door */}
      <mesh position={[0, 0.6, 1.01]}>
        <boxGeometry args={[1.2, 1, 0.02]} />
        <meshStandardMaterial color="#3a4a5a" metalness={0.6} roughness={0.5} emissive={em} />
      </mesh>

      {/* Door handle */}
      <mesh position={[0.4, 0.6, 1.04]} castShadow>
        <boxGeometry args={[0.08, 0.2, 0.04]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} emissive={em} />
      </mesh>

      {/* Window on door */}
      <mesh position={[0, 0.85, 1.02]}>
        <boxGeometry args={[0.6, 0.3, 0.02]} />
        <meshStandardMaterial color="#87ceeb" metalness={0.1} roughness={0.1} transparent opacity={0.6} emissive={em} />
      </mesh>

      {/* Status light tower */}
      <group position={[0.8, 1.6, 0.8]}>
        {/* Pole */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.3, 6]} />
          <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} emissive={em} />
        </mesh>
        {/* Green light */}
        <mesh ref={lightRef} position={[0, 0.35, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
          <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={1} />
        </mesh>
        {/* Yellow light */}
        <mesh position={[0, 0.47, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.1, 8]} />
          <meshStandardMaterial color="#ffaa00" emissive="#332200" emissiveIntensity={0.3} />
        </mesh>
      </group>

      {/* Control panel */}
      <mesh position={[-1.01, 0.9, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.02, 0.5, 0.8]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.5} roughness={0.6} emissive={em} />
      </mesh>

      {/* Ventilation grille */}
      <mesh position={[0, 0.3, -1.01]}>
        <boxGeometry args={[1.5, 0.4, 0.02]} />
        <meshStandardMaterial color="#333333" metalness={0.7} roughness={0.5} emissive={em} />
      </mesh>
    </group>
  );
};

export default MachineModel;
