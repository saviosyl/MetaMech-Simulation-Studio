import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export type SupportedModelFormat = 'glb' | 'gltf' | 'obj' | 'step';

export function inferModelFormat(url: string, explicitFormat?: string | null): SupportedModelFormat {
  const normalized = (explicitFormat || '').trim().toLowerCase();
  if (normalized === 'obj') return 'obj';
  if (normalized === 'step' || normalized === 'stp') return 'step';
  if (normalized === 'gltf') return 'gltf';
  if (normalized === 'glb') return 'glb';

  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (clean.endsWith('.obj')) return 'obj';
  if (clean.endsWith('.step') || clean.endsWith('.stp') || clean.endsWith('.iges') || clean.endsWith('.igs')) return 'step';
  if (clean.endsWith('.gltf')) return 'gltf';
  return 'glb';
}

function toFloatArray(values: unknown): Float32Array {
  if (Array.isArray(values)) return new Float32Array(values.map((v) => Number(v) || 0));
  if (values instanceof Float32Array) return values;
  if (values instanceof Uint32Array || values instanceof Int32Array) return new Float32Array(values as unknown as ArrayLike<number>);
  return new Float32Array();
}

function toIndexArray(values: unknown): Uint32Array {
  if (values instanceof Uint32Array) return values;
  if (values instanceof Uint16Array) return new Uint32Array(values);
  if (Array.isArray(values)) return new Uint32Array(values.map((v) => Number(v) || 0));
  return new Uint32Array();
}

function normalizeColor(input: unknown): THREE.Color {
  if (!Array.isArray(input) || input.length < 3) return new THREE.Color('#9ca3af');
  const [rRaw, gRaw, bRaw] = input;
  const r = Number(rRaw) || 0;
  const g = Number(gRaw) || 0;
  const b = Number(bRaw) || 0;
  const max = Math.max(Math.abs(r), Math.abs(g), Math.abs(b));
  if (max > 1) return new THREE.Color(r / 255, g / 255, b / 255);
  return new THREE.Color(r, g, b);
}

async function loadStepObject(url: string): Promise<THREE.Group> {
  const moduleRef: any = await import('occt-import-js');
  const createOcct = moduleRef.default || moduleRef;
  const occt = await createOcct();

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch STEP file (${res.status})`);
  const fileBytes = new Uint8Array(await res.arrayBuffer());
  const result = occt.ReadStepFile(fileBytes, {
    linearUnit: 'millimeter',
    linearDeflectionType: 'bounding_box_ratio',
    linearDeflection: 0.002,
    angularDeflection: 0.4,
  });

  if (!result?.success || !Array.isArray(result.meshes)) {
    throw new Error('STEP parse failed');
  }

  const group = new THREE.Group();
  for (const meshDef of result.meshes) {
    const geometry = new THREE.BufferGeometry();
    const positions = toFloatArray(meshDef?.attributes?.position?.array);
    if (positions.length === 0) continue;
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const normals = toFloatArray(meshDef?.attributes?.normal?.array);
    if (normals.length > 0) geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    else geometry.computeVertexNormals();

    const indexArray = toIndexArray(meshDef?.index?.array);
    if (indexArray.length > 0) geometry.setIndex(new THREE.BufferAttribute(indexArray, 1));

    const material = new THREE.MeshStandardMaterial({
      color: normalizeColor(meshDef?.color),
      metalness: 0.35,
      roughness: 0.65,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  // STEP/IGES imports are usually in millimeters.
  group.scale.setScalar(0.001);
  return group;
}

export async function loadModelObject(url: string, explicitFormat?: string | null): Promise<THREE.Object3D> {
  const format = inferModelFormat(url, explicitFormat);
  if (format === 'obj') {
    const obj = await new OBJLoader().loadAsync(url);
    // OEM OBJ imports are treated as millimeters; scene units are meters.
    obj.scale.setScalar(0.001);
    obj.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const mesh = child as THREE.Mesh;
      if (!mesh.geometry.getAttribute('normal')) {
        mesh.geometry.computeVertexNormals();
      }
      const baseColor = (mesh.material as any)?.color || new THREE.Color('#a3adb8');
      mesh.material = new THREE.MeshStandardMaterial({
        color: baseColor,
        metalness: 0.28,
        roughness: 0.45,
        side: THREE.DoubleSide,
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return obj;
  }
  if (format === 'step') {
    return await loadStepObject(url);
  }
  const gltf = await new GLTFLoader().loadAsync(url);
  return gltf.scene;
}

