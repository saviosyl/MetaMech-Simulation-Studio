import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';

import { useEditorStore } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';

const SimulationOverlay: React.FC = () => {
  const { isPlaying, simulationSpeed, processNodes, edges } = useEditorStore();
  const initialized = useRef(false);

  // Initialize simulation when play starts
  React.useEffect(() => {
    if (isPlaying && !initialized.current) {
      simulationEngine.init(processNodes, edges);
      initialized.current = true;
    }
    if (!isPlaying) {
      initialized.current = false;
    }
  }, [isPlaying, processNodes, edges]);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    simulationEngine.tick(Math.min(delta, 0.1), simulationSpeed);
  });

  if (!isPlaying) return null;

  const products = simulationEngine.getProducts();
  const nodeStatsMap = simulationEngine.getNodeStats();

  return (
    <group>
      {/* Animated products */}
      {products.map(product => {
        if (product.state === 'completed') return null;
        return (
          <mesh key={product.id} position={product.currentPosition}>
            <boxGeometry args={[0.2, 0.2, 0.2]} />
            <meshStandardMaterial
              color={product.color}
              emissive={product.color}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}

      {/* Node stats overlays */}
      {processNodes.map(node => {
        const stats = nodeStatsMap.get(node.id);
        if (!stats) return null;

        return (
          <group key={`stats-${node.id}`}>
            {/* Utilization bar for machines */}
            {(node.type === 'machine' || node.type === 'pick-and-place') && (
              <group position={[node.position[0], node.position[1] + 2.2, node.position[2]]}>
                {/* Background bar */}
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[1, 0.1, 0.02]} />
                  <meshBasicMaterial color="#333333" transparent opacity={0.7} />
                </mesh>
                {/* Fill bar */}
                <mesh position={[(stats.utilization - 1) * 0.5, 0, 0.01]}>
                  <boxGeometry args={[Math.max(0.01, stats.utilization), 0.1, 0.02]} />
                  <meshBasicMaterial
                    color={stats.utilization > 0.9 ? '#ef4444' : stats.utilization > 0.7 ? '#f59e0b' : '#10b981'}
                  />
                </mesh>
                <Text
                  position={[0, 0.15, 0]}
                  fontSize={0.12}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                >
                  {`${Math.round(stats.utilization * 100)}%`}
                </Text>
              </group>
            )}

            {/* Queue indicator for buffers */}
            {node.type === 'buffer' && stats.queueLength > 0 && (
              <group position={[node.position[0], node.position[1] + 1.5, node.position[2]]}>
                <Text
                  fontSize={0.15}
                  color="#f59e0b"
                  anchorX="center"
                  anchorY="middle"
                >
                  {`Q: ${stats.queueLength}/${node.parameters.capacity || 10}`}
                </Text>
              </group>
            )}

            {/* Counter for sources/sinks */}
            {(node.type === 'source' || node.type === 'sink') && (
              <group position={[node.position[0], node.position[1] + 1.8, node.position[2]]}>
                <Text
                  fontSize={0.15}
                  color={node.type === 'source' ? '#10b981' : '#ef4444'}
                  anchorX="center"
                  anchorY="middle"
                >
                  {`${stats.throughput}`}
                </Text>
              </group>
            )}

            {/* Processing indicator */}
            {stats.processing && (
              <mesh position={[node.position[0], node.position[1] + 1.8, node.position[2]]}>
                <sphereGeometry args={[0.08, 8, 8]} />
                <meshBasicMaterial color="#f59e0b" />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

export default SimulationOverlay;
