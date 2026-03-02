import React from 'react';

interface SourceModelProps {
  isSelected: boolean;
}

const SourceModel: React.FC<SourceModelProps> = ({ isSelected }) => {
  const em = isSelected ? '#222222' : '#000000';

  return (
    <group>
      {/* Hopper top (wider) */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.8, 0.5, 0.6, 8]} />
        <meshStandardMaterial color="#10b981" metalness={0.6} roughness={0.4} emissive={em} />
      </mesh>

      {/* Hopper body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.5, 0.5, 0.8, 8]} />
        <meshStandardMaterial color="#0d9668" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>

      {/* Chute */}
      <mesh position={[0.5, 0.25, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[0.8, 0.15, 0.5]} />
        <meshStandardMaterial color="#6b7280" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>

      {/* Base frame */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[1.2, 0.3, 1.2]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>

      {/* Legs */}
      {[[-0.4, -0.4], [-0.4, 0.4], [0.4, -0.4], [0.4, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0, z]} castShadow>
          <boxGeometry args={[0.1, 0.3, 0.1]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.4} emissive={em} />
        </mesh>
      ))}

      {/* Arrow indicator (output direction) */}
      <mesh position={[0.9, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
        <coneGeometry args={[0.1, 0.2, 6]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

export default SourceModel;
