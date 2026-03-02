import * as THREE from 'three';
import type { BuilderResult, ConnectionPort } from './beltConveyorBuilder';

const frameMat = () => new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });
const beltMat = () => new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.1, roughness: 0.9 });
const railMat = () => new THREE.MeshStandardMaterial({ color: 0xffcc00, metalness: 0.5, roughness: 0.4 });
const columnMat = () => new THREE.MeshStandardMaterial({ color: 0x666666, metalness: 0.9, roughness: 0.2 });

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
  return m;
}

export function buildSpiralConveyor(params: Record<string, any>): BuilderResult {
  const diameter = (params.diameter ?? 2000) / 1000;
  const totalHeight = (params.totalHeight ?? 5000) / 1000;
  const direction = params.direction ?? 'up';
  const radius = diameter / 2;

  const group = new THREE.Group();

  // Central column
  addMesh(group, new THREE.CylinderGeometry(0.15, 0.15, totalHeight + 0.2, 16), columnMat(), [0, totalHeight / 2, 0]);

  // Base plate
  addMesh(group, new THREE.CylinderGeometry(radius * 0.5, radius * 0.5, 0.05, 16), frameMat(), [0, 0.025, 0]);

  // Calculate spiral segments
  const numTurns = totalHeight / (diameter * 0.6); // pitch relative to diameter
  const segsPerTurn = 30;
  const totalSegs = Math.ceil(numTurns * segsPerTurn);
  const angleStep = (2 * Math.PI) / segsPerTurn;
  const heightStep = totalHeight / totalSegs;
  const innerR = radius * 0.4;
  const outerR = radius;
  const segLen = angleStep * ((innerR + outerR) / 2);

  const ccw = params.direction === 'CCW' ? -1 : 1;

  for (let i = 0; i < totalSegs; i++) {
    const angle = i * angleStep * ccw;
    const y = i * heightStep;
    const nextAngle = (i + 1) * angleStep * ccw;
    const nextY = (i + 1) * heightStep;

    const midAngle = (angle + nextAngle) / 2;
    const midR = (innerR + outerR) / 2;
    const midX = Math.cos(midAngle) * midR;
    const midZ = Math.sin(midAngle) * midR;
    const midY = (y + nextY) / 2;

    // Belt segment
    const segW = outerR - innerR;
    addMesh(group, new THREE.BoxGeometry(segLen * 0.95, 0.012, segW), beltMat(),
      [midX, midY, midZ], [0, -midAngle + Math.PI / 2, Math.atan2(heightStep, segLen)]);

    // Outer guard rail (every other segment)
    if (i % 2 === 0) {
      const outX = Math.cos(midAngle) * outerR;
      const outZ = Math.sin(midAngle) * outerR;
      addMesh(group, new THREE.BoxGeometry(segLen * 0.9, 0.08, 0.004), railMat(),
        [outX, midY + 0.05, outZ], [0, -midAngle + Math.PI / 2, 0]);
    }

    // Inner guard rail (every other segment)
    if (i % 2 === 0) {
      const inX = Math.cos(midAngle) * innerR;
      const inZ = Math.sin(midAngle) * innerR;
      addMesh(group, new THREE.BoxGeometry(segLen * 0.5, 0.06, 0.004), railMat(),
        [inX, midY + 0.04, inZ], [0, -midAngle + Math.PI / 2, 0]);
    }

    // Support struts from column (every ~quarter turn)
    if (i % Math.floor(segsPerTurn / 4) === 0) {
      const strutLen = innerR - 0.15;
      const sx = Math.cos(midAngle) * (0.15 + strutLen / 2);
      const sz = Math.sin(midAngle) * (0.15 + strutLen / 2);
      addMesh(group, new THREE.BoxGeometry(strutLen, 0.04, 0.04), frameMat(),
        [sx, midY - 0.03, sz], [0, -midAngle + Math.PI / 2, 0]);
    }
  }

  // Entry/exit tangent sections
  const entryAngle = 0;
  const exitAngle = totalSegs * angleStep * ccw;
  const midR2 = (innerR + outerR) / 2;
  const entryX = Math.cos(entryAngle) * midR2;
  const entryZ = Math.sin(entryAngle) * midR2;
  const exitX = Math.cos(exitAngle) * midR2;
  const exitZ = Math.sin(exitAngle) * midR2;

  const isDown = direction === 'down';
  const ports: ConnectionPort[] = [
    { id: 'input', type: 'input', localPosition: isDown ? [exitX, totalHeight, exitZ] : [entryX, 0.01, entryZ] },
    { id: 'output', type: 'output', localPosition: isDown ? [entryX, 0.01, entryZ] : [exitX, totalHeight, exitZ] },
  ];

  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: totalHeight * 1.5 };
}
