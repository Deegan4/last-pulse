#!/usr/bin/env node
// Syntax-checks the <script> block(s) in index.html without executing them.
// Used by the GitHub Action and handy to run locally:  node scripts/parse-check.mjs
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'index.html');
const html = readFileSync(file, 'utf8');
// Match every <script ...>…</script> with its opening-tag attributes, so module scripts
// (type="module", which use import/export) are checked too — not just bare classic scripts.
const blocks = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];

if (blocks.length === 0) {
  console.error('FAIL: no <script> block found in index.html');
  process.exit(1);
}

const tmp = mkdtempSync(join(tmpdir(), 'parsecheck-'));
let lines = 0, checked = 0;
blocks.forEach((m, i) => {
  const attrs = m[1] || '';
  const src = attrs.match(/\bsrc=["']([^"']+)["']/)?.[1];
  const code = src ? readFileSync(resolve(root,src),'utf8') : m[2];
  //                 // external script, nothing inline to check
  lines += code.split('\n').length; checked++;
  const isModule = /type\s*=\s*["']module["']/.test(attrs);
  try {
    if (isModule) {
      // import/export need a real module parse — `node --check` on a temp .mjs is the reliable way.
      const f = join(tmp, `mod${i}.mjs`); writeFileSync(f, code);
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } else {
      new vm.Script(code, { filename: `index.html<script[${i}]>` });
    }
  } catch (e) {
    console.error(`FAIL: parse error in script block ${i}${isModule ? ' (module)' : ''}: ${(e.stderr?.toString() || e.message).trim()}`);
    process.exit(1);
  }
});

console.log(`OK — ${checked} script block(s) parse, ${lines} lines`);
