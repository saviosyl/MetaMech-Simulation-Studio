/**
 * SensorModel — React Three Fiber wrapper for the parametric sensor module
 */
import React, { useMemo } from 'react';
import { buildSensor, SensorParams, SENSOR_DEFAULTS } from '../../../features/assets/parametric/modules/sensorBuilder';

interface SensorModelProps {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const SensorModel: React.FC<SensorModelProps> = ({ parameters, isSelected: _isSelected }) => {
  const built = useMemo(() => {
    const params: SensorParams = {
      sensorType: parameters.sensorType || SENSOR_DEFAULTS.sensorType,
      triggered: parameters.triggered ?? SENSOR_DEFAULTS.triggered,
      mountHeightMm: parameters.mountHeight || parameters.mountHeightMm || SENSOR_DEFAULTS.mountHeightMm,
      sensorHeightMm: parameters.sensorHeight || parameters.sensorHeightMm || SENSOR_DEFAULTS.sensorHeightMm,
      beltWidthMm: parameters.beltWidth || parameters.beltWidthMm || SENSOR_DEFAULTS.beltWidthMm,
      showBeam: parameters.showBeam ?? SENSOR_DEFAULTS.showBeam,
    };
    return buildSensor(params);
  }, [
    parameters.sensorType,
    parameters.triggered,
    parameters.mountHeight,
    parameters.sensorHeight,
    parameters.beltWidth,
    parameters.showBeam,
  ]);

  return <primitive object={built} />;
};

export default SensorModel;
