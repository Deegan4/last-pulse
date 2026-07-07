# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Response convention

End every reply with an **advanced, detailed Next steps** section — not a generic checklist.
Make each step *specific and actionable*, and where useful name the concrete lever:

- **Reference the actual code**: cite the `function`, constant, CSS selector, `file:line`, or
  version to touch (e.g. "lengthen the BR warmup window in `updateBot` — `clamp(elapsed/18…)` →
  `/24`", not "make BR easier").
- **Prioritize and justify**: order by impact/effort and say *why* this next, plus the trade-off
  or risk (perf, balance, scope creep, single-file constraint).
- **Give real options with numbers**: when a value is tunable, state the current value and a
  suggested range so the user can decide in one message (e.g. "combo window `COMBO_WIN=3.0s` →
  try 2.5–3.5").
- **Include verification**: how to confirm the change worked (which driver command, which
  headless render / measurement, what to look for), and any playtest question only the user can
  answer on-device.
- **Look ahead**: tie back to `ROADMAP.md` (which version/bundle this unblocks) and flag any
  blocked/parked work (e.g. Meshy needs `MESHY_API_KEY`).

Aim for ~3–6 substantive steps. Keep each to a tight sentence or two — detailed, not padded.
Omit the section only when the reply is itself purely a list of next steps.

## Repository

A single-file HTML5 canvas game: **Last Pulse** (repo `Deegan4/last-pulse`), a portrait,
mobile-first, cartoon twin-stick survival royale with three modes (Battle Royale / Endless
Horde / Squads). It is a from-scratch **canvas remake** inspired by the StickyGames title
_Don't Die_ (no original sprites — all art is drawn with canvas shapes). The entire game —
markup, styles, and logic — lives in [index.html](index.html): one big game IIFE plus a second
`<script type="module">` that progressively loads an optional 3D character layer (Meshy GLBs
via `assets/meshy/loader.js`; fails safe to 2D everywhere). No build system, no package
manager, no test suite. `scripts/` holds validation + asset-generation helpers;
[memory.md](memory.md) is the running design log — add a bullet there for every shipped change.

## Running / Iterating

Open the file directly in a browser — there is no build step or dev server.

```sh
open index.html                   # macOS default browser
# or serve locally for mobile devtools:
python3 -m http.server 8000
```

The layout is **portrait** (a phone-shaped column, letterboxed on wide desktops). Touch
controls auto-activate when `matchMedia('(hover: none) and (pointer: coarse)')` matches or the
UA looks mobile; on desktop it falls back to WASD + mouse. Use Chrome devtools device emulation
to exercise the touch path.

## Architecture

The game is one IIFE inside the first `<script>` at the bottom of the HTML (the second, module
script is the fail-safe 3D layer). Section banner comments (`// ===== X =====`) mark the major
regions — preserve them when editing.

Pipeline (top-down in the file):

1. **Stage / canvas** — the game lives in a portrait `#game` stage; `resize()` is DPR-aware and
   reads the stage size (not the window). Don't multiply by DPR when drawing.
2. **Persistence** — `safeGet`/`safeSet` wrap `localStorage` (raw access can throw in sandboxed
   previews — always go through them). `meta` holds level/xp/name/avatar/weapon/music, career
   stats (matches/wins/kills/deaths/best/streaks/bestWave), unlocked achievement ids, and the
   SFX-volume / aim-sensitivity settings; `saveMeta()` writes it all.
3. **Data tables** — `AVATARS` (9; name, speed, health, unlock level, `img` sprite key + `look`
   fallback descriptor — each ships an illustrated A-pose PNG in `assets/img/hero-*.png`),
   `WEAPONS` (10; dmg, mag, reload, range, fireCd, `mode`, special), `ACHIEVEMENTS` (14;
   `{id,icon,name,desc,test(meta,ctx)}`, checked at match end), and `GAME_VERSION`+`CHANGELOG`.
   To add a character or gun, add a table entry (new `look.style`s need a case in BOTH `drawHair`
   and `portraitChibi`). **When shipping a player-visible change, bump `GAME_VERSION` and prepend
   a `CHANGELOG` entry** — returning players get a one-time "Game Updated!" popup from it.
4. **World / safe area** — `ARENA` is the square world; camera follows the player, clamped.
   `zone` is the shrinking "safe area" state machine (`zoneUpdate`/`outsideZone`/`safeText`);
   `PHASES` defines hold/shrink timing, radius, and out-of-zone damage.
5. **Entities** — `makeHuman(isPlayer, avatar, weapon)` and `makeZombie(x,y,kind)`. `spawnMatch()`
   builds the field (player + 14 bot humans + zombies) and decor. Zombies come in three kinds
   (`ZTYPES`: `normal`/`runner`/`brute`) differing in hp, speed, damage, and size. Bots run
   `updateBot`; the player runs `updatePlayer`; zombies run `updateZombie`. AI lives alongside
   player logic. Most entities carry a per-instance radius `r` (default `R`) used by collisions
   and `separate()`.
6. **Combat** — weapon-driven `fire()` (semi/auto/shotgun/sniper/flame modes, ammo `mag`, auto
   `reload`, pistol crit, sniper pierce, burn DoT). `hurt`/`die` apply damage and award kills +
   XP, push eliminations to `killFeed`, and feed per-match achievement stats (`matchStat`).
   Power-ups: `castLightning` (chain-zap), `throwBomb`/`explode` (AoE), and `castGrapple` (`F` /
   🪝 — spring-damper rope to a building that conserves swing momentum; tunables in `GRAPPLE`),
   shown as cooldown buttons. Balance lives in the tunable consts near the top of the IIFE
   (`MOVE`/speeds, `ZTYPES`, `PHASES`, `GRACE`, `GRAPPLE`) — tune there, not inline.
7. **Effects / Audio** — `spark` pushes into `particles[]`; `floaters[]` are damage numbers;
   `zaps[]` are lightning visuals. Audio is a lazy WebAudio synth (`audioInit` on first gesture);
   `tone`/`noise`/`sfx` are fire-and-forget; `startMusic`/`stopMusic` toggle a simple loop.
8. **Draw** — order matters: field → y-sorted decor+entities → bombs → bullets → particles →
   zaps → floaters → safe-area overlay, then screen-space overlays (the "GET READY" banner, the
   `killFeed`, the "safe area is shrinking" banner, and the out-of-zone red vignette). Characters
   are front-facing chibis (`drawHuman`/`drawZombie`) with a name/health/ammo plate.
9. **Screens / flow** — `screenState` is `'start' | 'avatar' | 'weapon' | 'playing' | 'results'`
   with a `settings` overlay and `paused` flag. Menu screens are DOM overlays; the avatar/weapon
   grids are generated by JS (`buildAvatarGrid`/`buildWeaponGrid`) and draw chibi portraits.
   Full-screen popups (settings / results / achievements / what's-new) share the `.modal` class —
   it uses `justify-content:safe center` + `overflow-y:auto` with a sticky Close button so tall
   content scrolls instead of clipping on short screens; reuse it for new popups.
10. **Main loop** — one `requestAnimationFrame(loop)` chain; an FPS counter feeds the HUD; a
    `grace` countdown gives a no-fire "GET READY" opening.

### Input edge / continuous split

Press-once actions read keyboard presses (`R` reload, `Q` lightning, `E` bomb, `F` grapple) or
button taps; continuous actions (movement, hold-to-fire) read live state. Touch uses two dynamic
joysticks (`moveVec` left, `aimVec` right with auto-fire). Gamepad is also supported
(`readGamepad`). Mirror this split when adding controls.

## Validation

After any non-trivial edit, syntax-check both script blocks, then drive the real game headless:

```sh
# parse-check both <script> blocks (no execution) — fails fast on syntax errors
node scripts/validate.mjs

# boot → menu-drive into a live match → screenshots → fails on any page error
node .claude/skills/run-last-pulse/driver.mjs --play --mode br --shoot
```

After a deploy lands on `last-pulse.vercel.app`, smoke the live site (no browser needed —
it inspects the served HTML). `smoke-prod.mjs` also compares the deployed `GAME_VERSION`
against the repo's, so it catches a **stale deploy** (prod serving old code), not just a
white screen; `uptime-check.mjs` is a cheap status-only probe for a tight cron:

```sh
node scripts/smoke-prod.mjs      # HTTP 200 + <title>/#game markers + version-drift gate
node scripts/uptime-check.mjs    # fast 200/timeout probe — exit 1 on any failure
```

The driver (see `.claude/skills/run-last-pulse/`) launches the bundled Chromium
(`/opt/pw-browsers/chromium-*/chrome-linux/chrome`) via the global `playwright` module at
~430×932. Verify visually (read the PNGs in `.shots/`) and check for page errors. To test
closure-scoped internals (e.g. `openSettings`, `buildDecor`), inject a temporary
`window.__hook=...` into a **throwaway copy** of index.html (awk-insert before the IIFE-closing
`})();`) — never commit hooks (`grep -c "window.__" index.html` must be 0).

Headless caveats: WebAudio stays suspended without a gesture, the gamepad list is empty, the
three.js CDN is blocked (game falls back to 2D), and FPS under-reads (software rendering) —
none are failures.

## Git / deploy

Work on the designated `claude/...` branch and open a draft PR. **`git push origin main`
persistently fails (HTTP 503)** — to land on `main`, mark the PR ready and merge it via the
GitHub API (rebase), then re-sync: `git fetch origin main && git checkout -B <branch>
origin/main` (force-with-lease push is fine — the branch is only already-merged history).
There is no repo CI workflow; a Vercel integration auto-deploys `main` (and PR branches) on
push, and raw.githack serves `index.html` directly. GitHub's API rebase-merge stamps its own
committer, so merged commits show "Unverified" — a known cosmetic artifact; don't rewrite
`main` to fix it.
