#!/usr/bin/env node
// PostToolUse hook: parse-check the <script> block in BRAWL ARENA.html.
// Reads the hook payload (JSON on stdin) per the Claude Code hook spec,
// inspects tool_input.file_path, and if it points at BRAWL ARENA.html,
// extracts the <script>…</script> body and parses it with vm.Script.
// Parsing only — the code is never executed. Exits 2 with a structured
// "block" message when a parse error is found so the agent self-corrects.

import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let payload = '';
process.stdin.setEncoding('utf8');
for await (const chunk of process.stdin) payload += chunk;

let parsed;
try { parsed = JSON.parse(payload || '{}'); }
catch { process.exit(0); }   // non-JSON payload: no-op

const filePath = parsed?.tool_input?.file_path
              ?? parsed?.tool_response?.filePath
              ?? '';
if (!filePath.endsWith('BRAWL ARENA.html')) process.exit(0);

let src;
try { src = readFileSync(filePath, 'utf8'); }
catch (e) {
  console.error(`[parse-check] could not read ${filePath}: ${e.message}`);
  process.exit(0);
}

const match = src.match(/<script>([\s\S]*?)<\/script>/);
if (!match) {
  console.error('[parse-check] no <script> block found — file may be malformed');
  process.exit(2);
}

try {
  // vm.Script parses the source without executing it. If the script
  // is syntactically invalid this constructor throws SyntaxError.
  new vm.Script(match[1], { filename: 'brawl-arena-script-block.js' });
  process.exit(0);
} catch (e) {
  const out = {
    decision: 'block',
    reason: `BRAWL ARENA.html script block failed to parse: ${e.message}`,
  };
  console.log(JSON.stringify(out));
  process.exit(2);
}
