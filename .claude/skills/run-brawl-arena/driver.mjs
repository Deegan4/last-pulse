#!/usr/bin/env node
// Headless driver for "Don't Die — Battle Royale" (single-file canvas web app).
// Launches index.html in the bundled Chromium via Playwright, optionally drives
// through the menu flow into a live match, screenshots each stage, and fails the
// process if the page logs any console / runtime error.
//
// Usage (run from the repo root):
//   node .claude/skills/run-brawl-arena/driver.mjs                 # boot, shot the start screen
//   node .claude/skills/run-brawl-arena/driver.mjs --play          # drive into a match
//   node .claude/skills/run-brawl-arena/driver.mjs --play --shoot --out /tmp/shots
//   node .claude/skills/run-brawl-arena/driver.mjs --waves 15 --runs 5 --json .shots/waves.json
//
// Flags:
//   --play            click through name → fighter → weapon → Drop In into gameplay
//   --mode <m>        validated against the MODES list parsed out of index.html (default: the
//                     first entry). BR & Squads were retired in v2.33.0 — passing a retired mode
//                     is a hard error rather than a silent no-op click.
//   --shoot           after the GET READY grace, hold-fire while sweeping aim (shows
//                     muzzle flash / tracers / casings, and may score a kill)
//   --seconds <n>     without --shoot: total wait after Drop In before the shot (default 3.4)
//                     with --shoot: seconds to hold-fire after the grace        (default 3.0)
//   --out <dir>       screenshot directory (default: ./.shots, which is gitignored)
//   --file <path>     index.html to load   (default: ./index.html)
//   --keep-open       leave the browser open (debugging); otherwise it closes
//   --waves <n>       BALANCE/PERF HARNESS: play Horde with a scripted kiting bot until the player
//                     dies or wave <n> is reached, then print a JSON report (wave reached, time to
//                     death, damage-taken rate, peak entity/particle/decal counts, min FPS).
//                     Implies --play --mode horde. Runs against a THROWAWAY instrumented copy of
//                     index.html (a `window.__m` hook is injected before the IIFE close) so the
//                     shipped file never carries a hook — see CLAUDE.md "Validation".
//   --json <path>     with --waves: also write the JSON report to a file (default: stdout only)
//   --runs <n>        with --waves: repeat the run n times and report per-run + aggregate (default 1)
//
// Exit code 0 = booted and ran with no page errors; 1 = a console/runtime error fired.

import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { pathToFileURL } from 'node:url';

// ---- args ----
const argv = process.argv.slice(2);
const has  = f => argv.includes(f);
const val  = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i+1] ? argv[i+1] : d; };
const waves = has('--waves') ? parseInt(val('--waves', '15'), 10) : 0;
const play = has('--play') || waves > 0;
const shoot = has('--shoot');
const seconds = parseFloat(val('--seconds', shoot ? '3.0' : '3.4'));
const out  = path.resolve(val('--out', '.shots'));
const jsonOut = val('--json', null);
const runs = Math.max(1, parseInt(val('--runs', '1'), 10));
let   file = path.resolve(val('--file', 'index.html'));
const keep = has('--keep-open');

if (!fs.existsSync(file)) { console.error('index.html not found at', file); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

// ---- modes come from the GAME, not from this file's assumptions ----
// The driver used to hardcode `br | horde | squad` and default to 'br'. When v2.33.0 retired BR and
// Squads the mode screen disappeared, so the driver's `[data-mode=…]` click silently no-op'd (it is
// wrapped in .catch) and every documented smoke-test command was quietly wrong. Parse MODES instead.
const MODES = (() => {
  const m = fs.readFileSync(file, 'utf8').match(/const MODES\s*=\s*\[([^\]]*)\]/);
  return m ? [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]) : ['horde'];
})();
const mode = val('--mode', MODES[0]);
if (!MODES.includes(mode)) {
  console.error(`✗ unknown mode '${mode}'. index.html ships: ${MODES.join(', ')}`);
  process.exit(2);
}

// ---- balance harness: build a throwaway instrumented copy (never mutate the shipped file) ----
// The game is one IIFE, so its state (player, zombies, particles, splats, hordeWave …) is closure-
// scoped and unreachable from Playwright. Inject a read-only sampler before the IIFE's closing
// `})();` in a temp copy — this is the documented hook pattern, and the copy is deleted after.
let tmpFile = null;
if (waves > 0) {
  const src = fs.readFileSync(file, 'utf8');
  const HOOK = `
/* === injected by driver.mjs --waves (throwaway copy only) === */
window.__m = function(){
  var z = null, zd = 1e9;
  for (var i=0;i<zombies.length;i++){ var q=zombies[i]; if(!q.alive) continue;
    var d=Math.hypot(q.x-player.x, q.y-player.y); if(d<zd){ zd=d; z=q; } }
  var aliveZ=0; for (var j=0;j<zombies.length;j++) if(zombies[j].alive) aliveZ++;
  return { t: elapsed, wave: hordeWave, alive: !!(player&&player.alive), hp: player?player.hp:0,
           maxhp: player?player.maxhp:0, x: player?player.x:0, y: player?player.y:0,
           mag: player?player.mag:0, reloading: player?player.reloading:0,
           kills: player?player.kills:0, dmgTaken: matchStat?matchStat.dmgTaken:0,
           grace: grace, ended: ended, zombies: aliveZ, zArr: zombies.length,
           particles: particles.length, floaters: floaters.length, splats: splats.length,
           threat: z ? { dx: z.x-player.x, dy: z.y-player.y, d: zd } : null,
           arena: ARENA };
};
`;
  // FIRST `})();\n</script>` = the game IIFE. (lastIndexOf would land in the second, module
  // script — the 3D layer — where none of the game state is in scope.)
  const idx = src.indexOf('\n})();\n</script>');
  if (idx < 0) { console.error('could not locate the game IIFE close to inject the metrics hook'); process.exit(2); }
  tmpFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'lp-drv-')), 'index.html');
  fs.writeFileSync(tmpFile, src.slice(0, idx) + HOOK + src.slice(idx));
  // the game loads sibling assets (assets/img/*) relative to the document — symlink them in
  for (const dir of ['assets']) {
    const from = path.join(path.dirname(file), dir);
    if (fs.existsSync(from)) { try { fs.symlinkSync(from, path.join(path.dirname(tmpFile), dir)); } catch {} }
  }
  file = tmpFile;
}

// ---- resolve Playwright (installed, or the container's global node_modules) ----
async function loadChromium() {
  const globalRoot = path.join(path.dirname(path.dirname(process.execPath)), 'lib', 'node_modules');
  const tries = ['playwright',
    path.join(globalRoot, 'playwright', 'index.mjs'),
    path.join(globalRoot, 'playwright-core', 'index.js')];
  for (const t of tries) {
    try { const m = await import(t); const c = m.chromium || m.default?.chromium; if (c) return c; } catch {}
  }
  throw new Error('Could not load Playwright. Tried:\n  ' + tries.join('\n  '));
}

// ---- find the bundled Chromium binary (version dir is not pinned) ----
function findChrome() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) return process.env.CHROME_BIN;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(root)) {
      if (!d.startsWith('chromium-') || d.includes('headless_shell')) continue;
      const bin = path.join(root, d, 'chrome-linux', 'chrome');
      if (fs.existsSync(bin)) return bin;
    }
  } catch {}
  return undefined; // let Playwright fall back to its own resolution
}

const chromium = await loadChromium();
const executablePath = findChrome();
const errors = [];

const browser = await chromium.launch({
  executablePath,
  args: ['--disable-gpu', '--no-sandbox', '--use-gl=swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
// Resource-load failures (CDN blocked in sandboxes) are expected — the game is designed to
// fall back to 2D without the optional 3D assets. Report them, but don't fail the run.
const netErrors = [];
page.on('console', m => { if (m.type() === 'error') {
  (/Failed to load resource|net::ERR_/.test(m.text()) ? netErrors : errors).push('console: ' + m.text()); } });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));

const shot = async name => {
  const p = path.join(out, name + '.png');
  await page.screenshot({ path: p });
  console.log('  shot →', p);
};

console.log('loading', pathToFileURL(file).href);
await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
await page.waitForTimeout(700);
await shot('01-start');

// ---- drive the menus into a match (shared by --play and --waves) ----
// Flow as of v2.33.0: start → fighter → weapon → Drop In. There is NO mode screen any more —
// #toModeBtn (still named that) now goes straight to fighter select, and #toAvatarBtn is gone.
// Each step is asserted so a future menu change fails loudly instead of screenshotting a menu.
async function enterMatch() {
  await page.fill('#nameInput', 'driver').catch(() => {});
  await page.click('#toModeBtn');                                  // ▶ PLAY → fighter select
  await page.waitForSelector('#avatarScreen:not(.hidden)', { timeout: 5000 });
  await page.click('#toWeaponBtn');                                // Continue → weapon select
  await page.waitForSelector('#weaponScreen:not(.hidden)', { timeout: 5000 });
  await shot('02-weapon');
  await page.click('#dropInBtn');                                  // Drop In → match starts (GRACE ≈ 2.6s)
  await page.waitForSelector('#weaponScreen.hidden', { timeout: 5000 });
}

// ---- balance/perf harness ----
// A scripted KITING bot: back away from the nearest zombie (biased toward the arena centre so it
// doesn't pin itself on a wall), keep the crosshair on that zombie, hold fire, reload when dry.
// This is deliberately competent — the old --shoot bot stands still and dies in wave 1-2, which is
// no signal at all about whether v2.21.0's wave curve is fair.
async function runWaveTrial(runIdx) {
  await enterMatch();
  await page.waitForTimeout(2800);                       // fire() is blocked while grace > 0
  const CX = 215, CY = 466;                              // screen centre = the player (camera follows)
  const held = new Set();
  const setKeys = async want => {
    for (const k of [...held]) if (!want.has(k)) { await page.keyboard.up(k); held.delete(k); }
    for (const k of want) if (!held.has(k)) { await page.keyboard.down(k); held.add(k); }
  };
  await page.keyboard.down('Space');
  const samples = [];
  const t0 = Date.now();
  const LIMIT_MS = 1000 * 60 * 6;                        // hard stop so a stuck run can't hang CI
  let m = null, peak = { zombies: 0, particles: 0, floaters: 0, splats: 0 }, minFps = 999;
  while (Date.now() - t0 < LIMIT_MS) {
    m = await page.evaluate(() => (window.__m ? window.__m() : null));
    if (!m) break;
    const fps = parseFloat(await page.evaluate(() => (document.getElementById('statFps')?.textContent || '0')));
    if (fps > 0) minFps = Math.min(minFps, fps);
    for (const k of Object.keys(peak)) peak[k] = Math.max(peak[k], m[k]);
    samples.push({ t: +m.t.toFixed(1), wave: m.wave, hp: Math.round(m.hp), kills: m.kills,
                   dmgTaken: Math.round(m.dmgTaken), zombies: m.zombies,
                   particles: m.particles, splats: m.splats, fps });
    if (!m.alive || m.ended || m.wave > waves) break;
    if (m.mag <= 0 && !m.reloading) await page.keyboard.press('r');
    // aim at the threat; flee along the reverse vector, pulled toward the arena centre
    const th = m.threat;
    const ax = th ? th.dx : 1, ay = th ? th.dy : 0;
    const al = Math.hypot(ax, ay) || 1;
    await page.mouse.move(CX + (ax / al) * 150, CY + (ay / al) * 150);
    let fx = -ax / al, fy = -ay / al;
    const toC = Math.hypot(m.arena / 2 - m.x, m.arena / 2 - m.y);
    if (toC > m.arena * 0.28) { fx += (m.arena / 2 - m.x) / toC * 1.3; fy += (m.arena / 2 - m.y) / toC * 1.3; }
    const want = new Set();
    if (fy < -0.35) want.add('w'); if (fy > 0.35) want.add('s');
    if (fx < -0.35) want.add('a'); if (fx > 0.35) want.add('d');
    await setKeys(want);
    await page.waitForTimeout(120);
  }
  await page.keyboard.up('Space');
  await setKeys(new Set());
  await shot(runs > 1 ? `04-waves-run${runIdx}` : '04-waves');
  const last = samples[samples.length - 1] || {};
  const secs = m ? m.t : 0;
  return {
    run: runIdx,
    waveReached: last.wave || 0,
    survivedSec: +secs.toFixed(1),
    kills: last.kills || 0,
    died: m ? !m.alive : true,
    dmgTakenPerMin: secs > 0 ? +((last.dmgTaken || 0) / secs * 60).toFixed(1) : 0,
    peak, minFps: minFps === 999 ? null : minFps,
    samples,
  };
}

if (waves > 0) {
  console.log(`balance harness: horde, kiting bot, target wave ${waves}, ${runs} run(s) …`);
  const results = [];
  for (let i = 1; i <= runs; i++) {
    if (i > 1) { await page.goto(pathToFileURL(file).href, { waitUntil: 'load' }); await page.waitForTimeout(700); }
    const r = await runWaveTrial(i);
    console.log(`  run ${i}: wave ${r.waveReached}, ${r.survivedSec}s, ${r.kills} kills, ` +
                `${r.dmgTakenPerMin} dmg/min, peak ${r.peak.zombies}z/${r.peak.particles}p/${r.peak.splats}splat, min ${r.minFps} fps`);
    results.push(r);
  }
  const agg = k => results.map(r => r[k]).sort((a, b) => a - b);
  const med = a => a.length ? a[a.length >> 1] : 0;
  const report = {
    config: { targetWave: waves, runs, viewport: '430x932' },
    // NOTE: headless is software-rendered (--disable-gpu) so minFps is a pessimistic lower bound,
    // NOT the on-phone number. Use it for regressions between runs, never as an absolute.
    summary: {
      waveReached: { median: med(agg('waveReached')), all: results.map(r => r.waveReached) },
      survivedSec: { median: med(agg('survivedSec')), all: results.map(r => r.survivedSec) },
      dmgTakenPerMin: { median: med(agg('dmgTakenPerMin')), all: results.map(r => r.dmgTakenPerMin) },
      peakZombies: Math.max(...results.map(r => r.peak.zombies)),
      peakParticles: Math.max(...results.map(r => r.peak.particles)),
      peakSplats: Math.max(...results.map(r => r.peak.splats)),
      minFps: Math.min(...results.map(r => r.minFps ?? 999)),
    },
    runs: results,
  };
  const txt = JSON.stringify(report, null, 2);
  if (jsonOut) { fs.writeFileSync(path.resolve(jsonOut), txt); console.log('  report →', path.resolve(jsonOut)); }
  else console.log(txt);
} else if (play) {
  console.log('driving into a', mode, 'match …');
  await enterMatch();
  if (shoot) {
    await page.waitForTimeout(2700);           // fire() is blocked while grace > 0 — wait it out
    console.log(`  holding fire for ${seconds}s, sweeping aim …`);
    await page.keyboard.down('Space');         // desktop fire is keys[' '] (held)
    const ms = Math.max(400, Math.round(seconds * 1000));
    const steps = Math.max(1, Math.round(ms / 400));
    for (let i = 0; i < steps; i++) {          // sweep the mouse so aim rotates and sprays the field
      const a = (i / steps) * Math.PI * 2;
      await page.mouse.move(215 + Math.cos(a) * 160, 466 + Math.sin(a) * 230);
      await page.waitForTimeout(ms / steps);
    }
    await page.keyboard.up('Space');
  } else {
    await page.waitForTimeout(Math.round(seconds * 1000)); // wait past grace so play is live
  }
  await shot('03-match');
  const hud = await page.evaluate(() => {
    const t = id => (document.getElementById(id)?.textContent || '').trim();
    return { players: t('statPlayers'), lblPlayers: t('lblPlayers'), safe: t('statSafe'),
             lblSafe: t('lblSafe'), kills: t('statKills'), fps: t('statFps') };
  });
  console.log('  HUD:', JSON.stringify(hud));
}

if (!keep) await browser.close();
// the instrumented copy is throwaway — never let a hooked index.html linger where it could be copied back
if (tmpFile && !keep) { try { fs.rmSync(path.dirname(tmpFile), { recursive: true, force: true }); } catch {} }

if (netErrors.length) console.log(`\nnote: ${netErrors.length} resource-load failure(s) ignored (blocked CDN — game falls back to 2D)`);
console.log(errors.length ? `\nFAIL — ${errors.length} page error(s):` : '\nOK — no page errors.');
for (const e of errors) console.log('  • ' + e);
process.exit(errors.length ? 1 : 0);
