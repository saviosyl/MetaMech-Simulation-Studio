export type Vec3 = [number, number, number];

export interface SpiralTransferSide {
  /** Belt anchor on the helix centerline */
  anchor: Vec3;
  /** Physical flow direction at the anchor (horizontal tangent) */
  flow: Vec3;
  /** External connection point at tangent endpoint */
  port: Vec3;
  /** Port facing direction for mating (input opposes flow, output follows flow) */
  direction: Vec3;
}

export interface SpiralTransferGeometry {
  isDown: boolean;
  innerRadius: number;
  outerRadius: number;
  midRadius: number;
  totalAngle: number;
  bottomY: number;
  topY: number;
  effectiveHeight: number;
  input: SpiralTransferSide;
  output: SpiralTransferSide;
}

export function computeSpiralTransferGeometry(
  params: Record<string, any> = {},
  tangentLength = 0.35,
): SpiralTransferGeometry {
  const beltWidthM = (params.beltWidth ?? 400) / 1000;
  const turns = Math.max(params.turns ?? 3, 0.5);
  const outfeedAngleDeg = params.outfeedAngle ?? 180;
  const outfeedAngleRad = (outfeedAngleDeg * Math.PI) / 180;
  const infeedHeightM = (params.infeedHeight ?? 800) / 1000;
  const outfeedHeightM = (params.outfeedHeight ?? 3800) / 1000;
  const isDown = params.direction === 'down';

  const drumRadius = 0.2;
  const innerRadius = drumRadius + 0.02;
  const outerRadius = innerRadius + beltWidthM;
  const midRadius = (innerRadius + outerRadius) / 2;
  const totalAngle = turns * Math.PI * 2 + outfeedAngleRad;

  const bottomY = Math.min(infeedHeightM, outfeedHeightM);
  const topY = Math.max(infeedHeightM, outfeedHeightM);
  const effectiveHeight = Math.max(topY - bottomY, 0.1);

  const startAnchor: Vec3 = [Math.cos(0) * midRadius, bottomY, Math.sin(0) * midRadius];
  const endAnchor: Vec3 = [Math.cos(totalAngle) * midRadius, topY, Math.sin(totalAngle) * midRadius];

  // Tangent for increasing helix angle
  const startTan: Vec3 = [-Math.sin(0), 0, Math.cos(0)];
  const endTan: Vec3 = [-Math.sin(totalAngle), 0, Math.cos(totalAngle)];

  // Physical flow on belt
  const startFlow: Vec3 = isDown ? [-startTan[0], 0, -startTan[2]] : startTan;
  const endFlow: Vec3 = isDown ? [-endTan[0], 0, -endTan[2]] : endTan;

  // Logical role swap for down spirals
  const inputAnchor = isDown ? endAnchor : startAnchor;
  const inputFlow = isDown ? endFlow : startFlow;
  const outputAnchor = isDown ? startAnchor : endAnchor;
  const outputFlow = isDown ? startFlow : endFlow;

  const inputPort: Vec3 = [
    inputAnchor[0] - inputFlow[0] * tangentLength,
    inputAnchor[1],
    inputAnchor[2] - inputFlow[2] * tangentLength,
  ];
  const outputPort: Vec3 = [
    outputAnchor[0] + outputFlow[0] * tangentLength,
    outputAnchor[1],
    outputAnchor[2] + outputFlow[2] * tangentLength,
  ];

  return {
    isDown,
    innerRadius,
    outerRadius,
    midRadius,
    totalAngle,
    bottomY,
    topY,
    effectiveHeight,
    input: {
      anchor: inputAnchor,
      flow: inputFlow,
      port: inputPort,
      direction: [-inputFlow[0], 0, -inputFlow[2]],
    },
    output: {
      anchor: outputAnchor,
      flow: outputFlow,
      port: outputPort,
      direction: outputFlow,
    },
  };
}

/**
 * Convert a ground-referenced spiral point (node-local) into the model-body frame
 * used by SpiralConveyorModel's inner group positioned at +bottomY.
 */
export function toSpiralBodyLocal(point: Vec3, bottomY: number): Vec3 {
  return [point[0], point[1] - bottomY, point[2]];
}
