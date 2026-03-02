import React from 'react';
import { Text, Line } from '@react-three/drei';
import { useEditorStore } from '../../store/editorStore';

const MeasurementTool: React.FC = () => {
  const { measureActive, measurePoints } = useEditorStore();

  if (!measureActive || measurePoints.length < 2) return null;

  const p1 = measurePoints[0];
  const p2 = measurePoints[1];
  const dist = Math.sqrt(
    (p2[0] - p1[0]) ** 2 + (p2[1] - p1[1]) ** 2 + (p2[2] - p1[2]) ** 2
  );
  const mid: [number, number, number] = [
    (p1[0] + p2[0]) / 2,
    (p1[1] + p2[1]) / 2 + 0.3,
    (p1[2] + p2[2]) / 2,
  ];

  return (
    <group>
      <Line
        points={[p1, p2]}
        color="#ef4444"
        lineWidth={2}
      />
      {/* Endpoint markers */}
      <mesh position={p1}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      <mesh position={p2}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ef4444" />
      </mesh>
      {/* Distance label */}
      <Text
        position={mid}
        fontSize={0.3}
        color="#ef4444"
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#ffffff"
      >
        {dist.toFixed(2)}m
      </Text>
    </group>
  );
};

export default MeasurementTool;
