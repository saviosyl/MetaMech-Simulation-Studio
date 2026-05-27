import React, { useRef, Suspense, useMemo, Component, ErrorInfo, ReactNode } from 'react';

/** Error boundary to prevent individual 3D model crashes from taking down the whole app */
class Model3DErrorBoundary extends Component<{ children: ReactNode; fallback?: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('3D Model render error:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <mesh><boxGeometry args={[0.5, 0.5, 0.5]} /><meshStandardMaterial color="red" wireframe /></mesh>
      );
    }
    return this.props.children;
  }
}
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEditorStore } from '../../store/editorStore';
import { ProcessNode } from '../../store/editorStore';
import { getAssetById, getAssetManifest, ParametricAssetDef, StaticAssetDef } from '../../lib/assetManifest';
import ParametricModel from './ParametricModel';
import StaticModel from './StaticModel';
import GLBModel from './GLBModel';
import BeltConveyorGLB from './models/BeltConveyorGLB';
import SpiralConveyorModel from './models/SpiralConveyorModel';
import StopperModel from './models/StopperModel';
import PusherModel from './models/PusherModel';
import BendConveyorModel from './models/BendConveyorModel';
import SensorModel from './models/SensorModel';
import SourceModel from './models/SourceModel';
import DigitalTimerModel from './models/DigitalTimerModel';
import CeilingHangerModel from './models/CeilingHangerModel';
import SinkModel from './models/SinkModel';
import BufferModel from './models/BufferModel';
import { CartesianRobotModel, CobotModel, Robot5AxisModel, Robot6AxisModel } from './models/RobotModels';
import { PalletModel } from './models/PalletModels';
import IndustrialMachineModel from './models/IndustrialMachineModel';
import {
  CartonErectorModel, CasePackerModel, CheckweigherModel,
  MetalDetectorModel, LabelerModel, SealingStationModel,
  RejectStationModel, AccumulationTableModel, StretchWrapperModel,
  PackingStationModel, PalletConveyorModel, ForkliftModel,
} from './models/FMCGModels';
import {
  StainlessConveyorModel, LaminarFlowHoodModel, CleanBenchModel,
  PassThroughHatchModel, CleanroomCartModel, GuardPartitionModel,
  LightCurtainModel, InspectionStationModel, MachineEnclosureModel,
} from './models/MedicalModels';
import {
  WallModel, WindowModel, FenceModel, FenceGateModel, PalletRackModel as EnvPalletRackModel,
  BollardModel, OperatorStationModel, ElectricalCabinetModel, TowerLightModel,
  PalletStackModel, FloorZoneModel, MachineEnclosureModel as EnvMachineEnclosure,
  HMIStandModel, PalletTruckModel, ForkliftModel as EnvForkliftModel,
  CardboardBoxModel,
} from './models/EnvironmentModels';
import FlowDirectionArrow from './overlays/FlowDirectionArrow';
import SensorZoneOverlay from './overlays/SensorZoneOverlay';
import StopperZoneOverlay from './overlays/StopperZoneOverlay';

function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function resolveStaticAssetDef(assetId: string | undefined, type: string): StaticAssetDef | undefined {
  const byAssetId = assetId ? getAssetById(assetId) : undefined;
  if (byAssetId?.assetType === 'static') return byAssetId as StaticAssetDef;

  const byType = getAssetById(type);
  if (byType?.assetType === 'static') return byType as StaticAssetDef;

  const token = normalizeToken(type);
  if (!token) return undefined;
  const manifest = getAssetManifest();
  const legacyOem = manifest.find((asset) => (
    asset.assetType === 'static'
    && asset.id.startsWith('oem-')
    && (asset.id.endsWith(`-${token}`) || asset.id.includes(`-${token}-`))
  ));
  return legacyOem as StaticAssetDef | undefined;
}

/** Animated vertical lift carriage — moves up/down during simulation */
const VerticalLiftCarriage: React.FC<{
  platW: number; platD: number;
  infeedH: number; outfeedH: number;
  baseH: number; cx: number; cz: number; col: number;
  halfW: number; halfD: number;
  emissive: string;
}> = ({ platW, platD, infeedH, outfeedH, baseH, cx, cz, col, halfW, halfD, emissive }) => {
  const carriageRef = useRef<THREE.Group>(null);
  const isPlaying = useEditorStore(s => s.isPlaying);
  const simSpeed = useEditorStore(s => s.simulationSpeed);

  const lowY = Math.min(infeedH, outfeedH) + baseH;
  const highY = Math.max(infeedH, outfeedH) + baseH;
  const midY = (lowY + highY) / 2;
  const numRollers = 6;

  useFrame((state) => {
    if (!carriageRef.current) return;
    if (isPlaying) {
      // Smooth up/down cycle: 6 second full cycle
      const cycleTime = 6 / simSpeed;
      const t = (state.clock.elapsedTime % cycleTime) / cycleTime;
      const ease = (Math.sin(t * Math.PI * 2 - Math.PI / 2) + 1) / 2; // smooth sine
      carriageRef.current.position.y = lowY + (highY - lowY) * ease;
    } else {
      carriageRef.current.position.y = midY;
    }
  });

  const rollerPositions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < numRollers; i++) {
      arr.push(-platD / 2 + 0.08 + (platD - 0.16) * (i / (numRollers - 1)));
    }
    return arr;
  }, [platD]);

  return (
    <group ref={carriageRef} position={[0, midY, 0]}>
      {/* Platform base */}
      <mesh castShadow>
        <boxGeometry args={[platW - 0.02, 0.04, platD - 0.02]} />
        <meshStandardMaterial color="#3b82f6" metalness={0.6} roughness={0.35} emissive={emissive} />
      </mesh>
      {/* Rollers */}
      {rollerPositions.map((rz, ri) => (
        <mesh key={`r-${ri}`} position={[0, 0.04, rz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.018, 0.018, platW - 0.08, 8]} />
          <meshStandardMaterial color="#aaa" metalness={0.85} roughness={0.15} />
        </mesh>
      ))}
      {/* Side rails */}
      {[-1, 1].map((side, i) => (
        <mesh key={`rail-${i}`} position={[side * (halfW - 0.02), 0.03, 0]}>
          <boxGeometry args={[0.02, 0.06, platD - 0.02]} />
          <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* Guide shoes on columns */}
      {[[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([sx, sz], i) => (
        <mesh key={`shoe-${i}`} position={[sx * cx * 0.92, 0, sz * cz * 0.92]}>
          <boxGeometry args={[col * 0.6, 0.12, col * 0.6]} />
          <meshStandardMaterial color="#5a5a5a" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
    </group>
  );
};

interface ProcessNodeComponentProps {
  node: ProcessNode;
  isSelected: boolean;
  onClick: () => void;
}

const ProcessNodeComponent: React.FC<ProcessNodeComponentProps> = ({ node, isSelected, onClick }) => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = node.position[1] + Math.sin(Date.now() * 0.003) * 0.05;
    } else if (groupRef.current) {
      groupRef.current.position.y = node.position[1];
    }
  });

  // Check if this node uses the new asset system
  const assetDef = resolveStaticAssetDef(node.assetId, node.type) || getAssetById(node.type);

  // BELT CONVEYOR: always use the real GLB model directly
  if (node.type === 'belt-conveyor') {
    return (
      <group
        ref={groupRef}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <Suspense fallback={
          <mesh castShadow>
            <boxGeometry args={[3, 0.8, 0.6]} />
            <meshStandardMaterial color="#666" wireframe />
          </mesh>
        }>
          <BeltConveyorGLB
            parameters={node.parameters}
            isSelected={isSelected}
          />
        </Suspense>
        {isSelected && (
          <FlowDirectionArrow
            length={(node.parameters.length || 3000) / 1000}
            height={(node.parameters.height || 800) / 1000}
          />
        )}
        {node.parameters.supportType === 'ceiling-hanger' && (
          <CeilingHangerModel
            conveyorHeight={(node.parameters.height || 800) / 1000}
            ceilingHeight={(node.parameters.ceilingHeight || 3000) / 1000}
            conveyorWidth={(node.parameters.width || 600) / 1000}
            conveyorLength={(node.parameters.length || 3000) / 1000}
            hangerStyle={node.parameters.hangerStyle || 'twin-rod'}
            showCrossbar={node.parameters.hangerCrossbar !== false}
            isSelected={isSelected}
          />
        )}
      </group>
    );
  }

  // SPIRAL CONVEYOR
  if (node.type === 'spiral-conveyor') {
    return (
      <group
        ref={groupRef}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <Model3DErrorBoundary>
          <Suspense fallback={
            <mesh castShadow><cylinderGeometry args={[0.8, 0.8, 3, 16]} /><meshStandardMaterial color="#666" wireframe /></mesh>
          }>
            <SpiralConveyorModel parameters={node.parameters} isSelected={isSelected} />
          </Suspense>
        </Model3DErrorBoundary>
      </group>
    );
  }

  // STOPPER
  if (node.type === 'stopper') {
    return (
      <group
        ref={groupRef}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <StopperModel parameters={node.parameters} isSelected={isSelected} nodeId={node.id} />
        <StopperZoneOverlay 
          width={(node.parameters.beltWidth || 600) / 1000}
          isEngaged={node.parameters.engaged ?? true}
        />
      </group>
    );
  }

  // PUSHER
  if (node.type === 'pusher') {
    return (
      <group
        ref={groupRef}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <PusherModel parameters={node.parameters} isSelected={isSelected} />
      </group>
    );
  }

  // SENSOR
  if (node.type === 'sensor') {
    return (
      <group
        ref={groupRef}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <SensorModel parameters={node.parameters} isSelected={isSelected} />
        <SensorZoneOverlay 
          range={0.3}
          height={(node.parameters.mountHeight || 800) / 1000}
        />
      </group>
    );
  }

  // BEND CONVEYOR
  if (node.type === 'bend-conveyor') {
    return (
      <group
        ref={groupRef}
        position={node.position}
        rotation={node.rotation}
        scale={node.scale}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = 'auto'; }}
      >
        <Suspense fallback={
          <mesh castShadow>
            <torusGeometry args={[1, 0.3, 8, 16, Math.PI / 2]} />
            <meshStandardMaterial color="#666" wireframe />
          </mesh>
        }>
          <BendConveyorModel parameters={node.parameters} isSelected={isSelected} />
        </Suspense>
      </group>
    );
  }

  if (assetDef) {
    if (assetDef.assetType === 'parametric') {
      return (
        <group
          ref={groupRef}
          position={node.position}
          rotation={node.rotation}
          scale={node.scale}
        >
          <ParametricModel
            assetDef={assetDef as ParametricAssetDef}
            parameters={node.parameters}
            isSelected={isSelected}
            onClick={onClick}
          />
        </group>
      );
    }
    if (assetDef.assetType === 'static') {
      const staticDef = assetDef as StaticAssetDef;
      const isOemStatic = staticDef.id.startsWith('oem-');
      return (
        <group
          ref={groupRef}
          position={node.position}
          rotation={node.rotation}
          scale={isOemStatic ? [1, 1, 1] : node.scale}
        >
          <StaticModel
            assetDef={staticDef}
            parameters={node.parameters}
            isSelected={isSelected}
            onClick={onClick}
          />
        </group>
      );
    }
  }

  // Map types to GLB files with target sizes
  const glbMap: Record<string, { url: string; targetSize: number }> = {
    'conveyor': { url: '/models/conveyor.glb', targetSize: 5 },
    'pick-and-place': { url: '/models/industrial-robot.glb', targetSize: 2 },
    'palletizer': { url: '/models/industrial-robot.glb', targetSize: 2 },
    'machine-static': { url: '/models/machine.glb', targetSize: 2 },
    'industrial-robot': { url: '/models/industrial-robot.glb', targetSize: 2 },
  };

  const renderModel = () => {
    const glb = glbMap[node.type];
    if (glb) {
      return (
        <Suspense fallback={<FallbackBox color={getNodeColor(node.type)} isSelected={isSelected} />}>
          <GLBModel url={glb.url} targetSize={glb.targetSize} isSelected={isSelected} />
        </Suspense>
      );
    }
    switch (node.type) {
      case 'source':
        return <SourceModel isSelected={isSelected} />;
      case 'sink':
        return <SinkModel isSelected={isSelected} />;
      case 'digital-timer':
        return <DigitalTimerModel isSelected={isSelected} />;
      case 'buffer':
        return <BufferModel isSelected={isSelected} />;
      case 'machine':
        return <IndustrialMachineModel parameters={node.parameters} isSelected={isSelected} />;
      case 'cartesian-robot':
        return <CartesianRobotModel parameters={node.parameters} isSelected={isSelected} nodeId={node.id} />;
      case 'cobot':
        return <CobotModel parameters={node.parameters} isSelected={isSelected} nodeId={node.id} />;
      case 'robot-5axis':
        return <Robot5AxisModel parameters={node.parameters} isSelected={isSelected} nodeId={node.id} />;
      case 'robot-6axis':
        return <Robot6AxisModel parameters={node.parameters} isSelected={isSelected} nodeId={node.id} />;
      case 'eur-pallet':
      case 'standard-pallet':
      case 'custom-pallet':
        return <PalletModel parameters={node.parameters} isSelected={isSelected} />;
      // FMCG End-of-Line
      case 'carton-erector':
        return <CartonErectorModel params={node.parameters} />;
      case 'case-packer':
        return <CasePackerModel params={node.parameters} />;
      case 'checkweigher':
        return <CheckweigherModel params={node.parameters} />;
      case 'metal-detector':
        return <MetalDetectorModel params={node.parameters} />;
      case 'labeler':
        return <LabelerModel params={node.parameters} />;
      case 'sealing-station':
        return <SealingStationModel params={node.parameters} />;
      case 'reject-station':
        return <RejectStationModel params={node.parameters} />;
      case 'accumulation-table':
        return <AccumulationTableModel params={node.parameters} />;
      case 'stretch-wrapper':
        return <StretchWrapperModel params={node.parameters} />;
      case 'packing-station':
        return <PackingStationModel params={node.parameters} />;
      case 'pallet-conveyor':
        return <PalletConveyorModel params={node.parameters} />;
      case 'forklift':
        return <ForkliftModel />;
      // Medical / Cleanroom
      case 'stainless-conveyor':
        return <StainlessConveyorModel params={node.parameters} />;
      case 'laminar-flow-hood':
        return <LaminarFlowHoodModel params={node.parameters} />;
      case 'clean-bench':
        return <CleanBenchModel params={node.parameters} />;
      case 'pass-through-hatch':
        return <PassThroughHatchModel params={node.parameters} />;
      case 'cleanroom-cart':
        return <CleanroomCartModel params={node.parameters} />;
      case 'guard-partition':
        return <GuardPartitionModel params={node.parameters} />;
      case 'light-curtain':
        return <LightCurtainModel params={node.parameters} />;
      case 'inspection-station':
        return <InspectionStationModel params={node.parameters} />;
      case 'machine-enclosure':
        return <MachineEnclosureModel params={node.parameters} />;
      // ── Environment models ──
      case 'wall': return <WallModel params={node.parameters} isSelected={isSelected} />;
      case 'window': return <WindowModel params={node.parameters} isSelected={isSelected} />;
      case 'safety-rail':
      case 'fence': return <FenceModel params={node.parameters} isSelected={isSelected} />;
      case 'fence-gate':
      case 'door': return <FenceGateModel params={node.parameters} isSelected={isSelected} />;
      case 'pallet-rack': return <EnvPalletRackModel params={node.parameters} isSelected={isSelected} />;
      case 'bollard': return <BollardModel isSelected={isSelected} />;
      case 'operator-station': return <OperatorStationModel params={node.parameters} isSelected={isSelected} />;
      case 'electrical-cabinet': return <ElectricalCabinetModel params={node.parameters} isSelected={isSelected} />;
      case 'tower-light': return <TowerLightModel isSelected={isSelected} />;
      case 'pallet-stack': return <PalletStackModel params={node.parameters} isSelected={isSelected} />;
      case 'floor-zone': return <FloorZoneModel params={node.parameters} isSelected={isSelected} />;
      case 'hmi-stand': return <HMIStandModel isSelected={isSelected} />;
      case 'pallet-truck': return <PalletTruckModel isSelected={isSelected} />;
      case 'cardboard-box': return <CardboardBoxModel params={node.parameters} isSelected={isSelected} />;
      default:
        return <GenericModel type={node.type} isSelected={isSelected} params={node.parameters} />;
    }
  };

  return (
    <group
      ref={groupRef}
      position={node.position}
      rotation={node.rotation}
      scale={node.scale}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onPointerOver={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'auto'; }}
    >
      {renderModel()}
      
    </group>
  );
};

// Fallback while GLB loads
const FallbackBox: React.FC<{ color: string; isSelected: boolean }> = ({ color, isSelected }) => (
  <mesh position={[0, 0.5, 0]} castShadow>
    <boxGeometry args={[1.5, 1, 1]} />
    <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={isSelected ? '#222222' : '#000000'} />
  </mesh>
);

// Generic model for types that don't have a dedicated model yet
const GenericModel: React.FC<{ type: string; isSelected: boolean; params: Record<string, any> }> = ({ type, isSelected, params }) => {
  const em = isSelected ? '#222222' : '#000000';
  const color = getNodeColor(type);

  switch (type) {
    case 'router':
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.8, 1, 0.6, 6]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
          <mesh position={[0, 0.65, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.1, 12]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} emissive={em} />
          </mesh>
          {/* Direction arrows */}
          {[0, Math.PI / 2, Math.PI].map((r, i) => (
            <mesh key={i} position={[Math.cos(r) * 0.9, 0.3, Math.sin(r) * 0.9]} rotation={[0, -r + Math.PI / 2, 0]} castShadow>
              <coneGeometry args={[0.08, 0.2, 4]} />
              <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} />
            </mesh>
          ))}
        </group>
      );

    case 'transfer-bridge':
      return (
        <group>
          <mesh position={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[2, 0.15, 1]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
          {[-0.8, 0.8].map((x, i) => (
            <mesh key={i} position={[x, 0.35, 0]} castShadow>
              <boxGeometry args={[0.1, 0.15, 1.1]} />
              <meshStandardMaterial color="#ffcc00" metalness={0.5} roughness={0.4} emissive={em} />
            </mesh>
          ))}
        </group>
      );

    case 'spiral-conveyor':
      return (
        <group>
          <mesh position={[0, 0.15, 0]} castShadow>
            <cylinderGeometry args={[1.2, 1.2, 0.3, 16]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.8} roughness={0.3} emissive={em} />
          </mesh>
          <mesh position={[0, 2.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 4.7, 12]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
          {/* Spiral segments */}
          {Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            const y = 0.5 + (i / 8) * 4;
            return (
              <mesh key={i} position={[Math.cos(angle) * 0.8, y, Math.sin(angle) * 0.8]} castShadow>
                <boxGeometry args={[0.6, 0.05, 0.3]} />
                <meshStandardMaterial color={color} metalness={0.6} roughness={0.4} emissive={em} />
              </mesh>
            );
          })}
        </group>
      );

    case 'vertical-lifter': {
      const lPW = (params.platformWidth || 1000) / 1000;
      const lPD = (params.platformDepth || 1000) / 1000;
      const infH = (params.infeedHeight || 0) / 1000;
      const outH = (params.outfeedHeight || 3000) / 1000;
      const fenceOn = params.fenceEnabled !== false;
      const loadDir = params.loadDirection || 'front';
      const col = 0.06;
      const halfW = lPW / 2;
      const halfD = lPD / 2;
      const cx = halfW + col / 2;
      const cz = halfD + col / 2;
      const totalH = Math.max(infH, outH) + 0.15;
      const baseH = 0.05;
      const corners: [number, number][] = [[-cx, -cz], [-cx, cz], [cx, -cz], [cx, cz]];

      // Fence panels config (skip load side)
      const fencePanels = [
        { side: 'front', x: 0, z: -(halfD + col + 0.01), w: lPW + col * 2, d: 0.01 },
        { side: 'back',  x: 0, z:  (halfD + col + 0.01), w: lPW + col * 2, d: 0.01 },
        { side: 'left',  x: -(halfW + col + 0.01), z: 0, w: 0.01, d: lPD + col * 2 },
        { side: 'right', x:  (halfW + col + 0.01), z: 0, w: 0.01, d: lPD + col * 2 },
      ];

      return (
        <group>
          {/* Base plate */}
          <mesh position={[0, baseH / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[lPW + col * 4, baseH, lPD + col * 4]} />
            <meshStandardMaterial color="#3a3a3a" metalness={0.85} roughness={0.25} emissive={em} />
          </mesh>

          {/* 4 Vertical columns */}
          {corners.map(([x, z], i) => (
            <group key={`col-${i}`}>
              <mesh position={[x, totalH / 2 + baseH, z]} castShadow>
                <boxGeometry args={[col, totalH, col]} />
                <meshStandardMaterial color="#c0c0c0" metalness={0.8} roughness={0.25} emissive={em} />
              </mesh>
              {/* Channel groove */}
              <mesh position={[x * 0.92, totalH / 2 + baseH, z * 0.92]}>
                <boxGeometry args={[col * 0.35, totalH - 0.05, col * 0.35]} />
                <meshStandardMaterial color="#888" metalness={0.7} roughness={0.25} />
              </mesh>
            </group>
          ))}

          {/* Top cross beams */}
          <mesh position={[0, totalH + baseH, 0]} castShadow>
            <boxGeometry args={[lPW + col * 3, col, col * 0.8]} />
            <meshStandardMaterial color="#4a4a4a" metalness={0.75} roughness={0.3} emissive={em} />
          </mesh>
          <mesh position={[0, totalH + baseH, 0]} castShadow>
            <boxGeometry args={[col * 0.8, col, lPD + col * 3]} />
            <meshStandardMaterial color="#4a4a4a" metalness={0.75} roughness={0.3} emissive={em} />
          </mesh>

          {/* Flat belt drives on left & right */}
          {[-1, 1].map((side, i) => (
            <group key={`belt-${i}`}>
              <mesh position={[side * (halfW + col + 0.02), totalH / 2 + baseH, 0]}>
                <boxGeometry args={[0.03, totalH * 0.92, 0.06]} />
                <meshStandardMaterial color="#2d2d2d" metalness={0.3} roughness={0.7} />
              </mesh>
              {/* Pulleys top + bottom */}
              {[0.08, totalH - 0.02].map((yf, pi) => (
                <mesh key={`pulley-${pi}`} position={[side * (halfW + col + 0.02), yf + baseH, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.04, 0.04, 0.05, 12]} />
                  <meshStandardMaterial color="#888" metalness={0.8} roughness={0.3} />
                </mesh>
              ))}
            </group>
          ))}

          {/* Cross bracing on sides */}
          {[-1, 1].map((side, i) => (
            <mesh key={`brace-${i}`} position={[side * cx, totalH / 2 + baseH, 0]}
              rotation={[0, 0, Math.atan2(lPD * 0.5, totalH * 0.6) * side]} castShadow>
              <boxGeometry args={[0.015, Math.sqrt(totalH * totalH + lPD * lPD) * 0.6, 0.015]} />
              <meshStandardMaterial color="#999" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}

          {/* Animated carriage / platform */}
          <VerticalLiftCarriage
            platW={lPW} platD={lPD}
            infeedH={infH} outfeedH={outH}
            baseH={baseH} cx={cx} cz={cz} col={col}
            halfW={halfW} halfD={halfD}
            emissive={em}
          />

          {/* Warning stripes at load opening */}
          {(() => {
            const stripPos: Record<string, [number, number, number]> = {
              front: [0, 0, -(halfD + col + 0.01)],
              back:  [0, 0,  (halfD + col + 0.01)],
              left:  [-(halfW + col + 0.01), 0, 0],
              right: [ (halfW + col + 0.01), 0, 0],
            };
            const sp = stripPos[loadDir] || stripPos.front;
            const sw = (loadDir === 'left' || loadDir === 'right') ? lPD : lPW;
            const sr = (loadDir === 'left' || loadDir === 'right') ? Math.PI / 2 : 0;
            return [baseH + 0.01, totalH + baseH - 0.01].map((h, si) => (
              <mesh key={`strip-${si}`} position={[sp[0], h, sp[2]]} rotation={[0, sr, 0]}>
                <boxGeometry args={[sw + 0.02, 0.03, 0.01]} />
                <meshStandardMaterial color="#eab308" metalness={0.3} roughness={0.5} />
              </mesh>
            ));
          })()}

          {/* Optional glass guarding — clear transparent panels on all sides except load */}
          {fenceOn && fencePanels.filter(p => p.side !== loadDir).map((panel, i) => {
            const glassH = totalH * 0.9;
            const glassY = totalH / 2 + baseH;
            // Make glass panels thicker so they're visible
            const glassW = Math.max(panel.w, 0.02);
            const glassD = Math.max(panel.d, 0.02);
            return (
              <group key={`glass-${i}`}>
                {/* Glass panel */}
                <mesh position={[panel.x, glassY, panel.z]}>
                  <boxGeometry args={[glassW, glassH, glassD]} />
                  <meshPhysicalMaterial
                    color="#e8f4f8"
                    metalness={0.0}
                    roughness={0.05}
                    transparent
                    opacity={0.18}
                    transmission={0.9}
                    thickness={0.5}
                    ior={1.5}
                    envMapIntensity={1.0}
                    side={2 /* DoubleSide */}
                  />
                </mesh>
                {/* Glass frame edges (thin aluminum trim) */}
                {/* Top edge */}
                <mesh position={[panel.x, glassY + glassH / 2, panel.z]}>
                  <boxGeometry args={[glassW + 0.01, 0.02, glassD + 0.01]} />
                  <meshStandardMaterial color="#b0b0b0" metalness={0.8} roughness={0.2} />
                </mesh>
                {/* Bottom edge */}
                <mesh position={[panel.x, glassY - glassH / 2, panel.z]}>
                  <boxGeometry args={[glassW + 0.01, 0.02, glassD + 0.01]} />
                  <meshStandardMaterial color="#b0b0b0" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>
            );
          })}
        </group>
      );
    }

    default:
      return (
        <group>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1.5, 1, 1]} />
            <meshStandardMaterial color={color} metalness={0.7} roughness={0.3} emissive={em} />
          </mesh>
        </group>
      );
  }
};

function getNodeColor(type: string): string {
  const colorMap: Record<string, string> = {
    'source': '#10b981',
    'sink': '#ef4444',
    'digital-timer': '#111827',
    'conveyor': '#6b7280',
    'buffer': '#f59e0b',
    'machine': '#3b82f6',
    'router': '#8b5cf6',
    'transfer-bridge': '#6b7280',
    'popup-transfer': '#06b6d4',
    'pusher-transfer': '#06b6d4',
    'spiral-conveyor': '#6b7280',
    'vertical-lifter': '#f59e0b',
    'pick-and-place': '#ec4899',
    'palletizer': '#84cc16',
    'cartesian-robot': '#e8600a',
    'cobot': '#22aa55',
    'robot-5axis': '#e8600a',
    'robot-6axis': '#e8600a',
    'eur-pallet': '#c4a574',
    'standard-pallet': '#c4a574',
    'custom-pallet': '#c4a574',
  };
  return colorMap[type] || '#6b7280';
}

export default ProcessNodeComponent;
