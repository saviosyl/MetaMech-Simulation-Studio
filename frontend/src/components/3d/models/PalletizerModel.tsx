import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface PalletizerModelProps {
  isSelected: boolean;
}

const PalletizerModel: React.FC<PalletizerModelProps> = ({ isSelected }) => {
  const armRef = useRef<THREE.Group>(null);
  const em = isSelected ? '#222222' : '#000000';

  useFrame(({ clock }) => {
    if (armRef.current) {
      armRef.current.rotation.y = Math.sin(clock.getElapsedTime() * 0.4) * 0.5;
    }
  });

  return (
    <group>
      {/* Base platform */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[3, 0.2, 2]} />
        <meshStandardMaterial color="#4a4a4a" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>

      {/* Column */}
      <mesh position={[-0.8, 1.25, 0]} castShadow>
        <boxGeometry args={[0.4, 2.3, 0.4]} />
        <meshStandardMaterial color="#84cc16" metalness={0.6} roughness={0.4} emissive={em} />
      </mesh>

      {/* Arm assembly */}
      <group ref={armRef} position={[-0.8, 2.4, 0]}>
        {/* Horizontal arm */}
        <mesh position={[0.8, 0, 0]} castShadow>
          <boxGeometry args={[1.8, 0.2, 0.25]} />
          <meshStandardMaterial color="#84cc16" metalness={0.6} roughness={0.4} emissive={em} />
        </mesh>
        {/* Gripper */}
        <mesh position={[1.6, -0.2, 0]} castShadow>
          <boxGeometry args={[0.4, 0.3, 0.6]} />
          <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.3} emissive={em} />
        </mesh>
      </group>

      {/* Pallet on platform */}
      <mesh position={[0.8, 0.28, 0]} castShadow>
        <boxGeometry args={[1.2, 0.15, 0.8]} />
        <meshStandardMaterial color="#c4a050" metalness={0.1} roughness={0.8} emissive={em} />
      </mesh>

      {/* Stacked boxes on pallet */}
      {[[0, 0], [0.35, 0], [-0.35, 0]].map(([x, z], i) => (
        <mesh key={i} position={[0.8 + x, 0.55, z]} castShadow>
          <boxGeometry args={[0.3, 0.35, 0.3]} />
          <meshStandardMaterial color="#a0522d" metalness={0.2} roughness={0.7} emissive={em} />
        </mesh>
      ))}

      {/* Safety fence posts */}
      {[[1.6, -1.1], [1.6, 1.1], [-1.6, -1.1], [-1.6, 1.1]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.6, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 1, 6]} />
          <meshStandardMaterial color="#ffcc00" metalness={0.5} roughness={0.4} emissive={em} />
        </mesh>
      ))}
    </group>
  );
};

export default PalletizerModel;
