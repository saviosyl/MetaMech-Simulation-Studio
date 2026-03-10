/**
 * SpiralConveyorModel — Premium procedural AmbaFlex SV-style spiral conveyor
 * Fully R3F, no GLB dependency. Realistic industrial appearance.
 */
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

/* ── Materials (shared via useMemo per component) ── */
function useMaterials(isSelected: boolean, beltColor?: string, frameColor?: string) {
  return useMemo(() => {
    const emissive = isSelected ? '#1a1a2a' : '#000000';
    const ei = isSelected ? 0.15 : 0;
    return {
      drumStainless: new THREE.MeshStandardMaterial({ color: '#a0a5ab', metalness: 0.6, roughness: 0.3, emissive, emissiveIntensity: ei }),
      beltDark: new THREE.MeshStandardMaterial({ color: beltColor || '#1a1a1a', metalness: 0.02, roughness: 0.85, emissive, emissiveIntensity: ei }),
      outerBand: new THREE.MeshStandardMaterial({ color: '#b8bec4', metalness: 0.65, roughness: 0.35, emissive, emissiveIntensity: ei }),
      towerFrame: new THREE.MeshStandardMaterial({ color: frameColor || '#4a5568', metalness: 0.6, roughness: 0.4, emissive, emissiveIntensity: ei }),
      motorBody: new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.6, roughness: 0.4, emissive, emissiveIntensity: ei }),
      basePlate: new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.7, roughness: 0.3, emissive, emissiveIntensity: ei }),
      rubber: new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.0, roughness: 0.95 }),
      redLight: new THREE.MeshStandardMaterial({ color: '#cc2222', emissive: '#cc2222', emissiveIntensity: 0.4 }),
      yellowLight: new THREE.MeshStandardMaterial({ color: '#ccaa22', emissive: '#ccaa22', emissiveIntensity: 0.6 }),
      greenLight: new THREE.MeshStandardMaterial({ color: '#22cc44', emissive: '#22cc44', emissiveIntensity: 0.8 }),
      eStop: new THREE.MeshStandardMaterial({ color: '#dd0000', metalness: 0.3, roughness: 0.5 }),
      sensorGray: new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.5, roughness: 0.4 }),
      seamDark: new THREE.MeshStandardMaterial({ color: '#707580', metalness: 0.5, roughness: 0.5 }),
      guardCover: new THREE.MeshStandardMaterial({ color: '#5a6070', metalness: 0.5, roughness: 0.45 }),
      cableDark: new THREE.MeshStandardMaterial({ color: '#222222', metalness: 0.1, roughness: 0.8 }),
    };
  }, [isSelected, beltColor, frameColor]);
}

/* ── Reusable sub-components ── */

const Bolt: React.FC<{ position: [number, number, number]; mat: THREE.Material; size?: number }> = ({ position, mat, size = 0.006 }) => (
  <group position={position}>
    <mesh material={mat} castShadow>
      <cylinderGeometry args={[size, size, size * 1.5, 6]} />
    </mesh>
  </group>
);

/* ── Main Component ── */
const SpiralConveyorModel: React.FC<Props> = ({ parameters, isSelected }) => {
  const groupRef = useRef<THREE.Group>(null);
  const mats = useMaterials(isSelected, parameters.beltColor, parameters.frameColor);

  // ─── Extract params (mm → m) ───
  const direction = parameters.direction || 'up';
  const beltWidthM = ((parameters.beltWidth || 400) / 1000);
  const diameterM = ((parameters.diameter || 1800) / 1000);
  const totalHeightM = ((parameters.totalHeight || 3000) / 1000);
  const turns = parameters.turns || 3;
  const risePerTurn = ((parameters.risePerTurn || 1000) / 1000);
  const infeedAngle = ((parameters.infeedAngle || 0) * Math.PI) / 180;
  const outfeedAngle = ((parameters.outfeedAngle || 0) * Math.PI) / 180;
  const sideGuides = parameters.sideGuides !== false;
  const guideHeightM = ((parameters.guideHeight || 80) / 1000);
  const showLegs = parameters.showLegs !== false;
  const centerStructure = parameters.centerStructure || 'column';

  // ─── Derived geometry ───
  const drumRadius = 0.2; // 200mm fixed drum radius
  const innerRadius = drumRadius + 0.02; // 20mm gap
  const outerRadius = innerRadius + beltWidthM;
  const midRadius = (innerRadius + outerRadius) / 2;
  const beltThickness = 0.015;
  const effectiveHeight = Math.min(totalHeightM, turns * risePerTurn);

  // Segments: ~50 per turn, capped at 600
  const segsPerTurn = 50;
  const totalSegs = Math.min(Math.ceil(turns * segsPerTurn), 600);

  const isDown = direction === 'down';
  const dirMult = isDown ? -1 : 1;

  // ─── Helical belt segments ───
  const beltData = useMemo(() => {
    const segments: { pos: [number, number, number]; rot: [number, number, number]; width: number; length: number }[] = [];
    const outerGuidePositions: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const innerGuidePositions: { pos: [number, number, number]; rot: [number, number, number] }[] = [];
    const bracketPositions: { pos: [number, number, number]; rot: number }[] = [];

    const startAngle = infeedAngle;
    const totalAngle = turns * Math.PI * 2;
    const arcPerSeg = (midRadius * totalAngle) / totalSegs;

    for (let i = 0; i < totalSegs; i++) {
      const t = i / totalSegs;
      const tNext = (i + 1) / totalSegs;
      const angle = startAngle + t * totalAngle;
      const angleNext = startAngle + tNext * totalAngle;
      const midAngle = (angle + angleNext) / 2;

      const y = t * effectiveHeight;
      const yNext = tNext * effectiveHeight;
      const midY = (y + yNext) / 2;

      const x = Math.cos(midAngle) * midRadius;
      const z = Math.sin(midAngle) * midRadius;

      // Pitch angle (rise per arc segment)
      const rise = yNext - y;
      const arcLen = midRadius * (angleNext - angle);
      const pitch = Math.atan2(rise, arcLen);

      const segLength = arcPerSeg * 0.96;

      segments.push({
        pos: [x, midY, z],
        rot: [pitch, -midAngle + Math.PI / 2, 0],
        width: outerRadius - innerRadius,
        length: segLength,
      });

      // Outer guide band
      if (sideGuides) {
        const ox = Math.cos(midAngle) * outerRadius;
        const oz = Math.sin(midAngle) * outerRadius;
        outerGuidePositions.push({
          pos: [ox, midY + guideHeightM * 0.4, oz],
          rot: [0, -midAngle + Math.PI / 2, 0],
        });
      }

      // Inner guide rail
      if (sideGuides && i % 2 === 0) {
        const ix = Math.cos(midAngle) * (innerRadius - 0.003);
        const iz = Math.sin(midAngle) * (innerRadius - 0.003);
        innerGuidePositions.push({
          pos: [ix, midY + 0.03, iz],
          rot: [0, -midAngle + Math.PI / 2, 0],
        });
      }

      // Support brackets every quarter-turn
      if (i % Math.max(1, Math.floor(segsPerTurn / 4)) === 0) {
        bracketPositions.push({ pos: [x, midY - 0.02, z], rot: midAngle });
      }
    }
    return { segments, outerGuidePositions, innerGuidePositions, bracketPositions };
  }, [turns, effectiveHeight, innerRadius, outerRadius, midRadius, totalSegs, infeedAngle, sideGuides, guideHeightM, segsPerTurn]);

  // Drum seams positions
  const drumSeams = useMemo(() => {
    const seams: number[] = [];
    const seamSpacing = 0.5;
    for (let y = seamSpacing; y < effectiveHeight; y += seamSpacing) {
      seams.push(y);
    }
    return seams;
  }, [effectiveHeight]);

  // Tower position (on the outfeed side)
  const towerAngle = infeedAngle + turns * Math.PI * 2 + outfeedAngle;
  const towerDist = outerRadius + 0.22;
  const towerX = Math.cos(towerAngle) * towerDist;
  const towerZ = Math.sin(towerAngle) * towerDist;
  const towerYaw = -towerAngle + Math.PI / 2;

  // Infeed/Outfeed tangent section helpers
  const tangentLength = 0.35;

  const infeedEndAngle = infeedAngle;
  const infeedDir = [Math.cos(infeedEndAngle + Math.PI / 2), Math.sin(infeedEndAngle + Math.PI / 2)] as const;
  const infeedPos: [number, number, number] = [
    Math.cos(infeedEndAngle) * midRadius + infeedDir[0] * tangentLength * 0.5,
    0,
    Math.sin(infeedEndAngle) * midRadius + infeedDir[1] * tangentLength * 0.5,
  ];
  const infeedYaw = -infeedEndAngle + Math.PI / 2;

  const outfeedEndAngle = infeedAngle + turns * Math.PI * 2;
  const outfeedDir = [Math.cos(outfeedEndAngle + Math.PI / 2), Math.sin(outfeedEndAngle + Math.PI / 2)] as const;
  const outfeedPos: [number, number, number] = [
    Math.cos(outfeedEndAngle) * midRadius + outfeedDir[0] * tangentLength * 0.5,
    effectiveHeight,
    Math.sin(outfeedEndAngle) * midRadius + outfeedDir[1] * tangentLength * 0.5,
  ];
  const outfeedYaw = -outfeedEndAngle + Math.PI / 2;

  // Swap infeed/outfeed for down direction
  const [infeedFinal, outfeedFinal] = isDown
    ? [{ pos: outfeedPos, yaw: outfeedYaw, y: effectiveHeight }, { pos: infeedPos, yaw: infeedYaw, y: 0 }]
    : [{ pos: infeedPos, yaw: infeedYaw, y: 0 }, { pos: outfeedPos, yaw: outfeedYaw, y: effectiveHeight }];

  const outerSegLen = (outerRadius - innerRadius > 0.001) ? ((2 * Math.PI * midRadius) / segsPerTurn) * 0.96 : 0.05;

  return (
    <group ref={groupRef}>
      {/* ═══ A1: Central Core/Drum ═══ */}
      <mesh material={mats.drumStainless} position={[0, effectiveHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[drumRadius, drumRadius, effectiveHeight, 32]} />
      </mesh>
      {/* Top cap */}
      <mesh material={mats.drumStainless} position={[0, effectiveHeight + 0.008, 0]} castShadow>
        <cylinderGeometry args={[drumRadius + 0.015, drumRadius + 0.015, 0.016, 32]} />
      </mesh>
      {/* Bottom flange */}
      <mesh material={mats.drumStainless} position={[0, -0.01, 0]} castShadow>
        <cylinderGeometry args={[drumRadius + 0.025, drumRadius + 0.025, 0.02, 32]} />
      </mesh>
      {/* Drum seam lines */}
      {drumSeams.map((y, i) => (
        <mesh key={`seam-${i}`} material={mats.seamDark} position={[0, y, 0]}>
          <torusGeometry args={[drumRadius + 0.001, 0.002, 4, 32]} />
          <meshStandardMaterial color="#707580" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}

      {/* Framed-core option */}
      {centerStructure === 'framed-core' && (
        <group>
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
            <mesh key={`frame-vert-${i}`} material={mats.towerFrame}
              position={[Math.cos(a) * (drumRadius - 0.04), effectiveHeight / 2, Math.sin(a) * (drumRadius - 0.04)]} castShadow>
              <boxGeometry args={[0.04, effectiveHeight, 0.04]} />
            </mesh>
          ))}
        </group>
      )}

      {/* ═══ A2: Helical Belt Path ═══ */}
      {beltData.segments.map((seg, i) => (
        <group key={`belt-${i}`} position={seg.pos} rotation={seg.rot}>
          {/* Belt surface */}
          <mesh material={mats.beltDark} castShadow receiveShadow>
            <boxGeometry args={[seg.length, beltThickness, seg.width]} />
          </mesh>
          {/* Under-belt support plate */}
          <mesh material={mats.drumStainless} position={[0, -beltThickness * 0.7, 0]}>
            <boxGeometry args={[seg.length, 0.004, seg.width * 0.9]} />
          </mesh>
        </group>
      ))}

      {/* ═══ A3: Outer Stainless Guide Band ═══ */}
      {beltData.outerGuidePositions.map((g, i) => (
        <mesh key={`outer-${i}`} material={mats.outerBand} position={g.pos} rotation={g.rot} castShadow>
          <boxGeometry args={[outerSegLen, guideHeightM, 0.003]} />
        </mesh>
      ))}

      {/* Support brackets every quarter-turn */}
      {beltData.bracketPositions.map((b, i) => {
        const bx = Math.cos(b.rot) * outerRadius;
        const bz = Math.sin(b.rot) * outerRadius;
        return (
          <mesh key={`bracket-${i}`} material={mats.towerFrame}
            position={[bx, b.pos[1] + guideHeightM * 0.2, bz]}
            rotation={[0, -b.rot + Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[0.02, guideHeightM * 0.6, 0.015]} />
          </mesh>
        );
      })}

      {/* ═══ A4: Inner Guide Rail ═══ */}
      {beltData.innerGuidePositions.map((g, i) => (
        <mesh key={`inner-${i}`} material={mats.outerBand} position={g.pos} rotation={g.rot} castShadow>
          <boxGeometry args={[outerSegLen * 0.8, 0.05, 0.003]} />
        </mesh>
      ))}

      {/* ═══ A5: Side Drive Tower/Frame ═══ */}
      <group position={[towerX, 0, towerZ]} rotation={[0, towerYaw, 0]}>
        {/* Main vertical columns (2) */}
        <mesh material={mats.towerFrame} position={[-0.06, effectiveHeight / 2, 0]} castShadow>
          <boxGeometry args={[0.06, effectiveHeight + 0.1, 0.06]} />
        </mesh>
        <mesh material={mats.towerFrame} position={[0.06, effectiveHeight / 2, 0]} castShadow>
          <boxGeometry args={[0.06, effectiveHeight + 0.1, 0.06]} />
        </mesh>
        {/* Cross braces every 0.6m */}
        {Array.from({ length: Math.ceil(effectiveHeight / 0.6) }, (_, i) => (
          <mesh key={`xbrace-${i}`} material={mats.towerFrame}
            position={[0, 0.3 + i * 0.6, 0]} castShadow>
            <boxGeometry args={[0.15, 0.03, 0.04]} />
          </mesh>
        ))}
        {/* Depth braces */}
        <mesh material={mats.towerFrame} position={[-0.06, effectiveHeight * 0.3, -0.08]} castShadow>
          <boxGeometry args={[0.04, effectiveHeight * 0.4, 0.04]} />
        </mesh>
        <mesh material={mats.towerFrame} position={[0.06, effectiveHeight * 0.3, -0.08]} castShadow>
          <boxGeometry args={[0.04, effectiveHeight * 0.4, 0.04]} />
        </mesh>

        {/* Connection arms to spiral — top */}
        <mesh material={mats.towerFrame} position={[0, effectiveHeight - 0.05, 0.15]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.3]} />
        </mesh>
        {/* Connection arm — bottom */}
        <mesh material={mats.towerFrame} position={[0, 0.05, 0.15]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.3]} />
        </mesh>

        {/* ── Motor/Gearbox assembly at top ── */}
        <group position={[0, effectiveHeight + 0.12, 0]}>
          {/* Mounting bracket */}
          <mesh material={mats.towerFrame} position={[0, -0.04, 0]} castShadow>
            <boxGeometry args={[0.18, 0.02, 0.16]} />
          </mesh>
          {/* Gearbox */}
          <mesh material={mats.basePlate} position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.12]} />
          </mesh>
          {/* Motor body */}
          <mesh material={mats.motorBody} position={[0.14, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.2, 16]} />
          </mesh>
          {/* Motor end cap */}
          <mesh material={mats.basePlate} position={[0.25, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
          </mesh>
          {/* Motor fan cover */}
          <mesh material={mats.guardCover} position={[0.27, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.065, 0.06, 0.03, 12]} />
          </mesh>
          {/* Guard cover over drive */}
          <mesh material={mats.guardCover} position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.22, 0.04, 0.18]} />
          </mesh>
        </group>

        {/* Cable conduit down tower */}
        <mesh material={mats.cableDark} position={[-0.09, effectiveHeight / 2, -0.04]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, effectiveHeight, 8]} />
        </mesh>

        {/* Access panel */}
        <mesh material={mats.guardCover} position={[0, effectiveHeight * 0.6, -0.05]} castShadow>
          <boxGeometry args={[0.12, 0.2, 0.005]} />
        </mesh>
        {/* Access panel bolts */}
        <Bolt position={[-0.04, effectiveHeight * 0.6 + 0.07, -0.055]} mat={mats.drumStainless} />
        <Bolt position={[0.04, effectiveHeight * 0.6 + 0.07, -0.055]} mat={mats.drumStainless} />
        <Bolt position={[-0.04, effectiveHeight * 0.6 - 0.07, -0.055]} mat={mats.drumStainless} />
        <Bolt position={[0.04, effectiveHeight * 0.6 - 0.07, -0.055]} mat={mats.drumStainless} />

        {/* Junction box */}
        <mesh material={mats.basePlate} position={[0.08, effectiveHeight * 0.75, -0.04]} castShadow>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
        </mesh>

        {/* ═══ A8: Tower Light (green/yellow/red) ═══ */}
        <group position={[0, effectiveHeight + 0.32, 0]}>
          {/* Pole */}
          <mesh material={mats.basePlate} position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
          </mesh>
          {/* Red */}
          <mesh material={mats.redLight} position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 8]} />
          </mesh>
          {/* Yellow */}
          <mesh material={mats.yellowLight} position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 8]} />
          </mesh>
          {/* Green */}
          <mesh material={mats.greenLight} position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 8]} />
          </mesh>
          {/* Top cap */}
          <mesh material={mats.basePlate} position={[0, 0.055, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.006, 8]} />
          </mesh>
        </group>

        {/* E-stop near base */}
        <group position={[0.09, 0.4, 0.02]}>
          <mesh material={mats.eStop}>
            <cylinderGeometry args={[0.018, 0.018, 0.015, 12]} />
          </mesh>
          {/* Yellow surround */}
          <mesh material={mats.yellowLight} position={[0, -0.005, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.005, 12]} />
          </mesh>
        </group>
      </group>

      {/* ═══ A6: Base Frame ═══ */}
      {showLegs && (
        <group>
          {/* Center-to-tower base arm */}
          <mesh material={mats.basePlate}
            position={[towerX * 0.5, -0.025, towerZ * 0.5]}
            rotation={[0, towerYaw, 0]} castShadow>
            <boxGeometry args={[Math.sqrt(towerX * towerX + towerZ * towerZ), 0.04, 0.08]} />
          </mesh>
          {/* Opposite side arm */}
          <mesh material={mats.basePlate}
            position={[-towerX * 0.35, -0.025, -towerZ * 0.35]}
            rotation={[0, towerYaw, 0]} castShadow>
            <boxGeometry args={[Math.sqrt(towerX * towerX + towerZ * towerZ) * 0.7, 0.04, 0.08]} />
          </mesh>
          {/* Cross bar at base */}
          <mesh material={mats.basePlate}
            position={[0, -0.025, 0]}
            rotation={[0, towerYaw + Math.PI / 2, 0]} castShadow>
            <boxGeometry args={[outerRadius * 1.5, 0.04, 0.06]} />
          </mesh>

          {/* 4 leveling feet */}
          {[
            [towerX * 0.9, towerZ * 0.9],
            [-towerX * 0.3, -towerZ * 0.3],
            [towerX * 0.9 + Math.cos(towerYaw + Math.PI / 2) * 0.15, towerZ * 0.9 + Math.sin(towerYaw + Math.PI / 2) * 0.15],
            [-towerX * 0.3 + Math.cos(towerYaw + Math.PI / 2) * 0.15, -towerZ * 0.3 + Math.sin(towerYaw + Math.PI / 2) * 0.15],
          ].map(([fx, fz], i) => (
            <group key={`foot-${i}`} position={[fx as number, -0.05, fz as number]}>
              {/* Threaded rod */}
              <mesh material={mats.drumStainless}>
                <cylinderGeometry args={[0.008, 0.008, 0.03, 6]} />
              </mesh>
              {/* Rubber pad */}
              <mesh material={mats.rubber} position={[0, -0.02, 0]}>
                <cylinderGeometry args={[0.02, 0.022, 0.01, 8]} />
              </mesh>
            </group>
          ))}

          {/* Gussets at base connections */}
          <mesh material={mats.basePlate}
            position={[towerX * 0.12, -0.01, towerZ * 0.12]}
            rotation={[0, towerYaw, Math.PI / 4]} castShadow>
            <boxGeometry args={[0.06, 0.06, 0.005]} />
          </mesh>
        </group>
      )}

      {/* ═══ A7: Infeed Tangent Section ═══ */}
      <group position={infeedFinal.pos} rotation={[0, isDown ? outfeedYaw : infeedYaw, 0]}>
        {/* Belt surface */}
        <mesh material={mats.beltDark} position={[tangentLength * 0.5, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[tangentLength, beltThickness, beltWidthM]} />
        </mesh>
        {/* Under-support */}
        <mesh material={mats.drumStainless} position={[tangentLength * 0.5, -beltThickness * 0.7, 0]}>
          <boxGeometry args={[tangentLength, 0.004, beltWidthM * 0.9]} />
        </mesh>
        {/* Side guides */}
        {sideGuides && (
          <>
            <mesh material={mats.outerBand} position={[tangentLength * 0.5, guideHeightM * 0.4, beltWidthM / 2 + 0.003]}>
              <boxGeometry args={[tangentLength, guideHeightM, 0.003]} />
            </mesh>
            <mesh material={mats.outerBand} position={[tangentLength * 0.5, guideHeightM * 0.4, -beltWidthM / 2 - 0.003]}>
              <boxGeometry args={[tangentLength, guideHeightM, 0.003]} />
            </mesh>
          </>
        )}
        {/* Sensor mount at infeed */}
        <group position={[tangentLength + 0.02, 0.06, beltWidthM / 2 + 0.02]}>
          <mesh material={mats.sensorGray}>
            <boxGeometry args={[0.015, 0.04, 0.015]} />
          </mesh>
          <mesh material={mats.sensorGray} position={[0, 0.025, -0.01]} rotation={[0, 0, 0]}>
            <cylinderGeometry args={[0.005, 0.005, 0.015, 8]} />
          </mesh>
        </group>
      </group>

      {/* ═══ A7: Outfeed Tangent Section ═══ */}
      <group position={outfeedFinal.pos} rotation={[0, isDown ? infeedYaw : outfeedYaw, 0]}>
        {/* Belt surface */}
        <mesh material={mats.beltDark} position={[tangentLength * 0.5, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[tangentLength, beltThickness, beltWidthM]} />
        </mesh>
        {/* Under-support */}
        <mesh material={mats.drumStainless} position={[tangentLength * 0.5, -beltThickness * 0.7, 0]}>
          <boxGeometry args={[tangentLength, 0.004, beltWidthM * 0.9]} />
        </mesh>
        {/* Side guides */}
        {sideGuides && (
          <>
            <mesh material={mats.outerBand} position={[tangentLength * 0.5, guideHeightM * 0.4, beltWidthM / 2 + 0.003]}>
              <boxGeometry args={[tangentLength, guideHeightM, 0.003]} />
            </mesh>
            <mesh material={mats.outerBand} position={[tangentLength * 0.5, guideHeightM * 0.4, -beltWidthM / 2 - 0.003]}>
              <boxGeometry args={[tangentLength, guideHeightM, 0.003]} />
            </mesh>
          </>
        )}
        {/* Sensor mount at outfeed */}
        <group position={[tangentLength + 0.02, 0.06, -beltWidthM / 2 - 0.02]}>
          <mesh material={mats.sensorGray}>
            <boxGeometry args={[0.015, 0.04, 0.015]} />
          </mesh>
          <mesh material={mats.sensorGray} position={[0, 0.025, 0.01]}>
            <cylinderGeometry args={[0.005, 0.005, 0.015, 8]} />
          </mesh>
        </group>
      </group>

      {/* ═══ A8: Bolt patterns on drum flanges ═══ */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((a, i) => (
        <React.Fragment key={`dbolt-${i}`}>
          <Bolt position={[Math.cos(a) * (drumRadius + 0.01), effectiveHeight + 0.017, Math.sin(a) * (drumRadius + 0.01)]} mat={mats.drumStainless} />
          <Bolt position={[Math.cos(a) * (drumRadius + 0.015), -0.021, Math.sin(a) * (drumRadius + 0.015)]} mat={mats.drumStainless} />
        </React.Fragment>
      ))}
    </group>
  );
};

export default SpiralConveyorModel;
