#!/usr/bin/env node
// screens.mjs — does the game fit EVERY iPhone, in every engine we can drive?
//
// Every browser on iOS (Safari, Chrome, Firefox, Edge, Brave) is WebKit under App Store rules,
// so WebKit is the engine that actually decides whether this ships. Chromium is run too because
// it catches generic layout mistakes early and covers Android/desktop for free.
//
// Headless browsers cannot emulate env(safe-area-inset-*), so the notch/home-indicator path —
// the one that has broken repeatedly — is forced via the ?insets=TOP,BOTTOM test hook.
//
//   node scripts/screens.mjs               # all devices, both engines
//   node scripts/screens.mjs --shots       # also write .shots/fit/<device>-<engine>.png
//   node scripts/screens.mjs --engine=webkit
//   node scripts/screens.mjs --device="iPhone SE"
//
// Exit code is non-zero if any assertion fails, so it can gate a release.

import { webkit, chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, join, normalize } from 'node:path';
import { mkdirSync, createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Serve over HTTP rather than file://. Under file:// every asset fetch is a null-origin CORS
// failure, which buries real console errors under noise the phone will never see.
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.css': 'text/css' };
const server = createServer((req, res) => {
  const rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  const path = join(ROOT, rel === '/' ? 'index.html' : rel);
  try {
    if (!statSync(path).isFile()) throw new Error('not a file');
    res.writeHead(200, { 'content-type': TYPES[path.slice(path.lastIndexOf('.'))] || 'application/octet-stream' });
    createReadStream(path).pipe(res);
  } catch { res.writeHead(404).end('not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const PAGE = `http://127.0.0.1:${server.address().port}/index.html`;

const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = k => { const a = argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : null; };
const SHOTS = has('--shots');

// Portrait CSS-pixel sizes and real safe-area insets, oldest supported phone → newest.
// insets are [top, bottom]: a bare status bar is 20/0; notch 44–48/34; Dynamic Island 59/34.
const DEVICES = [
  { name: 'iPhone SE (2/3rd gen)', w: 375, h: 667, dpr: 2, insets: [20, 0] },
  { name: 'iPhone 13 mini',        w: 375, h: 812, dpr: 3, insets: [50, 34] },
  { name: 'iPhone 12/13/14',       w: 390, h: 844, dpr: 3, insets: [47, 34] },
  { name: 'iPhone 15/16',          w: 393, h: 852, dpr: 3, insets: [59, 34] },
  { name: 'iPhone 16 Pro',         w: 402, h: 874, dpr: 3, insets: [62, 34] },
  { name: 'iPhone 14 Plus',        w: 428, h: 926, dpr: 3, insets: [47, 34] },
  { name: 'iPhone 16 Plus',        w: 430, h: 932, dpr: 3, insets: [59, 34] },
  { name: 'iPhone 16 Pro Max',     w: 440, h: 956, dpr: 3, insets: [62, 34] },
];

// Two extra modes per phone. Landscape swaps w/h and moves the notch to a side inset, which is
// why the top inset drops to a thin status strip. Safari-tab loses ~inches to browser chrome.
function modesFor(d) {
  const [st, sb] = d.insets;
  return [
    { mode: 'standalone', w: d.w, h: d.h, insets: [st, sb] },
    { mode: 'safari-tab', w: d.w, h: d.h - 145, insets: [st ? 0 : 0, sb ? 21 : 0] },
    { mode: 'landscape',  w: d.h, h: d.w, insets: [st ? 0 : 0, sb ? 21 : 0] },
  ];
}

const ENGINES = { webkit, chromium };
const wanted = val('engine');
const deviceFilter = val('device');

const results = [];

for (const [engineName, engine] of Object.entries(ENGINES)) {
  if (wanted && wanted !== engineName) continue;
  const browser = await engine.launch();

  for (const d of DEVICES) {
    if (deviceFilter && !d.name.toLowerCase().includes(deviceFilter.toLowerCase())) continue;

    for (const m of modesFor(d)) {
      const ctx = await browser.newContext({
        viewport: { width: m.w, height: m.h },
        deviceScaleFactor: d.dpr,
        isMobile: true,
        hasTouch: true,
      });
      const page = await ctx.newPage();

      const errors = [];
      page.on('console', e => { if (e.type() === 'error') errors.push(e.text()); });
      page.on('pageerror', e => errors.push(String(e)));

      const url = `${PAGE}?insets=${m.insets[0]},${m.insets[1]}`;
      await page.goto(url, { waitUntil: 'load' });
      // resize() re-runs on a 200/600/1500ms schedule to outlast iOS viewport settling;
      // wait past the last sweep or we measure a layout the real device would never keep.
      await page.waitForTimeout(1700);

      const probe = await page.evaluate(() => {
        const vw = window.innerWidth, vh = window.innerHeight;
        const cs = getComputedStyle(document.documentElement);
        const sat = parseFloat(cs.getPropertyValue('--sat')) || 0;
        const sab = parseFloat(cs.getPropertyValue('--sab')) || 0;
        const stage = document.getElementById('game').getBoundingClientRect();
        const cv = document.querySelector('canvas');
        const cvr = cv.getBoundingClientRect();

        // every control the player must be able to see and hit right now
        const controls = [...document.querySelectorAll('button,[role="button"],.btn')]
          .filter(el => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'
              && s.opacity !== '0' && el.offsetParent !== null;
          })
          .map(el => {
            const r = el.getBoundingClientRect();
            return { id: el.id || el.className || el.textContent.trim().slice(0, 18),
                     x: r.x, y: r.y, w: r.width, h: r.height };
          });

        return {
          vw, vh, sat, sab,
          scrollY: window.scrollY || document.documentElement.scrollTop || 0,
          stage: { top: stage.top, left: stage.left, w: stage.width, h: stage.height },
          canvas: { top: cvr.top, w: cvr.width, h: cvr.height, bw: cv.width, bh: cv.height },
          scrollW: document.documentElement.scrollWidth,
          scrollH: document.documentElement.scrollHeight,
          controls,
          fit: typeof fitChecks === 'function' ? fitChecks() : null,
        };
      });

      const fails = [];
      const [wantSt, wantSb] = m.insets;

      // 1. the insets the game APPLIED must be the ones the device reports. If --sat is 0 on a
      //    notched phone the HUD sits under the clock; if it is too big the field is letterboxed.
      if (Math.abs(probe.sat - wantSt) > 1) fails.push(`--sat ${probe.sat} != ${wantSt}`);
      if (Math.abs(probe.sab - wantSb) > 1) fails.push(`--sab ${probe.sab} != ${wantSb}`);

      // 2. the stage must be pulled up under the status bar and extended by both insets, so the
      //    canvas paints the notch strip instead of the page background (the "black bar" bug).
      if (Math.abs(probe.stage.top + probe.scrollY + wantSt) > 1.5)
        fails.push(`stage top ${probe.stage.top.toFixed(1)} != ${-wantSt}`);
      if (probe.stage.h < probe.vh + wantSt + wantSb - 1.5)
        fails.push(`stage h ${probe.stage.h.toFixed(1)} < viewport+insets ${probe.vh + wantSt + wantSb}`);
      if (Math.abs(probe.stage.w - probe.vw) > 1.5)
        fails.push(`stage w ${probe.stage.w.toFixed(1)} != ${probe.vw}`);

      // 3. the canvas backing store must match its CSS box × DPR, else the game renders soft
      //    or, when it collapses to 0, not at all.
      if (probe.canvas.bw < 1 || probe.canvas.bh < 1) fails.push('canvas backing store is 0');
      const expectW = Math.floor(probe.canvas.w * Math.min(d.dpr, 2));
      if (Math.abs(probe.canvas.bw - expectW) > 2)
        fails.push(`canvas backing ${probe.canvas.bw} != css*dpr ${expectW}`);

      // 4. nothing may scroll — this is a fixed-viewport game. On iOS a scrollable document also
      //    means the player can rubber-band the whole game off screen mid-match.
      if (probe.scrollW > probe.vw + 1) fails.push(`h-scroll ${probe.scrollW} > ${probe.vw}`);
      if (Math.abs(probe.scrollY) > 0.5) fails.push(`page scrolled ${probe.scrollY.toFixed(1)}px — document is not locked`);

      // 5. every visible control must be fully on screen, outside the notch and home indicator,
      //    and big enough to hit. 44pt is Apple's minimum touch target.
      for (const c of probe.controls) {
        if (c.x < -1 || c.y < -1 || c.x + c.w > probe.vw + 1 || c.y + c.h > probe.vh + 1)
          fails.push(`control "${c.id}" off screen (${Math.round(c.x)},${Math.round(c.y)} ${Math.round(c.w)}x${Math.round(c.h)})`);
        else if (c.y < wantSt - 1)
          fails.push(`control "${c.id}" under the notch (y ${Math.round(c.y)} < ${wantSt})`);
        else if (c.y + c.h > probe.vh - wantSb + 1)
          fails.push(`control "${c.id}" under the home indicator (bottom ${Math.round(c.y + c.h)} > ${probe.vh - wantSb})`);
        else if (c.w < 40 || c.h < 40)
          fails.push(`control "${c.id}" too small to tap (${Math.round(c.w)}x${Math.round(c.h)})`);
      }

      if (errors.length) fails.push(...errors.slice(0, 3).map(e => `console: ${e.slice(0, 90)}`));

      const label = `${d.name} · ${m.mode} · ${engineName}`;
      results.push({ label, size: `${m.w}x${m.h}`, fails });
      console.log(`${fails.length ? '✗' : '✓'} ${label.padEnd(46)} ${`${m.w}x${m.h}`.padEnd(9)}${fails.length ? ' ' + fails[0] : ''}`);
      for (const f of fails.slice(1)) console.log(`    ${f}`);

      if (SHOTS) {
        mkdirSync(join(ROOT, '.shots', 'fit'), { recursive: true });
        const slug = `${d.name}-${m.mode}-${engineName}`.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
        await page.screenshot({ path: join(ROOT, '.shots', 'fit', `${slug}.png`) });
      }
      await ctx.close();
    }
  }
  await browser.close();
}

const bad = results.filter(r => r.fails.length);
console.log(`\n${results.length - bad.length}/${results.length} configurations fit.`);
if (bad.length) {
  console.log(`\nFailing:\n${bad.map(b => `  ${b.label} (${b.size})\n${b.fails.map(f => `    · ${f}`).join('\n')}`).join('\n')}`);
  process.exit(1);
}
