#!/usr/bin/env node
// Convenience validator: parse-check the <script> block, then remind to render.
//   node scripts/validate.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync, statSync } from 'node:fs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const out = execFileSync('node', [join(root, 'scripts', 'parse-check.mjs')], { encoding: 'utf8' }).trim();
  console.log(out);
} catch (err) {
  process.stderr.write((err.stdout?.toString() || '') + (err.stderr?.toString() || ''));
  process.exit(1);
}

// Gate on Meshy asset-manifest integrity — catches prompt-drift / orphaned task_ids before any
// spend. Skipped gracefully if the asset pipeline isn't present.
if (existsSync(join(root, 'assets', 'meshy', 'manifest.json'))) {
  try {
    const out = execFileSync('node', [join(root, 'scripts', 'gen-meshy.mjs'), '--lint'], { encoding: 'utf8' }).trim();
    console.log(out);
  } catch (err) {
    process.stderr.write((err.stdout?.toString() || '') + (err.stderr?.toString() || ''));
    process.exit(1);
  }
}
// Billboard-GLB budget gate — every model the game loads live on mobile is rendered to an offscreen
// sprite each frame. Raw textured Meshy meshes are ~500k tris / ~18MB, which blows the mobile memory
// budget and stalls the sprite loop (the very fallback that then HIDES the models). Fail commits that
// wire an oversized GLB before it ships. The shipped set comes from assets/meshy/loader.js (the
// auto-generated manifest loader index.html imports) — same resolution the game uses: characters load
// walk||preview, zombies load preview. Falls back to index.html's FALLBACK_FILES map if no loader.
{
  const MAX_MB = 4;          // per-GLB on-disk ceiling (Alex, the rigged reference, is ~2MB)
  const MAX_TRIS = 80000;    // per-GLB triangle ceiling for a field billboard
  const files = [];
  const loaderPath = join(root, 'assets', 'meshy', 'loader.js');
  if (existsSync(loaderPath)) {
    const src = readFileSync(loaderPath, 'utf8');
    const m = src.match(/export const MODELS\s*=\s*(\[[\s\S]*?\]);/);
    const models = m ? JSON.parse(m[1]) : [];
    for (const a of models) {
      if (a.status !== 'generated') continue;
      const rel = a.type === 'character' ? (a.walk || a.preview) : a.preview;
      if (rel) files.push('assets/meshy/' + rel);
    }
  } else {
    const html = readFileSync(join(root, 'index.html'), 'utf8');
    const block = (html.match(/const FALLBACK_FILES\s*=\s*\{([\s\S]*?)\}/) || [])[1] || '';
    files.push(...[...block.matchAll(/['"]([^'"]+\.glb)['"]/g)].map(x => x[1]));
  }
  const triCount = (file) => {
    const buf = readFileSync(file);
    if (buf.readUInt32LE(0) !== 0x46546c67) return null;         // 'glTF' magic
    const jsonLen = buf.readUInt32LE(12);
    const json = JSON.parse(buf.toString('utf8', 20, 20 + jsonLen));
    const acc = json.accessors || [];
    let tris = 0;
    for (const m of json.meshes || [])
      for (const p of m.primitives || []) {
        if ((p.mode ?? 4) !== 4) continue;                       // 4 = TRIANGLES
        if (p.indices != null) tris += (acc[p.indices]?.count || 0) / 3;
        else if (p.attributes?.POSITION != null) tris += (acc[p.attributes.POSITION]?.count || 0) / 3;
      }
    return Math.round(tris);
  };
  const over = [];
  for (const rel of files) {
    const abs = join(root, rel);
    if (!existsSync(abs)) { over.push(`${rel} — referenced by loader.js but missing on disk`); continue; }
    const mb = statSync(abs).size / 1e6;
    let tris = null; try { tris = triCount(abs); } catch { /* not a parseable GLB — size check still applies */ }
    if (mb > MAX_MB) over.push(`${rel} — ${mb.toFixed(1)}MB > ${MAX_MB}MB (remesh/decimate before shipping)`);
    if (tris != null && tris > MAX_TRIS) over.push(`${rel} — ${tris.toLocaleString()} tris > ${MAX_TRIS.toLocaleString()} (remesh before shipping)`);
  }
  if (over.length) { over.forEach(o => console.error('✗ GLB budget:', o)); process.exit(1); }
  console.log(`✓ GLB budget: ${files.length} billboard model(s) within ${MAX_MB}MB / ${MAX_TRIS.toLocaleString()} tris`);
}

// Name-drift gate — the in-game <title>, the README H1, and the GitHub repo name must agree, so
// the game's name can't silently fork across the three places it lives (as it did before the rename).
try {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const title = (html.match(/<title>([^<]+)<\/title>/) || [])[1]?.trim();
  const logo  = (html.match(/class="logo">([^<]+?)<small/) || [])[1]?.trim();
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const h1 = (readme.match(/^#\s+(?:🧟\s*)?(.+)$/m) || [])[1]?.trim();
  const norm = s => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const names = { title, logo, 'README H1': h1 };
  let repo = null;
  try { repo = JSON.parse(execFileSync('gh', ['repo', 'view', '--json', 'name'], { encoding: 'utf8' })).name; } catch { /* offline / no gh — skip repo check */ }
  const display = norm(title);
  const drift = [];
  for (const [k, v] of Object.entries(names)) if (norm(v) !== display) drift.push(`${k}="${v}" ≠ <title>="${title}"`);
  // repo name is a slug (last-pulse); compare slug-normalized
  if (repo && norm(repo) !== display) drift.push(`repo="${repo}" ≠ <title>="${title}" (slug)`);
  if (drift.length) { drift.forEach(d => console.error('✗ name drift:', d)); process.exit(1); }
  console.log(`✓ name consistent: "${title}"` + (repo ? ` (repo ${repo})` : ' (repo check skipped — no gh)'));
} catch (err) {
  console.error('✗ name-drift check failed:', err.message); process.exit(1);
}

// Version ↔ changelog coherence gate — the "Game Updated!" popup is driven by GAME_VERSION and
// CHANGELOG[0].v; if they drift, returning players see a version that doesn't match the notes (or
// no popup at all). Assert they agree so a bump can't ship half-done.
try {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const gv  = (html.match(/GAME_VERSION\s*=\s*'([^']+)'/) || [])[1];
  const clv = (html.match(/CHANGELOG\s*=\s*\[\s*\{\s*v:\s*'([^']+)'/) || [])[1];
  if (!gv || !clv) { console.error('✗ version gate: could not read GAME_VERSION / CHANGELOG[0].v'); process.exit(1); }
  if (gv !== clv) { console.error(`✗ version gate: GAME_VERSION='${gv}' ≠ CHANGELOG top v='${clv}' — bump both together`); process.exit(1); }
  console.log(`✓ version consistent: GAME_VERSION == CHANGELOG top (${gv})`);
} catch (err) { console.error('✗ version gate failed:', err.message); process.exit(1); }

// Horde-spawn reachability gate — every enemy kind defined in ZTYPES with a Horde-only flag must be
// reachable by a spawn path, or it's dead content (as spitter/bloater were: defined in v2.20.0 but
// hordeKind never returned them). Assert each is referenced by hordeKind (mix) or a makeZombie call.
try {
  const html = readFileSync(join(root, 'index.html'), 'utf8');
  const hkStart = html.indexOf('function hordeKind');
  const hkBody = hkStart >= 0 ? html.slice(hkStart, html.indexOf('\nfunction ', hkStart + 1)) : '';
  const inMix   = k => new RegExp(`['"]${k}['"]`).test(hkBody);
  const spawned = k => new RegExp(`makeZombie\\([^)]*['"]${k}['"]`).test(html);
  const gated = ['spitter', 'bloater', 'stalker', 'juggernaut'];
  const dead = gated.filter(k => new RegExp(`\\b${k}\\s*:\\s*\\{`).test(html) && !inMix(k) && !spawned(k));
  if (dead.length) { console.error('✗ horde-spawn gate: defined but never spawned →', dead.join(', ')); process.exit(1); }
  console.log(`✓ horde-spawn reachable: ${gated.join(', ')} all have a spawn path`);
} catch (err) { console.error('✗ horde-spawn gate failed:', err.message); process.exit(1); }

console.log('Next: render headless to verify visually (~430x932) with the bundled Chromium at');
console.log('  /opt/pw-browsers/chromium-1194/chrome-linux/chrome — see CLAUDE.md "Validation".');
