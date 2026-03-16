export type VideoQualityPreset = 'draft' | 'high' | 'presentation' | 'ultra';
export type VideoFormatPreference = 'auto' | 'webm' | 'mp4';

export interface VideoCapturePreset {
  label: string;
  description: string;
  captureFps: number;
  targetDpr: number;
  videoBitsPerSecond: number;
  shadowMapSize: number;
  contactShadowResolution: number;
  contactShadowBlur: number;
  toneMappingExposure: number;
  reflectionQuality: 'off' | 'medium' | 'high';
}

export const VIDEO_CAPTURE_PRESETS: Record<VideoQualityPreset, VideoCapturePreset> = {
  draft: {
    label: 'Draft',
    description: 'Fast preview recording',
    captureFps: 30,
    targetDpr: 1.2,
    videoBitsPerSecond: 12_000_000,
    shadowMapSize: 1024,
    contactShadowResolution: 256,
    contactShadowBlur: 2.6,
    toneMappingExposure: 1.05,
    reflectionQuality: 'off',
  },
  high: {
    label: 'High',
    description: 'Balanced quality and size',
    captureFps: 60,
    targetDpr: 1.7,
    videoBitsPerSecond: 24_000_000,
    shadowMapSize: 2048,
    contactShadowResolution: 512,
    contactShadowBlur: 2.2,
    toneMappingExposure: 1.1,
    reflectionQuality: 'off',
  },
  presentation: {
    label: 'Presentation',
    description: 'Premium output for demos',
    captureFps: 60,
    targetDpr: 2.2,
    videoBitsPerSecond: 40_000_000,
    shadowMapSize: 4096,
    contactShadowResolution: 1024,
    contactShadowBlur: 1.9,
    toneMappingExposure: 1.15,
    reflectionQuality: 'medium',
  },
  ultra: {
    label: 'Ultra',
    description: 'Maximum quality (large files)',
    captureFps: 60,
    targetDpr: 2.8,
    videoBitsPerSecond: 70_000_000,
    shadowMapSize: 4096,
    contactShadowResolution: 2048,
    contactShadowBlur: 1.6,
    toneMappingExposure: 1.2,
    reflectionQuality: 'high',
  },
};

export const VIDEO_QUALITY_PRESET_ORDER: VideoQualityPreset[] = ['draft', 'high', 'presentation', 'ultra'];

const MP4_MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E',
  'video/mp4;codecs=h264',
  'video/mp4',
];

const WEBM_MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

export function resolveRecordingMimeType(preference: VideoFormatPreference): {
  mimeType: string;
  extension: 'mp4' | 'webm';
  usedFallback: boolean;
} {
  const mp4Supported = MP4_MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime));
  const webmSupported = WEBM_MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime));

  const pickWebm = () => ({
    mimeType: webmSupported || 'video/webm',
    extension: 'webm' as const,
    usedFallback: false,
  });

  const pickMp4 = () => ({
    mimeType: mp4Supported || 'video/mp4',
    extension: 'mp4' as const,
    usedFallback: false,
  });

  if (preference === 'mp4') {
    if (mp4Supported) return pickMp4();
    const webm = pickWebm();
    return { ...webm, usedFallback: true };
  }

  if (preference === 'webm') {
    if (webmSupported) return pickWebm();
    const mp4 = pickMp4();
    return { ...mp4, usedFallback: true };
  }

  // auto: prefer MP4 when available, otherwise WebM
  if (mp4Supported) return pickMp4();
  return pickWebm();
}
