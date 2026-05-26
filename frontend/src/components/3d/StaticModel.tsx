import React from 'react';
import * as THREE from 'three';
import { StaticAssetDef } from '../../lib/assetManifest';
import { loadModelObject } from '../../lib/modelLoader';

interface StaticModelProps {
  assetDef: StaticAssetDef;
  parameters?: Record<string, any>;
  isSelected: boolean;
  onClick: () => void;
}

const RuntimeModel: React.FC<{ assetDef: StaticAssetDef; parameters?: Record<string, any> }> = ({ assetDef, parameters }) => {
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
    const format = assetDef.sourceFormat || 'glb';
    if (assetDef.defaultScale) {
      // For OEM OBJ/STEP imports, loadModelObject already normalizes native units
      // (mm -> m) by pre-scaling to 0.001. Preserve that base scale and apply
      // defaultScale as a multiplier instead of replacing it.
      const preserveLoaderUnitScale = assetDef.id.startsWith('oem-') && (format === 'obj' || format === 'step');
      if (preserveLoaderUnitScale) {
        instance.scale.multiply(new THREE.Vector3(
          assetDef.defaultScale[0],
          assetDef.defaultScale[1],
          assetDef.defaultScale[2],
        ));
      } else {
        instance.scale.set(...assetDef.defaultScale);
      }
    }

    // OEM workflow standard: model dimensions are authored in millimeters.
    // Normalize to scene meters explicitly for GLB/GLTF at runtime.
    if (assetDef.id.startsWith('oem-')) {
      if (format === 'glb' || format === 'gltf') {
        const scaleVector = assetDef.defaultScale || [1, 1, 1];
        const legacyMmScale =
          Math.abs(scaleVector[0] - 0.001) < 0.00001 &&
          Math.abs(scaleVector[1] - 0.001) < 0.00001 &&
          Math.abs(scaleVector[2] - 0.001) < 0.00001;
        // Older OEM entries may already have 0.001 in defaultScale.
        // Neutralize that legacy embed so mm->m conversion is applied exactly once.
        if (legacyMmScale) instance.scale.multiplyScalar(1000);
        instance.scale.multiplyScalar(0.001);
      }

      if (assetDef.oemParametric?.enabled) {
        const baseSizeMm = assetDef.oemParametric.baseSizeMm || [1000, 300, 120];
        const editableAxes = assetDef.oemParametric.editableAxes || [true, true, true];
        const requestedSizeMm: [number, number, number] = [
          Number(parameters?.oemLengthMm),
          Number(parameters?.oemWidthMm),
          Number(parameters?.oemHeightMm),
        ];
        const axisScale: [number, number, number] = [1, 1, 1];
        for (let axis = 0; axis < 3; axis += 1) {
          if (!editableAxes[axis]) continue;
          const base = Number(baseSizeMm[axis]);
          const requested = requestedSizeMm[axis];
          if (!Number.isFinite(base) || base <= 0) continue;
          if (!Number.isFinite(requested) || requested <= 0) continue;
          axisScale[axis] = THREE.MathUtils.clamp(requested / base, 0.01, 200);
        }
        instance.scale.multiply(new THREE.Vector3(axisScale[0], axisScale[1], axisScale[2]));
      }

      // Very loose safety guardrails to avoid broken imports while preserving
      // real-world dimensions in meters for normal OEM models.
      const normalizedBox = new THREE.Box3().setFromObject(instance);
      const normalizedSize = normalizedBox.getSize(new THREE.Vector3());
      const normalizedMaxDim = Math.max(normalizedSize.x, normalizedSize.y, normalizedSize.z);
      if (Number.isFinite(normalizedMaxDim) && normalizedMaxDim > 0) {
        if (normalizedMaxDim > 60) {
          instance.scale.multiplyScalar(60 / normalizedMaxDim);
        } else if (normalizedMaxDim < 0.005) {
          instance.scale.multiplyScalar(0.005 / normalizedMaxDim);
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
        mesh.frustumCulled = false;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return instance;
  }, [model, assetDef, parameters]);

  if (!cloned) return <FallbackBox />;
  return <primitive object={cloned} />;
};

const FallbackBox: React.FC = () => (
  <mesh castShadow>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#888888" metalness={0.5} roughness={0.5} />
  </mesh>
);

const StaticModel: React.FC<StaticModelProps> = ({ assetDef, parameters, isSelected, onClick }) => {
  return (
    <group
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      <RuntimeModel assetDef={assetDef} parameters={parameters} />
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
