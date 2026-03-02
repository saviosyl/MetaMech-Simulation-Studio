import React, { useRef, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EnvironmentAsset } from '../../store/editorStore';
import { getAssetById, ParametricAssetDef, StaticAssetDef } from '../../lib/assetManifest';
import ParametricModel from './ParametricModel';
import StaticModel from './StaticModel';
import GLBModel from './GLBModel';

interface EnvironmentAssetComponentProps {
  asset: EnvironmentAsset;
  isSelected: boolean;
  onClick: () => void;
}

const EnvironmentAssetComponent: React.FC<EnvironmentAssetComponentProps> = ({ asset, isSelected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  // Check if this asset uses the new asset system
  const assetDef = asset.assetId ? getAssetById(asset.assetId) : undefined;

  if (assetDef) {
    if (assetDef.assetType === 'parametric') {
      return (
        <group position={asset.position} rotation={asset.rotation} scale={asset.scale}>
          <ParametricModel
            assetDef={assetDef as ParametricAssetDef}
            parameters={asset.parameters}
            isSelected={isSelected}
            onClick={onClick}
          />
        </group>
      );
    }
    if (assetDef.assetType === 'static') {
      return (
        <group position={asset.position} rotation={asset.rotation} scale={asset.scale}>
          <StaticModel
            assetDef={assetDef as StaticAssetDef}
            isSelected={isSelected}
            onClick={onClick}
          />
        </group>
      );
    }
  }
  
  // GLB-based environment assets
  const envGlbMap: Record<string, { url: string; targetSize: number }> = {
    'pallet': { url: '/models/pallet.glb', targetSize: 1.2 },
    'cardboard-box': { url: '/models/cardboard-box.glb', targetSize: 0.5 },
  };

  const glb = envGlbMap[asset.type];
  if (glb) {
    return (
      <group
        position={asset.position}
        rotation={asset.rotation}
        scale={asset.scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <Suspense fallback={
          <mesh castShadow><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="#888" /></mesh>
        }>
          <GLBModel url={glb.url} targetSize={glb.targetSize} isSelected={isSelected} />
        </Suspense>
        {isSelected && (
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.8, 1.0, 32]} />
            <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        )}
      </group>
    );
  }

  // Simple animation for selected objects
  useFrame(() => {
    if (meshRef.current && isSelected) {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x444444);
    } else if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).emissive = new THREE.Color(0x000000);
    }
  });

  const getGeometry = () => {
    switch (asset.type) {
      case 'wall':
        const width = asset.parameters.width || 5;
        const height = asset.parameters.height || 3;
        const thickness = asset.parameters.thickness || 0.2;
        return <boxGeometry args={[width, height, thickness]} />;
      
      case 'door':
        return <boxGeometry args={[2, 2.5, 0.1]} />;
      
      case 'window':
        return <boxGeometry args={[2, 1.5, 0.1]} />;
      
      case 'stairs':
        return <boxGeometry args={[2, 2, 5]} />;
      
      case 'safety-rail':
        return <boxGeometry args={[5, 1.2, 0.1]} />;
      
      case 'floor-marking':
        return <boxGeometry args={[5, 0.01, 0.2]} />;
      
      case 'pallet-rack':
        return <boxGeometry args={[3, 4, 1.2]} />;
      
      case 'warehouse-shell':
        return <boxGeometry args={[20, 8, 15]} />;
      
      case 'floor':
        return <boxGeometry args={[50, 0.1, 50]} />;
      
      default:
        return <boxGeometry args={[1, 1, 1]} />;
    }
  };

  const getMaterial = () => {
    const baseColor = getAssetColor(asset.type);
    
    return (
      <meshStandardMaterial 
        color={asset.parameters.color || baseColor}
        metalness={getMetalness(asset.type)}
        roughness={getRoughness(asset.type)}
        transparent={asset.type === 'window'}
        opacity={asset.type === 'window' ? 0.3 : 1.0}
      />
    );
  };

  return (
    <mesh
      ref={meshRef}
      position={asset.position}
      rotation={asset.rotation}
      scale={asset.scale}
      onClick={onClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        document.body.style.cursor = 'auto';
      }}
      castShadow={asset.type !== 'floor'}
      receiveShadow={true}
    >
      {getGeometry()}
      {getMaterial()}
      
      {/* Selection outline */}
      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[(getGeometry() as any).props?.args]} />
          <lineBasicMaterial color="#06b6d4" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
};

function getAssetColor(type: EnvironmentAsset['type']): string {
  const colorMap: Record<EnvironmentAsset['type'], string> = {
    'wall': '#f5f5f5',         // Light gray
    'door': '#8b4513',         // Brown
    'window': '#87ceeb',       // Sky blue
    'stairs': '#d2b48c',       // Tan
    'safety-rail': '#ffff00',  // Yellow
    'floor-marking': '#ffff00', // Yellow
    'pallet-rack': '#ff6b35',  // Orange
    'warehouse-shell': '#e5e7eb', // Light gray
    'floor': '#f0f0f0',        // Very light gray
    'pallet': '#c4a55a',
    'cardboard-box': '#b8860b',
  };
  
  return colorMap[type] || '#6b7280';
}

function getMetalness(type: EnvironmentAsset['type']): number {
  const metalnessMap: Record<EnvironmentAsset['type'], number> = {
    'wall': 0.1,
    'door': 0.2,
    'window': 0.9,
    'stairs': 0.1,
    'safety-rail': 0.8,
    'floor-marking': 0.0,
    'pallet-rack': 0.7,
    'warehouse-shell': 0.2,
    'floor': 0.1,
    'pallet': 0.0,
    'cardboard-box': 0.0,
  };
  
  return metalnessMap[type] || 0.3;
}

function getRoughness(type: EnvironmentAsset['type']): number {
  const roughnessMap: Record<EnvironmentAsset['type'], number> = {
    'wall': 0.8,
    'door': 0.6,
    'window': 0.1,
    'stairs': 0.7,
    'safety-rail': 0.3,
    'floor-marking': 0.9,
    'pallet-rack': 0.4,
    'warehouse-shell': 0.7,
    'floor': 0.8,
    'pallet': 0.9,
    'cardboard-box': 0.9,
  };
  
  return roughnessMap[type] || 0.5;
}

export default EnvironmentAssetComponent;