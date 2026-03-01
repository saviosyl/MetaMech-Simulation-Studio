import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Actor } from '../../store/editorStore';

interface ActorComponentProps {
  actor: Actor;
  isSelected: boolean;
  onClick: () => void;
}

const ActorComponent: React.FC<ActorComponentProps> = ({ actor, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Simple animation for selected objects
  useFrame((state) => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = actor.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    } else if (groupRef.current) {
      groupRef.current.position.y = actor.position[1];
    }
  });

  const getActorGeometry = () => {
    switch (actor.type) {
      case 'operator':
      case 'engineer':
        // Simplified humanoid figure using capsule/cylinders
        return (
          <group>
            {/* Body */}
            <mesh position={[0, 1, 0]}>
              <capsuleGeometry args={[0.3, 1]} />
              <meshStandardMaterial color={actor.parameters.color || '#4f46e5'} />
            </mesh>
            
            {/* Head */}
            <mesh position={[0, 1.7, 0]}>
              <sphereGeometry args={[0.15]} />
              <meshStandardMaterial color="#fdbcbc" />
            </mesh>
            
            {/* Arms */}
            <mesh position={[-0.4, 1, 0]} rotation={[0, 0, 0.3]}>
              <capsuleGeometry args={[0.1, 0.6]} />
              <meshStandardMaterial color="#fdbcbc" />
            </mesh>
            <mesh position={[0.4, 1, 0]} rotation={[0, 0, -0.3]}>
              <capsuleGeometry args={[0.1, 0.6]} />
              <meshStandardMaterial color="#fdbcbc" />
            </mesh>
            
            {/* Legs */}
            <mesh position={[-0.15, 0.4, 0]}>
              <capsuleGeometry args={[0.12, 0.8]} />
              <meshStandardMaterial color={actor.parameters.color || '#4f46e5'} />
            </mesh>
            <mesh position={[0.15, 0.4, 0]}>
              <capsuleGeometry args={[0.12, 0.8]} />
              <meshStandardMaterial color={actor.parameters.color || '#4f46e5'} />
            </mesh>
          </group>
        );
      
      case 'forklift':
        return (
          <group>
            {/* Main body */}
            <mesh position={[0, 0.5, 0]}>
              <boxGeometry args={[2, 1, 1.5]} />
              <meshStandardMaterial color="#ff6b35" metalness={0.6} roughness={0.3} />
            </mesh>
            
            {/* Wheels */}
            <mesh position={[-0.7, 0.15, 0.6]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.2]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            <mesh position={[-0.7, 0.15, -0.6]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.2]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            <mesh position={[0.7, 0.15, 0.6]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.2]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            <mesh position={[0.7, 0.15, -0.6]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.15, 0.15, 0.2]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            
            {/* Mast */}
            <mesh position={[0.8, 2, 0]}>
              <boxGeometry args={[0.1, 4, 0.1]} />
              <meshStandardMaterial color="#666666" />
            </mesh>
            
            {/* Forks */}
            <mesh position={[1.2, 0.3, 0.3]}>
              <boxGeometry args={[1, 0.05, 0.1]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
            <mesh position={[1.2, 0.3, -0.3]}>
              <boxGeometry args={[1, 0.05, 0.1]} />
              <meshStandardMaterial color="#888888" />
            </mesh>
          </group>
        );
      
      case 'agv':
        return (
          <group>
            {/* Main platform */}
            <mesh position={[0, 0.2, 0]}>
              <boxGeometry args={[1.5, 0.3, 1]} />
              <meshStandardMaterial color="#06b6d4" metalness={0.7} roughness={0.2} />
            </mesh>
            
            {/* Wheels */}
            <mesh position={[-0.6, 0.08, 0.4]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.1]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            <mesh position={[-0.6, 0.08, -0.4]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.1]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            <mesh position={[0.6, 0.08, 0.4]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.1]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            <mesh position={[0.6, 0.08, -0.4]} rotation={[Math.PI/2, 0, 0]}>
              <cylinderGeometry args={[0.08, 0.08, 0.1]} />
              <meshStandardMaterial color="#2d2d2d" />
            </mesh>
            
            {/* Sensors */}
            <mesh position={[0, 0.4, 0.5]}>
              <cylinderGeometry args={[0.05, 0.05, 0.1]} />
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
            </mesh>
            
            {/* Battery indicator */}
            <mesh position={[0, 0.4, 0]}>
              <boxGeometry args={[0.3, 0.05, 0.1]} />
              <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.2} />
            </mesh>
          </group>
        );
      
      default:
        return (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
        );
    }
  };

  return (
    <group
      ref={groupRef}
      position={actor.position}
      rotation={actor.rotation}
      scale={actor.scale}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
    >
      {getActorGeometry()}
      
      {/* Selection outline */}
      {isSelected && (
        <mesh>
          <ringGeometry args={[1, 1.2, 16]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default ActorComponent;