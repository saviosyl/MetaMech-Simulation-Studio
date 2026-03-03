import React from 'react';

interface SinkModelProps {
  isSelected: boolean;
}

/** Sink = small red transparent circle on the ground — acts as an endpoint */
const SinkModel: React.FC<SinkModelProps> = ({ isSelected }) => {
  return (
    <group>
      {/* Circle on ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.4, 32]} />
        <meshStandardMaterial
          color="#ef4444"
          transparent
          opacity={isSelected ? 0.6 : 0.35}
          emissive="#ef4444"
          emissiveIntensity={isSelected ? 0.4 : 0.15}
        />
      </mesh>
      {/* Ring outline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[0.35, 0.4, 32]} />
        <meshStandardMaterial
          color="#ef4444"
          emissive="#ef4444"
          emissiveIntensity={0.5}
        />
      </mesh>
      {/* Arrow pointing inward */}
      <mesh position={[-0.5, 0.05, 0]} rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

export default SinkModel;
