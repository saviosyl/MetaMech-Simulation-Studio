import React from 'react';

interface BufferModelProps {
  isSelected: boolean;
}

const BufferModel: React.FC<BufferModelProps> = ({ isSelected }) => {
  const em = isSelected ? '#222222' : '#000000';

  return (
    <group>
      {/* Table surface */}
      <mesh position={[0, 0.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 0.08, 3]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>

      {/* Table legs */}
      {[[-0.85, -1.3], [-0.85, 1.3], [0.85, -1.3], [0.85, 1.3]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.37, z]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.74, 8]} />
          <meshStandardMaterial color="#888888" metalness={0.8} roughness={0.3} emissive={em} />
        </mesh>
      ))}

      {/* Side rails */}
      {[-1.35, 1.35].map((z, i) => (
        <mesh key={i} position={[0, 0.85, z]} castShadow>
          <boxGeometry args={[2, 0.12, 0.04]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.6} roughness={0.4} emissive={em} />
        </mesh>
      ))}

      {/* Sample products on table */}
      {[[-0.5, 0], [0.2, -0.4], [0.3, 0.5]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.87, z]} castShadow>
          <boxGeometry args={[0.3, 0.15, 0.3]} />
          <meshStandardMaterial color="#8b5cf6" metalness={0.3} roughness={0.6} emissive={em} />
        </mesh>
      ))}
    </group>
  );
};

export default BufferModel;
