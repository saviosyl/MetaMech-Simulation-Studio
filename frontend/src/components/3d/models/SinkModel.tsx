import React from 'react';

interface SinkModelProps {
  isSelected: boolean;
}

const SinkModel: React.FC<SinkModelProps> = ({ isSelected }) => {
  const em = isSelected ? '#222222' : '#000000';

  return (
    <group>
      {/* Bin body */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.4, 1, 1]} />
        <meshStandardMaterial color="#ef4444" metalness={0.6} roughness={0.4} emissive={em} />
      </mesh>

      {/* Open top rim */}
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[1.5, 0.06, 1.1]} />
        <meshStandardMaterial color="#dc2626" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>
      <mesh position={[0, 1.02, 0]} castShadow>
        <boxGeometry args={[1.1, 0.06, 1.5 - 0.06]} />
        <meshStandardMaterial color="#dc2626" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>

      {/* Wheels */}
      {[[-0.5, -0.4], [-0.5, 0.4], [0.5, -0.4], [0.5, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.06, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.04, 8]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} emissive={em} />
        </mesh>
      ))}

      {/* Arrow indicator (input direction) */}
      <mesh position={[-0.9, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <coneGeometry args={[0.1, 0.2, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

export default SinkModel;
