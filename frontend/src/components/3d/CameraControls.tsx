import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '../../store/editorStore';
import { spaceMouse } from '../../lib/spacemouse';

const _v = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _offset = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _selectedPos = new THREE.Vector3();

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
  const loggedOnce = useRef(false);

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

  useFrame((_, delta) => {
    const controls = orbitRef.current;
    const dt = Math.min(delta, 0.05);

    // ── Camera preset animation ──
    if (animating.current) {
      camera.position.lerp(targetPos.current, 0.1);
      if (controls) {
        controls.target.lerp(targetLookAt.current, 0.1);
        controls.update();
      }
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        animating.current = false;
        useEditorStore.setState({ cameraTargetPosition: null, cameraTargetLookAt: null, activeCameraPreset: null });
      }
    }

    // ── 3Dconnexion SpaceMouse ──
    const sm = spaceMouse.poll();
    if (!sm.connected) return;

    const [tx, ty, tz] = sm.translate;  // axes 0,1,2
    const [rx, ry, rz] = sm.rotate;     // axes 3,4,5

    // Debug: log raw axes once to console so user can verify mapping
    if (!loggedOnce.current) {
      const hasAny = Math.abs(tx) + Math.abs(ty) + Math.abs(tz) + Math.abs(rx) + Math.abs(ry) + Math.abs(rz) > 0.05;
      if (hasAny) {
        console.log('[SpaceMouse] First input — translate:', [tx.toFixed(2), ty.toFixed(2), tz.toFixed(2)],
          'rotate:', [rx.toFixed(2), ry.toFixed(2), rz.toFixed(2)]);
        loggedOnce.current = true;
      }
    }

    // 3Dconnexion SpaceMouse axis mapping:
    //   translate: [X=left/right, Y=up/down, Z=push/pull(zoom)]
    //   rotate:    [rX=pitch(tilt), rY=roll, rZ=yaw(twist left/right)]
    //
    // For orbit: rZ (yaw/twist) = horizontal orbit, rX (pitch/tilt) = vertical orbit
    // This matches how you physically twist the SpaceMouse cap

    const hasInput = Math.abs(tx) + Math.abs(ty) + Math.abs(tz) +
                     Math.abs(rx) + Math.abs(ry) + Math.abs(rz) > 0.005;
    if (!hasInput) return;
    if (!controls) return;

    const cfg = spaceMouse.config;

    // Get camera-relative directions
    camera.getWorldDirection(_fwd);
    _right.crossVectors(_fwd, camera.up).normalize();
    _up.crossVectors(_right, _fwd).normalize();

    // Distance to orbit target (for proportional speeds)
    _offset.copy(camera.position).sub(controls.target);
    const dist = _offset.length();

    // Prefer selected object as a rotation center during pure orbit gestures.
    if (selectedObjectId && (Math.abs(tx) + Math.abs(ty)) < 0.03 && (Math.abs(rx) + Math.abs(rz)) > 0.03) {
      const selected =
        processNodes.find(n => n.id === selectedObjectId) ||
        environmentAssets.find(a => a.id === selectedObjectId) ||
        actors.find(a => a.id === selectedObjectId);
      if (selected) {
        _selectedPos.set(selected.position[0], selected.position[1], selected.position[2]);
        controls.target.lerp(_selectedPos, Math.min(1, dt * 3.5));
      }
    }

    // ── PAN: slide left/right (tx), up/down (ty) ──
    if (Math.abs(tx) > 0.005 || Math.abs(ty) > 0.005) {
      const panSpeed = dt * dist * 0.85 * cfg.translateSpeed;  // proportional to distance
      _v.set(0, 0, 0);
      _v.addScaledVector(_right, -tx * panSpeed);   // negative: push right = pan right
      _v.addScaledVector(_up, ty * panSpeed);
      camera.position.add(_v);
      controls.target.add(_v);
    }

    // ── ZOOM: push/pull (tz) ──
    if (Math.abs(tz) > 0.005) {
      const zoomSpeed = dt * dist * 1.1 * cfg.zoomSpeed;
      const zoomAmount = tz * zoomSpeed;
      // Move camera along the camera→target direction
      _offset.copy(camera.position).sub(controls.target);
      const newDist = Math.max(0.3, _offset.length() + zoomAmount);
      _offset.normalize().multiplyScalar(newDist);
      camera.position.copy(controls.target).add(_offset);
    }

    // ── ORBIT HORIZONTAL: twist/yaw (rZ) — twist left = orbit left ──
    if (Math.abs(rz) > 0.005) {
      _offset.copy(camera.position).sub(controls.target);
      const yawAngle = rz * dt * 3.0 * cfg.rotateSpeed;
      _offset.applyAxisAngle(_yAxis, yawAngle);
      camera.position.copy(controls.target).add(_offset);
    }

    // ── ORBIT VERTICAL: tilt/pitch (rX) — tilt forward = orbit down ──
    if (Math.abs(rx) > 0.005) {
      _offset.copy(camera.position).sub(controls.target);
      const pitchAngle = rx * dt * 2.5 * cfg.rotateSpeed;
      _offset.applyAxisAngle(_right, pitchAngle);
      // Prevent flipping past poles
      const normalized = _offset.clone().normalize();
      if (Math.abs(normalized.y) < 0.95) {
        camera.position.copy(controls.target).add(_offset);
      }
    }

    // ── ROLL (rY) — optional, used for camera roll if needed ──
    // Most 3D apps ignore roll for orbit, so we skip it

    // Stabilize horizon to avoid subtle long-session roll drift.
    camera.up.lerp(_yAxis, Math.min(1, dt * 4));
    camera.lookAt(controls.target);
    controls.update();
  });

  return null;
};

export default CameraControls;
