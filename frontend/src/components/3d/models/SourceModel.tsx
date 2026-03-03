import React from 'react';

interface SourceModelProps {
  isSelected: boolean;
}

/** Source = small green transparent circle on the ground — acts as a spawn point */
const SourceModel: React.FC<SourceModelProps> = ({ isSelected }) => {
  return (
    <group>
      {/* Circle on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshStandardMaterial
          color="#10b981"
          transparent
          opacity={isSelected ? 0.6 : 0.35}
          emissive="#10b981"
          emissiveIntensity={isSelected ? 0.4 : 0.15}
        />
      </mesh>
      {/* Ring outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.35, 0.4, 32]} />
        <meshStandardMaterial
          color="#10b981"
          emissive="#10b981"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Small arrow showing output direction */}
      <mesh position={[0.5, 0.05, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshStandardMaterial color="#10b981" emissive="#10b981" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

export default SourceModel;
