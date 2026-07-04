#!/usr/bin/env node
// ============================================================
//  shrink-glb-textures.mjs — downscale embedded GLB textures in place
//
//  Meshy remesh keeps the original full-res (≈4K) base-color PNG embedded in the
//  binary GLB chunk, so a decimated mesh still ships ~9MB — almost all of it texture.
//  Field billboards are rendered to a 256px sprite tile, so a 512px texture is plenty.
//  This rewrites each GLB's embedded images at a capped size (default 512), pulling
//  9MB → ~1MB with no visible loss at billboard scale, and NO Meshy credits.
//
//  Pure-local: parses the glTF JSON chunk, finds image bufferViews, re-encodes each
//  with `magick` (ImageMagick), and rebuilds the GLB container (JSON + BIN chunks,
//  4-byte aligned). Leaves geometry/animation untouched.
//
//  Importable: gen-meshy.mjs calls shrinkGlbTextures() in its download stage so
//  textures are capped at write time and the validate.mjs budget gate never fires.
//
//  Usage (CLI):
//    node scripts/shrink-glb-textures.mjs assets/meshy/emily-walk.glb [more.glb ...]
//    node scripts/shrink-glb-textures.mjs --max 512 assets/meshy/*.glb
// ============================================================
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const GLB_MAGIC = 0x46546c67, JSON_TYPE = 0x4e4f534a, BIN_TYPE = 0x004e4942;
const pad4 = n => (n + 3) & ~3;

// `magick` (ImageMagick) is the encoder. Missing on a bare CI box → we no-op rather than
// throw, so generation never hard-fails on an optional local tool (the budget gate still
// catches an un-shrunk file downstream).
let MAGICK = null;
function haveMagick() {
  if (MAGICK !== null) return MAGICK;
  try { execFileSync('magick', ['-version'], { stdio: 'ignore' }); MAGICK = 'magick'; }
  catch { try { execFileSync('convert', ['-version'], { stdio: 'ignore' }); MAGICK = 'convert'; } catch { MAGICK = false; } }
  return MAGICK;
}

// Downscale every embedded image in `file` to at most `max`px on its longest side, in place.
// Returns { before, after, images, texMaxPx, skipped } (bytes; texMaxPx = largest post-shrink
// texture dimension, used for drift metrics). No-ops (skipped:true) if there are no embedded
// images or ImageMagick isn't available.
export async function shrinkGlbTextures(file, max = 512) {
  const buf = await readFile(file);
  if (buf.readUInt32LE(0) !== GLB_MAGIC) return { skipped: true, reason: 'not a GLB' };

  let off = 12, jsonChunk = null, binChunk = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4), data = buf.subarray(off + 8, off + 8 + len);
    if (type === JSON_TYPE) jsonChunk = data; else if (type === BIN_TYPE) binChunk = data;
    off += 8 + len;
  }
  const json = JSON.parse(jsonChunk.toString('utf8'));
  if (!json.images?.length) return { skipped: true, reason: 'no embedded images', images: 0 };
  if (!haveMagick()) return { skipped: true, reason: 'ImageMagick not found', images: json.images.length };

  const views = json.bufferViews;
  const bin = Buffer.from(binChunk);
  const imgViews = new Map();      // bufferView index -> re-encoded Buffer
  let texMaxPx = 0;
  const tmp = await mkdtemp(path.join(tmpdir(), 'glbtex-'));
  for (const img of json.images) {
    if (img.bufferView == null) continue;
    const v = views[img.bufferView];
    const src = bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    const ext = (img.mimeType || 'image/png').includes('jpeg') ? 'jpg' : 'png';
    const inF = path.join(tmp, `i${img.bufferView}.${ext}`), outF = path.join(tmp, `o${img.bufferView}.${ext}`);
    await writeFile(inF, src);
    execFileSync(MAGICK, [inF, '-resize', `${max}x${max}>`, '-strip', outF]);
    const dim = execFileSync(MAGICK, ['identify', '-format', '%w %h', outF]).toString().trim().split(' ').map(Number);
    texMaxPx = Math.max(texMaxPx, dim[0] || 0, dim[1] || 0);
    imgViews.set(img.bufferView, await readFile(outF));
  }

  // Reassemble the binary buffer, remapping every bufferView offset (images shrank, so
  // everything after them shifts). Preserve source order; re-align each view to 4 bytes.
  const order = views.map((v, i) => ({ i, off: v.byteOffset || 0 })).sort((a, b) => a.off - b.off);
  const parts = [];
  let cursor = 0;
  for (const { i } of order) {
    const v = views[i];
    const bytes = imgViews.get(i) ?? bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength);
    const aligned = pad4(cursor);
    if (aligned > cursor) { parts.push(Buffer.alloc(aligned - cursor)); cursor = aligned; }
    v.byteOffset = cursor; v.byteLength = bytes.length;
    parts.push(Buffer.from(bytes)); cursor += bytes.length;
  }
  const newBin = Buffer.concat(parts);
  if (json.buffers?.[0]) json.buffers[0].byteLength = newBin.length;

  let newJson = Buffer.from(JSON.stringify(json), 'utf8');
  if (newJson.length % 4) newJson = Buffer.concat([newJson, Buffer.alloc(4 - (newJson.length % 4), 0x20)]);
  let binPad = newBin;
  if (binPad.length % 4) binPad = Buffer.concat([binPad, Buffer.alloc(4 - (binPad.length % 4))]);
  const total = 12 + 8 + newJson.length + 8 + binPad.length;
  const out = Buffer.alloc(total);
  out.writeUInt32LE(GLB_MAGIC, 0); out.writeUInt32LE(2, 4); out.writeUInt32LE(total, 8);
  let p = 12;
  out.writeUInt32LE(newJson.length, p); out.writeUInt32LE(JSON_TYPE, p + 4); newJson.copy(out, p + 8); p += 8 + newJson.length;
  out.writeUInt32LE(binPad.length, p); out.writeUInt32LE(BIN_TYPE, p + 4); binPad.copy(out, p + 8);

  await writeFile(file, out);
  return { before: buf.length, after: out.length, images: json.images.length, texMaxPx };
}

// ---------- CLI ----------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  let max = 512;
  const mi = args.indexOf('--max');
  if (mi !== -1) { max = parseInt(args[mi + 1], 10); args.splice(mi, 2); }
  if (!args.length) { console.error('usage: shrink-glb-textures.mjs [--max N] file.glb ...'); process.exit(2); }
  for (const f of args) {
    const r = await shrinkGlbTextures(f, max);
    if (r.skipped) console.log(`${path.basename(f)}: skipped (${r.reason})`);
    else console.log(`${path.basename(f)}: ${(r.before / 1e6).toFixed(1)}MB → ${(r.after / 1e6).toFixed(1)}MB (${r.images} img @ ${r.texMaxPx}px)`);
  }
}
