/**
 * SpiralConveyorModel — Premium procedural AmbaFlex SV-style spiral conveyor
 * Continuous helix ribbon geometry. R3F, no GLB dependency.
 */
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { computeSpiralTransferGeometry, toSpiralBodyLocal } from '../../../lib/spiralTransfer';

interface Props {
  parameters: Record<string, any>;
  isSelected: boolean;
}

/* ── Module-level materials (shared, never recreated) ── */
const matDrumStainless = new THREE.MeshStandardMaterial({ color: '#a0a5ab', metalness: 0.6, roughness: 0.3 });
const matBeltDark = new THREE.MeshStandardMaterial({ color: '#1a1a1a', metalness: 0.02, roughness: 0.85 });
const matOuterBand = new THREE.MeshStandardMaterial({ color: '#b8bec4', metalness: 0.65, roughness: 0.35 });
const matTowerFrame = new THREE.MeshStandardMaterial({ color: '#4a5568', metalness: 0.6, roughness: 0.4 });
const matMotorBody = new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.6, roughness: 0.4 });
const matBasePlate = new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.7, roughness: 0.3 });
const matRubber = new THREE.MeshStandardMaterial({ color: '#111111', metalness: 0.0, roughness: 0.95 });
const matRedLight = new THREE.MeshStandardMaterial({ color: '#cc2222', emissive: new THREE.Color('#cc2222'), emissiveIntensity: 0.4 });
const matYellowLight = new THREE.MeshStandardMaterial({ color: '#ccaa22', emissive: new THREE.Color('#ccaa22'), emissiveIntensity: 0.6 });
const matGreenLight = new THREE.MeshStandardMaterial({ color: '#22cc44', emissive: new THREE.Color('#22cc44'), emissiveIntensity: 0.8 });
const matEStop = new THREE.MeshStandardMaterial({ color: '#dd0000', metalness: 0.3, roughness: 0.5 });
const matSensorGray = new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.5, roughness: 0.4 });
const matSeamDark = new THREE.MeshStandardMaterial({ color: '#707580', metalness: 0.5, roughness: 0.5 });
const matGuardCover = new THREE.MeshStandardMaterial({ color: '#5a6070', metalness: 0.5, roughness: 0.45 });
const matCableDark = new THREE.MeshStandardMaterial({ color: '#222222', metalness: 0.1, roughness: 0.8 });

/* ── Helix ribbon geometry builder ── */
function buildHelixRibbon(
  innerR: number,
  outerR: number,
  startAngle: number,
  totalAngle: number,
  startY: number,
  endY: number,
  segments: number,
  thickness: number,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const indices: number[] = [];

  const safeSegs = Math.max(segments, 2);

  for (let i = 0; i <= safeSegs; i++) {
    const t = i / safeSegs;
    const angle = startAngle + t * totalAngle;
    const y = startY + t * (endY - startY);

    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const xi = cosA * innerR;
    const zi = sinA * innerR;
    const xo = cosA * outerR;
    const zo = sinA * outerR;

    // Bottom inner, bottom outer, top inner, top outer
    verts.push(xi, y, zi);
    verts.push(xo, y, zo);
    verts.push(xi, y + thickness, zi);
    verts.push(xo, y + thickness, zo);

    if (i < safeSegs) {
      const b = i * 4;
      const n = (i + 1) * 4;
      // Top face
      indices.push(b + 2, n + 2, b + 3, b + 3, n + 2, n + 3);
      // Bottom face
      indices.push(b, b + 1, n, b + 1, n + 1, n);
      // Outer side
      indices.push(b + 1, b + 3, n + 1, b + 3, n + 3, n + 1);
      // Inner side
      indices.push(b, n, b + 2, b + 2, n, n + 2);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* ── Guide rail ribbon (thin vertical wall along helix) ── */
function buildHelixGuide(
  radius: number,
  startAngle: number,
  totalAngle: number,
  startY: number,
  endY: number,
  segments: number,
  guideHeight: number,
  beltThickness: number,
): THREE.BufferGeometry {
  const verts: number[] = [];
  const indices: number[] = [];
  const safeSegs = Math.max(segments, 2);

  for (let i = 0; i <= safeSegs; i++) {
    const t = i / safeSegs;
    const angle = startAngle + t * totalAngle;
    const y = startY + t * (endY - startY) + beltThickness;

    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    // Bottom, top
    verts.push(x, y, z);
    verts.push(x, y + guideHeight, z);

    if (i < safeSegs) {
      const b = i * 2;
      const n = (i + 1) * 2;
      // Front face
      indices.push(b, n, b + 1, b + 1, n, n + 1);
      // Back face
      indices.push(b, b + 1, n, b + 1, n + 1, n);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/* ── Reusable sub-components ── */
const Bolt: React.FC<{ position: [number, number, number]; size?: number }> = ({ position, size = 0.006 }) => (
  <mesh material={matDrumStainless} position={position} castShadow>
    <cylinderGeometry args={[size, size, size * 1.5, 6]} />
  </mesh>
);

/* ── Main Component ── */
const SpiralConveyorModel: React.FC<Props> = ({ parameters }) => {
  const groupRef = useRef<THREE.Group>(null);

  // ─── Extract params (mm → m) ───
  const beltWidthM = (parameters.beltWidth ?? 400) / 1000;
  const sideGuides = parameters.sideGuides !== false;
  const guideHeightM = (parameters.guideHeight ?? 80) / 1000;
  const showLegs = parameters.showLegs !== false;
  const centerStructure = parameters.centerStructure || 'column';
  const tangentLength = 0.35;

  // Shared transfer/port math (same source used by editorStore ports)
  const spiral = useMemo(
    () => computeSpiralTransferGeometry(parameters, tangentLength),
    [parameters],
  );
  const {
    innerRadius,
    outerRadius,
    totalAngle,
    bottomY,
    effectiveHeight,
    input,
    output,
  } = spiral;

  // ─── Derived geometry ───
  const drumRadius = 0.2;
  const beltThickness = 0.015;

  // Helix angles: infeed fixed at 0
  const startAngle = 0;

  // Segments: ~60 per turn, capped at 600
  const segsPerTurn = 60;
  const totalSegs = Math.min(Math.ceil((totalAngle / (Math.PI * 2)) * segsPerTurn), 600);

  // ─── Continuous helix geometries ───
  const helixGeos = useMemo(() => {
    const belt = buildHelixRibbon(
      innerRadius, outerRadius,
      startAngle, totalAngle,
      0, effectiveHeight,
      totalSegs, beltThickness,
    );

    const support = buildHelixRibbon(
      innerRadius + 0.005, outerRadius - 0.005,
      startAngle, totalAngle,
      -0.004, effectiveHeight - 0.004,
      totalSegs, 0.004,
    );

    let outerGuide: THREE.BufferGeometry | null = null;
    let innerGuide: THREE.BufferGeometry | null = null;

    if (sideGuides) {
      outerGuide = buildHelixGuide(
        outerRadius + 0.002,
        startAngle, totalAngle,
        0, effectiveHeight,
        totalSegs, guideHeightM, beltThickness,
      );
      innerGuide = buildHelixGuide(
        innerRadius - 0.003,
        startAngle, totalAngle,
        0, effectiveHeight,
        Math.ceil(totalSegs / 2), guideHeightM * 0.6, beltThickness,
      );
    }

    return { belt, support, outerGuide, innerGuide };
  }, [innerRadius, outerRadius, startAngle, totalAngle, effectiveHeight, totalSegs, beltThickness, sideGuides, guideHeightM]);

  // ─── Bracket positions (every quarter turn) ───
  const bracketData = useMemo(() => {
    const brackets: { x: number; y: number; z: number; angle: number }[] = [];
    const step = Math.max(1, Math.floor(segsPerTurn / 4));
    for (let i = 0; i <= totalSegs; i += step) {
      const t = i / totalSegs;
      const angle = startAngle + t * totalAngle;
      const y = t * effectiveHeight;
      brackets.push({
        x: Math.cos(angle) * outerRadius,
        y,
        z: Math.sin(angle) * outerRadius,
        angle,
      });
    }
    return brackets;
  }, [totalSegs, segsPerTurn, startAngle, totalAngle, effectiveHeight, outerRadius]);

  // Drum seams — thin cylinder rings instead of torus
  const drumSeams = useMemo(() => {
    const seams: number[] = [];
    const seamSpacing = 0.5;
    for (let y = seamSpacing; y < effectiveHeight; y += seamSpacing) {
      seams.push(y);
    }
    return seams;
  }, [effectiveHeight]);

  // Tower position (on the outfeed side)
  const towerAngle = startAngle + totalAngle;
  const towerDist = outerRadius + 0.22;
  const towerX = Math.cos(towerAngle) * towerDist;
  const towerZ = Math.sin(towerAngle) * towerDist;
  const towerYaw = -towerAngle + Math.PI / 2;

  const tangentYaw = (tx: number, tz: number) => Math.atan2(-tz, tx);
  const inputPortBody = toSpiralBodyLocal(input.port, bottomY);
  const outputAnchorBody = toSpiralBodyLocal(output.anchor, bottomY);
  const outputPortBody = toSpiralBodyLocal(output.port, bottomY);
  const outputFlow = output.flow;

  const infeedFinal = {
    pos: inputPortBody,
    yaw: tangentYaw(input.flow[0], input.flow[2]),
  };
  const outfeedFinal = {
    pos: outputAnchorBody,
    yaw: tangentYaw(outputFlow[0], outputFlow[2]),
  };
  const outputSideNormal: [number, number, number] = [-outputFlow[2], 0, outputFlow[0]];
  const returnUnitPos: [number, number, number] = [
    outputPortBody[0] + outputFlow[0] * 0.08 + outputSideNormal[0] * (beltWidthM * 0.58),
    outputPortBody[1] - 0.11,
    outputPortBody[2] + outputFlow[2] * 0.08 + outputSideNormal[2] * (beltWidthM * 0.58),
  ];
  const towerBaseFeet: [number, number][] = useMemo(() => {
    const cosY = Math.cos(towerYaw);
    const sinY = Math.sin(towerYaw);
    const localFeet: [number, number][] = [
      [-0.08, -0.02],
      [0.08, -0.02],
    ];
    return localFeet.map(([lx, lz]) => [
      towerX + lx * cosY + lz * sinY,
      towerZ - lx * sinY + lz * cosY,
    ]);
  }, [towerX, towerZ, towerYaw]);
  const drumBaseFeet: [number, number][] = useMemo(() => {
    const a = towerAngle + Math.PI;
    const radial: [number, number] = [Math.cos(a), Math.sin(a)];
    const tangent: [number, number] = [-radial[1], radial[0]];
    const c: [number, number] = [radial[0] * outerRadius * 0.82, radial[1] * outerRadius * 0.82];
    const halfAcross = Math.max(0.12, beltWidthM * 0.5);
    return [
      [c[0] - tangent[0] * halfAcross, c[1] - tangent[1] * halfAcross],
      [c[0] + tangent[0] * halfAcross, c[1] + tangent[1] * halfAcross],
    ];
  }, [outerRadius, towerAngle, beltWidthM]);
  const supportFeet = [...towerBaseFeet, ...drumBaseFeet] as [number, number][];
  const mainBaseBeamLength = Math.max(0.2, Math.sqrt(towerX * towerX + towerZ * towerZ));
  const mainBaseBeamYaw = Math.atan2(-towerZ, towerX);
  const mainBaseBeamCenter: [number, number, number] = [towerX * 0.5, -bottomY + 0.095, towerZ * 0.5];
  const legHeight = Math.max(0.01, bottomY);
  const legTubeW = 0.056;
  const legTubeD = 0.044;
  const footPlateY = -bottomY - 0.008;
  const floorContactY = -bottomY - 0.012;
  const frameRailSpan = Math.max(0.26, beltWidthM + 0.18);
  const frameRailLength = Math.max(0.52, mainBaseBeamLength + 0.2);

  return (
    <group ref={groupRef} position={[0, bottomY, 0]}>
      {/* ═══ Central Core/Drum ═══ */}
      <mesh material={matDrumStainless} position={[0, effectiveHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[drumRadius, drumRadius, effectiveHeight, 32]} />
      </mesh>
      {/* Top cap */}
      <mesh material={matDrumStainless} position={[0, effectiveHeight + 0.008, 0]} castShadow>
        <cylinderGeometry args={[drumRadius + 0.015, drumRadius + 0.015, 0.016, 32]} />
      </mesh>
      {/* Bottom flange */}
      <mesh material={matDrumStainless} position={[0, -0.01, 0]} castShadow>
        <cylinderGeometry args={[drumRadius + 0.025, drumRadius + 0.025, 0.02, 32]} />
      </mesh>
      {/* Drum seam lines — thin cylinder rings (safe replacement for torusGeometry) */}
      {drumSeams.map((y, i) => (
        <mesh key={`seam-${i}`} material={matSeamDark} position={[0, y, 0]}>
          <cylinderGeometry args={[drumRadius + 0.003, drumRadius + 0.003, 0.003, 32, 1, true]} />
        </mesh>
      ))}

      {/* Framed-core option */}
      {centerStructure === 'framed-core' && (
        <group>
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((a, i) => (
            <mesh key={`frame-vert-${i}`} material={matTowerFrame}
              position={[Math.cos(a) * (drumRadius - 0.04), effectiveHeight / 2, Math.sin(a) * (drumRadius - 0.04)]} castShadow>
              <boxGeometry args={[0.04, effectiveHeight, 0.04]} />
            </mesh>
          ))}
        </group>
      )}

      {/* ═══ Continuous Helical Belt ═══ */}
      <mesh geometry={helixGeos.belt} material={matBeltDark} castShadow receiveShadow />
      {/* Under-belt support plate */}
      <mesh geometry={helixGeos.support} material={matDrumStainless} />

      {/* ═══ Continuous Outer Guide Band ═══ */}
      {helixGeos.outerGuide && (
        <mesh geometry={helixGeos.outerGuide} material={matOuterBand} castShadow />
      )}

      {/* Support brackets every quarter-turn */}
      {bracketData.map((b, i) => (
        <mesh key={`bracket-${i}`} material={matTowerFrame}
          position={[b.x, b.y + guideHeightM * 0.2 + beltThickness, b.z]}
          rotation={[0, -b.angle + Math.PI / 2, 0]} castShadow>
          <boxGeometry args={[0.02, guideHeightM * 0.6, 0.015]} />
        </mesh>
      ))}

      {/* ═══ Continuous Inner Guide Rail ═══ */}
      {helixGeos.innerGuide && (
        <mesh geometry={helixGeos.innerGuide} material={matOuterBand} castShadow />
      )}

      {/* ═══ Side Drive Tower/Frame ═══ */}
      <group position={[towerX, 0, towerZ]} rotation={[0, towerYaw, 0]}>
        {/* Main vertical columns (2) */}
        <mesh material={matTowerFrame} position={[-0.06, effectiveHeight / 2, 0]} castShadow>
          <boxGeometry args={[0.06, effectiveHeight + 0.1, 0.06]} />
        </mesh>
        <mesh material={matTowerFrame} position={[0.06, effectiveHeight / 2, 0]} castShadow>
          <boxGeometry args={[0.06, effectiveHeight + 0.1, 0.06]} />
        </mesh>
        {/* Cross braces every 0.6m */}
        {Array.from({ length: Math.max(1, Math.ceil(effectiveHeight / 0.6)) }, (_, i) => (
          <mesh key={`xbrace-${i}`} material={matTowerFrame}
            position={[0, 0.3 + i * 0.6, 0]} castShadow>
            <boxGeometry args={[0.15, 0.03, 0.04]} />
          </mesh>
        ))}
        {/* Depth braces */}
        <mesh material={matTowerFrame} position={[-0.06, effectiveHeight * 0.3, -0.08]} castShadow>
          <boxGeometry args={[0.04, Math.max(0.01, effectiveHeight * 0.4), 0.04]} />
        </mesh>
        <mesh material={matTowerFrame} position={[0.06, effectiveHeight * 0.3, -0.08]} castShadow>
          <boxGeometry args={[0.04, Math.max(0.01, effectiveHeight * 0.4), 0.04]} />
        </mesh>

        {/* Connection yoke to spiral body */}
        <mesh material={matTowerFrame} position={[0, effectiveHeight - 0.06, 0.145]} castShadow>
          <boxGeometry args={[0.16, 0.04, 0.28]} />
        </mesh>
        <mesh material={matTowerFrame} position={[0, 0.08, 0.145]} castShadow>
          <boxGeometry args={[0.16, 0.04, 0.28]} />
        </mesh>
        {/* Compact link arms (cleaner reference-style support) */}
        <mesh material={matTowerFrame} position={[0, effectiveHeight - 0.045, 0.22]} rotation={[-0.24, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.03, 0.16]} />
        </mesh>
        <mesh material={matTowerFrame} position={[0, 0.09, 0.22]} rotation={[0.24, 0, 0]} castShadow>
          <boxGeometry args={[0.12, 0.03, 0.16]} />
        </mesh>

        {/* ── Motor/Gearbox assembly at top ── */}
        <group position={[0, effectiveHeight + 0.12, 0]}>
          <mesh material={matTowerFrame} position={[0, -0.04, 0]} castShadow>
            <boxGeometry args={[0.18, 0.02, 0.16]} />
          </mesh>
          <mesh material={matBasePlate} position={[0, 0.02, 0]} castShadow>
            <boxGeometry args={[0.12, 0.1, 0.12]} />
          </mesh>
          <mesh material={matMotorBody} position={[0.14, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.075, 0.075, 0.2, 16]} />
          </mesh>
          <mesh material={matBasePlate} position={[0.25, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.04, 0.04, 0.02, 12]} />
          </mesh>
          <mesh material={matGuardCover} position={[0.27, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.065, 0.06, 0.03, 12]} />
          </mesh>
          <mesh material={matGuardCover} position={[0, 0.1, 0]} castShadow>
            <boxGeometry args={[0.22, 0.04, 0.18]} />
          </mesh>
        </group>

        {/* Cable conduit */}
        <mesh material={matCableDark} position={[-0.09, effectiveHeight / 2, -0.04]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, Math.max(0.01, effectiveHeight), 8]} />
        </mesh>

        {/* Access panel */}
        <mesh material={matGuardCover} position={[0, effectiveHeight * 0.6, -0.05]} castShadow>
          <boxGeometry args={[0.12, 0.2, 0.005]} />
        </mesh>
        <Bolt position={[-0.04, effectiveHeight * 0.6 + 0.07, -0.055]} />
        <Bolt position={[0.04, effectiveHeight * 0.6 + 0.07, -0.055]} />
        <Bolt position={[-0.04, effectiveHeight * 0.6 - 0.07, -0.055]} />
        <Bolt position={[0.04, effectiveHeight * 0.6 - 0.07, -0.055]} />

        {/* Junction box */}
        <mesh material={matBasePlate} position={[0.08, effectiveHeight * 0.75, -0.04]} castShadow>
          <boxGeometry args={[0.06, 0.08, 0.04]} />
        </mesh>

        {/* Tower Light (green/yellow/red) */}
        <group position={[0, effectiveHeight + 0.32, 0]}>
          <mesh material={matBasePlate} position={[0, -0.06, 0]}>
            <cylinderGeometry args={[0.008, 0.008, 0.1, 6]} />
          </mesh>
          <mesh material={matRedLight} position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 8]} />
          </mesh>
          <mesh material={matYellowLight} position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 8]} />
          </mesh>
          <mesh material={matGreenLight} position={[0, -0.01, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.025, 8]} />
          </mesh>
          <mesh material={matBasePlate} position={[0, 0.055, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.006, 8]} />
          </mesh>
        </group>

        {/* E-stop */}
        <group position={[0.09, 0.4, 0.02]}>
          <mesh material={matEStop}>
            <cylinderGeometry args={[0.018, 0.018, 0.015, 12]} />
          </mesh>
          <mesh material={matYellowLight} position={[0, -0.005, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 0.005, 12]} />
          </mesh>
        </group>
      </group>

      {/* ═══ Base Frame — extends from ground (Y=0 in world = Y=-bottomY in group) to spiral bottom ═══ */}
      {showLegs && (
        <group>
          {/* Support legs: fabricated square-tube columns on anchor plates */}
          {supportFeet.map(([lx, lz], i) => (
            <group key={`leg-${i}`}>
              {/* Square tube column */}
              <mesh material={matTowerFrame} position={[lx, -bottomY / 2, lz]} castShadow>
                <boxGeometry args={[legTubeW, legHeight, legTubeD]} />
              </mesh>
              {/* Head plate */}
              <mesh material={matBasePlate} position={[lx, 0.01, lz]} castShadow>
                <boxGeometry args={[legTubeW * 1.22, 0.012, legTubeD * 1.22]} />
              </mesh>
              {/* Stiffener collar */}
              <mesh material={matBasePlate} position={[lx, -bottomY * 0.72, lz]} castShadow>
                <boxGeometry args={[legTubeW * 1.18, 0.018, legTubeD * 1.18]} />
              </mesh>
              {/* Floor mounting plate */}
              <mesh material={matBasePlate} position={[lx, footPlateY, lz]} castShadow>
                <boxGeometry args={[0.12, 0.014, 0.11]} />
              </mesh>
              {/* Elastomer floor contact */}
              <mesh material={matRubber} position={[lx, floorContactY, lz]}>
                <cylinderGeometry args={[0.03, 0.032, 0.008, 10]} />
              </mesh>
            </group>
          ))}
          {/* Welded ladder-style base frame */}
          <group position={mainBaseBeamCenter} rotation={[0, mainBaseBeamYaw, 0]}>
            <mesh material={matBasePlate} position={[0, 0, frameRailSpan / 2]} castShadow>
              <boxGeometry args={[frameRailLength, 0.05, 0.08]} />
            </mesh>
            <mesh material={matBasePlate} position={[0, 0, -frameRailSpan / 2]} castShadow>
              <boxGeometry args={[frameRailLength, 0.05, 0.08]} />
            </mesh>
            {[-0.42, 0.42].map((s, i) => (
              <mesh key={`base-cross-${i}`} material={matBasePlate} position={[frameRailLength * s, 0, 0]} castShadow>
                <boxGeometry args={[0.09, 0.045, frameRailSpan + 0.02]} />
              </mesh>
            ))}
          </group>
          {/* Mid-height brace (if tall enough) */}
          {bottomY > 0.5 && (
            <mesh material={matBasePlate} position={[towerX * 0.5, -bottomY / 2, towerZ * 0.5]} rotation={[0, mainBaseBeamYaw, 0]} castShadow>
              <boxGeometry args={[Math.max(0.22, mainBaseBeamLength * 0.88), 0.036, 0.052]} />
            </mesh>
          )}
          {/* Upper connection plate (at spiral base) */}
          <mesh material={matBasePlate}
            position={[0, -0.02, 0]}
            rotation={[0, towerYaw, 0]} castShadow>
            <boxGeometry args={[Math.max(0.01, Math.sqrt(towerX * towerX + towerZ * towerZ)), 0.04, 0.08]} />
          </mesh>
        </group>
      )}

      {/* ═══ Infeed Tangent Section ═══ */}
      <group position={infeedFinal.pos} rotation={[0, infeedFinal.yaw, 0]}>
        <mesh material={matBeltDark} position={[tangentLength * 0.5, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[tangentLength, beltThickness, beltWidthM]} />
        </mesh>
        <mesh material={matDrumStainless} position={[tangentLength * 0.5, -beltThickness * 0.7, 0]}>
          <boxGeometry args={[tangentLength, 0.004, beltWidthM * 0.9]} />
        </mesh>
        {sideGuides && (
          <>
            <mesh material={matOuterBand} position={[tangentLength * 0.5, guideHeightM * 0.4, beltWidthM / 2 + 0.003]}>
              <boxGeometry args={[tangentLength, guideHeightM, 0.003]} />
            </mesh>
            <mesh material={matOuterBand} position={[tangentLength * 0.5, guideHeightM * 0.4, -beltWidthM / 2 - 0.003]}>
              <boxGeometry args={[tangentLength, guideHeightM, 0.003]} />
            </mesh>
          </>
        )}
        {/* Sensor mount at infeed */}
        <group position={[tangentLength + 0.02, 0.06, beltWidthM / 2 + 0.02]}>
          <mesh material={matSensorGray}>
            <boxGeometry args={[0.015, 0.04, 0.015]} />
          </mesh>
          <mesh material={matSensorGray} position={[0, 0.025, -0.01]}>
            <cylinderGeometry args={[0.005, 0.005, 0.015, 8]} />
          </mesh>
        </group>
      </group>

      {/* ═══ Chain Return Unit (clearly visible industrial cassette) ═══ */}
      <group position={returnUnitPos} rotation={[0, outfeedFinal.yaw, 0]}>
        {/* Main welded frame */}
        <mesh material={matTowerFrame} position={[0.2, 0.03, 0]} castShadow>
          <boxGeometry args={[0.4, 0.06, beltWidthM * 0.9]} />
        </mesh>
        {/* Service cover */}
        <mesh material={matDrumStainless} position={[0.2, 0.072, 0]} castShadow>
          <boxGeometry args={[0.38, 0.008, beltWidthM * 0.82]} />
        </mesh>
        {/* Front/rear sprocket shafts */}
        {[0.05, 0.35].map((x, i) => (
          <group key={`ret-sprocket-${i}`} position={[x, 0.075, 0]}>
            <mesh material={matDrumStainless} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.038, 0.038, beltWidthM * 0.86, 16]} />
            </mesh>
            <mesh material={matSeamDark} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.028, 0.028, beltWidthM * 0.88, 14]} />
            </mesh>
          </group>
        ))}
        {/* Side guards with visible profile */}
        {[-1, 1].map((sz, i) => (
          <mesh key={`ret-guard-${i}`} material={matGuardCover} position={[0.2, 0.102, sz * (beltWidthM * 0.45)]} castShadow>
            <boxGeometry args={[0.38, 0.05, 0.014]} />
          </mesh>
        ))}
        {/* Mounting feet */}
        {[0.06, 0.34].map((x, i) => (
          <mesh key={`ret-foot-${i}`} material={matBasePlate} position={[x, -0.005, 0]} castShadow>
            <boxGeometry args={[0.05, 0.01, beltWidthM * 0.72]} />
          </mesh>
        ))}
      </group>

      {/* ═══ Bolt patterns on drum flanges ═══ */}
      {[0, Math.PI / 3, (2 * Math.PI) / 3, Math.PI, (4 * Math.PI) / 3, (5 * Math.PI) / 3].map((a, i) => (
        <React.Fragment key={`dbolt-${i}`}>
          <Bolt position={[Math.cos(a) * (drumRadius + 0.01), effectiveHeight + 0.017, Math.sin(a) * (drumRadius + 0.01)]} />
          <Bolt position={[Math.cos(a) * (drumRadius + 0.015), -0.021, Math.sin(a) * (drumRadius + 0.015)]} />
        </React.Fragment>
      ))}
    </group>
  );
};

export default SpiralConveyorModel;
