import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ProcessNode } from '../../store/editorStore';
import { getAssetById, ParametricAssetDef, StaticAssetDef } from '../../lib/assetManifest';
import ParametricModel from './ParametricModel';
import StaticModel from './StaticModel';
import GLBModel from './GLBModel';
import SourceModel from './models/SourceModel';
import SinkModel from './models/SinkModel';
import BufferModel from './models/BufferModel';

interface ProcessNodeComponentProps {
  node: ProcessNode;
  isSelected: boolean;
  onClick: () => void;
}

const ProcessNodeComponent: React.FC<ProcessNodeComponentProps> = ({ node, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = node.position[1] + Math.sin(Date.now() * 0.003) * 0.05;
    } else if (groupRef.current) {
      groupRef.current.position.y = node.position[1];
    }
  });

  // Check if this node uses the new asset system
  const assetDef = node.assetId ? getAssetById(node.assetId) : undefined;

  if (assetDef) {
    if (assetDef.assetType === 'parametric') {
      return (
        <group
          ref={groupRef}
          position={node.position}
          rotation={node.rotation}
          scale={node.scale}
        >
          <ParametricModel
            assetDef={assetDef as ParametricAssetDef}
            parameters={node.parameters}
            isSelected={isSelected}
            onClick={onClick}
          />
        </group>
      );
    }
    if (assetDef.assetType === 'static') {
      return (
        <group
          ref={groupRef}
          position={node.position}
          rotation={node.rotation}
          scale={node.scale}
        >
          <StaticModel
            assetDef={assetDef as StaticAssetDef}
            isSelected={isSelected}
            onClick={onClick}
          />
        </group>
      );
    }
  }

  // Map types to GLB files with target sizes
  const glbMap: Record<string, { url: string; targetSize: number }> = {
    'conveyor': { url: '/models/conveyor.glb', targetSize: 5 },
    'pick-and-place': { url: '/models/fanuc-robot.glb', targetSize: 2 },
    'machine': { url: '/models/machine.glb', targetSize: 2 },
    'palletizer': { url: '/models/fanuc-robot.glb', targetSize: 2 },
    'machine-static': { url: '/models/machine.glb', targetSize: 2 },
    'fanuc-robot': { url: '/models/fanuc-robot.glb', targetSize: 2 },
  };

  const renderModel = () => {
    const glb = glbMap[node.type];
    if (glb) {
      return (
        <Suspense fallback={<FallbackBox color={getNodeColor(node.type)} isSelected={isSelected} />}>
          <GLBModel url={glb.url} targetSize={glb.targetSize} isSelected={isSelected} />
        </Suspense>
      );
    }
    switch (node.type) {
      case 'source':
        return <SourceModel isSelected={isSelected} />;
      case 'sink':
        return <SinkModel isSelected={isSelected} />;
      case 'buffer':
        return <BufferModel isSelected={isSelected} />;
      default:
        return <GenericModel type={node.type} isSelected={isSelected} params={node.parameters} />;
    }
  };

  return (
    <group
      ref={groupRef}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {renderModel()}
      
      {/* Selection highlight ring */}
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

// Fallback while GLB loads
const FallbackBox: React.FC<{ color: string; isSelected: boolean }> = ({ color, isSelected }) => (
  <mesh position={[0, 0.5, 0]} castShadow>
    <boxGeometry args={[1.5, 1, 1]} />
    <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={isSelected ? '#222222' : '#000000'} />
  </mesh>
);

// Generic model for types that don't have a dedicated model yet
const GenericModel: React.FC<{ type: string; isSelected: boolean; params: Record<string, any> }> = ({ type, isSelected, params: _params }) => {
  const em = isSelected ? '#222222' : '#000000';
  const color = getNodeColor(type);

  switch (type) {
    case 'router':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.8, 1, 0.6, 6]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} emissive={em} />
          </mesh>
          {/* Direction arrows */}
          {[0, Math.PI / 2, Math.PI].map((r, i) => (
            <mesh key={i} position={[Math.cos(r) * 0.9, 0.3, Math.sin(r) * 0.9]} rotation={[0, -r + Math.PI / 2, 0]} castShadow>
              <coneGeometry args={[0.08, 0.2, 4]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
          ))}
        </group>
      );

    case 'transfer-bridge':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[2, 0.15, 1]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
          {[-0.8, 0.8].map((x, i) => (
            <mesh key={i} position={[x, 0.35, 0]} castShadow>
              <boxGeometry args={[0.1, 0.15, 1.1]} />
              <meshStandardMaterial color="#ffcc00" metalness={0.5} roughness={0.4} emissive={em} />
            </mesh>
          ))}
        </group>
      );

    case 'spiral-conveyor':
      return (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.3, 16]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} emissive={em} />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 4.7, 12]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
          {/* Spiral segments */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const y = 0.5 + (i / 8) * 4;
            return (
              <mesh key={i} position={[Math.cos(angle) * 0.8, y, Math.sin(angle) * 0.8]} castShadow>
                <boxGeometry args={[0.6, 0.05, 0.3]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} emissive={em} />
              </mesh>
            );
          })}
        </group>
      );

    case 'vertical-lifter':
      return (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow>
            <boxGeometry args={[1.5, 0.3, 1.5]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} emissive={em} />
          </mesh>
          {/* Vertical columns */}
          {[[-0.6, -0.6], [-0.6, 0.6], [0.6, -0.6], [0.6, 0.6]].map(([x, z], i) => (
            <mesh key={i} position={[x, 1.5, z]} castShadow>
              <boxGeometry args={[0.1, 2.7, 0.1]} />
              <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
            </mesh>
          ))}
          {/* Platform */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <boxGeometry args={[1.2, 0.1, 1.2]} />
            <meshStandardMaterial color="#888888" metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
        </group>
      );

    default:
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.5, 1, 1]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
        </group>
      );
  }
};

function getNodeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'source': '#10b981',
    'sink': '#ef4444',
    'conveyor': '#6b7280',
    'buffer': '#f59e0b',
    'machine': '#3b82f6',
    'router': '#8b5cf6',
    'transfer-bridge': '#6b7280',
    'popup-transfer': '#06b6d4',
    'pusher-transfer': '#06b6d4',
    'spiral-conveyor': '#6b7280',
    'vertical-lifter': '#f59e0b',
    'pick-and-place': '#ec4899',
    'palletizer': '#84cc16',
  };
  return colorMap[type] || '#6b7280';
}

export default ProcessNodeComponent;
