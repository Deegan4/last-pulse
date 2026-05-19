#!/usr/bin/env node
// Standalone parse-check for BRAWL ARENA.html. Exits non-zero on parse error.
// Same logic as the PostToolUse hook, but always reads the canonical file
// and prints a friendly OK message on success so the skill workflow has
// something to grep for.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '..', '..', '..', '..', 'BRAWL ARENA.html');

let src;
try { src = readFileSync(target, 'utf8'); }
catch (e) {
  console.error(`could not read ${target}: ${e.message}`);
  process.exit(2);
}

const match = src.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('no <script> block found in BRAWL ARENA.html');
  process.exit(2);
}

try {
  new vm.Script(match[1], { filename: 'brawl-arena-script-block.js' });
  const lineCount = match[1].split('\n').length;
  console.log(`OK — script block parses (${lineCount} lines)`);
  process.exit(0);
} catch (e) {
  console.error(`PARSE ERROR: ${e.message}`);
  if (e.stack) console.error(e.stack.split('\n').slice(0, 3).join('\n'));
  process.exit(1);
}
