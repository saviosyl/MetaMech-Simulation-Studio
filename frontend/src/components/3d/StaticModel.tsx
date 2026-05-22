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

    // OEM uploads may come from mm-authored GLB/GLTF exports.
    // If dimensions are implausibly large in scene units, normalize to meters.
    if (assetDef.id.startsWith('oem-')) {
      const preBox = new THREE.Box3().setFromObject(instance);
      const preSize = preBox.getSize(new THREE.Vector3());
      const maxDim = Math.max(preSize.x, preSize.y, preSize.z);
      const format = assetDef.sourceFormat || 'glb';
      const looksLikeMillimeters = Number.isFinite(maxDim) && maxDim > 80;
      const likelyMmGlb = (format === 'glb' || format === 'gltf') && Number.isFinite(maxDim) && maxDim > 25;
      if (looksLikeMillimeters || likelyMmGlb) {
        instance.scale.multiplyScalar(0.001);
      }

      // Permanent OEM normalization guardrails:
      // keep model sizes in a sensible visualization range in meters.
      const normalizedBox = new THREE.Box3().setFromObject(instance);
      const normalizedSize = normalizedBox.getSize(new THREE.Vector3());
      const normalizedMaxDim = Math.max(normalizedSize.x, normalizedSize.y, normalizedSize.z);
      if (Number.isFinite(normalizedMaxDim) && normalizedMaxDim > 0) {
        if (normalizedMaxDim > 2.5) {
          instance.scale.multiplyScalar(2.5 / normalizedMaxDim);
        } else if (normalizedMaxDim < 0.02) {
          instance.scale.multiplyScalar(0.03 / normalizedMaxDim);
        }
      }
    }

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
        if (!mesh.geometry.getAttribute('normal')) {
          mesh.geometry.computeVertexNormals();
        }
        if (assetDef.id.startsWith('oem-')) {
          const tuneMaterial = (material: THREE.Material): THREE.Material => {
            if (material instanceof THREE.MeshStandardMaterial) {
              const tuned = material.clone();
              tuned.color = tuned.color.clone().multiplyScalar(0.78);
              tuned.metalness = Math.min(0.35, Math.max(0.05, tuned.metalness ?? 0.16));
              tuned.roughness = Math.min(1, Math.max(0.45, tuned.roughness ?? 0.62));
              tuned.envMapIntensity = Math.min(0.45, Math.max(0.12, tuned.envMapIntensity ?? 0.24));
              tuned.side = THREE.DoubleSide;
              return tuned;
            }
            const rawColor = (material as any)?.color;
            const color = rawColor && rawColor.isColor
              ? (rawColor as THREE.Color).clone().multiplyScalar(0.78)
              : new THREE.Color('#8a96a4');
            return new THREE.MeshStandardMaterial({
              color,
              metalness: 0.12,
              roughness: 0.72,
              envMapIntensity: 0.22,
              side: THREE.DoubleSide,
            });
          };
          if (Array.isArray(mesh.material)) {
            mesh.material = mesh.material.map((material) => tuneMaterial(material));
          } else if (mesh.material) {
            mesh.material = tuneMaterial(mesh.material as THREE.Material);
          }
        }
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
