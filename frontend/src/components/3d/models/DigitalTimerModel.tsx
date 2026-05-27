import React, { useRef, useState } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEditorStore } from '../../../store/editorStore';
import { simulationEngine } from '../../../simulation/SimulationEngine';

interface DigitalTimerModelProps {
  isSelected: boolean;
}

function formatElapsed(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const DigitalTimerModel: React.FC<DigitalTimerModelProps> = ({ isSelected }) => {
  const isPlaying = useEditorStore((state) => state.isPlaying);
  const isPaused = useEditorStore((state) => state.isPaused);
  const [display, setDisplay] = useState('00:00:00');
  const lastSecondRef = useRef(-1);

  useFrame(() => {
    const simSeconds = Math.floor(Math.max(0, (isPlaying || isPaused) ? simulationEngine.simTime : 0));
    if (simSeconds === lastSecondRef.current) return;
    lastSecondRef.current = simSeconds;
    setDisplay(formatElapsed(simSeconds));
  });

  return (
    <group position={[0, 0.17, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.82, 0.34, 0.14]} />
        <meshStandardMaterial
          color={isSelected ? '#1f2d3f' : '#111827'}
          metalness={0.35}
          roughness={0.55}
          emissive={isSelected ? '#0f766e' : '#000000'}
          emissiveIntensity={isSelected ? 0.22 : 0}
        />
      </mesh>

      <mesh position={[0, 0, 0.073]}>
        <planeGeometry args={[0.7, 0.21]} />
        <meshStandardMaterial color="#04070c" metalness={0.2} roughness={0.45} />
      </mesh>

      <Text
        position={[0, 0, 0.076]}
        fontSize={0.092}
        color="#ef4444"
        anchorX="center"
        anchorY="middle"
      >
        {display}
      </Text>

      <mesh position={[-0.27, 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 12]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.27, 0.19, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.03, 12]} />
        <meshStandardMaterial color="#9ca3af" metalness={0.8} roughness={0.25} />
      </mesh>
    </group>
  );
};

export default DigitalTimerModel;
