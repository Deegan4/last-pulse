# ROADMAP.md — Last Pulse future plan

_The forward-looking plan for **Last Pulse** (v2.53.0). [memory.md](memory.md) records what
shipped and how; this file says what's next and why. When an item ships: add its memory.md
bullet, bump `GAME_VERSION` + `CHANGELOG` in index.html, and check it off here._

> The header version above is **gated by `scripts/validate.mjs`** — it must equal `GAME_VERSION`.
> With no CI and no build step this file is the project's state machine; it once sat at v1.10.0
> while v2.33.0 shipped, so retired features (Battle Royale, Squads) stayed on the plan as "todo"
> and boss waves were listed as unbuilt months after shipping. Re-sync it in the same commit that
> bumps the version. **When it disagrees with the code, the code wins** — verify against
> `index.html` before trusting any bullet below.

## Shipped since this plan was last synced (v2.7.0 → v2.34.0)

Reconstructed from `git log`; see [memory.md](memory.md) for the per-version detail.

- **Roster rebuild** (v2.7.0–v2.11.0) — the intermediate guns-baked-in heroes were *replaced*:
  `AVATARS` is now 15 `armless:true` sprite heroes (Kai…Titan) with a live 360° gun-arm, signature
  auras, and a procedural walk cycle. This closes the old "Gunless heroes + rotating gun" item.
- **Horde depth** (v2.20.0–v2.21.1) — climbable watchtowers, Spitter/Bloater/Stalker enemy kinds,
  a steeper wave curve, and **Juggernaut boss waves every 5th wave** (closes the v1.13 boss item).
- **Builders mode** — in-match scrap economy with walls, spikes and turrets.
- **Audio** — a metalcore soundtrack was added (v2.19) then **removed entirely** (v2.24); the
  engine is SFX-only. v2.34.0 rebuilt the SFX engine (below).
- **Monetisation & support** — Stripe donate link, save codes, save-loss warnings.
- **PWA / iOS** — web manifest + app icon, Add-to-Home-Screen guide, and a long series of
  safe-area fixes ending in `effInsets()` substituting hardware insets when iOS `env()` lies.
- **UI** — ability buttons collapsed into a FAB, Quit to Main Menu, Extended Magazines shop
  upgrade, illustrated + animated menu backdrop, rich social-share preview.
- **v2.33.0 (breaking)** — **Battle Royale & Squads retired**; Endless Horde is the only mode
  (`const MODES = ['horde']`, engine paths kept dormant).

## v2.34 — "Real Audio & honest diagnostics" (shipped)

- [x] **Physically-modelled SFX engine** — shared pre-rendered noise buffer (no per-shot
      `createBuffer` churn), exponential envelopes with a ~1.5ms attack, procedural **convolution
      reverb** (outdoor slap-back IR), a master **limiter**, and **stereo pan + distance
      attenuation/low-pass** via an optional `sfx(kind, mode, src)` third argument.
- [x] **Layered gun model** — pin → crack → body → sub → tail → action → brass, per weapon.
- [x] **Organic creature vocals** — `growl()` formant-filters a sawtooth through two vowel
      bandpasses; `flesh()` gives hits a wet, non-metallic impact.
- [x] **Voice budget** — `budget()`/`voice()` shed tails, brass and debris above ~24 in-flight
      layers so the richer model can't cliff on mobile; transients are never shed.
- [x] **Screen Fit verdict** — `fitChecks()` turns the diagnostic into pass/fail assertions and
      distinguishes "correct in a Safari tab" from "insets broken in the installed app".
- [x] **Tooling gates** — `validate.mjs` now gates the ROADMAP header version and every `--mode`
      named in the docs against `MODES`; `driver.mjs` gained a `--waves` balance/perf harness.

## v2.47 — "Village battlefield polish" (shipped)

- [x] **Clash-inspired menu identity** — the current menu skin uses beveled gold title lettering,
      carved-wood headers, stone/parchment cards, raised green/blue buttons and red banner accents.
- [x] **Village prop language** — the new supply caches, barrels, signal posts and med tents now
      use wood, stone, gold and banner details so arena objects match the menu identity.
- [x] **Clean visual validation** — the screenshot driver serves over local HTTP, avoiding the
      old `file://` module CORS warning while still driving the real menu-to-match path.

## v2.37 — "Deeper controller support" (shipped)

- [x] **Gamepad grapple + pause** — `readGamepad()`/`updatePlayer()` (`index.html`) already
      covered move/aim/fire/reload/lightning/bomb; added grapple (L3, button 10) and a Start
      (button 9) pause toggle, freeing button 9 off the old bomb cluster (bomb is now button 6
      only). Gamepad is now sampled once per frame into `curGp` (was a per-frame double-read bug
      waiting to break edge-detection on every other button — see memory.md).
- [x] **Controller-detected HUD indicator** — a quiet 🎮 icon appears top-right once `gpSeen`
      flips true, so players know their input was picked up.
- [x] **Gamepad menu navigation** (shipped v2.40.0) — see below.

## v2.38 — "Distinct monster silhouettes" (shipped)

- [x] **Stalker gets a distinct silhouette** — leaner torso proportions (`tw`/`th` in `drawZombie`
      now branch on `stalker`, thinner than `runner`) plus a 3-spike quilled ridge along the back,
      drawn in the same behind-torso layer as the brute's shoulder spikes.
- [x] **Juggernaut gets visible armor** — a flat chest plate, angular shoulder guards, and 3 rivet
      accents (`eye`-colored) drawn over the torso. Closes the v1.13 gap where the roadmap text
      called juggernauts "armored" long before the art did.
- [x] Both additions gated `&& !flash` like existing brute-spike/spitter-sac/bloater-blister
      details, so they cleanly vanish during hit-flash the same way everything else does.

## v2.40 — "Gamepad menu navigation" (shipped)

- [x] **Full controller menu coverage** — `readGamepad()` (`index.html`) gained edge-triggered
      `navUp`/`navDown`/`navLeft`/`navRight` (d-pad or left-stick, one step per press) and
      `confirm` (A button); `updateGamepadMenuNav()` drives focus across the avatar grid, weapon
      grid, settings list, and results screen using the same single per-frame `curGp` sample
      `loop()` already took for in-match input — no second `readGamepad()` call anywhere.
- [x] **`curGp` now sampled on every screen**, not just `'playing'` — was previously gated behind
      `screenState==='playing'`, which is exactly why menus couldn't read the pad before.
- [x] **X/B doubles as menu Back** (closes Settings), reusing the same edge-triggered `reload`
      signal already used in-match — same "one button, two contexts" pattern Start already
      established for pause-toggle.
- [x] **`.gpfocus` focus ring** — a cyan outline distinct from `.card.sel`'s lime "equipped"
      border, so "what's focused" and "what's selected" never look like the same thing.
- Verified via a throwaway `window.__gpTest` hook driving `updateGamepadMenuNav()` directly with
  synthetic input (headless Chromium reports an empty gamepad list, so real hardware can't be
  simulated) — confirmed focus moves correctly through every grid/list and `confirm`/`back`
  trigger the right underlying click handlers. **Still needs a real-controller playtest** for
  button feel — synthetic input can't validate that.

## v2.40.1 — "Full menu coverage + DualSense rumble" (shipped)

- [x] **Achievements, Shop, Support, Add-to-Home-Screen, What's New** all added to
      `GP_SIMPLE_MODALS` (`index.html`) — each is just its action button(s) + Close, in visual
      order; Shop cards reuse the existing `#shopGrid` delegated click listener since `.click()`
      on the card itself still matches `e.target.closest('[data-upg],[data-shop]')`.
- [x] **Settings sliders (SFX volume, aim sensitivity) are gamepad-adjustable** — left/right on a
      focused `<input type=range>` steps its value and dispatches a real `input` event, reusing
      the existing `sfxVol`/`aimSens` listeners verbatim rather than duplicating their logic.
- [x] **`gpMenuTargets()` now returns `{targets, cols, closeId}` together** — closeId travels with
      the target list so `back` closes whichever modal is actually open, not just Settings.
- [x] **DualSense rumble** — `gpRumble()` calls the standard Gamepad API's `vibrationActuator`
      (feature-detected, try/catch-wrapped so a missing rumble can never throw mid-combat) on two
      moments: the player taking a hit (magnitude scaled with damage) and landing a kill. Works
      identically over Bluetooth and USB — no PS5-specific code needed, since rumble is part of
      the same `'standard'`-mapping abstraction as button/axis reads.
- [x] **Non-standard controller mapping is now surfaced to the player**, not just devtools — the
      connect toast reads "buttons may be misaligned" when `gamepad.mapping !== 'standard'`
      (known gap on some Safari/WebKit + DualSense-over-Bluetooth combinations), in addition to
      the existing `console.warn` for diagnosability.
- **Still open**: real-hardware verification for both the menu coverage and the rumble feel —
  synthetic input can drive the code paths and confirm nothing throws, but not confirm how a
  real DualSense over Bluetooth actually feels or whether `mapping` reports `'standard'` on your
  target browsers.

## v2.40.2 — "Controller status in Settings" (shipped)

- [x] **Live controller-status card** — a new `.ctrlrow` info card in the Settings modal
      (`index.html`, `#sCtrlRow`) shows "🟢 &lt;pad name&gt; connected" or "⚪ No controller
      connected", refreshed every frame Settings is open (`syncControllerStatus()`, called from
      `loop()`'s menu branch, `openSettings()`, and both `gamepadconnected`/`gamepaddisconnected`
      listeners) plus a hint line: pairing instructions when nothing's connected, control-scheme
      reminder when something is, or a non-standard-mapping warning when relevant.
- Addresses direct user feedback: there was previously **nothing in the UI** telling a player a
  controller could be paired at all, or confirming a pairing worked — the only prior signal was a
  small 🎮 HUD icon that only appears mid-match once `gpSeen` flips true (which itself requires
  actual stick/button movement), not discoverable before dropping into a fight.
- Web pages cannot trigger or complete Bluetooth pairing themselves (that's an OS-level
  handshake) — this card's job is purely live status + pointing the player at the right OS
  setting, not literally "connecting" a controller from in-page.

## v2.41.0 — "Local 2-player co-op" (shipped)

- [x] **Auto-join on 2nd controller** — `tryJoinPlayer2()` (`index.html`) checks the connected-pad
      list every frame while a match is live (and once at `spawnMatch()`, and on every
      `gamepadconnected` event) and spawns Player 2 the instant a 2nd pad is present — no join
      screen. Player 2 is gamepad-only by design (no touch/keyboard fallback) and has no separate
      save/profile: fixed avatar, Player 1's current weapon, kills/XP/coins still accrue to
      Player 1's `meta`, same as a guest controller on a console.
- [x] **Per-controller input, not shared globals** — `readGamepad()` was refactored into
      `readGamepadFrom(gp, edgeState)`, a pure function taking an explicit prev-button-state bag,
      because the old module-level `gpRP`/`gpLP`/etc. singletons would have silently corrupted
      each other's edge-detection the moment two controllers were both pressing buttons. Two
      independent state bags (`gp1Edge`/`gp2Edge`) now exist. `updatePlayer(h,dt,gp,readShared)`
      gained a `readShared` flag so Player 2 never reads the shared `keys{}`/`mouse`/on-screen
      joystick singletons that Player 1's input still uses — without it, keyboard/touch input
      would have silently steered BOTH players at once.
- [x] **Shared, non-zooming camera** — the camera frames the midpoint of both alive players;
      `leashPlayer2()` gently clamps Player 2's position to stay within camera range of Player 1
      after each frame's movement, so a co-op partner can't wander off-screen. A dynamic
      zoom-to-fit-both camera was **deliberately cut** from this pass — the codebase's culling
      (`inView()`), vignette, and a couple of other draw-time rects all assume the visible world
      span equals exactly `W×H`; correctly threading a variable zoom through all of them without
      being able to verify the result on a real 2-controller device was judged a worse tradeoff
      than a simple position leash that touches zero rendering code. If zoom is wanted later,
      every `cam.x`/`cam.y` read in the file currently assumes zoom≡1 — audit all of them together.
- [x] **Per-player rumble + naming** — `gpRumble()` now takes a `padIndex` so each player's own
      controller rumbles on their own hits/kills, not always pad 0 (`h.gpIndex`, set at spawn).
      Kill-feed text was fixed to use `e.isPlayer2` before the existing `e.isPlayer` check, since
      Player 2 is also `isPlayer:true` (that's what exempts them from bot AI) — without the
      `isPlayer2` check first, every Player 2 kill/death would have displayed Player 1's name.
- **Design choice, not a bug**: the match ends when Player 1 dies, regardless of Player 2's
  state — this already fell out of the existing `if(!player.alive)` end-check with zero code
  change, and matches "results/achievements are Player 1's run" from the auto-join design above.
- **Still open**: real 2-controller on-device playtest — verified headless via a mocked
  `navigator.getGamepads()` (join, independent movement, the leash, per-player rumble targeting,
  and kill-feed naming all checked and passing), but mocked input can't validate actual feel,
  whether the leash radius (`Math.min(W,H)*0.42`) is comfortable in practice, or real controller
  pairing behavior.

## Design pillars (don't break these)

1. **One file, no build** — everything stays in `index.html`; features that need a backend or
   bundler live in "Moonshots" until explicitly approved.
2. **Portrait, mobile-first** — every feature must work with two thumbs on a phone; desktop is
   the fallback, not the target.
3. **Juice first** — a mechanic isn't done until it *feels* good (SFX + particles + feedback).
   Combos/hitstop set the bar.
4. **Sessions are short, progression is long** — matches stay 2–5 minutes; retention comes from
   XP, coins, badges, dailies, and the growing world.
5. **Fail-safe enhancement** — optional layers (3D models, future add-ons) must degrade
   gracefully to the core 2D game.

## v1.11 — "Alive World" (mostly shipped as v2.2.0)

- [x] **Campfire heal aura** — `campfireHeal(h,dt)`: `CAMPFIRE.heal` hp/s within `CAMPFIRE.r`,
      green heal sparks. Player-only for now (bots could be added — small compute cost).
- [x] **Wall blood streaks** (shipped v2.34.2) — `hurt()`/`die()` call `spraySplatOnWall`, which
      finds the nearest building wall segment within ~22px of the hit and, if close enough, drops
      a fading drip decal (`wallStreaks[]`) drawn on the wall face in `drawBuilding`. Interior
      wall-frame (`drawBuildingBase`) doesn't get streaks — only the exterior facade — so a fight
      that moves inside won't show marks on the interior frame; revisit if that's noticeable.
- [x] **Indoor-aware zombies** — `updateZombie` routes to the nearest door (skirts the nearer
      corner when on the wrong side) via `insideBuilding`. Verified: zombie navigates 247→20px.
- [x] **Second door on large houses** — `wallRects` adds a top-wall door gap for `w>BIG_HOUSE`
      (170); facade fade recognizes both doors.
- [ ] **Dried-blood aging** — _deferred_: splat color is stored as an `'rgba(r,g,b,'` prefix
      string; a clean darken-over-age needs numeric rgb storage or an overlay pass. Low value.

_Remaining Alive-World polish (wall streaks, dried blood) parked — they need a splat-system
refactor for marginal payoff; revisit if doing a broader gore pass._

## v1.12 — "Arsenal & Fighters" (weapons + fighters shipped as v2.5.0)

- [x] **2 new weapons** — **Launcher** (Lv12, `mode:'launcher'`, slow rocket → `explode()` on
      impact/timeout via `boom` bullet flag; `tube` GUNK art) and **Vipers** (Lv15, twin-barrel
      SMG: `twin:true` fires 2 side-by-side bullets; `twin` GUNK art).
- [x] **2 new avatars** — **Seraph** (Lv28, `halo` style) and **Diablo** (Lv32, `horns` style);
      both styles added to `drawHair` AND `portraitChibi`.
- [x] **Trail shop wave 2** (shipped v2.50.0) — the trail roster had already grown to 6 (ember,
      frost, toxic, shadow, star, royal) in earlier passes; this closes the remaining half of the
      item, a **banner color** cosmetic slot on the nameplate: 4 colors (crimson, azure, gold,
      violet), bought/equipped from Shop → Nameplate Banner, drawn as a colored pill behind the
      player's own name in `drawNameplate`.
- [ ] **Weekly challenge** — a harder 7-day cousin of the daily (worth 200 🪙), same
      deterministic day-hash pattern. _(not yet)_

## v2.6 — "Illustrated World" (shipped)

- [x] **Raster art layer** — the first hand-drawn PNG sprites (`assets/img/`): illustrated grass
      ground, tree, bush, and two hero fighters. An `IMG` cache + `imgOk(key)` load them lazily;
      every draw path falls back to the existing canvas-shape art if an image never decodes, so
      the "degrades to 2D" pillar holds. _Note: a deliberate, user-approved relaxation of the
      "all art drawn with canvas shapes" note in the repo overview — still **no build step**,
      just static asset files served alongside `index.html`._
- [x] **Sprite heroes** — `AVATARS` shrank to **Blaze** + **Rose** (both `img:`-backed, `unlock:1`);
      `drawHuman`→`drawHeroSprite`, `portraitChibi`, and the menu portrait all billboard the PNG.
- [x] **More fighters** (v2.7.0) — roster now 7: **Bjorn** (Lv3), **Zane** (Lv6), **Wraith**
      (Lv10), **Ace** (Lv14), **Nova** (Lv18) joined Blaze/Rose. Each was one PNG + one `AVATARS`
      row — the pipeline held, no other code changes. Still trivially extensible for more.
- [ ] **Gunless heroes + rotating gun** — _pending gunless art_. Current sprites have guns baked
      in, so they only flip L/R (can't aim up/down/behind). Plan: when gunless PNGs arrive, anchor
      the engine's `drawGun` at the hands and rotate it to `h.aim` for true 360° aiming (see the
      drawn chibi's gun-arm at `index.html`). Full-body rotation was tested and looks broken
      (front-facing sprite lies sideways) — the rotating-gun overlay is the approach.

## v1.13 — "Modes & Bosses"

- [x] **Boss waves in Horde** (shipped v2.20.0–v2.21.1) — every 5th wave spawns armored
      `juggernaut` mini-bosses (`ZTYPES.juggernaut`: 420 hp, 30 dmg, `boss:true`, `index.html:1625`),
      count scaling with wave (`1+floor(hordeWave/10)`, `index.html:2843`). _(v2.38.0: juggernauts
      finally look armored — visible chest plate + shoulder guards in `drawZombie` — closing a gap
      where the roadmap text called them "armored" for 8+ versions before the art did.)_
- [x] **Boss polish** (shipped v2.50.0) — closes the "huge brute with hp banner + AoE slam +
      guaranteed loot" gap called out above. A combined hp banner (`☠ JUGGERNAUT`, summed
      hp/maxhp across every alive boss so multiple juggernauts on higher waves still show one
      bar) draws at the top of the screen while any are alive; a telegraphed **ground-slam AoE**
      (`JUGGERNAUT_SLAM`: 95px radius, 45 dmg, 0.6s windup ring, 4.5–6.5s cooldown) fires
      independently of their normal contact damage, giving players a dodge window; and death now
      guarantees a bonus scrap pile (8–12, vs. a normal kill's 62%-chance 5–8) plus a pickup
      spawn, instead of reusing the plain per-size drop chance every other zombie uses.
- [x] **Map escalation** (shipped v2.52.0, direct user request) — the arena wasn't getting any
      harder to move through as Horde waves climbed, only more crowded with zombies. `escalateMap()`
      (`index.html`, right after `buildDecor()`) now runs on every boss wave (same 5th/10th/15th…
      milestone `hordeUpdate()` already uses for elites) and additively drops `MAP_ESCALATE_PER`
      (2) new buildings onto the live arena, capped at `MAP_ESCALATE_MAX` (6) escalations per
      match. Deliberately additive-only — it reuses `buildDecor()`'s own building-placement retry
      loop (clear of other obstacles/water/ARENA edges) plus a new clearance check against every
      living human, and never clears or repositions existing decor/obstacles, since the horde loop
      only calls it at the instant it has confirmed zero zombies are alive (nothing else to avoid).
      New buildings get full existing wall/door/pathing support for free (`wallRects`/
      `insideBuilding`/zombie door-routing all key off `obstacles[].type==='building'` shape, not
      spawn time) — no new collision code needed. Verified via a throwaway `window.__esc()` hook
      forcing 8 boss-wave clears: obstacles 15→27 (exactly `MAX×PER`=12), `mapEscalations` capped
      at 6, zero page errors.
- [ ] **Payload-style event in BR** — _dormant, not applicable_: Battle Royale was retired in
      v2.33.0 (`MODES=['horde']`); this item is parked with BR itself unless BR is revived.
- [x] **Mutators** (shipped v2.35.0) — a `MUTATORS` table (`index.html`, "Match mutators"
      section) + `pickMutator()` (35% chance, else vanilla) picked once in `spawnMatch`'s horde
      branch and announced via `toast()` + a persistent HUD row (`#mutRow`). Three modifiers:
      **Swarm Night** (`zMul:2`, doubles both the initial and per-wave zombie spawn counts),
      **Deep Fog** (`fog:true`, forces night + shrinks/darkens the vision vignette in
      `drawDayNight`), **Low Gravity** (`bombFuseMul`/`bombRadMul`, bombs hang longer and blast
      wider). No apply/revert step needed — `spawnMatch` already rebuilds the world from scratch
      each match, so every consumer just reads `activeMutator` directly at the point of use.

## Balance & tuning backlog (needs real-device playtests)

| Knob | Where | Current | Open question |
|---|---|---|---|
| Combo window | `COMBO_WIN` | 3.0s | Too generous with Minigun? |
| Hitstop depth | `loop` | dt×0.15, ≤120ms | Feels good on 60Hz phone? |
| Door width | `DOOR_HALF` | 21 (42px) | Comfortable on touch? |
| Facade fade | `drawBuildingBase` | 0.15 | Enough interior visibility at night? |
| Building growth | `buildDecor` | 9+lvl/4 ≤16 | Too crowded at 16 with 10 ponds? |
| Coin earn rates | `showResults` | 5/kill, 25/win, 4/wave | Trail prices (150–500) vs earn speed |
| Blood decal cap | `hurt` | 220 | Perf on low-end phones |
| Squad size / bot count | `spawnMatch` | 15 field | Squads of 3 vs 5? |
| Weapon power | `WEAPONS` | — | Sniper 250 dmg vs 96-DPS shotgun |

## Moonshots (parked — need external unblocks or scope approval)

- **3D characters (Meshy)** — wiring is DONE (`assets/meshy/loader.js` auto-wires generated
  GLBs); generation of the remaining 25/28 assets is **blocked on `MESHY_API_KEY`** in the
  environment config (never paste keys in chat) or an interactively-authorized Meshy MCP.
  Then: `node scripts/gen-meshy.mjs` and verify in a real browser (CDN blocked headless).
- **Online multiplayer** — real-time netcode needs a backend + protocol; out of single-file
  scope. Only on explicit request; would start as a design doc.
- **Global leaderboards** — smaller backend ask than multiplayer (one table + fetch); could
  ride on a free tier. Needs user approval for a hosted service.
- **PWA install** — manifest + service worker for home-screen install and offline play. Two
  extra files; breaks the "one file" pillar, so it's an explicit user call.

## Release conventions (recap)

- Bump `GAME_VERSION` + prepend a `CHANGELOG` entry for every player-visible change — the
  update popup depends on it.
- Validate before pushing: `node scripts/validate.mjs`, then a driver run
  (`node .claude/skills/run-brawl-arena/driver.mjs --play --mode br --shoot`).
- Work on the `claude/...` branch → draft PR → merge via GitHub API on "push to main"
  (direct push to main 503s). One session per branch — parallel sessions on one branch have
  collided before (see memory.md v1.8.0).
