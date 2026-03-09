import React from 'react';

interface SinkModelProps {
  isSelected: boolean;
}

/** Product Out — transparent green down-arrow icon on the ground */
const SinkModel: React.FC<SinkModelProps> = ({ isSelected }) => {
  const green = '#10b981';
  return (
    <group>
      {/* Ground circle — transparent green fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshStandardMaterial
          color={green}
          transparent
          opacity={isSelected ? 0.25 : 0.1}
        />
      </mesh>
      {/* Ring outline — green */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.35, 0.4, 32]} />
        <meshStandardMaterial
          color={green}
          transparent
          opacity={isSelected ? 0.8 : 0.5}
          emissive={green}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Down arrow shaft */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.06, 0.25, 0.06]} />
        <meshStandardMaterial
          color={green}
          transparent
          opacity={isSelected ? 0.85 : 0.6}
          emissive={green}
          emissiveIntensity={0.2}
        />
      </mesh>
      {/* Down arrow head (cone pointing down) */}
      <mesh position={[0, 0.08, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.12, 0.18, 8]} />
        <meshStandardMaterial
          color={green}
          transparent
          opacity={isSelected ? 0.85 : 0.6}
          emissive={green}
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Small input direction indicator */}
      <mesh position={[-0.5, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.04, 0.12, 6]} />
        <meshStandardMaterial color={green} transparent opacity={0.4} emissive={green} emissiveIntensity={0.2} />
      </mesh>
    </group>
  );
};

export default SinkModel;
