import { getProfileFamily } from './profileLibrary';
import { FrameAssembly, FrameBOMLine, FrameBOMSummary } from './model';

interface AggregateLine {
  profileFamilyId: string;
  cutLengthMm: number;
  quantity: number;
}

function nodePosMap(assembly: FrameAssembly): Map<string, [number, number, number]> {
  const map = new Map<string, [number, number, number]>();
  assembly.nodes.forEach((n) => map.set(n.id, n.positionMm));
  return map;
}

function memberLengthMm(
  nodeMap: Map<string, [number, number, number]>,
  startNodeId: string,
  endNodeId: string,
): number {
  const a = nodeMap.get(startNodeId);
  const b = nodeMap.get(endNodeId);
  if (!a || !b) return 0;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  return Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz)));
}

export function generateFrameBOM(assembly: FrameAssembly): { lines: FrameBOMLine[]; summary: FrameBOMSummary } {
  const map = nodePosMap(assembly);
  const bucket = new Map<string, AggregateLine>();

  for (const member of assembly.members) {
    const lengthMm = memberLengthMm(map, member.startNodeId, member.endNodeId);
    const key = `${member.profileFamilyId}:${lengthMm}`;
    const prev = bucket.get(key);
    if (prev) {
      prev.quantity += 1;
    } else {
      bucket.set(key, {
        profileFamilyId: member.profileFamilyId,
        cutLengthMm: lengthMm,
        quantity: 1,
      });
    }
  }

  const lines: FrameBOMLine[] = [...bucket.values()]
    .map((row) => {
      const profile = getProfileFamily(row.profileFamilyId);
      const totalLengthMm = row.cutLengthMm * row.quantity;
      const totalMassKg = +((totalLengthMm / 1000) * profile.massKgPerM).toFixed(3);
      return {
        profileFamilyId: row.profileFamilyId,
        profileName: profile.name,
        section: `${profile.sectionMm[0]}x${profile.sectionMm[1]}`,
        cutLengthMm: row.cutLengthMm,
        quantity: row.quantity,
        totalLengthMm,
        totalMassKg,
      };
    })
    .sort((a, b) => b.cutLengthMm - a.cutLengthMm);

  const summary: FrameBOMSummary = {
    totalMembers: assembly.members.length,
    totalCutLengthMm: lines.reduce((sum, l) => sum + l.totalLengthMm, 0),
    totalMassKg: +lines.reduce((sum, l) => sum + l.totalMassKg, 0).toFixed(3),
  };

  return { lines, summary };
}
