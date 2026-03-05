/**
 * SensorModel — React Three Fiber wrapper for the parametric sensor module
 *
 * When mounted on a conveyor (parentConveyorId exists):
 * - Shows a green accent glow ring at base
 * - Uses conveyor's belt width for correct beam span
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { buildSensor, SensorParams, SENSOR_DEFAULTS } from '../../../features/assets/parametric/modules/sensorBuilder';

interface SensorModelProps {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const SensorModel: React.FC<SensorModelProps> = ({ parameters, isSelected: _isSelected }) => {
  const isMounted = !!parameters.parentConveyorId;

  const built = useMemo(() => {
    const params: SensorParams = {
      sensorType: parameters.sensorType || SENSOR_DEFAULTS.sensorType,
      triggered: parameters.triggered ?? SENSOR_DEFAULTS.triggered,
      mountHeightMm: parameters.mountHeight || parameters.mountHeightMm || SENSOR_DEFAULTS.mountHeightMm,
      sensorHeightMm: parameters.sensorHeight || parameters.sensorHeightMm || SENSOR_DEFAULTS.sensorHeightMm,
      beltWidthMm: parameters.beltWidthMm || parameters.beltWidth || SENSOR_DEFAULTS.beltWidthMm,
      showBeam: parameters.showBeam ?? SENSOR_DEFAULTS.showBeam,
    };
    return buildSensor(params);
  }, [
    parameters.sensorType,
    parameters.triggered,
    parameters.mountHeight,
    parameters.mountHeightMm,
    parameters.sensorHeight,
    parameters.sensorHeightMm,
    parameters.beltWidthMm,
    parameters.beltWidth,
    parameters.showBeam,
  ]);

  return (
    <group>
      <primitive object={built} />
      {/* Mount indicator — green glow ring when attached to a conveyor */}
      {isMounted && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.14, 16]} />
          <meshBasicMaterial color="#10b981" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
};

export default SensorModel;
