#!/usr/bin/env node
// Fast uptime probe: is https://last-pulse.vercel.app answering with 200?
// Deliberately minimal (no body parsing) so it's cheap to run on a tight cron —
// pair it with smoke-prod.mjs (deep, per-deploy) for the full picture.
//   node scripts/uptime-check.mjs                 # exit 0 if 200, 1 otherwise
//   node scripts/uptime-check.mjs --url https://… # probe an alternate host
//   URL=https://…  node scripts/uptime-check.mjs  # or via env (handy in crontab)
//
// Example crontab line (probe every 5 min, log failures):
//   */5 * * * * /usr/bin/node /path/to/scripts/uptime-check.mjs >> /tmp/last-pulse-uptime.log 2>&1
const args = process.argv.slice(2);
const url = (args.includes('--url') ? args[args.indexOf('--url') + 1] : '') || process.env.URL || 'https://last-pulse.vercel.app';
const TIMEOUT_MS = 12_000;
const stamp = () => new Date().toISOString();

const ac = new AbortController();
const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
const t0 = Date.now();
try {
  const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ac.signal,
                                 headers: { 'user-agent': 'last-pulse-uptime/1.0' } });
  const ms = Date.now() - t0;
  if (res.status === 200) {
    console.log(`${stamp()} UP    ${url}  ${res.status}  ${ms}ms`);
    process.exit(0);
  }
  console.error(`${stamp()} DOWN  ${url}  ${res.status}  ${ms}ms`);
  process.exit(1);
} catch (err) {
  console.error(`${stamp()} DOWN  ${url}  ${err.name === 'AbortError' ? `timeout>${TIMEOUT_MS}ms` : err.message}`);
  process.exit(1);
} finally {
  clearTimeout(timer);
}
