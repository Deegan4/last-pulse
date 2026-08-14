#!/usr/bin/env node
// PostToolUse hook — parse-checks index.html, but only when index.html was the
// file edited. Exits 2 with the error on stderr so Claude Code surfaces it.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let payload = {};
try { payload = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
const fp = (payload.tool_input && payload.tool_input.file_path) || '';
if (!/index\.html$/.test(fp)) process.exit(0);   // not our file — do nothing

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
try {
  execFileSync('node', [join(root, 'scripts', 'parse-check.mjs')], { stdio: ['ignore', 'pipe', 'pipe'] });
  process.exit(0);
} catch (err) {
  const msg = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
  console.error('parse-check failed on index.html:\n' + msg.trim());
  process.exit(2);
}
