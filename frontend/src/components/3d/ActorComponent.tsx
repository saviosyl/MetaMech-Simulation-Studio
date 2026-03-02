import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { Actor } from '../../store/editorStore';

interface ActorComponentProps {
  actor: Actor;
  isSelected: boolean;
  onClick: () => void;
}

const GLBForklift: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const { scene } = useGLTF('/models/forklift.glb');
  const cloned = scene.clone();
  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      if (isSelected) mat.emissive = new THREE.Color('#222222');
      mesh.material = mat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
  return <primitive object={cloned} scale={[0.01, 0.01, 0.01]} />;
};

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

  const renderActor = () => {
    switch (actor.type) {
      case 'operator':
      case 'engineer': {
        const color = actor.parameters.color || '#4f46e5';
        return (
          <group>
            <mesh position={[0, 1, 0]} castShadow>
              <capsuleGeometry args={[0.3, 1]} />
              <meshStandardMaterial color={color} />
            </mesh>
            <mesh position={[0, 1.7, 0]} castShadow>
              <sphereGeometry args={[0.15]} />
              <meshStandardMaterial color="#fdbcbc" />
            </mesh>
            {[-0.4, 0.4].map((x, i) => (
              <mesh key={i} position={[x, 1, 0]} rotation={[0, 0, x > 0 ? -0.3 : 0.3]} castShadow>
                <capsuleGeometry args={[0.1, 0.6]} />
                <meshStandardMaterial color="#fdbcbc" />
              </mesh>
            ))}
            {[-0.15, 0.15].map((x, i) => (
              <mesh key={`leg-${i}`} position={[x, 0.4, 0]} castShadow>
                <capsuleGeometry args={[0.12, 0.8]} />
                <meshStandardMaterial color={color} />
              </mesh>
            ))}
            {actor.type === 'engineer' && (
              <mesh position={[0, 1.88, 0]} castShadow>
                <cylinderGeometry args={[0.17, 0.16, 0.08, 12]} />
                <meshStandardMaterial color="#f5f5f5" />
              </mesh>
            )}
          </group>
        );
      }

      case 'forklift':
        return (
          <Suspense fallback={<ProceduralForklift isSelected={isSelected} />}>
            <GLBForklift isSelected={isSelected} />
          </Suspense>
        );

      case 'agv':
        return (
          <group>
            <mesh position={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[1.5, 0.3, 1]} />
              <meshStandardMaterial color="#06b6d4" metalness={0.7} roughness={0.2} />
            </mesh>
            {[[-0.6, 0.4], [-0.6, -0.4], [0.6, 0.4], [0.6, -0.4]].map(([x, z], i) => (
              <mesh key={i} position={[x, 0.08, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.1]} />
                <meshStandardMaterial color="#2d2d2d" />
              </mesh>
            ))}
            <mesh position={[0, 0.4, 0.5]} castShadow>
              <cylinderGeometry args={[0.05, 0.05, 0.1]} />
              <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[0.3, 0.05, 0.1]} />
              <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.2} />
            </mesh>
          </group>
        );

      default:
        return (
          <mesh castShadow>
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

useGLTF.preload('/models/forklift.glb');

export default ActorComponent;
