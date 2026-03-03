import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEditorStore, getConnectionPorts } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';
import { Product } from '../../simulation/Product';

/** Render a single product based on its type and size */
const ProductMesh: React.FC<{ product: Product }> = ({ product }) => {
  const [pL, pW, pH] = product.size;
  const halfH = pH / 2;

  switch (product.type) {
    case 'cylinder':
    case 'bottle':
      return (
        <group position={[product.currentPosition[0], product.currentPosition[1] + halfH, product.currentPosition[2]]}>
          <mesh castShadow>
            <cylinderGeometry args={[pW / 2, pW / 2, pH, 12]} />
            <meshStandardMaterial color={product.color} metalness={0.2} roughness={0.6} />
          </mesh>
          {product.type === 'bottle' && (
            <mesh position={[0, pH / 2 + pH * 0.15, 0]} castShadow>
              <cylinderGeometry args={[pW / 5, pW / 4, pH * 0.3, 8]} />
              <meshStandardMaterial color={product.color} metalness={0.3} roughness={0.5} />
            </mesh>
          )}
        </group>
      );

    case 'pallet':
      return (
        <group position={[product.currentPosition[0], product.currentPosition[1] + halfH, product.currentPosition[2]]}>
          <mesh castShadow>
            <boxGeometry args={[pL, pH * 0.15, pW]} />
            <meshStandardMaterial color="#c4a574" metalness={0.1} roughness={0.8} />
          </mesh>
          {[-0.35, 0, 0.35].map((xf, i) => (
            <mesh key={i} position={[xf * pL, -pH * 0.3, 0]} castShadow>
              <boxGeometry args={[pL * 0.08, pH * 0.5, pW]} />
              <meshStandardMaterial color="#b8995a" metalness={0.1} roughness={0.9} />
            </mesh>
          ))}
          <mesh position={[0, pH * 0.4, 0]} castShadow>
            <boxGeometry args={[pL * 0.9, pH * 0.6, pW * 0.9]} />
            <meshStandardMaterial color={product.color} metalness={0.2} roughness={0.6} />
          </mesh>
        </group>
      );

    case 'tote':
      return (
        <group position={[product.currentPosition[0], product.currentPosition[1] + halfH, product.currentPosition[2]]}>
          <mesh castShadow>
            <boxGeometry args={[pL, pH, pW]} />
            <meshStandardMaterial color={product.color} metalness={0.4} roughness={0.5} />
          </mesh>
          <mesh position={[0, pH * 0.45, 0]} castShadow>
            <boxGeometry args={[pL * 1.02, pH * 0.08, pW * 1.02]} />
            <meshStandardMaterial color={product.color} metalness={0.5} roughness={0.4} />
          </mesh>
        </group>
      );

    case 'box':
    default:
      return (
        <group position={[product.currentPosition[0], product.currentPosition[1] + halfH, product.currentPosition[2]]}>
          <mesh castShadow>
            <boxGeometry args={[pL, pH, pW]} />
            <meshStandardMaterial color={product.color} metalness={0.1} roughness={0.7} />
          </mesh>
          {/* Tape line */}
          <mesh position={[0, pH * 0.5 + 0.001, 0]}>
            <boxGeometry args={[pL * 0.15, 0.002, pW * 1.01]} />
            <meshStandardMaterial color="#d4a574" />
          </mesh>
        </group>
      );
  }
};

const SimulationOverlay: React.FC = () => {
  const { isPlaying, simulationSpeed, processNodes, edges } = useEditorStore();
  const initialized = useRef(false);

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
        return <ProductMesh key={product.id} product={product} />;
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
                <mesh position={[0, 0, 0]}>
                  <boxGeometry args={[1, 0.1, 0.02]} />
                  <meshBasicMaterial color="#333333" transparent opacity={0.7} />
                </mesh>
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
