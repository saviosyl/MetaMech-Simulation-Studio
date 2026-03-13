import * as THREE from 'three';
import { BuilderResult, ConnectionPort } from './beltConveyorBuilder';
import { FrameAssembly } from '../frameDesigner/model';
import { generateFrameAssembly } from '../frameDesigner/generator';
import { getProfileFamily } from '../frameDesigner/profileLibrary';

function asAssemblyFromParams(params: Record<string, any>): FrameAssembly {
  const fromPayload = params.frameAssembly as FrameAssembly | undefined;
  if (fromPayload?.nodes?.length && fromPayload?.members?.length) {
    return fromPayload;
  }
  return generateFrameAssembly({
    name: params.name || 'Frame Assembly',
    templateId: params.templateId || 'table-frame',
    profileFamilyId: params.profileFamilyId || 'profile-40x40',
    widthMm: Number(params.widthMm ?? 1600),
    heightMm: Number(params.heightMm ?? 1200),
    depthMm: Number(params.depthMm ?? 800),
  });
}

function addMemberMesh(
  group: THREE.Group,
  startMm: [number, number, number],
  endMm: [number, number, number],
  sectionMm: [number, number],
  material: THREE.Material,
): number {
  const sx = startMm[0] / 1000;
  const sy = startMm[1] / 1000;
  const sz = startMm[2] / 1000;
  const ex = endMm[0] / 1000;
  const ey = endMm[1] / 1000;
  const ez = endMm[2] / 1000;

  const start = new THREE.Vector3(sx, sy, sz);
  const end = new THREE.Vector3(ex, ey, ez);
  const dir = new THREE.Vector3().subVectors(end, start);
  const length = dir.length();
  if (length <= 1e-6) return 0;

  const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    dir.clone().normalize(),
  );

  const w = sectionMm[0] / 1000;
  const d = sectionMm[1] / 1000;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, length, d), material);
  mesh.position.copy(mid);
  mesh.quaternion.copy(q);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return length;
}

export function buildFrameAssembly(params: Record<string, any>): BuilderResult {
  const assembly = asAssemblyFromParams(params);
  const profile = getProfileFamily(assembly.profileFamilyId);
  const material = new THREE.MeshStandardMaterial({
    color: profile.color,
    metalness: 0.72,
    roughness: 0.32,
  });

  const group = new THREE.Group();
  group.name = `frame-assembly-${assembly.templateId}`;

  // Center frame around local origin on XZ (ground stays at y=0).
  const centerX = assembly.widthMm / 2000;
  const centerZ = assembly.depthMm / 2000;
  group.position.set(-centerX, 0, -centerZ);

  const nodeMap = new Map<string, [number, number, number]>();
  for (const node of assembly.nodes) nodeMap.set(node.id, node.positionMm);

  let totalLength = 0;
  for (const member of assembly.members) {
    const a = nodeMap.get(member.startNodeId);
    const b = nodeMap.get(member.endNodeId);
    if (!a || !b) continue;
    totalLength += addMemberMesh(group, a, b, profile.sectionMm, material);
  }

  const ports: ConnectionPort[] = [];
  const bounds = new THREE.Box3().setFromObject(group);
  return { group, ports, bounds, pathLength: totalLength };
}
