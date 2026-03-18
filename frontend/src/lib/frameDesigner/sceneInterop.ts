import { FrameAssembly, FrameAssemblyExportContract, FrameBOMLine, FrameBOMSummary } from './model';

export const PENDING_FRAME_ASSEMBLY_KEY = 'metamech_pending_frame_assembly';

export function createFrameAssemblyExportContract(
  assembly: FrameAssembly,
  bom: { lines: FrameBOMLine[]; summary: FrameBOMSummary },
): FrameAssemblyExportContract {
  return {
    version: 'frame-assembly.v1',
    exportedAt: new Date().toISOString(),
    assembly,
    bom,
  };
}

export function setPendingFrameAssemblyExport(payload: FrameAssemblyExportContract): void {
  localStorage.setItem(PENDING_FRAME_ASSEMBLY_KEY, JSON.stringify(payload));
}

export function takePendingFrameAssemblyExport(): FrameAssemblyExportContract | null {
  const raw = localStorage.getItem(PENDING_FRAME_ASSEMBLY_KEY);
  if (!raw) return null;
  localStorage.removeItem(PENDING_FRAME_ASSEMBLY_KEY);
  try {
    const parsed = JSON.parse(raw) as FrameAssemblyExportContract;
    if (parsed?.version !== 'frame-assembly.v1' || !parsed.assembly) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function toFrameAssemblyParameters(payload: FrameAssemblyExportContract): Record<string, any> {
  return {
    templateId: payload.assembly.templateId,
    profileFamilyId: payload.assembly.profileFamilyId,
    widthMm: payload.assembly.widthMm,
    heightMm: payload.assembly.heightMm,
    depthMm: payload.assembly.depthMm,
    frameAssembly: payload.assembly,
    frameBom: payload.bom,
    frameExportedAt: payload.exportedAt,
  };
}
