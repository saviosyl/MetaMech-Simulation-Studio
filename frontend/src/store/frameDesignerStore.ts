import { create } from 'zustand';
import { generateFrameAssembly } from '../lib/frameDesigner/generator';
import { generateFrameBOM } from '../lib/frameDesigner/bom';
import { PROFILE_LIBRARY } from '../lib/frameDesigner/profileLibrary';
import { FrameAssembly, FrameTemplateId } from '../lib/frameDesigner/model';
import { createFrameAssemblyExportContract } from '../lib/frameDesigner/sceneInterop';

interface FrameDesignerState {
  frameName: string;
  templateId: FrameTemplateId;
  profileFamilyId: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  assembly: FrameAssembly;
  bom: ReturnType<typeof generateFrameBOM>;

  setFrameName: (name: string) => void;
  setTemplateId: (templateId: FrameTemplateId) => void;
  setProfileFamilyId: (profileFamilyId: string) => void;
  setDimensions: (updates: Partial<Pick<FrameDesignerState, 'widthMm' | 'heightMm' | 'depthMm'>>) => void;
  regenerate: () => void;
  exportContract: () => ReturnType<typeof createFrameAssemblyExportContract>;
}

function rebuild(
  state: Pick<FrameDesignerState, 'frameName' | 'templateId' | 'profileFamilyId' | 'widthMm' | 'heightMm' | 'depthMm'>,
): Pick<FrameDesignerState, 'assembly' | 'bom'> {
  const assembly = generateFrameAssembly({
    name: state.frameName,
    templateId: state.templateId,
    profileFamilyId: state.profileFamilyId,
    widthMm: state.widthMm,
    heightMm: state.heightMm,
    depthMm: state.depthMm,
  });
  const bom = generateFrameBOM(assembly);
  return { assembly, bom };
}

const initialCore = {
  frameName: 'Aluminium Frame Assembly',
  templateId: 'table-frame' as FrameTemplateId,
  profileFamilyId: PROFILE_LIBRARY[2].id,
  widthMm: 1600,
  heightMm: 1200,
  depthMm: 800,
};

const initialBuilt = rebuild(initialCore);

export const useFrameDesignerStore = create<FrameDesignerState>((set, get) => ({
  ...initialCore,
  ...initialBuilt,

  setFrameName: (frameName) => set((state) => ({ frameName, ...rebuild({ ...state, frameName }) })),
  setTemplateId: (templateId) => set((state) => ({ templateId, ...rebuild({ ...state, templateId }) })),
  setProfileFamilyId: (profileFamilyId) => set((state) => ({ profileFamilyId, ...rebuild({ ...state, profileFamilyId }) })),
  setDimensions: (updates) =>
    set((state) => {
      const widthMm = updates.widthMm ?? state.widthMm;
      const heightMm = updates.heightMm ?? state.heightMm;
      const depthMm = updates.depthMm ?? state.depthMm;
      return { widthMm, heightMm, depthMm, ...rebuild({ ...state, widthMm, heightMm, depthMm }) };
    }),
  regenerate: () => set((state) => ({ ...rebuild(state) })),
  exportContract: () => {
    const state = get();
    return createFrameAssemblyExportContract(state.assembly, state.bom);
  },
}));
