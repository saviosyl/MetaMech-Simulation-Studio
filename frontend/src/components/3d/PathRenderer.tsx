/**
 * PathRenderer — Renders actor movement paths in 3D
 * Shows lines, waypoints, direction arrows
 */
import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useEditorStore, ActorPath } from '../../store/editorStore';

/** Line component using a ref to avoid R3F JSX issues with <line> */
const PathLineSegment: React.FC<{ points: THREE.Vector3[]; color: string }> = ({ points, color }) => {
  const ref = useRef<THREE.Line>(null!);

  useEffect(() => {
    if (ref.current) {
      ref.current.geometry = new THREE.BufferGeometry().setFromPoints(points);
    }
  }, [points]);

  const material = useMemo(() => new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }), [color]);

  return (
    <primitive
      ref={ref}
      object={new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material)}
    />
  );
};

const PathLine: React.FC<{ path: ActorPath }> = ({ path }) => {
  const points = path.points;
  if (points.length < 2) return null;

  const linePoints = useMemo(() => {
    const pts = points.map(p => new THREE.Vector3(p[0], (p[1] || 0) + 0.05, p[2]));
    if (path.loop && pts.length > 2) pts.push(pts[0].clone());
    return pts;
  }, [points, path.loop]);

  const arrowPositions = useMemo(() => {
    if (!path.showArrows || points.length < 2) return [];
    const arrows: { pos: [number, number, number]; rot: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i];
      const b = points[i + 1];
      const midX = (a[0] + b[0]) / 2;
      const midY = ((a[1] || 0) + (b[1] || 0)) / 2 + 0.05;
      const midZ = (a[2] + b[2]) / 2;
      const angle = Math.atan2(b[0] - a[0], b[2] - a[2]);
      arrows.push({ pos: [midX, midY, midZ], rot: angle });
    }
    return arrows;
  }, [points, path.showArrows]);

  return (
    <group>
      {/* Path line */}
      <PathLineSegment points={linePoints} color={path.color} />

      {/* Waypoints */}
      {points.map((p, i) => (
        <mesh key={i} position={[p[0], (p[1] || 0) + 0.05, p[2]]}>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial
            color={i === 0 ? '#10b981' : i === points.length - 1 && !path.loop ? '#ef4444' : path.color}
            emissive={path.color}
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}

      {/* Direction arrows */}
      {arrowPositions.map((a, i) => (
        <mesh key={`arrow-${i}`} position={a.pos} rotation={[0, a.rot, 0]}>
          <coneGeometry args={[0.06, 0.15, 6]} />
          <meshStandardMaterial color={path.color} emissive={path.color} emissiveIntensity={0.4} />
        </mesh>
      ))}
    </group>
  );
};

const PathRenderer: React.FC = () => {
  const paths = useEditorStore(s => s.paths);
  const pathsVisible = useEditorStore(s => s.pathsVisible);

  if (!pathsVisible || paths.length === 0) return null;

  return (
    <group>
      {paths.map(path => (
        <PathLine key={path.id} path={path} />
      ))}
    </group>
  );
};

export default PathRenderer;
