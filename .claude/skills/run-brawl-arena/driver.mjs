#!/usr/bin/env node
// Headless driver for "Don't Die — Battle Royale" (single-file canvas web app).
// Launches index.html in the bundled Chromium via Playwright, optionally drives
// through the menu flow into a live match, screenshots each stage, and fails the
// process if the page logs any console / runtime error.
//
// Usage (run from the repo root):
//   node .claude/skills/run-brawl-arena/driver.mjs                 # boot, shot the start screen
//   node .claude/skills/run-brawl-arena/driver.mjs --play          # drive into a Battle Royale match
//   node .claude/skills/run-brawl-arena/driver.mjs --play --mode horde
//   node .claude/skills/run-brawl-arena/driver.mjs --play --mode squad --out /tmp/shots
//
// Flags:
//   --play            click through name → mode → avatar → weapon → Drop In into gameplay
//   --mode <m>        br | horde | squad   (default: br)
//   --shoot           after the GET READY grace, hold-fire while sweeping aim (shows
//                     muzzle flash / tracers / casings, and may score a kill)
//   --seconds <n>     without --shoot: total wait after Drop In before the shot (default 3.4)
//                     with --shoot: seconds to hold-fire after the grace        (default 3.0)
//   --out <dir>       screenshot directory (default: ./.shots, which is gitignored)
//   --file <path>     index.html to load   (default: ./index.html)
//   --keep-open       leave the browser open (debugging); otherwise it closes
//
// Exit code 0 = booted and ran with no page errors; 1 = a console/runtime error fired.

import path from 'node:path';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// ---- args ----
const argv = process.argv.slice(2);
const has  = f => argv.includes(f);
const val  = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i+1] ? argv[i+1] : d; };
const play = has('--play');
const shoot = has('--shoot');
const seconds = parseFloat(val('--seconds', shoot ? '3.0' : '3.4'));
const mode = val('--mode', 'br');
const out  = path.resolve(val('--out', '.shots'));
const file = path.resolve(val('--file', 'index.html'));
const keep = has('--keep-open');

if (!fs.existsSync(file)) { console.error('index.html not found at', file); process.exit(2); }
fs.mkdirSync(out, { recursive: true });

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

if (play) {
  console.log('driving into a', mode, 'match …');
  await page.fill('#nameInput', 'driver').catch(() => {});
  await page.click(`[data-mode="${mode}"]`).catch(() => {});
  await page.click('#toAvatarBtn');            // Play  → avatar select
  await page.waitForTimeout(250);
  await page.click('#toWeaponBtn');            // Continue → weapon select
  await page.waitForTimeout(250);
  await shot('02-weapon');
  await page.click('#dropInBtn');              // Drop In → match starts (GRACE ≈ 2.6s)
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

if (netErrors.length) console.log(`\nnote: ${netErrors.length} resource-load failure(s) ignored (blocked CDN — game falls back to 2D)`);
console.log(errors.length ? `\nFAIL — ${errors.length} page error(s):` : '\nOK — no page errors.');
for (const e of errors) console.log('  • ' + e);
process.exit(errors.length ? 1 : 0);
