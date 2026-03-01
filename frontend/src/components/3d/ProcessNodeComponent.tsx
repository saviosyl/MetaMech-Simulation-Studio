import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ProcessNode } from '../../store/editorStore';

interface ProcessNodeComponentProps {
  node: ProcessNode;
  isSelected: boolean;
  onClick: () => void;
}

const ProcessNodeComponent: React.FC<ProcessNodeComponentProps> = ({ node, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Simple animation for selected objects
  useFrame(() => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = node.position[1] + Math.sin(Date.now() * 0.003) * 0.1;
    } else if (meshRef.current) {
      meshRef.current.position.y = node.position[1];
    }
  });

  const getGeometry = () => {
    switch (node.type) {
      case 'source':
        return <boxGeometry args={[1.5, 1, 1]} />;
      case 'sink':
        return <boxGeometry args={[1.5, 1, 1]} />;
      case 'conveyor':
        const length = node.parameters.length || 5;
        const width = node.parameters.width || 1;
        return <boxGeometry args={[length, 0.2, width]} />;
      case 'buffer':
        return <boxGeometry args={[2, 0.8, 3]} />;
      case 'machine':
        return <boxGeometry args={[2, 1.5, 2]} />;
      case 'router':
        return <cylinderGeometry args={[1, 1, 0.5, 6]} />;
      case 'transfer-bridge':
        return <boxGeometry args={[2, 0.3, 1]} />;
      case 'popup-transfer':
        return <boxGeometry args={[3, 0.4, 1]} />;
      case 'pusher-transfer':
        return <boxGeometry args={[3, 0.3, 1]} />;
      case 'spiral-conveyor':
        return <cylinderGeometry args={[2, 2, 5, 16]} />;
      case 'vertical-lifter':
        return <boxGeometry args={[1.5, 3, 1.5]} />;
      case 'pick-and-place':
        return <boxGeometry args={[1, 2, 1]} />;
      case 'palletizer':
        return <boxGeometry args={[3, 2.5, 2]} />;
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  const getMaterial = () => {
    const baseColor = getNodeColor(node.type);
    const emissive = isSelected ? 0x444444 : 0x000000;
    
    return (
      <meshStandardMaterial 
        color={baseColor}
        emissive={emissive}
        metalness={0.7}
        roughness={0.3}
        transparent={isSelected}
        opacity={isSelected ? 0.8 : 1.0}
      />
    );
  };

  return (
    <mesh
      ref={meshRef}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
      castShadow
      receiveShadow
    >
      {getGeometry()}
      {getMaterial()}
      
      {/* Selection outline */}
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[getGeometry().args as any]} />
          <lineBasicMaterial color="#06b6d4" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
};

function getNodeColor(type: ProcessNode['type']): string {
  const colorMap: Record<ProcessNode['type'], string> = {
    'source': '#10b981',       // Green
    'sink': '#ef4444',         // Red  
    'conveyor': '#6b7280',     // Gray
    'buffer': '#f59e0b',       // Amber
    'machine': '#3b82f6',      // Blue
    'router': '#8b5cf6',       // Purple
    'transfer-bridge': '#6b7280', // Gray
    'popup-transfer': '#06b6d4',  // Cyan
    'pusher-transfer': '#06b6d4', // Cyan
    'spiral-conveyor': '#6b7280', // Gray
    'vertical-lifter': '#f59e0b', // Amber
    'pick-and-place': '#ec4899', // Pink
    'palletizer': '#84cc16',     // Lime
  };
  
  return colorMap[type] || '#6b7280';
}

export default ProcessNodeComponent;