#!/usr/bin/env node
// SessionStart hook — confirms node + the parse-check script work, and prints a
// one-line readiness/orientation note (stdout is injected into context).
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
try {
  const out = execFileSync('node', [join(root, 'scripts', 'parse-check.mjs')], { encoding: 'utf8' }).trim();
  console.log('[brawl-arena] ready · ' + out +
    ' · validate: node scripts/validate.mjs · deploy: push to main (githack serves index.html).');
} catch (err) {
  const msg = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
  console.log('[brawl-arena] WARNING: parse-check failed at session start:\n' + msg.trim());
}
process.exit(0);
