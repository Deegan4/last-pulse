#!/usr/bin/env node
// ship.mjs — one command for the whole "push to main" ritual.
//
//   node scripts/ship.mjs                 # validate → push → PR → rebase-merge → re-sync
//   node scripts/ship.mjs --dry-run       # print every step, execute nothing that mutates
//   node scripts/ship.mjs --no-merge      # stop after opening/updating the PR (leave it draft)
//   node scripts/ship.mjs --title "…"     # PR title (default: subject of the newest commit)
//
// WHY THIS EXISTS: `git push origin main` fails with a persistent HTTP 503 on this repo, so
// landing on main is a multi-step dance — push the branch, mark the PR ready, merge it through
// the GitHub API with the rebase method, then re-point the local branch at the new origin/main.
// Reconstructing that from prose every session is how parallel sessions collided on one branch
// before (see memory.md v1.8.0). Encoding it also means the validate gate can never be skipped.
//
// NOT AUTOMATED ON PURPOSE: committing. This script refuses to run with a dirty tree so that
// what lands on main is always something a human chose to commit.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const dry = has('--dry-run');
const noMerge = has('--no-merge');

const sh = (cmd, args, { capture = true, allowFail = false } = {}) => {
  try {
    return execFileSync(cmd, args, { cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' })?.trim();
  } catch (err) {
    if (allowFail) return null;
    process.stderr.write((err.stdout?.toString() || '') + (err.stderr?.toString() || ''));
    console.error(`\n✗ failed: ${cmd} ${args.join(' ')}`);
    process.exit(1);
  }
};
const mutate = (label, cmd, args, opts) => {
  if (dry) { console.log(`  [dry-run] ${label}: ${cmd} ${args.join(' ')}`); return null; }
  return sh(cmd, args, opts);
};
const step = s => console.log(`\n▸ ${s}`);

// ---- 1. preflight: right branch, clean tree ----
step('preflight');
const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD']);
if (branch === 'main') {
  console.error('✗ on main. Work happens on a branch — `git checkout -b claude/<topic>` first.');
  console.error('  (Direct `git push origin main` 503s on this repo; that is what this script routes around.)');
  process.exit(1);
}
const dirty = sh('git', ['status', '--porcelain']).split('\n').filter(l => l && !l.startsWith('??'));
if (dirty.length) {
  console.error('✗ uncommitted tracked changes — commit them first (this script will not commit for you):');
  dirty.forEach(l => console.error('   ' + l));
  process.exit(1);
}
const ahead = sh('git', ['rev-list', '--count', `origin/main..HEAD`], { allowFail: true }) ?? '?';
console.log(`  branch=${branch}  commits ahead of origin/main=${ahead}`);
if (ahead === '0') { console.error('✗ nothing to ship — HEAD is not ahead of origin/main.'); process.exit(1); }

// ---- 2. validate (the gate that must never be skipped) ----
step('validate');
sh('node', [join(root, 'scripts', 'validate.mjs')], { capture: false });

// ---- 2b. balance regression gate ----
// Difficulty is the easiest thing to break silently: nothing throws when wave 4 becomes
// unsurvivable. If a baseline exists, re-run the kiting-bot harness and refuse to ship when the
// median wave reached has drifted more than DRIFT waves from it. Skipped (with a loud note) when
// no baseline or no Playwright — a missing measurement must never look like a passing one.
const DRIFT = 2;
{
  const base = join(root, '.shots', 'waves-baseline.json');
  if (!existsSync(base)) {
    console.log('\n▸ balance gate: SKIPPED — no .shots/waves-baseline.json');
    console.log('  create one: node .claude/skills/run-brawl-arena/driver.mjs --waves 15 --runs 5 --json .shots/waves-baseline.json');
  } else if (dry) {
    console.log('\n▸ balance gate: [dry-run] would re-run the harness and compare to the baseline');
  } else {
    step('balance gate');
    const b = JSON.parse(readFileSync(base, 'utf8'));
    const runs = b.config?.runs || 3, target = b.config?.targetWave || 15;
    const tmp = join(root, '.shots', 'waves-current.json');
    const res = sh('node', [join(root, '.claude', 'skills', 'run-brawl-arena', 'driver.mjs'),
      '--waves', String(target), '--runs', String(runs), '--json', tmp], { allowFail: true });
    if (res === null || !existsSync(tmp)) {
      console.error('✗ balance gate: harness did not produce a report (Playwright missing?).');
      console.error('  Install it (npx playwright install chromium) or pass --skip-balance.');
      if (!has('--skip-balance')) process.exit(1);
    } else {
      const cur = JSON.parse(readFileSync(tmp, 'utf8'));
      const bw = b.summary.waveReached.median, cw = cur.summary.waveReached.median;
      const d = Math.abs(cw - bw);
      console.log(`  median wave reached: baseline ${bw} → now ${cw} (drift ${d})`);
      if (d > DRIFT) {
        console.error(`✗ balance gate: median wave moved ${d} waves (> ${DRIFT}).`);
        console.error('  Either the change altered difficulty, or the baseline is stale. Re-baseline deliberately.');
        process.exit(1);
      }
      console.log('✓ balance within tolerance');
    }
  }
}

// ---- 3. push the branch ----
step('push branch');
mutate('push', 'git', ['push', '--force-with-lease', '-u', 'origin', branch], { capture: false });

// ---- 4. find or create the PR ----
step('pull request');
const title = val('--title', sh('git', ['log', '-1', '--pretty=%s']));
let num = null;
const existing = sh('gh', ['pr', 'view', branch, '--json', 'number,state,isDraft'], { allowFail: true });
if (existing) {
  const j = JSON.parse(existing);
  if (j.state === 'MERGED' || j.state === 'CLOSED') {
    console.error(`✗ PR #${j.number} for ${branch} is ${j.state}. Re-sync the branch first:`);
    console.error(`   git fetch origin main && git checkout -B ${branch} origin/main`);
    process.exit(1);
  }
  num = j.number;
  console.log(`  reusing PR #${num}${j.isDraft ? ' (draft)' : ''}`);
} else if (dry) {
  console.log('  [dry-run] would create a draft PR');
} else {
  const body = 'Automated by `scripts/ship.mjs`.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)';
  sh('gh', ['pr', 'create', '--draft', '--base', 'main', '--head', branch, '--title', title, '--body', body], { capture: false });
  num = JSON.parse(sh('gh', ['pr', 'view', branch, '--json', 'number'])).number;
  console.log(`  created PR #${num}`);
}

if (noMerge) { console.log(`\n✓ stopped before merge (--no-merge). PR #${num ?? '?'} is open.`); process.exit(0); }

// ---- 5. mark ready + rebase-merge through the API ----
// `gh pr merge` uses the same endpoint but has historically been the flakier path here; calling
// the REST endpoint directly keeps the failure surface small and the error message readable.
step('merge to main (API, rebase)');
mutate('ready', 'gh', ['pr', 'ready', String(num ?? branch)], { allowFail: true });
const repo = dry ? 'OWNER/REPO' : JSON.parse(sh('gh', ['repo', 'view', '--json', 'nameWithOwner'])).nameWithOwner;
mutate('merge', 'gh', ['api', '-X', 'PUT', `repos/${repo}/pulls/${num}/merge`,
  '-f', 'merge_method=rebase', '-f', `commit_title=${title}`], { capture: false });
// The API rebase-merge stamps GitHub as committer, so merged commits show "Unverified".
// That is cosmetic and EXPECTED — do not rewrite main to "fix" it.

// ---- 6. re-sync the local branch onto the new main ----
step('re-sync');
mutate('fetch', 'git', ['fetch', 'origin', 'main'], { capture: false });
mutate('reset branch to origin/main', 'git', ['checkout', '-B', branch, 'origin/main'], { capture: false });

console.log(`\n✓ shipped. ${dry ? '(dry run — nothing changed)' : `PR #${num} rebase-merged; ${branch} re-pointed at origin/main.`}`);
console.log('  Vercel auto-deploys main. Hand out a cache-busted githack link:');
console.log('  https://raw.githack.com/Deegan4/last-pulse/main/index.html?v=' + Date.now());
