# memory.md — project handoff & running notes

_Last updated: 2026-07-17. Working memory for **Last Pulse** (repo `Deegan4/last-pulse`,
v2.24.1). For architecture details see [CLAUDE.md](CLAUDE.md); this file is the "where we are /
what's next" snapshot — **add a bullet under "Current state" for every shipped change**._

## What this is
A single-file HTML5 canvas game — portrait, mobile-first, cartoon **twin-stick survival
royale** — a from-scratch remake inspired by the StickyGames title _Don't Die_ (all art is
canvas-drawn; no original sprites). Everything lives in [`index.html`](index.html): the game
IIFE + a fail-safe 3D model layer (`assets/meshy/`). No build step, no deps.

## Session handoff — 2026-07-17
_Snapshot for whoever picks this up next. Details for each shipped item are in "Current state" below._

- **Where things stand:** production is **v2.24.1**, everything below is merged to `main` (HEAD `fdc61f8`)
  and live via Vercel. Working branch `claude/builders-feature-buildings-p0jpez` is synced to `main`.
- **Shipped this session (all merged):** v2.22.0 **Builders** (in-match build mode + scrap) → v2.22.1 music
  timing fix → v2.23.0 **Donate** button (Stripe Payment Link) → v2.24.0 **music removed** (SFX kept) + donate
  restyle → SFX param cleanup → v2.24.1 **black status-bar bar fix** (the `#game` box-shadow letterbox recolor).
- **Live Stripe link:** `STRIPE_DONATE_URL = 'https://buy.stripe.com/00wdR9aBb19v2oXgmwgQE08'` (owner's, near
  `GAME_VERSION`). The 💜 "Support the game" button opens it; Stripe hosts checkout (no keys in the file).
- **Open / parked:**
  1. **On-device confirm the black-bar fix** — device-only symptom; if the home-screen icon still shows black,
     delete & re-add it (iOS caches the standalone config from first save).
  2. **Stripe "After payment → Redirect"** to the production URL so donors return to the game (Stripe Dashboard
     setting). **A Stripe MCP connector (`mcp__Stripe__*`) became available late in the session** — earlier it
     wasn't; a future session can inspect/configure via `get_stripe_account_info` + `stripe_api_read/write`
     (ToolSearch to load schemas) before touching the live Payment Link.
  3. Optional seam tweak: if the green status-bar strip reads darker than the menu top, nudge `#111d0c`→`#16260f`.
  4. Parked ideas: achievement hook for the builder (`matchStat.built` already tracked), donation amount tiers
     (needs one fixed-price Payment Link each), file-based `<audio loop>` soundtrack if music is ever wanted back.
- **Gotchas:** `node scripts/validate.mjs` gates `GAME_VERSION==CHANGELOG[0].v`; drive with the run-brawl-arena
  driver (three.js CORS + suspended WebAudio headless are non-failures); never commit `window.__hook` test hooks
  (`window.__game` is the permanent shipped one); `safeTopPx()` is now dead code (harmless), left in place.

## Current state (done)
- **v2.27.0** — **Compact ability buttons.** The four in-match power buttons (🔨 build / ⚡ / 💣 /
  🪝) were a tall vertical strip (`#powers` flex-column, `right:16px bottom:210px`) that ran up the
  right edge into the mid-map view. Reworked `#powers` into a **2×2 CSS grid** (`repeat(2,auto)`,
  `bottom:150px`, buttons `66→60px`) with `#scrapHud` spanning the top row (`grid-column:1/-1`).
  Both `@media (max-height:560px)` landscape rules updated from `flex-direction:row` to
  `grid-template-columns:repeat(4,auto)` (a single bottom-centre row) plus the safe-area `bottom`
  offset (`210→150px`). Visibility is still class-only (`.hidden`), no inline `display`, so grid
  survives show/hide. Verified in a live BR match: cluster tucks into the bottom-right, mid-right
  map is clear.
- **v2.26.0** — **Bigger fighters + tidier village.** (1) Hero sprites are drawn larger on the
  field: introduced `HERO_H` (=58, was a hardcoded `DH=52` in `drawHeroSprite`); shadow/aura/
  player-ring bumped to match, and `drawNameplate`'s vertical anchor is now `h.y+18-HERO_H` so
  the name/HP plate tracks the sprite's head instead of a fixed `-34`. (2) Building placement in
  `buildDecor` spreads out: inter-building gap `50→90`px and pond clearance `30→60`px (retry
  budget `20→40` so all wanted buildings still place). Verified headless across lvl 1/20/40: full
  building counts (9/14/16), **zero** pond overlaps, avg min inter-building gap up from as low as
  50px to ~120–140px. Note: the earlier "buildings on ponds" report traced to v2.25.0's
  verification screenshots (a temp `__hook` had *forced* buildings onto pond coords to photograph
  the kinds side-by-side) — real generation never overlapped; the spacing bump is pure polish.
- **v2.25.0** — **New building types.** Buildings now come in four flavours via a `b.kind` tag
  (`BKINDS` table near `ROOFS`) assigned in `buildDecor`: **house** (classic cottage), **shop**
  (teal roof, `SHOP` sign, striped scalloped awning + wide shopfront window), **barn** (red
  vertical planks, white trim band, round hayloft window, X-braced double doors flanking the real
  door gap; wide footprints `w>BIG_HOUSE` bias to barn), and **cabin** (horizontal log-course
  walls, green roof, single window, thin grey stovepipe + a night smoke puff). Purely a facade
  change — `drawBuilding` branches on `kind`; the hollow-walls/door/`wallRects`/interior-loot/
  zombie-pathing system is untouched, so all four are enterable with loot inside and degrade
  identically. Verified headless: forced one of each kind side-by-side and screenshotted — all
  render distinct with no page errors.
- **v2.24.1** — **Black status-bar bar fixed (root cause found)** (user reported it twice; screenshot marked
  the top strip). Real culprit: `#game`'s `box-shadow:0 0 0 100vmax #0b120a` — a huge near-black letterbox that
  **overpaints every region the stage doesn't cover**, including the iOS status-bar / notch strip when the
  layout viewport starts below it (standalone / in-app contexts where `viewport-fit=cover` + `black-translucent`
  don't extend content upward). The v2.21.1 `resize()` pull-up (`stage.top=-safeTopPx(); gh+=st`) tried to cover
  the strip but **cancelled against** `.screen`'s `padding-top:env(safe-area-inset-top)` (jamming the title when
  the probe read nonzero) and no-op'd when the probe read 0. Fix: (1) recolored the `#game` box-shadow + bg from
  `#0b120a` → **`#111d0c`** (game dark-green) so the strip/desktop letterbox reads green, not black; (2) removed
  the pull-up — `resize()` now just fills the viewport at `top:0` (no cancel, no jam); (3) gave `html,body` the
  `.screen` green mesh + `theme-color=#101c0b` as defense-in-depth. `safeTopPx()` now unused (left in place,
  harmless). Verified headless: forcing `#game{top:60px}` to expose the strip shows **dark green, not black**
  (screenshot); normal render unregressed; 0 page errors. NOTE: device-only symptom — verified structurally via
  the forced-strip simulation, not on a real notch.
- **v2.24.0** — **Music removed + donate-button restyle** (user: music "still is not working. Take out the
  music completely", plus a screenshot marking the Support button as visually inconsistent). **Music fully
  removed** (SFX kept): deleted the whole soundtrack block (`_GAL`/`_BD`, `mChug`/`mStab`/`mSqueal`/`mKick`/
  `mSnare`, `musicStep`, the lookahead scheduler, `startMusic`/`stopMusic`), the `musicTimer`/`musicBus` vars,
  the `musicBus` submix + `startMusic()` call in `audioInit`, `meta.music` (init + `dd2_music` persistence), the
  `#sMusic` settings toggle + its handler + the `openSettings` label line. `tone`/`dtone`/`noise`/`fnoise` (with
  their now-unused trailing `bus`/`when` params) stay — every SFX still routes to `master`. **Restyle:** the
  `#donateBtn` is now `class="btn ghost achbtn donatebtn"` wrapped in its own `.menurow`, so it inherits the
  same glassy pill shape as the Achievements/Shop buttons (kept the subtle purple border/text for donate
  identity, `width:min(86%,360px)` to align with PLAY/daily width). Verified headless: 0 music refs remain
  (grep), live match --shoot has 0 page errors (SFX path intact), settings has no `#sMusic`, menu screenshot
  shows the pill-consistent button. STRIPE_DONATE_URL (live link) unchanged.
  Follow-up cleanup (no version bump — SFX output identical): stripped the now-dead trailing `bus`/`when`
  params from `tone`/`dtone`/`noise`/`fnoise` (verified no SFX caller passed them; max arg used is
  slide/cutoff/q), so the voices route straight to `master` and play "now" as before. Verified: parses,
  0 `bus||master`/`when||actx` refs remain, live --shoot match fires all voices with 0 page errors.
- **v2.23.0** — **Donate / "Support the game" button** (user: "add a donate option in the main menu with the
  stripe connector"). **No Stripe MCP connector exists in this session** (searched: stripe/payment/checkout/
  invoice/subscription → none; connectors present are Canva/dot/Jam/Semrush/Vercel/GitHub). Told the user, and
  noted a connector wouldn't run in the game anyway — `index.html` is static/backend-free, so donations use the
  standard client-only path: a **Stripe Payment Link** (hosted `buy.stripe.com` URL) opened in a new tab. New
  owner-config const **`STRIPE_DONATE_URL`** (near GAME_VERSION, blank by default) — paste a Payment Link to
  enable. New `💜 Support the game` button under the menu's Achievements/Shop row → `openDonate()` shows the
  `#donate` `.modal` (heart burst, blurb, purple `Donate via Stripe →` CTA, secure note). `donateConfigured()`
  regex-gates on `https://…stripe.com/`; when unset the CTA+secure line hide and an amber note tells the owner
  to set the const (never opens a dead link). `donateGo()` = `window.open(url,'_blank','noopener,noreferrer')`.
  No keys/card data in the file — Stripe hosts checkout. Verified headless (real file + scratch copy with a test
  URL): configured → CTA shown, opens the URL; unconfigured → note shown, no open; 0 page errors; screenshots
  of both states clean. **NOTE:** owner must paste their real Payment Link into `STRIPE_DONATE_URL` to go live.
- **v2.22.1** — **Music timing fix** (user: "fix the in game music" → symptom confirmed via AskUserQuestion:
  *stutters / timing off*). Root cause: the soundtrack was sequenced by a `setInterval(…,105)` firing one
  16th-note per tick — setInterval jitter/throttle (bad on mobile / when FPS dips) desynced the loop. Fix:
  standard Web Audio **lookahead scheduler** ("two clocks"). Added an optional trailing `when` (an
  `actx.currentTime` stamp) to `tone`/`dtone`/`noise`/`fnoise` — SFX callers omit it (play "now"); events
  now anchor via `setValueAtTime(…,t0)` + ramps to `t0+d`, `start(t0)`/`stop(t0+d)`. The `m*` helpers pass
  `when` through. New `musicStep(s,t)` emits one step at a precise time; `startMusic` runs a coarse 25ms
  timer that queues every step inside a `LOOKAHEAD=0.15s` window ahead of `actx.currentTime` (`STEP_DUR=0.105`,
  64-step/4-bar loop unchanged). Paused-off rebases `mNextT` so re-enable never burst-catches-up. Verified
  headless (hooked copy, `--autoplay-policy=no-user-gesture-required`): context running, `musicStep` doesn't
  throw, `mNextT` stays ahead of the audio clock (the anti-jitter invariant), steps advance ~105ms each, 0
  page errors; live match --shoot exercises the `when`-omitted SFX path with 0 errors. **NOTE:** headless
  WebAudio can't be *heard* — timing verified structurally, not audibly; on-device playtest confirms feel.
- **v2.22.0** — **Builders / in-match build mode** (user asked "add a builders feature for buildings and
  other things"; scope confirmed via AskUserQuestion: **in-match build mode** + **find resources to build**).
  New currency **scrap** (`player.scrap`): zombies drop `scraps[]` bits on death (`die`, ~62% chance, more from
  brutes/bosses) and **10 caches** scatter at match start (`spawnMatch`, `makeScrap`/`updateScraps`). HUD chip
  `#scrapHud` 🔩. **Build mode**: 🔨 button / `B` cycles `player.buildSel` wall→spikes→turret→off (`cycleBuild`);
  while selected the fire input is hijacked to drop the snapped ghost (`updatePlayer` → `placeBuild`, `PLACE_CD`
  debounce, `CELL=46` grid, `canPlace` rejects overlaps/ponds/bodies). `BUILDS` table (cost/hp/w/h): **Wall**
  🧱 (solid cover), **Spikes** 🔺 (walkable ground trap, `dps` DoT on a 0.35s tick, wears down), **Turret** 🔫
  (auto-guns nearest zombie in `range`, `owner:b team:0` so it never hits player/allies, no XP/combo spam).
  Solid pieces get `built:true` and are pushed into `obstacles` (so `wallRects`/`bulletInObstacle` treat them
  as full solid, `insideBuilding` skips them); `removeBuild` splices both arrays. Zombies **chew** adjacent
  solids (`updateZombie` melee-vs-build via `attackCd`). `updateBuilds` drives turret fire + spike ticks + death.
  Draw: spikes in the flat ground pass; walls/turrets + scrap y-sorted with entities; green/red dashed
  **ghost** (`drawBuildGhost`, turret shows range ring). New SFX `build`/`turret`. Verified headless (hooked
  throwaway copy): placement/obstacle-membership/scrap-deduction/cycle-wrap all correct, turret spawns a
  bullet at its target, 0 page errors; screenshot shows all three pieces + scrap chip + selected-wall button.
- **v2.20.0** — **Horde: climbable watchtowers + 2 new enemies** (user asked for more Horde enemy variety +
  2-story buildings to climb & shoot from; design confirmed via AskUserQuestion: auto-climb, melee can't
  reach the roof, ranged Spitter can). **Towers**: `spawnMatch` horde branch drops **2** `{type:'tower',
  tower:true,…}` (TOWER_W/H/ELEV consts) into `obstacles`+`decor`. `o.tower` is fully solid (`wallRects`
  returns the whole rect), excluded from `insideBuilding` door-pathing, and **transparent to bullets**
  (`bulletInObstacle` skips towers → roof campers shoot out & acid reaches them). Climb is a gameplay
  state `player.onTower`: auto-climb by walking onto the south **ladder zone** (`towerLadder`), auto-descend
  by pressing down at the roof's south edge; `integrate` clamps a roof player to `towerRoof` (inset rect)
  instead of `resolveObstacles`; `drawTower` renders a 2-story stone tower (courses, arrow-slits, rooftop
  battlements/merlons, ladder, pulsing climb-chevron when near); the roof player is drawn last translated
  `-TOWER_ELEV` so they stand on top. Melee blocked while `!tgt.onTower` in `updateZombie`. **CRITICAL GOTCHA
  fixed**: tower objects need BOTH `type:'tower'` (draw) AND `tower:true` (all `o.tower` gameplay logic) —
  forgetting the flag makes them behave as normal buildings. **Enemies** (Horde-only, `w:0` so never in the
  default BR mix): **spitter** (ranged; holds ~290px standoff, strafes, lobs an acid gob via `spitAcid` —
  an `enemy:true` bullet that skips zombies (`!b.enemy` guard) and hits humans incl. roof campers; green
  glowing-throat tell) and **bloater** (slow tank; `zombieBurst` acid AoE on death via `e.boom` in `die`;
  pulsing blister tells). `hordeKind` weights them in at waves ≥4/≥5. New `sfx('spit')` + acid-bullet draw.
  Verified in a live Horde match via throwaway hook: 2 towers spawn, auto-climb works, melee mills at base,
  spitter acid hits the roof player (damage-dir arcs), no page errors. `.shots/tower-ground|roof.png`.
- **v2.19.0** — **beatdown-metalcore soundtrack** (user asked to "play Knocked Loose — Laugh Tracks"; the
  actual album can't be used — Spotify is DRM'd + it's copyrighted, so I recreated the *style* per their
  request). Reworked `startMusic` from the clean E-Phrygian metal riff into a **4-bar (64-step) loop**: 2
  bars of fast, downtuned, chromatic palm-muted chugs (A1 55Hz → G#1 51.9Hz) with a dissonant **tritone
  stab** (`mStab` root+×1.414+octave) and blast-ish d-beat drums, then a 2-bar **half-time BREAKDOWN** of
  crushing syncopated slams (`_BD`, G1 49Hz), double-bass kick, ring-out dissonance, and a **pinch-harmonic
  squeal** (`mSqueal`, bends up) in the last bar. `mChug` rebuilt darker (low saw + sub octave-down +
  faint bite, lowpass ~880Hz). Reuses the v2.18 `dtone`/`DIST_CURVE`/`musicBus` infra. **NOTE for future
  music requests**: streaming-service audio (Spotify/Apple/YT) can't be embedded (DRM) and bundling
  copyrighted tracks is off-limits — options are the user's own/licensed files, an official embed, or a
  synth style-recreation like this. Verified via autoplay hook: full 64-step loop (incl. breakdown+squeal)
  ran 7.2s, clean start/stop, all 12 guns still `ok`, zero page errors. Musicality is on-device-only.
- **v2.18.0** — **metal soundtrack + meatier guns**: new audio primitives — a static `DIST_CURVE`
  waveshaper + `dtone(f,d,type,v,slide,cutoff,bus)` (osc → waveshaper → lowpass) for overdriven crunch, and
  a `bus` param added to `tone`/`noise`/`fnoise` so music can route to a dedicated `musicBus` submix
  (gain 0.5, under SFX; created in `audioInit`). **Music**: replaced the gentle 8-note triangle `MELODY`
  with a step sequencer (`startMusic` setInterval 105ms ≈ 143 BPM, 32-step / 2-bar loop) playing an
  E-Phrygian metal riff — palm-muted gallop chugs (`mChug`, `_GAL`), power-chord accents (`mPower` root+
  fifth+octave), double-bass kick (`mKick`, `_KICK`), backbeat snare (`mSnare`, `_SNR`), hats, and a lead
  lick over bar 2 (`_LEAD` E5-D5-C5-B4); roots E2→C2/D2. **Guns**: each `sfx('shoot')` branch gained a
  `dtone` overdriven body + deeper sine sub (semi/auto/shotgun/sniper/launcher/Magnum); Crossbow left clean.
  Verified via autoplay throwaway hook (`actx` running): all 12 weapons + boom/flame/etc. `ok`, sequencer
  ran 1.3s and stopped cleanly, zero page errors. Musicality is on-device-only (headless can't audition).
- **v2.17.0** — **modern menu backgrounds**: replaced the flat green `.screen` gradient with a living
  **aurora mesh** applied to ALL menu screens (start/mode/avatar/weapon). Base is a deep near-black green
  with a layered multi-radial neon bloom + centre vignette; `.screen::before` is a drifting/rotating/
  scaling neon-blob mesh (`@keyframes aurora`, 24s), `.screen::after` is a soft masked tech grid + top
  light-beam that pans (`@keyframes gridpan`, 26s). Pseudo-layers sit at `z-index:-2/-1` (below in-flow
  content) and `.screen > *{position:relative;z-index:1}` keeps content above the ember/glow layers.
  Particles: `.spore` restyled to **glowing embers** (inline `--g` colour: lime/teal/violet/amber, box-
  shadow glow) with a richer `drift` keyframe (x-drift + scale), now sprinkled behind **all four** screens
  (14 on start, 9 elsewhere) via the generalized IIFE. `.menuGlow` recolored red→lime to match.
  `prefers-reduced-motion` disables the two aurora animations. Verified all four screens headless
  (`.shots/m-start|mode|avatar|weapon.png`) — content readable, no page errors.
- **Start-screen footer** — removed the "A canvas remake · twin-stick survival royale ·" tagline from the
  start-screen `.footer` (index.html ~L553); kept the `#verLink` version / "what's new" link. No version
  bump (trivial cosmetic text removal — not worth a "Game Updated!" popup).
- **v2.16.0** — **enemy redraw** (the circled on-device "dark blob" was the 3D zombie GLB billboard): (1)
  **disabled the 3D zombie path** — `drawZombie` no longer calls `Models3D.drawZombie` (removed the early
  return), and the `zombie:*` entries were dropped from the 3D layer's `FALLBACK_FILES` + loader map so the
  GLB never loads; heroes were already `armless` so 3D is now player-only-nonexistent for zombies. (2)
  **completely rewrote 2D `drawZombie`** into distinct, menacing monsters sharing the walk/lunge rig: a new
  `zClaw(x,y,dir,fill,sc)` helper draws hooked talons; always-on **glowing eyes** (per-kind `eye` color in
  `ZTYPES`, brighter at night), a **gaping fanged maw** that snaps wide on lunge, **exposed ribcage +
  sternum + gut wound** (normal/runner) or **muscle striations + shoulder bone-spikes** (brute), rotted
  feet, blood streaks, and a faint eye-colored ground pool. Per-kind silhouettes via `tw`/`th`/`lw`/`hr`:
  **Runner** lean + hunched-forward (extra `flip*0.16` lean) with red eyes, **Brute** huge with a low sunken
  head + bone spikes + yellow eyes, **Shambler** standard green with toxic-yellow eyes. `ZTYPES` gained
  `shade`/`eye` (skin/torso tweaked). Verified in a live Horde match day + night + a scaled close-up
  (`.shots/z-day.png` / `z-night.png` / `z-big.png`) — no page errors; hp-bar tint now red for runner too.
- **v2.15.0** — **hero polish** (follow-up to v2.14.0): (1) **signature auras** — each new hero carries an
  `aura:'#rrggbb'` (Shade green, Nova purple, Blaze orange, Reaper spectral-green, Onyx cyan, Titan red);
  `drawHeroSprite` draws a soft, gently-pulsing radial halo behind the sprite for any `h.avatar.aura`
  (player + bots, so it's a hero trait), inserted right after the shadow ellipse. (2) **Quicker unlocks** —
  new roster compressed Lv 16–32 → **16/18/20/22/24/26**; `Full Roster` achievement retargeted `>=32 →
  >=26` (desc updated). Verified in live matches (`.shots/pt-13-1.png` Onyx cyan, `.shots/pt-10-3.png`
  Nova purple) — aura reads without hiding the gun-arm; bots spawn as the new heroes (kill-feed shows
  Onyx/Titan). Gun-arm rig reads fine on the ~1.4×-wider armored tanks. `now`/`seed` already in scope in
  `drawHeroSprite`; aura tuned to `globalAlpha 0.32 + 0.09·sin` with a 0.55 solid inner stop.
- **v2.14.0** — **6 new sprite heroes** (roster 9 → 15): Shade (green hooded assassin), Nova (purple
  cyber-ninja), Blaze (flame-hair commando), Reaper (grim reaper), Onyx (obsidian horned demon), Titan
  (steel horned knight). Added as `AVATARS` entries (`img:'hero-<name>'`, `armless:true`, unlocks 16/19/
  22/25/28/32; stats span Swift 6.2–6.4/~82 → Tank 4.4–4.7/138–150) + matching `loadImg` calls. Art came
  from user uploads that were already transparent chibi cutouts (same style as the existing heroes) —
  processed via a headless-Chromium canvas script (`scratchpad/process.mjs`): killed the faint <14-alpha
  matte ghost, trimmed to the alpha bbox +8px pad, scaled to 900px tall, re-exported PNG to `assets/img/`.
  Verified transparent-over-green with a contact sheet (`.shots/new-heroes.png`) and in the live avatar
  grid (`.shots/av-bottom.png`) — glows (green/purple/cyan/spectral) preserved, class chips + stats +
  unlock levels correct, no page errors. `look` fallbacks reuse existing `ninja`/`mohawk`/`horns` styles
  (only shown if a PNG fails to load). **Full Roster** achievement retargeted `level>=15 → >=32` (desc
  updated) so it still means "every hero". No new `drawHair`/`portraitChibi` style cases needed.
- **v2.13.0** — **Gun-sound upgrade**: new `fnoise(d,v,type,freq,q,slide)` primitive (biquad-filtered
  noise burst — highpass "crack", bandpass "snap", lowpass "thump", freq can slide) sits beside `noise`.
  The `sfx('shoot',…)` branch now receives the **weapon object** (call sites `fire()` pass `w`, not
  `w.mode`) so sounds are per-gun: `sniper` = highpass crack + sawtooth body + low tail + a delayed echo
  (`setTimeout`), `shotgun` = down-sweeping lowpass blast + crack, `launcher` = low sawtooth WHUMP +
  bandpass whoosh, **Magnum** (`nm==='Magnum'`) = heavy revolver boom, **Crossbow**
  (`nm==='Crossbow'`, shares `mode:'sniper'`) = soft "silent" bolt thwip (no crack), `auto` = tight
  short-tail mechanical, `semi` = snappy crack + body. Each shot gets a `±5%` pitch jitter (`j`) so full-auto isn't
  a robotic click-loop. `flame` reworked to bandpass hiss + low roar; `boom` (rocket airburst) upgraded
  with a crack transient + lowpass debris + sub. `sfx` stays backward-compatible with a bare mode string
  (`typeof mode==='object'` guard). Verified: `node scripts/validate.mjs` + `--shoot` driver run (no new
  page errors; WebAudio actually resumes under Playwright's trusted click gestures).
- **v2.12.0** — **Weapon-select UI upgrade**: `buildWeaponGrid` renders a tier-tinted **Power** bar —
  `statBar('pow','Power','#'+rank, dps/maxDps)` — right under the DPS headline so guns rank at a glance.
  Bar frac is `dps/maxDps` (vs the strongest gun in the whole arsenal), but the **`#N` rank is computed
  among *owned* guns only** (`ownedDps = WEAPONS.filter(weaponUnlocked)…`, `rankOf`), so a Lv-1 player
  sees Pistol #2 / Rifle #1, not #10 — locked cards show the teaser bar with no number. Each card gets a
  **rarity wash** (`--tw` on `.card.wcard` via a top `linear-gradient`; wash colors + alphas `.12–.20` on
  `weaponTier`) and a `t-<tier>` class; the rarity chip carries its tier class (`.wtier.epic` glow /
  `.wtier.legendary` `::after` shimmer sweep, `@keyframes wshimmer`); the **redundant "EQUIPPED" DPS chip
  is suppressed on the selected card** (`unlocked&&!sel`). `statBar` rows carry a `<cls>row` class so the
  Power value can be tinted (`.row.powrow > span:last-child`) and its bar min-width is `6%` (was 4) so the
  weakest sliver stays visible; common's grey Power fill gets a brighter floor (`.card.t-common .bar.pow`).
  Power fill uses `color-mix` with a `@supports` fallback to flat `var(--tier)`. **In-match tie-in**:
  `drawNameplate` draws a thin `weaponTier(h.weapon).c` accent line under the *player's* name, carrying the
  select-screen rarity color into gameplay. Verified headless — `02-weapon.png` (owned ranks), a scrolled
  Lv-99 grab (epic-purple / legendary-gold washes + tinted Power bars + chips), `03-match.png` (accent).
- **v2.11.0** — **procedural walk cycle for the sprite heroes** (fixes "arm spins on a frozen body"):
  `drawHeroSprite` now bobs (`-abs(sin walk)*2.1`), sways (`sin*2.0`) and leans the torso, and a new
  `drawWalkBody(img,DW,DH,gait)` splits the billboard's bottom 40% into left/right halves and lifts
  each `abs(gait)*3.6` in anti-phase so the legs visibly step (single PNG has no frames; upper body is
  drawn last to cover the hip seam). The gun-arm shares the bob/sway frame (`drawHeroArm(h,0)` inside
  `translate(sway,bob)`) so it stays pinned to the chest instead of floating. Idle = breathing bob,
  legs square (`h.walk` freezes when not moving). Verified headless by pinning `player.walk` to
  ±π/2: left-leg-lift vs right-leg-lift stances are clearly distinct, no seam. Also: **+3 achievements**
  (Full Roster `level>=15`, Iron Wall win-as-Sarge, Blur win-as-Lila) and removed the now-orphaned
  `dreads`/`frog` style cases from `drawHair`+`portraitChibi`. Speed/health extremes (Lila 6.3,
  Sarge 140) are ~within the old envelope (was 6.2/135) — left as-is.
- **v2.10.1** — hardening + tuning: (1) `drawHuman` now **skips the 3D billboard for `armless` heroes**
  (`index.html:2626`, `!armless3D && ...`) so a loaded GLB can never hide the drawn gun-arm — verified
  over **http** with three.js live (`threeD:true`) that Cypher still renders the 2D sprite + rifle
  in-hand. (2) **Compressed the unlock curve** — whole roster by Lv 15 (Kai/Milo 1, Chip 2, Lila 3,
  Yuki 5, Vex 7, Sarge 9, Finn 12, Cypher 15), down from Lv 26. Arm pivot reviewed at chest height —
  looks correct, left as-is.
- **v2.10.0** — **removed the 9 original baked-in-gun heroes** (Blaze, Rose, Bjorn, Zane, Wraith,
  Ace, Nova, Onyx, Hopper) at the user's request; the roster is now *only* the 9 armless heroes,
  each with a live 360° gun-arm (see below). Deleted their `assets/img/hero-*.png`, `loadImg` calls
  and `AVATARS` rows. Re-gated the survivors from Lv 1: Kai/Milo unlock:1 (starters), then
  3/6/10/14/18/22/26. `meta.avatar` is already clamped (`index.html:894` + match-start `3248`), so a
  saved index that now points elsewhere/locked falls back to 0 (Kai). 3D layer keys models by avatar
  NAME and only maps generated GLBs (alex/dennis/emily/bo) — none match our names, so all 9 draw the
  2D sprite + arm. Verified headless: avatar grid shows 9 (Kai/Milo unlocked), a live match runs with
  the new heroes as bots (kill feed "Vex 💀 Milo").
- **v2.9.0 arms** — the 9 new heroes are flagged `armless:true`; `drawHeroSprite` now mounts a live
  **gun-arm** on them via `drawHeroArm(h,bob)` — a sleeve-coloured (`look.outfit`) arm pinned at the
  chest that rotates to `h.aim` a full **360°** with `drawGun` in-hand (skin knuckle at the grip,
  support hand on the foregrip for two-handed guns, muzzle flash at the barrel tip). Mirrors the 2D
  chibi's arm rig; the old baked-in-gun heroes are untouched (no `armless` flag → old muzzle-flash
  path). Verified headless via a throwaway `window.__hook` (drives `aimVec`): Cypher+Rifle and
  Lila+Pistol both aim right/up/left/down/diagonal correctly, gun stays upright when aiming left.
- **v2.9.0** — **9 new sprite heroes** (roster now **18**), from the nine "armless" (arms-at-sides)
  PNG portraits: **Kai** (Lv30, 5.6/104, blue-hair shades, `style:'glasses'`), **Milo** (Lv33,
  5.5/110, orange hoodie, `curly`), **Chip** (Lv36, 6.0/88, green backwards-cap kid, `cap`),
  **Lila** (Lv40, 6.3/80 — new fastest, pink tracksuit, `long`), **Yuki** (Lv44, 6.0/90, purple-hair
  ninja girl, `long`), **Vex** (Lv48, 6.1/86, red-bandana hood, `ninja`), **Sarge** (Lv52, 4.6/140 —
  new tankiest, bald soldier, `beard`), **Finn** (Lv57, 5.3/118, blonde leather adventurer, `mohawk`),
  **Cypher** (Lv62, 5.9/96, silver-hair cyber visor, `visor`). Same drop-in pattern: `git mv` each
  UUID PNG → `assets/img/hero-<name>.png`, a `loadImg()`, an `AVATARS` row (guns bake into the sprite
  via `drawHeroSprite`; `look` reuses existing `drawHair` styles so the 2D fallback needs no new
  cases). Verified headless over http: avatar grid renders all 18 with correct stat bars, auto role
  badges, and unlock gates.
- **v2.8.0** — 2 more sprite heroes (roster now **9**): **Onyx** (Lv22, Swift 5.8/100, black hooded
  assassin, `style:'ninja'` fallback) + **Hopper** (Lv26, Swift 6.2/84, suited frog, `style:'frog'`
  fallback). Same drop-in pattern (PNG + `loadImg` + `AVATARS` row); guns baked in → `drawHeroSprite`
  L/R path. Verified: avatar grid renders all 9 with correct gates.
- **v2.7.0** — **5 new sprite heroes** (roster now 7): **Bjorn** (Lv3, Tank 4.8/135, red/beard),
  **Zane** (Lv6, All-round 5.4/108, blue/dreads), **Wraith** (Lv10, Swift 6.1/82, white hood),
  **Ace** (Lv14, Swift 5.7/100, white/cornrows), **Nova** (Lv18, Swift 5.9/92, purple ninja).
  Each is one PNG cutout in `assets/img/hero-*.png` + a `loadImg()` + an `AVATARS` row
  (name/speed/health/unlock/img + `look` fallback). All have guns baked in → they use the existing
  `drawHeroSprite` L/R-flip path (the gunless-art + rotating-gun plan is separate, still pending
  gunless PNGs). Unlock levels gate them behind leveling. Verified: avatar grid renders all 7
  (locked cards dimmed w/ level gates), live BR match clean. Note: headless driver now reports a
  CORS "FAIL" for the 3D layer's locally-vendored `three.module.js` over file:// — pre-existing
  (added by the 3D-preview work on main), benign (falls back to 2D), works over https.
- **v2.6.1** — hero sprites now **turn to face the aim**, not the movement direction. Root cause:
  `integrate()` overwrites `h.faceX` from movement velocity (line ~1750) AFTER `updatePlayer`
  sets it from aim, so a static sprite shot backwards while running (the drawn chibi hid this — its
  gun arm rotated freely). `drawHeroSprite` now derives `flip` from `Math.cos(h.aim)` with a ±0.06
  deadzone + a sticky `h.spriteFlip` so it doesn't jitter aiming near-vertical. Muzzle flash already
  used true aim, so it stays consistent. Verified headless: aim-left→faces left / aim-right→faces
  right while running right.
- **v2.6.0 "Illustrated World"** — first raster-sprite art layer (a deliberate, user-supplied
  break from the "all art drawn with canvas shapes" pillar; degrades safely to the drawn art).
  New `assets/img/` holds 5 PNG cutouts (grass, tree, bush, 2 heroes). An `IMG` cache +
  `loadImg`/`imgOk(key)` load them lazily; every draw path does `const im=imgOk(...)` and falls
  back to canvas shapes if the image never decodes. `AVATARS` **shrank to 2** image heroes —
  **Blaze** (yellow jacket, `img:'hero-blaze'`) + **Rose** (pink, `img:'hero-rose'`), both
  `unlock:1`; each keeps a `look` for the drawn fallback. `meta.avatar` is clamped to the new
  table length right after the `meta` object (stale saved index would otherwise index past it).
  `drawHuman` early-returns to new `drawHeroSprite(h,img)` (billboard: shadow + player ring +
  walk-bob/run-lean + `filter:brightness` hit-flash + muzzle flash along aim + reload ring);
  `portraitChibi` and the menu `renderMenu` fighter portrait draw the PNG bottom-aligned.
  `groundPattern()` builds a 512 tile from the seamless grass PNG with a `GROUND_TINT` dusk/night
  overlay; `drawDecor` tree/bush branches billboard their PNGs (aspect-preserved, feet at anchor).
  Loader `onload` resets `groundKey` + re-renders menu/grid so a late decode still shows. Verified
  headless: live BR match (Blaze player + illustrated grass/tree/bush, no boxes/errors) + avatar
  grid (both hero portraits, correct class chips/stats). More heroes = drop a PNG + a row.
- **v2.5.0 "Arsenal & Fighters"** (2 weapons + 2 avatars → 12 weapons, 17 avatars): **Launcher**
  (Lv12, `mode:'launcher'`) fires a single slow rocket bullet flagged `boom:true`/`rocket:true`;
  `updateBullets` explodes it via the existing `explode()` on any impact / at max range (not
  off-map), splash 90/scaled — self-damage possible like the bomb. **Vipers** (Lv15, `twin:true`)
  fires 2 side-by-side bullets (`shots=w.twin?2`, ±0.02 spread + perpendicular muzzle offset).
  New `drawGun` flags: `tube` (launcher barrel + flared mouth + red stripe) and `twin` (lower
  barrel). Rocket has its own in-flight sprite (warhead+fins+exhaust) in the bullet draw loop;
  `sfx('shoot','launcher')` + WMODE `launcher:'BOOM'` + `.wmode.launcher` CSS; `wstats` shows the
  launcher's 90 splash as its perShot. **Avatars** Seraph (`halo` style — gold ring) + Diablo
  (`horns` style — bone horns), both added to `drawHair` (in-game) AND `portraitChibi` (menu).
  GAME_VERSION 2.5.0.
- **v2.4.0 weapon-select UI revamp**: **weapon art upgraded** — `weaponIcon(w)` now renders on a
  hi-res DPR-scaled canvas (124×58 CSS ×3), ~2× bigger gun (scale cap 1.8→3.6), with a contact
  shadow + drop shadow ("product shot"); the in-game `drawGun` is untouched (perf). Cards also gained
  **rarity tiers** (`weaponTier(w)`
  by unlock level: Common/Rare/Epic/Legendary → `#a7b39a/#5aa8ff/#c08bff/#ffcf3a`) driving a
  `--tier` CSS var used for a colored top-border, icon-plate ring, and a `.wtier` chip; and a
  **DPS-vs-equipped delta** (`dpsDelta`, green ▲ / red ▼ / "EQUIPPED") computed against
  `wstats(WEAPONS[meta.weapon]).dps`. Selecting now rebuilds the grid so all deltas re-baseline to
  the new pick. Locked cards read "🔒 Unlocks at Lv N". GAME_VERSION 2.4.0.
- **v2.3.0 rank ladder + level rewards** (user: "need more levels" — progression flattened after
  the level-25 avatar-unlock ceiling): added a `RANKS` table (Rookie→Fighter→Veteran→Elite→Master→
  Champion→Legend→Mythic→Immortal, thresholds 1/5/10/16/22/30/40/55/75) with `rankFor(lv)` /
  `nextRank(lv)`. `grantXp` now pays coins on every level-up (`levelReward(lv)=20+lv*4`, 24→380🪙)
  and sets `lastLevelCoins`/`lastRankUp`; `levelToast` shows the coin payout + a staggered
  "NEW RANK" toast on promotion. Fighter card shows a gold rank chip (`#menuRank`) + next-rank hint
  (`#menuRankNext`) via renderMenu. Results "one-more-run" teaser (`#rNext`) falls back to the next
  rank once all avatars/weapons are unlocked, so there's always a goal. GAME_VERSION 2.3.0.
- **v2.2.0 "Alive World"**: 🏕 **campfire heal aura** — `campfireHeal(h,dt)` (called from
  updatePlayer) regens `CAMPFIRE.heal` (6) hp/s within `CAMPFIRE.r` (72px) of any cached
  `campfires` (filtered from decor in buildDecor), green heal sparks; grace/full-hp guarded.
  🧟 **indoor-aware zombies** — `updateZombie` now routes to a building's door when the prey is
  inside (`insideBuilding(x,y)` helper): aims at prey for visuals, moves toward the door gap,
  and **skirts the nearer corner** when on the wrong side (verified 247→20px path-in). 🚪
  **second door on big houses** — `wallRects` adds a top-wall door gap for `o.w>BIG_HOUSE` (170);
  the facade-fade `nearDoor` check recognizes both bottom + top doors. 🎯 **BR aim easing** — bots
  also shoot wider during the early warmup: `fire()` uses `botAcc = h.acc*(1+1.6*(1-warm))`,
  `warm=clamp(elapsed/18,0,1)` (complements v2.1.2's sight/reaction easing). Deferred (need splat
  refactor, low value): wall blood streaks + dried-blood aging (see ROADMAP). GAME_VERSION 2.2.0.
- **v2.1.2 menu top-space + BR difficulty** (user-reported): (1) `#startScreen.menu` used
  `padding-top:6vh` which stacked on top of the notch, leaving a big empty band under the Dynamic
  Island. Fixed with `padding-top:calc(env(safe-area-inset-top,0px)+10px)` and made `.screen`
  base padding notch/home-bar-aware too (logo top 51px→9px no-notch; just below notch on device).
  (2) BR was brutal at drop-in (14 armed bots detect at 440–560px, fire in 0.3–0.7s). Added an
  **early-match warmup** in `updateBot`: `warm=clamp(elapsed/18,0,1)`; effective detection range
  `aggro*(0.45+0.55*warm)` and fire-reaction delay scaled up early (extra vs the player:
  `reaction*(2.4-1.4*warm)`). Also BR initial zombies 10→6, and `newBot` now rerolls its spawn if
  within 560px of the player (BR + Squads). GAME_VERSION 2.1.2.
- **v2.1.1 fighter visibility fix** (user-reported: characters looked faded/see-through): `drawDayNight()`
  (the dusk/night screen-space tint) was called AFTER the whole world render, so it dimmed +
  desaturated characters/decor along with the ground → low-contrast, washed-out fighters. Fix:
  moved `drawDayNight()` to run right after the field + ground-decor pass and BEFORE the y-sorted
  entity pass (split the camera-transform into two save/translate blocks), so the tint colors only
  the ground and characters draw at full brightness on top. Also softened night from
  `rgba(18,28,74,.36)`→`.30`. Day is a no-op (unchanged). Verified night + dusk headless — fighters
  now crisp/opaque. **Gotcha: full-screen canvas overlays (tints/vignettes) drawn after entities
  wash them out; tint the ground layer, not the entities.** GAME_VERSION 2.1.1.
- **v2.1.0 main-menu split**: the old `#startScreen` combined the landing page + mode picker.
  Now `#startScreen` is a pure **home screen** (logo, fighter card, ▶ PLAY, daily, stats,
  achievements/shop) and the mode cards moved to a new `#modeScreen` (`.top` back arrow
  `#modeBack`, heading, three `.modecard`s, a mode-aware Continue button `#toAvatarBtn` whose
  `#modeLabel` reads "CONTINUE · <MODE>"). Flow: home → `#toModeBtn` → mode → `#toAvatarBtn`
  (goAvatar) → avatar → weapon → drop in. `show()` toggles `modeScreen` too and calls
  `renderModeSel()` on it. Portrait-tap/`changeAvatar` still jump straight to avatar (change-fighter
  shortcut). **Driver + SKILL.md updated**: the menu flow now needs a `#toModeBtn` click before
  the `[data-mode]` card (cards live on the mode screen now). GAME_VERSION 2.1.0.
- **v2.0.1 layout fixes** (user-reported via screenshots): (1) the v2.0.0 safe-area rule
  `#powers{bottom:calc(210px+env())}` came LATER in the sheet than the `@media(max-height:560px)`
  landscape block and — since media queries add no specificity — clobbered `bottom:12px`, so in
  landscape the power buttons snapped back to the portrait mid-screen spot and floated over the
  player. Fix: re-assert the landscape bottom-centre row in a media block at the very END of the
  stylesheet (last-in-source wins). Gotcha: **any `#foo` rule after a `@media` `#foo` rule wins
  regardless of the media query** — keep responsive overrides last. (2) On iOS the menu flex
  column compressed (default `flex-shrink:1`) so PLAY overlapped the Daily Challenge card, worsened
  by the PLAY glow bleeding down. Fix: `#startScreen.menu > *{flex-shrink:0}` (column scrolls
  instead of overlapping) + tamed the play glow + explicit 14px margins. GAME_VERSION 2.0.1.
- **v2.0.0 "Interface Overhaul"**: a **UI v2 override layer** appended at the END of the
  `<style>` block (tune tokens there, not per-rule) — deep "midnight forest" gradients on
  `.screen`, frosted glass (`backdrop-filter:blur` + gradient-over-glass backgrounds) on cards /
  fighter / mode cards / stat tiles / HUD panels / modals, entrance motion (`scrIn` on
  `.screen:not(.hidden)`, `mdIn` slide-up on `.modal:not(.hidden)`), gradient-text logo
  (`background-clip:text` + drop-shadow glow; `.logo small` resets fill), hero-button `sheen`
  sweep (`.btn.play::after` only — deliberately not all buttons), springier `.btn` press curve,
  and notch **safe-areas** (`env(safe-area-inset-*)` on `#gearHud/#xpwrap/#mmwrap/#powers`).
  Selectors untouched → zero JS changes. Verified every screen headless (start/avatar/weapon/
  settings/HUD/results), no page errors; backdrop-filter renders in headless Chromium.
  ⚠ Multi-layer `background: <gradient> padding-box, <color>` — the color must be the LAST layer.
  GAME_VERSION 2.0.0. (User asked about "other languages" — declined: browser ships HTML/CSS/JS;
  a build step would break the single-file pillar without improving the UI.)
- **v1.10.0 "Growing World"**: the map scales with `meta.level` in `buildDecor` — buildings
  `9+floor(lvl/4)` (cap 16, each still hiding interior loot), ponds `7+floor(lvl/8)` (cap 10),
  trees/bushes/grass/flowers/rocks/dirt get an `xtra=min(lvl,20)` density bonus. **Level-milestone
  landmarks** (new decor types, y-sorted via `TALL_DECOR` map): `campfire` (Lv3 — stone ring,
  crossed logs, flickering flame, warm glow at night), `fence` (Lv6 — post-and-rail runs,
  horizontal/vertical), `well` (Lv10 — stone rim, water hole, posts + gable roof, rope+bucket),
  `statue` (Lv15 — weathered stone hero on a pedestal w/ cracks + moss). All placed via
  `decorSpot` (avoid buildings/ponds), decorative only (no collision). Verified scaling
  lvl 1/5/10/20/30 → buildings 9/10/11/14/16, landmarks appear on schedule; per-landmark
  screenshots. Also 🩸 **blood splatter**: hits spray directionally along the shot path (count
  scales w/ dmg) + close mist + ground splatter decal on 12+ dmg (cap 220 live); deaths add a
  directional gout + satellite pools. **All blood is red** (user call — dropped the green
  zombie-goo convention). GAME_VERSION 1.10.0.
- **v1.9.0 "Open Doors"**: 🚪 **enterable buildings** — buildings are hollow: `wallRects(o)` returns
  4 wall rects with a bottom-centre door gap (`WALL_T=9`, `DOOR_HALF=21` → 42px gap: humans r15 fit,
  brutes r20 barely). `resolveObstacles`/`bulletInObstacle` collide per-wall via `pushOutRect`, so
  entities walk in through the door and bullets pass doorways but not walls. Rendering splits into
  two y-sorted layers: `drawBuildingBase` (shadow + wood floor/rug/crate/table + wall frame,
  sorted at the building's TOP edge so entities inside draw on top) and `drawBuilding` facade
  (sorted at bottom edge, `d.fade` → 0.15 when the player is inside or at the door, lerped;
  computed in the base pass). Interior **loot**: `spawnMatch` drops one `makePickup` inside every
  building (pickup y-sorts under the facade → hidden until entered). Functional tests: walk in
  through door / blocked by top wall / blocked by side wall — all pixel-exact. 🔫 **weapon detail
  pass** (`drawGun` + GUNK flags): trigger guards (`guard`), pistol slide serrations (`serr`),
  wood-grain waves (`wood`), handguard vents (`vents`), muzzle-brake slots (`brake`), muzzle cap
  rings (`muzzle`), magnum nickel top + gold trigger/band (`nickel`), hazard stripes on the flame
  tank (`hazard`), minigun rotary barrel cluster (`cluster`) — cards upgrade automatically via
  `weaponIcon`. GAME_VERSION 1.9.0.
- **v1.8.0 "Juice & Hooks"**: ⚡ **kill combos** — kills inside a 3s window chain (`combo`/`comboT`,
  `COMBO_WIN`), XP multiplied up to 3× (`1+(combo-1)*0.25`), gold "COMBO xN" floaters + rising
  `sfx('combo',n)`, an on-screen combo meter w/ draining chain bar (drawn after the streak callout),
  and **hitstop** — `hitstop` timer set on player kills scales gameplay `dt` ×0.15 for a slow-mo
  beat (escalates with combo, cap 0.12s; decremented by wall dt in `loop`). `matchStat.bestCombo`
  feeds 2 new achievements (`combo4` Chain Reaction, `combo6` Kill Frenzy → 16 total). **Zombie
  animation pass** (`drawZombie`): drunken lurch lean (vx tilt + never-settling sway via per-zombie
  `seed`), clawing out-of-phase arms w/ stubby fingers, head loll, **attack lunge** (`z.lunge` set
  on hit in `updateZombie`, snap-toward + swell + open jaw w/ teeth), **glowing eyes at night**
  (`timeOfDay!=='day'`), runner scrabble-dirt + brute stomp-clods, and a green death-pop ring in
  `die()`. **Results hooks**: `nextUnlock()` teaser (`#rNext`, "🔓 X unlocks at Lv N — M XP to go")
  + "🔥 SO CLOSE!"/"😤 Almost had it!" flavor on places 2/3.
- **Core loop**: avatar select (15 chars, level-gated unlocks), weapon select, grass-field
  arena, shrinking "safe area", 15-player field of bot humans + roaming zombies (normal/
  runner/brute), XP/level, results screen. Twin-stick touch + WASD/mouse + gamepad.
- **Weapons (10)**: Pistol, Rifle, Shotgun, SMG, Magnum, Sniper, Crossbow, Flamethrower
  (burn DoT), Minigun, Tommy. Ammo + auto-reload, pistol crit, sniper/crossbow pierce.
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
- **Decor placement cleanup**: new `decorSpot(m)` helper retries `blockedSpawn` so trees / bushes /
  rocks no longer spawn on buildings or in ponds (grass/flowers left as-is — tiny ground decor).
  Verified 0/22200 blocked placements over 300 worlds.
- **Buildings-in-ponds fix**: `buildDecor` placed buildings checking only other buildings + map
  centre, never water — so houses could spawn on top of ponds. Added a pond-AABB rejection
  (`wd.s+30` × `wd.s*0.64+30`) to the building placement loop. Verified 0 overlaps across 400
  regenerated worlds (3600 buildings), building count unaffected. (Reported via landscape screenshot.)
- **Landscape HUD fix**: the bottom-anchored vertical `#powers` stack (`bottom:210px`, tuned for
  tall portrait) rode up into the top-right minimap on short/landscape viewports. Added
  `@media (max-height:560px)` → powers become a compact **bottom-centre row**, minimap scales to
  .82, xp pill narrows. Portrait unaffected. (Reported via a real landscape phone screenshot.)
- **In-game HUD upgrade**: XP row is now a flex pill — a green `#lvlText` LV badge + a glossy
  `#xpbar` (`::after` top-sheen). Minimap sits in a translucent framed `#mmwrap` panel with
  icon-led stat rows (`.srow`/`.si`: 👥 players / 💀 kills / ⏱ safe / 📶 fps, safe value yellow).
  Power buttons get a `.ready` glow when off cooldown (toggled in `refreshHud`) and desktop-only
  keybind hints (`.power .key` Q/E/F, hidden via `body.touch` — set from `isTouch`).
- **Results & settings UI upgrade**: results screen (`showResults`) rebuilt as a match-summary
  card — 4 stat tiles in a 2×2 grid (Kills / Place(or Wave) / Survived / XP), an animated XP-gain
  bar with LEVEL-UP text, a bordered career panel, and a pulsing gold glow on `.placard.win`
  (`winGlow`). Settings options got icons (`.oic`) + left-aligned layout; the music toggle uses a
  `#sMusicTxt` span so setting its text doesn't wipe the icon.
- **Avatar-select UI upgrade** (matches the weapon cards): `buildAvatarGrid` adds a class chip
  (`avClass`: Tank hp≥130 / Swift spd≥5.6 / All-round) next to the name, color-coded Speed (cyan
  `.bar.spd`) / Health (green `.bar.hp`) bars via the shared `statBar`, and a SELECTED ribbon that
  follows the click. Reuses `.wtop`/`.nm2`/`.equip` from the weapon cards.
- **Weapon-select UI upgrade**: `buildWeaponGrid` cards now show a color-coded **fire-mode chip**
  (SEMI/AUTO/SHOT/SNIPE/FLAME), a big gold **DPS headline** (`wstats(w)`: perShot×mag / (mag·fireCd
  + reload), pellets folded in for shotgun/flame), **color-coded stat bars** (dmg red / fire yellow
  / mag green / range blue via `statBar` + `.bar.<cls>` CSS), and an **EQUIPPED ribbon** on the
  selected card (moved on click). Fire-rate row shows rounded RPM.
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
- **Game-updated notification**: `GAME_VERSION` + `CHANGELOG` consts (top entry = newest) near the
  data tables. `maybeShowWhatsNew()` at boot: brand-new players (no seenver, 0 matches, lvl 1) get
  silently stamped; returning players see the `#whatsnew` modal (🎉 burst, gold version chip,
  feature cards) once per version — dismissing stamps `dd2_seenver`. Footer "vX · what's new" link
  (`#verLink`) reopens it anytime. **Bump GAME_VERSION + add a CHANGELOG entry when shipping
  player-visible changes.**
- **Character upgrade pass 3** (drawHuman): body **lean** into the run (rotate by vx, shadow stays
  flat), **second arm** — support hand on the foregrip for two-handed guns, free swinging/hanging
  back arm for Pistol/Magnum (`oneHand`), **idle breathing** (time-based bob via per-entity
  `seed` added in makeHuman), **blink** every ~3.4s, **pupils track aim**, **low-HP face** (<30%:
  knit brows, gritted mouth, looping sweat drop), **belt + gold buckle** on all outfits and a
  studded **bandolier** on heavies (avatar.health>=118), and `stepDust(h,dt)` foot-dust puffs
  (called from updatePlayer + updateBot; guards on speed² > 3600). Verify with the scratchpad
  lineup harness: hook pins a row of avatars w/ different weapons + a 20%-hp one in front of the
  camera (grace=999 freezes firing → giant "999" GET READY text in shots is a test artifact).
- **Achievements** (14 badges): `ACHIEVEMENTS` table near `saveMeta` — each `{id,icon,name,desc,test(meta,ctx)}`.
  Career tests read `meta` (wins/ckills/bestStreak/bestWave/matches/level); per-match feats read a
  `ctx` built in `showResults` from `killsTotal` + `matchStat` ({dmgTaken,grappled}, reset in
  `spawnMatch`, fed by `hurt` for player dmg and `castGrapple` for grapple use). `checkAchievements(ctx)`
  runs after career stats save in `showResults`, adds newly-passed ids to `meta.achieved` (persisted as
  `dd2_ach` comma string), and staggers a "🏅 X unlocked!" toast per unlock. UI: a `🏅 Achievements N/14`
  button on the start screen (count set in `renderStats`) opens the `#achievements` `.modal` — a
  `.achgrid` of `.achcard`s (unlocked = white + icon + green ✓, locked = dashed/grey + 🔒). Reuses the
  modal scroll + sticky-Close fix, so the badge wall scrolls on short screens.
- **Modal overflow fix**: `.modal` (Settings/Results) now uses `justify-content:safe center` +
  `overflow-y:auto` so it centers when it fits and top-anchors + scrolls when the content is
  taller than the viewport (portrait / short-height phones). Before, `justify-content:center`
  with no scroll clipped the top of the list and put the Close button off-screen. Verified
  headless at 430×480 (overflow → heading anchored at top, Close reachable via scroll).
- **Automation** (`.claude/`): PostToolUse parse-check hook on `index.html`, SessionStart
  readiness check, permission allowlist. Plus `scripts/parse-check.mjs` + `scripts/validate.mjs`.
  ⚠ Hooks activate only after `/hooks` reload or a session restart (the `.claude/` dir was
  created mid-session).
- **Zombie animation pass (v1.8.0)**: `drawZombie` caught up with the human pass — per-zombie
  `seed` (makeZombie), **lurch lean** (`ctx.rotate` after the flat shadow: forward pitch into
  `flip` + uneven `walk*0.5`+`walk` stagger; gentle sway when idle), **reaching front arm** that
  paws with the shamble + **dragging back arm** with knuckles trailing near the ground (both get
  hand blobs), idle breathing sway on `bob`, and **dirt puffs** in `updateZombie` (speed² > 2500,
  rate & spread scale with `z.size`, `inView`-guarded). Verified via scratchpad hook spawning all
  3 kinds beside the player.
- **Portrait sync (v1.8.0)**: `portraitChibi` now draws the character-pass-3 torso details —
  belt + gold buckle on everyone, studded bandolier on heavies (`av.health>=118`), collar arc —
  so grid/menu portraits match in-game chibis.
- **Coins & shop (v1.8.0)**: `meta.coins` (dd2_coins) earned at match end (5/kill, +25 win,
  +4/wave in horde), from achievement tiers, and the daily. `SHOP_ITEMS` = 6 cosmetic **trails**
  (150–500 🪙; colors fed to `spark` from `updatePlayer`, player-only, speed-gated like stepDust);
  `meta.owned`/`meta.trail` persist (dd2_owned/dd2_trail). `#shop` modal (reuses `.modal` +
  `.achcard` rows, delegated `data-shop` clicks): buy → auto-equip, tap owned → equip, "No Trail"
  free. Coin badge (`#menuCoins`) sits in the start-screen level row.
- **Tiered achievements (v1.8.0)**: `ACHIEVEMENTS` grew 14→21, each with `tier:
  bronze|silver|gold` (`TIER_COINS` 25/75/150 paid on unlock; existing ids/saves unchanged). New:
  champ15, streak5, wave15, matches50, kills500, lvl20, daily3. Grid shows tier left-border +
  medal chip + coin reward; header counts per-tier medals.
- **Daily challenge (v1.8.0)**: one deterministic challenge/day (`todaysDaily()` hashes
  `dayKey()` into `DAILIES[7]`; tests reuse the achievements match-ctx, which now also carries
  `wave` + `time`). `checkDaily` in `showResults` pays 60 🪙 once/day (dd2_daily = day-key,
  dd2_dailies counts for the daily3 badge). Start screen shows a `#dailyCard` (✅/DONE state).
- **Results unlock banner (v1.8.0)**: `#rUnlocks` strip between stat tiles and the XP bar —
  always a "🪙 +N coins" chip, plus a tier-bordered row per fresh achievement and a green
  "📅 Daily complete" row (`.runlocks:empty` hides it outside matches).

## How to run / validate / deploy
- The stage **fills the whole viewport** on every device (`resize()` sets `#game` to
  `window.innerWidth/Height` in JS — never CSS `min()/calc()`, which iOS collapses to 0).
- **Play**: `https://raw.githack.com/Deegan4/last-pulse/main/index.html` (repo is **public**);
  add a `?v=...` cache-buster after pushing. A **Vercel** integration is connected
  (`kollins-projects/last-pulse`) and auto-deploys `main` + PR branches on push — its deployment
  is the "CI" status check on PRs. GitHub Pages remains an option but needs the one-time
  user-side toggle (Settings → Pages → `main` / root).
- **Validate**: `node scripts/validate.mjs` (parse-checks both script blocks), then drive the
  real game headless with `.claude/skills/run-brawl-arena/driver.mjs --play [--mode m --shoot]`
  (bundled Chromium + global playwright, ~430×932; fails on any page error). Read the PNGs.
  For closure-scoped internals, awk-inject a `window.__hook` into a **throwaway copy** — never
  commit hooks (`grep -c "window.__" index.html` → 0).
- **Deploy**: work on branch `claude/skills-37sg64`, push, open a **draft PR**. Direct
  `git push origin main` fails with **HTTP 503** (persistent) — when the user says "push to
  main", mark the PR ready and **merge via the GitHub API** (rebase method), then re-sync:
  `git fetch origin main && git checkout -B claude/skills-37sg64 origin/main` (+
  `--force-with-lease` on the next branch push; the branch holds only already-merged history).
  The API rebase-merge stamps GitHub's committer → merged commits show "Unverified" and the
  stop-hook flags them; it's cosmetic — do NOT rewrite `main` over it.

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
  competent kiting run is the check. Use a temporary `window.__hook` in a throwaway copy for
  verification and **never commit hooks**.
- **Meshy 3D assets are blocked in this session**: no `MESHY_API_KEY` in the env and the Meshy
  MCP needs interactive OAuth. 3/28 manifest assets generated (alex, zombie-normal, pistol).
  Unblock: user adds `MESHY_API_KEY` to the environment config (never paste keys into chat) or
  authorizes the MCP in an interactive session, then `node scripts/gen-meshy.mjs`.
- The three.js CDN (unpkg) is blocked headless, so the 3D path can only be verified in a real
  browser over http(s) — the 2D fallback is the tested path.

## Next enhancements
**The forward plan now lives in [ROADMAP.md](ROADMAP.md)** — versioned feature bundles
(v1.11 "Alive World" → v1.13 "Modes & Bosses"), the balance/tuning knob table, and the parked
moonshots (Meshy 3D — still blocked on `MESHY_API_KEY` —, online, leaderboards, PWA). Keep
ROADMAP.md checked off / re-prioritized as things ship; this file stays the record of what
already landed.

## Open questions for the user
- Real on-phone feel: movement speed, fire cadence, zombie pressure, weapon balance, and the new
  v1.8.0 shop/daily/coin flow — needs playtest feedback to tune (are trail prices fair?).
- Batch several changes per `GAME_VERSION` bump, or bump every ship? (Currently: bump per ship.)
- Provide `MESHY_API_KEY` via environment config to unblock 3D character generation?
