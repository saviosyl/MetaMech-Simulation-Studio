/**
 * CustomModelRenderer — Renders imported custom 3D models in the scene
 */
import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { TransformControls } from '@react-three/drei';
import { useEditorStore, CustomModel } from '../../store/editorStore';
import { useDracoGLTF } from '../../lib/gltfLoaders';

const CustomGLB: React.FC<{ url: string; isSelected: boolean }> = ({ url, isSelected }) => {
  const { scene } = useDracoGLTF(url);
  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    // Compute bounding box and center on ground
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.sub(center);
    clone.position.y += size.y / 2;

    clone.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (isSelected && mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.emissive = new THREE.Color('#1a1a2e');
          mat.emissiveIntensity = 0.3;
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [scene, isSelected]);

  return <primitive object={cloned} />;
};

const FallbackBox: React.FC = () => (
  <mesh castShadow position={[0, 0.5, 0]}>
    <boxGeometry args={[1, 1, 1]} />
    <meshStandardMaterial color="#888888" wireframe transparent opacity={0.5} />
  </mesh>
);

const CustomModelObject: React.FC<{
  model: CustomModel;
  isSelected: boolean;
  orbitRef: React.RefObject<any>;
}> = ({ model, isSelected, orbitRef }) => {
  const { updateCustomModel, setSelectedObject, activeTool, setIsDragging } = useEditorStore();
  const groupRef = useRef<THREE.Group>(null!);
  const transformRef = useRef<any>(null);

  useEffect(() => {
    if (!isSelected || !transformRef.current) return;
    const controls = transformRef.current;
    const onDrag = (event: any) => {
      if (orbitRef.current) orbitRef.current.enabled = !event.value;
      setIsDragging(event.value);
    };
    const onChange = () => {
      if (!groupRef.current) return;
      const p = groupRef.current.position;
      const r = groupRef.current.rotation;
      const s = groupRef.current.scale;
      updateCustomModel(model.id, {
        position: [p.x, p.y, p.z],
        rotation: [r.x, r.y, r.z],
        scale: [s.x, s.y, s.z],
      });
    };
    controls.addEventListener('dragging-changed', onDrag);
    controls.addEventListener('objectChange', onChange);
    return () => {
      controls.removeEventListener('dragging-changed', onDrag);
      controls.removeEventListener('objectChange', onChange);
    };
  }, [isSelected, model.id]);

  const showTransform = isSelected && ['move', 'rotate', 'scale'].includes(activeTool);

  return (
    <group>
      {showTransform ? (
        <TransformControls
          ref={transformRef}
          mode={activeTool === 'move' ? 'translate' : activeTool === 'rotate' ? 'rotate' : 'scale'}
          object={groupRef.current || undefined}
        >
          <group
            ref={groupRef}
            position={model.position}
            rotation={model.rotation}
            scale={model.scale}
            onClick={e => { e.stopPropagation(); setSelectedObject(model.id, 'environment'); }}
          >
            <Suspense fallback={<FallbackBox />}>
              <CustomGLB url={model.glbUrl} isSelected={isSelected} />
            </Suspense>
          </group>
        </TransformControls>
      ) : (
        <group
          ref={groupRef}
          position={model.position}
          rotation={model.rotation}
          scale={model.scale}
          onClick={e => { e.stopPropagation(); setSelectedObject(model.id, 'environment'); }}
          onPointerOver={e => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
          onPointerOut={() => { document.body.style.cursor = 'auto'; }}
        >
          <Suspense fallback={<FallbackBox />}>
            <CustomGLB url={model.glbUrl} isSelected={isSelected} />
          </Suspense>
          {isSelected && (
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[1.2, 1.4, 32]} />
              <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      )}
    </group>
  );
};

const CustomModelRenderer: React.FC<{ orbitRef: React.RefObject<any> }> = ({ orbitRef }) => {
  const { customModels, selectedObjectId } = useEditorStore();

  if (customModels.length === 0) return null;

  return (
    <group>
      {customModels.map(model => (
        <CustomModelObject
          key={model.id}
          model={model}
          isSelected={selectedObjectId === model.id}
          orbitRef={orbitRef}
        />
      ))}
    </group>
  );
};

export default CustomModelRenderer;
