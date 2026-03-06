import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useEditorStore } from '../../store/editorStore';
import { simulationEngine } from '../../simulation/SimulationEngine';
import { Product } from '../../simulation/Product';
import * as THREE from 'three';

/** Cached texture loader */
const textureCache = new Map<string, THREE.Texture>();
function useProductTexture(url?: string): THREE.Texture | null {
  return useMemo(() => {
    if (!url) return null;
    if (textureCache.has(url)) return textureCache.get(url)!;
    const loader = new THREE.TextureLoader();
    const tex = loader.load(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    textureCache.set(url, tex);
    return tex;
  }, [url]);
}

/** Product label — rendered as Text on the top face */
const ProductLabel: React.FC<{ label: string; color: string; pL: number; pW: number; pH: number }> = ({ label, color, pL, pW, pH }) => (
  <Text
    position={[0, pH / 2 + 0.002, 0]}
    rotation={[-Math.PI / 2, 0, 0]}
    fontSize={Math.min(pL, pW) * 0.4}
    color={color}
    anchorX="center"
    anchorY="middle"
    maxWidth={pL * 0.9}
  >
    {label}
  </Text>
);

/** Render a single animated product using refs for smooth motion */
const ProductMesh: React.FC<{ product: Product }> = ({ product }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [pL, pW, pH] = product.size;
  const halfH = pH / 2;

  // Update position and rotation every frame via ref (no re-render needed)
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.set(
        product.currentPosition[0],
        product.currentPosition[1] + halfH,
        product.currentPosition[2]
      );
      // Smooth rotation: follow path tangent (Y-axis rotation)
      const targetRot = product.currentRotationY ?? 0;
      const currentRot = groupRef.current.rotation.y;
      // Lerp rotation for smooth transitions (avoid snapping)
      let delta = targetRot - currentRot;
      // Normalize to [-PI, PI]
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      groupRef.current.rotation.y = currentRot + delta * 0.15;
    }
  });

  switch (product.type) {
    case 'cylinder':
    case 'bottle':
      return (
        <group ref={groupRef}>
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
        <group ref={groupRef}>
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
        <group ref={groupRef}>
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
    default: {
      const texture = useProductTexture(product.textureUrl);
      return (
        <group ref={groupRef}>
          <mesh castShadow>
            <boxGeometry args={[pL, pH, pW]} />
            {texture ? (
              <meshStandardMaterial map={texture} metalness={0.1} roughness={0.7} />
            ) : (
              <meshStandardMaterial color={product.color} metalness={0.1} roughness={0.7} />
            )}
          </mesh>
          {!texture && (
            <mesh position={[0, pH * 0.5 + 0.001, 0]}>
              <boxGeometry args={[pL * 0.15, 0.002, pW * 1.01]} />
              <meshStandardMaterial color="#d4a574" />
            </mesh>
          )}
          {product.label && (
            <ProductLabel label={product.label} color={product.labelColor || '#fff'} pL={pL} pW={pW} pH={pH} />
          )}
        </group>
      );
    }
  }
};

const SimulationOverlay: React.FC = () => {
  const { isPlaying, isPaused, simulationSpeed, processNodes, edges } = useEditorStore();
  const initialized = useRef(false);
  const [, setTick] = useState(0);

  React.useEffect(() => {
    if (isPlaying && !initialized.current) {
      simulationEngine.init(processNodes, edges);
      initialized.current = true;
    }
    // Only reset on true reset (not paused, not playing)
    if (!isPlaying && !isPaused) {
      initialized.current = false;
      simulationEngine.reset();
      setTick(0);
    }
  }, [isPlaying, isPaused, processNodes, edges]);

  useFrame((_, delta) => {
    if (!isPlaying) return; // Paused: skip tick but keep products
    simulationEngine.tick(Math.min(delta, 0.1), simulationSpeed);
    // Force re-render every ~100ms to pick up new/removed products
    setTick(t => t + 1);
  });

  // Show products when playing OR paused (not when fully reset)
  if (!isPlaying && !isPaused) return null;

  const products = simulationEngine.getProducts();
  const nodeStatsMap = simulationEngine.getNodeStats();

  return (
    <group>
      {/* Animated products — each uses useFrame + ref for smooth motion */}
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
            {(node.type === 'machine' || node.type === 'pick-and-place') && (
              <group position={[node.position[0], node.position[1] + 2.2, node.position[2]]}>
                <mesh><boxGeometry args={[1, 0.1, 0.02]} /><meshBasicMaterial color="#333333" transparent opacity={0.7} /></mesh>
                <mesh position={[(stats.utilization - 1) * 0.5, 0, 0.01]}>
                  <boxGeometry args={[Math.max(0.01, stats.utilization), 0.1, 0.02]} />
                  <meshBasicMaterial color={stats.utilization > 0.9 ? '#ef4444' : stats.utilization > 0.7 ? '#f59e0b' : '#10b981'} />
                </mesh>
                <Text position={[0, 0.15, 0]} fontSize={0.12} color="white" anchorX="center" anchorY="middle">
                  {`${Math.round(stats.utilization * 100)}%`}
                </Text>
              </group>
            )}

            {node.type === 'buffer' && stats.queueLength > 0 && (
              <group position={[node.position[0], node.position[1] + 1.5, node.position[2]]}>
                <Text fontSize={0.15} color="#f59e0b" anchorX="center" anchorY="middle">
                  {`Q: ${stats.queueLength}/${node.parameters.capacity || 10}`}
                </Text>
              </group>
            )}

            {(node.type === 'source' || node.type === 'sink') && (
              <group position={[node.position[0], node.position[1] + 1.0, node.position[2]]}>
                <Text fontSize={0.15} color={node.type === 'source' ? '#10b981' : '#ef4444'} anchorX="center" anchorY="middle">
                  {`${stats.throughput}`}
                </Text>
              </group>
            )}

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
