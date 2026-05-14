import React, { Suspense } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { StaticAssetDef } from '../../lib/assetManifest';

interface StaticModelProps {
  assetDef: StaticAssetDef;
  isSelected: boolean;
  onClick: () => void;
}

const GLBModel: React.FC<{ url: string; defaultScale?: [number, number, number] }> = ({ url, defaultScale }) => {
  const { scene } = useGLTF(url);
  const cloned = React.useMemo(() => {
    const c = scene.clone(true);
    if (defaultScale) c.scale.set(...defaultScale);
    return c;
  }, [scene, defaultScale]);

  return <primitive object={cloned} />;
};

const FallbackBox: React.FC = () => (
  <mesh castShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
  </mesh>
);

const StaticModel: React.FC<StaticModelProps> = ({ assetDef, isSelected, onClick }) => {
  return (
    <group
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <Suspense fallback={<FallbackBox />}>
        <GLBModel url={assetDef.glbUrl} defaultScale={assetDef.defaultScale} />
      </Suspense>
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default StaticModel;
