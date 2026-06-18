# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository

A single-file HTML5 canvas game: **Don't Die — Battle Royale**, a portrait, mobile-first,
cartoon twin-stick survival royale. It is a from-scratch **canvas remake** inspired by the
StickyGames title of the same name (the original sprites are not used — all art is drawn with
canvas shapes). The entire game — markup, styles, and logic — lives in
[index.html](index.html) (~1.8k lines). No build system, no package manager, no test suite,
no runtime dependencies. The only Node usage is the validation scripts in `scripts/`.

## Running / Iterating

Open the file directly in a browser — there is no build step or dev server.

```sh
open index.html                   # macOS default browser
# or serve locally for mobile devtools:
python3 -m http.server 8000
```

The layout **fills the whole browser window** on every device (portrait-oriented gameplay;
`resize()` computes the stage size in JS rather than relying on CSS `min()`/`calc()`, which iOS
Safari mis-evaluates). Touch controls auto-activate when `matchMedia('(hover: none) and (pointer:
coarse)')` matches or the UA looks mobile; on desktop it falls back to WASD + mouse. Gamepads are
also polled when present. Use Chrome devtools device emulation to exercise the touch path.

## Architecture

Everything is one IIFE inside the single `<script>` at the bottom of the HTML. Section banner
comments (`// ===== X =====`) mark the major regions — **preserve them when editing**. In file
order the sections are: Stage/canvas, Persistence, Helpers, Data (avatars & weapons), World, Safe
area, Entities, Input, Audio, AI, Update, End/results, Draw, Main loop, Screens & flow.

Pipeline (top-down in the file):

1. **Stage / canvas** — the game lives in a `#game` stage; `resize()` is DPR-aware (capped at 2)
   and sizes the stage to the viewport. `ctx.setTransform(DPR,…)` is applied once — don't multiply
   by DPR when drawing. A separate `#minimap` canvas (`mctx`) renders the radar.
2. **Persistence** — `safeGet`/`safeSet` wrap `localStorage` (raw access can throw in sandboxed
   previews — always go through them). `meta` holds level/xp/name/avatar/weapon/music, **career
   stats** (matches/wins/kills/deaths/best placement/streak/bestStreak/bestWave), and settings
   (`sfxVol`, `aimSens`). Keys are prefixed `dd2_`. `saveMeta()` persists, `grantXp()` handles
   level-ups, `xpNeed(lv)` is the curve.
3. **Data tables** — `AVATARS` (12 entries: name, speed, health, unlock level, `look` descriptor)
   and `WEAPONS` (9 entries: dmg, mag, reload, range, fireCd, `mode`, unlock, `special`). To add a
   character or gun, add a table entry; the avatar/weapon select grids and combat read from these.
   Both avatars and weapons are **level-gated** (`avatarUnlocked`/`weaponUnlocked` vs `meta.level`).
   `INK` is the shared cartoon outline colour; `RANGE_SCALE` scales weapon range to world units.
4. **World / safe area** — `ARENA` (3000) is the square world; `cam` follows the target (player or
   spectated survivor), smoothed and clamped. `zone` is the shrinking "safe area" state machine
   (`zoneUpdate`/`outsideZone`/`safeText`); `PHASES` defines hold/shrink timing, target radius, and
   out-of-zone damage per phase. `zoneActive()` is false in Horde mode (no shrink there). Global
   game state lives here: `gameMode`, `timeOfDay`, `hordeWave`, the entity arrays, `spectating`/
   `specTarget`, and effect pools.
5. **Game modes** — `gameMode` is `'br'` (battle royale, player + 14 bots), `'horde'` (endless
   waves of zombies; `hordeWave` escalates spawn count/mix; no zone), or `'squad'` (player joins a
   team, 3 enemy squads of 4; win when `enemiesLeft()===0`). Selected via the start-screen mode
   buttons (`data-mode`), persisted as `dd2_mode`. Branch on `gameMode` in `spawnMatch`, the update
   step, and `showResults`.
6. **Entities** — `makeHuman(isPlayer, avatar, weapon, name)` and `makeZombie(x,y,kind)`.
   `spawnMatch()` builds the field for the current mode plus decor/pickups. Zombies come in three
   kinds (`ZTYPES`: `normal`/`runner`/`brute`) differing in hp, speed, damage, size, and spawn
   weight (`pickZKind`). Bots run `updateBot`; the player runs `updatePlayer`; zombies run
   `updateZombie`. AI lives in its own section. Most entities carry a per-instance radius `r`
   (default `R=15`) used by collisions and `separate()`.
7. **Map / decor / obstacles** — `buildDecor()` populates `decor[]` (grass patches, trees, bushes,
   dirt paths, **water** ponds) and `obstacles[]` (**buildings**, AABBs that block movement *and*
   bullets). It also rolls `timeOfDay` (`day`/`dusk`/`night`, weighted toward day). `blockedSpawn`/
   `farSpawn` keep spawns, pickups, and supply drops off water and buildings.
8. **Items** — `pickups[]` are ground items (health/medkit/armor-shield/ammo/weapon swaps,
   `makePickup`); `drops[]` are parachuting supply crates (strong weapon + armor) scheduled by
   `nextDrop`. Both are kept clear of water/buildings.
9. **Combat** — weapon-driven `fire(h)` dispatches on `mode`: `semi`/`auto`/`shotgun`/`sniper`
   (pierce)/`flame` (burn DoT). Ammo `mag` with auto `reload`; pistol crit; sniper/crossbow pierce.
   `hurt`/`die` apply damage (incl. `shield`/armor and `burn`), award kills + XP, push eliminations
   to `killFeed`, and spawn juice (hitmarks, splats, floaters). Power-ups: `castLightning`
   (chain-zap) and `throwBomb`/`explode` (AoE), shown as cooldown buttons. Balance lives in the
   tunable consts near the top (speeds, `ZTYPES`, `PHASES`, `GRACE`, `R`) — tune there, not inline.
10. **Effects / Audio** — `spark` pushes into `particles[]` (pooled, ~900 cap); `floaters[]` are
    damage numbers; `zaps[]` are lightning visuals; `rings[]` are expanding shockwaves (explosions/
    lightning/drop landings); `splats[]` are blood decals; `hitmarks[]` are hit/kill markers;
    `dmgDirs[]` are damage-direction indicators; `confetti` is the victory celebration. Audio is
    a lazy WebAudio synth (`audioInit` on first gesture); `tone`/`noise`/`sfx` are fire-and-forget;
    `startMusic`/`stopMusic` toggle a simple loop. SFX volume is `meta.sfxVol`.
11. **Draw** — order matters (`draw()`): field → ground-level decor (flat pass, array order) →
    blood splats → tall decor + pickups + drops + zombies + humans (y-sorted for depth) → bombs →
    bullets → particles → shockwave rings → lightning zaps → hit markers → floaters → safe-area
    overlay, then screen-space overlays (the "GET READY" banner, the `killFeed`, the zone-shrink
    banner, out-of-zone red vignette, and the cached edge vignette). `drawField` paints a cached
    per-time-of-day lawn pattern; characters are front-facing chibis (`drawHuman`/`drawZombie`)
    with name/health/ammo plates and per-weapon guns (`GUNK`/`drawGun`). Use `inView` to cull.
12. **Screens / flow** — `screenState` is `'start' | 'avatar' | 'weapon' | 'playing' | 'results'`
    with a `settings` overlay and `paused` flag. Menu screens are DOM overlays; the avatar/weapon
    grids are generated by JS (`buildAvatarGrid`/`buildWeaponGrid`) and draw chibi portraits.
    After death the player can **spectate** a survivor before `showResults`.
13. **Main loop** — one `requestAnimationFrame(loop)` chain; an FPS counter feeds the HUD; a
    `grace` countdown (`GRACE`) gives a no-fire "GET READY" opening.

### Input edge / continuous split

Press-once actions read keyboard presses (`R` reload, `Q` lightning, `E` bomb) or button taps;
continuous actions (movement, hold-to-fire) read live state. Touch uses two dynamic joysticks
(`moveVec` left, `aimVec` right with auto-fire); gamepads are read via `readGamepad()`. Mirror this
split when adding controls.

## Validation

There is **no GitHub Actions CI** — the runner here can't execute standard workflow steps (an
`actions/checkout` parse-check workflow failed during setup before Node ran). Validation is manual,
and a project hook runs it automatically after every edit.

```sh
# convenience: parse-check the <script> block, then print the render reminder
node scripts/validate.mjs

# the underlying check — parse the <script> block(s) with vm.Script (no execution),
# fails fast on syntax errors and reports the line count
node scripts/parse-check.mjs

# headless screenshot at portrait res (~430x932) using the bundled Chromium driven via the
# global `playwright` module:  /opt/pw-browsers/chromium-1194/chrome-linux/chrome
# (The Playwright MCP is pinned to a `chrome` channel that may not be installed in CI
#  containers; driving the bundled Chromium directly is the fallback.)
```

After any non-trivial edit: syntax-check, then render headless. Verify visually (read the PNG) and
check the console log for runtime errors. Headless caveats: WebAudio stays suspended without a
gesture and the Gamepad list is empty — neither is a failure. Re-add a workflow only if the Actions
environment gains marketplace-action support.

### Project automation (`.claude/`)

- **`.claude/hooks/post-edit-parse-check.mjs`** (PostToolUse on Edit/Write/MultiEdit) — runs the
  parse-check after every file edit so syntax errors surface immediately.
- **`.claude/hooks/session-start.mjs`** (SessionStart) — prints the ready banner / line count.
- **`.claude/settings.json`** — pre-allows the validation and common git commands so they don't
  prompt.

## Deploy

`index.html` is served statically — there is no server. The canonical play link (see
[README.md](README.md)) is **raw.githack.com from `main`**, so deploying = pushing to `main`.
`.nojekyll` and `vercel.json` (a rewrite of everything to `/index.html`) are present for the
GitHub Pages / Vercel fallbacks. A GitHub Pages workflow was attempted and removed (the token
couldn't auto-enable Pages here) — branch/githack deploy is the supported path.

## Conventions

- Keep everything in the one `index.html` IIFE; don't add a build step, framework, or dependency.
- Preserve the `// ===== X =====` section banners and add new code to the matching section.
- Route storage through `safeGet`/`safeSet`; use the `dd2_` key prefix.
- Add content (characters, guns, zombie kinds) via the data tables/`ZTYPES`, not inline code.
- Tune balance through the named consts near the top, not magic numbers at the call site.
- Draw in world space inside the `ctx.translate(-cam.x,…)` block; cull with `inView`.

## Project notes

[memory.md](memory.md) is the running "where we are / what's next" handoff log (done features and
ideas backlog). Keep it updated when shipping notable features; keep this file focused on
architecture and conventions.
