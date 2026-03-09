import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '../../store/editorStore';

const CameraControls: React.FC<{ orbitRef: React.RefObject<any> }> = ({ orbitRef }) => {
  const { camera, set: setThree, size } = useThree();
  const {
    cameraTargetPosition,
    cameraTargetLookAt,
    focusRequest,
    selectedObjectId,
    processNodes,
    environmentAssets,
    actors,
    cameraMode,
  } = useEditorStore();

  // Switch between perspective and orthographic camera
  const orthoRef = useRef<THREE.OrthographicCamera | null>(null);
  const perspRef = useRef<THREE.PerspectiveCamera | null>(null);

  useEffect(() => {
    if (cameraMode === 'orthographic') {
      if (!orthoRef.current) {
        const aspect = size.width / size.height;
        const frustum = 15;
        orthoRef.current = new THREE.OrthographicCamera(
          -frustum * aspect, frustum * aspect, frustum, -frustum, 0.1, 200
        );
      }
      // Copy current camera position/rotation to ortho cam
      orthoRef.current.position.copy(camera.position);
      orthoRef.current.rotation.copy(camera.rotation);
      orthoRef.current.zoom = 1;
      orthoRef.current.updateProjectionMatrix();
      setThree({ camera: orthoRef.current });
    } else {
      if (camera instanceof THREE.OrthographicCamera && perspRef.current) {
        setThree({ camera: perspRef.current });
      } else if (!(camera instanceof THREE.OrthographicCamera)) {
        perspRef.current = camera as THREE.PerspectiveCamera;
      }
    }
  }, [cameraMode]);

  const animating = useRef(false);
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const lastFocusRequest = useRef(0);

  // Handle camera presets
  useEffect(() => {
    if (cameraTargetPosition && cameraTargetLookAt) {
      targetPos.current.set(...cameraTargetPosition);
      targetLookAt.current.set(...cameraTargetLookAt);
      animating.current = true;
    }
  }, [cameraTargetPosition, cameraTargetLookAt]);

  // Handle focus request
  useEffect(() => {
    if (focusRequest <= lastFocusRequest.current) return;
    lastFocusRequest.current = focusRequest;

    // Find selected object position
    let obj: any = null;
    if (selectedObjectId) {
      obj = processNodes.find(n => n.id === selectedObjectId)
        || environmentAssets.find(a => a.id === selectedObjectId)
        || actors.find(a => a.id === selectedObjectId);
    }

    if (obj) {
      const pos = obj.position;
      targetLookAt.current.set(pos[0], pos[1], pos[2]);
      targetPos.current.set(pos[0] + 8, pos[1] + 6, pos[2] + 8);
    } else {
      // Frame entire scene
      targetLookAt.current.set(0, 0, 0);
      targetPos.current.set(15, 15, 15);
    }
    animating.current = true;
  }, [focusRequest]);

  useFrame(() => {
    if (!animating.current) return;

    camera.position.lerp(targetPos.current, 0.08);
    if (orbitRef.current) {
      orbitRef.current.target.lerp(targetLookAt.current, 0.08);
      orbitRef.current.update();
    }

    if (camera.position.distanceTo(targetPos.current) < 0.05) {
      animating.current = false;
      // Clear the store targets
      useEditorStore.setState({ cameraTargetPosition: null, cameraTargetLookAt: null, activeCameraPreset: null });
    }
  });

  return null;
};

export default CameraControls;
