import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RobotArmModelProps {
  isSelected: boolean;
}

const RobotArmModel: React.FC<RobotArmModelProps> = ({ isSelected }) => {
  const joint1Ref = useRef<THREE.Group>(null);
  const joint2Ref = useRef<THREE.Group>(null);

  const em = isSelected ? '#222222' : '#000000';

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (joint1Ref.current) {
      joint1Ref.current.rotation.y = Math.sin(t * 0.5) * 0.3;
    }
    if (joint2Ref.current) {
      joint2Ref.current.rotation.z = Math.sin(t * 0.7) * 0.2 - 0.3;
    }
  });

  return (
    <group>
      {/* Base plate */}
      <mesh position={[0, 0.05, 0]} castShadow>
        <cylinderGeometry args={[0.6, 0.7, 0.1, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.2} emissive={em} />
      </mesh>

      {/* Base column */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.4, 0.5, 12]} />
        <meshStandardMaterial color="#f5c518" metalness={0.7} roughness={0.3} emissive={em} />
      </mesh>

      {/* Rotating base (J1) */}
      <group ref={joint1Ref} position={[0, 0.6, 0]}>
        {/* J1 housing */}
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.3, 0.35, 0.3, 12]} />
          <meshStandardMaterial color="#f5c518" metalness={0.7} roughness={0.3} emissive={em} />
        </mesh>

        {/* Lower arm (J2) */}
        <group ref={joint2Ref} position={[0, 0.3, 0]}>
          {/* Joint sphere */}
          <mesh castShadow>
            <sphereGeometry args={[0.18, 12, 8]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} emissive={em} />
          </mesh>

          {/* Lower arm segment */}
          <mesh position={[0, 0.7, 0]} castShadow>
            <boxGeometry args={[0.2, 1.2, 0.2]} />
            <meshStandardMaterial color="#f5c518" metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>

          {/* Upper arm (J3) */}
          <group position={[0, 1.3, 0]}>
            <mesh castShadow>
              <sphereGeometry args={[0.15, 12, 8]} />
              <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} emissive={em} />
            </mesh>

            {/* Upper arm segment */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[0.15, 0.8, 0.15]} />
              <meshStandardMaterial color="#f5c518" metalness={0.7} roughness={0.3} emissive={em} />
            </mesh>

            {/* Wrist (J4/J5) */}
            <group position={[0, 0.9, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[0.1, 10, 6]} />
                <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.3} emissive={em} />
              </mesh>

              {/* End effector / gripper */}
              <mesh position={[0, 0.15, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.05, 0.2, 8]} />
                <meshStandardMaterial color="#666666" metalness={0.9} roughness={0.2} emissive={em} />
              </mesh>

              {/* Gripper fingers */}
              {[-0.06, 0.06].map((x, i) => (
                <mesh key={i} position={[x, 0.3, 0]} castShadow>
                  <boxGeometry args={[0.02, 0.1, 0.04]} />
                  <meshStandardMaterial color="#999999" metalness={0.9} roughness={0.2} emissive={em} />
                </mesh>
              ))}
            </group>
          </group>
        </group>
      </group>

      {/* Cable conduit */}
      <mesh position={[0.15, 0.3, 0.15]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 6]} />
        <meshStandardMaterial color="#222222" metalness={0.3} roughness={0.7} emissive={em} />
      </mesh>

      {/* FANUC label plate */}
      <mesh position={[0, 0.35, 0.41]} castShadow>
        <boxGeometry args={[0.3, 0.1, 0.01]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.5} roughness={0.5} emissive={em} />
      </mesh>
    </group>
  );
};

export default RobotArmModel;
