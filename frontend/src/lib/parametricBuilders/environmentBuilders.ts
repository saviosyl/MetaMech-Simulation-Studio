import * as THREE from 'three';
import type { BuilderResult } from './beltConveyorBuilder';

function addMesh(group: THREE.Group, geo: THREE.BufferGeometry, mat: THREE.Material, pos: [number, number, number], rot?: [number, number, number]) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  m.castShadow = true;
  m.receiveShadow = true;
  group.add(m);
}

export function wallBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 5000) / 1000;
  const h = (params.height ?? 3000) / 1000;
  const t = (params.thickness ?? 200) / 1000;
  const PORT_INSET = 0.005; // 5mm from edge

  const group = new THREE.Group();

  // Industrial wall color
  const wallColor = params.wallColor || '#d4d4d4';
  const matOpts: any = { color: wallColor, metalness: 0.15, roughness: 0.7 };

  // Texture support
  if (params.textureUrl) {
    try {
      const tex = new THREE.TextureLoader().load(params.textureUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(w, h);
      matOpts.map = tex;
    } catch (_) { /* fallback to color */ }
  }

  const mat = new THREE.MeshStandardMaterial(matOpts);

  // ─── Industrial wall panels (horizontal grooves) ───
  const panelH = 1.2; // 1.2m panels
  const grooveH = 0.008;
  const numPanels = Math.floor(h / panelH);
  // Main wall body
  addMesh(group, new THREE.BoxGeometry(w, h, t), mat, [0, h / 2, 0]);

  // Panel groove lines (subtle industrial look)
  const grooveMat = new THREE.MeshStandardMaterial({ color: '#999999', metalness: 0.3, roughness: 0.5 });
  for (let i = 1; i < numPanels; i++) {
    const gy = i * panelH;
    if (gy < h - 0.1) {
      addMesh(group, new THREE.BoxGeometry(w + 0.002, grooveH, t + 0.002), grooveMat, [0, gy, 0]);
    }
  }

  // ─── Bottom kick plate (darker, more industrial) ───
  const kickH = 0.15;
  const kickMat = new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.4, roughness: 0.5 });
  addMesh(group, new THREE.BoxGeometry(w + 0.004, kickH, t + 0.004), kickMat, [0, kickH / 2, 0]);

  // ─── Steel column accents on sides ───
  const colW = 0.06;
  const colMat = new THREE.MeshStandardMaterial({ color: '#808080', metalness: 0.6, roughness: 0.3 });
  addMesh(group, new THREE.BoxGeometry(colW, h, t + 0.01), colMat, [-w / 2 + colW / 2, h / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(colW, h, t + 0.01), colMat, [w / 2 - colW / 2, h / 2, 0]);

  // ─── Glass vents/windows at top (clerestory) ───
  if (h > 2.0) {
    const ventH = Math.min(0.6, h * 0.15);
    const ventY = h - ventH / 2 - 0.1;
    const ventW = w - colW * 2 - 0.2;
    const numVents = Math.max(1, Math.floor(ventW / 1.5));
    const ventSegW = ventW / numVents;
    const glassMat = new THREE.MeshStandardMaterial({ 
      color: '#88ccee', metalness: 0.1, roughness: 0.05, 
      transparent: true, opacity: 0.4,
    });
    const ventFrameMat = new THREE.MeshStandardMaterial({ color: '#a0a0a0', metalness: 0.7, roughness: 0.3 });
    
    for (let i = 0; i < numVents; i++) {
      const vx = -ventW / 2 + ventSegW / 2 + i * ventSegW;
      // Glass pane
      const glassGeo = new THREE.BoxGeometry(ventSegW - 0.06, ventH - 0.04, 0.01);
      const glass = new THREE.Mesh(glassGeo, glassMat);
      glass.position.set(vx, ventY, t / 2 + 0.005);
      group.add(glass);
      // Frame around glass
      const frameGeo = new THREE.BoxGeometry(ventSegW, ventH, 0.02);
      const frame = new THREE.Mesh(frameGeo, ventFrameMat);
      frame.position.set(vx, ventY, t / 2 + 0.001);
      group.add(frame);
    }
  }

  // ─── Text label ───
  if (params.wallLabel) {
    const fontSize = params.labelFontSize || 128;
    const labelColor = params.labelColor || '#333333';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = 1024;
    canvas.height = 512;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = labelColor;
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(params.wallLabel, canvas.width / 2, canvas.height / 2);
    const labelTex = new THREE.CanvasTexture(canvas);
    labelTex.colorSpace = THREE.SRGBColorSpace;
    const labelMat = new THREE.MeshBasicMaterial({ map: labelTex, transparent: true, depthWrite: false });
    const labelW = Math.min(w * 0.8, w);
    const labelH = labelW * 0.5;
    const labelMesh = new THREE.Mesh(new THREE.PlaneGeometry(labelW, labelH), labelMat);
    labelMesh.position.set(0, h * 0.4, t / 2 + 0.01);
    group.add(labelMesh);
  }

  // ─── Ports at edges (5mm from body) for mating walls together ───
  const portY = h / 2;
  const ports = [
    { id: 'left', type: 'output' as const, localPosition: [-w / 2 - PORT_INSET, portY, 0] as [number, number, number], direction: [-1, 0, 0] as [number, number, number] },
    { id: 'right', type: 'input' as const, localPosition: [w / 2 + PORT_INSET, portY, 0] as [number, number, number], direction: [1, 0, 0] as [number, number, number] },
  ];

  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function doorBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1200) / 1000;
  const h = (params.height ?? 2400) / 1000;
  const t = (params.thickness ?? 100) / 1000;

  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x8b7355, metalness: 0.3, roughness: 0.6 });
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xa0522d, metalness: 0.2, roughness: 0.7 });
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.9, roughness: 0.2 });

  const frameW = 0.06;
  // Top frame
  addMesh(group, new THREE.BoxGeometry(w + frameW * 2, frameW, t), frameMat, [0, h + frameW / 2, 0]);
  // Side frames
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [-(w / 2 + frameW / 2), h / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [(w / 2 + frameW / 2), h / 2, 0]);
  // Door panel
  addMesh(group, new THREE.BoxGeometry(w - 0.02, h - 0.02, t * 0.6), panelMat, [0, h / 2, 0]);
  // Handle
  addMesh(group, new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), handleMat, [w / 2 - 0.08, h * 0.45, t / 2 + 0.02], [Math.PI / 2, 0, 0]);

  const ports = [
    { id: 'left', type: 'output' as const, localPosition: [-w / 2 - 0.005, h / 2, 0] as [number, number, number], direction: [-1, 0, 0] as [number, number, number] },
    { id: 'right', type: 'input' as const, localPosition: [w / 2 + 0.005, h / 2, 0] as [number, number, number], direction: [1, 0, 0] as [number, number, number] },
  ];
  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function windowBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1500) / 1000;
  const h = (params.height ?? 1200) / 1000;
  const t = (params.thickness ?? 100) / 1000;

  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xe0e0e0, metalness: 0.6, roughness: 0.3 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.4 });

  const frameW = 0.04;
  // Frame (4 sides)
  addMesh(group, new THREE.BoxGeometry(w, frameW, t), frameMat, [0, h / 2 + frameW / 2, 0]); // top
  addMesh(group, new THREE.BoxGeometry(w, frameW, t), frameMat, [0, -(h / 2 + frameW / 2 - h), 0]); // bottom – centered at sill
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [-(w / 2), h / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(frameW, h, t), frameMat, [(w / 2), h / 2, 0]);
  // Cross bar
  addMesh(group, new THREE.BoxGeometry(w - frameW * 2, frameW * 0.6, t * 0.5), frameMat, [0, h / 2, 0]);
  // Glass
  addMesh(group, new THREE.BoxGeometry(w - frameW * 2, h - frameW * 2, 0.006), glassMat, [0, h / 2, 0]);

  const ports = [
    { id: 'left', type: 'output' as const, localPosition: [-w / 2 - 0.005, h / 2, 0] as [number, number, number], direction: [-1, 0, 0] as [number, number, number] },
    { id: 'right', type: 'input' as const, localPosition: [w / 2 + 0.005, h / 2, 0] as [number, number, number], direction: [1, 0, 0] as [number, number, number] },
  ];
  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function palletRackBuilder(params: Record<string, any>): BuilderResult {
  const bayW = (params.bayWidth ?? 2700) / 1000;
  const depth = (params.depth ?? 1100) / 1000;
  const totalH = (params.height ?? 5000) / 1000;
  const levels = params.levels ?? 4;
  const bays = params.bays ?? 1; // single-bay or double-bay

  const group = new THREE.Group();

  // Premium industrial colors
  const uprightColor = params.uprightColor || '#1d4ed8'; // industrial blue
  const beamColor = params.beamColor || '#ea580c';       // safety orange
  const safetyYellow = '#eab308';

  const uprightMat = new THREE.MeshStandardMaterial({ color: uprightColor, metalness: 0.75, roughness: 0.25 });
  const beamMat = new THREE.MeshStandardMaterial({ color: beamColor, metalness: 0.65, roughness: 0.28 });
  const deckMat = new THREE.MeshStandardMaterial({ color: '#b8955a', metalness: 0.05, roughness: 0.85 });
  const braceMat = new THREE.MeshStandardMaterial({ color: uprightColor, metalness: 0.7, roughness: 0.3 });
  const footMat = new THREE.MeshStandardMaterial({ color: '#404040', metalness: 0.8, roughness: 0.2 });
  const safetyMat = new THREE.MeshStandardMaterial({ color: safetyYellow, metalness: 0.5, roughness: 0.4 });
  const palletMat = new THREE.MeshStandardMaterial({ color: '#a87b4f', metalness: 0.05, roughness: 0.9 });

  const uprightW = 0.08;
  const uprightD = 0.06;
  const beamH = 0.12;
  const beamD = 0.05;
  const totalBayWidth = bayW * bays;

  // Build for each bay
  for (let bay = 0; bay < bays; bay++) {
    const bayOffset = (bay - (bays - 1) / 2) * bayW;

    // ─── Uprights (C-channel profile) ───
    const uprightXs = [-bayW / 2 + bayOffset, bayW / 2 + bayOffset];
    // Only add the left upright for bay > 0 (shared with previous bay)
    const startIdx = bay > 0 ? 1 : 0;
    for (let i = startIdx; i < uprightXs.length; i++) {
      const x = uprightXs[i];
      for (const z of [-depth / 2, depth / 2]) {
        // Main upright column
        addMesh(group, new THREE.BoxGeometry(uprightW, totalH, uprightD), uprightMat, [x, totalH / 2, z]);

        // Punched holes pattern (visual detail — small indentations)
        const holeSpacing = 0.05; // 50mm pitch
        for (let hy = holeSpacing; hy < totalH; hy += holeSpacing) {
          if (hy % (holeSpacing * 4) < holeSpacing * 0.5) {
            // Every 4th position gets a slightly wider notch (visual only)
            addMesh(group, new THREE.BoxGeometry(uprightW + 0.002, 0.008, uprightD + 0.002),
              braceMat, [x, hy, z]);
          }
        }

        // Heavy-duty foot plate with bolt holes
        addMesh(group, new THREE.BoxGeometry(0.18, 0.015, 0.18), footMat, [x, 0.0075, z]);
        // Anchor bolts (4 per foot)
        for (const [bx, bz] of [[-0.055, -0.055], [0.055, -0.055], [-0.055, 0.055], [0.055, 0.055]]) {
          addMesh(group, new THREE.CylinderGeometry(0.008, 0.008, 0.02, 6), footMat, [x + bx, 0.025, z + bz]);
        }
      }
    }

    // ─── Beams per level (box beam profile with step notch) ───
    const levelH = totalH / levels;
    for (let lvl = 1; lvl <= levels; lvl++) {
      const y = lvl * levelH;
      for (const z of [-depth / 2, depth / 2]) {
        // Main beam
        addMesh(group, new THREE.BoxGeometry(bayW - uprightW, beamH, beamD), beamMat,
          [bayOffset, y - beamH / 2, z]);
        // Step beam (lower lip for pallet support)
        addMesh(group, new THREE.BoxGeometry(bayW - uprightW - 0.04, 0.015, beamD + 0.02), beamMat,
          [bayOffset, y - beamH + 0.008, z]);
        // Beam connector clips at each end
        for (const side of [-1, 1]) {
          addMesh(group, new THREE.BoxGeometry(0.03, beamH + 0.02, beamD + 0.015), beamMat,
            [bayOffset + side * (bayW / 2 - uprightW / 2 - 0.01), y - beamH / 2, z]);
        }
      }
    }

    // ─── Wire decking per level ───
    for (let lvl = 1; lvl <= levels; lvl++) {
      const y = lvl * levelH;
      const deckW = bayW - uprightW * 2 - 0.03;
      const deckD = depth - uprightD * 2 - 0.02;

      // Wire deck frame
      addMesh(group, new THREE.BoxGeometry(deckW, 0.005, deckD), deckMat, [bayOffset, y - 0.003, 0]);

      // Wire channels (cross wires)
      const numWires = Math.floor(deckW / 0.05);
      for (let w = 0; w < numWires; w++) {
        const wx = bayOffset - deckW / 2 + (w + 0.5) * (deckW / numWires);
        addMesh(group, new THREE.BoxGeometry(0.003, 0.02, deckD - 0.02), deckMat, [wx, y + 0.008, 0]);
      }

      // Support channels (length-wise)
      for (let c = 0; c < 3; c++) {
        const cz = -deckD / 2 + (c + 0.5) * (deckD / 3);
        addMesh(group, new THREE.BoxGeometry(deckW, 0.025, 0.008), deckMat, [bayOffset, y + 0.01, cz]);
      }
    }

    // ─── Diagonal bracing on sides (X-pattern) ───
    for (const x of uprightXs.slice(startIdx)) {
      for (let lvl = 0; lvl < levels; lvl++) {
        const y1 = lvl * levelH + (lvl === 0 ? 0.04 : 0);
        const y2 = (lvl + 1) * levelH - beamH;
        const midY = (y1 + y2) / 2;
        const segH = y2 - y1;
        const diagD = depth - uprightD * 2;
        const braceLen = Math.sqrt(segH * segH + diagD * diagD);
        const braceAngle = Math.atan2(segH, diagD);

        // X-brace pattern
        addMesh(group, new THREE.BoxGeometry(0.022, braceLen, 0.01), braceMat,
          [x, midY, 0], [braceAngle, 0, 0]);
        addMesh(group, new THREE.BoxGeometry(0.022, braceLen, 0.01), braceMat,
          [x, midY, 0], [-braceAngle, 0, 0]);
      }
    }

    // ─── Optional pallets inside rack (visual) ───
    if (params.showPallets !== false) {
      for (let lvl = 1; lvl <= levels; lvl++) {
        const y = lvl * levelH;
        // Pallet on each level (EUR 1200x800)
        const palW = Math.min(1.2, bayW - 0.2);
        const palD = Math.min(0.8, depth - 0.15);
        addMesh(group, new THREE.BoxGeometry(palW, 0.14, palD), palletMat,
          [bayOffset, y + 0.07 + 0.025, 0]);
      }
    }
  }

  // ─── Safety end protectors (yellow) ───
  for (const x of [-totalBayWidth / 2 - 0.05, totalBayWidth / 2 + 0.05]) {
    addMesh(group, new THREE.BoxGeometry(0.08, 0.4, depth + 0.1), safetyMat, [x, 0.2, 0]);
  }

  // ─── Ports for alignment ───
  const ports = [
    { id: 'left', type: 'output' as const, localPosition: [-totalBayWidth / 2 - 0.005, totalH / 2, 0] as [number, number, number], direction: [-1, 0, 0] as [number, number, number] },
    { id: 'right', type: 'input' as const, localPosition: [totalBayWidth / 2 + 0.005, totalH / 2, 0] as [number, number, number], direction: [1, 0, 0] as [number, number, number] },
    { id: 'floor', type: 'input' as const, localPosition: [0, 0, 0] as [number, number, number], direction: [0, -1, 0] as [number, number, number] },
  ];
  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

export function stairsBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1200) / 1000;
  const stepCount = params.stepCount ?? 12;
  const stepH = (params.stepHeight ?? 180) / 1000;
  const stepD = (params.stepDepth ?? 280) / 1000;

  const group = new THREE.Group();
  const stepMat = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, metalness: 0.7, roughness: 0.3 });
  const stringerMat = new THREE.MeshStandardMaterial({ color: 0x4a4a4a, metalness: 0.8, roughness: 0.3 });

  const totalH = stepCount * stepH;
  const totalD = stepCount * stepD;

  // Steps
  for (let i = 0; i < stepCount; i++) {
    const y = (i + 1) * stepH;
    const z = i * stepD;
    // Tread
    addMesh(group, new THREE.BoxGeometry(w, 0.005, stepD), stepMat, [0, y, z]);
    // Riser
    addMesh(group, new THREE.BoxGeometry(w, stepH, 0.005), stepMat, [0, y - stepH / 2, z - stepD / 2]);
  }

  // Stringers (side plates)
  const stringerLen = Math.sqrt(totalH * totalH + totalD * totalD);
  const stringerAngle = Math.atan2(totalH, totalD);
  for (const side of [-1, 1]) {
    addMesh(group, new THREE.BoxGeometry(0.01, 0.15, stringerLen), stringerMat,
      [side * (w / 2 + 0.005), totalH / 2, totalD / 2 - stepD / 2], [stringerAngle, 0, 0]);
  }

  const ports = [
    { id: 'bottom', type: 'input' as const, localPosition: [0, 0.005, -stepD / 2 - 0.005] as [number, number, number], direction: [0, 0, -1] as [number, number, number] },
    { id: 'top', type: 'output' as const, localPosition: [0, totalH, totalD - stepD / 2 + 0.005] as [number, number, number], direction: [0, 0, 1] as [number, number, number] },
  ];
  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Fence Builder ───
export function fenceBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 3000) / 1000;
  const h = (params.height ?? 2000) / 1000;
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: '#ffcc00', metalness: 0.6, roughness: 0.3 });
  const meshMat = new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.7, roughness: 0.3, wireframe: false, transparent: true, opacity: 0.8 });

  const postR = 0.025;
  const numPosts = Math.max(2, Math.ceil(w / 1.5) + 1);
  const spacing = w / (numPosts - 1);

  // Posts
  for (let i = 0; i < numPosts; i++) {
    const x = -w / 2 + i * spacing;
    addMesh(group, new THREE.CylinderGeometry(postR, postR, h, 8), postMat, [x, h / 2, 0]);
    // Base plate
    addMesh(group, new THREE.BoxGeometry(0.1, 0.01, 0.1), postMat, [x, 0.005, 0]);
  }
  // Top rail
  addMesh(group, new THREE.CylinderGeometry(0.015, 0.015, w, 8), postMat, [0, h, 0], [0, 0, Math.PI / 2]);
  // Mid rail
  addMesh(group, new THREE.CylinderGeometry(0.012, 0.012, w, 8), postMat, [0, h / 2, 0], [0, 0, Math.PI / 2]);
  // Mesh panel
  addMesh(group, new THREE.BoxGeometry(w, h - 0.1, 0.005), meshMat, [0, h / 2, 0]);

  const ports = [
    { id: 'left', type: 'output' as const, localPosition: [-w / 2 - 0.005, h / 2, 0] as [number, number, number], direction: [-1, 0, 0] as [number, number, number] },
    { id: 'right', type: 'input' as const, localPosition: [w / 2 + 0.005, h / 2, 0] as [number, number, number], direction: [1, 0, 0] as [number, number, number] },
  ];
  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Fence Gate Builder ───
export function fenceGateBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1200) / 1000;
  const h = (params.height ?? 2000) / 1000;
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: '#ffcc00', metalness: 0.6, roughness: 0.3 });
  const gateMat = new THREE.MeshStandardMaterial({ color: '#999999', metalness: 0.5, roughness: 0.4, transparent: true, opacity: 0.8 });

  // Left + right posts
  addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, h + 0.1, 8), postMat, [-w / 2, (h + 0.1) / 2, 0]);
  addMesh(group, new THREE.CylinderGeometry(0.03, 0.03, h + 0.1, 8), postMat, [w / 2, (h + 0.1) / 2, 0]);
  // Gate panel
  addMesh(group, new THREE.BoxGeometry(w - 0.08, h - 0.1, 0.02), gateMat, [0, h / 2, 0]);
  // Handle
  addMesh(group, new THREE.BoxGeometry(0.02, 0.12, 0.04), postMat, [w / 2 - 0.08, h / 2, 0.03]);

  const ports = [
    { id: 'left', type: 'output' as const, localPosition: [-w / 2 - 0.005, h / 2, 0] as [number, number, number], direction: [-1, 0, 0] as [number, number, number] },
    { id: 'right', type: 'input' as const, localPosition: [w / 2 + 0.005, h / 2, 0] as [number, number, number], direction: [1, 0, 0] as [number, number, number] },
  ];
  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Bollard Builder ───
export function bollardBuilder(params: Record<string, any>): BuilderResult {
  const h = (params.height ?? 900) / 1000;
  const r = (params.diameter ?? 150) / 2000;
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#ffcc00', metalness: 0.6, roughness: 0.3 });
  const topMat = new THREE.MeshStandardMaterial({ color: '#ff0000', metalness: 0.5, roughness: 0.4 });
  addMesh(group, new THREE.CylinderGeometry(r, r, h, 12), mat, [0, h / 2, 0]);
  addMesh(group, new THREE.SphereGeometry(r * 1.1, 12, 8), topMat, [0, h, 0]);
  addMesh(group, new THREE.BoxGeometry(r * 3, 0.02, r * 3), mat, [0, 0.01, 0]);
  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Operator Station Builder ───
export function operatorStationBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 1200) / 1000;
  const d = (params.depth ?? 800) / 1000;
  const h = 0.9;
  const group = new THREE.Group();
  const deskMat = new THREE.MeshStandardMaterial({ color: '#c0c0c0', metalness: 0.5, roughness: 0.4 });
  const legMat = new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.7, roughness: 0.3 });
  // Desktop
  addMesh(group, new THREE.BoxGeometry(w, 0.03, d), deskMat, [0, h, 0]);
  // Legs
  for (const [x, z] of [[-w/2+0.04, -d/2+0.04], [w/2-0.04, -d/2+0.04], [-w/2+0.04, d/2-0.04], [w/2-0.04, d/2-0.04]]) {
    addMesh(group, new THREE.BoxGeometry(0.04, h, 0.04), legMat, [x, h / 2, z]);
  }
  // Monitor
  addMesh(group, new THREE.BoxGeometry(0.4, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: '#222222', metalness: 0.5, roughness: 0.3 }), [0, h + 0.2, -d / 4]);
  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Electrical Cabinet Builder ───
export function electricalCabinetBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 800) / 1000;
  const d = (params.depth ?? 500) / 1000;
  const h = (params.height ?? 2000) / 1000;
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: '#d4d4d4', metalness: 0.5, roughness: 0.4 });
  const doorMat = new THREE.MeshStandardMaterial({ color: '#c8c8c8', metalness: 0.6, roughness: 0.3 });
  // Body
  addMesh(group, new THREE.BoxGeometry(w, h, d), bodyMat, [0, h / 2, 0]);
  // Door lines
  addMesh(group, new THREE.BoxGeometry(0.005, h - 0.04, 0.001), doorMat, [0, h / 2, d / 2 + 0.001]);
  // Handle
  addMesh(group, new THREE.BoxGeometry(0.02, 0.1, 0.02), new THREE.MeshStandardMaterial({ color: '#333333' }), [w / 4, h / 2, d / 2 + 0.01]);
  // Warning label
  addMesh(group, new THREE.BoxGeometry(0.12, 0.12, 0.001), new THREE.MeshStandardMaterial({ color: '#ffcc00' }), [0, h * 0.7, d / 2 + 0.002]);
  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Tower Light Builder ───
export function towerLightBuilder(params: Record<string, any>): BuilderResult {
  const h = (params.height ?? 1500) / 1000;
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#555555', metalness: 0.7, roughness: 0.3 });
  addMesh(group, new THREE.CylinderGeometry(0.02, 0.02, h * 0.7, 8), poleMat, [0, h * 0.35, 0]);
  // Light sections
  const colors = ['#22cc22', '#ffcc00', '#ff3333'];
  const lightR = 0.035;
  const lightH = 0.06;
  for (let i = 0; i < colors.length; i++) {
    const mat = new THREE.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 0.3 });
    addMesh(group, new THREE.CylinderGeometry(lightR, lightR, lightH, 12), mat, [0, h * 0.7 + lightH * i + lightH / 2, 0]);
  }
  // Base
  addMesh(group, new THREE.BoxGeometry(0.08, 0.02, 0.08), poleMat, [0, 0.01, 0]);
  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── HMI Stand Builder ───
export function hmiStandBuilder(params: Record<string, any>): BuilderResult {
  const h = (params.height ?? 1400) / 1000;
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: '#666666', metalness: 0.7, roughness: 0.3 });
  const screenMat = new THREE.MeshStandardMaterial({ color: '#1a1a2e', metalness: 0.3, roughness: 0.4 });
  // Pole
  addMesh(group, new THREE.CylinderGeometry(0.025, 0.03, h, 8), poleMat, [0, h / 2, 0]);
  // Screen
  addMesh(group, new THREE.BoxGeometry(0.3, 0.22, 0.04), screenMat, [0, h, 0.04]);
  // Base
  addMesh(group, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 12), poleMat, [0, 0.015, 0]);
  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Machine Enclosure Builder ───
export function machineEnclosureBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 2000) / 1000;
  const d = (params.depth ?? 1500) / 1000;
  const h = (params.height ?? 2200) / 1000;
  const group = new THREE.Group();
  const frameMat = new THREE.MeshStandardMaterial({ color: '#4a4a4a', metalness: 0.7, roughness: 0.3 });
  const panelMat = new THREE.MeshStandardMaterial({ color: '#e0e0e0', metalness: 0.3, roughness: 0.5, transparent: true, opacity: 0.3 });
  // Frame posts
  for (const [x, z] of [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]]) {
    addMesh(group, new THREE.BoxGeometry(0.04, h, 0.04), frameMat, [x, h / 2, z]);
  }
  // Top rails
  addMesh(group, new THREE.BoxGeometry(w, 0.03, 0.03), frameMat, [0, h, -d / 2]);
  addMesh(group, new THREE.BoxGeometry(w, 0.03, 0.03), frameMat, [0, h, d / 2]);
  addMesh(group, new THREE.BoxGeometry(0.03, 0.03, d), frameMat, [-w / 2, h, 0]);
  addMesh(group, new THREE.BoxGeometry(0.03, 0.03, d), frameMat, [w / 2, h, 0]);
  // Polycarbonate panels (3 sides)
  addMesh(group, new THREE.BoxGeometry(w, h - 0.1, 0.005), panelMat, [0, h / 2, -d / 2]);
  addMesh(group, new THREE.BoxGeometry(0.005, h - 0.1, d), panelMat, [-w / 2, h / 2, 0]);
  addMesh(group, new THREE.BoxGeometry(0.005, h - 0.1, d), panelMat, [w / 2, h / 2, 0]);

  const ports = [
    { id: 'input', type: 'input' as const, localPosition: [-w / 2 - 0.005, h * 0.4, 0] as [number, number, number], direction: [-1, 0, 0] as [number, number, number] },
    { id: 'output', type: 'output' as const, localPosition: [w / 2 + 0.005, h * 0.4, 0] as [number, number, number], direction: [1, 0, 0] as [number, number, number] },
  ];
  return { group, ports, bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Floor Zone Builder ───
export function floorZoneBuilder(params: Record<string, any>): BuilderResult {
  const w = (params.width ?? 3000) / 1000;
  const d = (params.depth ?? 3000) / 1000;
  const group = new THREE.Group();
  const color = params.zoneColor || '#3b82f6';
  const mat = new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 0.9, transparent: true, opacity: 0.3 });
  const borderMat = new THREE.MeshStandardMaterial({ color, metalness: 0, roughness: 0.5 });
  addMesh(group, new THREE.BoxGeometry(w, 0.005, d), mat, [0, 0.003, 0]);
  // Border lines
  const bW = 0.05;
  addMesh(group, new THREE.BoxGeometry(w, 0.008, bW), borderMat, [0, 0.004, -d / 2]);
  addMesh(group, new THREE.BoxGeometry(w, 0.008, bW), borderMat, [0, 0.004, d / 2]);
  addMesh(group, new THREE.BoxGeometry(bW, 0.008, d), borderMat, [-w / 2, 0.004, 0]);
  addMesh(group, new THREE.BoxGeometry(bW, 0.008, d), borderMat, [w / 2, 0.004, 0]);
  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}

// ─── Pallet Stack Builder ───
export function palletStackBuilder(params: Record<string, any>): BuilderResult {
  const count = params.stackCount ?? 5;
  const group = new THREE.Group();
  const palletMat = new THREE.MeshStandardMaterial({ color: '#b8955a', metalness: 0.1, roughness: 0.9 });
  const palH = 0.144;
  for (let i = 0; i < count; i++) {
    addMesh(group, new THREE.BoxGeometry(1.2, palH, 0.8), palletMat, [0, palH / 2 + i * palH, 0]);
  }
  return { group, ports: [], bounds: new THREE.Box3().setFromObject(group), pathLength: 0 };
}
