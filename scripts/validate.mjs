#!/usr/bin/env node
// Convenience validator: parse-check the <script> block, then remind to render.
//   node scripts/validate.mjs
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  const out = execFileSync('node', [join(root, 'scripts', 'parse-check.mjs')], { encoding: 'utf8' }).trim();
  console.log(out);
} catch (err) {
  process.stderr.write((err.stdout?.toString() || '') + (err.stderr?.toString() || ''));
  process.exit(1);
}
console.log('Next: render headless to verify visually (~430x932) with the bundled Chromium at');
console.log('  /opt/pw-browsers/chromium-1194/chrome-linux/chrome — see CLAUDE.md "Validation".');
