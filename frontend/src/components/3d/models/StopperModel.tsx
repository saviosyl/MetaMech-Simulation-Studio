/**
 * StopperModel — Industrial pneumatic stop gate
 * Shows green (open) / red (closed) based on live simulation state
 */
import React, { useMemo, useState, useEffect } from 'react';
import * as THREE from 'three';
import { buildStopper, StopperParams, STOPPER_DEFAULTS } from '../../../features/assets/parametric/modules/stopperBuilder';
import { simulationEngine } from '../../../simulation/SimulationEngine';
import { useEditorStore } from '../../../store/editorStore';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
  nodeId?: string;
}

const StopperModel: React.FC<Props> = ({ parameters, isSelected, nodeId }) => {
  const isPlaying = useEditorStore(s => s.isPlaying);
  const [liveEngaged, setLiveEngaged] = useState(parameters.engaged ?? true);

  // Poll live engagement state during simulation
  useEffect(() => {
    if (!isPlaying || !nodeId) return;
    const iv = setInterval(() => {
      const products = simulationEngine.getProducts();
      const hasStopped = products.some(p => p.stoppedBy === nodeId);
      setLiveEngaged(hasStopped);
    }, 200);
    return () => clearInterval(iv);
  }, [isPlaying, nodeId]);

  // When not playing, use parameter
  useEffect(() => {
    if (!isPlaying) setLiveEngaged(parameters.engaged ?? true);
  }, [isPlaying, parameters.engaged]);

  const engaged = isPlaying ? liveEngaged : (parameters.engaged ?? true);

  const built = useMemo(() => {
    const p: StopperParams = {
      enabled: parameters.enabled ?? STOPPER_DEFAULTS.enabled,
      engaged,
      widthMm: parameters.width ?? parameters.widthMm ?? STOPPER_DEFAULTS.widthMm,
      bladeHeightMm: parameters.bladeHeight ?? STOPPER_DEFAULTS.bladeHeightMm,
      mountHeightMm: parameters.mountHeight ?? parameters.height ?? STOPPER_DEFAULTS.mountHeightMm,
    };
    return buildStopper(p);
  }, [parameters, engaged]);

  useEffect(() => {
    built.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mats = Array.isArray((child as THREE.Mesh).material)
          ? (child as THREE.Mesh).material as THREE.MeshStandardMaterial[]
          : [(child as THREE.Mesh).material as THREE.MeshStandardMaterial];
        for (const mat of mats) {
          if (mat.emissive) mat.emissive.set(isSelected ? '#222222' : '#000000');
        }
      }
    });
  }, [isSelected, built]);

  const isMounted = !!parameters.parentConveyorId;

  // Ring color: green when open, amber when closed
  const ringColor = engaged ? '#f59e0b' : '#10b981';

  return (
    <group>
      <primitive object={built} />
      {isMounted && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.1, 16]} />
          <meshBasicMaterial color={ringColor} transparent opacity={0.45} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default StopperModel;
