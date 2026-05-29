import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
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

/** Product label — rendered on front + side faces with auto-sizing */
const ProductLabel: React.FC<{ label: string; color: string; pL: number; pW: number; pH: number }> = ({ label, color, pL, pW, pH }) => {
  // Auto-size: font scales to fit the face, capped for readability
  const frontFontSize = Math.min(pH * 0.35, pL * 0.3, 0.06);
  const sideFontSize = Math.min(pH * 0.35, pW * 0.3, 0.06);
  return (
    <>
      {/* Front face (+Z) */}
      <Text position={[0, 0, pW / 2 + 0.001]} fontSize={frontFontSize} color={color} anchorX="center" anchorY="middle" maxWidth={pL * 0.85}>
        {label}
      </Text>
      {/* Back face (-Z) */}
      <Text position={[0, 0, -pW / 2 - 0.001]} rotation={[0, Math.PI, 0]} fontSize={frontFontSize} color={color} anchorX="center" anchorY="middle" maxWidth={pL * 0.85}>
        {label}
      </Text>
      {/* Right side (+X) */}
      <Text position={[pL / 2 + 0.001, 0, 0]} rotation={[0, Math.PI / 2, 0]} fontSize={sideFontSize} color={color} anchorX="center" anchorY="middle" maxWidth={pW * 0.85}>
        {label}
      </Text>
      {/* Left side (-X) */}
      <Text position={[-pL / 2 - 0.001, 0, 0]} rotation={[0, -Math.PI / 2, 0]} fontSize={sideFontSize} color={color} anchorX="center" anchorY="middle" maxWidth={pW * 0.85}>
        {label}
      </Text>
    </>
  );
};

/** Subtle edge outline to keep touching products visually distinct */
const ProductOutline: React.FC<{ pL: number; pW: number; pH: number }> = ({ pL, pW, pH }) => (
  <lineSegments renderOrder={12}>
    <edgesGeometry args={[new THREE.BoxGeometry(pL, pH, pW)]} />
    <lineBasicMaterial
      color="#e5e7eb"
      transparent
      opacity={0.32}
      depthTest={true}
    />
  </lineSegments>
);

/** Render a single animated product using refs for smooth motion */
const ProductMesh: React.FC<{ product: Product }> = ({ product }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [pL, pW, pH] = product.size;
  const halfH = pH / 2;
  const mathRef = useRef({
    forward: new THREE.Vector3(),
    right: new THREE.Vector3(),
    up: new THREE.Vector3(),
    worldUp: new THREE.Vector3(0, 1, 0),
    targetQ: new THREE.Quaternion(),
    basis: new THREE.Matrix4(),
  });

  // Update position and rotation every frame via ref (no re-render needed)
  useFrame(() => {
    if (groupRef.current) {
      const math = mathRef.current;
      const fallbackYaw = product.currentRotationY ?? 0;
      const tangent = product.currentTangent ?? [Math.sin(fallbackYaw), 0, Math.cos(fallbackYaw)];

      math.forward.set(tangent[0], tangent[1], tangent[2]);
      if (math.forward.lengthSq() < 1e-8) {
        math.forward.set(Math.sin(fallbackYaw), 0, Math.cos(fallbackYaw));
      }
      math.forward.normalize();

      // Build a stable orientation basis: X-forward along path (matches box geometry length axis),
      // Y-up constrained to world-up as much as possible.
      math.right.crossVectors(math.forward, math.worldUp);
      if (math.right.lengthSq() < 1e-8) {
        math.right.set(0, 0, 1).cross(math.forward);
      }
      math.right.normalize();
      math.up.crossVectors(math.right, math.forward).normalize();

      math.basis.makeBasis(math.forward, math.up, math.right);
      math.targetQ.setFromRotationMatrix(math.basis);

      // Smooth transition across straight↔incline segment boundaries.
      groupRef.current.quaternion.slerp(math.targetQ, 0.18);

      // Place center so product sits on conveyor surface even when tilted.
      groupRef.current.position.set(
        product.currentPosition[0] + math.up.x * halfH,
        product.currentPosition[1] + math.up.y * halfH,
        product.currentPosition[2] + math.up.z * halfH,
      );
    }
  });

  switch (product.type) {
    case 'cylinder':
    case 'bottle': {
      const cylTex = useProductTexture(product.textureUrl);
      return (
        <group ref={groupRef}>
          <mesh castShadow>
            <cylinderGeometry args={[pW / 2, pW / 2, pH, 12]} />
            {cylTex ? (
              <meshStandardMaterial map={cylTex} metalness={0.2} roughness={0.6} />
            ) : (
              <meshStandardMaterial color={product.color} metalness={0.2} roughness={0.6} />
            )}
          </mesh>
          {product.type === 'bottle' && (
            <mesh position={[0, pH / 2 + pH * 0.15, 0]} castShadow>
              <cylinderGeometry args={[pW / 5, pW / 4, pH * 0.3, 8]} />
              <meshStandardMaterial color={product.color} metalness={0.3} roughness={0.5} />
            </mesh>
          )}
          {product.label && (
            <ProductLabel label={product.label} color={product.labelColor || '#fff'} pL={pW} pW={pW} pH={pH} />
          )}
        </group>
      );
    }

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
          <ProductOutline pL={pL} pW={pW} pH={pH} />
        </group>
      );

    case 'tote': {
      const toteTex = useProductTexture(product.textureUrl);
      return (
        <group ref={groupRef}>
          <mesh castShadow>
            <boxGeometry args={[pL, pH, pW]} />
            {toteTex ? (
              <meshStandardMaterial map={toteTex} metalness={0.4} roughness={0.5} />
            ) : (
              <meshStandardMaterial color={product.color} metalness={0.4} roughness={0.5} />
            )}
          </mesh>
          <mesh position={[0, pH * 0.45, 0]} castShadow>
            <boxGeometry args={[pL * 1.02, pH * 0.08, pW * 1.02]} />
            <meshStandardMaterial color={product.color} metalness={0.5} roughness={0.4} />
          </mesh>
          <ProductOutline pL={pL} pW={pW} pH={pH} />
          {product.label && (
            <ProductLabel label={product.label} color={product.labelColor || '#fff'} pL={pL} pW={pW} pH={pH} />
          )}
        </group>
      );
    }

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
            <mesh position={[0, pH * 0.5 + 0.001, 0]} rotation={[0, Math.PI / 2, 0]}>
              <boxGeometry args={[pW * 0.2, 0.002, pL * 0.62]} />
              <meshStandardMaterial color="#d4a574" />
            </mesh>
          )}
          <ProductOutline pL={pL} pW={pW} pH={pH} />
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
