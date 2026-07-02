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
- **Content**: 15 avatars, 10 weapons. New looks need a `style` case in BOTH `drawHair`
  (in-game) and `portraitChibi` (grid); `visor`/`tophat`/`crown` added (Pixel/Duke/Reina,
  unlock 20/22/25). `visor` suppresses the default face (like `frog`). New weapon **Tommy**
  (auto, drum mag, unlock 8) — `GUNK.Tommy` has a `drum` flag drawn in `drawGun`.
- **Fire feel**: muzzle flash at the gun tip, gun recoil kick, ejected brass shell casings,
  glowing piercing tracers; new hairstyles (mohawk on Bo, cap on Rex).
- **Visual pass**: edge vignette (offscreen-blitted), smooth camera follow, richer ground
  (flowers/rocks/dirt paths, round + pine trees, swaying grass), pulsing pickup glow. Perf:
  ground decor draws in a flat pass (no per-frame y-sort), grass batched to one stroke.
- **Buildings & water pass**: `drawBuilding` — shingled roof (clipped courses) + ridge highlight +
  chimney, wall top-light/right-shade/trim, paneled door, and **windows that glow warm at
  dusk/night** (`lit=timeOfDay!=='day'`; blue glass + glint by day). `drawDecor` water gains
  seeded lily pads + a pink lily + moon-tint glint at night.
- **Environment/item art pass**: `drawDecor` trees now cartoon-outlined (unified INK blob behind
  the canopy) with layered green shading + shaded trunk (round + pine); bushes outlined with
  berries + highlight; rocks get a dark facet + brighter light facet; grass gets light tips;
  flowers outlined. `drawDrop` supply crate rebuilt as a wooden loot crate (planks, metal corner
  brackets, red band + gold ★). `drawPickup` gains a clipped top-gloss / bottom-shade bevel.
- **3D model wiring (Meshy)**: the in-game 3D layer (2nd `<script type=module>`) now builds its
  model map from the auto-generated `assets/meshy/loader.js` (`MODELS`, `status:"generated"` only)
  instead of a hardcoded 2-entry map — so every model produced by `scripts/gen-meshy.mjs`
  auto-wires on next load (keys = lowercased avatar name / zombie kind; characters prefer `walk`).
  Falls back to the Alex+normal-zombie pilots if `loader.js` can't import. Also fixed the avatar-
  screen hero preview (was `renderTile('avatar:0')`, a key that never existed → now first loaded
  character). ⚠ Only 3 pilots generated so far; the other 25 need a `MESHY_API_KEY` /authorized
  Meshy MCP to generate (`node scripts/gen-meshy.mjs`). CDN (unpkg three.js) is blocked in the
  sandbox, so the 3D path can't be verified headless — confirm in a real browser over http(s).
- **Main menu upgrade**: `#startScreen` redesigned — pulsing "LAST PULSE" logo + red heartbeat
  backdrop (`.menuGlow`, CSS `menuPulse`/`beat`), drifting spores, a **fighter card** (live
  `portraitChibi` of `meta.avatar` + inline editable name + LV badge + XP bar, tap portrait →
  avatar select via `goAvatar`), **mode cards** with icon/title/description (`.modecard`, replaces
  `.modebtn`), and a hero Play button showing the selected mode (`renderMenu` sets `#playLabel`).
  ⚠ `.screen` relies on `position:absolute; inset:0` for full height — do NOT set the menu to
  `position:relative` (collapses to content height, canvas bleeds through).
- **Grapple hook** (player-only mobility, `F` / 🪝 button, press again to release): `castGrapple`
  marches along the aim and anchors on the first building edge (`grappleAnchor`, 430px range).
  `updateGrapple` is a unilateral spring-damper — radial-only force (`GRAPPLE.k`·stretch −
  `GRAPPLE.c`·v_radial, never pushes) so tangential momentum is conserved; rest length reels in
  at 230px/s (does work → speeds you up); auto-release near the anchor or after 2.6s; release
  keeps full velocity. While grappled the normal move lerp/friction is bypassed (input = light
  steering, 520px/s²). Tunables in `GRAPPLE`; rope drawn taut/sagging before bullets.
- **Firing feel**: `bulletFx(w)` drives per-weapon shot juice — tracer colour/width/tail/glow/tip,
  muzzle-flash radius (`h.muzzleR`, scaled in `drawHuman`), recoil kick, spark count/spread,
  knockback push, and player screen-shake for heavy guns (Sniper/Shotgun/Magnum). Shotgun ejects a
  red shell. Bullets carry `lw/tl/glow/tip` (draw loop reads them with fallbacks).
- **Art pass 3**: richer `drawGun` (per-weapon stocks/mags/sights, revolver cylinder, scope+bipod,
  shotgun pump, flame tank+pilot, crossbow bolt, drum, metallic sheen) — shows in-game AND on the
  weapon cards (`weaponIcon`, now extent-centered). Characters: neck, collar arc, shoulder/belly
  shading, head rim-light, shoe shine (`drawHuman`); zombies: rim light + torn hem.
- **Balance & feel pass**: Endless Horde now ramps every wave — `hordeScale` grows zombie HP
  (+9%/wave), damage (up to +120%), and speed (up to +45%); `hordeKind` shifts the mix toward
  runners then brutes; spawn cap raised 26→32. Low-health feedback: a pulsing red "breathing"
  vignette under 30% HP that intensifies toward death, plus a `heart` heartbeat sfx that quickens
  as HP falls (`heartT` cadence in `updatePlayer`).
- **Graphics pass 2**: checkered mowed-lawn ground texture (cached 256px pattern tile per
  time-of-day, seeded speckles/blades), animated water (sand shore, shallow layer, drifting
  ripples, glint), swaying tree canopies, shockwave `rings[]` on explosions / lightning hits /
  supply-drop landings.
- **Automation** (`.claude/`): PostToolUse parse-check hook on `index.html`, SessionStart
  readiness check, permission allowlist. Plus `scripts/parse-check.mjs` + `scripts/validate.mjs`.
  ⚠ Hooks activate only after `/hooks` reload or a session restart (the `.claude/` dir was
  created mid-session).

## How to run / validate / deploy
- The stage **fills the whole viewport** on every device (`resize()` sets `#game` to
  `window.innerWidth/Height` in JS — never CSS `min()/calc()`, which iOS collapses to 0).
- **Play**: `https://raw.githack.com/Deegan4/last-pulse/main/index.html` (repo is **public**).
  Add a `?v=...` cache-buster after pushing. Cleaner options: GitHub **Pages** (Settings → Pages
  → main → / root) → `https://deegan4.github.io/last-pulse/`, or **Vercel** (import the GitHub
  repo at vercel.com → static deploy via `vercel.json`; auto-redeploys on push to `main`). Both
  Pages and Vercel need a one-time manual setup in the user's dashboard — I can't do it (no
  deploy tool; the Vercel MCP here is read-only).
- **Validate**: `node scripts/validate.mjs` (parse-check), then render headless at ~430×932 with
  the bundled Chromium `/opt/pw-browsers/chromium-1194/chrome-linux/chrome` driven by the global
  `playwright` module. Read the PNG + check console for errors.
- **Deploy**: commit to branch `claude/run-game-DkAJ5`, then mirror onto `main`. GitHub Actions
  DO run here (a Pages deploy ran ~32s) but the token **cannot enable Pages** (`enablement:true`
  left `has_pages:false`), so Pages needs the one-time toggle: Settings → Pages → Deploy from a
  branch → `main` / root. Then it rebuilds on every push — no workflow needed.

## Gotchas / constraints (learned the hard way)
- **Network allowlist** blocks `stickygames.com` and most third-party hosts — can't fetch the
  reference; the look is reconstructed from user screenshots.
- **iOS Safari**: never size the stage with CSS `min()/calc()` viewport math — it collapses to
  zero (blank page). `resize()` computes the stage size in JS; phones fill the screen, desktop
  letterboxes a portrait column.
- **githack caches** (incl. 404s) for a few minutes — always hand out a fresh `?v=` link.
- **Headless FPS is software-rendered** (`--disable-gpu`) so it under-reads vs real devices;
  treat it as a pessimistic lower bound, not the on-phone number.
- I **cannot** change repo visibility or enable Pages (no tool); those are user-side toggles.
- Headless tests use a dumb scripted player that dies fast — not a real balance signal; a
  competent kiting run is the check. Use a temporary `?bot`/`?win` debug hook for verification
  and **remove it before committing**.

## Next enhancements (prioritized)
_Done: Progression & stats, character art, joystick upgrade, **New modes & bigger map** (below)._ Remaining:

_All pre-scoped bundles are shipped (see "Current state")._ Fresh ideas / open work:

0. _(done)_ Spawns/pickups/supply-drops now avoid water + buildings (`blockedSpawn`).
1. **Balance from real play** — _Horde wave ramp done_ (`hordeScale`/`hordeKind`); _BR/Squad
   zombie pressure done_ (`reinforceZombies` trickles zombies just inside the safe zone to a
   target of `min(10, 3+aliveHumans)`, ~every 7–11s, never within 320px of the player). Still
   open: squad sizes, building density, weapon power.
2. **Meta depth** — daily challenge, currency/shop, more avatars/weapons, seasonal cosmetics.
3. **Online** — would need a backend (out of single-file scope); only if the user wants it.

## Open questions for the user
- Real on-phone feel: movement speed, fire cadence, zombie pressure, weapon balance — needs
  playtest feedback to tune.
- Which next bundle to build first (recommend **Progression & stats**).
