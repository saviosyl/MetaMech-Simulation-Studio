import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface MachineModelProps {
  isSelected: boolean;
}

const GLBMachine: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const { scene } = useGLTF('/models/machine.glb');
  const cloned = scene.clone();
  
  cloned.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
      if (isSelected) {
        mat.emissive = new THREE.Color('#222222');
      }
      mesh.material = mat;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });

  return <primitive object={cloned} scale={[0.01, 0.01, 0.01]} />;
};

const ProceduralMachine: React.FC<MachineModelProps> = ({ isSelected }) => {
  const em = isSelected ? '#222222' : '#000000';

  return (
    <group>
      {/* Base */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[2.2, 0.3, 2.2]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>

      {/* Main housing */}
      <mesh position={[0, 0.95, 0]} castShadow>
        <boxGeometry args={[2, 1.3, 2]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.35} emissive={em} />
      </mesh>

      {/* Top panel */}
      <mesh position={[0, 1.65, 0]} castShadow>
        <boxGeometry args={[2.1, 0.08, 2.1]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.8} roughness={0.25} emissive={em} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.85, 1.01]} castShadow>
        <boxGeometry args={[1.2, 1, 0.03]} />
        <meshStandardMaterial color="#555555" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>
      {/* Door handle */}
      <mesh position={[0.45, 0.85, 1.04]} castShadow>
        <boxGeometry args={[0.06, 0.2, 0.04]} />
        <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} emissive={em} />
      </mesh>

      {/* Window on door */}
      <mesh position={[0, 1.05, 1.02]} castShadow>
        <boxGeometry args={[0.8, 0.4, 0.02]} />
        <meshStandardMaterial color="#1a3a5a" metalness={0.3} roughness={0.1} transparent opacity={0.7} emissive={em} />
      </mesh>

      {/* Status light */}
      <mesh position={[0.85, 1.75, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.06, 0.12, 8]} />
        <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={0.8} />
      </mesh>

      {/* Control panel */}
      <mesh position={[-1.01, 1.0, 0]} rotation={[0, 0, 0.1]} castShadow>
        <boxGeometry args={[0.03, 0.5, 0.6]} />
        <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>
      {/* Screen on control panel */}
      <mesh position={[-1.03, 1.05, 0]} castShadow>
        <boxGeometry args={[0.02, 0.25, 0.35]} />
        <meshStandardMaterial color="#003366" emissive="#003366" emissiveIntensity={0.3} />
      </mesh>
    </group>
  );
};

const MachineModel: React.FC<MachineModelProps> = (props) => {
  return (
    <Suspense fallback={<ProceduralMachine {...props} />}>
      <GLBMachine isSelected={props.isSelected} />
    </Suspense>
  );
};

useGLTF.preload('/models/machine.glb');

export default MachineModel;
