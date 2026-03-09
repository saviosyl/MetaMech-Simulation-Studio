/**
 * CameraPathPlayer — Smoothly animates the camera along a camera path
 * Must be placed inside the R3F Canvas
 */
import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore, CameraKeyframe } from '../../store/editorStore';

/** Smooth ease-in-out (cubic) */
function easeInOut(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Catmull-Rom spline interpolation for smooth camera movement */
function catmullRom(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
  const t2 = t * t;
  const t3 = t2 * t;
  return new THREE.Vector3(
    0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  );
}

const CameraPathPlayer: React.FC = () => {
  const { camera } = useThree();
  const cameraPaths = useEditorStore(s => s.cameraPaths);
  const activeCameraPathId = useEditorStore(s => s.activeCameraPathId);
  const isCameraPathPlaying = useEditorStore(s => s.isCameraPathPlaying);
  const setIsCameraPathPlaying = useEditorStore(s => s.setIsCameraPathPlaying);

  const elapsedRef = useRef(0);
  const wasPlayingRef = useRef(false);

  // Reset elapsed when starting
  useEffect(() => {
    if (isCameraPathPlaying && !wasPlayingRef.current) {
      elapsedRef.current = 0;
    }
    wasPlayingRef.current = isCameraPathPlaying;
  }, [isCameraPathPlaying]);

  useFrame((state, delta) => {
    if (!isCameraPathPlaying || !activeCameraPathId) return;

    const path = cameraPaths.find(p => p.id === activeCameraPathId);
    if (!path || path.keyframes.length < 2) {
      setIsCameraPathPlaying(false);
      return;
    }

    const kfs = path.keyframes;
    elapsedRef.current += delta;

    // Compute total duration
    const totalDuration = kfs.reduce((sum, kf) => sum + kf.duration, 0);
    let t = elapsedRef.current;

    // Handle loop / end
    if (t >= totalDuration) {
      if (path.loop) {
        t = t % totalDuration;
        elapsedRef.current = t;
      } else {
        // Snap to final keyframe
        const last = kfs[kfs.length - 1];
        camera.position.set(...last.position);
        // Look at target
        const lookTarget = new THREE.Vector3(...last.target);
        camera.lookAt(lookTarget);
        // Update orbit controls target
        const controls = state.controls as any;
        if (controls && 'target' in controls) {
          controls.target.set(...last.target);
          controls.update?.();
        }
        setIsCameraPathPlaying(false);
        return;
      }
    }

    // Find current segment
    let segStart = 0;
    let segIdx = 0;
    for (let i = 0; i < kfs.length - 1; i++) {
      if (t >= segStart && t < segStart + kfs[i].duration) {
        segIdx = i;
        break;
      }
      segStart += kfs[i].duration;
      if (i === kfs.length - 2) segIdx = i;
    }

    const segDuration = kfs[segIdx].duration;
    const segT = segDuration > 0 ? (t - segStart) / segDuration : 0;
    const easedT = kfs[segIdx].easing === 'ease-in-out' ? easeInOut(segT) : segT;

    // Get 4 keyframe positions for Catmull-Rom (clamp at edges)
    const getKfPos = (idx: number) => new THREE.Vector3(...kfs[Math.max(0, Math.min(idx, kfs.length - 1))].position);
    const getKfTarget = (idx: number) => new THREE.Vector3(...kfs[Math.max(0, Math.min(idx, kfs.length - 1))].target);

    // Smooth camera position via Catmull-Rom spline
    const p0 = getKfPos(segIdx - 1);
    const p1 = getKfPos(segIdx);
    const p2 = getKfPos(segIdx + 1);
    const p3 = getKfPos(segIdx + 2);
    const newPos = catmullRom(p0, p1, p2, p3, easedT);

    // Smooth target via Catmull-Rom spline
    const t0 = getKfTarget(segIdx - 1);
    const t1 = getKfTarget(segIdx);
    const t2 = getKfTarget(segIdx + 1);
    const t3 = getKfTarget(segIdx + 2);
    const newTarget = catmullRom(t0, t1, t2, t3, easedT);

    // Apply
    camera.position.copy(newPos);
    camera.lookAt(newTarget);

    // Update orbit controls to match
    const controls = state.controls as any;
    if (controls && 'target' in controls) {
      controls.target.copy(newTarget);
      controls.update?.();
    }
  });

  return null;
};

export default CameraPathPlayer;
