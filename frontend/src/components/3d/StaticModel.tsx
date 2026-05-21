import React from 'react';
import * as THREE from 'three';
import { StaticAssetDef } from '../../lib/assetManifest';
import { loadModelObject } from '../../lib/modelLoader';

interface StaticModelProps {
  assetDef: StaticAssetDef;
  isSelected: boolean;
  onClick: () => void;
}

const RuntimeModel: React.FC<{ assetDef: StaticAssetDef }> = ({ assetDef }) => {
  const [model, setModel] = React.useState<THREE.Object3D | null>(null);

  React.useEffect(() => {
    let mounted = true;
    setModel(null);
    (async () => {
      try {
        const object = await loadModelObject(assetDef.glbUrl, assetDef.sourceFormat);
        if (!mounted) return;
        setModel(object);
      } catch (error) {
        console.warn('Failed to load static model', assetDef.id, error);
      }
    })();
    return () => { mounted = false; };
  }, [assetDef.id, assetDef.glbUrl, assetDef.sourceFormat]);

  const cloned = React.useMemo(() => {
    if (!model) return null;
    const instance = model.clone(true);
    if (assetDef.defaultScale) instance.scale.set(...assetDef.defaultScale);
    const shouldGroundToPlane = assetDef.category === 'environment'
      || assetDef.category === 'actors'
      || !assetDef.connectionPorts
      || assetDef.connectionPorts.length === 0;
    if (shouldGroundToPlane) {
      const bounds = new THREE.Box3().setFromObject(instance);
      if (Number.isFinite(bounds.min.y)) {
        instance.position.y += -bounds.min.y;
      }
    }
    instance.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return instance;
  }, [model, assetDef.defaultScale]);

  if (!cloned) return <FallbackBox />;
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
      <RuntimeModel assetDef={assetDef} />
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
