import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Copy, Crosshair, Maximize, Plus, Redo2, Ruler, Save, Shield, Trash2, Undo2, Upload, User } from 'lucide-react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, Grid, Html, Line, OrbitControls, TransformControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { useAuth } from '../contexts/AuthContext';
import {
  listLibraryAssets,
  publishLibraryAsset,
  updateLibraryAsset,
  uploadAssetThumbnail,
  uploadLibraryAsset,
} from '../utils/api';
import { AssetDefinitionNode, AssetMetadata, AssetMovingPart, BehaviorTemplateType, LibraryAsset } from '../types';
import { simulationUrls } from '../content/simulationMarketingContent';
import { refreshRuntimePublishedAssets } from '../lib/runtimePublishedAssets';
import { configureGLTFLoader, toFriendlyGlbLoadError } from '../lib/gltfLoaders';

type ModelHierarchyItem = {
  id: string;
  name: string;
  path: string;
  depth: number;
  isMesh: boolean;
  childCount: number;
};

type LeftPanelSectionKey = 'assets' | 'hierarchy' | 'nodes' | 'movingParts';

const LEFT_PANEL_MIN = 240;
const LEFT_PANEL_MAX = 460;
const RIGHT_PANEL_MIN = 300;
const RIGHT_PANEL_MAX = 560;
const VIEWPORT_MIN = 520;
const PANEL_WIDTHS_STORAGE_KEY = 'metamech.adminAssetEditor.panelWidths';
const ASSET_ROTATION_SECTION = 'assetRotation';
const HIERARCHY_SECTION = 'hierarchy';
const NODES_SECTION = 'nodes';
const MOVING_PARTS_SECTION = 'movingParts';

type SourceUnit = 'mm' | 'cm' | 'm' | 'unknown';

type RawBounds = {
  x: number;
  y: number;
  z: number;
  min: [number, number, number];
  max: [number, number, number];
};

type BoundsMm = {
  width: number;
  depth: number;
  height: number;
};

type ResizeDrag = {
  side: 'left' | 'right';
  startX: number;
  startLeft: number;
  startRight: number;
} | null;

type LeftPanelSection = 'assets' | 'hierarchy' | 'nodes' | 'moving';

type MeasureMode = 'two-point' | 'chain';
type CameraIntent = 'none' | 'fit' | 'frameSelected' | 'focusNode' | 'reset';
type InteractionTool = 'select' | 'move' | 'rotate' | 'node' | 'pivot' | 'measurement';
type PathMode = 'none' | 'straight-node' | 'polyline';
type PathPoint = { id: string; positionMm: [number, number, number] };
type NodeGizmoSnapMode = 'off' | 'surface' | 'center' | 'edge';
type TransformMode = 'translate' | 'rotate';
type CollapsibleSectionKey = 'assets' | 'hierarchy' | 'nodes' | 'movingParts';
type RotationTargetKind = 'assetRoot' | 'selectedObject' | 'selectedNode' | 'selectedPivot';
type RotationTargetInfo = {
  kind: RotationTargetKind;
  label: string;
  rotationDeg: [number, number, number];
};
type RotationSnapStep = 'off' | 45 | 15;

type MeasurementPoint = {
  id: string;
  positionMm: [number, number, number];
};

type LeftSectionKey = 'assets' | 'hierarchy' | 'nodes' | 'movingParts';

type BehaviorConfig = Record<string, number | string | boolean | (number | string)[]>;

type RuntimeControlsConfig = NonNullable<AssetMetadata['runtimeControls']>;
type ToolbarButton = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  activeWhen?: InteractionTool;
  onClick: () => void;
  disabled?: boolean;
};

function errorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function degToRad(value: number): number {
  return (value * Math.PI) / 180;
}

function radToDeg(value: number): number {
  return (value * 180) / Math.PI;
}

function normalizeEulerDeg(input: unknown, fallback: [number, number, number] = [0, 0, 0]): [number, number, number] {
  if (!Array.isArray(input) || input.length < 3) return fallback;
  const x = Number(input[0]);
  const y = Number(input[1]);
  const z = Number(input[2]);
  return [
    Number.isFinite(x) ? x : fallback[0],
    Number.isFinite(y) ? y : fallback[1],
    Number.isFinite(z) ? z : fallback[2],
  ];
}

const ASSET_ROOT_PATH = '__asset_root__';

function safeAssetMetadata(asset: LibraryAsset | null): AssetMetadata {
  if (!asset) return {};
  return (asset.metadata && typeof asset.metadata === 'object' ? asset.metadata : {}) as AssetMetadata;
}

function mmToM(value: number): number {
  return value / 1000;
}

function mToMm(value: number): number {
  return value * 1000;
}

function sourceUnitFactorToMeters(sourceUnit: SourceUnit): number {
  if (sourceUnit === 'mm') return 0.001;
  if (sourceUnit === 'cm') return 0.01;
  if (sourceUnit === 'm') return 1;
  return 1;
}

function sourceUnitFactorToMm(sourceUnit: SourceUnit): number {
  if (sourceUnit === 'mm') return 1;
  if (sourceUnit === 'cm') return 10;
  if (sourceUnit === 'm') return 1000;
  return 1000;
}

function computeBoundsMm(raw: RawBounds, sourceUnit: SourceUnit, scaleCorrection: number): BoundsMm {
  const factor = sourceUnitFactorToMm(sourceUnit) * Math.max(0.000001, scaleCorrection || 1);
  return {
    width: raw.x * factor,
    depth: raw.z * factor,
    height: raw.y * factor,
  };
}

function toMetadataNativeBounds(raw: RawBounds): NonNullable<AssetMetadata['nativeBounds']> {
  return {
    width: raw.x,
    depth: raw.z,
    height: raw.y,
    min: raw.min,
    max: raw.max,
  };
}

function fromMetadataNativeBounds(input: AssetMetadata['nativeBounds'] | undefined): RawBounds | null {
  if (!input) return null;
  const width = Number(input.width);
  const height = Number(input.height);
  const depth = Number(input.depth);
  const min = input.min;
  const max = input.max;
  if (
    !Number.isFinite(width)
    || !Number.isFinite(height)
    || !Number.isFinite(depth)
    || !Array.isArray(min)
    || !Array.isArray(max)
    || min.length < 3
    || max.length < 3
  ) {
    return null;
  }
  return {
    x: width,
    y: height,
    z: depth,
    min: [Number(min[0]) || 0, Number(min[1]) || 0, Number(min[2]) || 0],
    max: [Number(max[0]) || 0, Number(max[1]) || 0, Number(max[2]) || 0],
  };
}

function distanceMm(a: [number, number, number], b: [number, number, number]): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.sqrt((dx * dx) + (dy * dy) + (dz * dz));
}

function magnitudeMm(v: [number, number, number]): number {
  return Math.sqrt((v[0] * v[0]) + (v[1] * v[1]) + (v[2] * v[2]));
}

function nodeColorByType(nodeType: string | undefined): string {
  const t = String(nodeType || '').toLowerCase();
  if (t.includes('infeed') || t === 'product_in') return '#3b82f6'; // blue
  if (t.includes('outfeed') || t === 'product_out') return '#22c55e'; // green
  if (t.includes('stop') || t.includes('load')) return '#f59e0b'; // yellow
  if (t.includes('pick')) return '#f97316'; // orange
  if (t.includes('place')) return '#a855f7'; // purple
  if (t.includes('transfer')) return '#06b6d4';
  return '#22d3ee';
}

function defaultBehaviorConfig(template: BehaviorTemplateType): BehaviorConfig {
  if (template === 'straight-conveyor') {
    return {
      speedMpm: 20,
      direction: 'forward',
      usablePathLengthMm: 1200,
      conveyorTopHeightMm: 800,
      accumulationEnabled: false,
      stopMode: 'none',
      sensorList: '',
      stopperAssignment: '',
    };
  }
  if (template === 'lift-conveyor') {
    return {
      lowerInfeedNodeId: 'NODE_INFEED_LOWER',
      upperOutfeedNodeId: 'NODE_OUTFEED_UPPER',
      liftTravelAxis: 'y',
      lowerStopPositionMm: 800,
      upperStopPositionMm: 2400,
      targetHeightsMm: '800,2400',
      liftSpeedUpMps: 0.35,
      liftSpeedDownMps: 0.3,
      conveyorSpeedMpm: 12,
      dwellBeforeLiftSec: 0.5,
      dwellAfterLiftSec: 0.5,
      loadingZoneLengthMm: 350,
      unloadZoneLengthMm: 350,
      allowIntermediateLevels: false,
      homePositionMm: 800,
      cycleMode: 'auto-up-after-load',
    };
  }
  if (template === 'rotary-transfer') {
    return {
      pickNodeId: 'NODE_PICK',
      placeNodeIds: 'NODE_PLACE',
      rotationCenterNodeId: 'NODE_CENTER',
      rotationAngleDeg: 90,
      rotationSpeedDegPerSec: 120,
      dwellSec: 0.3,
      indexingMode: 'single',
      destinationMode: 'single',
    };
  }
  if (template === 'angle-transfer' || template === 'robot-pick-place') {
    return {
      sourceNodeId: 'NODE_SOURCE',
      destinationNodeIds: 'NODE_DEST',
      transferAngleDeg: 45,
      cycleTimeSec: 2.5,
      pickDelaySec: 0.2,
      placeDelaySec: 0.2,
      motionProfileSpeed: 1,
      gripperTiming: 'simple',
    };
  }
  return {};
}

function defaultRuntimeControlsForTemplate(template: BehaviorTemplateType): RuntimeControlsConfig {
  if (template === 'straight-conveyor') {
    return {
      showSpeedSlider: true,
      showTargetHeight: false,
      showAutoManual: false,
      showHomeCommand: false,
      showEnableToggle: true,
      showSensorState: true,
      showStopperState: true,
    };
  }
  if (template === 'lift-conveyor') {
    return {
      showSpeedSlider: true,
      showTargetHeight: true,
      showAutoManual: true,
      showHomeCommand: true,
      showEnableToggle: true,
      showSensorState: true,
      showStopperState: true,
    };
  }
  if (template === 'rotary-transfer' || template === 'angle-transfer' || template === 'robot-pick-place') {
    return {
      showSpeedSlider: true,
      showTargetHeight: false,
      showAutoManual: true,
      showHomeCommand: true,
      showEnableToggle: true,
      showSensorState: false,
      showStopperState: false,
    };
  }
  return {
    showSpeedSlider: false,
    showTargetHeight: false,
    showAutoManual: false,
    showHomeCommand: false,
    showEnableToggle: false,
    showSensorState: false,
    showStopperState: false,
  };
}

function asFiniteNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function hasNodeType(nodes: AssetDefinitionNode[], key: string): boolean {
  return nodes.some((n) => String(n.type || '').toLowerCase().includes(key));
}

function toNumberOrUndefined(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeBehaviorConfig(input: unknown): BehaviorConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: BehaviorConfig = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (
      typeof value === 'number'
      || typeof value === 'string'
      || typeof value === 'boolean'
      || (Array.isArray(value) && value.every((item) => typeof item === 'number' || typeof item === 'string'))
    ) {
      out[key] = value as number | string | boolean | (number | string)[];
    }
  }
  return out;
}

function fitCameraToBox(camera: THREE.Camera, controls: OrbitControlsLike | null, box: THREE.Box3): void {
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  const maxDim = Math.max(size.x, size.y, size.z, 0.001);
  const perspective = camera as THREE.PerspectiveCamera;
  const fovRad = THREE.MathUtils.degToRad(perspective.fov || 45);
  const distance = (maxDim / (2 * Math.tan(fovRad / 2))) * 1.35;
  perspective.position.set(center.x + distance, center.y + (distance * 0.7), center.z + distance);
  perspective.near = Math.max(0.01, distance / 1000);
  perspective.far = Math.max(1000, distance * 1000);
  perspective.updateProjectionMatrix();
  if (controls) {
    controls.target.copy(center);
    controls.update();
  }
}

type OrbitControlsLike = {
  target: THREE.Vector3;
  update: () => void;
  enabled?: boolean;
};

const CameraBridge: React.FC<{ onCamera: (camera: THREE.Camera) => void }> = ({ onCamera }) => {
  const { camera } = useThree();
  useEffect(() => {
    onCamera(camera);
  }, [camera, onCamera]);
  return null;
};

function displayObjectName(node: THREE.Object3D): string {
  const rawName = (node.name || '').trim();
  if (rawName) return rawName;
  return node.type ? `(unnamed ${node.type})` : '(unnamed)';
}

function findObjectByHierarchyPath(root: THREE.Object3D, path: string): THREE.Object3D | null {
  const parts = String(path || '')
    .split('/')
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;

  let current: THREE.Object3D = root;
  let partIndex = 0;
  const rootDisplay = displayObjectName(root);
  if (parts[0] === rootDisplay) partIndex = 1;

  for (; partIndex < parts.length; partIndex += 1) {
    const segment = parts[partIndex];
    const next = current.children.find((child) => displayObjectName(child) === segment);
    if (!next) return null;
    current = next;
  }
  return current;
}

function hierarchyPathFromObject(root: THREE.Object3D, object: THREE.Object3D): string | null {
  const segments: string[] = [];
  let current: THREE.Object3D | null = object;
  while (current) {
    segments.unshift(displayObjectName(current));
    if (current === root) return segments.join('/');
    current = current.parent;
  }
  return null;
}

function applyMotionPreview(
  targetRoot: THREE.Object3D,
  part: AssetMovingPart | null,
  previewT: number,
  worldScale: number
): void {
  if (!part) return;
  const v = part.min + (part.max - part.min) * previewT;
  const candidate = findObjectByHierarchyPath(targetRoot, part.objectName)
    || targetRoot.getObjectByName(part.objectName)
    || targetRoot;
  if (part.motionType === 'translate') {
    const delta = mmToM(v - part.default) / Math.max(worldScale, 0.000001);
    if (part.axis === 'x') candidate.position.x += delta;
    if (part.axis === 'y') candidate.position.y += delta;
    if (part.axis === 'z') candidate.position.z += delta;
  } else {
    const delta = ((v - part.default) * Math.PI) / 180;
    if (part.axis === 'x') candidate.rotation.x += delta;
    if (part.axis === 'y') candidate.rotation.y += delta;
    if (part.axis === 'z') candidate.rotation.z += delta;
  }
}

const ModelPreview: React.FC<{
  modelUrl: string | null;
  sourceUnit: SourceUnit;
  scaleCorrection: number;
  pivotOffsetMm: [number, number, number];
  assetRootRotationDeg: [number, number, number];
  objectRotationDegByPath: Record<string, [number, number, number]>;
  cameraIntent: CameraIntent;
  onCameraIntentHandled: () => void;
  activeTool: InteractionTool;
  pathMode: PathMode;
  measurementMode: MeasureMode;
  onModelBoundsComputed: (bounds: RawBounds | null) => void;
  measurementPoints: MeasurementPoint[];
  onMeasurementPointsChange: (points: MeasurementPoint[]) => void;
  frameTargetPath: string;
  nodes: AssetDefinitionNode[];
  selectedNodeIndex: number;
  onSelectNode: (index: number) => void;
  selectedObjectPath: string;
  onSelectObjectPath: (path: string) => void;
  onPlaceNodeAtMm: (positionMm: [number, number, number]) => void;
  onMoveNodeToMm: (index: number, positionMm: [number, number, number]) => void;
  onRotateSelectedObjectDeg: (path: string, rotationDeg: [number, number, number]) => void;
  onSetAssetRootRotationDeg: (rotationDeg: [number, number, number]) => void;
  setHierarchyItems: (items: ModelHierarchyItem[]) => void;
  highlightedObjectNames: string[];
  setHighlightedObjectNames: (names: string[]) => void;
  movingParts: AssetMovingPart[];
  previewPartIndex: number;
  previewT: number;
  pathPoints: PathPoint[];
  selectedPathPointIndex: number;
  onPathPointsChange: (points: PathPoint[]) => void;
  onSelectPathPoint: (index: number) => void;
  toolbarButtons: ToolbarButton[];
  rotationTargetInfo: RotationTargetInfo | null;
  rotationHintMessage: string;
  showWorldAxis: boolean;
  showLocalAxis: boolean;
  nodeSnapMode: NodeGizmoSnapMode;
  nodeTransformMode: TransformMode;
  rotationSnapStep: RotationSnapStep;
}> = ({
  modelUrl,
  sourceUnit,
  scaleCorrection,
  pivotOffsetMm,
  assetRootRotationDeg,
  objectRotationDegByPath,
  cameraIntent,
  onCameraIntentHandled,
  activeTool,
  pathMode,
  measurementMode,
  onModelBoundsComputed,
  measurementPoints,
  onMeasurementPointsChange,
  frameTargetPath,
  nodes,
  selectedNodeIndex,
  onSelectNode,
  selectedObjectPath,
  onSelectObjectPath,
  onPlaceNodeAtMm,
  onMoveNodeToMm,
  onRotateSelectedObjectDeg,
  onSetAssetRootRotationDeg,
  setHierarchyItems,
  highlightedObjectNames,
  setHighlightedObjectNames,
  movingParts,
  previewPartIndex,
  previewT,
  pathPoints,
  selectedPathPointIndex,
  onPathPointsChange,
  onSelectPathPoint,
  toolbarButtons,
  rotationTargetInfo,
  rotationHintMessage,
  showWorldAxis,
  showLocalAxis,
  nodeSnapMode,
  nodeTransformMode,
  rotationSnapStep,
}) => {
  const [loadedRoot, setLoadedRoot] = useState<THREE.Object3D | null>(null);
  const [loadError, setLoadError] = useState<string>('');
  const controlsRef = useRef<OrbitControlsLike | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const modelBoundsRef = useRef<THREE.Box3 | null>(null);
  const rootGroupRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!modelUrl) {
      setLoadedRoot(null);
      setHierarchyItems([]);
      setLoadError('');
      return () => {
        cancelled = true;
      };
    }

    const loader = new GLTFLoader();
    configureGLTFLoader(loader);
    (async () => {
      try {
        // Use explicit credentialed fetch so admin-only model endpoints include auth cookies.
        const response = await fetch(modelUrl, { credentials: 'include' });
        if (!response.ok) {
          throw new Error(`fetch for ${modelUrl} responded with ${response.status}`);
        }
        const modelBytes = await response.arrayBuffer();
        loader.parse(
          modelBytes,
          modelUrl,
          (gltf) => {
            if (cancelled) return;
            setLoadedRoot(gltf.scene);
            const hierarchy: ModelHierarchyItem[] = [];
            function walk(node: THREE.Object3D, parentPath: string, depth: number): void {
              const displayName = displayObjectName(node);
              const path = parentPath ? `${parentPath}/${displayName}` : displayName;
              hierarchy.push({
                id: `${path}#${hierarchy.length}`,
                name: displayName,
                path,
                depth,
                isMesh: !!(node as THREE.Mesh).isMesh,
                childCount: node.children.length,
              });
              for (const child of node.children) {
                walk(child, path, depth + 1);
              }
            }
            walk(gltf.scene, '', 0);
            setHierarchyItems(hierarchy);
            setLoadError('');
          },
          (err) => {
            if (!cancelled) {
              setLoadedRoot(null);
              setHierarchyItems([]);
              setLoadError(toFriendlyGlbLoadError(err));
            }
          }
        );
      } catch (err) {
        if (!cancelled) {
          setLoadedRoot(null);
          setHierarchyItems([]);
          setLoadError(toFriendlyGlbLoadError(err));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modelUrl, setHierarchyItems]);

  useEffect(() => {
    if (!loadedRoot) {
      onModelBoundsComputed(null);
      return;
    }
    const box = new THREE.Box3().setFromObject(loadedRoot);
    const size = new THREE.Vector3();
    box.getSize(size);
    onModelBoundsComputed({
      x: size.x,
      y: size.y,
      z: size.z,
      min: [box.min.x, box.min.y, box.min.z],
      max: [box.max.x, box.max.y, box.max.z],
    });
  }, [loadedRoot, onModelBoundsComputed]);

  const worldScale = useMemo(
    () => Math.max(0.000001, sourceUnitFactorToMeters(sourceUnit) * (Number.isFinite(scaleCorrection) ? scaleCorrection : 1)),
    [sourceUnit, scaleCorrection]
  );

  const previewRoot = useMemo(() => {
    if (!loadedRoot) return null;
    const clone = loadedRoot.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    clone.position.set(-center.x, -box.min.y, -center.z);
    clone.scale.setScalar(worldScale);
    clone.position.multiplyScalar(worldScale);
    clone.position.add(new THREE.Vector3(mmToM(pivotOffsetMm[0]), mmToM(pivotOffsetMm[1]), mmToM(pivotOffsetMm[2])));
    for (const [path, rotationDeg] of Object.entries(objectRotationDegByPath)) {
      if (!path || path === ASSET_ROOT_PATH) continue;
      const target = findObjectByHierarchyPath(clone, path);
      if (!target) continue;
      target.rotation.set(
        degToRad(rotationDeg[0] || 0),
        degToRad(rotationDeg[1] || 0),
        degToRad(rotationDeg[2] || 0)
      );
    }
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const material = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[] | undefined;
        const matList = Array.isArray(material) ? material : (material ? [material] : []);
        const shouldHighlight = highlightedObjectNames.includes(mesh.name);
        for (const mat of matList) {
          if (!mat) continue;
          mat.emissive = new THREE.Color(shouldHighlight ? '#1dd5ff' : '#000000');
          mat.emissiveIntensity = shouldHighlight ? 0.45 : 0;
          mat.needsUpdate = true;
        }
      }
    });
    const part = movingParts[previewPartIndex] || null;
    applyMotionPreview(clone, part, previewT, worldScale);
    modelBoundsRef.current = new THREE.Box3().setFromObject(clone);
    return clone;
  }, [
    loadedRoot,
    movingParts,
    previewPartIndex,
    previewT,
    highlightedObjectNames,
    worldScale,
    pivotOffsetMm,
    objectRotationDegByPath,
  ]);

  const rotateTargetObject = useMemo(() => {
    if (!previewRoot || activeTool !== 'rotate') return null;
    if (selectedNodeIndex >= 0 || selectedPathPointIndex >= 0) return null;
    if (!selectedObjectPath || selectedObjectPath === ASSET_ROOT_PATH) return null;
    return findObjectByHierarchyPath(previewRoot, selectedObjectPath);
  }, [previewRoot, activeTool, selectedNodeIndex, selectedPathPointIndex, selectedObjectPath]);
  const rotateAssetRootActive = activeTool === 'rotate'
    && selectedNodeIndex < 0
    && selectedPathPointIndex < 0
    && (!selectedObjectPath || selectedObjectPath === ASSET_ROOT_PATH);

  function parseNodeFocusIndex(path: string): number | null {
    if (!path.startsWith('__node__:')) return null;
    const index = Number(path.slice('__node__:'.length));
    if (!Number.isInteger(index) || index < 0) return null;
    return index;
  }

  useEffect(() => {
    if (cameraIntent === 'none') return;
    const camera = cameraRef.current;
    if (!camera) return;
    const controls = controlsRef.current;
    if (cameraIntent === 'reset') {
      const perspective = camera as THREE.PerspectiveCamera;
      perspective.position.set(2.5, 2, 2.5);
      perspective.near = 0.01;
      perspective.far = 2000;
      perspective.updateProjectionMatrix();
      if (controls) {
        controls.target.set(0, 0, 0);
        controls.update();
      }
      onCameraIntentHandled();
      return;
    }
    const bounds = modelBoundsRef.current;
    if (!bounds) {
      onCameraIntentHandled();
      return;
    }
    if (cameraIntent === 'focusNode') {
      const selectedNode = nodes[selectedNodeIndex];
      if (selectedNode?.position) {
        const center = new THREE.Vector3(
          mmToM(Number(selectedNode.position[0]) || 0),
          mmToM(Number(selectedNode.position[1]) || 0),
          mmToM(Number(selectedNode.position[2]) || 0)
        );
        const perspective = camera as THREE.PerspectiveCamera;
        const distance = 1.8;
        perspective.position.set(center.x + distance, center.y + (distance * 0.5), center.z + distance);
        perspective.near = 0.01;
        perspective.far = 2000;
        perspective.updateProjectionMatrix();
        if (controls) {
          controls.target.copy(center);
          controls.update();
        }
      } else if (bounds) {
        fitCameraToBox(camera, controls, bounds);
      }
      onCameraIntentHandled();
      return;
    }
    if (cameraIntent === 'frameSelected' && previewRoot && frameTargetPath) {
      const target = findObjectByHierarchyPath(previewRoot, frameTargetPath);
      if (target) {
        const targetBox = new THREE.Box3().setFromObject(target);
        fitCameraToBox(camera, controls, targetBox);
      } else {
        fitCameraToBox(camera, controls, bounds);
      }
      onCameraIntentHandled();
      return;
    }
    if (cameraIntent === 'focusNode') {
      const focusedNodeIndex = parseNodeFocusIndex(frameTargetPath);
      const focusedNode = focusedNodeIndex != null ? nodes[focusedNodeIndex] : null;
      const p = focusedNode?.position;
      if (p) {
        const center = new THREE.Vector3(mmToM(Number(p[0]) || 0), mmToM(Number(p[1]) || 0), mmToM(Number(p[2]) || 0));
        const perspective = camera as THREE.PerspectiveCamera;
        const distance = 1.2;
        perspective.position.set(center.x + distance, center.y + (distance * 0.6), center.z + distance);
        perspective.near = 0.01;
        perspective.far = 2000;
        perspective.updateProjectionMatrix();
        if (controls) {
          controls.target.copy(center);
          controls.update();
        }
      }
      onCameraIntentHandled();
      return;
    }
    fitCameraToBox(camera, controls, bounds);
    onCameraIntentHandled();
  }, [cameraIntent, onCameraIntentHandled, previewRoot, frameTargetPath, nodes, selectedNodeIndex]);

  function getPlaneIntersection(event: THREE.Event): THREE.Vector3 | null {
    const e = event as THREE.Event & { point?: THREE.Vector3 };
    if (e.point && Number.isFinite(e.point.x) && Number.isFinite(e.point.y) && Number.isFinite(e.point.z)) {
      return e.point.clone();
    }
    return null;
  }

  function snapPosition(positionM: THREE.Vector3): [number, number, number] {
    let sx = positionM.x;
    let sy = positionM.y;
    let sz = positionM.z;
    const bounds = modelBoundsRef.current;
    const selected = nodes[selectedNodeIndex];
    const type = String(selected?.type || '').toLowerCase();
    if (bounds && (type.includes('infeed') || type.includes('outfeed'))) {
      const spanX = bounds.max.x - bounds.min.x;
      const spanZ = bounds.max.z - bounds.min.z;
      const primaryAxis = spanX >= spanZ ? 'x' : 'z';
      const preferMin = type.includes('infeed');
      if (primaryAxis === 'x') {
        sx = preferMin ? bounds.min.x : bounds.max.x;
        sy = THREE.MathUtils.clamp(sy, bounds.min.y, bounds.max.y);
        sz = THREE.MathUtils.clamp(sz, bounds.min.z, bounds.max.z);
      } else {
        sz = preferMin ? bounds.min.z : bounds.max.z;
        sy = THREE.MathUtils.clamp(sy, bounds.min.y, bounds.max.y);
        sx = THREE.MathUtils.clamp(sx, bounds.min.x, bounds.max.x);
      }
    }
    return [mToMm(sx), mToMm(sy), mToMm(sz)];
  }

  function getClickedMeshBounds(event: THREE.Event): THREE.Box3 | null {
    if (!previewRoot) return null;
    const e = event as THREE.Event & { object?: THREE.Object3D };
    let current = e.object || null;
    while (current && current !== previewRoot) {
      if ((current as THREE.Mesh).isMesh) {
        return new THREE.Box3().setFromObject(current);
      }
      current = current.parent;
    }
    return null;
  }

  function getSnappedNodePlacementFromClick(event: THREE.Event): [number, number, number] | null {
    const point = getPlaneIntersection(event);
    if (!point) return null;
    if (nodeSnapMode === 'off') {
      return snapPosition(point);
    }
    if (nodeSnapMode === 'surface') {
      return [mToMm(point.x), mToMm(point.y), mToMm(point.z)];
    }
    const targetBounds = getClickedMeshBounds(event) || modelBoundsRef.current;
    if (!targetBounds) {
      return [mToMm(point.x), mToMm(point.y), mToMm(point.z)];
    }
    const center = targetBounds.getCenter(new THREE.Vector3());
    const size = targetBounds.getSize(new THREE.Vector3());
    const primaryAxis = size.x >= size.z ? 'x' : 'z';
    const snapped = point.clone();
    if (nodeSnapMode === 'center') {
      // Conveyor-like placement: keep along travel axis, snap to centerline on top surface.
      if (primaryAxis === 'x') {
        snapped.x = THREE.MathUtils.clamp(snapped.x, targetBounds.min.x, targetBounds.max.x);
        snapped.z = center.z;
      } else {
        snapped.z = THREE.MathUtils.clamp(snapped.z, targetBounds.min.z, targetBounds.max.z);
        snapped.x = center.x;
      }
      snapped.y = targetBounds.max.y;
      return [mToMm(snapped.x), mToMm(snapped.y), mToMm(snapped.z)];
    }
    // Edge mode: place on nearest side edge on top surface, following clicked side.
    if (primaryAxis === 'x') {
      snapped.x = THREE.MathUtils.clamp(snapped.x, targetBounds.min.x, targetBounds.max.x);
      snapped.z = snapped.z >= center.z ? targetBounds.max.z : targetBounds.min.z;
    } else {
      snapped.z = THREE.MathUtils.clamp(snapped.z, targetBounds.min.z, targetBounds.max.z);
      snapped.x = snapped.x >= center.x ? targetBounds.max.x : targetBounds.min.x;
    }
    snapped.y = targetBounds.max.y;
    return [mToMm(snapped.x), mToMm(snapped.y), mToMm(snapped.z)];
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'absolute',
          top: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 8,
          display: 'flex',
          gap: 6,
          padding: '6px 8px',
          borderRadius: 10,
          border: '1px solid var(--mm-border-subtle)',
          background: 'color-mix(in oklab, var(--mm-bg-panel) 85%, transparent)',
          backdropFilter: 'blur(8px)',
          boxShadow: 'var(--mm-shadow-sm)',
        }}
      >
        {toolbarButtons.map((button) => (
          <button
            key={button.key}
            type="button"
            onClick={button.onClick}
            disabled={button.disabled}
            style={{
              border: '1px solid var(--mm-border)',
              borderRadius: 8,
              padding: '5px 8px',
              fontSize: 11,
              background: button.activeWhen && button.activeWhen === activeTool
                ? 'var(--mm-accent-primary-muted)'
                : 'var(--mm-bg-surface)',
              color: button.activeWhen && button.activeWhen === activeTool
                ? 'var(--mm-accent-primary)'
                : 'var(--mm-text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              opacity: button.disabled ? 0.55 : 1,
            }}
          >
            {button.icon}
            {button.label}
          </button>
        ))}
      </div>
      <Canvas shadows camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
      <ambientLight intensity={0.65} />
      <directionalLight castShadow position={[3, 5, 2]} intensity={1.1} />
      <Grid args={[10, 10]} cellColor="#6b7280" sectionColor="#334155" fadeDistance={18} fadeStrength={1.2} />
      {showWorldAxis && (
        <>
          <axesHelper args={[1.2]} />
          <Html position={[1.28, 0, 0]} style={{ pointerEvents: 'none', fontSize: 11, fontWeight: 800, color: '#ef4444', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
            X
          </Html>
          <Html position={[0, 1.28, 0]} style={{ pointerEvents: 'none', fontSize: 11, fontWeight: 800, color: '#22c55e', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
            Y
          </Html>
          <Html position={[0, 0, 1.28]} style={{ pointerEvents: 'none', fontSize: 11, fontWeight: 800, color: '#3b82f6', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
            Z
          </Html>
        </>
      )}
      {showLocalAxis && previewRoot && <primitive object={new THREE.AxesHelper(0.8)} position={previewRoot.position.clone()} />}
      {previewRoot ? (
        <group
          ref={rootGroupRef}
          rotation={[
            degToRad(assetRootRotationDeg[0]),
            degToRad(assetRootRotationDeg[1]),
            degToRad(assetRootRotationDeg[2]),
          ]}
          onPointerDown={(event) => {
            if (rotateAssetRootActive) {
              onSelectObjectPath(ASSET_ROOT_PATH);
              setHighlightedObjectNames([]);
              return;
            }
            const hoveredObject = event.object as THREE.Object3D | undefined;
            if (!hoveredObject) return;
            const hoveredName = displayObjectName(hoveredObject);
            if (hoveredName) setHighlightedObjectNames([hoveredName]);
            const hoveredPath = hierarchyPathFromObject(previewRoot, hoveredObject);
            if (hoveredPath) onSelectObjectPath(hoveredPath);
          }}
          onClick={(event) => {
            const point = getPlaneIntersection(event);
            if (!point) return;
            if (activeTool === 'measurement') {
              const measurementPoint: MeasurementPoint = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                positionMm: [mToMm(point.x), mToMm(point.y), mToMm(point.z)],
              };
              if (measurementMode === 'two-point') {
                if (measurementPoints.length === 0) {
                  onMeasurementPointsChange([measurementPoint]);
                } else if (measurementPoints.length === 1) {
                  onMeasurementPointsChange([measurementPoints[0], measurementPoint]);
                } else {
                  onMeasurementPointsChange([measurementPoints[1], measurementPoint]);
                }
              } else {
                onMeasurementPointsChange([...measurementPoints, measurementPoint]);
              }
              return;
            }
            if (activeTool === 'node' && pathMode === 'polyline') {
              const nextPoint: PathPoint = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                positionMm: snapPosition(point),
              };
              onPathPointsChange([...pathPoints, nextPoint]);
              onSelectPathPoint(pathPoints.length);
              return;
            }
            if (activeTool === 'node') {
              const snapped = getSnappedNodePlacementFromClick(event);
              if (!snapped) return;
              onPlaceNodeAtMm(snapped);
            }
          }}
          onPointerMissed={() => {
            setHighlightedObjectNames([]);
          }}
        >
          <primitive object={previewRoot} />
        </group>
      ) : (
        <mesh castShadow receiveShadow>
          <boxGeometry args={[1.2, 0.8, 0.8]} />
          <meshStandardMaterial color="#64748b" metalness={0.3} roughness={0.55} />
        </mesh>
      )}
      {rotateAssetRootActive && rootGroupRef.current && (
        <TransformControls
          object={rootGroupRef.current}
          mode="rotate"
          size={0.85}
          rotationSnap={rotationSnapStep === 'off' ? null : degToRad(rotationSnapStep)}
          onObjectChange={() => {
            const group = rootGroupRef.current;
            if (!group) return;
            onSetAssetRootRotationDeg([
              radToDeg(group.rotation.x),
              radToDeg(group.rotation.y),
              radToDeg(group.rotation.z),
            ]);
          }}
        />
      )}
      {rotateTargetObject && (
        <TransformControls
          object={rotateTargetObject}
          mode="rotate"
          size={0.85}
          rotationSnap={rotationSnapStep === 'off' ? null : degToRad(rotationSnapStep)}
          onObjectChange={(event) => {
            const targetObject = (event?.target as { object?: THREE.Object3D } | undefined)?.object;
            if (!targetObject) return;
            const nextDeg: [number, number, number] = [
              radToDeg(targetObject.rotation.x),
              radToDeg(targetObject.rotation.y),
              radToDeg(targetObject.rotation.z),
            ];
            if (selectedObjectPath && selectedObjectPath !== ASSET_ROOT_PATH) {
              onRotateSelectedObjectDeg(selectedObjectPath, nextDeg);
              return;
            }
            onSetAssetRootRotationDeg(nextDeg);
          }}
        />
      )}
      {measurementPoints.length >= 2 && (
        <Line
          points={measurementPoints.map((p) => [mmToM(p.positionMm[0]), mmToM(p.positionMm[1]), mmToM(p.positionMm[2])])}
          color="#f59e0b"
          lineWidth={2}
          depthTest={false}
        />
      )}
      {measurementPoints.map((p, index) => (
        <mesh
          key={p.id}
          position={[mmToM(p.positionMm[0]), mmToM(p.positionMm[1]), mmToM(p.positionMm[2])]}
        >
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial
            color={index === 0 ? '#22c55e' : index === (measurementPoints.length - 1) ? '#ef4444' : '#f59e0b'}
            emissive={index === 0 ? '#14532d' : index === (measurementPoints.length - 1) ? '#7f1d1d' : '#a16207'}
            emissiveIntensity={0.65}
            depthTest={false}
          />
        </mesh>
      ))}
      {nodes.map((node, index) => {
        const p = node.position || [0, 0, 0];
        const selected = selectedNodeIndex === index;
        const nodePosition: [number, number, number] = [mmToM(Number(p[0]) || 0), mmToM(Number(p[1]) || 0), mmToM(Number(p[2]) || 0)];
        const nodeColor = nodeColorByType(node.type);
        if (selected && (activeTool === 'move' || activeTool === 'rotate' || activeTool === 'pivot')) {
          return (
            <TransformControls
              key={`${node.id || 'node'}-${index}`}
              mode={activeTool === 'rotate' ? 'rotate' : nodeTransformMode}
              size={0.7}
              onObjectChange={(event) => {
                const target = (event?.target as { object?: THREE.Object3D } | undefined);
                if (!target?.object) return;
                onMoveNodeToMm(index, snapPosition(target.object.position.clone()));
              }}
            >
              <mesh
                position={nodePosition}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNode(index);
                }}
              >
                <sphereGeometry args={[0.07, 14, 12]} />
                <meshStandardMaterial color={nodeColor} emissive={selected ? nodeColor : '#000000'} emissiveIntensity={selected ? 0.4 : 0} />
                {showLocalAxis && <axesHelper args={[0.24]} />}
                <Html position={[0.1, 0.1, 0]} style={{ pointerEvents: 'none', fontSize: 10, fontWeight: 700, color: '#e2e8f0', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
                  {node.id || `Node ${index + 1}`}
                </Html>
              </mesh>
            </TransformControls>
          );
        }
        return (
          <mesh
            key={`${node.id || 'node'}-${index}`}
            position={nodePosition}
            onClick={(event) => {
              event.stopPropagation();
              onSelectNode(index);
            }}
          >
            <sphereGeometry args={[0.05, 14, 12]} />
            <meshStandardMaterial color={nodeColor} />
            {showLocalAxis && <axesHelper args={[0.22]} />}
            <Html position={[0.08, 0.08, 0]} style={{ pointerEvents: 'none', fontSize: 10, fontWeight: 700, color: '#e2e8f0', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>
              {node.id || `Node ${index + 1}`}
            </Html>
          </mesh>
        );
      })}
      {(pathPoints.length >= 2 || (pathMode === 'straight-node' && nodes.length >= 2)) && (
        <Line
          points={
            pathMode === 'straight-node'
              ? ((): [number, number, number][] => {
                const infeed = nodes.find((n) => String(n.type || '').toLowerCase().includes('infeed')) || nodes[0];
                const outfeed = nodes.find((n) => String(n.type || '').toLowerCase().includes('outfeed')) || nodes[nodes.length - 1];
                if (!infeed?.position || !outfeed?.position) return [];
                return [
                  [mmToM(Number(infeed.position[0]) || 0), mmToM(Number(infeed.position[1]) || 0), mmToM(Number(infeed.position[2]) || 0)],
                  [mmToM(Number(outfeed.position[0]) || 0), mmToM(Number(outfeed.position[1]) || 0), mmToM(Number(outfeed.position[2]) || 0)],
                ];
              })()
              : pathPoints.map((p) => [mmToM(p.positionMm[0]), mmToM(p.positionMm[1]), mmToM(p.positionMm[2])])
          }
          color="#38bdf8"
          lineWidth={2.6}
          depthTest={false}
        />
      )}
      {pathMode === 'polyline' && pathPoints.map((point, index) => {
        const pointPosition: [number, number, number] = [
          mmToM(point.positionMm[0]),
          mmToM(point.positionMm[1]),
          mmToM(point.positionMm[2]),
        ];
        if (selectedPathPointIndex === index && (activeTool === 'move' || activeTool === 'pivot')) {
          return (
            <TransformControls
              key={point.id}
              mode="translate"
              size={0.6}
              onObjectChange={(event) => {
                const target = (event?.target as { object?: THREE.Object3D } | undefined);
                if (!target?.object) return;
                const snapped = snapPosition(target.object.position.clone());
                onPathPointsChange(pathPoints.map((p, i) => (i === index ? { ...p, positionMm: snapped } : p)));
              }}
            >
              <mesh
                position={pointPosition}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectPathPoint(index);
                }}
              >
                <sphereGeometry args={[0.065, 14, 12]} />
                <meshStandardMaterial color="#38bdf8" emissive="#0c4a6e" emissiveIntensity={0.55} />
              </mesh>
            </TransformControls>
          );
        }
        return (
          <mesh
            key={point.id}
            position={pointPosition}
            onClick={(event) => {
              event.stopPropagation();
              onSelectPathPoint(index);
            }}
          >
            <sphereGeometry args={[0.05, 14, 12]} />
            <meshStandardMaterial color={selectedPathPointIndex === index ? '#0ea5e9' : '#7dd3fc'} />
          </mesh>
        );
      })}
      <Environment preset="city" />
      <CameraBridge onCamera={(camera: THREE.Camera | undefined) => { if (camera) cameraRef.current = camera; }} />
      <OrbitControls
        makeDefault
        ref={(value) => {
          controlsRef.current = (value as OrbitControlsLike | null);
        }}
      />
      </Canvas>
      {loadError && (
        <div style={{ position: 'absolute', left: 12, right: 12, top: 12, border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 35%, transparent)', borderRadius: 8, background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', fontSize: 12, padding: '8px 10px' }}>
          GLB preview failed: {loadError}
        </div>
      )}
      {!modelUrl && (
        <div style={{ position: 'absolute', left: 12, right: 12, top: 12, border: '1px solid var(--mm-border)', borderRadius: 8, background: 'var(--mm-bg-surface)', color: 'var(--mm-text-secondary)', fontSize: 12, padding: '8px 10px' }}>
          Upload a GLB to preview and author nodes/moving parts.
        </div>
      )}
      {activeTool === 'rotate' && (
        <div style={{ position: 'absolute', left: 12, right: 12, bottom: 12, border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 45%, transparent)', borderRadius: 8, background: 'var(--mm-accent-primary-muted)', color: 'var(--mm-text-primary)', fontSize: 11, padding: '7px 10px', display: 'grid', gap: 2 }}>
          <div style={{ fontWeight: 700 }}>
            Rotation target: {rotationTargetInfo?.label || 'Asset Root'}
          </div>
          <div>{rotationHintMessage}</div>
        </div>
      )}
    </div>
  );
};

const AdminAssetEditorPage: React.FC = () => {
  const navigate = useNavigate();
  const { assetId } = useParams<{ assetId?: string }>();
  const { user, logout } = useAuth();
  const mainRef = useRef<HTMLElement | null>(null);
  const modelFileRef = useRef<HTMLInputElement | null>(null);
  const thumbFileRef = useRef<HTMLInputElement | null>(null);

  const [assets, setAssets] = useState<LibraryAsset[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [asset, setAsset] = useState<LibraryAsset | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [nodes, setNodes] = useState<AssetDefinitionNode[]>([]);
  const [movableParts, setMovableParts] = useState<AssetMovingPart[]>([]);
  const [selectedNodeIndex, setSelectedNodeIndex] = useState<number>(-1);
  const [previewPartIndex, setPreviewPartIndex] = useState<number>(-1);
  const [previewT, setPreviewT] = useState<number>(0.5);
  const [hierarchyItems, setHierarchyItems] = useState<ModelHierarchyItem[]>([]);
  const [objectFilter, setObjectFilter] = useState('');
  const [selectedObjectPath, setSelectedObjectPath] = useState('');
  const [objectAliasesByPath, setObjectAliasesByPath] = useState<Record<string, string>>({});
  const [assetRootRotationDeg, setAssetRootRotationDeg] = useState<[number, number, number]>([0, 0, 0]);
  const [objectRotationDegByPath, setObjectRotationDegByPath] = useState<Record<string, [number, number, number]>>({});
  const [highlightedObjectNames, setHighlightedObjectNames] = useState<string[]>([]);
  const [objectVisibility, setObjectVisibility] = useState<Record<string, boolean>>({});
  const [showObjectPathSet, setShowObjectPathSet] = useState<Record<string, boolean>>({});
  const [leftSectionOpen, setLeftSectionOpen] = useState<Record<LeftPanelSection, boolean>>({
    assets: true,
    hierarchy: true,
    nodes: true,
    moving: true,
  });
  const [orientationEulerDeg, setOrientationEulerDeg] = useState<[number, number, number]>([0, 0, 0]);
  const [sourceUnit, setSourceUnit] = useState<SourceUnit>('unknown');
  const [scaleCorrection, setScaleCorrection] = useState<number>(1);
  const [nativeBounds, setNativeBounds] = useState<RawBounds | null>(null);
  const [pivotOffsetMm, setPivotOffsetMm] = useState<[number, number, number]>([0, 0, 0]);
  const [measureMode, setMeasureMode] = useState<MeasureMode>('two-point');
  const [measurementPoints, setMeasurementPoints] = useState<MeasurementPoint[]>([]);
  const [activeTool, setActiveTool] = useState<InteractionTool>('select');
  const [pathMode, setPathMode] = useState<PathMode>('none');
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
  const [selectedPathPointIndex, setSelectedPathPointIndex] = useState<number>(-1);
  const [rotateSnapEnabled, setRotateSnapEnabled] = useState(true);
  const [rotateSnapDeg, setRotateSnapDeg] = useState<45 | 15>(45);
  const [behaviorTemplate, setBehaviorTemplate] = useState<BehaviorTemplateType>('none');
  const [behaviorConfig, setBehaviorConfig] = useState<Record<string, unknown>>({});
  const [runtimeControls, setRuntimeControls] = useState<NonNullable<AssetMetadata['runtimeControls']>>({
    showSpeedSlider: false,
    showTargetHeight: false,
    showAutoManual: false,
    showHomeCommand: false,
    showEnableToggle: false,
    showSensorState: false,
    showStopperState: false,
  });
  const [showWorldAxis, setShowWorldAxis] = useState(true);
  const [showLocalAxis, setShowLocalAxis] = useState(true);
  const [nodeSnapMode, setNodeSnapMode] = useState<NodeGizmoSnapMode>('surface');
  const [nodeTransformMode, setNodeTransformMode] = useState<TransformMode>('translate');
  const [rotationSnapStep, setRotationSnapStep] = useState<RotationSnapStep>(45);

  function setBehaviorField(key: string, value: number | string | boolean): void {
    setBehaviorConfig((prev) => ({ ...prev, [key]: value }));
  }

  function setRuntimeControl(key: keyof RuntimeControlsConfig, value: boolean): void {
    setRuntimeControls((prev) => ({ ...prev, [key]: value }));
  }

  const [knownDimensionMmInput, setKnownDimensionMmInput] = useState<string>('');
  const [cameraIntent, setCameraIntent] = useState<CameraIntent>('none');
  const [fitTargetPath, setFitTargetPath] = useState<string>('');
  const [leftPanelWidth, setLeftPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 290;
    try {
      const raw = window.sessionStorage.getItem(PANEL_WIDTHS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as { left?: number } : {};
      return clamp(Number(parsed.left || 290), LEFT_PANEL_MIN, LEFT_PANEL_MAX);
    } catch {
      return 290;
    }
  });
  const [rightPanelWidth, setRightPanelWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 350;
    try {
      const raw = window.sessionStorage.getItem(PANEL_WIDTHS_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) as { right?: number } : {};
      return clamp(Number(parsed.right || 350), RIGHT_PANEL_MIN, RIGHT_PANEL_MAX);
    } catch {
      return 350;
    }
  });
  const [resizeDrag, setResizeDrag] = useState<ResizeDrag>(null);

  const normalizedBoundsMm = useMemo(() => {
    if (!nativeBounds) return undefined;
    return computeBoundsMm(nativeBounds, sourceUnit, scaleCorrection);
  }, [nativeBounds, sourceUnit, scaleCorrection]);

  const normalizationWarnings = useMemo(() => {
    const warnings: string[] = [];
    if (!normalizedBoundsMm) return warnings;
    const w = normalizedBoundsMm.width;
    const d = normalizedBoundsMm.depth;
    const h = normalizedBoundsMm.height;
    const maxDim = Math.max(w, d, h);
    const minDim = Math.min(w, d, h);

    if (maxDim > 50000) {
      warnings.push(`Very large asset (${maxDim.toFixed(0)} mm max dimension). Check Source Unit and Scale Correction.`);
    }
    if (maxDim < 20) {
      warnings.push(`Very small asset (${maxDim.toFixed(1)} mm max dimension). Check Source Unit and Scale Correction.`);
    }
    if (minDim > 0 && (maxDim / minDim) > 400) {
      warnings.push('Abnormal bounding-box ratio detected. Verify source export and model orientation.');
    }
    if (nativeBounds) {
      const centerRaw: [number, number, number] = [
        (nativeBounds.min[0] + nativeBounds.max[0]) / 2,
        (nativeBounds.min[1] + nativeBounds.max[1]) / 2,
        (nativeBounds.min[2] + nativeBounds.max[2]) / 2,
      ];
      const centerOffsetMm = magnitudeMm([
        centerRaw[0] * sourceUnitFactorToMm(sourceUnit) * scaleCorrection,
        centerRaw[1] * sourceUnitFactorToMm(sourceUnit) * scaleCorrection,
        centerRaw[2] * sourceUnitFactorToMm(sourceUnit) * scaleCorrection,
      ]);
      if (centerOffsetMm > Math.max(5000, maxDim * 2)) {
        warnings.push('Model origin appears far from mesh center. Consider fixing origin in Blender before export.');
      }
    }
    if (Math.abs(pivotOffsetMm[1]) > Math.max(3000, maxDim * 0.75)) {
      warnings.push('Large Pivot Y offset may cause model to appear too low/high in runtime.');
    }
    return warnings;
  }, [normalizedBoundsMm, nativeBounds, sourceUnit, scaleCorrection, pivotOffsetMm]);

  const metadata = useMemo<AssetMetadata>(() => {
    const aliases = Object.fromEntries(
      Object.entries(objectAliasesByPath).filter(([, value]) => String(value || '').trim().length > 0)
    );
    return {
      ...safeAssetMetadata(asset),
      nodes,
      movableParts,
      ...(Object.keys(aliases).length > 0 ? { objectAliases: aliases } : {}),
      ...(Object.keys(objectRotationDegByPath).length > 0 ? { objectRotationsDeg: objectRotationDegByPath } : {}),
      assetRootRotationDeg,
      behaviorTemplate,
      behaviorConfig,
      runtimeControls,
      sourceUnit,
      scaleCorrection,
      ...(nativeBounds ? { nativeBounds: toMetadataNativeBounds(nativeBounds) } : {}),
      ...(normalizedBoundsMm ? { normalizedBoundsMm } : {}),
      ...(pivotOffsetMm ? { pivotOffset: pivotOffsetMm } : {}),
      ...(pathMode !== 'none'
        ? {
          transportPath: {
            mode: pathMode,
            points: pathPoints.map((p) => p.positionMm),
          },
        }
        : {}),
    };
  }, [
    asset,
    nodes,
    movableParts,
    objectAliasesByPath,
    objectRotationDegByPath,
    assetRootRotationDeg,
    behaviorTemplate,
    behaviorConfig,
    runtimeControls,
    sourceUnit,
    scaleCorrection,
    nativeBounds,
    normalizedBoundsMm,
    pivotOffsetMm,
    pathMode,
    pathPoints,
  ]);

  const twoPointDistanceMm = useMemo(() => {
    if (measurementPoints.length < 2) return null;
    return distanceMm(measurementPoints[0].positionMm, measurementPoints[1].positionMm);
  }, [measurementPoints]);

  const chainSegments = useMemo(() => {
    if (measurementPoints.length < 2) return [];
    const segments: number[] = [];
    for (let i = 1; i < measurementPoints.length; i += 1) {
      segments.push(distanceMm(measurementPoints[i - 1].positionMm, measurementPoints[i].positionMm));
    }
    return segments;
  }, [measurementPoints]);

  const chainTotalMm = useMemo(
    () => chainSegments.reduce((acc, value) => acc + value, 0),
    [chainSegments]
  );

  const validation = useMemo(() => {
    const problems: string[] = [];
    if (!asset) problems.push('No asset selected');
    if (!asset?.modelUrl) problems.push('Model file missing');
    if (!selectedCategoryId) problems.push('Category not selected');
    const ids = new Set<string>();
    for (const node of nodes) {
      const id = String(node.id || '').trim();
      if (!id) problems.push('Node without id');
      if (id && ids.has(id)) problems.push(`Duplicate node id: ${id}`);
      if (id) ids.add(id);
    }
    for (const warning of normalizationWarnings) {
      problems.push(`Normalization warning: ${warning}`);
    }
    const hasInfeed = nodes.some((n) => String(n.type || '').toLowerCase().includes('infeed'));
    const hasOutfeed = nodes.some((n) => String(n.type || '').toLowerCase().includes('outfeed'));
    if (behaviorTemplate === 'straight-conveyor') {
      if (!hasInfeed) problems.push('Straight Conveyor template requires an infeed node');
      if (!hasOutfeed) problems.push('Straight Conveyor template requires an outfeed node');
      const pathLen = Number(behaviorConfig.usablePathLengthMm || 0);
      if (!(pathLen > 0)) problems.push('Straight Conveyor template requires usable path length');
    }
    if (behaviorTemplate === 'lift-conveyor') {
      if (!hasInfeed) problems.push('Lift Conveyor template requires a lower infeed node');
      if (!hasOutfeed) problems.push('Lift Conveyor template requires an upper outfeed node');
      const lowerStop = Number(behaviorConfig.lowerStopPositionMm || 0);
      const upperStop = Number(behaviorConfig.upperStopPositionMm || 0);
      if (!(upperStop > lowerStop)) problems.push('Lift Conveyor requires upper stop > lower stop');
      const axis = String(behaviorConfig.travelAxis || 'z').toLowerCase();
      if (!['x', 'y', 'z'].includes(axis)) problems.push('Lift Conveyor requires travel axis x/y/z');
    }
    return problems;
  }, [asset, selectedCategoryId, nodes, normalizationWarnings, behaviorTemplate, behaviorConfig]);

  function hydrateFromAsset(next: LibraryAsset | null): void {
    setAsset(next);
    setName(next?.name || '');
    setDescription(next?.description || '');
    setTagsText((next?.tags || []).join(', '));
    const m = safeAssetMetadata(next);
    setNodes(Array.isArray(m.nodes) ? (m.nodes as AssetDefinitionNode[]) : []);
    setMovableParts(Array.isArray(m.movableParts) ? (m.movableParts as AssetMovingPart[]) : []);
    const nextSourceUnit = (m.sourceUnit === 'mm' || m.sourceUnit === 'cm' || m.sourceUnit === 'm' || m.sourceUnit === 'unknown')
      ? m.sourceUnit
      : 'unknown';
    setSourceUnit(nextSourceUnit);
    const nextScale = Number(m.scaleCorrection);
    setScaleCorrection(Number.isFinite(nextScale) && nextScale > 0 ? nextScale : 1);
    const nextNativeBounds = fromMetadataNativeBounds(m.nativeBounds);
    setNativeBounds(nextNativeBounds);
    const pivot = m.pivotOffset;
    if (Array.isArray(pivot) && pivot.length >= 3) {
      setPivotOffsetMm([Number(pivot[0]) || 0, Number(pivot[1]) || 0, Number(pivot[2]) || 0]);
    } else {
      setPivotOffsetMm([0, 0, 0]);
    }
    setObjectAliasesByPath(
      m.objectAliases && typeof m.objectAliases === 'object' && !Array.isArray(m.objectAliases)
        ? Object.fromEntries(
          Object.entries(m.objectAliases).map(([path, alias]) => [path, String(alias || '')])
        )
        : {}
    );
    setAssetRootRotationDeg(normalizeEulerDeg(m.assetRootRotationDeg, [0, 0, 0]));
    setObjectRotationDegByPath(
      m.objectRotationsDeg && typeof m.objectRotationsDeg === 'object' && !Array.isArray(m.objectRotationsDeg)
        ? Object.fromEntries(
          Object.entries(m.objectRotationsDeg).map(([path, value]) => [path, normalizeEulerDeg(value, [0, 0, 0])])
        )
        : {}
    );
    const templateRaw = String(m.behaviorTemplate || '').trim();
    const nextBehaviorTemplate: BehaviorTemplateType = (
      templateRaw === 'straight-conveyor'
      || templateRaw === 'lift-conveyor'
      || templateRaw === 'rotary-transfer'
      || templateRaw === 'angle-transfer'
      || templateRaw === 'robot-pick-place'
      || templateRaw === 'none'
    ) ? (templateRaw as BehaviorTemplateType) : 'none';
    setBehaviorTemplate(nextBehaviorTemplate);
    const hasBehaviorConfig =
      m.behaviorConfig && typeof m.behaviorConfig === 'object' && !Array.isArray(m.behaviorConfig);
    setBehaviorConfig(
      hasBehaviorConfig
        ? { ...(m.behaviorConfig as Record<string, unknown>) }
        : defaultBehaviorConfig(nextBehaviorTemplate)
    );
    const hasRuntimeControls = m.runtimeControls && typeof m.runtimeControls === 'object';
    setRuntimeControls(
      hasRuntimeControls
        ? {
          showSpeedSlider: !!m.runtimeControls?.showSpeedSlider,
          showTargetHeight: !!m.runtimeControls?.showTargetHeight,
          showAutoManual: !!m.runtimeControls?.showAutoManual,
          showHomeCommand: !!m.runtimeControls?.showHomeCommand,
          showEnableToggle: !!m.runtimeControls?.showEnableToggle,
          showSensorState: !!m.runtimeControls?.showSensorState,
          showStopperState: !!m.runtimeControls?.showStopperState,
        }
        : defaultRuntimeControlsForTemplate(nextBehaviorTemplate)
    );
    setMeasurementPoints([]);
    setActiveTool('node');
    const existingPath = m.transportPath;
    const existingMode = (existingPath?.mode === 'straight-node' || existingPath?.mode === 'polyline')
      ? existingPath.mode
      : (existingPath?.mode === 'node-link' ? 'straight-node' : 'none');
    setPathMode(existingMode);
    const existingPoints = Array.isArray(existingPath?.points)
      ? existingPath.points
        .map((raw, index) => {
          if (!Array.isArray(raw) || raw.length < 3) return null;
          const x = Number(raw[0]);
          const y = Number(raw[1]);
          const z = Number(raw[2]);
          if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return null;
          return { id: `path-${index}-${Date.now()}`, positionMm: [x, y, z] as [number, number, number] };
        })
        .filter((p): p is PathPoint => Boolean(p))
      : [];
    setPathPoints(existingPoints);
    // Avoid hidden pre-selection that can block rotate-root gizmo visibility.
    setSelectedPathPointIndex(-1);
    setKnownDimensionMmInput('');
    setCameraIntent('none');
    setFitTargetPath('');
    setSelectedNodeIndex(-1);
    setPreviewPartIndex(-1);
    setSelectedObjectPath('');
    setHighlightedObjectNames([]);
  }

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const assetRows = await listLibraryAssets({ includeDeleted: false });
      setAssets(assetRows);
      const firstCategory = assetRows[0]?.categoryId ?? null;
      setSelectedCategoryId((prev) => prev ?? firstCategory);
      const found = assetRows.find((row) => row.id === assetId) || assetRows[0] || null;
      hydrateFromAsset(found);
    } catch (e) {
      setError(errorMessage(e, 'Failed to load editor data'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId]);

  function selectAsset(next: LibraryAsset): void {
    hydrateFromAsset(next);
    setSelectedCategoryId(next.categoryId);
    navigate(`/admin/assets/editor/${encodeURIComponent(next.id)}`);
  }

  function addNode(): void {
    setActiveTool('node');
    const id = `NODE_${nodes.length + 1}`;
    const next: AssetDefinitionNode = {
      id,
      label: id,
      type: 'infeed',
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      direction: [1, 0, 0],
    };
    setNodes((prev) => [...prev, next]);
    setSelectedNodeIndex(nodes.length);
  }

  function deleteNode(index: number): void {
    if (index < 0) return;
    setNodes((prev) => prev.filter((_, i) => i !== index));
    setSelectedNodeIndex(-1);
  }

  function updateNode(index: number, updates: Partial<AssetDefinitionNode>): void {
    setNodes((prev) => prev.map((node, i) => (i === index ? { ...node, ...updates } : node)));
  }

  function placeSelectedNodeAt(positionMm: [number, number, number]): void {
    if (selectedNodeIndex < 0 || !nodes[selectedNodeIndex]) {
      const id = `NODE_${nodes.length + 1}`;
      const kind = nodes.length === 0 ? 'infeed' : (nodes.length === 1 ? 'outfeed' : 'center');
      const next: AssetDefinitionNode = {
        id,
        label: id,
        type: kind,
        position: positionMm,
        rotation: [0, 0, 0],
        direction: [1, 0, 0],
      };
      setNodes((prev) => [...prev, next]);
      setSelectedNodeIndex(nodes.length);
      return;
    }
    // Node placement clicks already provide snap-mode-resolved local coordinates.
    // Apply directly to avoid a second transform layer and keep viewport click snapping reliable.
    updateNode(selectedNodeIndex, { position: positionMm });
  }

  function placeSelectedNodeOnGround(): void {
    if (selectedNodeIndex < 0 || !nodes[selectedNodeIndex]) return;
    const current = nodes[selectedNodeIndex];
    const pos = current.position || [0, 0, 0];
    updateNode(selectedNodeIndex, { position: [Number(pos[0]) || 0, 0, Number(pos[2]) || 0] });
  }

  function focusSelectedNode(): void {
    if (selectedNodeIndex < 0 || !nodes[selectedNodeIndex]?.id) return;
    setFitTargetPath(`__node__:${selectedNodeIndex}`);
    setCameraIntent('focusNode');
  }

  const filteredHierarchyItems = useMemo(() => {
    const q = objectFilter.trim().toLowerCase();
    if (!q) return hierarchyItems;
    return hierarchyItems.filter((item) => item.path.toLowerCase().includes(q) || item.name.toLowerCase().includes(q));
  }, [objectFilter, hierarchyItems]);
  const selectedHierarchyItem = useMemo(
    () => hierarchyItems.find((item) => item.path === selectedObjectPath) || null,
    [hierarchyItems, selectedObjectPath]
  );
  const selectedObjectRotationDeg = useMemo<[number, number, number]>(
    () => normalizeEulerDeg(objectRotationDegByPath[selectedObjectPath], [0, 0, 0]),
    [objectRotationDegByPath, selectedObjectPath]
  );
  const selectedNodeRotationDeg = useMemo<[number, number, number]>(
    () => normalizeEulerDeg(nodes[selectedNodeIndex]?.rotation, [0, 0, 0]),
    [nodes, selectedNodeIndex]
  );
  const rotationTargetInfo = useMemo<RotationTargetInfo | null>(() => {
    if (selectedNodeIndex >= 0 && nodes[selectedNodeIndex]) {
      return {
        kind: 'selectedNode',
        label: `Node: ${nodes[selectedNodeIndex]?.id || `Node ${selectedNodeIndex + 1}`}`,
        rotationDeg: selectedNodeRotationDeg,
      };
    }
    if (selectedPathPointIndex >= 0) {
      return {
        kind: 'selectedPivot',
        label: `Pivot point ${selectedPathPointIndex + 1}`,
        rotationDeg: [0, 0, 0],
      };
    }
    if (selectedObjectPath && selectedObjectPath !== ASSET_ROOT_PATH) {
      const objectLabel = objectAliasesByPath[selectedObjectPath] || selectedHierarchyItem?.name || selectedObjectPath;
      return {
        kind: 'selectedObject',
        label: `Object: ${objectLabel}`,
        rotationDeg: selectedObjectRotationDeg,
      };
    }
    return {
      kind: 'assetRoot',
      label: 'Asset root',
      rotationDeg: assetRootRotationDeg,
    };
  }, [
    selectedNodeIndex,
    nodes,
    selectedNodeRotationDeg,
    selectedPathPointIndex,
    selectedObjectPath,
    selectedHierarchyItem,
    selectedObjectRotationDeg,
    objectAliasesByPath,
    assetRootRotationDeg,
  ]);
  const rotationHintMessage = useMemo(() => {
    if (rotationTargetInfo?.kind === 'selectedNode') {
      return 'Rotate mode: drag red/green/blue ring to rotate selected node (X/Y/Z).';
    }
    if (rotationTargetInfo?.kind === 'selectedObject') {
      return 'Rotate mode: drag red/green/blue ring to rotate selected object (X/Y/Z).';
    }
    if (rotationTargetInfo?.kind === 'selectedPivot') {
      return 'Pivot selected. Use Move/Pivot tools for point adjustments.';
    }
    return 'Rotate mode: Asset Root';
  }, [rotationTargetInfo]);

  function toggleLeftSection(section: LeftPanelSection): void {
    setLeftSectionOpen((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function setSelectedObjectPathAndHighlight(path: string): void {
    setSelectedObjectPath(path);
    if (!path || path === ASSET_ROOT_PATH) {
      setHighlightedObjectNames([]);
      return;
    }
    const item = hierarchyItems.find((candidate) => candidate.path === path);
    const objectName = item?.name || path.split('/').pop() || '';
    if (!objectName || objectName.startsWith('(unnamed')) {
      setHighlightedObjectNames([]);
      return;
    }
    setHighlightedObjectNames([objectName]);
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(
        PANEL_WIDTHS_STORAGE_KEY,
        JSON.stringify({ left: leftPanelWidth, right: rightPanelWidth })
      );
    } catch {
      // Non-blocking: layout still works if session storage is unavailable.
    }
  }, [leftPanelWidth, rightPanelWidth]);

  useEffect(() => {
    if (!resizeDrag) return;
    const onMouseMove = (event: MouseEvent) => {
      const host = mainRef.current;
      if (!host) return;
      const availableWidth = host.clientWidth - 20;
      const gutterTotal = 20;
      const columnsWidth = availableWidth - gutterTotal;
      if (columnsWidth <= 0) return;
      if (resizeDrag.side === 'left') {
        const nextRaw = resizeDrag.startLeft + (event.clientX - resizeDrag.startX);
        const maxByViewport = columnsWidth - resizeDrag.startRight - VIEWPORT_MIN;
        const boundedMax = Math.min(LEFT_PANEL_MAX, maxByViewport);
        setLeftPanelWidth(clamp(Math.round(nextRaw), LEFT_PANEL_MIN, Math.max(LEFT_PANEL_MIN, boundedMax)));
      } else {
        const nextRaw = resizeDrag.startRight - (event.clientX - resizeDrag.startX);
        const maxByViewport = columnsWidth - resizeDrag.startLeft - VIEWPORT_MIN;
        const boundedMax = Math.min(RIGHT_PANEL_MAX, maxByViewport);
        setRightPanelWidth(clamp(Math.round(nextRaw), RIGHT_PANEL_MIN, Math.max(RIGHT_PANEL_MIN, boundedMax)));
      }
    };
    const onMouseUp = () => setResizeDrag(null);
    const prevCursor = document.body.style.cursor;
    const prevUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = prevCursor;
      document.body.style.userSelect = prevUserSelect;
    };
  }, [resizeDrag]);

  function beginResize(event: React.MouseEvent<HTMLDivElement>, side: 'left' | 'right'): void {
    event.preventDefault();
    setResizeDrag({
      side,
      startX: event.clientX,
      startLeft: leftPanelWidth,
      startRight: rightPanelWidth,
    });
  }

  function addMovingPart(): void {
    setMovableParts((prev) => [
      ...prev,
      {
        objectName: `Part_${prev.length + 1}`,
        motionType: 'translate',
        axis: 'x',
        min: 0,
        max: 100,
        default: 0,
        speed: 10,
      },
    ]);
  }

  async function saveAsset() {
    if (!asset) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await updateLibraryAsset(asset.id, {
        name: name.trim() || asset.name,
        description: description.trim(),
        tags: tagsText.split(',').map((v) => v.trim()).filter(Boolean),
        categoryId: selectedCategoryId || asset.categoryId,
        metadata,
      });
      setAssets((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      hydrateFromAsset(updated);
      setMessage('Metadata saved');
      await refreshRuntimePublishedAssets().catch(() => undefined);
    } catch (e) {
      setError(errorMessage(e, 'Failed to save metadata'));
    } finally {
      setSaving(false);
    }
  }

  async function publishAsset() {
    if (!asset) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      // Persist current editor metadata first so publish/runtime uses the exact normalized transform.
      const saved = await updateLibraryAsset(asset.id, {
        name: name.trim() || asset.name,
        description: description.trim(),
        tags: tagsText.split(',').map((v) => v.trim()).filter(Boolean),
        categoryId: selectedCategoryId || asset.categoryId,
        metadata,
      });
      const published = await publishLibraryAsset(saved.id);
      setAssets((prev) => prev.map((row) => {
        if (row.id === saved.id) return published;
        return row;
      }));
      hydrateFromAsset(published);
      setMessage('Metadata saved and asset published');
      await refreshRuntimePublishedAssets().catch(() => undefined);
    } catch (e) {
      setError(errorMessage(e, 'Failed to publish asset'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadModel(file: File) {
    if (!selectedCategoryId) {
      setError('Select a category before uploading');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const created = await uploadLibraryAsset({
        file,
        categoryId: selectedCategoryId,
        name: file.name.replace(/\.glb$/i, ''),
      });
      setAssets((prev) => [created, ...prev]);
      selectAsset(created);
      setMessage('Model uploaded as draft');
    } catch (e) {
      setError(errorMessage(e, 'Failed to upload model'));
    } finally {
      setSaving(false);
    }
  }

  async function uploadThumbnail(file: File) {
    if (!asset) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await uploadAssetThumbnail(asset.id, file);
      setAssets((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      hydrateFromAsset(updated);
      setMessage('Thumbnail uploaded');
    } catch (e) {
      setError(errorMessage(e, 'Failed to upload thumbnail'));
    } finally {
      setSaving(false);
    }
  }

  const toolbarButtons = useMemo<ToolbarButton[]>(() => ([
    { key: 'select', label: 'Select', activeWhen: 'select', onClick: () => setActiveTool('select') },
    { key: 'move', label: 'Move', activeWhen: 'move', onClick: () => setActiveTool('move') },
    {
      key: 'rotate',
      label: 'Rotate',
      activeWhen: 'rotate',
      onClick: () => {
        setActiveTool('rotate');
        // Keep rotate-root flow predictable: clear latent node/path selections.
        setSelectedNodeIndex(-1);
        setSelectedPathPointIndex(-1);
        if (
          !selectedObjectPath
          || selectedObjectPath === ASSET_ROOT_PATH
        ) {
          setSelectedObjectPathAndHighlight(ASSET_ROOT_PATH);
        }
      },
    },
    { key: 'undo', label: 'Undo', icon: <Undo2 size={12} />, onClick: () => {} },
    { key: 'redo', label: 'Redo', icon: <Redo2 size={12} />, onClick: () => {} },
    { key: 'copy', label: 'Copy', icon: <Copy size={12} />, onClick: () => {} },
    { key: 'frame', label: 'Frame', icon: <Maximize size={12} />, onClick: () => setCameraIntent('fit') },
    { key: 'node', label: 'Node', activeWhen: 'node', onClick: () => setActiveTool('node') },
    { key: 'pivot', label: 'Pivot', activeWhen: 'pivot', onClick: () => setActiveTool('pivot') },
  ]), [setCameraIntent, selectedObjectPath]);

  function loadTemplatePreset(kind: 'straight' | 'lift'): void {
    if (kind === 'straight') {
      const infeed = nodes.find((n) => String(n.type || '').toLowerCase().includes('infeed')) || nodes[0];
      const outfeed = nodes.find((n) => String(n.type || '').toLowerCase().includes('outfeed')) || nodes[nodes.length - 1];
      setBehaviorTemplate('straight-conveyor');
      setBehaviorConfig({
        ...defaultBehaviorConfig('straight-conveyor'),
        ...(infeed?.id ? { infeedNodeId: infeed.id } : {}),
        ...(outfeed?.id ? { outfeedNodeId: outfeed.id } : {}),
        speedMpm: Number(behaviorConfig.speedMpm || 20) || 20,
      });
      setRuntimeControls(defaultRuntimeControlsForTemplate('straight-conveyor'));
      setPathMode('straight-node');
      setActiveTool('node');
      return;
    }
    const infeed = nodes.find((n) => String(n.type || '').toLowerCase().includes('infeed')) || nodes[0];
    const outfeed = nodes.find((n) => String(n.type || '').toLowerCase().includes('outfeed')) || nodes[nodes.length - 1];
    const lower = Number(infeed?.position?.[1] || 800);
    const upper = Number(outfeed?.position?.[1] || Math.max(lower + 1200, 2400));
    setBehaviorTemplate('lift-conveyor');
    setBehaviorConfig({
      ...defaultBehaviorConfig('lift-conveyor'),
      ...(infeed?.id ? { lowerInfeedNodeId: infeed.id } : {}),
      ...(outfeed?.id ? { upperOutfeedNodeId: outfeed.id } : {}),
      lowerStopPositionMm: lower,
      upperStopPositionMm: Math.max(upper, lower + 50),
      homePositionMm: lower,
      targetHeightsMm: `${Math.round(lower)},${Math.round(Math.max(upper, lower + 50))}`,
    });
    setRuntimeControls(defaultRuntimeControlsForTemplate('lift-conveyor'));
    setPathMode('straight-node');
    setActiveTool('node');
  }

  return (
    <div style={{ height: '100vh', background: 'var(--mm-bg-app)', color: 'var(--mm-text-primary)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <header style={{ background: 'var(--mm-bg-panel)', borderBottom: '1px solid var(--mm-border)', padding: '10px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link to={simulationUrls.productHome} style={{ textDecoration: 'none', color: 'inherit' }}>
            <img src="/simulation-studio-logo.png" alt="Simulation Studio" style={{ width: 198, height: 40, borderRadius: 8, objectFit: 'cover', objectPosition: 'center 45%' }} />
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--mm-accent-primary)', border: '1px solid color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)', background: 'var(--mm-accent-primary-muted)', padding: '5px 8px', borderRadius: 8 }}>
            <Shield size={13} />
            Admin Asset Editor
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link to="/admin/assets" style={{ color: 'var(--mm-text-primary)', fontSize: 12, textDecoration: 'none', border: '1px solid var(--mm-border)', borderRadius: 8, padding: '7px 10px', background: 'var(--mm-bg-surface)' }}>
            <ArrowLeft size={13} style={{ marginRight: 6 }} />
            Back to Library
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--mm-text-secondary)' }}>
            <User size={13} />
            <span>{user?.displayName}</span>
          </div>
          <button type="button" onClick={logout} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '7px 10px', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', fontSize: 12 }}>
            Sign Out
          </button>
        </div>
      </header>

      <main
        ref={mainRef}
        style={{
          flex: 1,
          padding: 10,
          display: 'grid',
          gridTemplateColumns: `${leftPanelWidth}px minmax(${VIEWPORT_MIN}px, 1fr) ${rightPanelWidth}px`,
          gap: 10,
          minHeight: 0,
          overflow: 'hidden',
        }}
      >
        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 10, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
          <div style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Authoring Navigator</div>
            </div>

            <button
              type="button"
              onClick={() => toggleLeftSection('assets')}
              style={{ textAlign: 'left', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, fontWeight: 700 }}
            >
              {leftSectionOpen.assets ? '▼' : '▶'} Assets
            </button>
            {leftSectionOpen.assets && (
              <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                    Upload target category: {selectedCategoryId ?? 'none'}
                  </div>
                  <button type="button" onClick={() => modelFileRef.current?.click()} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-panel)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Upload size={12} />
                    Upload GLB
                  </button>
                  <input
                    ref={modelFileRef}
                    type="file"
                    accept=".glb,model/gltf-binary"
                    style={{ display: 'none' }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadModel(file);
                      e.target.value = '';
                    }}
                  />
                </div>
                {loading && <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>Loading assets…</div>}
                <div style={{ maxHeight: 170, overflowY: 'auto', display: 'grid', gap: 6, paddingRight: 4 }}>
                  {assets.map((row) => {
                    const selected = asset?.id === row.id;
                    return (
                      <button
                        key={row.id}
                        type="button"
                        onClick={() => selectAsset(row)}
                        style={{
                          textAlign: 'left',
                          border: `1px solid ${selected ? 'color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)' : 'var(--mm-border-subtle)'}`,
                          borderRadius: 8,
                          padding: 8,
                          background: selected ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{row.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)', marginTop: 2 }}>
                          {row.status} • v{row.version}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleLeftSection('hierarchy')}
              style={{ textAlign: 'left', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, fontWeight: 700 }}
            >
              {leftSectionOpen.hierarchy ? '▼' : '▶'} Model Object Hierarchy
            </button>
            {leftSectionOpen.hierarchy && (
              <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                <input
                  value={objectFilter}
                  onChange={(e) => setObjectFilter(e.target.value)}
                  placeholder="Filter object names"
                  style={{ fontSize: 12 }}
                />
                <div style={{ maxHeight: 210, overflowY: 'auto', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, background: 'var(--mm-bg-panel)' }}>
                  {filteredHierarchyItems.length === 0 ? (
                    <div style={{ padding: 8, fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                      {hierarchyItems.length === 0 ? 'No scene hierarchy found in current GLB.' : 'No objects match this filter.'}
                    </div>
                  ) : (
                    filteredHierarchyItems.map((item) => (
                      <button
                        key={`left-h-${item.id}`}
                        type="button"
                        onClick={() => setSelectedObjectPathAndHighlight(item.path)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '6px 8px',
                          border: 'none',
                          borderBottom: '1px solid var(--mm-border-subtle)',
                          borderLeft: selectedObjectPath === item.path ? '3px solid var(--mm-accent-primary)' : '3px solid transparent',
                          paddingLeft: `${8 + (item.depth * 12)}px`,
                          background: selectedObjectPath === item.path ? 'var(--mm-accent-primary-muted)' : 'transparent',
                          color: selectedObjectPath === item.path ? 'var(--mm-text-primary)' : 'var(--mm-text-secondary)',
                          fontSize: 11,
                          cursor: 'pointer',
                        }}
                      >
                        {item.name}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleLeftSection('nodes')}
              style={{ textAlign: 'left', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, fontWeight: 700 }}
            >
              {leftSectionOpen.nodes ? '▼' : '▶'} Nodes
            </button>
            {leftSectionOpen.nodes && (
              <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
                {nodes.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>No nodes yet.</div>
                ) : nodes.map((node, index) => (
                  <button
                    key={`left-node-${node.id || index}`}
                    type="button"
                    onClick={() => { setActiveTool('node'); setSelectedNodeIndex(index); }}
                    style={{ textAlign: 'left', border: `1px solid ${selectedNodeIndex === index ? 'color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)' : 'var(--mm-border-subtle)'}`, borderRadius: 8, padding: 6, background: selectedNodeIndex === index ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)' }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{node.id || `Node ${index + 1}`}</div>
                    <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)' }}>{node.type || 'unknown'}</div>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleLeftSection('moving')}
              style={{ textAlign: 'left', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, fontWeight: 700 }}
            >
              {leftSectionOpen.moving ? '▼' : '▶'} Moving Parts
            </button>
            {leftSectionOpen.moving && (
              <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6, maxHeight: 150, overflowY: 'auto' }}>
                {movableParts.length === 0 ? (
                  <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>No moving parts yet.</div>
                ) : movableParts.map((part, index) => (
                  <button
                    key={`left-move-${part.objectName}-${index}`}
                    type="button"
                    onClick={() => setPreviewPartIndex(index)}
                    style={{ textAlign: 'left', border: `1px solid ${previewPartIndex === index ? 'color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)' : 'var(--mm-border-subtle)'}`, borderRadius: 8, padding: 6, background: previewPartIndex === index ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)' }}
                  >
                    <div style={{ fontSize: 11, fontWeight: 700 }}>{part.objectName}</div>
                    <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)' }}>{part.motionType} • {part.axis}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div
            role="separator"
            aria-label="Resize assets panel"
            aria-orientation="vertical"
            onMouseDown={(event) => beginResize(event, 'left')}
            style={{
              position: 'absolute',
              top: 0,
              right: -6,
              bottom: 0,
              width: 12,
              cursor: 'col-resize',
              zIndex: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 2,
                height: '45%',
                borderRadius: 999,
                background: resizeDrag?.side === 'left'
                  ? 'var(--mm-accent-primary)'
                  : 'color-mix(in oklab, var(--mm-text-disabled) 50%, transparent)',
              }}
            />
          </div>
        </section>

        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, overflow: 'hidden', display: 'grid', gridTemplateRows: '1fr auto', minHeight: 0 }}>
          <div style={{ minHeight: 0 }}>
            <ModelPreview
              modelUrl={asset?.modelUrl || null}
              sourceUnit={sourceUnit}
              scaleCorrection={scaleCorrection}
              pivotOffsetMm={pivotOffsetMm}
              assetRootRotationDeg={assetRootRotationDeg}
              objectRotationDegByPath={objectRotationDegByPath}
              cameraIntent={cameraIntent}
              onCameraIntentHandled={() => setCameraIntent('none')}
              activeTool={activeTool}
              pathMode={pathMode}
              measurementMode={measureMode}
              onModelBoundsComputed={setNativeBounds}
              measurementPoints={measurementPoints}
              onMeasurementPointsChange={setMeasurementPoints}
              frameTargetPath={fitTargetPath}
              nodes={nodes}
              selectedNodeIndex={selectedNodeIndex}
              onSelectNode={setSelectedNodeIndex}
              selectedObjectPath={selectedObjectPath}
              onSelectObjectPath={setSelectedObjectPathAndHighlight}
              onPlaceNodeAtMm={placeSelectedNodeAt}
              onMoveNodeToMm={(index, positionMm) => updateNode(index, { position: positionMm })}
              onRotateSelectedObjectDeg={(path, rotationDeg) => {
                if (!path || path === ASSET_ROOT_PATH) return;
                setObjectRotationDegByPath((prev) => ({ ...prev, [path]: normalizeEulerDeg(rotationDeg, [0, 0, 0]) }));
              }}
              onSetAssetRootRotationDeg={(rotationDeg) => setAssetRootRotationDeg(normalizeEulerDeg(rotationDeg, [0, 0, 0]))}
              setHierarchyItems={setHierarchyItems}
              highlightedObjectNames={highlightedObjectNames}
              setHighlightedObjectNames={setHighlightedObjectNames}
              movingParts={movableParts}
              previewPartIndex={previewPartIndex}
              previewT={previewT}
              pathPoints={pathPoints}
              selectedPathPointIndex={selectedPathPointIndex}
              onPathPointsChange={setPathPoints}
              onSelectPathPoint={setSelectedPathPointIndex}
              toolbarButtons={toolbarButtons}
              rotationTargetInfo={rotationTargetInfo}
              rotationHintMessage={rotationHintMessage}
              rotationSnapStep={rotationSnapStep}
              nodeSnapMode={nodeSnapMode}
              nodeTransformMode={nodeTransformMode}
              showWorldAxis={showWorldAxis}
              showLocalAxis={showLocalAxis}
            />
          </div>
          <div style={{ borderTop: '1px solid var(--mm-border-subtle)', padding: '8px 10px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', position: 'sticky', bottom: 0, background: 'var(--mm-bg-panel)', zIndex: 4, boxShadow: '0 -8px 18px rgba(2, 6, 23, 0.22)' }}>
            <button type="button" onClick={saveAsset} disabled={!asset || saving} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Save size={13} />
              Save Metadata
            </button>
            <button type="button" onClick={publishAsset} disabled={!asset || saving || validation.length > 0} style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-success) 45%, transparent)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-accent-success-muted)', color: 'var(--mm-accent-success)', fontSize: 12, fontWeight: 700 }}>
              Publish
            </button>
            <button type="button" onClick={() => thumbFileRef.current?.click()} disabled={!asset || saving} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '8px 10px', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <Upload size={13} />
              Thumbnail
            </button>
            <input
              ref={thumbFileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadThumbnail(file);
                e.target.value = '';
              }}
            />
            {message && <span style={{ fontSize: 12, color: 'var(--mm-accent-success)' }}>{message}</span>}
            {error && <span style={{ fontSize: 12, color: 'var(--mm-accent-danger)' }}>{error}</span>}
          </div>
        </section>

        <section style={{ background: 'var(--mm-bg-panel)', border: '1px solid var(--mm-border)', borderRadius: 12, padding: 8, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'scroll', overscrollBehavior: 'contain', scrollbarGutter: 'stable', paddingRight: 8, paddingBottom: 8 }}>
            {!asset && <div style={{ fontSize: 12, color: 'var(--mm-text-tertiary)' }}>Select an asset to edit authoring metadata.</div>}
            {asset && (
              <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Asset Info</div>
              <div style={{ display: 'grid', gap: 6 }}>
                <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} />
                <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Tags (comma separated)</label>
                <input value={tagsText} onChange={(e) => setTagsText(e.target.value)} />
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>
                  Model Normalization
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Source Unit</label>
                    <select value={sourceUnit} onChange={(e) => setSourceUnit(e.target.value as SourceUnit)}>
                      <option value="unknown">unknown</option>
                      <option value="mm">mm</option>
                      <option value="cm">cm</option>
                      <option value="m">m</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Scale Correction</label>
                    <input
                      type="number"
                      step={0.0001}
                      min={0.000001}
                      value={scaleCorrection}
                      onChange={(e) => setScaleCorrection(Math.max(0.000001, Number(e.target.value) || 1))}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 4, fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                  <div>
                    Raw Bounds: {nativeBounds ? `W ${nativeBounds.x.toFixed(4)}, D ${nativeBounds.z.toFixed(4)}, H ${nativeBounds.y.toFixed(4)}` : 'not available'}
                  </div>
                  <div>
                    Normalized (mm): {normalizedBoundsMm ? `W ${normalizedBoundsMm.width.toFixed(1)}, D ${normalizedBoundsMm.depth.toFixed(1)}, H ${normalizedBoundsMm.height.toFixed(1)}` : 'not available'}
                  </div>
                  <div>
                    World Size (m): {normalizedBoundsMm
                      ? `W ${(normalizedBoundsMm.width / 1000).toFixed(3)}, D ${(normalizedBoundsMm.depth / 1000).toFixed(3)}, H ${(normalizedBoundsMm.height / 1000).toFixed(3)}`
                      : 'not available'}
                  </div>
                </div>
                {normalizationWarnings.length > 0 && (
                  <div style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-warning, #f59e0b) 45%, transparent)', borderRadius: 8, background: 'color-mix(in oklab, var(--mm-accent-warning, #f59e0b) 10%, transparent)', padding: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--mm-text-secondary)', marginBottom: 4 }}>
                      Import Warnings
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                      {normalizationWarnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Pivot X (mm)</label>
                    <input
                      type="number"
                      value={pivotOffsetMm[0]}
                      onChange={(e) => setPivotOffsetMm([Number(e.target.value) || 0, pivotOffsetMm[1], pivotOffsetMm[2]])}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Pivot Y (mm)</label>
                    <input
                      type="number"
                      value={pivotOffsetMm[1]}
                      onChange={(e) => setPivotOffsetMm([pivotOffsetMm[0], Number(e.target.value) || 0, pivotOffsetMm[2]])}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Pivot Z (mm)</label>
                    <input
                      type="number"
                      value={pivotOffsetMm[2]}
                      onChange={(e) => setPivotOffsetMm([pivotOffsetMm[0], pivotOffsetMm[1], Number(e.target.value) || 0])}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setCameraIntent('fit')} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Maximize size={12} />
                    Fit to Model
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFitTargetPath(selectedObjectPath || '');
                      setCameraIntent('frameSelected');
                    }}
                    style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Crosshair size={12} />
                    Frame Selected
                  </button>
                  <button type="button" onClick={() => setCameraIntent('reset')} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11 }}>
                    Reset Camera
                  </button>
                </div>
                <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>
                    Asset Root Rotation (deg)
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                    {[0, 1, 2].map((axis) => (
                      <input
                        key={`asset-root-rot-${axis}`}
                        type="number"
                        step={0.1}
                        value={Number(assetRootRotationDeg[axis] || 0).toFixed(1)}
                        onChange={(e) => {
                          const next = [...assetRootRotationDeg] as [number, number, number];
                          next[axis] = Number(e.target.value) || 0;
                          setAssetRootRotationDeg(normalizeEulerDeg(next, [0, 0, 0]));
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Rotation Snap</label>
                    <select
                      value={rotationSnapStep === 'off' ? 'off' : String(rotationSnapStep)}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === 'off') {
                          setRotationSnapStep('off');
                        } else if (raw === '15') {
                          setRotationSnapStep(15);
                        } else {
                          setRotationSnapStep(45);
                        }
                      }}
                      style={{ width: 100 }}
                    >
                      <option value="45">45°</option>
                      <option value="15">15°</option>
                      <option value="off">Off</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setAssetRootRotationDeg([0, 0, 0])}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-panel)', fontSize: 11 }}
                    >
                      Reset Rotation
                    </button>
                  </div>
                </div>
                <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>
                    Measurements {activeTool === 'measurement' ? '(active tool)' : ''}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('measurement');
                        setMeasureMode('two-point');
                        setMeasurementPoints([]);
                      }}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: measureMode === 'two-point' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)', fontSize: 11 }}
                    >
                      <Ruler size={12} style={{ marginRight: 4 }} />
                      Point-to-point
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTool('measurement');
                        setMeasureMode('chain');
                        setMeasurementPoints([]);
                      }}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: measureMode === 'chain' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)', fontSize: 11 }}
                    >
                      Chained
                    </button>
                    <button type="button" onClick={() => setMeasurementPoints([])} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-panel)', fontSize: 11 }}>
                      Clear
                    </button>
                  </div>
                  {measureMode === 'two-point' ? (
                    <div style={{ fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                      Distance: {twoPointDistanceMm != null ? `${twoPointDistanceMm.toFixed(2)} mm` : 'pick two points in viewport'}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                      Segments: {chainSegments.length > 0 ? chainSegments.map((s, i) => `#${i + 1} ${s.toFixed(1)}mm`).join(' | ') : 'pick polyline points'}
                      {chainSegments.length > 0 ? ` • Total: ${chainTotalMm.toFixed(2)} mm` : ''}
                    </div>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 6, alignItems: 'end' }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Set Known Dimension (mm)</label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={knownDimensionMmInput}
                        onChange={(e) => setKnownDimensionMmInput(e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const known = Number(knownDimensionMmInput);
                        if (!Number.isFinite(known) || known <= 0 || twoPointDistanceMm == null || twoPointDistanceMm <= 0) return;
                        setScaleCorrection((prev) => Math.max(0.000001, prev * (known / twoPointDistanceMm)));
                      }}
                      disabled={twoPointDistanceMm == null || twoPointDistanceMm <= 0 || !(Number(knownDimensionMmInput) > 0)}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 10px', background: 'var(--mm-bg-panel)', fontSize: 11 }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>
                  Product Flow Path
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setPathMode('straight-node');
                      setActiveTool('node');
                    }}
                    style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: pathMode === 'straight-node' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)', fontSize: 11 }}
                  >
                      Infeed -&gt; Outfeed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPathMode('polyline');
                      setActiveTool('node');
                    }}
                    style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: pathMode === 'polyline' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)', fontSize: 11 }}
                  >
                    Multi-point Path
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPathMode('none');
                      setPathPoints([]);
                      setSelectedPathPointIndex(-1);
                    }}
                    style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: pathMode === 'none' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-panel)', fontSize: 11 }}
                  >
                    Disable Path
                  </button>
                </div>
                {pathMode === 'straight-node' && (
                  <div style={{ fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                    Uses infeed/outfeed node positions as a straight transport path.
                  </div>
                )}
                {pathMode === 'polyline' && (
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                      Click viewport to add points. Select a point to drag with gizmo.
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setPathPoints([])}
                        style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-panel)', fontSize: 11 }}
                      >
                        Clear Points
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedPathPointIndex < 0) return;
                          setPathPoints((prev) => prev.filter((_, i) => i !== selectedPathPointIndex));
                          setSelectedPathPointIndex(-1);
                        }}
                        disabled={selectedPathPointIndex < 0}
                        style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-panel)', fontSize: 11 }}
                      >
                        Remove Selected Point
                      </button>
                    </div>
                    <div style={{ maxHeight: 120, overflowY: 'auto', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, background: 'var(--mm-bg-surface)' }}>
                      {pathPoints.length === 0 ? (
                        <div style={{ padding: 8, fontSize: 11, color: 'var(--mm-text-tertiary)' }}>No path points yet.</div>
                      ) : (
                        pathPoints.map((point, index) => (
                          <button
                            key={point.id}
                            type="button"
                            onClick={() => setSelectedPathPointIndex(index)}
                            style={{
                              width: '100%',
                              textAlign: 'left',
                              border: 'none',
                              borderBottom: '1px solid var(--mm-border-subtle)',
                              background: selectedPathPointIndex === index ? 'var(--mm-accent-primary-muted)' : 'transparent',
                              padding: '6px 8px',
                              fontSize: 11,
                            }}
                          >
                            P{index + 1}: [{point.positionMm[0].toFixed(1)}, {point.positionMm[1].toFixed(1)}, {point.positionMm[2].toFixed(1)}] mm
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8, display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>
                  Behavior Template
                </div>
                <select
                  value={behaviorTemplate}
                  onChange={(e) => {
                    const nextTemplate = e.target.value as BehaviorTemplateType;
                    setBehaviorTemplate(nextTemplate);
                    setBehaviorConfig(defaultBehaviorConfig(nextTemplate));
                    setRuntimeControls(defaultRuntimeControlsForTemplate(nextTemplate));
                  }}
                >
                  <option value="none">None / Static</option>
                  <option value="straight-conveyor">Straight Conveyor</option>
                  <option value="lift-conveyor">Lift Conveyor</option>
                  <option value="rotary-transfer">Rotary Transfer</option>
                  <option value="angle-transfer">Angle Transfer</option>
                  <option value="robot-pick-place">Robot Pick &amp; Place</option>
                </select>

                {behaviorTemplate === 'straight-conveyor' && (
                  <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>Straight Conveyor Properties</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Speed (m/min)</label>
                        <input type="number" value={Number(behaviorConfig.speedMpm || 20)} onChange={(e) => setBehaviorField('speedMpm', Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Direction</label>
                        <select value={String(behaviorConfig.direction || 'forward')} onChange={(e) => setBehaviorField('direction', e.target.value)}>
                          <option value="forward">forward</option>
                          <option value="reverse">reverse</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Usable Path Length (mm)</label>
                        <input type="number" value={Number(behaviorConfig.usablePathLengthMm || 0)} onChange={(e) => setBehaviorField('usablePathLengthMm', Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Conveyor Top Height (mm)</label>
                        <input type="number" value={Number(behaviorConfig.conveyorTopHeightMm || 0)} onChange={(e) => setBehaviorField('conveyorTopHeightMm', Number(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                        <input type="checkbox" checked={Boolean(behaviorConfig.accumulationEnabled)} onChange={(e) => setBehaviorField('accumulationEnabled', e.target.checked)} />
                        Accumulation
                      </label>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Stop Mode</label>
                        <select value={String(behaviorConfig.stopMode || 'none')} onChange={(e) => setBehaviorField('stopMode', e.target.value)}>
                          <option value="none">none</option>
                          <option value="sensor">sensor</option>
                          <option value="stopper">stopper</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {behaviorTemplate === 'lift-conveyor' && (
                  <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>Lift Conveyor Properties</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Travel Axis</label>
                        <select value={String(behaviorConfig.liftTravelAxis || 'y')} onChange={(e) => setBehaviorField('liftTravelAxis', e.target.value)}>
                          <option value="x">x</option>
                          <option value="y">y</option>
                          <option value="z">z</option>
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Lower Stop (mm)</label>
                        <input type="number" value={Number(behaviorConfig.lowerStopPositionMm || 0)} onChange={(e) => setBehaviorField('lowerStopPositionMm', Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Upper Stop (mm)</label>
                        <input type="number" value={Number(behaviorConfig.upperStopPositionMm || 0)} onChange={(e) => setBehaviorField('upperStopPositionMm', Number(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Lift Speed Up (m/s)</label>
                        <input type="number" step={0.01} value={Number(behaviorConfig.liftSpeedUpMps || 0)} onChange={(e) => setBehaviorField('liftSpeedUpMps', Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Lift Speed Down (m/s)</label>
                        <input type="number" step={0.01} value={Number(behaviorConfig.liftSpeedDownMps || 0)} onChange={(e) => setBehaviorField('liftSpeedDownMps', Number(e.target.value) || 0)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Conveyor Speed (m/min)</label>
                        <input type="number" value={Number(behaviorConfig.conveyorSpeedMpm || 0)} onChange={(e) => setBehaviorField('conveyorSpeedMpm', Number(e.target.value) || 0)} />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Cycle Mode</label>
                        <select value={String(behaviorConfig.cycleMode || 'auto-up-after-load')} onChange={(e) => setBehaviorField('cycleMode', e.target.value)}>
                          <option value="auto-up-after-load">auto up after load</option>
                          <option value="wait-downstream-ready">wait for downstream ready</option>
                          <option value="manual-trigger">manual trigger</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

              {(behaviorTemplate === 'rotary-transfer' || behaviorTemplate === 'angle-transfer' || behaviorTemplate === 'robot-pick-place') && (
                <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>
                    {behaviorTemplate === 'rotary-transfer' ? 'Rotary Transfer Properties' : behaviorTemplate === 'angle-transfer' ? 'Angle Transfer Properties' : 'Robot Pick & Place Properties'}
                  </div>
                  {behaviorTemplate === 'rotary-transfer' ? (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Pick Node ID</label>
                          <input value={String(behaviorConfig.pickNodeId || '')} onChange={(e) => setBehaviorField('pickNodeId', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Place Node IDs (comma)</label>
                          <input value={String(behaviorConfig.placeNodeIds || '')} onChange={(e) => setBehaviorField('placeNodeIds', e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Rotation Angle (deg)</label>
                          <input type="number" value={Number(behaviorConfig.rotationAngleDeg || 0)} onChange={(e) => setBehaviorField('rotationAngleDeg', Number(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Rotation Speed (deg/s)</label>
                          <input type="number" value={Number(behaviorConfig.rotationSpeedDegPerSec || 0)} onChange={(e) => setBehaviorField('rotationSpeedDegPerSec', Number(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Dwell (s)</label>
                          <input type="number" step={0.01} value={Number(behaviorConfig.dwellSec || 0)} onChange={(e) => setBehaviorField('dwellSec', Number(e.target.value) || 0)} />
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Source Node ID</label>
                          <input value={String(behaviorConfig.sourceNodeId || '')} onChange={(e) => setBehaviorField('sourceNodeId', e.target.value)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Destination Node IDs (comma)</label>
                          <input value={String(behaviorConfig.destinationNodeIds || '')} onChange={(e) => setBehaviorField('destinationNodeIds', e.target.value)} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Transfer Angle (deg)</label>
                          <input type="number" value={Number(behaviorConfig.transferAngleDeg || 0)} onChange={(e) => setBehaviorField('transferAngleDeg', Number(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Cycle Time (s)</label>
                          <input type="number" step={0.01} value={Number(behaviorConfig.cycleTimeSec || 0)} onChange={(e) => setBehaviorField('cycleTimeSec', Number(e.target.value) || 0)} />
                        </div>
                        <div>
                          <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Motion Speed</label>
                          <input type="number" step={0.01} value={Number(behaviorConfig.motionProfileSpeed || 0)} onChange={(e) => setBehaviorField('motionProfileSpeed', Number(e.target.value) || 0)} />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

                <div style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>Runtime Controls</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                    {([
                      ['showSpeedSlider', 'Speed slider'],
                      ['showTargetHeight', 'Target height selector'],
                      ['showAutoManual', 'Auto/manual mode'],
                      ['showHomeCommand', 'Home command'],
                      ['showEnableToggle', 'Enable/disable'],
                      ['showSensorState', 'Sensor state visibility'],
                      ['showStopperState', 'Stopper state visibility'],
                    ] as [keyof RuntimeControlsConfig, string][]).map(([key, label]) => (
                      <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                        <input type="checkbox" checked={Boolean(runtimeControls[key])} onChange={(e) => setRuntimeControl(key, e.target.checked)} />
                        {label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Nodes</div>
                  <button type="button" onClick={addNode} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} />
                    Add Node
                  </button>
                </div>
                  <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>Visual Placement</div>
                  <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)', marginTop: 4 }}>
                    Active tool: <strong>{activeTool === 'node' ? 'Node placement/edit' : activeTool === 'measurement' ? 'Measurement' : activeTool === 'move' ? 'Move' : activeTool === 'rotate' ? 'Rotate' : activeTool === 'pivot' ? 'Pivot' : 'Select'}</strong>.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                      <input type="checkbox" checked={showWorldAxis} onChange={(e) => setShowWorldAxis(e.target.checked)} />
                      Show World Axis
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mm-text-secondary)' }}>
                      <input type="checkbox" checked={showLocalAxis} onChange={(e) => setShowLocalAxis(e.target.checked)} />
                      Show Local Axis
                    </label>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Node Transform</label>
                      <select value={nodeTransformMode} onChange={(e) => setNodeTransformMode(e.target.value as TransformMode)}>
                        <option value="translate">Move</option>
                        <option value="rotate">Rotate</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Node Snap</label>
                      <select value={nodeSnapMode} onChange={(e) => setNodeSnapMode(e.target.value as NodeGizmoSnapMode)}>
                        <option value="off">Off</option>
                        <option value="surface">Surface</option>
                        <option value="center">Center</option>
                        <option value="edge">Edge</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button type="button" onClick={placeSelectedNodeOnGround} disabled={selectedNodeIndex < 0} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-panel)', fontSize: 11 }}>
                      Place Selected on Ground
                    </button>
                    <button type="button" onClick={focusSelectedNode} disabled={selectedNodeIndex < 0} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-panel)', fontSize: 11 }}>
                      Focus Selected Node
                    </button>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                    Node colors: Infeed = Blue, Outfeed = Green, Stop/Load = Yellow, Pick = Orange, Place = Purple.
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
                  {nodes.map((node, index) => (
                    <button key={`${node.id || 'node'}-${index}`} type="button" onClick={() => { setActiveTool('node'); setSelectedNodeIndex(index); }} style={{ textAlign: 'left', border: `1px solid ${selectedNodeIndex === index ? 'color-mix(in oklab, var(--mm-accent-primary) 40%, transparent)' : 'var(--mm-border-subtle)'}`, borderRadius: 8, padding: 8, background: selectedNodeIndex === index ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)' }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{node.id || `Node ${index + 1}`}</div>
                      <div style={{ fontSize: 10, color: 'var(--mm-text-tertiary)' }}>type: {node.type || 'unknown'}</div>
                    </button>
                  ))}
                </div>
                {selectedNodeIndex >= 0 && nodes[selectedNodeIndex] && (
                  <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Node ID</label>
                    <input value={String(nodes[selectedNodeIndex].id || '')} onChange={(e) => updateNode(selectedNodeIndex, { id: e.target.value })} />
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Node Type</label>
                    <select value={String(nodes[selectedNodeIndex].type || 'infeed')} onChange={(e) => updateNode(selectedNodeIndex, { type: e.target.value })}>
                      <option value="infeed">infeed</option>
                      <option value="outfeed">outfeed</option>
                      <option value="center">center</option>
                      <option value="top_attach">top_attach</option>
                      <option value="bottom_attach">bottom_attach</option>
                      <option value="pick">pick</option>
                      <option value="place">place</option>
                    </select>
                    <label style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Position [x,y,z] mm</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: 6 }}>
                      {[0, 1, 2].map((axis) => (
                        <input
                          key={axis}
                          type="number"
                          value={Number(nodes[selectedNodeIndex].position?.[axis] || 0)}
                          onChange={(e) => {
                            const current = nodes[selectedNodeIndex];
                            const next = [...(current.position || [0, 0, 0])] as [number, number, number];
                            next[axis] = Number(e.target.value) || 0;
                            updateNode(selectedNodeIndex, { position: next });
                          }}
                        />
                      ))}
                    </div>
                    <button type="button" onClick={() => deleteNode(selectedNodeIndex)} style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 45%, transparent)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                      <Trash2 size={12} />
                      Remove Node
                    </button>
                  </div>
                )}
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Moving Parts</div>
                  <button type="button" onClick={addMovingPart} style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Plus size={12} />
                    Add Part
                  </button>
                </div>
                <div style={{ marginTop: 8, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--mm-text-secondary)' }}>Model Object Hierarchy (mesh/object names)</div>
                  <input
                    value={objectFilter}
                    onChange={(e) => setObjectFilter(e.target.value)}
                    placeholder="Filter object names"
                    style={{ fontSize: 12 }}
                  />
                  <div style={{ maxHeight: 130, overflowY: 'auto', border: '1px solid var(--mm-border-subtle)', borderRadius: 8, background: 'var(--mm-bg-panel)' }}>
                    {filteredHierarchyItems.length === 0 ? (
                      <div style={{ padding: 8, fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                        {hierarchyItems.length === 0 ? 'No scene hierarchy found in current GLB.' : 'No objects match this filter.'}
                      </div>
                    ) : (
                      filteredHierarchyItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                        onClick={() => setSelectedObjectPathAndHighlight(item.path)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '6px 8px',
                            border: 'none',
                            borderBottom: '1px solid var(--mm-border-subtle)',
                            borderLeft: selectedObjectPath === item.path ? '3px solid var(--mm-accent-primary)' : '3px solid transparent',
                            paddingLeft: `${8 + (item.depth * 12)}px`,
                            background: selectedObjectPath === item.path ? 'var(--mm-accent-primary-muted)' : 'transparent',
                            color: selectedObjectPath === item.path ? 'var(--mm-text-primary)' : 'var(--mm-text-secondary)',
                            fontSize: 11,
                            cursor: 'pointer',
                          }}
                        >
                          <span style={{ fontWeight: item.isMesh ? 600 : 500 }}>
                            {item.name}
                          </span>
                          <span style={{ marginLeft: 6, color: 'var(--mm-text-disabled)', fontSize: 10 }}>
                            {item.childCount > 0 ? `(${item.childCount})` : item.isMesh ? 'mesh' : 'group'}
                          </span>
                          <div style={{ marginTop: 2, color: 'var(--mm-text-disabled)', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.path}
                          </div>
                          {selectedObjectPath === item.path && (
                            <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, color: 'var(--mm-accent-primary)' }}>
                              Selected
                            </div>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: selectedHierarchyItem ? 'var(--mm-text-primary)' : 'var(--mm-text-tertiary)' }}>
                    {selectedHierarchyItem ? `Selected object: ${selectedHierarchyItem.path}` : 'Selected object: none'}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!selectedObjectPath) return;
                        setMovableParts((prev) => [
                          ...prev,
                          {
                            objectName: selectedObjectPath,
                            motionType: 'translate',
                            axis: 'x',
                            min: 0,
                            max: 100,
                            default: 0,
                            speed: 10,
                          },
                        ]);
                      }}
                      disabled={!selectedObjectPath}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11 }}
                    >
                      Add Selected Object as Moving Part
                    </button>
                    <button
                      type="button"
                      onClick={() => setHighlightedObjectNames([])}
                      style={{ border: '1px solid var(--mm-border)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-bg-surface)', fontSize: 11 }}
                    >
                      Clear Highlight
                    </button>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
                  {movableParts.map((part, index) => (
                    <div key={`${part.objectName}-${index}`} style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'var(--mm-bg-surface)', display: 'grid', gap: 6 }}>
                      <input value={part.objectName} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, objectName: e.target.value } : p)))} placeholder="Object name" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 6 }}>
                        <select value={part.motionType} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, motionType: e.target.value as 'translate' | 'rotate' } : p)))}>
                          <option value="translate">translate</option>
                          <option value="rotate">rotate</option>
                        </select>
                        <select value={part.axis} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, axis: e.target.value as 'x' | 'y' | 'z' } : p)))}>
                          <option value="x">x</option>
                          <option value="y">y</option>
                          <option value="z">z</option>
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 6 }}>
                        <input type="number" value={part.min} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, min: Number(e.target.value) || 0 } : p)))} placeholder="min" />
                        <input type="number" value={part.max} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, max: Number(e.target.value) || 0 } : p)))} placeholder="max" />
                        <input type="number" value={part.default} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, default: Number(e.target.value) || 0 } : p)))} placeholder="default" />
                        <input type="number" value={part.speed} onChange={(e) => setMovableParts((prev) => prev.map((p, i) => (i === index ? { ...p, speed: Number(e.target.value) || 0 } : p)))} placeholder="speed" />
                      </div>
                      <button type="button" onClick={() => setMovableParts((prev) => prev.filter((_, i) => i !== index))} style={{ border: '1px solid color-mix(in oklab, var(--mm-accent-danger) 45%, transparent)', borderRadius: 8, padding: '6px 8px', background: 'var(--mm-accent-danger-muted)', color: 'var(--mm-accent-danger)', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                        <Trash2 size={12} />
                        Remove Part
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8, display: 'grid', gap: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)' }}>Motion Preview</div>
                <select value={previewPartIndex} onChange={(e) => setPreviewPartIndex(Number(e.target.value))}>
                  <option value={-1}>none</option>
                  {movableParts.map((part, index) => (
                    <option key={`${part.objectName}-${index}`} value={index}>
                      {part.objectName}
                    </option>
                  ))}
                </select>
                <input type="range" min={0} max={1} step={0.01} value={previewT} onChange={(e) => setPreviewT(Number(e.target.value))} />
              </div>

              <div style={{ borderTop: '1px solid var(--mm-border-subtle)', paddingTop: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 6 }}>Validation</div>
                {validation.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--mm-accent-success)' }}>Ready to publish</div>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--mm-accent-danger)' }}>
                    {validation.map((problem) => (
                      <li key={problem}>{problem}</li>
                    ))}
                  </ul>
                )}
              </div>
              </div>
            )}
          </div>
          <div
            role="separator"
            aria-label="Resize properties panel"
            aria-orientation="vertical"
            onMouseDown={(event) => beginResize(event, 'right')}
            style={{
              position: 'absolute',
              top: 0,
              left: -6,
              bottom: 0,
              width: 12,
              cursor: 'col-resize',
              zIndex: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 2,
                height: '45%',
                borderRadius: 999,
                background: resizeDrag?.side === 'right'
                  ? 'var(--mm-accent-primary)'
                  : 'color-mix(in oklab, var(--mm-text-disabled) 50%, transparent)',
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default AdminAssetEditorPage;
