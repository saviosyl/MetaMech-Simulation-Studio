import React, { Suspense } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface RobotArmModelProps {
  isSelected: boolean;
}

const GLBRobot: React.FC<{ isSelected: boolean }> = ({ isSelected }) => {
  const { scene } = useGLTF('/models/fanuc-robot.glb');
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

const ProceduralRobot: React.FC<RobotArmModelProps> = ({ isSelected }) => {
  const em = isSelected ? '#222222' : '#000000';
  const yellow = '#FFCC00';
  const dark = '#2a2a2a';

  return (
    <group>
      {/* Base plate */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.65, 0.1, 16]} />
        <meshStandardMaterial color={dark} metalness={0.9} roughness={0.2} emissive={em} />
      </mesh>

      {/* Base pedestal */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.4, 0.5, 0.4, 12]} />
        <meshStandardMaterial color={yellow} metalness={0.6} roughness={0.35} emissive={em} />
      </mesh>

      {/* Shoulder joint */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <sphereGeometry args={[0.22, 12, 12]} />
        <meshStandardMaterial color={dark} metalness={0.8} roughness={0.2} emissive={em} />
      </mesh>

      {/* Upper arm */}
      <mesh position={[0, 1.1, 0.1]} rotation={[0.2, 0, 0]} castShadow>
        <boxGeometry args={[0.2, 0.9, 0.25]} />
        <meshStandardMaterial color={yellow} metalness={0.6} roughness={0.35} emissive={em} />
      </mesh>

      {/* Elbow joint */}
      <mesh position={[0, 1.55, 0.25]} castShadow>
        <sphereGeometry args={[0.15, 12, 12]} />
        <meshStandardMaterial color={dark} metalness={0.8} roughness={0.2} emissive={em} />
      </mesh>

      {/* Forearm */}
      <mesh position={[0, 1.55, 0.7]} rotation={[Math.PI / 2.5, 0, 0]} castShadow>
        <boxGeometry args={[0.15, 0.8, 0.18]} />
        <meshStandardMaterial color={yellow} metalness={0.6} roughness={0.35} emissive={em} />
      </mesh>

      {/* Wrist joint */}
      <mesh position={[0, 1.35, 1.1]} castShadow>
        <sphereGeometry args={[0.1, 10, 10]} />
        <meshStandardMaterial color={dark} metalness={0.8} roughness={0.2} emissive={em} />
      </mesh>

      {/* End effector / gripper */}
      <mesh position={[0, 1.35, 1.25]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.08, 0.2, 8]} />
        <meshStandardMaterial color={dark} metalness={0.8} roughness={0.2} emissive={em} />
      </mesh>
      {/* Gripper fingers */}
      {[-0.06, 0.06].map((x, i) => (
        <mesh key={i} position={[x, 1.35, 1.38]} castShadow>
          <boxGeometry args={[0.02, 0.08, 0.08]} />
          <meshStandardMaterial color="#666666" metalness={0.8} roughness={0.2} emissive={em} />
        </mesh>
      ))}

      {/* FANUC label area */}
      <mesh position={[0.11, 0.9, 0.05]} castShadow>
        <boxGeometry args={[0.01, 0.15, 0.12]} />
        <meshStandardMaterial color="#cc0000" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
};

const RobotArmModel: React.FC<RobotArmModelProps> = (props) => {
  return (
    <Suspense fallback={<ProceduralRobot {...props} />}>
      <GLBRobot isSelected={props.isSelected} />
    </Suspense>
  );
};

useGLTF.preload('/models/fanuc-robot.glb');

export default RobotArmModel;
