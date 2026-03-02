import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface ConveyorModelProps {
  length?: number;
  width?: number;
  isSelected: boolean;
}

const GLBConveyor: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const { scene } = useGLTF('/models/conveyor.glb');
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

  // Normalize size — most Sketchfab models need scaling
  return <primitive object={cloned} scale={[0.01, 0.01, 0.01]} />;
};

const ProceduralConveyor: React.FC<ConveyorModelProps> = ({ length = 5, width = 1, isSelected }) => {
  const em = isSelected ? '#222222' : '#000000';
  const rollerCount = Math.max(3, Math.floor(length / 0.4));

  return (
    <group>
      {/* Frame legs */}
      {[[-length / 2 + 0.15, -width / 2 + 0.05], [-length / 2 + 0.15, width / 2 - 0.05],
        [length / 2 - 0.15, -width / 2 + 0.05], [length / 2 - 0.15, width / 2 - 0.05]].map(([x, z], i) => (
        <mesh key={`leg-${i}`} position={[x, 0.35, z]} castShadow>
          <boxGeometry args={[0.08, 0.7, 0.08]} />
          <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} emissive={em} />
        </mesh>
      ))}

      {/* Side rails */}
      {[-width / 2 - 0.02, width / 2 + 0.02].map((z, i) => (
        <mesh key={`rail-${i}`} position={[0, 0.78, z]} castShadow>
          <boxGeometry args={[length, 0.08, 0.06]} />
          <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.25} emissive={em} />
        </mesh>
      ))}

      {/* Belt surface */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[length - 0.1, 0.04, width - 0.08]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} emissive={em} />
      </mesh>

      {/* Rollers */}
      {Array.from({ length: rollerCount }).map((_, i) => {
        const x = -length / 2 + 0.2 + (i / (rollerCount - 1)) * (length - 0.4);
        return (
          <mesh key={`roller-${i}`} position={[x, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, width - 0.1, 8]} />
            <meshStandardMaterial color="#888888" metalness={0.9} roughness={0.2} emissive={em} />
          </mesh>
        );
      })}

      {/* End drums */}
      {[-length / 2 + 0.05, length / 2 - 0.05].map((x, i) => (
        <mesh key={`drum-${i}`} position={[x, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.06, 0.06, width - 0.1, 12]} />
          <meshStandardMaterial color="#666666" metalness={0.9} roughness={0.2} emissive={em} />
        </mesh>
      ))}

      {/* Cross braces */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[length - 0.3, 0.06, 0.06]} />
        <meshStandardMaterial color="#444444" metalness={0.8} roughness={0.3} emissive={em} />
      </mesh>
    </group>
  );
};

const ConveyorModel: React.FC<ConveyorModelProps> = (props) => {
  return (
    <Suspense fallback={<ProceduralConveyor {...props} />}>
      <GLBConveyor isSelected={props.isSelected} />
    </Suspense>
  );
};

// Preload
useGLTF.preload('/models/conveyor.glb');

export default ConveyorModel;
