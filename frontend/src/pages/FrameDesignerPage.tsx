import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, PackagePlus, Download, PenSquare } from 'lucide-react';
import { useFrameDesignerStore } from '../store/frameDesignerStore';
import { FRAME_TEMPLATES } from '../lib/frameDesigner/templates';
import { PROFILE_LIBRARY, getProfileFamily } from '../lib/frameDesigner/profileLibrary';
import { setPendingFrameAssemblyExport } from '../lib/frameDesigner/sceneInterop';
import { FrameAssembly } from '../lib/frameDesigner/model';

type BuildPlane = 'xz' | 'xy' | 'yz';

type MemberDraw = {
  id: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  lengthM: number;
  sectionM: [number, number];
  color: string;
};

function centerOffset(assembly: FrameAssembly): [number, number] {
  return [assembly.widthMm / 2000, assembly.depthMm / 2000];
}

function nodeWorldPos(nodeMm: [number, number, number], assembly: FrameAssembly): [number, number, number] {
  const [ox, oz] = centerOffset(assembly);
  return [nodeMm[0] / 1000 - ox, nodeMm[1] / 1000, nodeMm[2] / 1000 - oz];
}

function worldToModelMm(world: [number, number, number], assembly: FrameAssembly): [number, number, number] {
  const [ox, oz] = centerOffset(assembly);
  return [
    Math.round((world[0] + ox) * 1000),
    Math.round(world[1] * 1000),
    Math.round((world[2] + oz) * 1000),
  ];
}

function applyOrthoLock(start: [number, number, number], end: [number, number, number], plane: BuildPlane): [number, number, number] {
  const out: [number, number, number] = [...end];
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  if (plane === 'xz') {
    if (Math.abs(dx) >= Math.abs(dz)) out[2] = start[2];
    else out[0] = start[0];
  } else if (plane === 'xy') {
    if (Math.abs(dx) >= Math.abs(dy)) out[1] = start[1];
    else out[0] = start[0];
  } else {
    if (Math.abs(dy) >= Math.abs(dz)) out[2] = start[2];
    else out[1] = start[1];
  }
  return out;
}

const FrameMembers: React.FC = () => {
  const assembly = useFrameDesignerStore((s) => s.assembly);
  const selectedMemberId = useFrameDesignerStore((s) => s.selectedMemberId);
  const selectMember = useFrameDesignerStore((s) => s.selectMember);
  const members = useMemo<MemberDraw[]>(() => {
    const nodeMap = new Map<string, [number, number, number]>();
    assembly.nodes.forEach((n) => nodeMap.set(n.id, n.positionMm));
    const [offsetX, offsetZ] = centerOffset(assembly);

    return assembly.members
      .map((m) => {
        const a = nodeMap.get(m.startNodeId);
        const b = nodeMap.get(m.endNodeId);
        if (!a || !b) return null;
        const start = new THREE.Vector3(a[0] / 1000 - offsetX, a[1] / 1000, a[2] / 1000 - offsetZ);
        const end = new THREE.Vector3(b[0] / 1000 - offsetX, b[1] / 1000, b[2] / 1000 - offsetZ);
        const dir = new THREE.Vector3().subVectors(end, start);
        const lengthM = dir.length();
        if (lengthM < 1e-6) return null;
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
        const q = new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          dir.clone().normalize(),
        );
        const profile = getProfileFamily(m.profileFamilyId);
        return {
          id: m.id,
          position: [mid.x, mid.y, mid.z] as [number, number, number],
          quaternion: [q.x, q.y, q.z, q.w] as [number, number, number, number],
          lengthM,
          sectionM: [profile.sectionMm[0] / 1000, profile.sectionMm[1] / 1000] as [number, number],
          color: profile.color,
        };
      })
      .filter((v): v is MemberDraw => Boolean(v));
  }, [assembly]);

  return (
    <>
      {members.map((m) => (
        <mesh
          key={m.id}
          position={m.position}
          quaternion={m.quaternion}
          castShadow
          receiveShadow
          onClick={(e) => {
            e.stopPropagation();
            selectMember(m.id);
          }}
        >
          <boxGeometry args={[m.sectionM[0], m.lengthM, m.sectionM[1]]} />
          <meshStandardMaterial
            color={m.color}
            metalness={0.72}
            roughness={0.34}
            emissive={selectedMemberId === m.id ? '#0ea5e9' : '#000000'}
            emissiveIntensity={selectedMemberId === m.id ? 0.22 : 0}
          />
        </mesh>
      ))}
    </>
  );
};

const FrameNodesOverlay: React.FC = () => {
  const assembly = useFrameDesignerStore((s) => s.assembly);
  return (
    <>
      {assembly.nodes.map((n) => {
        const w = nodeWorldPos(n.positionMm, assembly);
        return (
          <mesh key={n.id} position={w}>
            <sphereGeometry args={[0.022, 10, 10]} />
            <meshStandardMaterial color="#7dd3fc" metalness={0.15} roughness={0.35} />
          </mesh>
        );
      })}
    </>
  );
};

const PreviewMember: React.FC<{ start: [number, number, number]; end: [number, number, number]; sectionM: [number, number] }> = ({ start, end, sectionM }) => {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const dir = new THREE.Vector3().subVectors(e, s);
  const length = dir.length();
  if (length < 1e-6) return null;
  const mid = new THREE.Vector3().addVectors(s, e).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
  return (
    <mesh position={[mid.x, mid.y, mid.z]} quaternion={[q.x, q.y, q.z, q.w]}>
      <boxGeometry args={[sectionM[0], length, sectionM[1]]} />
      <meshStandardMaterial color="#38bdf8" transparent opacity={0.45} />
    </mesh>
  );
};

const ManualBuildPlane: React.FC<{
  active: boolean;
  plane: BuildPlane;
  assembly: FrameAssembly;
  orthoLock: boolean;
  startPoint: [number, number, number] | null;
  setStartPoint: (p: [number, number, number] | null) => void;
  setHoverPoint: (p: [number, number, number] | null) => void;
  setSnappedHover: (v: boolean) => void;
}> = ({ active, plane, assembly, orthoLock, startPoint, setStartPoint, setHoverPoint, setSnappedHover }) => {
  const addCustomMember = useFrameDesignerStore((s) => s.addCustomMember);
  const profileFamilyId = useFrameDesignerStore((s) => s.profileFamilyId);
  const selectMember = useFrameDesignerStore((s) => s.selectMember);

  const snapPoint = (raw: [number, number, number]) => {
    const threshold = 0.07; // 70 mm
    let best: [number, number, number] | null = null;
    let bestDist = threshold;
    for (const n of assembly.nodes) {
      const w = nodeWorldPos(n.positionMm, assembly);
      const dx = raw[0] - w[0];
      const dy = raw[1] - w[1];
      const dz = raw[2] - w[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < bestDist) {
        bestDist = dist;
        best = w;
      }
    }
    return best;
  };

  const onPointerMove = (e: any) => {
    if (!active) return;
    e.stopPropagation();
    const raw: [number, number, number] = [e.point.x, e.point.y, e.point.z];
    const snapped = snapPoint(raw);
    let finalPt = snapped ?? raw;
    setSnappedHover(Boolean(snapped));
    if (startPoint && orthoLock) {
      finalPt = applyOrthoLock(startPoint, finalPt, plane);
    }
    setHoverPoint(finalPt);
  };

  const onClick = (e: any) => {
    if (!active) return;
    e.stopPropagation();
    selectMember(null);
    const raw: [number, number, number] = [e.point.x, e.point.y, e.point.z];
    const snapped = snapPoint(raw);
    let finalPt = snapped ?? raw;
    if (startPoint && orthoLock) {
      finalPt = applyOrthoLock(startPoint, finalPt, plane);
    }

    if (!startPoint) {
      setStartPoint(finalPt);
      setHoverPoint(finalPt);
      return;
    }

    const a = worldToModelMm(startPoint, assembly);
    const b = worldToModelMm(finalPt, assembly);
    addCustomMember(a, b, profileFamilyId);
    setStartPoint(null);
    setHoverPoint(null);
    setSnappedHover(false);
  };

  const shared = { visible: false, onPointerMove, onClick } as any;
  if (plane === 'xy') {
    return <mesh position={[0, 0, 0]} {...shared}><planeGeometry args={[40, 40]} /><meshBasicMaterial transparent opacity={0} /></mesh>;
  }
  if (plane === 'yz') {
    return <mesh position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} {...shared}><planeGeometry args={[40, 40]} /><meshBasicMaterial transparent opacity={0} /></mesh>;
  }
  return <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} {...shared}><planeGeometry args={[40, 40]} /><meshBasicMaterial transparent opacity={0} /></mesh>;
};

const FrameDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const [manualToolActive, setManualToolActive] = useState(false);
  const [buildPlane, setBuildPlane] = useState<BuildPlane>('xz');
  const [orthoLock, setOrthoLock] = useState(true);
  const [startPoint, setStartPoint] = useState<[number, number, number] | null>(null);
  const [hoverPoint, setHoverPoint] = useState<[number, number, number] | null>(null);
  const [snappedHover, setSnappedHover] = useState(false);

  const {
    frameName,
    buildMode,
    templateId,
    profileFamilyId,
    widthMm,
    heightMm,
    depthMm,
    assembly,
    bom,
    selectedMemberId,
    setFrameName,
    setBuildMode,
    setTemplateId,
    setProfileFamilyId,
    setDimensions,
    resetCustomWorkspace,
    updateMemberLength,
    updateMemberProfile,
    exportContract,
  } = useFrameDesignerStore();

  const selectedMember = useMemo(() => assembly.members.find((m) => m.id === selectedMemberId) ?? null, [assembly.members, selectedMemberId]);
  const selectedMemberLengthMm = useMemo(() => {
    if (!selectedMember) return 0;
    const nodeMap = new Map<string, [number, number, number]>();
    assembly.nodes.forEach((n) => nodeMap.set(n.id, n.positionMm));
    const a = nodeMap.get(selectedMember.startNodeId);
    const b = nodeMap.get(selectedMember.endNodeId);
    if (!a || !b) return 0;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const dz = b[2] - a[2];
    return Math.max(1, Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz)));
  }, [assembly.nodes, selectedMember]);

  useEffect(() => {
    if (buildMode !== 'custom') {
      setManualToolActive(false);
      setStartPoint(null);
      setHoverPoint(null);
      setSnappedHover(false);
    }
  }, [buildMode]);

  const exportToSimulation = () => {
    const payload = exportContract();
    setPendingFrameAssemblyExport(payload);
    navigate('/demo');
  };

  const downloadExport = () => {
    const payload = exportContract();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${frameName.replace(/\s+/g, '_')}.frame-assembly.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--mm-bg-app)', color: 'var(--mm-text-primary)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 52, borderBottom: '1px solid var(--mm-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', background: 'var(--mm-bg-panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => navigate('/dashboard')} style={{ border: 'none', background: 'transparent', color: 'var(--mm-text-secondary)', cursor: 'pointer' }} title="Back to dashboard">
            <ArrowLeft size={16} />
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.05em', fontFamily: "'Orbitron', monospace" }}>
            Aluminium Frame Designer
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={downloadExport} style={{ border: '1px solid var(--mm-border)', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-secondary)', borderRadius: 8, padding: '7px 10px', display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer' }} title="Download frame export contract JSON">
            <Download size={14} /> Export JSON
          </button>
          <button onClick={exportToSimulation} style={{ border: 'none', background: 'linear-gradient(135deg,#0891b2,#06b6d4)', color: '#fff', borderRadius: 8, padding: '7px 12px', display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', fontWeight: 700 }} title="Insert as one frame assembly object into simulation scene">
            <PackagePlus size={14} /> Insert into Simulation
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '300px 1fr 320px', minHeight: 0 }}>
        {/* Left controls */}
        <div style={{ borderRight: '1px solid var(--mm-border)', background: 'var(--mm-bg-panel)', padding: 12, overflowY: 'auto' }}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>Frame Name</label>
            <input value={frameName} onChange={(e) => setFrameName(e.target.value)} style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-input)', color: 'var(--mm-text-primary)' }} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>Build Mode</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={() => setBuildMode('template')} style={{ padding: '7px 8px', borderRadius: 7, border: '1px solid var(--mm-border)', background: buildMode === 'template' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)', color: buildMode === 'template' ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)', cursor: 'pointer', fontWeight: 700 }}>
                Template
              </button>
              <button onClick={() => setBuildMode('custom')} style={{ padding: '7px 8px', borderRadius: 7, border: '1px solid var(--mm-border)', background: buildMode === 'custom' ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)', color: buildMode === 'custom' ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)', cursor: 'pointer', fontWeight: 700 }}>
                Custom Build
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>Template</label>
            <select value={templateId} disabled={buildMode !== 'template'} onChange={(e) => setTemplateId(e.target.value as any)} style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: buildMode === 'template' ? 'var(--mm-bg-input)' : 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)' }}>
              {FRAME_TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <div style={{ marginTop: 6, fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
              {FRAME_TEMPLATES.find((t) => t.id === templateId)?.description}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>Profile Family</label>
            <select value={profileFamilyId} onChange={(e) => setProfileFamilyId(e.target.value)} style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-input)', color: 'var(--mm-text-primary)' }}>
              {PROFILE_LIBRARY.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sectionMm[0]}x{p.sectionMm[1]})</option>
              ))}
            </select>
          </div>

          {(['widthMm', 'heightMm', 'depthMm'] as const).map((k) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>
                {k === 'widthMm' ? 'Width' : k === 'heightMm' ? 'Height' : 'Depth'} (mm)
              </label>
              <input
                type="number"
                min={300}
                step={50}
                value={k === 'widthMm' ? widthMm : k === 'heightMm' ? heightMm : depthMm}
                disabled={buildMode !== 'template'}
                onChange={(e) => setDimensions({ [k]: Number(e.target.value) } as any)}
                style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: buildMode === 'template' ? 'var(--mm-bg-input)' : 'var(--mm-bg-surface)', color: 'var(--mm-text-primary)' }}
              />
            </div>
          ))}

          {buildMode === 'custom' && (
            <div style={{ marginTop: 14, padding: 10, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, background: 'rgba(15,23,42,0.18)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mm-text-tertiary)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.06em' }}>Custom Build Tool</div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <button onClick={() => setManualToolActive((v) => !v)} style={{ flex: 1, padding: '7px 8px', borderRadius: 7, border: '1px solid var(--mm-border)', background: manualToolActive ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)', color: manualToolActive ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)', cursor: 'pointer', fontWeight: 700 }}>
                  <PenSquare size={13} style={{ verticalAlign: -2, marginRight: 5 }} />
                  {manualToolActive ? 'Drawing On' : 'Draw Member'}
                </button>
                <button onClick={resetCustomWorkspace} style={{ padding: '7px 8px', borderRadius: 7, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-surface)', color: 'var(--mm-text-secondary)', cursor: 'pointer', fontWeight: 700 }}>
                  Empty
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                {(['xz', 'xy', 'yz'] as BuildPlane[]).map((p) => (
                  <button key={p} onClick={() => setBuildPlane(p)} style={{ padding: '6px 4px', borderRadius: 6, border: '1px solid var(--mm-border)', background: buildPlane === p ? 'var(--mm-accent-primary-muted)' : 'var(--mm-bg-surface)', color: buildPlane === p ? 'var(--mm-accent-primary)' : 'var(--mm-text-secondary)', cursor: 'pointer', fontWeight: 700 }}>
                    {p.toUpperCase()}
                  </button>
                ))}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: 'var(--mm-text-secondary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={orthoLock} onChange={(e) => setOrthoLock(e.target.checked)} />
                Ortho lock (horizontal/vertical)
              </label>
              <div style={{ marginTop: 8, fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                {startPoint ? 'Pick end point…' : 'Pick start point…'} {snappedHover ? ' (snap active)' : ''}
              </div>
            </div>
          )}

          {buildMode === 'custom' && selectedMember && (
            <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, background: 'rgba(14,165,233,0.08)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--mm-text-tertiary)', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.06em' }}>
                Selected Member
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>Length (mm)</label>
                <input
                  type="number"
                  min={10}
                  step={10}
                  value={selectedMemberLengthMm}
                  onChange={(e) => updateMemberLength(selectedMember.id, Number(e.target.value))}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-input)', color: 'var(--mm-text-primary)' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 10, color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>Profile Family</label>
                <select
                  value={selectedMember.profileFamilyId}
                  onChange={(e) => updateMemberProfile(selectedMember.id, e.target.value)}
                  style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-input)', color: 'var(--mm-text-primary)' }}
                >
                  {PROFILE_LIBRARY.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sectionMm[0]}x{p.sectionMm[1]})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div style={{ marginTop: 16, padding: 10, borderRadius: 8, border: '1px solid var(--mm-border-subtle)', background: 'var(--mm-bg-surface)' }}>
            <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Nodes: <strong style={{ color: 'var(--mm-text-primary)' }}>{assembly.nodes.length}</strong></div>
            <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Members: <strong style={{ color: 'var(--mm-text-primary)' }}>{assembly.members.length}</strong></div>
          </div>
        </div>

        {/* 3D viewport */}
        <div style={{ position: 'relative', minWidth: 0, background: 'var(--mm-bg-viewport)' }}>
          <Canvas shadows dpr={[1, 2]} camera={{ position: [3.6, 2.6, 3.2], fov: 45 }}>
            <ambientLight intensity={0.45} />
            <directionalLight intensity={1.05} position={[4, 5, 3]} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
            <Environment preset="warehouse" />
            <Grid args={[40, 40]} cellSize={0.25} sectionSize={1} fadeDistance={40} fadeStrength={1} infiniteGrid />
            <FrameNodesOverlay />
            <FrameMembers />
            {buildMode === 'custom' && (
              <ManualBuildPlane
                active={manualToolActive}
                plane={buildPlane}
                assembly={assembly}
                orthoLock={orthoLock}
                startPoint={startPoint}
                setStartPoint={setStartPoint}
                setHoverPoint={setHoverPoint}
                setSnappedHover={setSnappedHover}
              />
            )}
            {buildMode === 'custom' && manualToolActive && startPoint && hoverPoint && (
              <PreviewMember
                start={startPoint}
                end={hoverPoint}
                sectionM={[
                  getProfileFamily(profileFamilyId).sectionMm[0] / 1000,
                  getProfileFamily(profileFamilyId).sectionMm[1] / 1000,
                ]}
              />
            )}
            <OrbitControls enableDamping dampingFactor={0.08} />
            <GizmoHelper alignment="bottom-right" margin={[78, 90]}>
              <GizmoViewport axisColors={['#ef4444', '#22c55e', '#3b82f6']} labelColor="#f8fafc" />
            </GizmoHelper>
          </Canvas>
        </div>

        {/* BOM panel */}
        <div style={{ borderLeft: '1px solid var(--mm-border)', background: 'var(--mm-bg-panel)', padding: 12, overflowY: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--mm-text-tertiary)', marginBottom: 8, fontFamily: "'Orbitron', monospace" }}>
            Cut List / BOM
          </div>

          <div style={{ marginBottom: 10, padding: 10, border: '1px solid var(--mm-border-subtle)', borderRadius: 8, background: 'var(--mm-bg-surface)' }}>
            <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Total members: <strong style={{ color: 'var(--mm-text-primary)' }}>{bom.summary.totalMembers}</strong></div>
            <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Total cut length: <strong style={{ color: 'var(--mm-text-primary)' }}>{Math.round(bom.summary.totalCutLengthMm / 10) / 100} m</strong></div>
            <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>Total mass: <strong style={{ color: 'var(--mm-text-primary)' }}>{bom.summary.totalMassKg.toFixed(2)} kg</strong></div>
          </div>

          <div style={{ display: 'grid', gap: 6 }}>
            {bom.lines.map((line, idx) => (
              <div key={`${line.profileFamilyId}-${line.cutLengthMm}-${idx}`} style={{ border: '1px solid var(--mm-border-subtle)', borderRadius: 8, padding: 8, background: 'rgba(15,23,42,0.22)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--mm-text-primary)' }}>{line.profileName}</div>
                <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                  {line.section} | Cut: {line.cutLengthMm} mm | Qty: {line.quantity}
                </div>
                <div style={{ fontSize: 11, color: 'var(--mm-text-tertiary)' }}>
                  Total: {(line.totalLengthMm / 1000).toFixed(2)} m | {line.totalMassKg.toFixed(2)} kg
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FrameDesignerPage;
