import React, { useRef, useEffect, useMemo } from 'react';
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

const CameraControls: React.FC<{
  orbitRef: React.RefObject<any>;
  suspendSpaceMouse?: boolean;
  onSpaceMouseNavigationChange?: (navigating: boolean) => void;
}> = ({ orbitRef, suspendSpaceMouse = false, onSpaceMouseNavigationChange }) => {
  const { camera } = useThree();
  const {
    cameraTargetPosition,
    cameraTargetLookAt,
    cameraTargetUp,
    cameraMode,
    focusRequest,
    selectedObjectId,
    processNodes,
    environmentAssets,
    actors,
  } = useEditorStore();

  const animating = useRef(false);
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3());
  const targetUp = useRef(new THREE.Vector3(0, 1, 0));
  const lastFocusRequest = useRef(0);
  const loggedOnce = useRef(false);
  const isSpaceMouseNavigating = useRef(false);

  const setSpaceMouseNavigating = (navigating: boolean) => {
    if (isSpaceMouseNavigating.current === navigating) return;
    isSpaceMouseNavigating.current = navigating;
    onSpaceMouseNavigationChange?.(navigating);
  };

  const sceneOrbitCenter = useMemo(() => {
    const allObjects = [...processNodes, ...environmentAssets, ...actors];
    if (allObjects.length === 0) return null;

    let sx = 0;
    let sy = 0;
    let sz = 0;
    for (const obj of allObjects) {
      sx += obj.position[0];
      sy += obj.position[1];
      sz += obj.position[2];
    }
    return new THREE.Vector3(sx / allObjects.length, sy / allObjects.length, sz / allObjects.length);
  }, [processNodes, environmentAssets, actors]);

  // Handle camera presets
  useEffect(() => {
    if (cameraTargetPosition && cameraTargetLookAt) {
      targetPos.current.set(...cameraTargetPosition);
      targetLookAt.current.set(...cameraTargetLookAt);
      if (cameraTargetUp) {
        targetUp.current.set(...cameraTargetUp);
      } else {
        targetUp.current.set(0, 1, 0);
      }
      animating.current = true;
    }
  }, [cameraTargetPosition, cameraTargetLookAt, cameraTargetUp]);

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

  useEffect(() => () => setSpaceMouseNavigating(false), []);

  useFrame((_, delta) => {
    const controls = orbitRef.current;
    const dt = Math.min(delta, 0.05);

    // ── Camera preset animation ──
    if (animating.current) {
      camera.position.lerp(targetPos.current, 0.1);
      camera.up.lerp(targetUp.current, 0.14);
      if (controls) {
        controls.target.lerp(targetLookAt.current, 0.1);
        controls.update();
      }
      if (camera.position.distanceTo(targetPos.current) < 0.05) {
        animating.current = false;
        if ((camera as any).isOrthographicCamera) {
          const ortho = camera as THREE.OrthographicCamera;
          ortho.zoom = cameraMode === 'orthographic' ? 42 : 1;
          ortho.updateProjectionMatrix();
        }
        useEditorStore.setState({ cameraTargetPosition: null, cameraTargetLookAt: null, cameraTargetUp: null, activeCameraPreset: null });
      }
    }

    // ── 3Dconnexion SpaceMouse ──
    if (suspendSpaceMouse) {
      setSpaceMouseNavigating(false);
      return;
    }

    const sm = spaceMouse.poll();
    if (!sm.connected) {
      setSpaceMouseNavigating(false);
      return;
    }

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
    //   translate: [X=left/right, Y=up/down, Z=push/pull]
    //   rotate:    [rX=pitch(tilt), rY=roll, rZ=yaw(twist left/right)]
    //
    // For orbit: rZ (yaw/twist) = horizontal orbit, rX (pitch/tilt) = vertical orbit
    // This matches how you physically twist the SpaceMouse cap

    const hasInput = Math.abs(tx) + Math.abs(ty) + Math.abs(tz) +
                     Math.abs(rx) + Math.abs(ry) + Math.abs(rz) > 0.0075;
    if (!hasInput) {
      setSpaceMouseNavigating(false);
      return;
    }
    if (!controls) {
      setSpaceMouseNavigating(false);
      return;
    }
    setSpaceMouseNavigating(true);

    const cfg = spaceMouse.config;
    // Zoom direction modes:
    // - forward-backward: zoom uses cap push/pull (Z axis), pan vertical uses Y axis
    // - up-down:          zoom uses cap up/down (Y axis), pan vertical uses Z axis
    const zoomRaw = cfg.zoomDirection === 'up-down' ? -ty : tz;
    const panVerticalRaw = cfg.zoomDirection === 'up-down' ? tz : ty;
    const panX = cfg.invertPan ? -tx : tx;
    const panY = cfg.invertPan ? -panVerticalRaw : panVerticalRaw;
    const zoomInput = cfg.invertZoom ? -zoomRaw : zoomRaw;

    // Get camera-relative directions
    camera.getWorldDirection(_fwd);
    _right.crossVectors(_fwd, camera.up).normalize();
    _up.crossVectors(_right, _fwd).normalize();

    // Distance to orbit target (for proportional speeds)
    _offset.copy(camera.position).sub(controls.target);
    const dist = _offset.length();

    const rotateIntent = Math.abs(rx) + Math.abs(rz);
    const panIntent = Math.abs(panX) + Math.abs(panY);
    const zoomIntent = Math.abs(zoomInput);

    // Lock orbit pivot to a stable center: selected object center if available,
    // otherwise overall layout center.
    if (rotateIntent > 0.018 && panIntent < 0.02 && zoomIntent < 0.02) {
      let pivot: THREE.Vector3 | null = null;
      if (selectedObjectId) {
        const selected =
          processNodes.find(n => n.id === selectedObjectId) ||
          environmentAssets.find(a => a.id === selectedObjectId) ||
          actors.find(a => a.id === selectedObjectId);
        if (selected) {
          _selectedPos.set(selected.position[0], selected.position[1], selected.position[2]);
          pivot = _selectedPos;
        }
      }
      if (!pivot && sceneOrbitCenter) {
        _selectedPos.copy(sceneOrbitCenter);
        pivot = _selectedPos;
      }
      if (pivot) {
        controls.target.lerp(pivot, Math.min(1, dt * 6));
      }
    }

    // ── PAN: slide left/right + vertical pan axis chosen by zoom direction mode ──
    if (Math.abs(panX) > 0.008 || Math.abs(panY) > 0.008) {
      const panSpeed = dt * dist * 0.85 * cfg.translateSpeed;  // proportional to distance
      _v.set(0, 0, 0);
      _v.addScaledVector(_right, -panX * panSpeed);   // negative: push right = pan right
      _v.addScaledVector(_up, panY * panSpeed);
      camera.position.add(_v);
      controls.target.add(_v);
    }

    // ── ZOOM: mapped by configured direction mode ──
    if (Math.abs(zoomInput) > 0.008) {
      const zoomSpeed = dt * dist * 1.1 * cfg.zoomSpeed;
      const zoomAmount = zoomInput * zoomSpeed;
      // Move camera along the camera→target direction
      _offset.copy(camera.position).sub(controls.target);
      const newDist = Math.max(0.3, _offset.length() + zoomAmount);
      _offset.normalize().multiplyScalar(newDist);
      camera.position.copy(controls.target).add(_offset);
    }

    // ── ORBIT HORIZONTAL: twist/yaw (rZ) — twist left = orbit left ──
    if (Math.abs(rz) > 0.008) {
      _offset.copy(camera.position).sub(controls.target);
      const yawAngle = rz * dt * 3.0 * cfg.rotateSpeed;
      _offset.applyAxisAngle(_yAxis, yawAngle);
      camera.position.copy(controls.target).add(_offset);
    }

    // ── ORBIT VERTICAL: tilt/pitch (rX) — tilt forward = orbit down ──
    if (Math.abs(rx) > 0.008) {
      camera.getWorldDirection(_fwd);
      _right.crossVectors(_fwd, camera.up).normalize();
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
    controls.update();
  });

  return null;
};

export default CameraControls;
