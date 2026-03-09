import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Actor, useEditorStore } from '../../store/editorStore';
import { actorPathAnimator } from '../../simulation/ActorPathAnimator';
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

const ProceduralOperator: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {/* Body */}
    <mesh position={[0, 0.75, 0]} castShadow>
      <capsuleGeometry args={[0.18, 0.6, 4, 8]} />
      <meshStandardMaterial color={color || '#4f46e5'} metalness={0.1} roughness={0.7} />
    </mesh>
    {/* Head */}
    <mesh position={[0, 1.35, 0]} castShadow>
      <sphereGeometry args={[0.13, 8, 6]} />
      <meshStandardMaterial color="#f5d0a9" metalness={0.05} roughness={0.8} />
    </mesh>
    {/* Hard hat */}
    <mesh position={[0, 1.48, 0]} castShadow>
      <sphereGeometry args={[0.14, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#eab308" metalness={0.3} roughness={0.4} />
    </mesh>
    {/* Legs */}
    <mesh position={[-0.08, 0.22, 0]} castShadow>
      <capsuleGeometry args={[0.06, 0.3, 3, 6]} />
      <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
    </mesh>
    <mesh position={[0.08, 0.22, 0]} castShadow>
      <capsuleGeometry args={[0.06, 0.3, 3, 6]} />
      <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
    </mesh>
  </group>
);

const ActorComponent: React.FC<ActorComponentProps> = ({ actor, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { isPlaying, paths, simulationSpeed } = useEditorStore();
  const lastTimeRef = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;

    // If simulation is running and actor has a path, animate along it
    if (isPlaying && actor.parameters?.pathId) {
      const dt = Math.min(state.clock.getDelta(), 0.1) * simulationSpeed;
      const results = actorPathAnimator.update(dt, paths, [actor]);
      const result = results.get(actor.id);
      if (result) {
        groupRef.current.position.set(result.position[0], result.position[1], result.position[2]);
        groupRef.current.rotation.y = result.rotationY;

        // Walking bob animation
        if (result.state === 'walking') {
          const bobPhase = state.clock.elapsedTime * 8; // walking cadence
          const isOperator = actor.type.startsWith('operator') || actor.type === 'engineer';
          if (isOperator) {
            groupRef.current.position.y += Math.abs(Math.sin(bobPhase)) * 0.03;
          }
        }
        return;
      }
    }

    // Default: selected bounce
    if (isSelected) {
      groupRef.current.position.y = actor.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    } else {
      groupRef.current.position.y = actor.position[1];
    }
  });

  const actorGlbMap: Record<string, { url: string; targetSize: number }> = {
    'forklift': { url: '/models/forklift.glb', targetSize: 3 },
    'agv': { url: '/models/agv.glb', targetSize: 1.5 },
    'operator-1': { url: '/models/operator-1.glb', targetSize: 1.8 },
    'operator-2': { url: '/models/operator-2.glb', targetSize: 1.8 },
    'operator-3': { url: '/models/operator-3.glb', targetSize: 1.8 },
    'pallet-truck': { url: '/models/forklift.glb', targetSize: 2.5 },
  };

  const renderActor = () => {
    const glb = actorGlbMap[actor.type];
    if (glb) {
      return (
        <Suspense fallback={
          actor.type.startsWith('operator') || actor.type === 'engineer'
            ? <ProceduralOperator color={actor.parameters?.color || '#4f46e5'} />
            : <ProceduralForklift isSelected={isSelected} />
        }>
          <GLBModel url={glb.url} targetSize={glb.targetSize} isSelected={isSelected} />
        </Suspense>
      );
    }

    // Fallback procedural models
    if (actor.type.startsWith('operator') || actor.type === 'engineer') {
      return <ProceduralOperator color={actor.parameters?.color || '#4f46e5'} />;
    }

    return <ProceduralForklift isSelected={isSelected} />;
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

      {/* Selection ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Path assignment indicator */}
      {actor.parameters?.pathId && !isPlaying && (
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
};

export default ActorComponent;
