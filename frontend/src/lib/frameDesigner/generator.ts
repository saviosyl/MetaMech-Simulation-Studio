import { FrameAssembly, FrameMember, FrameNode, FrameTemplateId } from './model';

interface GenerateFrameAssemblyInput {
  name: string;
  templateId: FrameTemplateId;
  profileFamilyId: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
}

function id(prefix: string, idx: number): string {
  return `${prefix}-${idx}`;
}

type NodeMap = Record<string, string>;

function makeCorners(widthMm: number, heightMm: number, depthMm: number): { nodes: FrameNode[]; map: NodeMap } {
  const corners: Array<[string, [number, number, number]]> = [
    ['A', [0, 0, 0]],
    ['B', [widthMm, 0, 0]],
    ['C', [widthMm, 0, depthMm]],
    ['D', [0, 0, depthMm]],
    ['E', [0, heightMm, 0]],
    ['F', [widthMm, heightMm, 0]],
    ['G', [widthMm, heightMm, depthMm]],
    ['H', [0, heightMm, depthMm]],
  ];

  const nodes: FrameNode[] = [];
  const map: NodeMap = {};
  corners.forEach(([key, p], idx) => {
    const nid = id('node', idx + 1);
    map[key] = nid;
    nodes.push({ id: nid, positionMm: p });
  });
  return { nodes, map };
}

function addMember(
  members: FrameMember[],
  startNodeId: string,
  endNodeId: string,
  profileFamilyId: string,
  role: FrameMember['role'],
): void {
  members.push({
    id: id('member', members.length + 1),
    startNodeId,
    endNodeId,
    profileFamilyId,
    role,
  });
}

function addBaseTopLoops(members: FrameMember[], map: NodeMap, profileFamilyId: string): void {
  // Base rectangle
  addMember(members, map.A, map.B, profileFamilyId, 'beam');
  addMember(members, map.B, map.C, profileFamilyId, 'beam');
  addMember(members, map.C, map.D, profileFamilyId, 'beam');
  addMember(members, map.D, map.A, profileFamilyId, 'beam');

  // Top rectangle
  addMember(members, map.E, map.F, profileFamilyId, 'beam');
  addMember(members, map.F, map.G, profileFamilyId, 'beam');
  addMember(members, map.G, map.H, profileFamilyId, 'beam');
  addMember(members, map.H, map.E, profileFamilyId, 'beam');
}

function addPosts(members: FrameMember[], map: NodeMap, profileFamilyId: string): void {
  addMember(members, map.A, map.E, profileFamilyId, 'post');
  addMember(members, map.B, map.F, profileFamilyId, 'post');
  addMember(members, map.C, map.G, profileFamilyId, 'post');
  addMember(members, map.D, map.H, profileFamilyId, 'post');
}

function addRingAtY(
  nodes: FrameNode[],
  members: FrameMember[],
  widthMm: number,
  depthMm: number,
  yMm: number,
  profileFamilyId: string,
): void {
  const i = nodes.length + 1;
  const p1: FrameNode = { id: id('node', i), positionMm: [0, yMm, 0] };
  const p2: FrameNode = { id: id('node', i + 1), positionMm: [widthMm, yMm, 0] };
  const p3: FrameNode = { id: id('node', i + 2), positionMm: [widthMm, yMm, depthMm] };
  const p4: FrameNode = { id: id('node', i + 3), positionMm: [0, yMm, depthMm] };
  nodes.push(p1, p2, p3, p4);

  addMember(members, p1.id, p2.id, profileFamilyId, 'beam');
  addMember(members, p2.id, p3.id, profileFamilyId, 'beam');
  addMember(members, p3.id, p4.id, profileFamilyId, 'beam');
  addMember(members, p4.id, p1.id, profileFamilyId, 'beam');
}

export function generateFrameAssembly(input: GenerateFrameAssemblyInput): FrameAssembly {
  const widthMm = Math.max(400, Math.round(input.widthMm));
  const heightMm = Math.max(400, Math.round(input.heightMm));
  const depthMm = Math.max(250, Math.round(input.depthMm));

  const base = makeCorners(widthMm, heightMm, depthMm);
  const nodes: FrameNode[] = [...base.nodes];
  const members: FrameMember[] = [];

  addPosts(members, base.map, input.profileFamilyId);
  addBaseTopLoops(members, base.map, input.profileFamilyId);

  switch (input.templateId) {
    case 'table-frame': {
      const y = Math.round(heightMm * 0.45);
      addRingAtY(nodes, members, widthMm, depthMm, y, input.profileFamilyId);
      break;
    }
    case 'support-stand': {
      const y = Math.round(heightMm * 0.5);
      addRingAtY(nodes, members, widthMm, depthMm, y, input.profileFamilyId);
      addMember(members, base.map.E, base.map.G, input.profileFamilyId, 'brace');
      addMember(members, base.map.F, base.map.H, input.profileFamilyId, 'brace');
      break;
    }
    case 'guarding-frame': {
      const y = Math.round(heightMm * 0.5);
      addRingAtY(nodes, members, widthMm, depthMm, y, input.profileFamilyId);
      addMember(members, base.map.D, base.map.F, input.profileFamilyId, 'brace');
      addMember(members, base.map.A, base.map.G, input.profileFamilyId, 'brace');
      break;
    }
    case 'enclosure-frame': {
      const y1 = Math.round(heightMm * 0.4);
      const y2 = Math.round(heightMm * 0.75);
      addRingAtY(nodes, members, widthMm, depthMm, y1, input.profileFamilyId);
      addRingAtY(nodes, members, widthMm, depthMm, y2, input.profileFamilyId);
      addMember(members, base.map.E, base.map.G, input.profileFamilyId, 'brace');
      addMember(members, base.map.F, base.map.H, input.profileFamilyId, 'brace');
      break;
    }
    default:
      break;
  }

  return {
    id: 'frame-assembly-1',
    name: input.name,
    templateId: input.templateId,
    profileFamilyId: input.profileFamilyId,
    widthMm,
    heightMm,
    depthMm,
    nodes,
    members,
  };
}
