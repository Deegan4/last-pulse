# ROADMAP.md — Last Pulse future plan

_The forward-looking plan for **Last Pulse** (v2.34.0). [memory.md](memory.md) records what
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
- [ ] **Wall blood streaks** — _deferred_: blood is particle-based (`spark`) with no wall
      collision; needs a vertical streak-decal variant + spray-vs-wall test. Fiddliest item.
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
- [ ] **Trail shop wave 2** — 4 more cosmetic trails (fire, frost, confetti, shadow) + a
      **banner color** cosmetic slot on the nameplate. _(not yet)_
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

- [ ] **Boss waves in Horde** — every 5th wave spawns a boss zombie (huge brute variant: hp bar
      banner, ground-slam AoE, guaranteed loot drop).
- [ ] **Payload-style event in BR** — a supply convoy crosses the map mid-match; whoever
      escorts/loots it gets a gold weapon. Gives mid-game a reason to move.
- [ ] **Mutators** — occasional match modifiers announced at drop-in (low gravity bombs, 2×
      zombies, fog night). One `MUTATORS` table + a spawn-time pick.

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
- **Gamepad menu navigation** — in-match gamepad works; menus are touch/mouse-only today.

## Release conventions (recap)

- Bump `GAME_VERSION` + prepend a `CHANGELOG` entry for every player-visible change — the
  update popup depends on it.
- Validate before pushing: `node scripts/validate.mjs`, then a driver run
  (`node .claude/skills/run-brawl-arena/driver.mjs --play --mode br --shoot`).
- Work on the `claude/...` branch → draft PR → merge via GitHub API on "push to main"
  (direct push to main 503s). One session per branch — parallel sessions on one branch have
  collided before (see memory.md v1.8.0).
