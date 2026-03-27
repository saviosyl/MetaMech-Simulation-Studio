import React, { Suspense, useRef, useCallback, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  ContactShadows,
  TransformControls,
  GizmoHelper,
  GizmoViewport,
  PerspectiveCamera,
  OrthographicCamera,
  MeshReflectorMaterial,
} from '@react-three/drei';
// EffectComposer removed — ToneMapping+SMAA can cause blank screens on some devices
import * as THREE from 'three';

// Module-level camera ref for drop raycast (accessible outside Canvas)
let _threeCamera: THREE.Camera | null = null;
let _canvasSize: { width: number; height: number } = { width: 1, height: 1 };

/** Tiny component inside Canvas that captures the camera */
const CameraCapture: React.FC = () => {
  const { camera, size } = useThree();
  _threeCamera = camera;
  _canvasSize = size;
  return null;
};

/**
 * Pause expensive shadow-map refresh while user is actively navigating camera.
 * Re-enable and refresh once interaction ends.
 */
const InteractionPerformanceTuner: React.FC<{ isNavigating: boolean; isExportRendering: boolean }> = ({ isNavigating, isExportRendering }) => {
  const { gl } = useThree();

  useEffect(() => {
    if (!gl.shadowMap) return;
    if (isExportRendering) {
      gl.shadowMap.autoUpdate = true;
      gl.shadowMap.needsUpdate = true;
      return;
    }
    if (isNavigating) {
      gl.shadowMap.autoUpdate = false;
      return;
    }
    gl.shadowMap.autoUpdate = true;
    gl.shadowMap.needsUpdate = true;
  }, [gl, isNavigating, isExportRendering]);

  return null;
};

/**
 * During capture/export, temporarily push renderer toward presentation quality.
 * This only runs while recording to preserve normal interactive performance.
 */
const ExportRendererTuner: React.FC<{ active: boolean; preset: VideoQualityPreset }> = ({ active, preset }) => {
  const { gl } = useThree();
  const previousRef = useRef<{
    toneMapping: THREE.ToneMapping;
    toneMappingExposure: number;
    shadowEnabled: boolean;
    shadowType: THREE.ShadowMapType;
    outputColorSpace: THREE.ColorSpace;
  } | null>(null);

  useEffect(() => {
    if (!active) {
      if (previousRef.current) {
        gl.toneMapping = previousRef.current.toneMapping;
        gl.toneMappingExposure = previousRef.current.toneMappingExposure;
        gl.shadowMap.enabled = previousRef.current.shadowEnabled;
        gl.shadowMap.type = previousRef.current.shadowType;
        (gl as any).outputColorSpace = previousRef.current.outputColorSpace;
        gl.shadowMap.needsUpdate = true;
        previousRef.current = null;
      }
      return;
    }

    if (!previousRef.current) {
      previousRef.current = {
        toneMapping: gl.toneMapping,
        toneMappingExposure: gl.toneMappingExposure,
        shadowEnabled: gl.shadowMap.enabled,
        shadowType: gl.shadowMap.type,
        outputColorSpace: (gl as any).outputColorSpace ?? THREE.SRGBColorSpace,
      };
    }

    const exportPreset = VIDEO_CAPTURE_PRESETS[preset];
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = exportPreset.toneMappingExposure;
    gl.shadowMap.enabled = true;
    gl.shadowMap.type = preset === 'ultra' ? THREE.VSMShadowMap : THREE.PCFSoftShadowMap;
    (gl as any).outputColorSpace = THREE.SRGBColorSpace;
    gl.shadowMap.needsUpdate = true;

    return () => {
      if (!previousRef.current) return;
      gl.toneMapping = previousRef.current.toneMapping;
      gl.toneMappingExposure = previousRef.current.toneMappingExposure;
      gl.shadowMap.enabled = previousRef.current.shadowEnabled;
      gl.shadowMap.type = previousRef.current.shadowType;
      (gl as any).outputColorSpace = previousRef.current.outputColorSpace;
      gl.shadowMap.needsUpdate = true;
      previousRef.current = null;
    };
  }, [active, preset, gl]);

  return null;
};

/** Raycast from screen coordinates to ground plane (y=0) */
function raycastToGround(clientX: number, clientY: number, canvasRect: DOMRect): [number, number, number] | null {
  if (!_threeCamera) return null;
  const ndcX = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
  const ndcY = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), _threeCamera);
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0); // y=0 plane
  const intersection = new THREE.Vector3();
  const hit = raycaster.ray.intersectPlane(groundPlane, intersection);
  if (!hit) return null;
  return [intersection.x, 0, intersection.z];
}
import { useEditorStore, getConnectionPorts } from '../../store/editorStore';
import ProcessNodeComponent from '../3d/ProcessNodeComponent';
import EnvironmentAssetComponent from '../3d/EnvironmentAssetComponent';
import ActorComponent from '../3d/ActorComponent';
import SnapSystem, { checkSnap } from '../3d/SnapSystem';
import AccessorySnapPreview from '../3d/AccessorySnapPreview';
import { isConveyorType, isAccessoryType, remountAccessory } from '../../lib/accessorySnap';
import ConnectionLines from '../3d/ConnectionLine';
import SimulationOverlay from '../3d/SimulationOverlay';
import MeasurementTool from '../editor/MeasurementTool';
import CameraControls from '../3d/CameraControls';
import CustomModelRenderer from '../3d/CustomModelRenderer';
import PathRenderer from '../3d/PathRenderer';
import CameraPathPlayer from '../3d/CameraPathPlayer';
import ViewportToolbar from '../editor/ViewportToolbar';
import { VIDEO_CAPTURE_PRESETS, VideoQualityPreset } from '../../lib/videoExportPresets';
import PortDirectionDebug from '../3d/PortDirectionDebug';

const AXIS_X_COLOR = '#ef4444';
const AXIS_Y_COLOR = '#22c55e';
const AXIS_Z_COLOR = '#3b82f6';

const ZUpAxisHelper: React.FC<{ size: number }> = ({ size }) => (
  <group>
    <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), size, AXIS_X_COLOR]} />
    <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), size, AXIS_Y_COLOR]} />
    <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), size, AXIS_Z_COLOR]} />
  </group>
);

// Wrapper that attaches TransformControls to the selected object
const DraggableObject: React.FC<{
  children: React.ReactNode;
  id: string;
  objectType: 'process' | 'environment' | 'actor';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  isSelected: boolean;
  orbitRef: React.RefObject<any>;
}> = ({ children, id, objectType, position, rotation, scale, isSelected, orbitRef }) => {
  const groupRef = useRef<THREE.Group>(null!);
  const transformRef = useRef<any>(null);
  const {
    transformMode,
    activeTool,
    updateObject,
    processNodes,
    edges,
    setIsDragging,
    setDragNodeId,
    setSnapTarget,
    addEdge,
  } = useEditorStore();

  useEffect(() => {
    if (!isSelected || !transformRef.current) return;
    const controls = transformRef.current;

    const onDraggingChanged = (event: any) => {
      if (orbitRef.current) {
        orbitRef.current.enabled = !event.value;
      }

      if (event.value) {
        // Started dragging
        setIsDragging(true);
        setDragNodeId(id);
      } else {
        // Stopped dragging - check snap
        if (objectType === 'process') {
          const node = processNodes.find(n => n.id === id);
          if (node) {
            const currentSnapTarget = useEditorStore.getState().snapTarget;
            if (currentSnapTarget) {
              // Re-evaluate snap at drop using the snapped position so we can
              // apply spiral inline orientation and then create the edge.
              const snap = checkSnap(
                { ...node, position: currentSnapTarget.position },
                processNodes.filter(n => n.id !== id),
                edges
              );

              const nextPosition = snap?.snapPosition ?? currentSnapTarget.position;
              const nextRotation = snap?.snapRotation ?? node.rotation;
              const nextParameters = snap?.snapParameters
                ? { ...node.parameters, ...snap.snapParameters }
                : node.parameters;
              updateObject(id, objectType, {
                position: nextPosition,
                rotation: nextRotation,
                parameters: nextParameters,
              });
              if (groupRef.current) {
                groupRef.current.position.set(...nextPosition);
                groupRef.current.rotation.set(...nextRotation);
              }

              // Create edge - figure out direction
              const dragPorts = getConnectionPorts(node.type, nextParameters);
              // Use the stored snap info to create connection
              if (snap) {
                const dragPort = dragPorts.find(p => p.id === snap.dragPortId);
                if (dragPort) {
                  if (dragPort.type === 'output') {
                    addEdge(id, snap.dragPortId, snap.targetNodeId, snap.targetPortId);
                  } else {
                    addEdge(snap.targetNodeId, snap.targetPortId, id, snap.dragPortId);
                  }
                }
              }
            }
          }
        }
        setIsDragging(false);
        setDragNodeId(null);
        setSnapTarget(null);
      }
    };

    controls.addEventListener('dragging-changed', onDraggingChanged);
    return () => {
      controls.removeEventListener('dragging-changed', onDraggingChanged);
    };
  }, [isSelected, id, objectType, processNodes, edges]);

  const handleObjectChange = useCallback(() => {
    if (!groupRef.current) return;
    const pos = groupRef.current.position;
    const rot = groupRef.current.rotation;
    const scl = groupRef.current.scale;
    
    // Force Y=0 (objects stay on ground) and apply grid snap
    const { gridSnap, gridSnapSize } = useEditorStore.getState();
    let px = pos.x, pz = pos.z;
    if (gridSnap && transformMode === 'translate') {
      px = Math.round(px / gridSnapSize) * gridSnapSize;
      pz = Math.round(pz / gridSnapSize) * gridSnapSize;
    }
    // Always keep Y=0 during translate
    if (transformMode === 'translate') {
      groupRef.current.position.set(px, 0, pz);
    }
    
    updateObject(id, objectType, {
      position: [px, 0, pz] as [number, number, number],
      rotation: [rot.x, rot.y, rot.z] as [number, number, number],
      scale: [scl.x, scl.y, scl.z] as [number, number, number],
    });

    // Conveyor-follow: when a conveyor moves, update mounted accessories
    if (objectType === 'process') {
      const state = useEditorStore.getState();
      const node = state.processNodes.find(n => n.id === id);
      if (node && isConveyorType(node.type)) {
        const updatedConveyor = { ...node, position: [px, 0, pz] as [number, number, number], rotation: [rot.x, rot.y, rot.z] as [number, number, number] };
        // Find all accessories mounted on this conveyor
        for (const acc of state.processNodes) {
          if (acc.parameters?.parentConveyorId === id && isAccessoryType(acc.type)) {
            const mountData = {
              parentConveyorId: id,
              mountPosition: acc.parameters.mountPosition ?? 0.5,
              mountSide: acc.parameters.mountSide ?? 'center',
              lateralOffset: acc.parameters.lateralOffset ?? 0,
            };
            const result = remountAccessory(mountData, updatedConveyor, acc.type);
            if (result) {
              updateObject(acc.id, 'process', { position: result.position, rotation: result.rotation });
            }
          }
        }
      }
    }

    // Check snap during drag for process nodes
    if (objectType === 'process') {
      const node = useEditorStore.getState().processNodes.find(n => n.id === id);
      if (node) {
        const updatedNode = { ...node, position: [pos.x, pos.y, pos.z] as [number, number, number] };
        const snap = checkSnap(
          updatedNode,
          useEditorStore.getState().processNodes.filter(n => n.id !== id),
          useEditorStore.getState().edges
        );
        if (snap) {
          setSnapTarget({ nodeId: snap.targetNodeId, portId: snap.targetPortId, position: snap.snapPosition });
        } else {
          setSnapTarget(null);
        }
      }
    }
  }, [id, objectType, updateObject, setSnapTarget]);

  return (
    <>
      <group
        ref={groupRef}
        position={position}
        rotation={rotation}
        scale={scale}
      >
        {children}
      </group>
      {isSelected && (activeTool === 'move' || activeTool === 'rotate' || activeTool === 'scale' || activeTool === 'snap-move') && (
        <TransformControls
          ref={transformRef}
          object={groupRef.current || undefined}
          mode={transformMode}
          size={0.8}
          onObjectChange={handleObjectChange}
        />
      )}
    </>
  );
};

// Inner scene component that has access to Three.js context
const OVERLAY_HIDDEN_TYPES = new Set(['source', 'sink']);

// Detect mobile/iPad Safari for performance optimizations
const isMobileSafari = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) || 
  (typeof navigator !== 'undefined' && navigator.userAgent.includes('Macintosh') && 'ontouchend' in document);

const SceneContent: React.FC<{
  orbitRef: React.RefObject<any>;
  isNavigating: boolean;
  onNavigationChange: (moving: boolean) => void;
}> = ({ orbitRef, isNavigating, onNavigationChange }) => {
  const {
    processNodes,
    environmentAssets,
    actors,
    selectedObjectId,
    setSelectedObject,
    sceneSettings,
    snapTarget,
    hiddenIds,
    measureActive,
    addMeasurePoint,
    overlaysHidden,
    directionDebugVisible,
    themeMode,
    activeTool,
    isExportRendering,
    captureQualityPreset,
  } = useEditorStore();

  const exportPreset = VIDEO_CAPTURE_PRESETS[captureQualityPreset];
  const keyShadowMapSize = isExportRendering ? exportPreset.shadowMapSize : (isMobileSafari ? 1024 : 4096);
  const contactShadowRes = isExportRendering ? exportPreset.contactShadowResolution : (isMobileSafari ? 256 : 512);
  const contactShadowBlur = isExportRendering ? exportPreset.contactShadowBlur : 2.0;
  const minorCellSize = Math.max(
    0.25,
    Math.min(1, sceneSettings.grid.size / Math.max(sceneSettings.grid.divisions, 1)),
  );
  const majorSectionSize = minorCellSize * 4;
  const gridPalette = themeMode === 'light'
    ? {
        cell: '#bcc8d6',
        section: '#8fa0b5',
      }
    : {
        // Match editor preview grid style while staying subtle in runtime.
        cell: '#5f6776',
        section: '#334155',
      };

  // Disable orbit rotation when a 3D object is selected AND a manipulation tool is active
  // Click empty space to deselect → orbit re-enables
  useEffect(() => {
    if (!orbitRef.current) return;
    const toolsBlockingRotate = ['move', 'rotate', 'scale', 'mate', 'snap-move', 'path-draw'];
    const shouldBlock = selectedObjectId !== null && toolsBlockingRotate.includes(activeTool);
    orbitRef.current.enableRotate = !shouldBlock;
  }, [activeTool, selectedObjectId, orbitRef]);

  const handleObjectClick = useCallback((objectId: string, objectType: 'process' | 'environment' | 'actor') => {
    setSelectedObject(objectId, objectType);
  }, [setSelectedObject]);

  const handlePointerMissed = useCallback(() => {
    setSelectedObject(null, null);
  }, [setSelectedObject]);

  return (
    <>
      {/* Enhanced Lighting — premium industrial look */}
      <ambientLight intensity={0.35} color="#e8edf5" />
      {/* Key light — warm industrial */}
      <directionalLight
        position={[12, 15, 8]}
        intensity={isExportRendering ? 1.35 : 1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={keyShadowMapSize}
        shadow-mapSize-height={keyShadowMapSize}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={isExportRendering ? -0.00055 : -0.001}
      />
      {/* Fill light — cool blue from opposite side */}
      <directionalLight
        position={[-8, 8, -5]}
        intensity={isExportRendering ? 0.42 : 0.3}
        color="#c8d8f0"
      />
      {/* Rim light — subtle backlight for depth */}
      <directionalLight
        position={[0, 3, -10]}
        intensity={isExportRendering ? 0.22 : 0.15}
        color="#f0f0ff"
      />

      {/* Environment */}
      {sceneSettings.environment !== 'transparent' && (
        <Environment 
          preset={
            sceneSettings.environment === 'factory' ? 'warehouse' :
            sceneSettings.environment === 'studio-white' ? 'studio' :
            sceneSettings.environment === 'dark-showroom' ? 'night' : 'studio'
          } 
        />
      )}

      {/* Grid */}
      {sceneSettings.grid.visible && (
        <Grid
          position={[0, 0, 0]}
          args={[sceneSettings.grid.size, sceneSettings.grid.divisions]}
          cellSize={minorCellSize}
          cellThickness={0.36}
          cellColor={gridPalette.cell}
          sectionSize={majorSectionSize}
          sectionThickness={0.95}
          sectionColor={gridPalette.section}
          fadeDistance={120}
          fadeStrength={0.85}
          infiniteGrid
        />
      )}

      {/* Axes helper (app convention): X red, Y green, Z blue with Z shown as vertical. */}
      {sceneSettings.axes.visible && <ZUpAxisHelper size={sceneSettings.axes.size} />}

      {/* Contact Shadows — premium ground contact effect */}
      {!isMobileSafari && (!isNavigating || isExportRendering) && (
        <ContactShadows 
          position={[0, -0.01, 0]} 
          opacity={isExportRendering ? 0.7 : 0.6} 
          scale={60} 
          blur={contactShadowBlur} 
          far={12} 
          resolution={contactShadowRes}
          color="#1a1a2e"
        />
      )}

      {/* Export-only reflective floor for presentation-style video output */}
      {isExportRendering && exportPreset.reflectionQuality !== 'off' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
          <planeGeometry args={[120, 120]} />
          <MeshReflectorMaterial
            mirror={0.35}
            resolution={exportPreset.reflectionQuality === 'high' ? 1024 : 512}
            blur={exportPreset.reflectionQuality === 'high' ? [420, 120] : [260, 70]}
            mixBlur={1}
            mixStrength={exportPreset.reflectionQuality === 'high' ? 0.38 : 0.24}
            roughness={0.5}
            depthScale={0.008}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.5}
            color={themeMode === 'light' ? '#e6ebf2' : '#0f172a'}
            metalness={0.3}
          />
        </mesh>
      )}

      {/* Ground plane for raycasting (invisible) — handles path drawing + measurement clicks */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onPointerMissed={() => {
          // Don't deselect when drawing a path
          const state = useEditorStore.getState();
          if (state.drawingPathId || state.activeTool === 'path-draw') return;
          setSelectedObject(null, null);
        }}
        onClick={(e) => {
          e.stopPropagation();
          const p = e.point;
          // Path drawing mode
          const state = useEditorStore.getState();
          if (state.drawingPathId) {
            state.addPathPoint(state.drawingPathId, [
              Math.round(p.x * 100) / 100,
              0,
              Math.round(p.z * 100) / 100,
            ]);
            return;
          }
          // Measurement mode
          if (measureActive) {
            addMeasurePoint([p.x, p.y, p.z]);
          }
        }}
        visible={false}
      >
        <planeGeometry args={[200, 200]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Scene Objects - wrapped in DraggableObject */}
      <group>
        {/* Process Nodes */}
        {processNodes.filter(n => !hiddenIds.has(n.id) && !(overlaysHidden && OVERLAY_HIDDEN_TYPES.has(n.type))).map(node => (
          <DraggableObject
            key={node.id}
            id={node.id}
            objectType="process"
            position={node.position}
            rotation={node.rotation}
            scale={node.scale}
            isSelected={selectedObjectId === node.id}
            orbitRef={orbitRef}
          >
            <ProcessNodeComponent
              node={{ ...node, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }}
              isSelected={selectedObjectId === node.id}
              onClick={() => handleObjectClick(node.id, 'process')}
            />
          </DraggableObject>
        ))}

        {/* Environment Assets */}
        {environmentAssets.filter(a => !hiddenIds.has(a.id)).map(asset => (
          <DraggableObject
            key={asset.id}
            id={asset.id}
            objectType="environment"
            position={asset.position}
            rotation={asset.rotation}
            scale={asset.scale}
            isSelected={selectedObjectId === asset.id}
            orbitRef={orbitRef}
          >
            <EnvironmentAssetComponent
              asset={{ ...asset, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }}
              isSelected={selectedObjectId === asset.id}
              onClick={() => handleObjectClick(asset.id, 'environment')}
            />
          </DraggableObject>
        ))}

        {/* Actors — during simulation with path, render without DraggableObject so path anim controls position directly */}
        {actors.filter(a => !hiddenIds.has(a.id)).map(actor => {
          const hasPathAndPlaying = useEditorStore.getState().isPlaying && actor.parameters?.pathId;
          if (hasPathAndPlaying) {
            // Path animation mode: ActorComponent controls its own world position
            return (
              <ActorComponent
                key={actor.id}
                actor={actor}
                isSelected={selectedObjectId === actor.id}
                onClick={() => handleObjectClick(actor.id, 'actor')}
              />
            );
          }
          // Normal editor mode: wrapped in DraggableObject for transform gizmos
          return (
            <DraggableObject
              key={actor.id}
              id={actor.id}
              objectType="actor"
              position={actor.position}
              rotation={actor.rotation}
              scale={actor.scale}
              isSelected={selectedObjectId === actor.id}
              orbitRef={orbitRef}
            >
              <ActorComponent
                actor={{ ...actor, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }}
                isSelected={selectedObjectId === actor.id}
                onClick={() => handleObjectClick(actor.id, 'actor')}
              />
            </DraggableObject>
          );
        })}
      </group>

      {/* Snap System - shows connection ports (hidden in clean view) */}
      {!overlaysHidden && <SnapSystem />}
      {!overlaysHidden && <AccessorySnapPreview />}

      {/* Snap target highlight */}
      {!overlaysHidden && snapTarget && (
        <mesh position={snapTarget.position}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Connection Lines between connected objects (hidden in clean view) */}
      {!overlaysHidden && <ConnectionLines />}
      {!overlaysHidden && directionDebugVisible && <PortDirectionDebug />}

      {/* Custom Imported Models */}
      <CustomModelRenderer orbitRef={orbitRef} />

      {/* Actor Paths */}
      <PathRenderer />
      <CameraPathPlayer />

      {/* Simulation Overlay */}
      <SimulationOverlay />

      {/* Measurement Tool */}
      <MeasurementTool />

      {/* Camera Animation Controls */}
      <CameraControls orbitRef={orbitRef} suspendSpaceMouse={isNavigating} />

      {/* Camera Controls */}
      <OrbitControls
        ref={orbitRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        enableDamping={true}
        dampingFactor={0.08}
        rotateSpeed={0.9}
        zoomSpeed={0.95}
        panSpeed={0.9}
        minDistance={2}
        maxDistance={100}
        minPolarAngle={0}
        maxPolarAngle={Math.PI - 0.001}
        onStart={() => onNavigationChange(true)}
        onEnd={() => onNavigationChange(false)}
      />

      {/* Scene background color — adapts to theme */}
      <color attach="background" args={[themeMode === 'light' ? '#e7edf4' : '#1d2635']} />

      {/* Empty-scene 3D text intentionally removed for cleaner premium workspace */}
    </>
  );
};

const Viewport: React.FC = () => {
  const orbitRef = useRef<any>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [hasPlacedModule, setHasPlacedModule] = useState(false);
  
  const {
    processNodes,
    environmentAssets,
    actors,
    selectedObjectId,
    selectedObjectType,
    transformMode,
    cameraMode,
    isExportRendering,
    captureQualityPreset,
    addProcessNode,
    addEnvironmentAsset,
    addActor,
  } = useEditorStore();

  const exportPreset = VIDEO_CAPTURE_PRESETS[captureQualityPreset];
  const dynamicDprMax = isExportRendering ? Math.max(2, Math.min(3, exportPreset.targetDpr)) : 2;

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    try {
      const rawData = event.dataTransfer.getData('application/json');
      if (!rawData) {
        // Defensive guard: ignore external file/link drops in viewport.
        return;
      }
      const data = JSON.parse(rawData);
      if (!data || data.type !== 'module' || typeof data.moduleId !== 'string' || typeof data.category !== 'string') {
        return;
      }
      
      if (data.type === 'module') {
        // Proper raycast from mouse to ground plane (y=0) using Three.js camera
        const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
        const rayHit = raycastToGround(event.clientX, event.clientY, rect);
        
        // Fallback to simple approximation if camera not ready
        const position: [number, number, number] = rayHit || [
          (((event.clientX - rect.left) / rect.width) * 2 - 1) * 8,
          0,
          -(((event.clientY - rect.top) / rect.height) * 2 + 1) * 8,
        ];
        
        let addedModule = false;
        switch (data.category) {
          case 'process':
          case 'modular':
          case 'robots':
          case 'pallets':
          case 'fmcg':
          case 'medical':
            addProcessNode(data.moduleId, position);
            addedModule = true;
            break;
          case 'environment':
            addEnvironmentAsset(data.moduleId, position);
            addedModule = true;
            break;
          case 'actors':
            addActor(data.moduleId, position);
            addedModule = true;
            break;
        }
        if (addedModule) {
          setHasPlacedModule(true);
        }
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  }, [addProcessNode, addEnvironmentAsset, addActor]);

  const handleDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const hasModulePayload = !!event.dataTransfer.getData('application/json');
    event.dataTransfer.dropEffect = hasModulePayload ? 'copy' : 'none';
  }, []);

  const getSelectedObject = () => {
    if (!selectedObjectId || !selectedObjectType) return null;
    switch (selectedObjectType) {
      case 'process': return processNodes.find(node => node.id === selectedObjectId);
      case 'environment': return environmentAssets.find(asset => asset.id === selectedObjectId);
      case 'actor': return actors.find(actor => actor.id === selectedObjectId);
      default: return null;
    }
  };

  const selectedObject = getSelectedObject();
  const isSceneEmpty = processNodes.length === 0 && environmentAssets.length === 0 && actors.length === 0;

  useEffect(() => {
    if (!hasPlacedModule && !isSceneEmpty) {
      setHasPlacedModule(true);
    }
  }, [hasPlacedModule, isSceneEmpty]);

  return (
    <div 
      data-tour="viewport-center"
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--mm-bg-viewport)' }}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
    >
      <Canvas
        dpr={[1, dynamicDprMax]}
        shadows
        gl={{ 
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        frameloop="always"
      >
        {cameraMode === 'orthographic' ? (
          <OrthographicCamera makeDefault position={[10, 10, 10]} zoom={42} near={0.1} far={1000} />
        ) : (
          <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} near={0.1} far={1000} />
        )}
        <CameraCapture />
        <ExportRendererTuner active={isExportRendering} preset={captureQualityPreset} />
        <InteractionPerformanceTuner isNavigating={isNavigating} isExportRendering={isExportRendering} />
        <Suspense fallback={null}>
          <SceneContent orbitRef={orbitRef} isNavigating={isNavigating} onNavigationChange={setIsNavigating} />
        </Suspense>
        {/* 3D orientation gizmo */}
        <GizmoHelper alignment="bottom-right" margin={[78, 88]}>
          <GizmoViewport
            axisColors={[AXIS_X_COLOR, AXIS_Y_COLOR, AXIS_Z_COLOR]}
            labelColor="#f8fafc"
          />
        </GizmoHelper>
      </Canvas>

      {/* Viewport Toolbar */}
      <ViewportToolbar />
      <OrientationPad />

      {/* Viewport Overlay - Lightweight empty-scene hint */}
      {isSceneEmpty && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          {!hasPlacedModule && (
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'clamp(340px, 44vw, 620px)',
                aspectRatio: '2.8 / 1',
                opacity: 0.18,
                mixBlendMode: 'screen',
                overflow: 'hidden',
              }}
            >
              <img
                src="/simulation-studio-logo.png"
                alt="Simulation Studio"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 45%',
                  filter: 'saturate(0.95)',
                }}
              />
            </div>
          )}
          <div
            style={{
              position: 'absolute',
              left: 16,
              top: 84,
              maxWidth: 300,
              borderRadius: 12,
              padding: '10px 12px',
              background: 'color-mix(in oklab, var(--mm-bg-surface) 88%, transparent)',
              border: '1px solid var(--mm-border-subtle)',
              boxShadow: 'var(--mm-shadow-sm)',
              color: 'var(--mm-text-secondary)',
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--mm-text-primary)', marginBottom: 4 }}>
              Start your layout
            </div>
            <div style={{ fontSize: 11, lineHeight: 1.45 }}>
              Drag modules from the library to begin. Use right-drag to orbit and scroll to zoom.
            </div>
          </div>
        </div>
      )}

      {/* Viewport Info */}
      <ViewportInfo
        objectCount={processNodes.length + environmentAssets.length + actors.length}
        transformMode={transformMode}
        selectedName={selectedObject?.name}
      />
    </div>
  );
};

const OrientationPad: React.FC = () => {
  const setCameraView = useEditorStore(s => s.setCameraView);
  const buttons: { id: 'top' | 'front' | 'right' | 'left' | 'back' | 'perspective'; label: string; tooltip: string }[] = [
    { id: 'top', label: 'Top', tooltip: 'Top normal view (flat to screen)' },
    { id: 'front', label: 'Front', tooltip: 'Front normal view (flat to screen)' },
    { id: 'right', label: 'Right', tooltip: 'Right normal view (flat to screen)' },
    { id: 'left', label: 'Left', tooltip: 'Left normal view (flat to screen)' },
    { id: 'back', label: 'Back', tooltip: 'Back normal view (flat to screen)' },
    { id: 'perspective', label: 'Iso', tooltip: 'Return to perspective/isometric 3D view' },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        top: 'clamp(34px, 4.4vw, 44px)',
        right: 10,
        zIndex: 30,
        display: 'grid',
        gridTemplateColumns: 'repeat(2, auto)',
        gap: 3,
        padding: 5,
        borderRadius: 12,
        background: 'var(--mm-bg-toolbar-secondary)',
        border: '1px solid var(--mm-border-subtle)',
        backdropFilter: 'blur(8px)',
        boxShadow: 'var(--mm-shadow-sm)',
      }}
      title="Orientation quick views"
    >
      {buttons.map((b) => (
        <button
          key={b.id}
          onClick={() => setCameraView(b.id)}
          title={b.tooltip}
          style={{
            minWidth: 42,
            height: 26,
            padding: '0 8px',
            borderRadius: 8,
            border: '1px solid var(--mm-border-subtle)',
            background: 'var(--mm-bg-panel)',
            color: 'var(--mm-text-secondary)',
            cursor: 'pointer',
            fontSize: 10,
            fontWeight: 600,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: '0.01em',
            transition: 'all 0.15s',
          }}
        >
          {b.label}
        </button>
      ))}
    </div>
  );
};

const ViewportInfo: React.FC<{ objectCount: number; transformMode: string; selectedName?: string }> = ({ objectCount, transformMode, selectedName }) => {
  const gridSnap = useEditorStore(s => s.gridSnap);
  const gridSnapSize = useEditorStore(s => s.gridSnapSize);
  return (
    <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white text-xs space-y-1" style={{ zIndex: 10 }}>
      <div>Objects: {objectCount}</div>
      <div>Mode: {transformMode.charAt(0).toUpperCase() + transformMode.slice(1)}</div>
      <div>Grid: 1000 mm</div>
      {gridSnap && <div>Snap: {gridSnapSize * 1000} mm</div>}
      {selectedName && (
        <div>Selected: {selectedName}</div>
      )}
    </div>
  );
};

export default Viewport;
