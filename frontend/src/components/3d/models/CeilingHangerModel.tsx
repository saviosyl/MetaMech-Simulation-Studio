/**
 * Ceiling Hanger Support — MetaMech Simulation Studio
 *
 * Renders ceiling-mounted support rods/brackets for conveyors.
 * Configurable: single-rod, twin-rod, with optional crossbar.
 * Adjustable length, snaps to conveyor frame, extends to ceiling plane.
 */
import React from 'react';

interface CeilingHangerProps {
  /** Conveyor belt height (meters from ground) */
  conveyorHeight: number;
  /** Ceiling height in meters */
  ceilingHeight: number;
  /** Conveyor width in meters */
  conveyorWidth: number;
  /** Conveyor length in meters */
  conveyorLength: number;
  /** Style: single-rod or twin-rod */
  hangerStyle: 'single-rod' | 'twin-rod';
  /** Show crossbar between twin rods */
  showCrossbar: boolean;
  /** Is selected (for highlight) */
  isSelected: boolean;
}

const CeilingHangerModel: React.FC<CeilingHangerProps> = ({
  conveyorHeight = 0.85,
  ceilingHeight = 3.0,
  conveyorWidth = 0.6,
  conveyorLength = 3.0,
  hangerStyle = 'twin-rod',
  showCrossbar = true,
  isSelected = false,
}) => {
  const em = isSelected ? '#222222' : '#000000';
  const rodHeight = ceilingHeight - conveyorHeight;
  const rodY = conveyorHeight + rodHeight / 2;
  const rodRadius = 0.025;
  const bracketThickness = 0.04;

  // Place hangers at 1/4 and 3/4 along conveyor length
  const hangerPositions = [
    -conveyorLength / 4,
    conveyorLength / 4,
  ];

  const metalMat = {
    color: '#b0b0b0',
    metalness: 0.9,
    roughness: 0.2,
    emissive: em,
  };

  return (
    <group>
      {hangerPositions.map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]}>
          {/* Ceiling plate */}
          <mesh position={[0, ceilingHeight - bracketThickness / 2, 0]} castShadow>
            <boxGeometry args={[0.2, bracketThickness, hangerStyle === 'twin-rod' ? conveyorWidth + 0.1 : 0.2]} />
            <meshStandardMaterial {...metalMat} />
          </mesh>

          {hangerStyle === 'twin-rod' ? (
            <>
              {/* Twin rods */}
              {[-conveyorWidth / 2, conveyorWidth / 2].map((zOff, ri) => (
                <mesh key={ri} position={[0, rodY, zOff]} castShadow>
                  <cylinderGeometry args={[rodRadius, rodRadius, rodHeight, 8]} />
                  <meshStandardMaterial {...metalMat} />
                </mesh>
              ))}
              {/* Crossbar */}
              {showCrossbar && (
                <mesh position={[0, conveyorHeight + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                  <cylinderGeometry args={[rodRadius * 0.8, rodRadius * 0.8, conveyorWidth, 8]} />
                  <meshStandardMaterial {...metalMat} />
                </mesh>
              )}
            </>
          ) : (
            /* Single rod */
            <mesh position={[0, rodY, 0]} castShadow>
              <cylinderGeometry args={[rodRadius * 1.2, rodRadius * 1.2, rodHeight, 8]} />
              <meshStandardMaterial {...metalMat} />
            </mesh>
          )}

          {/* Bottom bracket (clamp to conveyor frame) */}
          <mesh position={[0, conveyorHeight + bracketThickness / 2, 0]} castShadow>
            <boxGeometry args={[0.15, bracketThickness, hangerStyle === 'twin-rod' ? conveyorWidth + 0.06 : 0.15]} />
            <meshStandardMaterial {...metalMat} color="#999999" />
          </mesh>
        </group>
      ))}

      {/* Ceiling plane indicator (translucent) */}
      <mesh position={[0, ceilingHeight, 0]} receiveShadow>
        <planeGeometry args={[conveyorLength + 0.5, conveyorWidth + 0.5]} />
        <meshStandardMaterial color="#445566" transparent opacity={0.03} side={2} />
      </mesh>
    </group>
  );
};

export default CeilingHangerModel;
