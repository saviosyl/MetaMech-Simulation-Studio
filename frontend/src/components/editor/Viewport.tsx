import React, { Suspense, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Grid, 
  Environment, 
  ContactShadows,
  TransformControls,
  useHelper,
  Text
} from '@react-three/drei';
import { EffectComposer, SSAO, ToneMapping, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { useEditorStore } from '../../store/editorStore';
import ProcessNodeComponent from '../3d/ProcessNodeComponent';
import EnvironmentAssetComponent from '../3d/EnvironmentAssetComponent';
import ActorComponent from '../3d/ActorComponent';

const Viewport: React.FC = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const {
    processNodes,
    environmentAssets,
    actors,
    selectedObjectId,
    selectedObjectType,
    transformMode,
    setSelectedObject,
    addProcessNode,
    addEnvironmentAsset,
    addActor,
    sceneSettings,
  } = useEditorStore();

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/json'));
      
      if (data.type === 'module') {
        // Calculate drop position (simplified - in a real app, you'd use raycasting)
        const position: [number, number, number] = [
          Math.random() * 10 - 5,
          0,
          Math.random() * 10 - 5,
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

  const handleObjectClick = useCallback((objectId: string, objectType: 'process' | 'environment' | 'actor') => {
    setSelectedObject(objectId, objectType);
  }, [setSelectedObject]);

  const getSelectedObject = () => {
    if (!selectedObjectId || !selectedObjectType) return null;
    
    switch (selectedObjectType) {
      case 'process':
        return processNodes.find(node => node.id === selectedObjectId);
      case 'environment':
        return environmentAssets.find(asset => asset.id === selectedObjectId);
      case 'actor':
        return actors.find(actor => actor.id === selectedObjectId);
      default:
        return null;
    }
  };

  const selectedObject = getSelectedObject();

  return (
    <div 
      className="w-full h-full relative"
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

          {/* Scene Objects */}
          <group>
            {/* Process Nodes */}
            {processNodes.map(node => (
              <ProcessNodeComponent
                key={node.id}
                node={node}
                isSelected={selectedObjectId === node.id}
                onClick={() => handleObjectClick(node.id, 'process')}
              />
            ))}

            {/* Environment Assets */}
            {environmentAssets.map(asset => (
              <EnvironmentAssetComponent
                key={asset.id}
                asset={asset}
                isSelected={selectedObjectId === asset.id}
                onClick={() => handleObjectClick(asset.id, 'environment')}
              />
            ))}

            {/* Actors */}
            {actors.map(actor => (
              <ActorComponent
                key={actor.id}
                actor={actor}
                isSelected={selectedObjectId === actor.id}
                onClick={() => handleObjectClick(actor.id, 'actor')}
              />
            ))}
          </group>

          {/* Transform Controls */}
          {selectedObject && (
            <TransformControls
              object={meshRef}
              mode={transformMode}
              size={0.8}
              showX={true}
              showY={true}
              showZ={true}
              onObjectChange={() => {
                // Handle transform changes
                // This would update the store with new position/rotation/scale
              }}
            />
          )}

          {/* Camera Controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={2}
            maxDistance={100}
            minPolarAngle={0}
            maxPolarAngle={Math.PI / 2}
          />

          {/* Post Processing */}
          <EffectComposer>
            <SSAO 
              samples={31} 
              radius={0.4} 
              intensity={1} 
              luminanceInfluence={0.6} 
              color="black"
            />
            <ToneMapping adaptive={true} />
            <SMAA />
          </EffectComposer>

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
        </Suspense>
      </Canvas>

      {/* Viewport Overlay - Instructions */}
      {processNodes.length === 0 && environmentAssets.length === 0 && actors.length === 0 && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
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
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-2 text-white text-xs space-y-1">
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