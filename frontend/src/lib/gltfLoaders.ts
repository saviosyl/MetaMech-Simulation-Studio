import { useGLTF } from '@react-three/drei';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.5/';

let sharedDracoLoader: DRACOLoader | null = null;

function getSharedDracoLoader(): DRACOLoader {
  if (!sharedDracoLoader) {
    sharedDracoLoader = new DRACOLoader();
    sharedDracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    sharedDracoLoader.preload();
  }
  return sharedDracoLoader;
}

export function configureGlobalGLTFLoaders(): void {
  useGLTF.setDecoderPath(DRACO_DECODER_PATH);
}

export function useDracoGLTF<TPath extends string | string[]>(
  path: TPath
): ReturnType<typeof useGLTF<TPath>> {
  return useGLTF(path, DRACO_DECODER_PATH);
}

export function configureGLTFLoader(loader: GLTFLoader): GLTFLoader {
  loader.setDRACOLoader(getSharedDracoLoader());
  return loader;
}

export function createConfiguredGLTFLoader(): GLTFLoader {
  return configureGLTFLoader(new GLTFLoader());
}

export function toFriendlyGlbLoadError(error: unknown): string {
  const raw = String((error as { message?: string } | undefined)?.message || error || '').trim();
  const lower = raw.toLowerCase();

  if (lower.includes('no dracoloader instance provided') || lower.includes('khr_draco_mesh_compression')) {
    return 'This model uses Draco compression and the decoder is not available in preview right now.';
  }
  if (lower.includes('draco') && (lower.includes('failed to fetch') || lower.includes('404'))) {
    return 'This model uses Draco compression, but decoder files could not be loaded. Please retry or contact admin.';
  }
  if (lower.includes('unknown extension') || lower.includes('unsupported extension')) {
    return 'This GLB uses an extension that is not supported in preview yet.';
  }
  if (lower.includes('unexpected token') || lower.includes('invalid gltf')) {
    return 'This file appears to be an invalid or unsupported GLB.';
  }
  return raw || 'Model preview failed to load.';
}
