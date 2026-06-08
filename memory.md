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
- **Automation** (`.claude/`): PostToolUse parse-check hook on `index.html`, SessionStart
  readiness check, permission allowlist. Plus `scripts/parse-check.mjs` + `scripts/validate.mjs`.
  ⚠ Hooks activate only after `/hooks` reload or a session restart (the `.claude/` dir was
  created mid-session).

## How to run / validate / deploy
- **Play**: `https://raw.githack.com/Deegan4/brawl-arena/main/index.html` (repo is **public**).
  Add a `?v=...` cache-buster after pushing. Cleaner option: enable GitHub **Pages** (Settings →
  Pages → main → / root) → `https://deegan4.github.io/brawl-arena/` (one manual toggle).
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
_Done: Progression & stats + character art upgrade (see above)._ Remaining:

1. **New modes & bigger map** (recommended next)
   - **Endless Horde** mode (survive escalating zombie waves; score = time/kills, no BR zone).
   - **Squad** mode (a few AI teammates vs other squads).
   - Larger/varied map: buildings as real cover (collision), water, a day-night tint.

2. **Game-feel round 2**
   - Aim reticle/crosshair, reload ring on the player, low-ammo flash.
   - Spectate-after-death (watch the match finish) instead of instant results.
   - Gamepad support; SFX/music volume sliders + aim sensitivity in settings.

3. **Tech/polish**
   - Particle pooling if perf dips on low-end phones.
   - More avatars/weapons; per-weapon gun art in `drawHuman`.

## Open questions for the user
- Real on-phone feel: movement speed, fire cadence, zombie pressure, weapon balance — needs
  playtest feedback to tune.
- Which next bundle to build first (recommend **Progression & stats**).
