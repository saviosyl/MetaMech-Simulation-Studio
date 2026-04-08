/**
 * SpiralConveyorModel — Premium procedural AmbaFlex SV-style spiral conveyor
 * Continuous helix ribbon geometry. R3F, no GLB dependency.
 */
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

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
  const direction = parameters.direction || 'up';
  const beltWidthM = (parameters.beltWidth ?? 400) / 1000;
  const turns = Math.max(parameters.turns ?? 3, 0.5);
  // Infeed is ALWAYS fixed at angle 0 (positive Z). Outfeed angle is configurable.
  const outfeedAngleDeg = parameters.outfeedAngle ?? 180;
  const outfeedAngleRad = (outfeedAngleDeg * Math.PI) / 180;
  const sideGuides = parameters.sideGuides !== false;
  const guideHeightM = (parameters.guideHeight ?? 80) / 1000;
  const showLegs = parameters.showLegs !== false;
  const centerStructure = parameters.centerStructure || 'column';

  // Height from ground — these are absolute floor-referenced heights
  const infeedHeightM = (parameters.infeedHeight ?? 800) / 1000;
  const outfeedHeightM = (parameters.outfeedHeight ?? 3800) / 1000;

  const isDown = direction === 'down';

  const bottomY = Math.min(infeedHeightM, outfeedHeightM);
  const topY = Math.max(infeedHeightM, outfeedHeightM);
  const effectiveHeight = Math.max(topY - bottomY, 0.1);

  // ─── Derived geometry ───
  const drumRadius = 0.2;
  const innerRadius = drumRadius + 0.02;
  const outerRadius = innerRadius + beltWidthM;
  const midRadius = (innerRadius + outerRadius) / 2;
  const beltThickness = 0.015;

  // Helix angles: infeed fixed at 0, total angle = full turns + outfeed angle offset
  const startAngle = 0; // infeed always at angle 0
  const totalAngle = turns * Math.PI * 2 + outfeedAngleRad;

  // Segments: ~60 per turn, capped at 600
  const segsPerTurn = 60;
  const totalSegs = Math.min(Math.ceil((totalAngle / (Math.PI * 2)) * segsPerTurn), 600);

  // Tangent section length
  const tangentLength = 0.35;

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

  // Support bracket anchor points along the helix (every quarter turn).
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

  const supportGroundY = -bottomY;
  const supportTopY = effectiveHeight + 0.06;
  const supportHeight = Math.max(0.2, supportTopY - supportGroundY);
  const supportCenterY = supportGroundY + supportHeight / 2;
  const frameDepth = 0.12;
  const levelSupportYs = useMemo(() => {
    const levels = Math.max(3, Math.ceil(turns) + 1);
    return Array.from({ length: levels }, (_, i) => {
      const t = levels > 1 ? i / (levels - 1) : 0;
      return t * effectiveHeight;
    });
  }, [turns, effectiveHeight]);

  // Drum seams — thin cylinder rings instead of torus
  const drumSeams = useMemo(() => {
    const seams: number[] = [];
    const seamSpacing = 0.5;
    for (let y = seamSpacing; y < effectiveHeight; y += seamSpacing) {
      seams.push(y);
    }
    return seams;
  }, [effectiveHeight]);

  // Rear support frame position (outfeed side)
  const towerAngle = startAngle + totalAngle;
  const towerDist = outerRadius + 0.22;
  const towerX = Math.cos(towerAngle) * towerDist;
  const towerZ = Math.sin(towerAngle) * towerDist;
  const towerYaw = -towerAngle + Math.PI / 2;
  const tripodRadius = Math.max(outerRadius + 0.24, 0.55);
  const tripodBeamY = supportGroundY + 0.045;
  const tripodFootTopY = supportGroundY + 0.006;
  const tripodStemY = supportGroundY + 0.02;
  const supportArmAnchorX = Math.cos(towerAngle) * (outerRadius - 0.03);
  const supportArmAnchorZ = Math.sin(towerAngle) * (outerRadius - 0.03);
  const supportArmDx = supportArmAnchorX - towerX;
  const supportArmDz = supportArmAnchorZ - towerZ;
  const supportArmLen = Math.max(0.12, Math.sqrt(supportArmDx * supportArmDx + supportArmDz * supportArmDz));
  const supportArmYaw = Math.atan2(supportArmDz, supportArmDx);
  const tripodFootPositions = useMemo<[number, number][]>(() => {
    const base = towerAngle + Math.PI;
    return [0, 1, 2].map((i) => {
      const a = base + ((Math.PI * 2) * i) / 3;
      return [Math.cos(a) * tripodRadius, Math.sin(a) * tripodRadius] as [number, number];
    });
  }, [towerAngle, tripodRadius]);

  const tangentYaw = (tx: number, tz: number) => Math.atan2(-tz, tx);
  const startTanX = -Math.sin(startAngle);
  const startTanZ = Math.cos(startAngle);
  const endAngle = totalAngle;
  const endTanX = -Math.sin(endAngle);
  const endTanZ = Math.cos(endAngle);
  const startAnchor: [number, number, number] = [
    Math.cos(startAngle) * midRadius,
    0,
    Math.sin(startAngle) * midRadius,
  ];
  const endAnchor: [number, number, number] = [
    Math.cos(endAngle) * midRadius,
    effectiveHeight,
    Math.sin(endAngle) * midRadius,
  ];

  // Physical flow direction on the belt at each anchor (horizontal projection).
  const startFlow: [number, number, number] = isDown
    ? [-startTanX, 0, -startTanZ]
    : [startTanX, 0, startTanZ];
  const endFlow: [number, number, number] = isDown
    ? [-endTanX, 0, -endTanZ]
    : [endTanX, 0, endTanZ];

  // Logical node role swap for down-spiral:
  // - up: input at start, output at end
  // - down: input at end, output at start
  const inputAnchor = isDown ? endAnchor : startAnchor;
  const inputFlow = isDown ? endFlow : startFlow;
  const outputAnchor = isDown ? startAnchor : endAnchor;
  const outputFlow = isDown ? startFlow : endFlow;

  // Tangent section placement:
  // - Input section runs from external connection point -> anchor (toward spiral)
  // - Output section runs from anchor -> external connection point
  const infeedPortPos: [number, number, number] = [
    inputAnchor[0] - inputFlow[0] * tangentLength,
    inputAnchor[1],
    inputAnchor[2] - inputFlow[2] * tangentLength,
  ];
  const infeedFinal = {
    pos: infeedPortPos,
    yaw: tangentYaw(inputFlow[0], inputFlow[2]),
  };
  const outfeedFinal = {
    pos: outputAnchor,
    yaw: tangentYaw(outputFlow[0], outputFlow[2]),
  };

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
        <group key={`bracket-${i}`}>
          <mesh
            material={matTowerFrame}
            position={[
              Math.cos(b.angle) * (drumRadius + (outerRadius - drumRadius) * 0.52),
              b.y - 0.02,
              Math.sin(b.angle) * (drumRadius + (outerRadius - drumRadius) * 0.52),
            ]}
            rotation={[0, -b.angle, 0]}
            castShadow
          >
            <boxGeometry args={[Math.max(0.12, outerRadius - drumRadius - 0.03), 0.014, 0.026]} />
          </mesh>
          <mesh
            material={matTowerFrame}
            position={[Math.cos(b.angle) * (outerRadius - 0.016), b.y + 0.01, Math.sin(b.angle) * (outerRadius - 0.016)]}
            castShadow
          >
            <boxGeometry args={[0.016, 0.035, 0.016]} />
          </mesh>
        </group>
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
        {/* Minimal horizontal ties (clean rear frame style) */}
        {[0.22, effectiveHeight * 0.55, effectiveHeight + 0.03].map((yy, i) => (
          <mesh key={`xbrace-${i}`} material={matTowerFrame} position={[0, yy, 0]} castShadow>
            <boxGeometry args={[0.16, 0.025, 0.035]} />
          </mesh>
        ))}

        {/* Connection arms to spiral — top */}
        <mesh material={matTowerFrame} position={[0, effectiveHeight - 0.05, 0.15]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.3]} />
        </mesh>
        {/* Connection arm — bottom */}
        <mesh material={matTowerFrame} position={[0, 0.05, 0.15]} castShadow>
          <boxGeometry args={[0.05, 0.05, 0.3]} />
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

      {/* ═══ Base Frame — compact industrial tripod + level arms ═══ */}
      {showLegs && (
        <group>
          {/* Central support extension to ground */}
          <mesh material={matDrumStainless} position={[0, (supportGroundY - 0.02) / 2, 0]} castShadow>
            <cylinderGeometry args={[drumRadius * 0.78, drumRadius * 0.78, Math.max(0.08, -supportGroundY + 0.02), 24]} />
          </mesh>

          {/* Tripod beams + feet */}
          {tripodFootPositions.map(([fx, fz], i) => {
            const dx = fx;
            const dz = fz;
            const len = Math.sqrt(dx * dx + dz * dz);
            const yaw = Math.atan2(dz, dx);
            return (
              <group key={`tripod-${i}`}>
                <mesh
                  material={matTowerFrame}
                  position={[fx * 0.5, tripodBeamY, fz * 0.5]}
                  rotation={[0, yaw, 0]}
                  castShadow
                >
                  <boxGeometry args={[len, 0.03, 0.05]} />
                </mesh>
                <mesh material={matTowerFrame} position={[fx, tripodStemY, fz]} castShadow>
                  <cylinderGeometry args={[0.014, 0.016, 0.04, 10]} />
                </mesh>
                <mesh material={matRubber} position={[fx, tripodFootTopY, fz]}>
                  <cylinderGeometry args={[0.035, 0.04, 0.012, 12]} />
                </mesh>
              </group>
            );
          })}

          {/* Rear mast grounding foot */}
          <mesh material={matRubber} position={[towerX, tripodFootTopY, towerZ]}>
            <cylinderGeometry args={[0.03, 0.034, 0.012, 12]} />
          </mesh>

          {/* Clean horizontal support arms from rear mast to spiral levels */}
          {levelSupportYs.map((yy, i) => (
            <mesh
              key={`level-arm-${i}`}
              material={matTowerFrame}
              position={[(towerX + supportArmAnchorX) / 2, yy - 0.02, (towerZ + supportArmAnchorZ) / 2]}
              rotation={[0, supportArmYaw, 0]}
              castShadow
            >
              <boxGeometry args={[supportArmLen, 0.018, 0.032]} />
            </mesh>
          ))}
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

      {/* ═══ Outfeed Tangent Section ═══ */}
      <group position={outfeedFinal.pos} rotation={[0, outfeedFinal.yaw, 0]}>
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
        <group position={[tangentLength + 0.02, 0.06, -beltWidthM / 2 - 0.02]}>
          <mesh material={matSensorGray}>
            <boxGeometry args={[0.015, 0.04, 0.015]} />
          </mesh>
          <mesh material={matSensorGray} position={[0, 0.025, 0.01]}>
            <cylinderGeometry args={[0.005, 0.005, 0.015, 8]} />
          </mesh>
        </group>
      </group>

      {/* ═══ Chain Return Unit (rebuilt) ═══ */}
      <group position={[
        outputAnchor[0] + outputFlow[0] * 0.18,
        outputAnchor[1] - 0.09,
        outputAnchor[2] + outputFlow[2] * 0.18,
      ]} rotation={[0, outfeedFinal.yaw, 0]}>
        {/* Return cassette body */}
        <mesh material={matBasePlate} position={[0.18, 0.03, 0]} castShadow>
          <boxGeometry args={[0.36, 0.06, beltWidthM * 0.82]} />
        </mesh>
        {/* Stainless top cover */}
        <mesh material={matDrumStainless} position={[0.18, 0.062, 0]} castShadow>
          <boxGeometry args={[0.34, 0.006, beltWidthM * 0.78]} />
        </mesh>
        {/* Return sprockets/idlers */}
        {[0.04, 0.32].map((x, i) => (
          <group key={`ret-idler-${i}`} position={[x, 0.065, 0]}>
            <mesh material={matDrumStainless} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.032, 0.032, beltWidthM * 0.76, 14]} />
            </mesh>
            <mesh material={matSeamDark} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.024, 0.024, beltWidthM * 0.78, 12]} />
            </mesh>
          </group>
        ))}
        {/* Side guards */}
        {[-1, 1].map((sz, i) => (
          <mesh key={`ret-guard-${i}`} material={matGuardCover} position={[0.18, 0.09, sz * (beltWidthM * 0.42)]}>
            <boxGeometry args={[0.34, 0.045, 0.01]} />
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
