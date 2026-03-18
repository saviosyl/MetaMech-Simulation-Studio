export type FrameTemplateId = 'table-frame' | 'support-stand' | 'guarding-frame' | 'enclosure-frame';

export interface FrameNode {
  id: string;
  positionMm: [number, number, number];
}

export type FrameMemberRole = 'post' | 'beam' | 'brace';

export interface FrameMember {
  id: string;
  startNodeId: string;
  endNodeId: string;
  profileFamilyId: string;
  role: FrameMemberRole;
}

export interface FrameAssembly {
  id: string;
  name: string;
  templateId: FrameTemplateId;
  profileFamilyId: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  nodes: FrameNode[];
  members: FrameMember[];
}

export interface FrameBOMLine {
  profileFamilyId: string;
  profileName: string;
  section: string;
  cutLengthMm: number;
  quantity: number;
  totalLengthMm: number;
  totalMassKg: number;
}

export interface FrameBOMSummary {
  totalMembers: number;
  totalCutLengthMm: number;
  totalMassKg: number;
}

export interface FrameAssemblyExportContract {
  version: 'frame-assembly.v1';
  exportedAt: string;
  assembly: FrameAssembly;
  bom: {
    lines: FrameBOMLine[];
    summary: FrameBOMSummary;
  };
}
