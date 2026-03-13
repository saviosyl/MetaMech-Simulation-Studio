import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, PackagePlus, Download } from 'lucide-react';
import { useFrameDesignerStore } from '../store/frameDesignerStore';
import { FRAME_TEMPLATES } from '../lib/frameDesigner/templates';
import { PROFILE_LIBRARY, getProfileFamily } from '../lib/frameDesigner/profileLibrary';
import { setPendingFrameAssemblyExport } from '../lib/frameDesigner/sceneInterop';

type MemberDraw = {
  id: string;
  position: [number, number, number];
  quaternion: [number, number, number, number];
  lengthM: number;
};

const FrameMembers: React.FC = () => {
  const assembly = useFrameDesignerStore((s) => s.assembly);
  const profile = getProfileFamily(assembly.profileFamilyId);
  const members = useMemo<MemberDraw[]>(() => {
    const nodeMap = new Map<string, [number, number, number]>();
    assembly.nodes.forEach((n) => nodeMap.set(n.id, n.positionMm));
    const offsetX = assembly.widthMm / 2000;
    const offsetZ = assembly.depthMm / 2000;

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
        return {
          id: m.id,
          position: [mid.x, mid.y, mid.z] as [number, number, number],
          quaternion: [q.x, q.y, q.z, q.w] as [number, number, number, number],
          lengthM,
        };
      })
      .filter((v): v is MemberDraw => Boolean(v));
  }, [assembly]);

  const sx = profile.sectionMm[0] / 1000;
  const sz = profile.sectionMm[1] / 1000;
  return (
    <>
      {members.map((m) => (
        <mesh key={m.id} position={m.position} quaternion={m.quaternion} castShadow receiveShadow>
          <boxGeometry args={[sx, m.lengthM, sz]} />
          <meshStandardMaterial color={profile.color} metalness={0.72} roughness={0.34} />
        </mesh>
      ))}
    </>
  );
};

const FrameDesignerPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    frameName,
    templateId,
    profileFamilyId,
    widthMm,
    heightMm,
    depthMm,
    assembly,
    bom,
    setFrameName,
    setTemplateId,
    setProfileFamilyId,
    setDimensions,
    exportContract,
  } = useFrameDesignerStore();

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
            <label style={{ display: 'block', fontSize: 10, textTransform: 'uppercase', color: 'var(--mm-text-tertiary)', marginBottom: 4 }}>Template</label>
            <select value={templateId} onChange={(e) => setTemplateId(e.target.value as any)} style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-input)', color: 'var(--mm-text-primary)' }}>
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
                onChange={(e) => setDimensions({ [k]: Number(e.target.value) } as any)}
                style={{ width: '100%', padding: '7px 9px', borderRadius: 7, border: '1px solid var(--mm-border)', background: 'var(--mm-bg-input)', color: 'var(--mm-text-primary)' }}
              />
            </div>
          ))}

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
            <FrameMembers />
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
