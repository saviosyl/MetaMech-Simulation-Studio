import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Actor } from '../../store/editorStore';
import GLBModel from './GLBModel';

interface ActorComponentProps {
  actor: Actor;
  isSelected: boolean;
  onClick: () => void;
}

const ProceduralForklift: React.FC<{ isSelected: boolean }> = ({ isSelected: _isSelected }) => (
  <group>
    <mesh position={[0, 0.5, 0]} castShadow>
      <boxGeometry args={[2, 1, 1.5]} />
      <meshStandardMaterial color="#ff6b35" metalness={0.6} roughness={0.3} />
    </mesh>
    {[[-0.7, 0.6], [-0.7, -0.6], [0.7, 0.6], [0.7, -0.6]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.15, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.2]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
    ))}
    <mesh position={[0.8, 2, 0]} castShadow>
      <boxGeometry args={[0.1, 4, 0.1]} />
      <meshStandardMaterial color="#666666" />
    </mesh>
    {[0.3, -0.3].map((z, i) => (
      <mesh key={i} position={[1.2, 0.3, z]} castShadow>
        <boxGeometry args={[1, 0.05, 0.1]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    ))}
  </group>
);

const ActorComponent: React.FC<ActorComponentProps> = ({ actor, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = actor.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    } else if (groupRef.current) {
      groupRef.current.position.y = actor.position[1];
    }
  });

  const actorGlbMap: Record<string, { url: string; targetSize: number }> = {
    'forklift': { url: '/models/forklift.glb', targetSize: 3 },
    'agv': { url: '/models/agv.glb', targetSize: 1.5 },
    'operator': { url: '/models/worker.glb', targetSize: 1.8 },
    'engineer': { url: '/models/worker.glb', targetSize: 1.8 },
    'pallet-truck': { url: '/models/pallet-truck.glb', targetSize: 2 },
  };

  const renderActor = () => {
    const glb = actorGlbMap[actor.type];
    if (glb) {
      return (
        <Suspense fallback={<ProceduralForklift isSelected={isSelected} />}>
          <GLBModel url={glb.url} targetSize={glb.targetSize} isSelected={isSelected} />
        </Suspense>
      );
    }

    return (
      <mesh castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
    );
  };

  return (
    <group
      ref={groupRef}
      position={actor.position}
      rotation={actor.rotation}
      scale={actor.scale}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {renderActor()}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default ActorComponent;
