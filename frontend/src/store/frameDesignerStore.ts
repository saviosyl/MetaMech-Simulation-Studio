import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { generateFrameAssembly } from '../lib/frameDesigner/generator';
import { generateFrameBOM } from '../lib/frameDesigner/bom';
import { PROFILE_LIBRARY } from '../lib/frameDesigner/profileLibrary';
import { FrameAssembly, FrameTemplateId } from '../lib/frameDesigner/model';
import { createFrameAssemblyExportContract } from '../lib/frameDesigner/sceneInterop';

type BuildMode = 'template' | 'custom';

interface FrameDesignerState {
  frameName: string;
  templateId: FrameTemplateId;
  buildMode: BuildMode;
  profileFamilyId: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  assembly: FrameAssembly;
  customAssembly: FrameAssembly | null;
  bom: ReturnType<typeof generateFrameBOM>;
  selectedMemberId: string | null;

  setFrameName: (name: string) => void;
  setBuildMode: (mode: BuildMode) => void;
  setTemplateId: (templateId: FrameTemplateId) => void;
  setProfileFamilyId: (profileFamilyId: string) => void;
  setDimensions: (updates: Partial<Pick<FrameDesignerState, 'widthMm' | 'heightMm' | 'depthMm'>>) => void;
  regenerate: () => void;
  resetCustomWorkspace: () => void;
  selectMember: (memberId: string | null) => void;
  addCustomMember: (startPointMm: [number, number, number], endPointMm: [number, number, number], profileFamilyId?: string) => void;
  updateMemberLength: (memberId: string, lengthMm: number) => void;
  updateMemberProfile: (memberId: string, profileFamilyId: string) => void;
  exportContract: () => ReturnType<typeof createFrameAssemblyExportContract>;
}

function rebuildTemplate(
  state: Pick<FrameDesignerState, 'frameName' | 'templateId' | 'profileFamilyId' | 'widthMm' | 'heightMm' | 'depthMm'>,
): { assembly: FrameAssembly; bom: ReturnType<typeof generateFrameBOM> } {
  const assembly = generateFrameAssembly({
    name: state.frameName,
    templateId: state.templateId,
    profileFamilyId: state.profileFamilyId,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    depthMm: state.depthMm,
  });
  return { assembly, bom: generateFrameBOM(assembly) };
}

function createEmptyCustomAssembly(name: string, profileFamilyId: string): FrameAssembly {
  return {
    id: uuidv4(),
    name,
    templateId: 'table-frame',
    profileFamilyId,
    widthMm: 1200,
    heightMm: 1000,
    depthMm: 800,
    nodes: [],
    members: [],
  };
}

function recomputeAssemblyBounds(assembly: FrameAssembly): FrameAssembly {
  if (assembly.nodes.length === 0) {
    return { ...assembly, widthMm: 1200, heightMm: 1000, depthMm: 800 };
  }
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const n of assembly.nodes) {
    minX = Math.min(minX, n.positionMm[0]);
    minY = Math.min(minY, n.positionMm[1]);
    minZ = Math.min(minZ, n.positionMm[2]);
    maxX = Math.max(maxX, n.positionMm[0]);
    maxY = Math.max(maxY, n.positionMm[1]);
    maxZ = Math.max(maxZ, n.positionMm[2]);
  }

  return {
    ...assembly,
    widthMm: Math.max(200, Math.round(maxX - minX)),
    heightMm: Math.max(200, Math.round(maxY - minY)),
    depthMm: Math.max(200, Math.round(maxZ - minZ)),
  };
}

function upsertNode(
  assembly: FrameAssembly,
  pointMm: [number, number, number],
  toleranceMm = 2,
): { assembly: FrameAssembly; nodeId: string } {
  const existing = assembly.nodes.find((n) => {
    const dx = n.positionMm[0] - pointMm[0];
    const dy = n.positionMm[1] - pointMm[1];
    const dz = n.positionMm[2] - pointMm[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz) <= toleranceMm;
  });
  if (existing) return { assembly, nodeId: existing.id };

  const nodeId = uuidv4();
  return {
    assembly: {
      ...assembly,
      nodes: [...assembly.nodes, { id: nodeId, positionMm: pointMm }],
    },
    nodeId,
  };
}

const initialCore = {
  frameName: 'Aluminium Frame Assembly',
  templateId: 'table-frame' as FrameTemplateId,
  buildMode: 'template' as BuildMode,
  profileFamilyId: PROFILE_LIBRARY[2].id,
  widthMm: 1600,
  heightMm: 1200,
  depthMm: 800,
};

const initialTemplate = rebuildTemplate(initialCore);

export const useFrameDesignerStore = create<FrameDesignerState>((set, get) => ({
  ...initialCore,
  assembly: initialTemplate.assembly,
  customAssembly: null,
  bom: initialTemplate.bom,
  selectedMemberId: null,

  setFrameName: (frameName) =>
    set((state) => {
      if (state.buildMode === 'template') {
        const rebuilt = rebuildTemplate({ ...state, frameName });
        return { frameName, assembly: rebuilt.assembly, bom: rebuilt.bom };
      }
      const assembly = { ...state.assembly, name: frameName };
      const customAssembly = state.customAssembly ? { ...state.customAssembly, name: frameName } : null;
      return { frameName, assembly, customAssembly, bom: generateFrameBOM(assembly) };
    }),

  setBuildMode: (buildMode) =>
    set((state) => {
      if (buildMode === state.buildMode) return {};
      if (buildMode === 'template') {
        const rebuilt = rebuildTemplate(state);
        return {
          buildMode,
          assembly: rebuilt.assembly,
          bom: rebuilt.bom,
          selectedMemberId: null,
        };
      }
      const customAssembly = state.customAssembly ?? createEmptyCustomAssembly(state.frameName, state.profileFamilyId);
      return {
        buildMode,
        assembly: customAssembly,
        customAssembly,
        bom: generateFrameBOM(customAssembly),
        selectedMemberId: null,
      };
    }),

  setTemplateId: (templateId) =>
    set((state) => {
      if (state.buildMode !== 'template') return { templateId };
      const rebuilt = rebuildTemplate({ ...state, templateId });
      return { templateId, assembly: rebuilt.assembly, bom: rebuilt.bom };
    }),

  setProfileFamilyId: (profileFamilyId) =>
    set((state) => {
      if (state.buildMode === 'template') {
        const rebuilt = rebuildTemplate({ ...state, profileFamilyId });
        return { profileFamilyId, assembly: rebuilt.assembly, bom: rebuilt.bom };
      }
      return { profileFamilyId };
    }),

  setDimensions: (updates) =>
    set((state) => {
      const widthMm = updates.widthMm ?? state.widthMm;
      const heightMm = updates.heightMm ?? state.heightMm;
      const depthMm = updates.depthMm ?? state.depthMm;
      if (state.buildMode !== 'template') return { widthMm, heightMm, depthMm };
      const rebuilt = rebuildTemplate({ ...state, widthMm, heightMm, depthMm });
      return { widthMm, heightMm, depthMm, assembly: rebuilt.assembly, bom: rebuilt.bom };
    }),

  regenerate: () =>
    set((state) => {
      if (state.buildMode === 'template') {
        const rebuilt = rebuildTemplate(state);
        return { assembly: rebuilt.assembly, bom: rebuilt.bom };
      }
      const assembly = recomputeAssemblyBounds(state.assembly);
      return { assembly, customAssembly: assembly, bom: generateFrameBOM(assembly) };
    }),

  resetCustomWorkspace: () =>
    set((state) => {
      const customAssembly = createEmptyCustomAssembly(state.frameName, state.profileFamilyId);
      if (state.buildMode === 'custom') {
        return {
          customAssembly,
          assembly: customAssembly,
          bom: generateFrameBOM(customAssembly),
          selectedMemberId: null,
        };
      }
      return { customAssembly };
    }),

  selectMember: (selectedMemberId) => set({ selectedMemberId }),

  addCustomMember: (startPointMm, endPointMm, profileFamilyId) =>
    set((state) => {
      if (state.buildMode !== 'custom') return {};
      const dx = endPointMm[0] - startPointMm[0];
      const dy = endPointMm[1] - startPointMm[1];
      const dz = endPointMm[2] - startPointMm[2];
      if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 1) return {};

      let assembly = { ...state.assembly, nodes: [...state.assembly.nodes], members: [...state.assembly.members] };
      const a = upsertNode(assembly, startPointMm);
      assembly = a.assembly;
      const b = upsertNode(assembly, endPointMm);
      assembly = b.assembly;

      const memberId = uuidv4();
      assembly.members = [
        ...assembly.members,
        {
          id: memberId,
          startNodeId: a.nodeId,
          endNodeId: b.nodeId,
          profileFamilyId: profileFamilyId ?? state.profileFamilyId,
          role: 'beam',
        },
      ];
      assembly = recomputeAssemblyBounds(assembly);
      const bom = generateFrameBOM(assembly);
      return {
        assembly,
        customAssembly: assembly,
        bom,
        selectedMemberId: memberId,
        widthMm: assembly.widthMm,
        heightMm: assembly.heightMm,
        depthMm: assembly.depthMm,
      };
    }),

  updateMemberLength: (memberId, lengthMm) =>
    set((state) => {
      if (state.buildMode !== 'custom') return {};
      const targetLen = Math.max(10, Math.round(lengthMm));
      const assembly = {
        ...state.assembly,
        nodes: state.assembly.nodes.map((n) => ({ ...n })),
        members: state.assembly.members.map((m) => ({ ...m })),
      };
      const member = assembly.members.find((m) => m.id === memberId);
      if (!member) return {};

      const startNode = assembly.nodes.find((n) => n.id === member.startNodeId);
      const endNode = assembly.nodes.find((n) => n.id === member.endNodeId);
      if (!startNode || !endNode) return {};

      let dx = endNode.positionMm[0] - startNode.positionMm[0];
      let dy = endNode.positionMm[1] - startNode.positionMm[1];
      let dz = endNode.positionMm[2] - startNode.positionMm[2];
      const mag = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (mag < 1e-6) {
        dx = 1;
        dy = 0;
        dz = 0;
      } else {
        dx /= mag;
        dy /= mag;
        dz /= mag;
      }

      const newEnd: [number, number, number] = [
        Math.round(startNode.positionMm[0] + dx * targetLen),
        Math.round(startNode.positionMm[1] + dy * targetLen),
        Math.round(startNode.positionMm[2] + dz * targetLen),
      ];

      const endNodeRefs = assembly.members.filter((m) => m.endNodeId === member.endNodeId).length;
      if (endNodeRefs > 1) {
        const newNodeId = uuidv4();
        assembly.nodes.push({ id: newNodeId, positionMm: newEnd });
        member.endNodeId = newNodeId;
      } else {
        endNode.positionMm = newEnd;
      }

      const normalized = recomputeAssemblyBounds(assembly);
      return {
        assembly: normalized,
        customAssembly: normalized,
        bom: generateFrameBOM(normalized),
        widthMm: normalized.widthMm,
        heightMm: normalized.heightMm,
        depthMm: normalized.depthMm,
      };
    }),

  updateMemberProfile: (memberId, profileFamilyId) =>
    set((state) => {
      if (state.buildMode !== 'custom') return {};
      const assembly = {
        ...state.assembly,
        members: state.assembly.members.map((m) =>
          m.id === memberId ? { ...m, profileFamilyId } : { ...m },
        ),
      };
      return {
        assembly,
        customAssembly: assembly,
        bom: generateFrameBOM(assembly),
      };
    }),

  exportContract: () => {
    const state = get();
    return createFrameAssemblyExportContract(state.assembly, state.bom);
  },
}));
