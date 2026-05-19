#!/usr/bin/env node
// Headless playtest: open BRAWL ARENA.html in a Chromium and capture a
// screenshot + console log after a short settle. Tries puppeteer first
// (auto-bundles Chromium); falls back to puppeteer-core with the system
// Chrome if puppeteer isn't installed.
//
// Usage:
//   node headless-play.mjs [--seconds=2] [--press=Enter]
//
// Output:
//   .claude/skills/playtest/out/last.png
//   .claude/skills/playtest/out/last-console.txt
//
// If neither puppeteer flavour is reachable, the script prints a hint
// pointing at the Playwright MCP and exits non-zero — the recommended
// path for agents that have the MCP enabled.

import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..', 'out');
const target = resolve(here, '..', '..', '..', '..', 'BRAWL ARENA.html');
mkdirSync(outDir, { recursive: true });

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  })
);
const seconds = Number(args.seconds ?? 2);
const pressKey = args.press;

let puppeteer;
try { puppeteer = (await import('puppeteer')).default; }
catch {
  try { puppeteer = (await import('puppeteer-core')).default; }
  catch {
    console.error('Neither puppeteer nor puppeteer-core is installed.');
    console.error('Recommended: use the Playwright MCP (browser_navigate + browser_take_screenshot).');
    console.error('Or install locally: npm i -g puppeteer');
    process.exit(2);
  }
}

const launchOpts = { headless: 'new' };
// puppeteer-core needs an executablePath; try common macOS Chrome locations.
if (puppeteer?.executablePath === undefined) {
  launchOpts.executablePath =
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
}

const browser = await puppeteer.launch(launchOpts);
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });

const consoleLines = [];
page.on('console', msg => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', err => consoleLines.push(`[pageerror] ${err.message}`));

await page.goto(pathToFileURL(target).href, { waitUntil: 'load' });

if (pressKey) await page.keyboard.press(pressKey);

await new Promise(r => setTimeout(r, seconds * 1000));

const shotPath = resolve(outDir, 'last.png');
await page.screenshot({ path: shotPath, fullPage: false });

const logPath = resolve(outDir, 'last-console.txt');
writeFileSync(logPath, consoleLines.join('\n'));

await browser.close();

console.log(`screenshot: ${shotPath}`);
console.log(`console log: ${logPath} (${consoleLines.length} lines)`);
if (consoleLines.some(l => l.startsWith('[pageerror]'))) {
  console.error('runtime errors detected — see console log');
  process.exit(1);
}
