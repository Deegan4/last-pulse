# memory.md — project handoff & running notes

_Last updated: 2026-06-08. Working memory for **Don't Die — Battle Royale**. For architecture
details see [CLAUDE.md](CLAUDE.md); this file is the "where we are / what's next" snapshot._

## What this is
A single-file HTML5 canvas game — portrait, mobile-first, cartoon **twin-stick survival
royale** — recreated from screenshots of the StickyGames title (all art is canvas-drawn; no
original sprites). Everything lives in [`index.html`](index.html). No build step, no deps.

## Current state (done)
- **Core loop**: avatar select (9 chars, level-gated unlocks), weapon select, grass-field
  arena, shrinking "safe area", 15-player field of bot humans + roaming zombies (normal/
  runner/brute), XP/level, results screen. Twin-stick touch + WASD/mouse fallback.
- **Weapons (8)**: Pistol, Rifle, Shotgun, Sniper, SMG, Minigun, Flamethrower (burn DoT),
  Crossbow. Ammo + auto-reload, pistol crit, sniper/crossbow pierce.
- **Pickups & supply drops**: health, medkit, armor (blue shield), ammo, weapon swaps;
  parachuting supply crates with a strong weapon + armor.
- **Juice**: hit/kill markers, kill-streak callouts, blood + ground splats, damage-direction
  indicator, per-weapon SFX, optional music, **#1 VICTORY** confetti screen, power-ups
  (lightning chain, bomb AoE).
- **Progression & stats**: career stats (wins / matches / kills / K-D / best placement / streak)
  on a start-screen card + a results career line; **weapons are level-gated** (unlock by level
  like avatars; `weaponUnlocked`).
- **Art pass**: dark-outlined cartoon characters & zombies with shading, real faces, and
  per-weapon gun shapes (`GUNK`/`drawGun`); matching upgraded avatar portraits.
- **Modes & map**: Battle Royale / Endless Horde / Squads; 3000² map with buildings (cover +
  bullet-blocking), water ponds, day/dusk/night.
- **Game feel 2**: aim reticle, reload ring, low-ammo flash, **spectate-after-death** (watch a
  survivor, "Results ▸" button), gamepad support, SFX-volume + aim-sensitivity sliders.
- **Content**: 12 avatars, 9 weapons (added Magnum). **Tech**: particle pooling + 900 cap.
- **Automation** (`.claude/`): PostToolUse parse-check hook on `index.html`, SessionStart
  readiness check, permission allowlist. Plus `scripts/parse-check.mjs` + `scripts/validate.mjs`.
  ⚠ Hooks activate only after `/hooks` reload or a session restart (the `.claude/` dir was
  created mid-session).

## How to run / validate / deploy
- The stage **fills the whole viewport** on every device (`resize()` sets `#game` to
  `window.innerWidth/Height` in JS — never CSS `min()/calc()`, which iOS collapses to 0).
- **Play**: `https://raw.githack.com/Deegan4/brawl-arena/main/index.html` (repo is **public**).
  Add a `?v=...` cache-buster after pushing. Cleaner options: GitHub **Pages** (Settings → Pages
  → main → / root) → `https://deegan4.github.io/brawl-arena/`, or **Vercel** (import the GitHub
  repo at vercel.com → static deploy via `vercel.json`; auto-redeploys on push to `main`). Both
  Pages and Vercel need a one-time manual setup in the user's dashboard — I can't do it (no
  deploy tool; the Vercel MCP here is read-only).
- **Validate**: `node scripts/validate.mjs` (parse-check), then render headless at ~430×932 with
  the bundled Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` driven by the global
  `playwright` module. Read the PNG + check console for errors.
- **Deploy**: commit to branch `claude/run-game-DkAJ5`, then mirror onto `main` (githack/Pages
  serve `main`). There is **no CI** (the Actions runner can't run standard workflows here).

## Gotchas / constraints (learned the hard way)
- **Network allowlist** blocks `stickygames.com` and most third-party hosts — can't fetch the
  reference; the look is reconstructed from user screenshots.
- **iOS Safari**: never size the stage with CSS `min()/calc()` viewport math — it collapses to
  zero (blank page). `resize()` computes the stage size in JS; phones fill the screen, desktop
  letterboxes a portrait column.
- **githack caches** (incl. 404s) for a few minutes — always hand out a fresh `?v=` link.
- I **cannot** change repo visibility or enable Pages (no tool); those are user-side toggles.
- Headless tests use a dumb scripted player that dies fast — not a real balance signal; a
  competent kiting run is the check. Use a temporary `?bot`/`?win` debug hook for verification
  and **remove it before committing**.

## Next enhancements (prioritized)
_Done: Progression & stats, character art, joystick upgrade, **New modes & bigger map** (below)._ Remaining:

_All pre-scoped bundles are shipped (see "Current state")._ Fresh ideas / open work:

1. **Balance from real play** — wave ramp (Horde), squad sizes, building density, weapon power.
2. **Meta depth** — daily challenge, currency/shop, more avatars/weapons, seasonal cosmetics.
3. **Online** — would need a backend (out of single-file scope); only if the user wants it.

## Open questions for the user
- Real on-phone feel: movement speed, fire cadence, zombie pressure, weapon balance — needs
  playtest feedback to tune.
- Which next bundle to build first (recommend **Progression & stats**).
