#!/usr/bin/env node
// Post-deploy smoke test: fetch the live production page and assert it actually
// serves the game — not a white screen, a Vercel error page, or a STALE deploy.
//   node scripts/smoke-prod.mjs                       # check https://last-pulse.vercel.app
//   node scripts/smoke-prod.mjs --url https://…       # check an alternate host (e.g. a preview)
//   node scripts/smoke-prod.mjs --no-version          # skip the local-vs-deployed version gate
//
// Exits 0 when every check passes, non-zero (with a diagnostic) on the first failure —
// so it can gate a Vercel Deploy Hook / cron / CI step. Unlike the headless driver this needs
// no browser: it inspects the served HTML for stable markers.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const args = process.argv.slice(2);
const url = (args.includes('--url') ? args[args.indexOf('--url') + 1] : '') || 'https://last-pulse.vercel.app';
const checkVersion = !args.includes('--no-version');
const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const fail = (msg) => { console.error(`✗ smoke FAILED for ${url}\n  ${msg}`); process.exit(1); };

// Pull the version the repo would deploy, so we can detect "prod is serving old code".
let localVersion = null;
try {
  localVersion = readFileSync(join(root, 'index.html'), 'utf8').match(/GAME_VERSION\s*=\s*'([^']+)'/)?.[1] ?? null;
} catch { /* running detached from the repo — version gate simply skipped below */ }

const t0 = Date.now();
let res, html;
try {
  res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'last-pulse-smoke/1.0' } });
  html = await res.text();
} catch (err) {
  fail(`request threw: ${err.message}`);
}
const ms = Date.now() - t0;

// 1) HTTP status
if (res.status !== 200) fail(`HTTP ${res.status} (expected 200)`);
// 2) It's the game, not an error/placeholder page
if (!/<title>Last Pulse<\/title>/.test(html)) fail(`missing <title>Last Pulse</title> — served an error/placeholder page?`);
// 3) The canvas stage is present (catches a broken/empty document)
if (!/id="game"/.test(html)) fail(`missing #game canvas stage — markup did not render`);
// 4) Deployed code is not stale relative to the repo
const deployedVersion = html.match(/GAME_VERSION\s*=\s*'([^']+)'/)?.[1] ?? null;
if (checkVersion && localVersion && deployedVersion && deployedVersion !== localVersion) {
  fail(`STALE deploy: prod serves v${deployedVersion} but repo is v${localVersion} — deployment did not update`);
}

console.log(`✓ smoke OK  ${url}  HTTP 200  v${deployedVersion ?? '?'}  ${(html.length / 1024).toFixed(0)}KB  ${ms}ms`);
