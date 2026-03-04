/**
 * BendConveyorModel — React Three Fiber wrapper for the parametric bend conveyor
 */
import React, { useMemo } from 'react';
import { buildBendConveyor, editorParamsToBendParams } from '../../../features/assets/parametric/bend/bendBuilder';

interface BendConveyorModelProps {
  parameters: Record<string, any>;
  isSelected: boolean;
}

const BendConveyorModel: React.FC<BendConveyorModelProps> = ({ parameters, isSelected: _isSelected }) => {
  const built = useMemo(() => {
    const bendParams = editorParamsToBendParams(parameters);
    return buildBendConveyor(bendParams);
  }, [
    parameters.bendAngle,
    parameters.bendDirection,
    parameters.surfaceType,
    parameters.width,
    parameters.radius,
    parameters.height,
    parameters.speed,
    parameters.sideGuides,
    parameters.guideHeight,
    parameters.showLegs,
    parameters.supportSpacing,
    parameters.adjustableFeetEnabled,
    parameters.motorSide,
  ]);

  return (
    <primitive object={built.root} />
  );
};

export default BendConveyorModel;
