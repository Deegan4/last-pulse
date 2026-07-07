#!/usr/bin/env node
// ============================================================
//  gen-meshy.mjs — Last Pulse asset pipeline driver
//
//  Reads assets/meshy/manifest.json and, for every asset still
//  status:"queued", drives Meshy text-to-3d → poll → download GLB,
//  then writes task_id + status:"generated" back to the manifest
//  (idempotent: rerunning only picks up what's still queued).
//
//  Characters additionally go through a rig stage, gated on an
//  actual face-count read from the downloaded GLB (<= 300k, the
//  meshy_rig hard limit). Per-batch it asserts the credit balance
//  delta matches the summed task cost and aborts on divergence.
//
//  Usage:
//    MESHY_API_KEY=msy_... node scripts/gen-meshy.mjs            # full run
//    node scripts/gen-meshy.mjs --dry-run                        # plan only, no spend
//    node scripts/gen-meshy.mjs --only alex,rifle                # subset
//    node scripts/gen-meshy.mjs --no-rig                         # skip rigging
//    node scripts/gen-meshy.mjs --screenshot                     # headless sprite PNGs (needs viewer server + a browser)
//
//  Prompts come from manifest entries' `prompt` field if present,
//  else are rebuilt from PROMPTS.md-style suffixes below.
// ============================================================

import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { statSync } from 'node:fs';
import path from 'node:path';
import { shrinkGlbTextures } from './shrink-glb-textures.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR  = path.join(ROOT, 'assets', 'meshy');
const MANIFEST = path.join(DIR, 'manifest.json');
const API = 'https://api.meshy.ai/openapi';
const KEY = process.env.MESHY_API_KEY;

const args = process.argv.slice(2);
const has  = f => args.includes(f);
const valOf = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const DRY        = has('--dry-run');
const NO_RIG     = has('--no-rig');
const SCREENSHOT = has('--screenshot');
const REFINE     = has('--refine');      // add PBR textures to generated previews
const RUBRIC     = has('--rubric');      // score generated GLBs, flag re-rolls
const LINT       = has('--lint');        // manifest/prompt drift check (pure, no spend) — used by validate.mjs
const LOADER     = has('--emit-loader'); // regenerate loader.js from manifest (pure)
const ONLY = (valOf('--only') || '').split(',').filter(Boolean);

const AI_MODEL = 'meshy-5', TOPOLOGY = 'quad', POLY = 30000;
const TEX_CAP = 512;   // embedded-texture cap (px, longest side) applied to every downloaded model GLB

// Style suffixes (mirror PROMPTS.md) — used only if an asset has no explicit `prompt`.
const CHAR_SUFFIX = 'chibi cartoon style, big head small body, low-poly game asset, clean topology, flat saturated colors, bold simple shapes, smooth matte surfaces, T-pose, full body, white background';
const WEAPON_SUFFIX = 'stylized cartoon game prop, low-poly, clean topology, flat saturated colors, bold chunky shapes, smooth matte surfaces, single object, white background';

const log  = (...a) => console.log(...a);
const warn = (...a) => console.warn('⚠ ', ...a);
const die  = (...a) => { console.error('✗ ', ...a); process.exit(1); };

// ---------- HTTP ----------
async function api(method, endpoint, body) {
  const res = await fetch(`${API}${endpoint}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) throw new Error(`${method} ${endpoint} → ${res.status}: ${text.slice(0, 300)}`);
  return json;
}

async function balance() {
  const j = await api('GET', '/v1/account/credit-balance').catch(() => null);
  // endpoint name varies; fall back to null so reconciliation is skipped gracefully
  return j && (j.balance ?? j.credits ?? null);
}

// Poll a task to terminal state with exponential backoff.
async function poll(getPath, label) {
  let delay = 5000;
  for (let i = 0; i < 80; i++) {
    const t = await api('GET', getPath);
    const st = t.status;
    if (st === 'SUCCEEDED') return t;
    if (st === 'FAILED' || st === 'CANCELED') throw new Error(`${label} ${st}: ${t.task_error?.message || ''}`);
    process.stdout.write(`\r  ${label}: ${st} ${t.progress ?? 0}%   `);
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay * 1.4, 30000);
  }
  throw new Error(`${label} timed out`);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

// ---------- GLB face count (parse glTF JSON chunk; count triangle indices) ----------
async function glbTriangleCount(file) {
  const buf = await readFile(file);
  if (buf.readUInt32LE(0) !== 0x46546c67) return null;        // 'glTF' magic
  const jsonLen = buf.readUInt32LE(12);
  const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
  const accessors = json.accessors || [];
  let tris = 0;
  for (const m of json.meshes || [])
    for (const p of m.primitives || []) {
      const mode = p.mode ?? 4;                                // 4 = TRIANGLES
      if (mode !== 4) continue;
      if (p.indices != null) tris += (accessors[p.indices]?.count || 0) / 3;
      else if (p.attributes?.POSITION != null) tris += (accessors[p.attributes.POSITION]?.count || 0) / 3;
    }
  return Math.round(tris);
}

// ---------- download a model GLB, cap its embedded textures, and return drift metrics ----------
// Every model GLB goes through here so textures are capped at write time (the validate.mjs budget
// gate then has nothing to catch) and we capture {tris, mb, imgTexPx} for the manifest — the three
// numbers that drift when Meshy changes its mesh/texture defaults across versions.
async function downloadModel(url, dest) {
  await download(url, dest);
  const shrink = await shrinkGlbTextures(dest, TEX_CAP);   // pure-local, no credits; no-ops if no textures / no magick
  const tris = await glbTriangleCount(dest);
  const mb = +(statSync(dest).size / 1e6).toFixed(2);
  const imgTexPx = shrink.skipped ? (shrink.images ? null : 0) : shrink.texMaxPx;
  return { tris, mb, imgTexPx };
}

function promptFor(a) {
  if (a.prompt) return a.prompt;
  if (a.type === 'weapon') return `${a.label} ${WEAPON_SUFFIX}`;
  return `${a.label} ${CHAR_SUFFIX}`;
}

// ---------- generate one asset ----------
async function generate(a) {
  const body = { mode: 'preview', prompt: promptFor(a), ai_model: AI_MODEL, topology: TOPOLOGY, target_polycount: POLY, should_remesh: true };
  const { result: taskId } = await api('POST', '/v2/text-to-3d', body);
  log(`  task ${taskId}`);
  const t = await poll(`/v2/text-to-3d/${taskId}`, a.id);
  const glb = t.model_urls?.glb;
  if (!glb) throw new Error('no glb in result');
  const dest = path.join(DIR, a.file);
  const m = await downloadModel(glb, dest);
  log(`\r  ✓ ${a.id} → ${a.file} (${m.tris?.toLocaleString()} tris, ${m.mb}MB, tex ${m.imgTexPx ?? '—'}px)   `);
  return { task_id: taskId, tris: m.tris, metrics: m };
}

// ---------- rig one character, gated on face count ----------
async function rig(a, tris) {
  if (tris != null && tris > 300000) { warn(`${a.id}: ${tris} tris > 300k — skipping rig, needs remesh first`); return null; }
  const { result: taskId } = await api('POST', '/v1/rigging', { input_task_id: a.task_id, height_meters: 1.5 });
  const t = await poll(`/v1/rigging/${taskId}`, `${a.id}:rig`);
  const rg = t.result || t;
  const rigged = rg.rigged_character_glb_url || rg.glb_url;
  const walk   = rg.basic_animations?.walking_glb_url;
  let walkMetrics = null;
  if (rigged) await downloadModel(rigged, path.join(DIR, `${a.id}-rigged.glb`));
  if (walk)   walkMetrics = await downloadModel(walk, path.join(DIR, `${a.id}-walk.glb`));  // the anim GLB actually shipped in-game
  log(`\r  ✓ ${a.id} rigged (walk+run` + (walkMetrics ? `, ${walkMetrics.mb}MB` : '') + `)                  `);
  return { rig_task_id: taskId, rigged: `${a.id}-rigged.glb`, anim: walk ? `${a.id}-walk.glb` : undefined,
           ...(walkMetrics ? { metrics: walkMetrics } : {}) };
}

// ---------- credit reconciliation ----------
async function reconcile(before, expectedCost, batchLabel) {
  if (before == null) { warn(`${batchLabel}: balance endpoint unavailable — skipping reconciliation`); return; }
  const after = await balance();
  if (after == null) return;
  const actual = before - after;
  if (actual !== expectedCost)
    die(`${batchLabel}: credit mismatch — expected −${expectedCost}, actual −${actual} (before ${before}, after ${after}). Aborting to avoid compounding a silent double-charge.`);
  log(`  ✓ credits reconciled: −${actual} (balance ${after})`);
}

// ---------- screenshot mode ----------
async function screenshot(mf) {
  // Drives an already-running viewer server (python3 -m http.server 8001) via a headless browser.
  // Kept dependency-light: uses Playwright if installed, else prints the manual fallback.
  let chromium;
  try { ({ chromium } = await import('playwright')); }
  catch { warn('playwright not installed. Manual fallback: open viewer.html, click 📸 per asset, or `npm i -D playwright`.'); return; }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  for (const a of mf.assets.filter(x => x.status === 'generated')) {
    await page.goto(`http://localhost:8001/assets/meshy/viewer.html#${a.id}`);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(DIR, `${a.id}-shot.png`) });
    log(`  📸 ${a.id}-shot.png`);
  }
  await browser.close();
}

// ---------- refine: add PBR textures to a generated preview ----------
async function refine(a) {
  const { result: taskId } = await api('POST', '/v2/text-to-3d', { mode: 'refine', preview_task_id: a.task_id, enable_pbr: true });
  const t = await poll(`/v2/text-to-3d/${taskId}`, `${a.id}:refine`);
  const glb = t.model_urls?.glb;
  let metrics = null;
  if (glb) metrics = await downloadModel(glb, path.join(DIR, a.file));   // textured GLB overwrites the preview mesh
  log(`\r  ✓ ${a.id} textured (PBR` + (metrics ? `, ${metrics.mb}MB tex ${metrics.imgTexPx ?? '—'}px` : '') + `)          `);
  return { refine_task_id: taskId, textured: true, ...(metrics ? { metrics } : {}) };
}

// ---------- rubric: snapshot a GLB and score it via a vision model ----------
// Renders a front view through the viewer (reusing --screenshot infra), then asks a vision
// model to score style/color/silhouette 0–2 each. Flags <8/10 for re-roll. No-op if the
// optional ANTHROPIC_API_KEY isn't set — falls back to leaving a 📸 for manual scoring.
async function rubric(mf) {
  let chromium; try { ({ chromium } = await import('playwright')); }
  catch { warn('rubric needs playwright for snapshots (`npm i -D playwright`). Skipping.'); return; }
  const VK = process.env.ANTHROPIC_API_KEY;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 768, height: 768 } });
  const flagged = [];
  for (const a of mf.assets.filter(x => x.status === 'generated' && !x.rubric)) {
    await page.goto(`http://localhost:8001/assets/meshy/viewer.html#${a.id}`);
    await page.waitForTimeout(2500);
    const shot = path.join(DIR, `${a.id}-shot.png`);
    await page.screenshot({ path: shot });
    if (!VK) { log(`  📸 ${a.id} (set ANTHROPIC_API_KEY to auto-score)`); continue; }
    const score = await scoreImage(shot, a, VK);
    a.rubric = score;
    log(`  ${score.total >= 8 ? '✓' : '⚑'} ${a.id}: ${score.total}/10  ${score.note || ''}`);
    if (score.total < 8) flagged.push(a.id);
    await writeFile(MANIFEST, JSON.stringify(mf, null, 2) + '\n');
  }
  await browser.close();
  if (flagged.length) warn(`re-roll candidates (<8/10): ${flagged.join(', ')} → delete their GLB + set status:"queued" and rerun.`);
  else if (VK) log('  all scored assets pass (≥8/10) ✓');
}
async function scoreImage(file, a, VK) {
  const b64 = (await readFile(file)).toString('base64');
  const sys = 'You score a single 3D game asset render 0–2 on each of: style (chibi cartoon, not realistic), color (matches the intended palette), silhouette (reads at thumbnail size), plus 2 each for rig-readiness and identity cue if a character. Reply ONLY compact JSON: {"style":n,"color":n,"silhouette":n,"identity":n,"total":n,"note":"<=8 words"}.';
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': VK, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200,
      system: sys,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: b64 } },
        { type: 'text', text: `Asset: ${a.label} (${a.type}). Intended: ${promptFor(a).slice(0, 120)}` },
      ] }] }),
  });
  const j = await res.json();
  try { return JSON.parse(j.content[0].text.match(/\{[\s\S]*\}/)[0]); }
  catch { return { total: 0, note: 'unparseable vision reply' }; }
}

// ---------- lint: manifest / prompt-drift check (pure, no spend) ----------
// Catches the bug class that bit during build: a queued asset with no prompt would have
// generated from its bare label. Also checks for dup ids, missing files on generated assets,
// and orphaned task_ids. Exits non-zero on any error so validate.mjs can gate on it.
async function lint() {
  const mf = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const errs = [], seen = new Set();
  for (const a of mf.assets) {
    if (!a.id || !a.type || !a.file) errs.push(`asset missing id/type/file: ${JSON.stringify(a).slice(0,60)}`);
    if (seen.has(a.id)) errs.push(`duplicate id: ${a.id}`); seen.add(a.id);
    if (!a.prompt) errs.push(`${a.id}: no prompt (would generate from bare label "${a.label}")`);
    if (a.status === 'generated') {
      if (!a.task_id) errs.push(`${a.id}: status generated but no task_id`);
      if (!existsSync(path.join(DIR, a.file))) errs.push(`${a.id}: generated but ${a.file} missing on disk`);
    }
    if (a.status === 'queued' && a.task_id) errs.push(`${a.id}: queued but has a task_id (orphaned?)`);
  }

  // Metric-drift gate — for each generated asset with recorded metrics, re-read the GLB on disk and
  // assert it still matches. Catches (a) a file swapped/re-remeshed out-of-band, and (b) a Meshy
  // version bump that silently changed mesh/texture defaults on regen. tris must match exactly;
  // mb within 5% (image re-encode is non-deterministic byte-for-byte); imgTexPx must not grow past
  // the cap (drift toward the un-shrunk 4K texture that bloats mobile).
  const TRI_BUDGET = 80000, MB_BUDGET = 4, TEX_BUDGET = 1024;
  let checked = 0;
  for (const a of mf.assets) {
    if (a.status !== 'generated' || !a.metrics) continue;
    const file = a.anim || a.file;                        // the GLB that actually ships in-game
    const abs = path.join(DIR, file);
    if (!existsSync(abs)) continue;                        // missing-file already flagged above
    checked++;
    const tris = await glbTriangleCount(abs);
    const mb = +(statSync(abs).size / 1e6).toFixed(2);
    const rec = a.metrics;
    if (rec.tris != null && tris !== rec.tris) errs.push(`${a.id}: tris drift — manifest ${rec.tris.toLocaleString()} vs disk ${tris.toLocaleString()} (${file})`);
    if (rec.mb != null && Math.abs(mb - rec.mb) / rec.mb > 0.05) errs.push(`${a.id}: size drift — manifest ${rec.mb}MB vs disk ${mb}MB (${file})`);
    if (tris > TRI_BUDGET) errs.push(`${a.id}: ${tris.toLocaleString()} tris > ${TRI_BUDGET.toLocaleString()} budget (${file})`);
    if (mb > MB_BUDGET) errs.push(`${a.id}: ${mb}MB > ${MB_BUDGET}MB budget (${file})`);
    if (rec.imgTexPx != null && rec.imgTexPx > TEX_BUDGET) errs.push(`${a.id}: texture ${rec.imgTexPx}px > ${TEX_BUDGET}px budget (${file})`);
  }

  if (errs.length) { errs.forEach(e => console.error('✗ manifest:', e)); process.exit(1); }
  log(`✓ manifest lint: ${mf.assets.length} assets, no drift (${mf.assets.filter(a=>a.prompt).length} prompts, ${mf.assets.filter(a=>a.status==='generated').length} generated, ${checked} metric-checked)`);
}

// ---------- emit loader.js: index-keyed model resolver for the 3D pivot ----------
async function emitLoader() {
  const mf = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const row = a => { const m = /(AVATARS|WEAPONS|ZTYPES)(?:\[(\d+)\]|\.(\w+))?/.exec(a.source || ''); return m ? { table: m[1], key: m[2] != null ? Number(m[2]) : m[3] } : null; };
  const entry = a => ({ id: a.id, type: a.type, table: row(a)?.table, key: row(a)?.key,
    preview: a.file, rigged: a.rigged || null, walk: a.anim || null, status: a.status });
  const data = mf.assets.map(entry);
  const out = `// AUTO-GENERATED by scripts/gen-meshy.mjs --emit-loader — do not edit by hand.
// Maps game-data rows (index.html AVATARS[n] / WEAPONS[n] / ZTYPES.kind) to Meshy model files,
// so the 3D pivot resolves a model by table+index instead of name-matching.
export const MODELS = ${JSON.stringify(data, null, 2)};
const byTableKey = new Map(MODELS.map(m => [m.table + ':' + m.key, m]));
export function modelFor(table, key){ return byTableKey.get(table + ':' + key) || null; }
export function riggedFor(table, key){ const m = modelFor(table, key); return m && (m.rigged || m.preview); }
`;
  await writeFile(path.join(DIR, 'loader.js'), out);
  log(`✓ wrote assets/meshy/loader.js (${data.length} entries, ${data.filter(d=>d.rigged).length} rigged)`);
}

// ============================================================
async function main() {
  if (LINT)   { await lint(); return; }
  if (LOADER) { await emitLoader(); return; }

  const mf0 = JSON.parse(await readFile(MANIFEST, 'utf8'));
  if (RUBRIC)     { await rubric(mf0); return; }

  if (!KEY && !DRY) die('MESHY_API_KEY not set (use --dry-run to plan without it).');
  const mf = JSON.parse(await readFile(MANIFEST, 'utf8'));

  if (SCREENSHOT) { await screenshot(mf); return; }

  let queue = mf.assets.filter(a => a.status === 'queued');
  if (ONLY.length) queue = queue.filter(a => ONLY.includes(a.id));

  const chars = queue.filter(a => a.type === 'character').length;
  const cost = queue.length * 5 + (NO_RIG ? 0 : chars * 5) + (REFINE ? queue.length * 10 : 0);
  log(`Plan: ${queue.length} assets to generate (${chars} characters)` + (NO_RIG ? '' : ` + ${chars} rigs`) + (REFINE ? ` + ${queue.length} PBR refines` : ''));
  log(`Estimated cost: ${cost} credits  (model ${AI_MODEL})`);
  if (!queue.length) { log('Nothing queued — manifest is complete. ✓'); return; }
  if (DRY) { log('\n--dry-run: no API calls made. Queue:'); queue.forEach(a => log(`  • ${a.id.padEnd(16)} ${a.type.padEnd(10)} "${promptFor(a).slice(0, 60)}…"`)); return; }

  const before = await balance();
  let spent = 0;

  for (const a of queue) {
    log(`\n▸ ${a.label} (${a.type})`);
    try {
      const strip = o => { const { metrics, ...rest } = o; return rest; };  // keep transient metrics out of the merged fields
      const g = await generate(a); spent += 5;
      a.task_id = g.task_id; a.status = 'generated';
      let metrics = g.metrics;                                             // metrics track the latest shippable GLB
      if (REFINE) { const x = await refine(a); spent += 10; Object.assign(a, strip(x)); metrics = x.metrics || metrics; }
      if (!NO_RIG && a.type === 'character') {
        const r = await rig(a, g.tris); spent += 5;
        if (r) { Object.assign(a, strip(r)); metrics = r.metrics || metrics; }  // walk-anim GLB is what ships
      }
      if (metrics) a.metrics = metrics;
      await writeFile(MANIFEST, JSON.stringify(mf, null, 2) + '\n');   // persist after every asset (resumable)
    } catch (e) { warn(`${a.id} failed: ${e.message}`); }
  }

  await reconcile(before, spent, 'full run');
  log(`\nDone. ${queue.length} processed, ${spent} credits spent.`);
}

main().catch(e => die(e.stack || e.message));
