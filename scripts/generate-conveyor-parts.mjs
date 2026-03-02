import { Blob } from 'buffer';
import fs from 'fs';
import path from 'path';

// Polyfill browser APIs for Three.js GLTFExporter in Node
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class FileReader {
    readAsArrayBuffer(blob) {
      blob.arrayBuffer().then(ab => {
        this.result = ab;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
    readAsDataURL(blob) {
      blob.arrayBuffer().then(ab => {
        const b64 = Buffer.from(ab).toString('base64');
        const type = blob.type || 'application/octet-stream';
        this.result = `data:${type};base64,${b64}`;
        if (this.onload) this.onload({ target: this });
        if (this.onloadend) this.onloadend({ target: this });
      });
    }
  };
}
if (typeof globalThis.Blob === 'undefined') {
  globalThis.Blob = Blob;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElementNS: (ns, tag) => {
      if (tag === 'canvas') {
        return { width: 0, height: 0, getContext: () => null, toDataURL: () => '' };
      }
      return {};
    },
  };
}

import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

// Materials
const mat = (color, metalness, roughness) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness });

const FRAME = () => mat(0x4a4a4a, 0.8, 0.3);
const BELT = () => mat(0x1a1a1a, 0.05, 0.95);
const MOTOR = () => mat(0x2563eb, 0.6, 0.4);
const DRUM = () => mat(0x888888, 0.9, 0.15);
const YELLOW = () => mat(0xffcc00, 0.3, 0.5);
const DARK = () => mat(0x333333, 0.85, 0.25);
const LEGS = () => mat(0x555555, 0.7, 0.3);
const PAD = () => mat(0x222222, 0.5, 0.6);
const ROLLER_MAT = () => mat(0x999999, 0.9, 0.2);
const SHAFT_MAT = () => mat(0x666666, 0.8, 0.3);
const SPROCKET = () => mat(0x444444, 0.85, 0.25);
const TERMINAL = () => mat(0x444444, 0.7, 0.4);

function mesh(geo, material, pos, rot) {
  const m = new THREE.Mesh(geo, material);
  if (pos) m.position.set(pos[0], pos[1], pos[2]);
  if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
  return m;
}

function cChannel(length, side, z, y) {
  // C-channel: web + top flange + bottom flange
  const g = new THREE.Group();
  const channelH = 0.08, flangeW = 0.04;
  g.add(mesh(new THREE.BoxGeometry(length, channelH, 0.005), FRAME(), [0, y - channelH/2, z]));
  g.add(mesh(new THREE.BoxGeometry(length, 0.005, flangeW), FRAME(), [0, y, z]));
  g.add(mesh(new THREE.BoxGeometry(length, 0.005, flangeW), FRAME(), [0, y - channelH, z]));
  return g;
}

// ---- BELT PARTS ----

function headSection() {
  const scene = new THREE.Scene();
  const w = 1; // 1m width
  const h = 0.2; // frame height ref
  // Drive drum
  scene.add(mesh(new THREE.CylinderGeometry(0.06, 0.06, w + 0.02, 16), DRUM(), [0, 0, 0], [0, 0, Math.PI/2]));
  // Motor housing
  scene.add(mesh(new THREE.BoxGeometry(0.2, 0.15, 0.15), MOTOR(), [0.02, -0.05, w/2 + 0.1]));
  // Motor shaft
  scene.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), DRUM(), [0, 0, w/2 + 0.03], [Math.PI/2, 0, 0]));
  // Bearing blocks
  for (const s of [-1, 1])
    scene.add(mesh(new THREE.BoxGeometry(0.08, 0.06, 0.06), DARK(), [0, 0, s * (w/2 + 0.025)]));
  // End plate
  scene.add(mesh(new THREE.BoxGeometry(0.01, 0.2, w + 0.04), FRAME(), [0.15, -0.08, 0]));
  // Side frame C-channels
  for (const s of [-1, 1]) {
    const z = s * (w/2 + 0.02);
    scene.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.005), FRAME(), [-0.05, -0.04, z]));
    scene.add(mesh(new THREE.BoxGeometry(0.3, 0.005, 0.04), FRAME(), [-0.05, 0, z]));
    scene.add(mesh(new THREE.BoxGeometry(0.3, 0.005, 0.04), FRAME(), [-0.05, -0.08, z]));
  }
  return scene;
}

function tailSection() {
  const scene = new THREE.Scene();
  const w = 1;
  // Tail drum
  scene.add(mesh(new THREE.CylinderGeometry(0.05, 0.05, w + 0.02, 16), DRUM(), [0, 0, 0], [0, 0, Math.PI/2]));
  // Tension adjustment blocks
  for (const s of [-1, 1])
    scene.add(mesh(new THREE.BoxGeometry(0.06, 0.04, 0.05), FRAME(), [0, -0.02, s * 0.3]));
  // End plate
  scene.add(mesh(new THREE.BoxGeometry(0.01, 0.2, w + 0.04), FRAME(), [-0.15, -0.08, 0]));
  // Side frame C-channels
  for (const s of [-1, 1]) {
    const z = s * (w/2 + 0.02);
    scene.add(mesh(new THREE.BoxGeometry(0.3, 0.08, 0.005), FRAME(), [0.05, -0.04, z]));
    scene.add(mesh(new THREE.BoxGeometry(0.3, 0.005, 0.04), FRAME(), [0.05, 0, z]));
    scene.add(mesh(new THREE.BoxGeometry(0.3, 0.005, 0.04), FRAME(), [0.05, -0.08, z]));
  }
  return scene;
}

function midSection() {
  const scene = new THREE.Scene();
  const w = 1, len = 0.5;
  // Side C-channels
  for (const s of [-1, 1]) {
    const z = s * (w/2 + 0.02);
    scene.add(mesh(new THREE.BoxGeometry(len, 0.08, 0.005), FRAME(), [0, -0.04, z]));
    scene.add(mesh(new THREE.BoxGeometry(len, 0.005, 0.04), FRAME(), [0, 0, z]));
    scene.add(mesh(new THREE.BoxGeometry(len, 0.005, 0.04), FRAME(), [0, -0.08, z]));
  }
  // Cross brace
  scene.add(mesh(new THREE.BoxGeometry(0.03, 0.03, w + 0.08), FRAME(), [0, -0.1, 0]));
  // Slider bed rails
  for (const s of [-1, 1])
    scene.add(mesh(new THREE.BoxGeometry(len, 0.003, 0.02), FRAME(), [0, 0.002, s * (w/2 - 0.05)]));
  return scene;
}

function supportLeg() {
  const scene = new THREE.Scene();
  const w = 1, legH = 0.7;
  // Two vertical posts
  for (const s of [-1, 1]) {
    scene.add(mesh(new THREE.BoxGeometry(0.06, legH, 0.06), LEGS(), [0, -legH/2, s * (w/2 + 0.02)]));
    scene.add(mesh(new THREE.BoxGeometry(0.1, 0.01, 0.1), PAD(), [0, -legH, s * (w/2 + 0.02)]));
  }
  // Cross brace
  scene.add(mesh(new THREE.BoxGeometry(0.03, 0.03, w + 0.08), LEGS(), [0, -legH * 0.6, 0]));
  // Top cross member
  scene.add(mesh(new THREE.BoxGeometry(0.05, 0.05, w + 0.08), LEGS(), [0, -0.025, 0]));
  return scene;
}

function beltSurface() {
  const scene = new THREE.Scene();
  // Main belt
  scene.add(mesh(new THREE.BoxGeometry(1, 0.005, 1), BELT(), [0, 0, 0]));
  // Cleats/ribs every 100mm
  for (let i = -4; i <= 4; i++) {
    scene.add(mesh(new THREE.BoxGeometry(1, 0.002, 0.008), BELT(), [0, 0.0035, i * 0.1]));
  }
  return scene;
}

function sideGuide() {
  const scene = new THREE.Scene();
  // Rail
  scene.add(mesh(new THREE.BoxGeometry(1, 0.08, 0.003), YELLOW(), [0, 0.04, 0]));
  // Two bracket supports
  for (const x of [-0.3, 0.3]) {
    // Vertical part
    scene.add(mesh(new THREE.BoxGeometry(0.02, 0.08, 0.015), LEGS(), [x, 0.04, -0.008]));
    // Horizontal part (L)
    scene.add(mesh(new THREE.BoxGeometry(0.02, 0.005, 0.02), LEGS(), [x, 0, -0.01]));
  }
  return scene;
}

function motorUnit() {
  const scene = new THREE.Scene();
  // Motor body
  scene.add(mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.2, 16), MOTOR(), [0, 0, 0], [0, 0, Math.PI/2]));
  // Mounting plate
  scene.add(mesh(new THREE.BoxGeometry(0.2, 0.01, 0.2), DARK(), [0, -0.08, 0]));
  // Shaft
  scene.add(mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.1, 8), SHAFT_MAT(), [0.15, 0, 0], [0, 0, Math.PI/2]));
  // Terminal box
  scene.add(mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), TERMINAL(), [0, 0.09, 0]));
  return scene;
}

// ---- ROLLER PARTS ----

function rollerFrame() {
  const scene = new THREE.Scene();
  const w = 1, len = 0.5;
  for (const s of [-1, 1]) {
    const z = s * (w/2 + 0.02);
    scene.add(mesh(new THREE.BoxGeometry(len, 0.08, 0.005), FRAME(), [0, -0.04, z]));
    scene.add(mesh(new THREE.BoxGeometry(len, 0.005, 0.04), FRAME(), [0, 0, z]));
    scene.add(mesh(new THREE.BoxGeometry(len, 0.005, 0.04), FRAME(), [0, -0.08, z]));
  }
  scene.add(mesh(new THREE.BoxGeometry(0.03, 0.03, w + 0.08), FRAME(), [0, -0.1, 0]));
  return scene;
}

function roller() {
  const scene = new THREE.Scene();
  const w = 1;
  scene.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, w, 16), ROLLER_MAT(), [0, 0, 0], [0, 0, Math.PI/2]));
  // Shaft stubs
  for (const s of [-1, 1])
    scene.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), SHAFT_MAT(), [0, 0, s * (w/2 + 0.02)], [Math.PI/2, 0, 0]));
  return scene;
}

function drivenRoller() {
  const scene = new THREE.Scene();
  const w = 1;
  scene.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, w, 16), ROLLER_MAT(), [0, 0, 0], [0, 0, Math.PI/2]));
  for (const s of [-1, 1])
    scene.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 8), SHAFT_MAT(), [0, 0, s * (w/2 + 0.02)], [Math.PI/2, 0, 0]));
  // Sprocket on one end
  scene.add(mesh(new THREE.TorusGeometry(0.02, 0.005, 8, 16), SPROCKET(), [0, 0, w/2 + 0.04], [Math.PI/2, 0, 0]));
  return scene;
}

// ---- EXPORT ----

function exportGLB(scene, outputPath) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(scene, (result) => {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
      fs.writeFileSync(outputPath, Buffer.from(result));
      console.log(`  ✓ ${outputPath}`);
      resolve();
    }, (error) => reject(error), { binary: true });
  });
}

const BASE = 'frontend/public/models/parts';

const parts = [
  [`${BASE}/belt/head-section.glb`, headSection],
  [`${BASE}/belt/tail-section.glb`, tailSection],
  [`${BASE}/belt/mid-section.glb`, midSection],
  [`${BASE}/belt/support-leg.glb`, supportLeg],
  [`${BASE}/belt/belt-surface.glb`, beltSurface],
  [`${BASE}/belt/side-guide.glb`, sideGuide],
  [`${BASE}/belt/motor-unit.glb`, motorUnit],
  [`${BASE}/roller/roller-frame.glb`, rollerFrame],
  [`${BASE}/roller/roller.glb`, roller],
  [`${BASE}/roller/driven-roller.glb`, drivenRoller],
];

console.log('Generating conveyor GLB parts...');
for (const [outPath, builder] of parts) {
  await exportGLB(builder(), outPath);
}
console.log('Done! Generated', parts.length, 'parts.');
