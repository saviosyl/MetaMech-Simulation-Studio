import React, { Suspense, useRef, useCallback, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  ContactShadows,
  TransformControls,
  Text
} from '@react-three/drei';
// EffectComposer removed — ToneMapping+SMAA can cause blank screens on some devices
import * as THREE from 'three';
import { useEditorStore, getConnectionPorts } from '../../store/editorStore';
import ProcessNodeComponent from '../3d/ProcessNodeComponent';
import EnvironmentAssetComponent from '../3d/EnvironmentAssetComponent';
import ActorComponent from '../3d/ActorComponent';
import SnapSystem, { checkSnap } from '../3d/SnapSystem';
import ConnectionLines from '../3d/ConnectionLine';
import SimulationOverlay from '../3d/SimulationOverlay';
import MeasurementTool from '../editor/MeasurementTool';
import CameraControls from '../3d/CameraControls';

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
    
    // Apply grid snap
    const { gridSnap, gridSnapSize } = useEditorStore.getState();
    let px = pos.x, py = pos.y, pz = pos.z;
    if (gridSnap && transformMode === 'translate') {
      px = Math.round(px / gridSnapSize) * gridSnapSize;
      py = Math.round(py / gridSnapSize) * gridSnapSize;
      pz = Math.round(pz / gridSnapSize) * gridSnapSize;
      groupRef.current.position.set(px, py, pz);
    }
    
    updateObject(id, objectType, {
      position: [px, py, pz] as [number, number, number],
      rotation: [rot.x, rot.y, rot.z] as [number, number, number],
      scale: [scl.x, scl.y, scl.z] as [number, number, number],
    });

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
      {isSelected && (
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
  } = useEditorStore();

  const handleObjectClick = useCallback((objectId: string, objectType: 'process' | 'environment' | 'actor') => {
    setSelectedObject(objectId, objectType);
  }, [setSelectedObject]);

  const handlePointerMissed = useCallback(() => {
    setSelectedObject(null, null);
  }, [setSelectedObject]);

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
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
          cellColor="#6f6f6f"
          sectionSize={10}
          sectionThickness={1}
          sectionColor="#9d4b4b"
          fadeDistance={50}
          fadeStrength={1}
          infiniteGrid
        />
      )}

      {/* Axes Helper */}
      {sceneSettings.axes.visible && (
        <axesHelper args={[sceneSettings.axes.size]} />
      )}

      {/* Contact Shadows */}
      <ContactShadows 
        position={[0, -0.01, 0]} 
        opacity={0.5} 
        scale={50} 
        blur={2.5} 
        far={10} 
      />

      {/* Ground plane for raycasting (invisible) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.02, 0]}
        onPointerMissed={handlePointerMissed}
        onClick={(e) => {
          if (measureActive) {
            e.stopPropagation();
            const p = e.point;
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
        {processNodes.filter(n => !hiddenIds.has(n.id)).map(node => (
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

        {/* Actors */}
        {actors.filter(a => !hiddenIds.has(a.id)).map(actor => (
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
        ))}
      </group>

      {/* Snap System - shows connection ports */}
      <SnapSystem />

      {/* Snap target highlight */}
      {snapTarget && (
        <mesh position={snapTarget.position}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#06b6d4" transparent opacity={0.6} />
        </mesh>
      )}

      {/* Connection Lines between connected objects */}
      <ConnectionLines />

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

      {/* Scene background color — ensures viewport is never black even if Environment HDR fails */}
      <color attach="background" args={['#1e293b']} />

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
        // Raycast from mouse to ground plane (y=0)
        const rect = (event.target as HTMLElement).getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        // Use a simple ground plane intersection
        // Camera is at roughly [10,10,10] looking at origin
        // For a proper solution we'd need the Three.js camera, but we can approximate
        // by placing at a reasonable position based on normalized coords
        const position: [number, number, number] = [
          x * 8,
          0,
          -y * 8,
        ];
        
        switch (data.category) {
          case 'process':
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
      className="w-full h-full relative"
      style={{ minHeight: '400px', background: '#1a1a2e' }}
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
        shadows
        gl={{ 
          antialias: true,
          alpha: true,
        }}
      >
        <Suspense fallback={null}>
          <SceneContent orbitRef={orbitRef} />
        </Suspense>
      </Canvas>

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
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white text-xs space-y-1" style={{ zIndex: 10 }}>
        <div>Objects: {processNodes.length + environmentAssets.length + actors.length}</div>
        <div>Mode: {transformMode.charAt(0).toUpperCase() + transformMode.slice(1)}</div>
        {selectedObject && (
          <div>Selected: {selectedObject.name}</div>
        )}
      </div>
    </div>
  );
};

export default Viewport;
