#!/usr/bin/env node
// Slice the approved realistic biome atlas into Last Pulse ground textures.
// Requires ImageMagick (`magick`).

import { execFileSync } from 'node:child_process';
import { existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_ATLAS = '/Users/deegan4/.codex/generated_images/01a0684b-8f3a-7313-b93c-b0b77055deba/call_w1tdTqyXrsnBpiiLSXs7xagF.png';
const atlas = process.argv[2] || DEFAULT_ATLAS;
const out = path.join(ROOT, 'assets', 'img');
const names = ['desert', 'snow', 'ash', 'stone', 'swamp'];

if (!existsSync(atlas)) {
  console.error(`Missing atlas: ${atlas}`);
  console.error('Pass a 5-panel horizontal atlas path: node scripts/gen-ground-variants.mjs /path/to/atlas.png');
  process.exit(1);
}

const temp = path.join(out, 'ground-theme-%d.png');
execFileSync('magick', [atlas, '-crop', '5x1@', '+repage', '-resize', '1024x1024!', temp], { stdio: 'inherit' });
for (let i = 0; i < names.length; i++) {
  const src = path.join(out, `ground-theme-${i}.png`);
  const dest = path.join(out, `ground-${names[i]}.png`);
  renameSync(src, dest);
  console.log(`${path.relative(ROOT, dest)} generated`);
}
