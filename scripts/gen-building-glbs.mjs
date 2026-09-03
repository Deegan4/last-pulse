#!/usr/bin/env node
// Generate small, local low-poly GLB buildings used by the progressive 3D layer.
// Pure Node on purpose: this repo has no Blender/exporter dependency.

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'assets', 'buildings');

const MAT = {
  ink: [0.10, 0.14, 0.08, 1],
  shadow: [0.06, 0.08, 0.05, 1],
  houseWall: [0.86, 0.80, 0.69, 1],
  shopWall: [0.90, 0.86, 0.76, 1],
  barnWall: [0.69, 0.25, 0.20, 1],
  cabinWall: [0.70, 0.46, 0.25, 1],
  roofRed: [0.56, 0.24, 0.20, 1],
  roofBlue: [0.28, 0.34, 0.46, 1],
  roofBrown: [0.36, 0.25, 0.18, 1],
  roofGreen: [0.28, 0.42, 0.25, 1],
  glass: [0.48, 0.78, 0.90, 1],
  litGlass: [1.00, 0.78, 0.34, 1],
  door: [0.29, 0.21, 0.14, 1],
  trim: [0.88, 0.84, 0.76, 1],
  sign: [0.82, 0.62, 0.25, 1],
  awningRed: [0.88, 0.20, 0.22, 1],
  awningWhite: [0.96, 0.93, 0.86, 1],
  metal: [0.30, 0.31, 0.33, 1],
};

const assets = [
  { kind: 'house', file: 'building-house.glb', wall: 'houseWall', roof: 'roofRed' },
  { kind: 'shop', file: 'building-shop.glb', wall: 'shopWall', roof: 'roofBlue' },
  { kind: 'barn', file: 'building-barn.glb', wall: 'barnWall', roof: 'roofBrown', wide: true },
  { kind: 'cabin', file: 'building-cabin.glb', wall: 'cabinWall', roof: 'roofGreen' },
];

function vsub(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
function vcross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function vnorm(v) {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

function addFace(prim, verts) {
  const n = vnorm(vcross(vsub(verts[1], verts[0]), vsub(verts[2], verts[0])));
  const base = prim.pos.length / 3;
  for (const v of verts) { prim.pos.push(...v); prim.norm.push(...n); }
  for (let i = 1; i < verts.length - 1; i++) prim.idx.push(base, base + i, base + i + 1);
}

function addBox(prim, cx, cy, cz, sx, sy, sz) {
  const x0 = cx - sx / 2, x1 = cx + sx / 2;
  const y0 = cy - sy / 2, y1 = cy + sy / 2;
  const z0 = cz - sz / 2, z1 = cz + sz / 2;
  addFace(prim, [[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]]);
  addFace(prim, [[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]]);
  addFace(prim, [[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]);
  addFace(prim, [[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]]);
  addFace(prim, [[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0]]);
  addFace(prim, [[x0,y0,z0],[x1,y0,z0],[x1,y0,z1],[x0,y0,z1]]);
}

function addGableRoof(prim, w, d, y, h, over = 0.14) {
  const x0 = -w / 2 - over, x1 = w / 2 + over;
  const z0 = -d / 2 - over, z1 = d / 2 + over;
  const yc = y + h;
  addFace(prim, [[x0,y,z1],[x1,y,z1],[0,yc,z1]]);
  addFace(prim, [[x1,y,z0],[x0,y,z0],[0,yc,z0]]);
  addFace(prim, [[x0,y,z0],[0,yc,z0],[0,yc,z1],[x0,y,z1]]);
  addFace(prim, [[x1,y,z1],[0,yc,z1],[0,yc,z0],[x1,y,z0]]);
}

function makeScene(asset) {
  const prims = new Map();
  const p = name => {
    if (!prims.has(name)) prims.set(name, { material: name, pos: [], norm: [], idx: [] });
    return prims.get(name);
  };
  const w = asset.wide ? 2.55 : 2.0, d = asset.wide ? 1.35 : 1.45, wallH = asset.kind === 'barn' ? 1.0 : 0.9;

  addBox(p('shadow'), 0.06, 0.02, 0.07, w + 0.34, 0.04, d + 0.34);
  addBox(p(asset.wall), 0, wallH / 2, 0, w, wallH, d);
  addGableRoof(p(asset.roof), w, d, wallH, asset.kind === 'barn' ? 0.62 : 0.48);

  // Front door and windows read clearly in the 256px render tile used by the game.
  addBox(p('door'), 0, 0.28, d / 2 + 0.025, 0.28, 0.56, 0.05);
  if (asset.kind === 'shop') {
    addBox(p('glass'), 0, 0.52, d / 2 + 0.055, w - 0.42, 0.36, 0.055);
    for (let i = -3; i <= 3; i++) addBox(p(i % 2 ? 'awningWhite' : 'awningRed'), i * 0.18, 0.81, d / 2 + 0.09, 0.18, 0.16, 0.13);
    addBox(p('sign'), 0, 1.13, d / 2 + 0.08, 0.5, 0.22, 0.08);
  } else if (asset.kind === 'barn') {
    addBox(p('litGlass'), 0, 0.68, d / 2 + 0.055, 0.28, 0.22, 0.055);
    addBox(p('trim'), -0.46, 0.28, d / 2 + 0.06, 0.06, 0.62, 0.06);
    addBox(p('trim'), 0.46, 0.28, d / 2 + 0.06, 0.06, 0.62, 0.06);
    addBox(p('trim'), -0.46, 0.28, d / 2 + 0.065, 0.64, 0.06, 0.065);
    addBox(p('trim'), 0.46, 0.28, d / 2 + 0.065, 0.64, 0.06, 0.065);
  } else if (asset.kind === 'cabin') {
    for (let y = 0.18; y < 0.86; y += 0.16) addBox(p('roofBrown'), 0, y, d / 2 + 0.055, w + 0.05, 0.035, 0.055);
    addBox(p('glass'), -0.47, 0.54, d / 2 + 0.06, 0.28, 0.25, 0.06);
    addBox(p('glass'), 0.47, 0.54, d / 2 + 0.06, 0.28, 0.25, 0.06);
    addBox(p('metal'), w * 0.28, 1.25, -0.05, 0.12, 0.5, 0.12);
  } else {
    addBox(p('glass'), -0.52, 0.55, d / 2 + 0.055, 0.32, 0.28, 0.055);
    addBox(p('glass'), 0.52, 0.55, d / 2 + 0.055, 0.32, 0.28, 0.055);
    addBox(p('roofBrown'), w * 0.3, 1.2, -0.05, 0.18, 0.36, 0.18);
  }

  // Cartoon outline slabs around the footprint and roof ridge.
  addBox(p('ink'), 0, 0.04, d / 2 + 0.04, w + 0.08, 0.08, 0.055);
  addBox(p('ink'), -w / 2 - 0.02, 0.45, 0, 0.045, 0.9, d + 0.04);
  addBox(p('ink'), w / 2 + 0.02, 0.45, 0, 0.045, 0.9, d + 0.04);
  addBox(p('trim'), 0, wallH + (asset.kind === 'barn' ? 0.38 : 0.28), 0, 0.08, 0.06, d + 0.36);

  return [...prims.values()];
}

function f32(n) {
  const b = Buffer.alloc(n.length * 4);
  n.forEach((v, i) => b.writeFloatLE(v, i * 4));
  return b;
}
function u16(n) {
  const b = Buffer.alloc(n.length * 2);
  n.forEach((v, i) => b.writeUInt16LE(v, i * 2));
  return b;
}
function pad4(buf) {
  const pad = (4 - (buf.length % 4)) % 4;
  return pad ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf;
}
function padJson(buf) {
  const pad = (4 - (buf.length % 4)) % 4;
  return pad ? Buffer.concat([buf, Buffer.alloc(pad, 0x20)]) : buf;
}

function glb(asset) {
  const parts = [], bufferViews = [], accessors = [], meshes = [{ primitives: [] }];
  const materials = Object.keys(MAT).map(name => ({
    name,
    pbrMetallicRoughness: { baseColorFactor: MAT[name], metallicFactor: 0, roughnessFactor: 0.82 },
  }));
  const matIndex = Object.fromEntries(Object.keys(MAT).map((name, i) => [name, i]));

  for (const prim of makeScene(asset)) {
    if (!prim.pos.length) continue;
    const posMin = [Infinity, Infinity, Infinity], posMax = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < prim.pos.length; i += 3) {
      for (let a = 0; a < 3; a++) {
        posMin[a] = Math.min(posMin[a], prim.pos[i + a]);
        posMax[a] = Math.max(posMax[a], prim.pos[i + a]);
      }
    }

    const posBuf = pad4(f32(prim.pos)), normBuf = pad4(f32(prim.norm)), idxBuf = pad4(u16(prim.idx));
    const posView = bufferViews.length; bufferViews.push({ buffer: 0, byteOffset: byteLength(parts), byteLength: prim.pos.length * 4, target: 34962 }); parts.push(posBuf);
    const normView = bufferViews.length; bufferViews.push({ buffer: 0, byteOffset: byteLength(parts), byteLength: prim.norm.length * 4, target: 34962 }); parts.push(normBuf);
    const idxView = bufferViews.length; bufferViews.push({ buffer: 0, byteOffset: byteLength(parts), byteLength: prim.idx.length * 2, target: 34963 }); parts.push(idxBuf);

    const posAcc = accessors.length; accessors.push({ bufferView: posView, componentType: 5126, count: prim.pos.length / 3, type: 'VEC3', min: posMin, max: posMax });
    const normAcc = accessors.length; accessors.push({ bufferView: normView, componentType: 5126, count: prim.norm.length / 3, type: 'VEC3' });
    const idxAcc = accessors.length; accessors.push({ bufferView: idxView, componentType: 5123, count: prim.idx.length, type: 'SCALAR' });
    meshes[0].primitives.push({ attributes: { POSITION: posAcc, NORMAL: normAcc }, indices: idxAcc, material: matIndex[prim.material] });
  }

  const bin = Buffer.concat(parts);
  const json = padJson(Buffer.from(JSON.stringify({
    asset: { version: '2.0', generator: 'Last Pulse scripts/gen-building-glbs.mjs' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: asset.kind }],
    meshes,
    materials,
    buffers: [{ byteLength: bin.length }],
    bufferViews,
    accessors,
  })));

  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
  const jsonHead = Buffer.alloc(8); jsonHead.writeUInt32LE(json.length, 0); jsonHead.writeUInt32LE(0x4e4f534a, 4);
  const binHead = Buffer.alloc(8); binHead.writeUInt32LE(bin.length, 0); binHead.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jsonHead, json, binHead, bin]);
}

function byteLength(parts) {
  return parts.reduce((n, b) => n + b.length, 0);
}

await mkdir(OUT, { recursive: true });
for (const asset of assets) {
  const dest = path.join(OUT, asset.file);
  const buf = glb(asset);
  await writeFile(dest, buf);
  console.log(`${asset.kind.padEnd(5)} -> ${path.relative(ROOT, dest)} (${(buf.length / 1024).toFixed(1)} KiB)`);
}
