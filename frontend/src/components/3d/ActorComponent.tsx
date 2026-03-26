import React, { useRef, Suspense, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAnimations } from '@react-three/drei';
import { Actor, useEditorStore } from '../../store/editorStore';
import { actorPathAnimator } from '../../simulation/ActorPathAnimator';
import { useDracoGLTF } from '../../lib/gltfLoaders';

interface ActorComponentProps {
  actor: Actor;
  isSelected: boolean;
  onClick: () => void;
}

/** Animated GLB model with walk animation support */
const AnimatedGLBModel: React.FC<{
  url: string;
  targetSize: number;
  isSelected: boolean;
  playAnimation: boolean;
  /** Extra Y rotation baked into the model to face +Z (forward) */
  modelRotationY?: number;
}> = ({ url, targetSize, isSelected, playAnimation, modelRotationY = 0 }) => {
  const { scene, animations } = useDracoGLTF(url);
  const groupRef = useRef<THREE.Group>(null!);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    // Compute bounding box
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);

    // Center horizontally, sit on ground
    clone.position.set(-center.x, -box.min.y, -center.z);

    // Scale by HEIGHT to targetSize (not maxDim) — ensures correct human height
    const height = size.y > 0.001 ? size.y : Math.max(size.x, size.y, size.z);
    if (height > 0) {
      const s = targetSize / height;
      clone.scale.multiplyScalar(s);
      clone.position.multiplyScalar(s);
    }

    // Apply shadow + selection
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (isSelected && mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.emissive = new THREE.Color('#222222');
          mesh.material = mat;
        }
      }
    });

    return clone;
  }, [scene, targetSize, isSelected]);

  // Animation mixer
  const { actions } = useAnimations(animations, groupRef);

  useEffect(() => {
    if (!actions) return;
    // Find a walk animation (common names)
    const walkNames = Object.keys(actions);
    const walkAction = walkNames.length > 0 ? actions[walkNames[0]] : null;

    if (walkAction) {
      if (playAnimation) {
        walkAction.reset().fadeIn(0.3).play();
      } else {
        walkAction.fadeOut(0.3);
      }
    }
    return () => {
      if (walkAction) walkAction.fadeOut(0.1);
    };
  }, [playAnimation, actions]);

  return (
    <group ref={groupRef} rotation={[0, modelRotationY, 0]}>
      <primitive object={cloned} />
    </group>
  );
};

/** Static GLB model (no animation) */
const StaticGLBModel: React.FC<{
  url: string;
  targetSize: number;
  isSelected: boolean;
  modelRotationY?: number;
}> = ({ url, targetSize, isSelected, modelRotationY = 0 }) => {
  const { scene } = useDracoGLTF(url);

  const cloned = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.set(-center.x, -box.min.y, -center.z);
    // Scale by height to targetSize
    const height = size.y > 0.001 ? size.y : Math.max(size.x, size.y, size.z);
    if (height > 0) {
      const s = targetSize / height;
      clone.scale.multiplyScalar(s);
      clone.position.multiplyScalar(s);
    }
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if (isSelected && mesh.material) {
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.emissive = new THREE.Color('#222222');
          mesh.material = mat;
        }
      }
    });
    return clone;
  }, [scene, targetSize, isSelected]);

  return (
    <group rotation={[0, modelRotationY, 0]}>
      <primitive object={cloned} />
    </group>
  );
};

const ProceduralOperator: React.FC<{ color: string }> = ({ color }) => (
  <group>
    <mesh position={[0, 0.75, 0]} castShadow>
      <capsuleGeometry args={[0.18, 0.6, 4, 8]} />
      <meshStandardMaterial color={color || '#4f46e5'} metalness={0.1} roughness={0.7} />
    </mesh>
    <mesh position={[0, 1.35, 0]} castShadow>
      <sphereGeometry args={[0.13, 8, 6]} />
      <meshStandardMaterial color="#f5d0a9" metalness={0.05} roughness={0.8} />
    </mesh>
    <mesh position={[0, 1.48, 0]} castShadow>
      <sphereGeometry args={[0.14, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#eab308" metalness={0.3} roughness={0.4} />
    </mesh>
    <mesh position={[-0.08, 0.22, 0]} castShadow>
      <capsuleGeometry args={[0.06, 0.3, 3, 6]} />
      <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
    </mesh>
    <mesh position={[0.08, 0.22, 0]} castShadow>
      <capsuleGeometry args={[0.06, 0.3, 3, 6]} />
      <meshStandardMaterial color="#1e3a5f" roughness={0.8} />
    </mesh>
  </group>
);

const ProceduralForklift: React.FC = () => (
  <group>
    <mesh position={[0, 0.5, 0]} castShadow>
      <boxGeometry args={[2, 1, 1.5]} />
      <meshStandardMaterial color="#ff6b35" metalness={0.6} roughness={0.3} />
    </mesh>
    {[[-0.7, 0.6], [-0.7, -0.6], [0.7, 0.6], [0.7, -0.6]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.15, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.15, 0.2]} />
        <meshStandardMaterial color="#2d2d2d" />
      </mesh>
    ))}
    <mesh position={[0.8, 2, 0]} castShadow>
      <boxGeometry args={[0.1, 4, 0.1]} />
      <meshStandardMaterial color="#666666" />
    </mesh>
    {[0.3, -0.3].map((z, i) => (
      <mesh key={i} position={[1.2, 0.3, z]} castShadow>
        <boxGeometry args={[1, 0.05, 0.1]} />
        <meshStandardMaterial color="#888888" />
      </mesh>
    ))}
  </group>
);

/** Actor model definition: URL, size, animation support, model-specific Y rotation offset */
interface ActorModelDef {
  url: string;
  targetSize: number;
  animated: boolean;
  /** Model's default facing direction offset. Most Sketchfab models face -Z or +X.
   *  This rotation is applied to the inner model so it faces +Z (our forward). */
  modelRotY: number;
}

const ACTOR_MODELS: Record<string, ActorModelDef> = {
  'operator-1': { url: '/models/operator-walking.glb', targetSize: 1.75, animated: true, modelRotY: Math.PI },
  'operator-2': { url: '/models/operator-2.glb', targetSize: 1.75, animated: false, modelRotY: Math.PI + Math.PI / 2 },
  'operator-3': { url: '/models/operator-3.glb', targetSize: 1.75, animated: false, modelRotY: Math.PI + Math.PI / 2 },
  'engineer':   { url: '/models/operator-1.glb', targetSize: 1.75, animated: false, modelRotY: Math.PI + Math.PI / 2 },
  'forklift':   { url: '/models/forklift.glb', targetSize: 3, animated: false, modelRotY: Math.PI },
  'agv':        { url: '/models/agv.glb', targetSize: 1.5, animated: false, modelRotY: Math.PI },
  'pallet-truck': { url: '/models/forklift.glb', targetSize: 2.5, animated: false, modelRotY: Math.PI },
};

const ActorComponent: React.FC<ActorComponentProps> = ({ actor, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  const { isPlaying, paths, simulationSpeed } = useEditorStore();
  const isWalkingRef = useRef(false);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (isPlaying && actor.parameters?.pathId) {
      const dt = Math.min(state.clock.getDelta(), 0.1) * simulationSpeed;
      const actorInfo = {
        id: actor.id,
        type: actor.type,
        parameters: {
          ...actor.parameters,
          walkSpeed: actor.parameters?.walkSpeed || 90,
          speed: actor.parameters?.speed || 180,
        },
      };
      const results = actorPathAnimator.update(dt, paths, [actorInfo]);
      const result = results.get(actor.id);
      if (result) {
        groupRef.current.position.set(result.position[0], result.position[1], result.position[2]);
        // The path rotation gives direction of travel. The inner model has modelRotY baked in
        // to face +Z, so we just apply the path direction rotation directly.
        groupRef.current.rotation.set(0, result.rotationY, 0);

        isWalkingRef.current = result.state === 'walking';

        // Subtle walking bob for operators
        const isOperator = actor.type.startsWith('operator') || actor.type === 'engineer';
        if (isOperator && result.state === 'walking') {
          const bobPhase = state.clock.elapsedTime * 8;
          groupRef.current.position.y += Math.abs(Math.sin(bobPhase)) * 0.02;
        }
        return;
      }
    }

    isWalkingRef.current = false;

    if (isSelected) {
      groupRef.current.position.y = actor.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.05;
    }
  });

  const modelDef = ACTOR_MODELS[actor.type];
  const isOperator = actor.type.startsWith('operator') || actor.type === 'engineer';

  const renderActor = () => {
    if (modelDef) {
      if (modelDef.animated) {
        return (
          <Suspense fallback={<ProceduralOperator color={actor.parameters?.color || '#4f46e5'} />}>
            <AnimatedGLBModel
              url={modelDef.url}
              targetSize={modelDef.targetSize}
              isSelected={isSelected}
              playAnimation={isPlaying && !!actor.parameters?.pathId}
              modelRotationY={modelDef.modelRotY}
            />
          </Suspense>
        );
      }
      return (
        <Suspense fallback={isOperator ? <ProceduralOperator color={actor.parameters?.color || '#4f46e5'} /> : <ProceduralForklift />}>
          <StaticGLBModel
            url={modelDef.url}
            targetSize={modelDef.targetSize}
            isSelected={isSelected}
            modelRotationY={modelDef.modelRotY}
          />
        </Suspense>
      );
    }

    return isOperator
      ? <ProceduralOperator color={actor.parameters?.color || '#4f46e5'} />
      : <ProceduralForklift />;
  };

  return (
    <group
      ref={groupRef}
      position={actor.position}
      rotation={actor.rotation}
      scale={actor.scale}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {renderActor()}

      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.2, 1.4, 32]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}

      {actor.parameters?.pathId && !isPlaying && (
        <mesh position={[0, 2, 0]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
};

export default ActorComponent;
