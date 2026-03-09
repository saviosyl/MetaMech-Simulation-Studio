/**
 * PathRenderer — Renders actor movement paths in 3D
 * Shows lines, waypoints, direction arrows
 */
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useEditorStore, ActorPath } from '../../store/editorStore';

const PathLine: React.FC<{ path: ActorPath }> = ({ path }) => {
  const points = path.points;
  if (points.length < 2) return null;

  const lineGeometry = useMemo(() => {
    const pts = points.map(p => new THREE.Vector3(p[0], p[1] + 0.05, p[2]));
    if (path.loop && pts.length > 2) pts.push(pts[0].clone());
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [points, path.loop]);

  const arrowPositions = useMemo(() => {
    if (!path.showArrows || points.length < 2) return [];
    const arrows: { pos: THREE.Vector3; rot: number }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const a = new THREE.Vector3(...points[i]);
      const b = new THREE.Vector3(...points[i + 1]);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      mid.y += 0.05;
      const angle = Math.atan2(b.x - a.x, b.z - a.z);
      arrows.push({ pos: mid, rot: angle });
    }
    return arrows;
  }, [points, path.showArrows]);

  return (
    <group>
      {/* Path line */}
      <line_>
        <primitive object={lineGeometry} attach="geometry" />
        <lineBasicMaterial color={path.color} linewidth={2} transparent opacity={0.8} />
      </line_>

      {/* Waypoints */}
      {points.map((p, i) => (
        <mesh key={i} position={[p[0], p[1] + 0.05, p[2]]}>
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

  if (paths.length === 0) return null;

  return (
    <group>
      {paths.map(path => (
        <PathLine key={path.id} path={path} />
      ))}
    </group>
  );
};

export default PathRenderer;
