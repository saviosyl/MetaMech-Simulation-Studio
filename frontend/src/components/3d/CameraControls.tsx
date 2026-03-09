import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '../../store/editorStore';
import { spaceMouse } from '../../lib/spacemouse';

const CameraControls: React.FC<{ orbitRef: React.RefObject<any> }> = ({ orbitRef }) => {
  const { camera } = useThree();
  const {
    cameraTargetPosition,
    cameraTargetLookAt,
    focusRequest,
    selectedObjectId,
    processNodes,
    environmentAssets,
    actors,
  } = useEditorStore();

  const animating = useRef(false);
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const lastFocusRequest = useRef(0);

  // Handle camera presets / view changes
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
      targetLookAt.current.set(0, 0, 0);
      targetPos.current.set(15, 15, 15);
    }
    animating.current = true;
  }, [focusRequest]);

  // 3Dconnexion SpaceMouse temp vectors
  const smPanVec = useRef(new THREE.Vector3());
  const smRight = useRef(new THREE.Vector3());
  const smUp = useRef(new THREE.Vector3());
  const smForward = useRef(new THREE.Vector3());

  useFrame((_, delta) => {
    // ── Camera preset animation ──
    if (animating.current) {
      camera.position.lerp(targetPos.current, 0.1);
      if (orbitRef.current) {
        orbitRef.current.target.lerp(targetLookAt.current, 0.1);
        orbitRef.current.update();
      }
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        animating.current = false;
        useEditorStore.setState({ cameraTargetPosition: null, cameraTargetLookAt: null, activeCameraPreset: null });
      }
    }

    // ── 3Dconnexion SpaceMouse input ──
    const sm = spaceMouse.getState();
    if (!sm.connected) return;

    const [panX, panY, zoom] = sm.translate;
    const [, orbitY] = sm.rotate;
    const hasInput = Math.abs(panX) + Math.abs(panY) + Math.abs(zoom) + Math.abs(orbitY) > 0.001;
    if (!hasInput) return;

    const controls = orbitRef.current;
    if (!controls) return;

    const speed = 8 * delta;

    // Get camera-relative directions
    camera.getWorldDirection(smForward.current);
    smRight.current.crossVectors(smForward.current, camera.up).normalize();
    smUp.current.crossVectors(smRight.current, smForward.current).normalize();

    // Pan (translate camera + target together)
    smPanVec.current.set(0, 0, 0);
    smPanVec.current.addScaledVector(smRight.current, panX * speed);
    smPanVec.current.addScaledVector(smUp.current, panY * speed);
    camera.position.add(smPanVec.current);
    controls.target.add(smPanVec.current);

    // Zoom (move camera along forward axis)
    camera.position.addScaledVector(smForward.current, zoom * speed * 2);

    // Orbit (rotate around target on Y axis)
    if (Math.abs(orbitY) > 0.01) {
      const offset = camera.position.clone().sub(controls.target);
      const angle = -orbitY * delta * 3;
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      camera.position.copy(controls.target).add(offset);
    }

    controls.update();
  });

  return null;
};

export default CameraControls;
