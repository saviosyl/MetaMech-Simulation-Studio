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
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();

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

  useFrame((state, delta) => {
    const controls = orbitRef.current;
    const dt = Math.min(delta, 0.05); // cap delta

    // ── Camera preset / focus animation ──
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

    const [tx, ty, tz] = sm.translate;
    const [rx, ry, rz] = sm.rotate;
    const hasInput = Math.abs(tx) + Math.abs(ty) + Math.abs(tz) + Math.abs(rx) + Math.abs(ry) + Math.abs(rz) > 0.001;

    // Button 1 toggles mode: object → camera → fly → object
    // (Handled in the UI; here we just read the mode)

    const mode = spaceMouse.config.mode;
    const ts = spaceMouse.config.translateSpeed;
    const rs = spaceMouse.config.rotateSpeed;
    const zs = spaceMouse.config.zoomSpeed;

    if (!hasInput && mode !== 'fly') return;

    // Get camera basis vectors
    camera.getWorldDirection(_fwd);
    _right.crossVectors(_fwd, camera.up).normalize();
    _up.crossVectors(_right, _fwd).normalize();

    if (mode === 'object' && controls) {
      // ═══ OBJECT MODE ═══
      // Rotate around orbit target (like rotating the world)
      const speed = dt * 5;

      // Pan: move both camera and target together
      _v.set(0, 0, 0);
      _v.addScaledVector(_right, tx * speed * ts);
      _v.addScaledVector(_up, ty * speed * ts);
      camera.position.add(_v);
      controls.target.add(_v);

      // Zoom: move camera toward/away from target
      _offset.copy(camera.position).sub(controls.target);
      const dist = _offset.length();
      const zoomAmount = tz * dt * zs * dist * 0.5; // proportional to distance
      _offset.normalize().multiplyScalar(Math.max(0.5, dist - zoomAmount));
      camera.position.copy(controls.target).add(_offset);

      // Orbit: rotate camera around target
      if (Math.abs(ry) > 0.01) {
        _offset.copy(camera.position).sub(controls.target);
        _offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -ry * dt * rs * 3);
        camera.position.copy(controls.target).add(_offset);
      }
      if (Math.abs(rx) > 0.01) {
        _offset.copy(camera.position).sub(controls.target);
        _offset.applyAxisAngle(_right, -rx * dt * rs * 2);
        // Prevent flipping past poles
        const newDir = _offset.clone().normalize();
        if (Math.abs(newDir.y) < 0.98) {
          camera.position.copy(controls.target).add(_offset);
        }
      }

      camera.lookAt(controls.target);
      controls.update();

    } else if (mode === 'camera' && controls) {
      // ═══ CAMERA MODE ═══
      // Move the camera; orbit target follows
      const speed = dt * 8;

      // Strafe left/right + crane up/down
      _v.set(0, 0, 0);
      _v.addScaledVector(_right, tx * speed * ts);
      _v.addScaledVector(_up, ty * speed * ts);

      // Dolly forward/back
      _v.addScaledVector(_fwd, -tz * speed * zs);

      camera.position.add(_v);
      controls.target.add(_v);

      // Pitch + Yaw (rotate the view direction)
      if (Math.abs(rx) > 0.01 || Math.abs(ry) > 0.01) {
        _offset.copy(controls.target).sub(camera.position);
        const lookDist = _offset.length();

        // Yaw
        if (Math.abs(ry) > 0.01) {
          _offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), -ry * dt * rs * 3);
        }
        // Pitch
        if (Math.abs(rx) > 0.01) {
          _offset.applyAxisAngle(_right, -rx * dt * rs * 2);
          const newDir = _offset.clone().normalize();
          if (Math.abs(newDir.y) > 0.98) {
            // Skip pitch near poles
            _offset.applyAxisAngle(_right, rx * dt * rs * 2); // undo
          }
        }

        controls.target.copy(camera.position).add(_offset.normalize().multiplyScalar(lookDist));
      }

      camera.lookAt(controls.target);
      controls.update();

    } else if (mode === 'fly') {
      // ═══ FLY MODE ═══
      // Smooth momentum-based flight
      spaceMouse.updateFlyMomentum(sm, dt);
      const vel = spaceMouse.flyVelocity;
      const ang = spaceMouse.flyAngular;

      const hasVel = Math.abs(vel[0]) + Math.abs(vel[1]) + Math.abs(vel[2]) + Math.abs(ang[0]) + Math.abs(ang[1]) > 0.0001;
      if (!hasVel) return;

      // Move camera
      _v.set(0, 0, 0);
      _v.addScaledVector(_right, vel[0]);
      _v.addScaledVector(_up, vel[1]);
      _v.addScaledVector(_fwd, -vel[2]);
      camera.position.add(_v);

      // Rotate view
      if (Math.abs(ang[1]) > 0.0001) {
        _euler.setFromQuaternion(camera.quaternion, 'YXZ');
        _euler.y -= ang[1];
        camera.quaternion.setFromEuler(_euler);
      }
      if (Math.abs(ang[0]) > 0.0001) {
        _euler.setFromQuaternion(camera.quaternion, 'YXZ');
        _euler.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, _euler.x - ang[0]));
        camera.quaternion.setFromEuler(_euler);
      }

      // Update orbit target to stay in front of camera
      if (controls) {
        camera.getWorldDirection(_fwd);
        controls.target.copy(camera.position).add(_fwd.multiplyScalar(10));
        controls.update();
      }
    }
  });

  return null;
};

export default CameraControls;
