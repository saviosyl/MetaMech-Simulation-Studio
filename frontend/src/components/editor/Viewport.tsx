import React, { Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  ContactShadows,
  TransformControls,
  Text,
  GizmoHelper,
  GizmoViewport,
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
              // Snap position
              updateObject(id, objectType, { position: currentSnapTarget.position });
              if (groupRef.current) {
                groupRef.current.position.set(...currentSnapTarget.position);
              }
              // Create edge - figure out direction
              const dragPorts = getConnectionPorts(node.type, node.parameters);
              const snap = checkSnap(
                { ...node, position: currentSnapTarget.position },
                processNodes.filter(n => n.id !== id),
                edges
              );
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

const SceneContent: React.FC<{ orbitRef: React.RefObject<any> }> = ({ orbitRef }) => {
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
    themeMode,
    activeTool,
  } = useEditorStore();

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
        intensity={1.2}
        color="#fff5e6"
        castShadow
        shadow-mapSize-width={isMobileSafari ? 1024 : 4096}
        shadow-mapSize-height={isMobileSafari ? 1024 : 4096}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.001}
      />
      {/* Fill light — cool blue from opposite side */}
      <directionalLight
        position={[-8, 8, -5]}
        intensity={0.3}
        color="#c8d8f0"
      />
      {/* Rim light — subtle backlight for depth */}
      <directionalLight
        position={[0, 3, -10]}
        intensity={0.15}
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
          cellSize={1}
          cellThickness={0.5}
          cellColor={themeMode === 'light' ? '#b0b0b0' : '#6f6f6f'}
          sectionSize={10}
          sectionThickness={1}
          sectionColor={themeMode === 'light' ? '#8a8a8a' : '#9d4b4b'}
          fadeDistance={50}
          fadeStrength={1}
          infiniteGrid
        />
      )}

      {/* Axes Helper */}
      {sceneSettings.axes.visible && (
        <axesHelper args={[sceneSettings.axes.size]} />
      )}

      {/* Contact Shadows — premium ground contact effect */}
      {!isMobileSafari && (
        <ContactShadows 
          position={[0, -0.01, 0]} 
          opacity={0.6} 
          scale={60} 
          blur={2.0} 
          far={12} 
          resolution={isMobileSafari ? 256 : 512}
          color="#1a1a2e"
        />
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
      <CameraControls orbitRef={orbitRef} />

      {/* Camera Controls */}
      <OrbitControls
        ref={orbitRef}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={100}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2}
      />

      {/* Scene background color — adapts to theme */}
      <color attach="background" args={[themeMode === 'light' ? '#e0e4ea' : '#1e293b']} />

      {/* Loading Placeholder */}
      {processNodes.length === 0 && environmentAssets.length === 0 && actors.length === 0 && (
        <group position={[0, 2, 0]}>
          <Text
            fontSize={1}
            color="#6b7280"
            anchorX="center"
            anchorY="middle"
          >
            Drag modules from the library to get started
          </Text>
        </group>
      )}
    </>
  );
};

const Viewport: React.FC = () => {
  const orbitRef = useRef<any>(null);
  
  const {
    processNodes,
    environmentAssets,
    actors,
    selectedObjectId,
    selectedObjectType,
    transformMode,
    addProcessNode,
    addEnvironmentAsset,
    addActor,
  } = useEditorStore();

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      
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
        
        switch (data.category) {
          case 'process':
          case 'robots':
          case 'pallets':
          case 'fmcg':
          case 'medical':
            addProcessNode(data.moduleId, position);
            break;
          case 'environment':
            addEnvironmentAsset(data.moduleId, position);
            break;
          case 'actors':
            addActor(data.moduleId, position);
            break;
        }
      }
    } catch (error) {
      console.error('Failed to handle drop:', error);
    }
  }, [addProcessNode, addEnvironmentAsset, addActor]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
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

  return (
    <div 
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--mm-bg-viewport)' }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Canvas
        camera={{
          position: [10, 10, 10],
          fov: 50,
          near: 0.1,
          far: 1000,
        }}
        dpr={[1, 2]}
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
        <CameraCapture />
        <Suspense fallback={null}>
          <SceneContent orbitRef={orbitRef} />
        </Suspense>
        {/* 3D UCS Orientation Gizmo — bottom left */}
        <GizmoHelper alignment="bottom-left" margin={[80, 120]}>
          <GizmoViewport
            axisColors={['#ef4444', '#22c55e', '#3b82f6']}
            labelColor="white"
          />
        </GizmoHelper>
      </Canvas>

      {/* Viewport Toolbar */}
      <ViewportToolbar />

      {/* Viewport Overlay - Instructions */}
      {processNodes.length === 0 && environmentAssets.length === 0 && actors.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 10 }}>
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-8 text-white text-center max-w-md">
            <h3 className="text-xl font-semibold mb-4">Welcome to MetaMech Studio</h3>
            <p className="text-sm opacity-90 mb-4">
              Start building your industrial simulation by dragging modules from the library panel.
            </p>
            <div className="text-xs opacity-75 space-y-1">
              <div>• Use W/E/R keys to switch transform modes</div>
              <div>• Right-click to orbit, scroll to zoom</div>
              <div>• Select objects to edit their properties</div>
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
