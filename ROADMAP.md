# ROADMAP.md — Last Pulse future plan

_The forward-looking plan for **Last Pulse** (v1.10.0). [memory.md](memory.md) records what
shipped and how; this file says what's next and why. When an item ships: add its memory.md
bullet, bump `GAME_VERSION` + `CHANGELOG` in index.html, and check it off here._

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

## v1.11 — "Alive World" (next up)

- [ ] **Campfire heal aura** — stand near a campfire to regen ~3 hp/s (capped, with a soft
      glow + ticking SFX). Turns the Lv3 landmark into micro-strategy and a fight magnet.
- [ ] **Wall blood streaks** — blood spray that hits a building leaves a streak decal on the
      wall (pairs with interior fights; reuse the splat system with a vertical variant).
- [ ] **Indoor-aware zombies** — when the player is inside a building, zombies path to the
      door (steer toward the door gap instead of bumping walls). Keeps houses tense, not safe.
- [ ] **Second door on large houses** (`w>170`) — no dead-end interiors; door gap on the top
      wall reusing `wallRects`.
- [ ] **Dried-blood aging** — decals darken as `t` decays (one-line color lerp in the splat draw).

## v1.12 — "Arsenal & Fighters" (content drop)

- [ ] **2 new weapons** — candidates: *Launcher* (slow AoE rocket, self-knockback) and *SMG-akimbo*
      (dual-wield look, wide spray). Table entry + `GUNK` art + `bulletFx` feel each.
- [ ] **2 new avatars** — fill the Lv 28/30 unlock gap; new `look.style`s need cases in
      `drawHair` AND `portraitChibi`.
- [ ] **Trail shop wave 2** — 4 more cosmetic trails (fire, frost, confetti, shadow) + a
      **banner color** cosmetic slot on the nameplate.
- [ ] **Weekly challenge** — a harder 7-day cousin of the daily (worth 200 🪙), same
      deterministic day-hash pattern.

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
